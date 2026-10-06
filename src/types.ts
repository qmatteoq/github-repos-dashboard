export type GitHubAccountType = 'user' | 'organization';

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  updated_at: string;
  pushed_at: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  archived: boolean;
  fork: boolean;
  private?: boolean;
  visibility?: string;
  topics?: string[];
  owner: {
    login: string;
  };
}

export interface RequestBackoffInfo {
  retryAfterMs: number | null;
  cooldownUntil: number | null;
  message: string | null;
}

export interface RepoFilters {
  query: string;
  sort: 'updated' | 'stars' | 'name';
  language: string;
  archived: 'all' | 'active' | 'archived';
  fork: 'all' | 'source' | 'fork';
}

export interface RepoSummary {
  repoCount: number;
  totalStars: number;
  totalForks: number;
  distinctLanguages: number;
}

export interface LanguageDistributionItem {
  language: string;
  count: number;
}

export interface RepoDashboardState {
  requestedUsername: string;
  requestedAccountType: GitHubAccountType;
  loadedUsername: string | null;
  loadedAccountType: GitHubAccountType | null;
  repos: GitHubRepo[];
  status: 'idle' | 'loading' | 'ready' | 'error';
  stale: boolean;
  error: string | null;
  lastSuccessfulSync: string | null;
  lastAttemptCompletedAt: string | null;
}
