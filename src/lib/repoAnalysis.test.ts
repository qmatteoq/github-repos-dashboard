import { describe, expect, it } from 'vitest';
import { buildPrimaryLanguageDistribution, collectPrimaryLanguages, filterAndSortRepos, summarizeRepos } from './repoAnalysis';
import type { GitHubRepo, RepoFilters } from '../types';

const baseRepo: GitHubRepo = {
  id: 1,
  name: 'alpha',
  full_name: 'owner/alpha',
  description: 'React playground',
  html_url: 'https://github.com/owner/alpha',
  updated_at: '2026-02-02T00:00:00Z',
  pushed_at: '2026-02-02T00:00:00Z',
  language: 'TypeScript',
  stargazers_count: 15,
  forks_count: 3,
  archived: false,
  fork: false,
  owner: {
    login: 'owner',
  },
};

describe('repoAnalysis', () => {
  it('filters by search text, fork state, and sorts by stars', () => {
    const repos: GitHubRepo[] = [
      baseRepo,
      {
        ...baseRepo,
        id: 2,
        name: 'beta',
        description: 'Service API',
        language: 'Python',
        stargazers_count: 30,
        topics: ['fastapi'],
      },
      {
        ...baseRepo,
        id: 3,
        name: 'forked',
        description: 'Mirror',
        stargazers_count: 50,
        fork: true,
      },
    ];

    const filters: RepoFilters = {
      query: 'api',
      sort: 'stars',
      language: 'all',
      archived: 'all',
      fork: 'source',
    };

    const result = filterAndSortRepos(repos, filters);
    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe('beta');
  });

  it('counts primary languages in the current view', () => {
    const distribution = buildPrimaryLanguageDistribution([
      baseRepo,
      { ...baseRepo, id: 2, name: 'beta', language: 'Python' },
      { ...baseRepo, id: 3, name: 'gamma', language: 'TypeScript' },
      { ...baseRepo, id: 4, name: 'delta', language: null },
    ]);

    expect(distribution).toEqual([
      { language: 'TypeScript', count: 2 },
      { language: 'Python', count: 1 },
      { language: 'Unspecified', count: 1 },
    ]);
  });

  it('collects distinct primary languages in alphabetical order', () => {
    expect(
      collectPrimaryLanguages([
        baseRepo,
        { ...baseRepo, id: 2, name: 'beta', language: 'Python' },
        { ...baseRepo, id: 3, name: 'gamma', language: 'TypeScript' },
        { ...baseRepo, id: 4, name: 'delta', language: null },
      ]),
    ).toEqual(['Python', 'TypeScript']);
  });

  it('summarizes public repo totals for cards', () => {
    expect(
      summarizeRepos([
        baseRepo,
        { ...baseRepo, id: 2, name: 'beta', language: 'Python', stargazers_count: 30, forks_count: 5 },
      ]),
    ).toEqual({
      repoCount: 2,
      totalStars: 45,
      totalForks: 8,
      distinctLanguages: 2,
    });
  });
});
