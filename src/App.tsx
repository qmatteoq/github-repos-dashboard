import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ControlsBar } from './components/ControlsBar';
import { LanguagePanel } from './components/LanguagePanel';
import { RepoCard } from './components/RepoCard';
import { SummaryCards } from './components/SummaryCards';
import {
  fetchAllOwnedRepos,
  fetchRepoTechDetails,
  GitHubApiError,
  isAbortError,
  isValidGitHubUsername,
  normalizeUsername,
} from './api/github';
import {
  beginRepoLoad,
  completeRepoLoadFailure,
  completeRepoLoadSuccess,
  createInitialDashboardState,
  getNextAutoRefreshDelay,
  restoreRememberedUsername,
} from './lib/dashboardState';
import { readStoredUsername, writeStoredUsername } from './lib/persistence';
import {
  buildRepoDetailKey,
  reconcileDetailStatesWithRepos,
  reconcileExpandedRepos,
  shouldFetchRepoDetails,
} from './lib/repoDetailsState';
import { buildPrimaryLanguageDistribution, collectPrimaryLanguages, filterAndSortRepos, summarizeRepos } from './lib/repoAnalysis';
import type { GitHubRepo, RateLimitInfo, RepoDetailState, RepoFilters } from './types';

const LAST_USERNAME_STORAGE_KEY = 'github-repos-dashboard:last-username';
const DEFAULT_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

const defaultFilters: RepoFilters = {
  query: '',
  sort: 'updated',
  language: 'all',
  archived: 'all',
  fork: 'all',
};

const emptyRateLimit: RateLimitInfo = {
  limit: null,
  remaining: null,
  resetAt: null,
  retryAfterMs: null,
  cooldownUntil: null,
};

export default function App() {
  const restoredSession = useMemo(
    () => readStoredUsername(() => window.localStorage, LAST_USERNAME_STORAGE_KEY),
    [],
  );
  const restoredUsername = useMemo(
    () => restoreRememberedUsername(restoredSession.value),
    [restoredSession.value],
  );
  const [dashboard, setDashboard] = useState(() => createInitialDashboardState(restoredUsername));
  const [inputUsername, setInputUsername] = useState(restoredUsername);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [persistenceWarning, setPersistenceWarning] = useState<string | null>(restoredSession.warning);
  const [filters, setFilters] = useState<RepoFilters>(defaultFilters);
  const [rateLimit, setRateLimit] = useState<RateLimitInfo>(emptyRateLimit);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [refreshIntervalMs, setRefreshIntervalMs] = useState(DEFAULT_REFRESH_INTERVAL_MS);
  const [detailStates, setDetailStates] = useState<Record<string, RepoDetailState>>({});
  const [expandedRepos, setExpandedRepos] = useState<Record<string, boolean>>({});
  const [isDocumentVisible, setIsDocumentVisible] = useState(document.visibilityState !== 'hidden');
  const [theme, setTheme] = useState<'light' | 'dark'>(
    document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light',
  );
  const requestControllerRef = useRef<AbortController | null>(null);
  const detailRequestControllersRef = useRef<Record<string, AbortController>>({});
  const dashboardRef = useRef(dashboard);
  const detailStatesRef = useRef(detailStates);
  const expandedReposRef = useRef(expandedRepos);

  useEffect(() => {
    dashboardRef.current = dashboard;
  }, [dashboard]);

  useEffect(() => {
    detailStatesRef.current = detailStates;
  }, [detailStates]);

  useEffect(() => {
    expandedReposRef.current = expandedRepos;
  }, [expandedRepos]);

  const handleRateLimit = useCallback((info: RateLimitInfo) => {
    setRateLimit(info);
    if (info.cooldownUntil && info.cooldownUntil > Date.now()) {
      setCooldownUntil(info.cooldownUntil);
      return;
    }

    setCooldownUntil((current) => (current && current > Date.now() ? current : null));
  }, []);

  useEffect(() => {
    if (!cooldownUntil || cooldownUntil <= Date.now()) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setCooldownUntil(null);
    }, cooldownUntil - Date.now());

    return () => {
      window.clearTimeout(timeout);
    };
  }, [cooldownUntil]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsDocumentVisible(document.visibilityState !== 'hidden');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const loadRepositories = useCallback(
    async (rawUsername: string, source: 'initial' | 'manual' | 'submit' | 'auto') => {
      const username = normalizeUsername(rawUsername);
      const previousLoadedUsername = dashboardRef.current.loadedUsername;
      const sameUser = previousLoadedUsername === username;

      requestControllerRef.current?.abort();
      const controller = new AbortController();
      requestControllerRef.current = controller;

      setDashboard((previous) => beginRepoLoad(previous, username));

      if (!sameUser) {
        Object.values(detailRequestControllersRef.current).forEach((detailController) => detailController.abort());
        detailRequestControllersRef.current = {};
        setDetailStates({});
        setExpandedRepos({});
      }

      try {
        const repos = await fetchAllOwnedRepos(username, {
          signal: controller.signal,
          onRateLimit: handleRateLimit,
        });

        if (controller.signal.aborted) {
          return;
        }

        const syncedAt = new Date().toISOString();
        setDashboard((previous) => completeRepoLoadSuccess(previous, username, syncedAt, repos));
        setDetailStates((previous) => reconcileDetailStatesWithRepos(previous, repos));
        setExpandedRepos((previous) => reconcileExpandedRepos(previous, repos));
        setPersistenceWarning(writeStoredUsername(() => window.localStorage, LAST_USERNAME_STORAGE_KEY, username));
        if (source !== 'auto') {
          setInputUsername(username);
        }
      } catch (error) {
        if (isAbortError(error)) {
          return;
        }

        const message = formatUserFacingError(error, username);
        const attemptedAt = new Date().toISOString();
        const nextCooldown = error instanceof GitHubApiError ? error.rateLimit?.cooldownUntil ?? null : null;
        if (nextCooldown && nextCooldown > Date.now()) {
          setCooldownUntil(nextCooldown);
        }

        setDashboard((previous) => completeRepoLoadFailure(previous, username, message, attemptedAt));
      }
    },
    [handleRateLimit],
  );

  useEffect(() => {
    if (restoredUsername) {
      void loadRepositories(restoredUsername, 'initial');
    }

    return () => {
      requestControllerRef.current?.abort();
      Object.values(detailRequestControllersRef.current).forEach((detailController) => detailController.abort());
      detailRequestControllersRef.current = {};
    };
  }, [loadRepositories, restoredUsername]);

  const summary = useMemo(() => summarizeRepos(dashboard.repos), [dashboard.repos]);
  const availableLanguages = useMemo(() => collectPrimaryLanguages(dashboard.repos), [dashboard.repos]);
  const filteredRepos = useMemo(() => filterAndSortRepos(dashboard.repos, filters), [dashboard.repos, filters]);
  const filteredLanguageDistribution = useMemo(
    () => buildPrimaryLanguageDistribution(filteredRepos),
    [filteredRepos],
  );

  useEffect(() => {
    if (filters.language !== 'all' && !availableLanguages.includes(filters.language)) {
      setFilters((previous) => ({ ...previous, language: 'all' }));
    }
  }, [availableLanguages, filters.language]);

  const autoRefreshDelay = getNextAutoRefreshDelay({
    enabled: autoRefreshEnabled,
    intervalMs: refreshIntervalMs,
    isVisible: isDocumentVisible,
    cooldownUntil,
    lastSuccessfulSync: dashboard.lastSuccessfulSync,
    lastAttemptCompletedAt: dashboard.lastAttemptCompletedAt,
    hasLoadedUsername: Boolean(dashboard.loadedUsername),
    isLoading: dashboard.status === 'loading',
    now: Date.now(),
  });

  useEffect(() => {
    if (autoRefreshDelay === null) {
      return;
    }

    const timeout = window.setTimeout(() => {
      if (dashboardRef.current.loadedUsername) {
        void loadRepositories(dashboardRef.current.loadedUsername, 'auto');
      }
    }, autoRefreshDelay);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [autoRefreshDelay, loadRepositories]);

  const handleSubmit = useCallback(() => {
    const candidate = normalizeUsername(inputUsername);
    if (!candidate) {
      setValidationError('Enter a GitHub username or organization login.');
      return;
    }

    if (!isValidGitHubUsername(candidate)) {
      setValidationError('Use 1 to 39 letters, digits, or single internal hyphens.');
      return;
    }

    if (cooldownUntil && cooldownUntil > Date.now()) {
      setValidationError(`GitHub is rate limited right now. Try again after ${new Date(cooldownUntil).toLocaleTimeString()}.`);
      return;
    }

    setValidationError(null);
    void loadRepositories(candidate, 'submit');
  }, [cooldownUntil, inputUsername, loadRepositories]);

  const handleRefresh = useCallback(() => {
    if (!dashboard.loadedUsername || (cooldownUntil && cooldownUntil > Date.now())) {
      return;
    }
    setValidationError(null);
    void loadRepositories(dashboard.loadedUsername, 'manual');
  }, [cooldownUntil, dashboard.loadedUsername, loadRepositories]);

  const handleToggleTheme = useCallback(() => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', nextTheme);
    setTheme(nextTheme);
  }, [theme]);

  const loadRepoDetails = useCallback(
    async (repo: GitHubRepo) => {
      const key = buildRepoDetailKey(repo.owner.login, repo.name);
      const currentState = detailStatesRef.current[key];
      if (!shouldFetchRepoDetails(currentState, repo.pushed_at)) {
        return;
      }

      setDetailStates((previous) => ({
        ...previous,
        [key]: {
          status: 'loading',
          repoPushedAt: repo.pushed_at,
        },
      }));
      const controller = new AbortController();
      detailRequestControllersRef.current[key] = controller;

      try {
        const details = await fetchRepoTechDetails(repo.owner.login, repo.name, repo.pushed_at, {
          signal: controller.signal,
          onRateLimit: handleRateLimit,
        });

        const currentRepo = dashboardRef.current.repos.find(
          (candidate) => candidate.owner.login === repo.owner.login && candidate.name === repo.name,
        );
        if (
          controller.signal.aborted ||
          detailRequestControllersRef.current[key] !== controller ||
          !currentRepo ||
          currentRepo.pushed_at !== repo.pushed_at
        ) {
          return;
        }

        setDetailStates((previous) => ({
          ...previous,
          [key]: {
            status: 'loaded',
            repoPushedAt: repo.pushed_at,
            data: details,
          },
        }));
      } catch (error) {
        if (isAbortError(error)) {
          if (detailRequestControllersRef.current[key] === controller) {
            setDetailStates((previous) => ({
              ...previous,
              [key]: {
                status: 'idle',
                repoPushedAt: repo.pushed_at,
              },
            }));
          }
          return;
        }

        const message = formatUserFacingError(error, `${repo.owner.login}/${repo.name}`);
        if (detailRequestControllersRef.current[key] !== controller) {
          return;
        }
        setDetailStates((previous) => ({
          ...previous,
          [key]: {
            status: 'error',
            repoPushedAt: repo.pushed_at,
            error: message,
          },
        }));
      } finally {
        if (detailRequestControllersRef.current[key] === controller) {
          delete detailRequestControllersRef.current[key];
        }
      }
    },
    [handleRateLimit],
  );

  const handleToggleDetails = useCallback(
    async (repo: GitHubRepo) => {
      const key = buildRepoDetailKey(repo.owner.login, repo.name);
      const shouldExpand = !expandedReposRef.current[key];

      setExpandedRepos((previous) => ({ ...previous, [key]: shouldExpand }));

      if (shouldExpand) {
        await loadRepoDetails(repo);
      }
    },
    [loadRepoDetails],
  );

  useEffect(() => {
    dashboard.repos.forEach((repo) => {
      const key = buildRepoDetailKey(repo.owner.login, repo.name);
      const detailState = detailStates[key];
      const shouldRefreshExpandedDetail =
        (expandedRepos[key] ?? false) &&
        (!detailState || detailState.status === 'idle' || detailState.repoPushedAt !== repo.pushed_at);
      if (shouldRefreshExpandedDetail) {
        void loadRepoDetails(repo);
      }
    });
  }, [dashboard.repos, detailStates, expandedRepos, loadRepoDetails]);

  const cooldownMessage =
    cooldownUntil && cooldownUntil > Date.now()
      ? `GitHub API cooldown is active until ${new Date(cooldownUntil).toLocaleString()}.`
      : null;

  const lastSuccessfulSyncLabel = dashboard.lastSuccessfulSync
    ? new Date(dashboard.lastSuccessfulSync).toLocaleString()
    : null;

  const canRefresh = Boolean(dashboard.loadedUsername) && dashboard.status !== 'loading' && !(cooldownUntil && cooldownUntil > Date.now());

  return (
    <div className="app-shell">
      <ControlsBar
        inputUsername={inputUsername}
        onInputUsernameChange={(value) => {
          setInputUsername(value);
          if (validationError) {
            setValidationError(null);
          }
        }}
        onSubmit={handleSubmit}
        validationError={validationError}
        isLoading={dashboard.status === 'loading'}
        canRefresh={canRefresh}
        onRefresh={handleRefresh}
        autoRefreshEnabled={autoRefreshEnabled}
        onAutoRefreshChange={setAutoRefreshEnabled}
        refreshIntervalMs={refreshIntervalMs}
        onRefreshIntervalChange={setRefreshIntervalMs}
        filters={filters}
        onFiltersChange={setFilters}
        languages={availableLanguages}
        rateLimit={rateLimit}
        cooldownMessage={cooldownMessage}
        activeTheme={theme}
        onToggleTheme={handleToggleTheme}
        lastSuccessfulSyncLabel={lastSuccessfulSyncLabel}
        persistenceWarning={persistenceWarning}
      />

      <SummaryCards summary={summary} filteredCount={filteredRepos.length} />

      <div className="main-grid">
        <section className="panel-card repo-panel" aria-labelledby="repos-panel-title">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Repository list</p>
              <h2 id="repos-panel-title">
                {dashboard.loadedUsername ? `${dashboard.loadedUsername} repositories` : 'Load a GitHub account to begin'}
              </h2>
            </div>
            <p className="panel-subtitle">
              {dashboard.loadedUsername ? `${filteredRepos.length.toLocaleString()} shown` : 'No data loaded yet'}
            </p>
          </div>

          {dashboard.error ? (
            <div className={`status-banner${dashboard.stale ? ' status-banner-stale' : ''}`} role="alert">
              <p>{dashboard.error}</p>
              {dashboard.stale ? <p>Showing the last successful data for {dashboard.loadedUsername}.</p> : null}
            </div>
          ) : null}

          {dashboard.status === 'idle' && !dashboard.loadedUsername ? (
            <div className="empty-state">
              <h3>Start with a public GitHub account</h3>
              <p>Enter a username or organization login to load every public owner repository and unlock filtering, language insights, and on demand stack detection.</p>
            </div>
          ) : null}

          {dashboard.status === 'loading' && dashboard.repos.length === 0 ? (
            <div className="empty-state">
              <h3>Loading repositories</h3>
              <p>Fetching paginated public repository data from the GitHub REST API.</p>
            </div>
          ) : null}

          {dashboard.loadedUsername && dashboard.repos.length === 0 && dashboard.status === 'ready' ? (
            <div className="empty-state">
              <h3>No public owner repositories found</h3>
              <p>This account has no public repositories owned directly by the user or organization.</p>
            </div>
          ) : null}

          {dashboard.repos.length > 0 && filteredRepos.length === 0 ? (
            <div className="empty-state compact-empty-state">
              <h3>No repositories match the current filters</h3>
              <p>Try clearing the search text or broadening the language, archived, or fork filters.</p>
            </div>
          ) : null}

          <div className="repo-list">
            {filteredRepos.map((repo) => {
              const key = buildRepoDetailKey(repo.owner.login, repo.name);
              return (
                <RepoCard
                  key={repo.id}
                  repo={repo}
                  detailState={detailStates[key] ?? { status: 'idle' }}
                  expanded={expandedRepos[key] ?? false}
                  onToggleDetails={() => {
                    void handleToggleDetails(repo);
                  }}
                />
              );
            })}
          </div>
        </section>

        <LanguagePanel
          distribution={filteredLanguageDistribution}
          totalRepoCount={dashboard.repos.length}
          filteredRepoCount={filteredRepos.length}
        />
      </div>
    </div>
  );
}

function formatUserFacingError(error: unknown, username: string): string {
  if (error instanceof GitHubApiError) {
    if (error.code === 'rate_limit') {
      const resetTime = error.rateLimit?.cooldownUntil
        ? new Date(error.rateLimit.cooldownUntil).toLocaleString()
        : error.rateLimit?.resetAt
          ? new Date(error.rateLimit.resetAt).toLocaleString()
          : null;
      return resetTime
        ? `GitHub rate limits blocked new data for ${username}. Try again after ${resetTime}.`
        : `GitHub rate limits blocked new data for ${username}.`;
    }

    if (error.status === 404) {
      return `GitHub could not find ${username}.`;
    }

    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return `An unexpected error occurred while loading ${username}.`;
}
