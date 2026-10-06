import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  __resetGitHubApiTestState,
  fetchAllOwnedRepos,
  fetchRepoTechDetails,
  GitHubApiError,
} from './github';

function repo(id: number, name: string) {
  return {
    id,
    name,
    full_name: `owner/${name}`,
    description: null,
    html_url: `https://github.com/owner/${name}`,
    updated_at: '2026-01-01T00:00:00Z',
    pushed_at: '2026-01-01T00:00:00Z',
    language: null,
    stargazers_count: 0,
    forks_count: 0,
    archived: false,
    fork: false,
    owner: {
      login: 'owner',
    },
  };
}

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      'content-type': 'application/json',
      ...init.headers,
    },
    ...init,
  });
}

describe('github api helpers', () => {
  it('waits for primary reset even when Retry-After is shorter', async () => {
    __resetGitHubApiTestState();
    const now = Date.parse('2026-01-01T00:00:00Z');
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(jsonResponse(
      { message: 'API rate limit exceeded' },
      { status: 403, headers: {
        'x-ratelimit-remaining': '0',
        'x-ratelimit-reset': String((now + 120_000) / 1000),
        'retry-after': '10',
      } },
    ));
    await expect(fetchAllOwnedRepos('owner', {
      signal: new AbortController().signal,
      now: () => now,
    })).rejects.toMatchObject({ rateLimit: { cooldownUntil: now + 120_000 } });
  });

  beforeEach(() => {
    __resetGitHubApiTestState();
    vi.restoreAllMocks();
  });

  it('loads multiple pages, accepts numeric next links, and deduplicates overlapping ids', async () => {
    const pageOne = Array.from({ length: 100 }, (_, index) => repo(index + 1, `repo-${index + 1}`));
    const pageTwo = [repo(100, 'repo-100'), repo(101, 'repo-101'), repo(102, 'repo-102')];

    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        jsonResponse(pageOne, {
          headers: {
            etag: 'page-one',
            link: '<https://api.github.com/user/583231/repos?type=owner&per_page=100&page=2>; rel="next"',
            'x-ratelimit-limit': '60',
            'x-ratelimit-remaining': '58',
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse(pageTwo, {
          headers: {
            etag: 'page-two',
            'x-ratelimit-limit': '60',
            'x-ratelimit-remaining': '57',
          },
        }),
      );

    const repos = await fetchAllOwnedRepos('owner', {
      signal: new AbortController().signal,
    });

    expect(repos).toHaveLength(102);
    expect(repos.at(-1)?.id).toBe(102);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain('/users/owner/repos');
  });

  it('rejects exact repeated pages instead of looping forever', async () => {
    const repeatedPage = Array.from({ length: 100 }, (_, index) => repo(index + 1, `repo-${index + 1}`));

    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        jsonResponse(repeatedPage, {
          headers: {
            link: '<https://api.github.com/user/583231/repos?type=owner&per_page=100&page=2>; rel="next"',
          },
        }),
      )
      .mockResolvedValueOnce(jsonResponse(repeatedPage));

    await expect(
      fetchAllOwnedRepos('owner', {
        signal: new AbortController().signal,
      }),
    ).rejects.toMatchObject({
      code: 'invalid_response',
      message: 'GitHub pagination returned repeated repository data.',
    } satisfies Partial<GitHubApiError>);
  });

  it('reuses cached data after a 304 response', async () => {
    const page = [repo(1, 'repo-1')];
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        jsonResponse(page, {
          headers: {
            etag: 'repos-v1',
          },
        }),
      )
      .mockResolvedValueOnce(
        new Response(null, {
          status: 304,
          headers: {
            etag: 'repos-v1',
          },
        }),
      );

    const first = await fetchAllOwnedRepos('owner', {
      signal: new AbortController().signal,
    });
    const second = await fetchAllOwnedRepos('owner', {
      signal: new AbortController().signal,
    });

    expect(first).toEqual(second);
    expect(fetchMock.mock.calls[1]?.[0]).toContain('/users/owner/repos');
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      headers: expect.any(Headers),
    });
  });

  it('rejects malformed repository objects before rendering', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      jsonResponse([
        {
          ...repo(1, 'repo-1'),
          owner: null,
        },
      ]),
    );

    await expect(
      fetchAllOwnedRepos('owner', {
        signal: new AbortController().signal,
      }),
    ).rejects.toMatchObject({
      code: 'invalid_response',
      message: 'GitHub returned malformed repository data at index 0.',
    } satisfies Partial<GitHubApiError>);
  });

  it('preserves a cooldown announced by a successful response across later requests', async () => {
    const now = Date.parse('2026-01-01T00:00:00Z');
    const resetAtSeconds = Math.floor((now + 60_000) / 1000);
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      jsonResponse([repo(1, 'repo-1')], {
        headers: {
          'x-ratelimit-limit': '60',
          'x-ratelimit-remaining': '0',
          'x-ratelimit-reset': String(resetAtSeconds),
        },
      }),
    );

    await fetchAllOwnedRepos('owner', {
      signal: new AbortController().signal,
      now: () => now,
    });

    await expect(
      fetchRepoTechDetails('owner', 'repo-1', '2026-01-01T00:00:00Z', {
        signal: new AbortController().signal,
        now: () => now + 1_000,
      }),
    ).rejects.toMatchObject({
      code: 'rate_limit',
      rateLimit: expect.objectContaining({
        remaining: 0,
        cooldownUntil: (now + 60_000),
      }),
    } satisfies Partial<GitHubApiError>);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('surfaces rate limit cooldown data for exhausted primary quota responses', async () => {
    const now = Date.parse('2026-01-01T00:00:00Z');
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'API rate limit exceeded' }), {
        status: 403,
        headers: {
          'content-type': 'application/json',
          'x-ratelimit-remaining': '0',
          'x-ratelimit-limit': '60',
          'x-ratelimit-reset': String(Math.floor((now + 60_000) / 1000)),
        },
      }),
    );

    await expect(
      fetchAllOwnedRepos('owner', {
        signal: new AbortController().signal,
        now: () => now,
      }),
    ).rejects.toMatchObject({
      code: 'rate_limit',
      rateLimit: expect.objectContaining({
        remaining: 0,
      }),
    } satisfies Partial<GitHubApiError>);
  });

  it('uses a fallback cooldown for secondary limit responses without headers', async () => {
    const now = Date.parse('2026-01-01T00:00:00Z');
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'You have exceeded a secondary rate limit.' }), {
        status: 403,
        headers: {
          'content-type': 'application/json',
          'x-ratelimit-remaining': '10',
        },
      }),
    );

    await expect(
      fetchAllOwnedRepos('owner', {
        signal: new AbortController().signal,
        now: () => now,
      }),
    ).rejects.toMatchObject({
      code: 'rate_limit',
      rateLimit: expect.objectContaining({
        retryAfterMs: 60_000,
        cooldownUntil: now + 60_000,
      }),
    } satisfies Partial<GitHubApiError>);
  });

  it('parses HTTP-date Retry-After values', async () => {
    const now = Date.parse('2026-01-01T00:00:00Z');
    const retryAfter = new Date(now + 45_000).toUTCString();
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'API rate limit exceeded' }), {
        status: 403,
        headers: {
          'content-type': 'application/json',
          'retry-after': retryAfter,
        },
      }),
    );

    await expect(
      fetchAllOwnedRepos('owner', {
        signal: new AbortController().signal,
        now: () => now,
      }),
    ).rejects.toMatchObject({
      code: 'rate_limit',
      rateLimit: expect.objectContaining({
        retryAfterMs: 45_000,
        cooldownUntil: now + 45_000,
      }),
    } satisfies Partial<GitHubApiError>);
  });

  it('does not treat unrelated permission 403 errors as rate limits', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'Resource not accessible by integration' }), {
        status: 403,
        headers: {
          'content-type': 'application/json',
          'x-ratelimit-remaining': '42',
        },
      }),
    );

    await expect(
      fetchAllOwnedRepos('owner', {
        signal: new AbortController().signal,
      }),
    ).rejects.toMatchObject({
      code: 'http',
      status: 403,
    } satisfies Partial<GitHubApiError>);
  });

  it('allows retrying repo details after an aborted caller and invalidates caches by pushed_at', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ TypeScript: 100 }))
      .mockResolvedValueOnce(jsonResponse([{ name: 'package.json', type: 'file', size: 120 }]))
      .mockResolvedValueOnce(
        jsonResponse({
          type: 'file',
          name: 'package.json',
          size: 120,
          encoding: 'base64',
          content: btoa(JSON.stringify({ dependencies: { react: '^19.0.0' } })),
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ TypeScript: 100 }))
      .mockResolvedValueOnce(jsonResponse([{ name: 'package.json', type: 'file', size: 120 }]))
      .mockResolvedValueOnce(
        jsonResponse({
          type: 'file',
          name: 'package.json',
          size: 120,
          encoding: 'base64',
          content: btoa(JSON.stringify({ dependencies: { react: '^19.0.0', '@nestjs/core': '^11.0.0' } })),
        }),
      );

    const abortedController = new AbortController();
    abortedController.abort();
    await expect(
      fetchRepoTechDetails('owner', 'repo-1', '2026-01-01T00:00:00Z', {
        signal: abortedController.signal,
      }),
    ).rejects.toThrow(/aborted/i);

    const first = await fetchRepoTechDetails('owner', 'repo-1', '2026-01-01T00:00:00Z', {
      signal: new AbortController().signal,
    });
    const second = await fetchRepoTechDetails('owner', 'repo-1', '2026-01-01T00:00:00Z', {
      signal: new AbortController().signal,
    });
    const refreshed = await fetchRepoTechDetails('owner', 'repo-1', '2026-01-02T00:00:00Z', {
      signal: new AbortController().signal,
    });

    expect(first.frameworks).toEqual(['React']);
    expect(second).toEqual(first);
    expect(refreshed.frameworks).toEqual(['NestJS', 'React']);
    expect(fetchMock).toHaveBeenCalledTimes(6);
  });

  it('rejects malformed language maps and root content payloads visibly', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ TypeScript: 'lots' }))
      .mockResolvedValueOnce(jsonResponse([{ name: 'package.json', type: 'file', size: 120 }]));

    await expect(
      fetchRepoTechDetails('owner', 'repo-1', '2026-01-01T00:00:00Z', {
        signal: new AbortController().signal,
      }),
    ).rejects.toMatchObject({
      code: 'invalid_response',
      message: 'GitHub returned malformed language breakdown data.',
    } satisfies Partial<GitHubApiError>);

    __resetGitHubApiTestState();
    vi.restoreAllMocks();
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ TypeScript: 100 }))
      .mockResolvedValueOnce(jsonResponse({ unexpected: true }));

    await expect(
      fetchRepoTechDetails('owner', 'repo-1', '2026-01-01T00:00:00Z', {
        signal: new AbortController().signal,
      }),
    ).rejects.toMatchObject({
      code: 'invalid_response',
      message: 'GitHub returned malformed repository root contents.',
    } satisfies Partial<GitHubApiError>);
  });
});
