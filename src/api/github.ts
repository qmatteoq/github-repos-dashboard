import { buildRepoTechDetails, selectManifestCandidates } from '../lib/repoAnalysis';
import type {
  GitHubRepo,
  ManifestFile,
  RateLimitInfo,
  RepoTechDetails,
  RootContentEntry,
} from '../types';

const API_ROOT = 'https://api.github.com';
const PAGE_SIZE = 100;
const MAX_MANIFEST_SIZE_BYTES = 200_000;
const MAX_MANIFEST_CONTENT_CHARS = Math.ceil((MAX_MANIFEST_SIZE_BYTES * 4) / 3);
const SECONDARY_RATE_LIMIT_FALLBACK_MS = 60_000;
const DEFAULT_HEADERS = {
  Accept: 'application/vnd.github+json',
};

type CacheEntry = {
  etag?: string;
  data: unknown;
};

type RequestOptions = {
  signal: AbortSignal;
  onRateLimit?: (info: RateLimitInfo) => void;
  now?: () => number;
};

const responseCache = new Map<string, CacheEntry>();
const repoDetailsCache = new Map<string, RepoTechDetails>();

const emptyRateLimitInfo: RateLimitInfo = {
  limit: null,
  remaining: null,
  resetAt: null,
  retryAfterMs: null,
  cooldownUntil: null,
};

let sharedRateLimitInfo: RateLimitInfo = emptyRateLimitInfo;
let sharedCooldownUntil: number | null = null;

export class GitHubApiError extends Error {
  status?: number;
  code: 'http' | 'network' | 'rate_limit' | 'invalid_response';
  rateLimit?: RateLimitInfo;

  constructor(
    message: string,
    code: 'http' | 'network' | 'rate_limit' | 'invalid_response',
    options: { status?: number; rateLimit?: RateLimitInfo } = {},
  ) {
    super(message);
    this.name = 'GitHubApiError';
    this.code = code;
    this.status = options.status;
    this.rateLimit = options.rateLimit;
  }
}

function createLimiter(concurrency: number) {
  let activeCount = 0;
  const queue: Array<() => void> = [];

  const runNext = () => {
    if (activeCount >= concurrency) {
      return;
    }

    const next = queue.shift();
    if (!next) {
      return;
    }

    activeCount += 1;
    next();
  };

  return async <T>(operation: () => Promise<T>): Promise<T> =>
    new Promise<T>((resolve, reject) => {
      queue.push(() => {
        operation()
          .then(resolve, reject)
          .finally(() => {
            activeCount -= 1;
            runNext();
          });
      });
      runNext();
    });
}

const detailLimiter = createLimiter(3);

export function normalizeUsername(value: string): string {
  return value.trim();
}

export function isValidGitHubUsername(value: string): boolean {
  return /^(?=.{1,39}$)(?!-)(?!.*--)[A-Za-z0-9-]+(?<!-)$/.test(value);
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

export function buildSafeGitHubRepoUrl(owner: string, repo: string): string {
  return `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
}

export function buildSafeGitHubOwnerUrl(owner: string): string {
  return `https://github.com/${encodeURIComponent(owner)}`;
}

function buildOwnedReposUrl(username: string, page: number): string {
  const url = new URL(`${API_ROOT}/users/${encodeURIComponent(username)}/repos`);
  url.searchParams.set('type', 'owner');
  url.searchParams.set('per_page', String(PAGE_SIZE));
  url.searchParams.set('sort', 'updated');
  url.searchParams.set('direction', 'desc');
  url.searchParams.set('page', String(page));
  return url.toString();
}

function getNow(options?: Pick<RequestOptions, 'now'>): number {
  return options?.now?.() ?? Date.now();
}

function createAbortError(): DOMException {
  return new DOMException('The operation was aborted.', 'AbortError');
}

function assertNotAborted(signal: AbortSignal) {
  if (signal.aborted) {
    throw createAbortError();
  }
}

function parseResetAt(headers: Headers): string | null {
  const rawReset = headers.get('x-ratelimit-reset');
  if (!rawReset) {
    return null;
  }

  const resetSeconds = Number(rawReset);
  if (!Number.isFinite(resetSeconds)) {
    return null;
  }

  return new Date(resetSeconds * 1000).toISOString();
}

function parseRetryAfterMs(headers: Headers, now: number): number | null {
  const rawRetryAfter = headers.get('retry-after');
  if (!rawRetryAfter) {
    return null;
  }

  const retryAfterSeconds = Number(rawRetryAfter);
  if (Number.isFinite(retryAfterSeconds)) {
    return Math.max(retryAfterSeconds * 1000, 0);
  }

  const retryAfterAt = Date.parse(rawRetryAfter);
  if (!Number.isNaN(retryAfterAt)) {
    return Math.max(retryAfterAt - now, 0);
  }

  return null;
}

function getActiveCooldownUntil(now: number): number | null {
  if (sharedCooldownUntil && sharedCooldownUntil <= now) {
    sharedCooldownUntil = null;
    sharedRateLimitInfo = {
      ...sharedRateLimitInfo,
      cooldownUntil: null,
      retryAfterMs: null,
    };
  }

  return sharedCooldownUntil;
}

function finalizeRateLimitInfo(info: RateLimitInfo, now: number): RateLimitInfo {
  const activeCooldownUntil = getActiveCooldownUntil(now);
  const proposedCooldownUntil = info.cooldownUntil && info.cooldownUntil > now ? info.cooldownUntil : null;
  const nextCooldownUntil =
    activeCooldownUntil && proposedCooldownUntil
      ? Math.max(activeCooldownUntil, proposedCooldownUntil)
      : activeCooldownUntil ?? proposedCooldownUntil;

  sharedCooldownUntil = nextCooldownUntil ?? null;
  sharedRateLimitInfo = {
    ...info,
    cooldownUntil: sharedCooldownUntil,
  };

  return sharedRateLimitInfo;
}

function parseRateLimit(
  headers: Headers,
  context: {
    status?: number;
    message?: string;
    now: number;
  },
): RateLimitInfo {
  const remaining = headers.get('x-ratelimit-remaining');
  const limit = headers.get('x-ratelimit-limit');
  const resetAt = parseResetAt(headers);
  const retryAfterMs = parseRetryAfterMs(headers, context.now);
  const resetAtMs = resetAt ? Date.parse(resetAt) : Number.NaN;
  const remainingCount = remaining ? Number(remaining) : null;
  const limitCount = limit ? Number(limit) : null;
  const isSecondaryLimit =
    (context.status === 403 || context.status === 429) &&
    Boolean(context.message && /secondary rate limit/i.test(context.message));
  const fallbackRetryAfterMs =
    isSecondaryLimit && retryAfterMs === null && (remainingCount === null || remainingCount > 0)
      ? SECONDARY_RATE_LIMIT_FALLBACK_MS
      : null;
  const cooldownUntil = Math.max(
    retryAfterMs !== null ? context.now + retryAfterMs : 0,
    fallbackRetryAfterMs !== null ? context.now + fallbackRetryAfterMs : 0,
    remainingCount !== null && remainingCount <= 0 && Number.isFinite(resetAtMs) ? resetAtMs : 0,
  ) || null;

  return {
    limit: Number.isFinite(limitCount) ? limitCount : null,
    remaining: Number.isFinite(remainingCount) ? remainingCount : null,
    resetAt,
    retryAfterMs: retryAfterMs ?? fallbackRetryAfterMs,
    cooldownUntil,
  };
}

function throwIfCoolingDown(options: RequestOptions) {
  assertNotAborted(options.signal);

  const now = getNow(options);
  const cooldownUntil = getActiveCooldownUntil(now);
  if (!cooldownUntil) {
    return;
  }

  const rateLimit = {
    ...sharedRateLimitInfo,
    cooldownUntil,
  };
  options.onRateLimit?.(rateLimit);
  throw new GitHubApiError('GitHub API cooldown is active. Wait for the current retry window to finish.', 'rate_limit', {
    rateLimit,
  });
}

async function parseErrorMessage(response: Response): Promise<string> {
  const text = await response.text();
  if (!text) {
    return response.statusText || `GitHub API returned ${response.status}.`;
  }

  try {
    const parsed = JSON.parse(text) as { message?: string };
    return parsed.message || response.statusText || text;
  } catch {
    return text;
  }
}

async function requestJson<T>(url: string, options: RequestOptions): Promise<{ data: T; headers: Headers; status: number }> {
  throwIfCoolingDown(options);

  const cached = responseCache.get(url);
  const headers = new Headers(DEFAULT_HEADERS);

  if (cached?.etag) {
    headers.set('If-None-Match', cached.etag);
  }

  let response: Response;

  try {
    response = await fetch(url, {
      headers,
      signal: options.signal,
      cache: 'no-store',
    });
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    throw new GitHubApiError('Network request failed. Check your connection and try again.', 'network');
  }

  const now = getNow(options);

  if (response.status === 304) {
    const rateLimit = finalizeRateLimitInfo(parseRateLimit(response.headers, { now, status: response.status }), now);
    options.onRateLimit?.(rateLimit);

    if (!cached) {
      throw new GitHubApiError('GitHub returned a cached response without local data.', 'invalid_response', {
        status: 304,
        rateLimit,
      });
    }

    return {
      data: cached.data as T,
      headers: response.headers,
      status: response.status,
    };
  }

  if (!response.ok) {
    const message = await parseErrorMessage(response);
    const rateLimit = finalizeRateLimitInfo(
      parseRateLimit(response.headers, { now, status: response.status, message }),
      now,
    );
    options.onRateLimit?.(rateLimit);
    const isRateLimit =
      response.status === 429 ||
      (response.status === 403 &&
        ((rateLimit.remaining !== null && rateLimit.remaining <= 0) ||
          rateLimit.retryAfterMs !== null ||
          /rate limit/i.test(message)));

    throw new GitHubApiError(message, isRateLimit ? 'rate_limit' : 'http', {
      status: response.status,
      rateLimit,
    });
  }

  let data: T;
  try {
    data = (await response.json()) as T;
  } catch {
    const rateLimit = finalizeRateLimitInfo(parseRateLimit(response.headers, { now, status: response.status }), now);
    options.onRateLimit?.(rateLimit);
    throw new GitHubApiError('GitHub returned malformed JSON.', 'invalid_response', {
      status: response.status,
      rateLimit,
    });
  }

  const rateLimit = finalizeRateLimitInfo(parseRateLimit(response.headers, { now, status: response.status }), now);
  options.onRateLimit?.(rateLimit);

  const etag = response.headers.get('etag') ?? undefined;
  responseCache.set(url, { etag, data });

  return {
    data,
    headers: response.headers,
    status: response.status,
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isValidRepoOwner(value: unknown): value is GitHubRepo['owner'] {
  return isObject(value) && typeof value.login === 'string';
}

function isValidGitHubRepo(value: unknown): value is GitHubRepo {
  return (
    isObject(value) &&
    typeof value.id === 'number' &&
    Number.isFinite(value.id) &&
    typeof value.name === 'string' &&
    typeof value.full_name === 'string' &&
    (value.description === null || typeof value.description === 'string') &&
    typeof value.html_url === 'string' &&
    typeof value.updated_at === 'string' &&
    (value.pushed_at === null || typeof value.pushed_at === 'string') &&
    (value.language === null || typeof value.language === 'string') &&
    typeof value.stargazers_count === 'number' &&
    Number.isFinite(value.stargazers_count) &&
    typeof value.forks_count === 'number' &&
    Number.isFinite(value.forks_count) &&
    typeof value.archived === 'boolean' &&
    typeof value.fork === 'boolean' &&
    (value.topics === undefined || isStringArray(value.topics)) &&
    isValidRepoOwner(value.owner)
  );
}

function validateRepoList(data: unknown): GitHubRepo[] {
  if (!Array.isArray(data)) {
    throw new GitHubApiError('GitHub returned an unexpected repository list response.', 'invalid_response');
  }

  const invalidIndex = data.findIndex((repo) => !isValidGitHubRepo(repo));
  if (invalidIndex >= 0) {
    throw new GitHubApiError(
      `GitHub returned malformed repository data at index ${invalidIndex}.`,
      'invalid_response',
    );
  }

  return data;
}

function validateRootContentEntries(data: unknown): RootContentEntry[] {
  if (!Array.isArray(data)) {
    throw new GitHubApiError('GitHub returned malformed repository root contents.', 'invalid_response');
  }

  const validTypes = new Set<RootContentEntry['type']>(['file', 'dir', 'symlink', 'submodule']);
  const invalidIndex = data.findIndex(
    (entry) =>
      !isObject(entry) ||
      typeof entry.name !== 'string' ||
      typeof entry.type !== 'string' ||
      !validTypes.has(entry.type as RootContentEntry['type']) ||
      (entry.size !== undefined && (typeof entry.size !== 'number' || !Number.isFinite(entry.size))),
  );

  if (invalidIndex >= 0) {
    throw new GitHubApiError(
      `GitHub returned malformed root content data at index ${invalidIndex}.`,
      'invalid_response',
    );
  }

  return data as RootContentEntry[];
}

function validateLanguageBytes(data: unknown): Record<string, number> {
  if (!isObject(data) || Array.isArray(data)) {
    throw new GitHubApiError('GitHub returned malformed language breakdown data.', 'invalid_response');
  }

  for (const [language, value] of Object.entries(data)) {
    if (!language || typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      throw new GitHubApiError('GitHub returned malformed language breakdown data.', 'invalid_response');
    }
  }

  return data as Record<string, number>;
}

function extractNextPageNumber(linkHeader: string | null, username: string, currentUrl: string): number | null {
  if (!linkHeader) {
    return null;
  }

  const nextMatch = linkHeader
    .split(',')
    .map((entry) => entry.trim())
    .find((entry) => entry.endsWith('rel="next"'));

  if (!nextMatch) {
    return null;
  }

  const urlMatch = nextMatch.match(/<([^>]+)>/);
  if (!urlMatch) {
    throw new GitHubApiError('GitHub pagination returned an invalid next page URL.', 'invalid_response');
  }

  const parsed = new URL(urlMatch[1]);
  const current = new URL(currentUrl);
  const decodedPath = decodeURIComponent(parsed.pathname).toLowerCase();
  const expectedUserPath = `/users/${decodeURIComponent(encodeURIComponent(username)).toLowerCase()}/repos`;
  const isExpectedPath = decodedPath === expectedUserPath || /^\/user\/\d+\/repos$/.test(decodedPath);

  if (parsed.protocol !== 'https:' || parsed.hostname !== 'api.github.com' || !isExpectedPath) {
    throw new GitHubApiError('GitHub pagination returned an unexpected next page URL.', 'invalid_response');
  }

  const nextPage = Number(parsed.searchParams.get('page'));
  const currentPage = Number(current.searchParams.get('page'));
  if (!Number.isSafeInteger(nextPage) || !Number.isSafeInteger(currentPage) || nextPage !== currentPage + 1) {
    throw new GitHubApiError('GitHub pagination did not advance to a valid next page.', 'invalid_response');
  }

  return nextPage;
}

function buildPageFingerprint(repos: GitHubRepo[]): string {
  return repos.map((repo) => String(repo.id)).join('|');
}

export async function fetchAllOwnedRepos(username: string, options: RequestOptions): Promise<GitHubRepo[]> {
  const normalizedUsername = normalizeUsername(username);
  if (!isValidGitHubUsername(normalizedUsername)) {
    throw new GitHubApiError('Enter a valid GitHub username or organization login.', 'invalid_response');
  }

  const repos: GitHubRepo[] = [];
  const seenUrls = new Set<string>();
  const seenFingerprints = new Set<string>();
  const seenRepoIds = new Set<number>();
  let currentPage = 1;
  let currentUrl: string | null = buildOwnedReposUrl(normalizedUsername, currentPage);

  while (currentUrl) {
    if (seenUrls.has(currentUrl)) {
      throw new GitHubApiError('GitHub pagination looped to a previously visited page.', 'invalid_response');
    }
    seenUrls.add(currentUrl);

    const { data, headers } = await requestJson<unknown>(currentUrl, options);
    const pageRepos = validateRepoList(data);
    const fingerprint = buildPageFingerprint(pageRepos);
    if (fingerprint && seenFingerprints.has(fingerprint)) {
      throw new GitHubApiError('GitHub pagination returned repeated repository data.', 'invalid_response');
    }
    if (fingerprint) {
      seenFingerprints.add(fingerprint);
    }

    pageRepos.forEach((repo) => {
      if (!seenRepoIds.has(repo.id)) {
        seenRepoIds.add(repo.id);
        repos.push(repo);
      }
    });

    const nextPage = extractNextPageNumber(headers.get('link'), normalizedUsername, currentUrl);
    if (nextPage !== null) {
      currentPage = nextPage;
      currentUrl = buildOwnedReposUrl(normalizedUsername, currentPage);
      continue;
    }

    if (pageRepos.length === PAGE_SIZE) {
      currentPage += 1;
      currentUrl = buildOwnedReposUrl(normalizedUsername, currentPage);
      continue;
    }

    currentUrl = null;
  }

  return repos;
}

async function getOptionalJson<T>(
  url: string,
  options: RequestOptions,
  emptyStatuses: number[],
): Promise<{ data: T | null; note?: string }> {
  try {
    const response = await requestJson<unknown>(url, options);
    return { data: response.data as T };
  } catch (error) {
    if (
      error instanceof GitHubApiError &&
      error.status !== undefined &&
      emptyStatuses.includes(error.status) &&
      error.code !== 'rate_limit'
    ) {
      return { data: null, note: error.message };
    }

    throw error;
  }
}

function decodeBase64Utf8(content: string): string {
  const binary = atob(content);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

async function fetchManifestFile(
  owner: string,
  repo: string,
  fileName: string,
  options: RequestOptions,
): Promise<{ manifest: ManifestFile | null; note?: string }> {
  const url = `${API_ROOT}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodeURIComponent(fileName)}`;

  const { data, note } = await getOptionalJson<{
    encoding?: string;
    content?: string;
    size?: number;
    type?: string;
    name?: string;
  }>(url, options, [404, 409, 415]);

  if (!data) {
    return { manifest: null, note };
  }

  if (data.type !== 'file') {
    return { manifest: null, note: `${fileName} is not a plain file.` };
  }

  if ((data.size ?? 0) > MAX_MANIFEST_SIZE_BYTES) {
    return { manifest: null, note: `${fileName} was skipped because it is larger than ${MAX_MANIFEST_SIZE_BYTES} bytes.` };
  }

  if (data.encoding !== 'base64' || !data.content) {
    return { manifest: null, note: `${fileName} could not be decoded from the GitHub contents API.` };
  }

  const encodedContent = data.content.replace(/\n/g, '');
  if (encodedContent.length > MAX_MANIFEST_CONTENT_CHARS) {
    return {
      manifest: null,
      note: `${fileName} was skipped because its encoded content exceeds the inspection limit.`,
    };
  }

  try {
    return {
      manifest: {
        name: data.name ?? fileName,
        text: decodeBase64Utf8(encodedContent),
      },
    };
  } catch {
    return { manifest: null, note: `${fileName} content could not be decoded as valid UTF-8 text.` };
  }
}

function buildRepoDetailsCacheKey(owner: string, repo: string, pushedAt: string | null): string {
  return `${owner}/${repo}:${pushedAt ?? 'unknown'}`;
}

export async function fetchRepoTechDetails(
  owner: string,
  repo: string,
  pushedAt: string | null,
  options: RequestOptions,
): Promise<RepoTechDetails> {
  const cacheKey = buildRepoDetailsCacheKey(owner, repo, pushedAt);
  const cached = repoDetailsCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  return detailLimiter(async () => {
    assertNotAborted(options.signal);

    const notes: string[] = [];
    const [languageResult, rootResult] = await Promise.all([
      getOptionalJson<unknown>(
        `${API_ROOT}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/languages`,
        options,
        [404, 409],
      ),
      getOptionalJson<unknown>(
        `${API_ROOT}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents`,
        options,
        [404, 409],
      ),
    ]);

    if (languageResult.note) {
      notes.push(`Language breakdown unavailable: ${languageResult.note}`);
    }

    if (rootResult.note) {
      notes.push(`Root contents unavailable: ${rootResult.note}`);
    }

    const languageBytes = languageResult.data === null ? null : validateLanguageBytes(languageResult.data);
    const rootEntries = rootResult.data === null ? null : validateRootContentEntries(rootResult.data);
    const manifestCandidates = rootEntries ? selectManifestCandidates(rootEntries) : [];
    const manifests: ManifestFile[] = [];

    for (const candidate of manifestCandidates) {
      const fileResult = await fetchManifestFile(owner, repo, candidate.name, options);
      if (fileResult.manifest) {
        manifests.push(fileResult.manifest);
      }
      if (fileResult.note) {
        notes.push(fileResult.note);
      }
    }

    const details = buildRepoTechDetails({
      rootEntries,
      manifests,
      languageBytes,
      notes,
    });

    repoDetailsCache.set(cacheKey, details);
    return details;
  });
}

export function __resetGitHubApiTestState() {
  responseCache.clear();
  repoDetailsCache.clear();
  sharedCooldownUntil = null;
  sharedRateLimitInfo = emptyRateLimitInfo;
}
