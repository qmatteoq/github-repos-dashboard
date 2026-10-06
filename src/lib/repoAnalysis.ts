import type { GitHubRepo, LanguageDistributionItem, RepoFilters, RepoSummary } from '../types';

export function summarizeRepos(repos: GitHubRepo[]): RepoSummary {
  const languages = new Set(
    repos.map((repo) => repo.language?.trim()).filter((language): language is string => Boolean(language)),
  );

  return {
    repoCount: repos.length,
    totalStars: repos.reduce((sum, repo) => sum + repo.stargazers_count, 0),
    totalForks: repos.reduce((sum, repo) => sum + repo.forks_count, 0),
    distinctLanguages: languages.size,
  };
}

export function buildPrimaryLanguageDistribution(repos: GitHubRepo[]): LanguageDistributionItem[] {
  const counts = new Map<string, number>();

  repos.forEach((repo) => {
    const language = repo.language?.trim() || 'Unspecified';
    counts.set(language, (counts.get(language) ?? 0) + 1);
  });

  return [...counts.entries()]
    .map(([language, count]) => ({ language, count }))
    .sort((left, right) => right.count - left.count || left.language.localeCompare(right.language));
}

export function collectPrimaryLanguages(repos: GitHubRepo[]): string[] {
  return [...new Set(repos.map((repo) => repo.language?.trim()).filter((language): language is string => Boolean(language)))]
    .sort((left, right) => left.localeCompare(right));
}

export function filterAndSortRepos(repos: GitHubRepo[], filters: RepoFilters): GitHubRepo[] {
  const query = filters.query.trim().toLowerCase();

  return repos
    .filter((repo) => {
      if (filters.language !== 'all' && (repo.language ?? '') !== filters.language) {
        return false;
      }

      if (filters.archived === 'active' && repo.archived) {
        return false;
      }

      if (filters.archived === 'archived' && !repo.archived) {
        return false;
      }

      if (filters.fork === 'source' && repo.fork) {
        return false;
      }

      if (filters.fork === 'fork' && !repo.fork) {
        return false;
      }

      if (!query) {
        return true;
      }

      const haystack = [repo.name, repo.description ?? '', repo.topics?.join(' ') ?? ''].join(' ').toLowerCase();
      return haystack.includes(query);
    })
    .sort((left, right) => {
      switch (filters.sort) {
        case 'stars':
          return right.stargazers_count - left.stargazers_count || left.name.localeCompare(right.name);
        case 'name':
          return left.name.localeCompare(right.name);
        case 'updated':
        default:
          return new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime() || left.name.localeCompare(right.name);
      }
    });
}
