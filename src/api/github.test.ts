import type { IOperationResult } from '@microsoft/managed-apps/data';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  __resetGitHubApiTestState,
  __setGitHubConnectorOperations,
  fetchAllOwnedRepos,
  GitHubApiError,
} from './github';

function repo(id: number, name: string, overrides: Record<string, unknown> = {}) {
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
    ...overrides,
  };
}

type RuntimeFailureOperationResult<TResponse> = Omit<IOperationResult<TResponse>, 'data' | 'success'> & {
  success: false;
  data?: TResponse;
};

function asConnectorOperationResult<TResponse>(
  result: IOperationResult<TResponse> | RuntimeFailureOperationResult<TResponse>,
): IOperationResult<TResponse> {
  return result as IOperationResult<TResponse>;
}

describe('github connector helpers', () => {
  beforeEach(() => {
    __resetGitHubApiTestState();
  });

  it('loads multiple user pages, unwraps data.value, and deduplicates ids', async () => {
    const getUserReposPage = (owner: string, page: number) => {
      expect(owner).toBe('owner');
      if (page === 1) {
        return Promise.resolve({
          success: true,
          data: {
            value: Array.from({ length: 100 }, (_, index) => repo(index + 1, `repo-${index + 1}`)),
          },
        });
      }

      return Promise.resolve({
        success: true,
        data: [repo(100, 'repo-100'), repo(101, 'repo-101')],
      });
    };

    const getOrgReposPage = () => {
      throw new Error('unexpected organization call');
    };

    __setGitHubConnectorOperations({ getUserReposPage, getOrgReposPage });

    const repos = await fetchAllOwnedRepos('owner', 'user', {
      signal: new AbortController().signal,
    });

    expect(repos).toHaveLength(101);
    expect(repos.at(-1)?.id).toBe(101);
  });

  it('uses the organization operation and filters private or internal repos defensively', async () => {
    const getOrgReposPage = (owner: string, page: number) => {
      expect(owner).toBe('owner');
      expect(page).toBe(1);
      return Promise.resolve({
        success: true,
        data: [
          repo(1, 'public-repo', { visibility: 'public' }),
          repo(2, 'private-repo', { private: true }),
          repo(3, 'internal-repo', { visibility: 'internal' }),
        ],
      });
    };

    __setGitHubConnectorOperations({
      getUserReposPage: () => {
        throw new Error('unexpected user call');
      },
      getOrgReposPage,
    });

    const repos = await fetchAllOwnedRepos('owner', 'organization', {
      signal: new AbortController().signal,
    });

    expect(repos.map((item) => item.name)).toEqual(['public-repo']);
  });

  it('supports empty result sets', async () => {
    __setGitHubConnectorOperations({
      getUserReposPage: () =>
        Promise.resolve({
          success: true,
          data: [],
        }),
    });

    await expect(
      fetchAllOwnedRepos('owner', 'user', {
        signal: new AbortController().signal,
      }),
    ).resolves.toEqual([]);
  });

  it('rejects malformed repository objects before rendering', async () => {
    __setGitHubConnectorOperations({
      getUserReposPage: () =>
        Promise.resolve({
          success: true,
          data: [
            {
              ...repo(1, 'repo-1'),
              owner: null,
            },
          ],
        }),
    });

    await expect(
      fetchAllOwnedRepos('owner', 'user', {
        signal: new AbortController().signal,
      }),
    ).rejects.toMatchObject({
      code: 'invalid_response',
      message: 'The GitHub connector returned malformed repository data at index 0.',
    } satisfies Partial<GitHubApiError>);
  });

  it('rejects full repeated pages instead of looping forever', async () => {
    const repeatedPage = Array.from({ length: 100 }, (_, index) => repo(index + 1, `repo-${index + 1}`));

    __setGitHubConnectorOperations({
      getUserReposPage: () =>
        Promise.resolve({
          success: true,
          data: repeatedPage,
        }),
    });

    await expect(
      fetchAllOwnedRepos('owner', 'user', {
        signal: new AbortController().signal,
      }),
    ).rejects.toMatchObject({
      code: 'invalid_response',
      message: 'GitHub connector pagination returned repeated repository data.',
    } satisfies Partial<GitHubApiError>);
  });

  it('surfaces connector authentication errors clearly', async () => {
    __setGitHubConnectorOperations({
      getUserReposPage: () =>
        Promise.resolve(
          asConnectorOperationResult({
            success: false,
            error: {
              message: 'User is not signed in to this connection.',
              status: 401,
            },
          }),
        ),
    });

    await expect(
      fetchAllOwnedRepos('owner', 'user', {
        signal: new AbortController().signal,
      }),
    ).rejects.toMatchObject({
      code: 'auth_required',
      status: 401,
    } satisfies Partial<GitHubApiError>);
  });

  it('surfaces connector failures even when the sdk omits data on success=false', async () => {
    __setGitHubConnectorOperations({
      getUserReposPage: () =>
        Promise.resolve(
          asConnectorOperationResult({
            success: false,
            error: {
              message: 'Too many requests. Retry after 30 seconds.',
              status: 429,
            },
          }),
        ),
    });

    await expect(
      fetchAllOwnedRepos('owner', 'user', {
        signal: new AbortController().signal,
      }),
    ).rejects.toMatchObject({
      code: 'rate_limit',
      status: 429,
    } satisfies Partial<GitHubApiError>);
  });

  it('captures connector retry guidance from throttling errors', async () => {
    let receivedBackoffMessage: string | null = null;

    __setGitHubConnectorOperations({
      getUserReposPage: () =>
        Promise.resolve({
          success: false,
          data: [],
          error: {
            message: 'Too many requests. Retry after 30 seconds.',
            status: 429,
          },
        }),
    });

    await expect(
      fetchAllOwnedRepos('owner', 'user', {
        signal: new AbortController().signal,
        now: () => Date.parse('2026-01-01T00:00:00Z'),
        onBackoff: (info) => {
          receivedBackoffMessage = info.message;
        },
      }),
    ).rejects.toMatchObject({
      code: 'rate_limit',
      backoff: {
        retryAfterMs: 30_000,
        cooldownUntil: Date.parse('2026-01-01T00:00:30Z'),
        message: 'Connector retry guidance received: wait 30 seconds before retrying.',
      },
    } satisfies Partial<GitHubApiError>);

    expect(receivedBackoffMessage).toContain('wait 30 seconds');
  });

  it('rejects impossible success results that also include an error payload', async () => {
    __setGitHubConnectorOperations({
      getUserReposPage: () =>
        Promise.resolve({
          success: true,
          data: [],
          error: new Error('unexpected'),
        }),
    });

    await expect(
      fetchAllOwnedRepos('owner', 'user', {
        signal: new AbortController().signal,
      }),
    ).rejects.toMatchObject({
      code: 'invalid_response',
      message: 'The GitHub connector reported both success and error for the same request.',
    } satisfies Partial<GitHubApiError>);
  });

  it('treats late connector rejections after abort as aborts without notifying backoff', async () => {
    let onBackoffCalled = false;

    __setGitHubConnectorOperations({
      getUserReposPage: () =>
        new Promise<IOperationResult<never>>((_resolve, reject) => {
          setTimeout(() => {
            reject({
              message: 'Too many requests. Retry after 30 seconds.',
              status: 429,
            });
          }, 0);
        }),
    });

    const controller = new AbortController();
    const pendingRepos = fetchAllOwnedRepos('owner', 'user', {
      signal: controller.signal,
      onBackoff: () => {
        onBackoffCalled = true;
      },
    });

    controller.abort();

    await expect(pendingRepos).rejects.toMatchObject({
      name: 'AbortError',
    });
    expect(onBackoffCalled).toBe(false);
  });
});
