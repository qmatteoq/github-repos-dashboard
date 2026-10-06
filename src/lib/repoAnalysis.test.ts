import { describe, expect, it } from 'vitest';
import {
  buildPrimaryLanguageDistribution,
  buildRepoTechDetails,
  filterAndSortRepos,
  selectManifestCandidates,
} from './repoAnalysis';
import type { GitHubRepo, RepoFilters, RootContentEntry } from '../types';

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
  topics: ['dashboard', 'react'],
  owner: {
    login: 'owner',
  },
};

describe('repoAnalysis', () => {
  it('ignores Maven comments and project names as dependency evidence', () => {
    const details = buildRepoTechDetails({
      rootEntries: [{ name: 'pom.xml', type: 'file' }],
      manifests: [{
        name: 'pom.xml',
        text: '<project><artifactId>junit</artifactId><!-- <dependency><artifactId>spring-boot-starter</artifactId></dependency> --><dependencies><dependency><artifactId>other</artifactId></dependency></dependencies></project>',
      }],
      languageBytes: {},
      notes: [],
    });
    expect(details.frameworks).toEqual([]);
    expect(details.tooling).toEqual([]);
    expect(details.evidenceFiles).toEqual(['pom.xml']);
  });

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

  it('builds root only detections from manifests and root files', () => {
    const rootEntries: RootContentEntry[] = [
      { name: 'package.json', type: 'file', size: 1200 },
      { name: 'Dockerfile', type: 'file', size: 100 },
      { name: 'tsconfig.json', type: 'file', size: 100 },
    ];

    const details = buildRepoTechDetails({
      rootEntries,
      manifests: [
        {
          name: 'package.json',
          text: JSON.stringify({
            dependencies: {
              react: '^19.0.0',
              express: '^5.0.0',
            },
            devDependencies: {
              vitest: '^2.0.0',
              typescript: '^5.0.0',
              '@playwright/test': '^1.0.0',
            },
          }),
        },
      ],
      languageBytes: {
        TypeScript: 400,
        CSS: 100,
      },
      notes: [],
    });

    expect(details.frameworks).toEqual(['Express', 'React']);
    expect(details.tooling).toEqual(['Playwright', 'TypeScript', 'Vitest']);
    expect(details.rootSignals).toEqual(['Docker', 'TypeScript configuration']);
    expect(details.languageBreakdown[0]).toMatchObject({
      language: 'TypeScript',
      percentage: 80,
    });
    expect(details.evidenceFiles).toEqual(['package.json']);
  });

  it('ignores descriptions and comments that only mention unsupported technology names', () => {
    const details = buildRepoTechDetails({
      rootEntries: [{ name: 'package.json', type: 'file', size: 600 }],
      manifests: [
        {
          name: 'package.json',
          text: JSON.stringify({
            description: 'This project is not using Flask and only mentions it in docs.',
            dependencies: {
              react: '^19.0.0',
            },
          }),
        },
      ],
      languageBytes: null,
      notes: [],
    });

    expect(details.frameworks).toEqual(['React']);
    expect(details.tooling).toEqual([]);
    expect(details.evidenceFiles).toEqual(['package.json']);
  });

  it('detects supported dependencies from their manifest declarations only', () => {
    const details = buildRepoTechDetails({
      rootEntries: [{ name: 'pyproject.toml', type: 'file', size: 600 }],
      manifests: [
        {
          name: 'pyproject.toml',
          text: `
[project]
dependencies = [
  "fastapi>=0.110.0",
  "pytest>=8.0.0"
]

[tool.poetry.dependencies]
python = "^3.12"
django = "^5.0"
`,
        },
      ],
      languageBytes: null,
      notes: ['Root manifest inspection is limited to the repository root.'],
    });

    expect(details.frameworks).toEqual(['Django', 'FastAPI']);
    expect(details.tooling).toEqual(['Pytest']);
    expect(details.notes).toEqual(['Root manifest inspection is limited to the repository root.']);
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

  it('selects at most two manifest candidates in priority order', () => {
    const entries: RootContentEntry[] = [
      { name: 'go.mod', type: 'file' },
      { name: 'package.json', type: 'file' },
      { name: 'pyproject.toml', type: 'file' },
    ];

    const result = selectManifestCandidates(entries);
    expect(result.map((entry) => entry.name)).toEqual(['package.json', 'pyproject.toml']);
  });
});
