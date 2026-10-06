import { describe, expect, it } from 'vitest';
import { buildRepoDetailKey, reconcileDetailStatesWithRepos, shouldFetchRepoDetails } from './repoDetailsState';
import type { GitHubRepo, RepoDetailState } from '../types';

const repo = (name: string, pushedAt: string | null): GitHubRepo => ({
  id: name === 'alpha' ? 1 : 2,
  name,
  full_name: `owner/${name}`,
  description: null,
  html_url: `https://github.com/owner/${name}`,
  updated_at: '2026-01-01T00:00:00Z',
  pushed_at: pushedAt,
  language: null,
  stargazers_count: 0,
  forks_count: 0,
  archived: false,
  fork: false,
  owner: {
    login: 'owner',
  },
});

describe('repoDetailsState', () => {
  it('requires a reload when the repo push timestamp changes', () => {
    const state: RepoDetailState = {
      status: 'loaded',
      repoPushedAt: '2026-01-01T00:00:00Z',
      data: {
        languageBreakdown: [],
        frameworks: ['React'],
        tooling: [],
        rootSignals: [],
        evidenceFiles: ['package.json'],
        notes: [],
        manifestStatus: 'available',
      },
    };

    expect(shouldFetchRepoDetails(state, '2026-01-02T00:00:00Z')).toBe(true);
    expect(shouldFetchRepoDetails(state, '2026-01-01T00:00:00Z')).toBe(false);
  });

  it('resets stale detail entries after a repo refresh changes pushed_at', () => {
    const key = buildRepoDetailKey('owner', 'alpha');
    const detailStates: Record<string, RepoDetailState> = {
      [key]: {
        status: 'loaded',
        repoPushedAt: '2026-01-01T00:00:00Z',
        data: {
          languageBreakdown: [],
          frameworks: ['React'],
          tooling: [],
          rootSignals: [],
          evidenceFiles: ['package.json'],
          notes: [],
          manifestStatus: 'available',
        },
      },
    };

    const reconciled = reconcileDetailStatesWithRepos(detailStates, [repo('alpha', '2026-01-02T00:00:00Z')]);

    expect(reconciled[key]).toEqual({
      status: 'idle',
      repoPushedAt: '2026-01-02T00:00:00Z',
    });
  });
});
