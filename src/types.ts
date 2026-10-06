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
  topics?: string[];
  owner: {
    login: string;
  };
}

export interface RateLimitInfo {
  limit: number | null;
  remaining: number | null;
  resetAt: string | null;
  retryAfterMs: number | null;
  cooldownUntil: number | null;
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

export interface RootContentEntry {
  name: string;
  type: 'file' | 'dir' | 'symlink' | 'submodule';
  size?: number;
}

export interface ManifestFile {
  name: string;
  text: string;
}

export interface LanguageBreakdownItem {
  language: string;
  bytes: number;
  percentage: number;
}

export interface RepoTechDetails {
  languageBreakdown: LanguageBreakdownItem[];
  frameworks: string[];
  tooling: string[];
  rootSignals: string[];
  evidenceFiles: string[];
  notes: string[];
  manifestStatus: 'available' | 'empty' | 'unavailable';
}

export interface RepoDetailState {
  status: 'idle' | 'loading' | 'loaded' | 'error';
  repoPushedAt?: string | null;
  data?: RepoTechDetails;
  error?: string;
}

export interface RepoDashboardState {
  requestedUsername: string;
  loadedUsername: string | null;
  repos: GitHubRepo[];
  status: 'idle' | 'loading' | 'ready' | 'error';
  stale: boolean;
  error: string | null;
  lastSuccessfulSync: string | null;
  lastAttemptCompletedAt: string | null;
}
