import type { GitHubRepo, RepoDetailState } from '../types';

export function buildRepoDetailKey(owner: string, repo: string): string {
  return `${owner}/${repo}`;
}

export function shouldFetchRepoDetails(
  detailState: RepoDetailState | undefined,
  repoPushedAt: string | null,
): boolean {
  if (!detailState) {
    return true;
  }

  if (detailState.status === 'loading') {
    return false;
  }

  if (detailState.repoPushedAt !== repoPushedAt) {
    return true;
  }

  return detailState.status !== 'loaded';
}

export function reconcileDetailStatesWithRepos(
  detailStates: Record<string, RepoDetailState>,
  repos: GitHubRepo[],
): Record<string, RepoDetailState> {
  const repoPushedAtByKey = new Map(
    repos.map((repo) => [buildRepoDetailKey(repo.owner.login, repo.name), repo.pushed_at] as const),
  );

  return Object.fromEntries(
    Object.entries(detailStates)
      .filter(([key]) => repoPushedAtByKey.has(key))
      .map(([key, state]) => {
        const repoPushedAt = repoPushedAtByKey.get(key) ?? null;
        if (state.repoPushedAt === repoPushedAt) {
          return [key, state] as const;
        }

        return [
          key,
          {
            status: 'idle',
            repoPushedAt,
          } satisfies RepoDetailState,
        ] as const;
      }),
  );
}

export function reconcileExpandedRepos(
  expandedRepos: Record<string, boolean>,
  repos: GitHubRepo[],
): Record<string, boolean> {
  const validKeys = new Set(repos.map((repo) => buildRepoDetailKey(repo.owner.login, repo.name)));
  return Object.fromEntries(Object.entries(expandedRepos).filter(([key, expanded]) => validKeys.has(key) && expanded));
}
