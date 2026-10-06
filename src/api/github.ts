import type { IOperationResult } from '@microsoft/managed-apps/data';
import type { MultipleFetchModel } from '../../generated/models/GitHubModel';
import type { GitHubAccountType, GitHubRepo, RequestBackoffInfo } from '../types';

const PAGE_SIZE = 100;
const connectorHelpMessage =
  'GitHub connector access requires App Player or the Local Play URL from the global ms app dev command, plus an authenticated hosted GitHub connection.';

type RequestOptions = {
  signal: AbortSignal;
  onBackoff?: (info: RequestBackoffInfo) => void;
  now?: () => number;
};

type RepoOperationData = MultipleFetchModel | { value: MultipleFetchModel };

type GitHubConnectorOperations = {
  getUserReposPage: (owner: string, page: number) => Promise<IOperationResult<RepoOperationData>>;
  getOrgReposPage: (owner: string, page: number) => Promise<IOperationResult<RepoOperationData>>;
};

async function getGitHubService() {
  const module = await import('../../generated/services/GitHubService');
  return module.GitHubService;
}

const defaultConnectorOperations: GitHubConnectorOperations = {
  getUserReposPage: async (owner, page) =>
    (await getGitHubService()).GetRepos(owner, 'owner', 'updated', 'desc', PAGE_SIZE, page),
  getOrgReposPage: async (owner, page) =>
    (await getGitHubService()).GetOrgRepos(owner, 'public', 'updated', 'desc', PAGE_SIZE, page),
};

let connectorOperations: GitHubConnectorOperations = defaultConnectorOperations;

const emptyBackoff: RequestBackoffInfo = {
  retryAfterMs: null,
  cooldownUntil: null,
  message: null,
};

export class GitHubApiError extends Error {
  status?: number;
  rawCode?: string;
  code: 'http' | 'rate_limit' | 'invalid_response' | 'connector_unavailable' | 'auth_required';
  backoff: RequestBackoffInfo;

  constructor(
    message: string,
    code: 'http' | 'rate_limit' | 'invalid_response' | 'connector_unavailable' | 'auth_required',
    options: { status?: number; rawCode?: string; backoff?: RequestBackoffInfo } = {},
  ) {
    super(message);
    this.name = 'GitHubApiError';
    this.code = code;
    this.status = options.status;
    this.rawCode = options.rawCode;
    this.backoff = options.backoff ?? emptyBackoff;
  }
}

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
    (value.private === undefined || typeof value.private === 'boolean') &&
    (value.visibility === undefined || typeof value.visibility === 'string') &&
    (value.topics === undefined || isStringArray(value.topics)) &&
    isValidRepoOwner(value.owner)
  );
}

function isWrappedCollection(value: unknown): value is { value: unknown[] } {
  return isObject(value) && Array.isArray(value.value);
}

function extractRepoCollection(data: unknown): unknown[] {
  if (Array.isArray(data)) {
    return data;
  }

  if (isWrappedCollection(data)) {
    return data.value;
  }

  throw new GitHubApiError('The GitHub connector returned an unexpected repository list response.', 'invalid_response');
}

function validateRepoList(data: unknown): { repos: GitHubRepo[]; rawCount: number } {
  const collection = extractRepoCollection(data);
  const invalidIndex = collection.findIndex((repo) => !isValidGitHubRepo(repo));
  if (invalidIndex >= 0) {
    throw new GitHubApiError(
      `The GitHub connector returned malformed repository data at index ${invalidIndex}.`,
      'invalid_response',
    );
  }

  return {
    repos: collection as GitHubRepo[],
    rawCount: collection.length,
  };
}

function buildPageFingerprint(repos: GitHubRepo[]): string {
  return repos.map((repo) => String(repo.id)).join('|');
}

function isPublicRepo(repo: GitHubRepo): boolean {
  if (repo.private === true) {
    return false;
  }

  if (!repo.visibility) {
    return true;
  }

  return repo.visibility.toLowerCase() === 'public';
}

function parseRetryAfterMs(message: string, now: number): number | null {
  const relativeMatch = message.match(/retry after\s+(\d+)\s*(millisecond|milliseconds|ms|second|seconds|minute|minutes)/i);
  if (relativeMatch) {
    const amount = Number(relativeMatch[1]);
    const unit = relativeMatch[2].toLowerCase();
    if (!Number.isFinite(amount)) {
      return null;
    }

    if (unit.startsWith('minute')) {
      return amount * 60_000;
    }

    if (unit.startsWith('second')) {
      return amount * 1_000;
    }

    return amount;
  }

  const absoluteMatch = message.match(
    /(retry after|retry at|available after|available at)\s+([A-Za-z]{3},\s+\d{1,2}\s+[A-Za-z]{3}\s+\d{4}\s+\d{2}:\d{2}:\d{2}\s+GMT|\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z)/i,
  );
  if (absoluteMatch) {
    const retryAt = Date.parse(absoluteMatch[2]);
    if (!Number.isNaN(retryAt)) {
      return Math.max(retryAt - now, 0);
    }
  }

  return null;
}

function buildBackoff(message: string, now: number): RequestBackoffInfo {
  const retryAfterMs = parseRetryAfterMs(message, now);
  return {
    retryAfterMs,
    cooldownUntil: retryAfterMs !== null ? now + retryAfterMs : null,
    message: retryAfterMs !== null ? `Connector retry guidance received: wait ${Math.ceil(retryAfterMs / 1000)} seconds before retrying.` : null,
  };
}

function getOperationErrorDetails(error: unknown): {
  message: string;
  status?: number;
  rawCode?: string;
} {
  if (error instanceof Error) {
    const candidate = error as Error & { status?: number; code?: string };
    return {
      message: error.message || 'The GitHub connector request failed.',
      status: candidate.status,
      rawCode: typeof candidate.code === 'string' ? candidate.code : undefined,
    };
  }

  if (isObject(error)) {
    const message = typeof error.message === 'string' ? error.message : 'The GitHub connector request failed.';
    const status = typeof error.status === 'number' && Number.isFinite(error.status) ? error.status : undefined;
    const rawCode = typeof error.code === 'string' ? error.code : undefined;
    return { message, status, rawCode };
  }

  return {
    message: typeof error === 'string' && error.trim() ? error : 'The GitHub connector request failed.',
  };
}

function mapConnectorFailure(error: unknown, now: number): GitHubApiError {
  const details = getOperationErrorDetails(error);
  const backoff = buildBackoff(details.message, now);
  const lowerMessage = details.message.toLowerCase();
  const lowerCode = details.rawCode?.toLowerCase() ?? '';
  const isThrottle =
    details.status === 429 ||
    lowerCode.includes('throttle') ||
    lowerCode.includes('too_many') ||
    lowerMessage.includes('too many requests') ||
    lowerMessage.includes('throttl');
  const isConnectionUnavailable =
    lowerCode === 'connection_reference_not_found' ||
    lowerCode === 'connection_not_found' ||
    lowerCode === 'connection_config_fetch_failed' ||
    lowerMessage.includes('connection reference') ||
    lowerMessage.includes('connection config') ||
    lowerMessage.includes('app player') ||
    lowerMessage.includes('local play url') ||
    lowerMessage.includes('unexpected development bootstrap frame') ||
    lowerMessage.includes('postmessage') ||
    lowerMessage.includes('host');
  const isAuthRequired =
    details.status === 401 ||
    lowerMessage.includes('not signed in') ||
    lowerMessage.includes('sign in') ||
    lowerMessage.includes('authorize') ||
    lowerMessage.includes('authentication');

  if (isThrottle) {
    return new GitHubApiError(details.message, 'rate_limit', {
      status: details.status,
      rawCode: details.rawCode,
      backoff,
    });
  }

  if (isConnectionUnavailable) {
    return new GitHubApiError(connectorHelpMessage, 'connector_unavailable', {
      status: details.status,
      rawCode: details.rawCode,
      backoff,
    });
  }

  if (isAuthRequired) {
    return new GitHubApiError(details.message, 'auth_required', {
      status: details.status,
      rawCode: details.rawCode,
      backoff,
    });
  }

  return new GitHubApiError(details.message, 'http', {
    status: details.status,
    rawCode: details.rawCode,
    backoff,
  });
}

function unwrapOperationResult(result: IOperationResult<RepoOperationData>, now: number): unknown {
  if (!isObject(result) || typeof result.success !== 'boolean') {
    throw new GitHubApiError('The GitHub connector returned an invalid operation result.', 'invalid_response');
  }

  if (!result.success) {
    throw mapConnectorFailure(result.error, now);
  }

  if (result.error) {
    throw new GitHubApiError(
      'The GitHub connector reported both success and error for the same request.',
      'invalid_response',
    );
  }

  if (!('data' in result)) {
    throw new GitHubApiError('The GitHub connector returned an invalid operation result.', 'invalid_response');
  }

  return result.data;
}

async function requestRepoPage(
  owner: string,
  accountType: GitHubAccountType,
  page: number,
  options: RequestOptions,
): Promise<{ repos: GitHubRepo[]; rawCount: number }> {
  assertNotAborted(options.signal);

  let result: IOperationResult<RepoOperationData>;
  try {
    result =
      accountType === 'organization'
        ? await connectorOperations.getOrgReposPage(owner, page)
        : await connectorOperations.getUserReposPage(owner, page);
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    assertNotAborted(options.signal);
    const mappedError = mapConnectorFailure(error, getNow(options));
    if (mappedError.backoff.cooldownUntil || mappedError.backoff.message) {
      options.onBackoff?.(mappedError.backoff);
    }
    throw mappedError;
  }

  assertNotAborted(options.signal);
  try {
    const data = unwrapOperationResult(result, getNow(options));
    return validateRepoList(data);
  } catch (error) {
    if (error instanceof GitHubApiError && (error.backoff.cooldownUntil || error.backoff.message)) {
      options.onBackoff?.(error.backoff);
    }
    throw error;
  }
}

export async function fetchAllOwnedRepos(
  username: string,
  accountType: GitHubAccountType,
  options: RequestOptions,
): Promise<GitHubRepo[]> {
  const normalizedUsername = normalizeUsername(username);
  if (!isValidGitHubUsername(normalizedUsername)) {
    throw new GitHubApiError('Enter a valid GitHub username or organization login.', 'invalid_response');
  }

  const repos: GitHubRepo[] = [];
  const seenPageFingerprints = new Set<string>();
  const seenRepoIds = new Set<number>();
  let page = 1;

  while (true) {
    const { repos: rawRepos, rawCount } = await requestRepoPage(normalizedUsername, accountType, page, options);
    const fingerprint = buildPageFingerprint(rawRepos);
    if (rawCount === PAGE_SIZE && fingerprint && seenPageFingerprints.has(fingerprint)) {
      throw new GitHubApiError('GitHub connector pagination returned repeated repository data.', 'invalid_response');
    }
    if (rawCount === PAGE_SIZE && fingerprint) {
      seenPageFingerprints.add(fingerprint);
    }

    rawRepos.filter(isPublicRepo).forEach((repo) => {
      if (!seenRepoIds.has(repo.id)) {
        seenRepoIds.add(repo.id);
        repos.push(repo);
      }
    });

    if (rawCount < PAGE_SIZE) {
      break;
    }

    page += 1;
  }

  return repos;
}

export function __setGitHubConnectorOperations(overrides: Partial<GitHubConnectorOperations>) {
  connectorOperations = {
    ...defaultConnectorOperations,
    ...overrides,
  };
}

export function __resetGitHubApiTestState() {
  connectorOperations = defaultConnectorOperations;
}
