import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ControlsBar } from './components/ControlsBar';
import { LanguagePanel } from './components/LanguagePanel';
import { RepoCard } from './components/RepoCard';
import { SummaryCards } from './components/SummaryCards';
import {
  fetchAllOwnedRepos,
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
import { buildPrimaryLanguageDistribution, collectPrimaryLanguages, filterAndSortRepos, summarizeRepos } from './lib/repoAnalysis';
import type { GitHubAccountType, RequestBackoffInfo, RepoFilters } from './types';

const LAST_USERNAME_STORAGE_KEY = 'github-repos-dashboard:last-username';
const DEFAULT_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

const defaultFilters: RepoFilters = {
  query: '',
  sort: 'updated',
  language: 'all',
  archived: 'all',
  fork: 'all',
};

const emptyBackoff: RequestBackoffInfo = {
  retryAfterMs: null,
  cooldownUntil: null,
  message: null,
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
  const [accountType, setAccountType] = useState<GitHubAccountType>('user');
  const [dashboard, setDashboard] = useState(() => createInitialDashboardState(restoredUsername, 'user'));
  const [inputUsername, setInputUsername] = useState(restoredUsername);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [persistenceWarning, setPersistenceWarning] = useState<string | null>(restoredSession.warning);
  const [filters, setFilters] = useState<RepoFilters>(defaultFilters);
  const [backoff, setBackoff] = useState<RequestBackoffInfo>(emptyBackoff);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [refreshIntervalMs, setRefreshIntervalMs] = useState(DEFAULT_REFRESH_INTERVAL_MS);
  const [isDocumentVisible, setIsDocumentVisible] = useState(document.visibilityState !== 'hidden');
  const [theme, setTheme] = useState<'light' | 'dark'>(
    document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light',
  );
  const requestControllerRef = useRef<AbortController | null>(null);
  const dashboardRef = useRef(dashboard);

  useEffect(() => {
    dashboardRef.current = dashboard;
  }, [dashboard]);

  useEffect(() => {
    if (!cooldownUntil || cooldownUntil <= Date.now()) {
      if (backoff.cooldownUntil !== null || backoff.message) {
        setBackoff(emptyBackoff);
      }
      return;
    }

    const timeout = window.setTimeout(() => {
      setCooldownUntil(null);
      setBackoff(emptyBackoff);
    }, cooldownUntil - Date.now());

    return () => {
      window.clearTimeout(timeout);
    };
  }, [backoff.cooldownUntil, backoff.message, cooldownUntil]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsDocumentVisible(document.visibilityState !== 'hidden');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const handleBackoff = useCallback((info: RequestBackoffInfo) => {
    setBackoff(info);
    if (info.cooldownUntil && info.cooldownUntil > Date.now()) {
      setCooldownUntil(info.cooldownUntil);
      return;
    }

    setCooldownUntil((current) => (current && current > Date.now() ? current : null));
  }, []);

  const loadRepositories = useCallback(
    async (
      rawUsername: string,
      nextAccountType: GitHubAccountType,
      source: 'initial' | 'manual' | 'submit' | 'auto',
    ) => {
      const username = normalizeUsername(rawUsername);
      const sameRequest =
        dashboardRef.current.loadedUsername === username &&
        dashboardRef.current.loadedAccountType === nextAccountType;

      requestControllerRef.current?.abort();
      const controller = new AbortController();
      requestControllerRef.current = controller;

      setDashboard((previous) => beginRepoLoad(previous, username, nextAccountType));

      try {
        const repos = await fetchAllOwnedRepos(username, nextAccountType, {
          signal: controller.signal,
          onBackoff: handleBackoff,
        });

        if (controller.signal.aborted) {
          return;
        }

        const syncedAt = new Date().toISOString();
        setDashboard((previous) =>
          completeRepoLoadSuccess(previous, username, nextAccountType, syncedAt, repos),
        );
        setBackoff(emptyBackoff);
        setCooldownUntil(null);
        setPersistenceWarning(writeStoredUsername(() => window.localStorage, LAST_USERNAME_STORAGE_KEY, username));
        if (source !== 'auto') {
          setInputUsername(username);
        }
        if (!sameRequest) {
          setFilters(defaultFilters);
        }
      } catch (error) {
        if (
          isAbortError(error) ||
          controller.signal.aborted ||
          requestControllerRef.current !== controller
        ) {
          return;
        }

        const message = formatUserFacingError(error, username, nextAccountType);
        const attemptedAt = new Date().toISOString();
        if (error instanceof GitHubApiError && error.backoff.cooldownUntil && error.backoff.cooldownUntil > Date.now()) {
          setCooldownUntil(error.backoff.cooldownUntil);
        }

        setDashboard((previous) =>
          completeRepoLoadFailure(previous, username, nextAccountType, message, attemptedAt),
        );
      }
    },
    [handleBackoff],
  );

  useEffect(() => {
    if (restoredUsername) {
      void loadRepositories(restoredUsername, 'user', 'initial');
    }

    return () => {
      requestControllerRef.current?.abort();
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
      const username = dashboardRef.current.loadedUsername;
      const nextAccountType = dashboardRef.current.loadedAccountType;
      if (username && nextAccountType) {
        void loadRepositories(username, nextAccountType, 'auto');
      }
    }, autoRefreshDelay);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [autoRefreshDelay, loadRepositories]);

  const handleSubmit = useCallback(() => {
    const candidate = normalizeUsername(inputUsername);
    if (!candidate) {
      setValidationError('Enter a GitHub user or organization login.');
      return;
    }

    if (!isValidGitHubUsername(candidate)) {
      setValidationError('Use 1 to 39 letters, digits, or single internal hyphens.');
      return;
    }

    if (cooldownUntil && cooldownUntil > Date.now()) {
      setValidationError(
        `The connector asked this app to wait before retrying. Try again after ${new Date(cooldownUntil).toLocaleTimeString()}.`,
      );
      return;
    }

    setValidationError(null);
    void loadRepositories(candidate, accountType, 'submit');
  }, [accountType, cooldownUntil, inputUsername, loadRepositories]);

  const handleRefresh = useCallback(() => {
    if (!dashboard.loadedUsername || !dashboard.loadedAccountType || (cooldownUntil && cooldownUntil > Date.now())) {
      return;
    }
    setValidationError(null);
    void loadRepositories(dashboard.loadedUsername, dashboard.loadedAccountType, 'manual');
  }, [cooldownUntil, dashboard.loadedAccountType, dashboard.loadedUsername, loadRepositories]);

  const handleToggleTheme = useCallback(() => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', nextTheme);
    setTheme(nextTheme);
  }, [theme]);

  const cooldownMessage =
    cooldownUntil && cooldownUntil > Date.now()
      ? `Auto refresh is paused until ${new Date(cooldownUntil).toLocaleString()}.`
      : null;

  const lastSuccessfulSyncLabel = dashboard.lastSuccessfulSync
    ? new Date(dashboard.lastSuccessfulSync).toLocaleString()
    : null;

  const canRefresh =
    Boolean(dashboard.loadedUsername) &&
    dashboard.status !== 'loading' &&
    !(cooldownUntil && cooldownUntil > Date.now());

  const loadedLabel = dashboard.loadedAccountType === 'organization' ? 'organization' : 'user';

  return (
    <div className="app-shell">
      <ControlsBar
        inputUsername={inputUsername}
        accountType={accountType}
        onInputUsernameChange={(value) => {
          setInputUsername(value);
          if (validationError) {
            setValidationError(null);
          }
        }}
        onAccountTypeChange={(value) => {
          setAccountType(value);
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
        backoff={backoff}
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
                {dashboard.loadedUsername
                  ? `${dashboard.loadedUsername} public ${loadedLabel} repositories`
                  : 'Load a GitHub account to begin'}
              </h2>
            </div>
            <p className="panel-subtitle">
              {dashboard.loadedUsername ? `${filteredRepos.length.toLocaleString()} shown` : 'No data loaded yet'}
            </p>
          </div>

          {dashboard.error ? (
            <div className={`status-banner${dashboard.stale ? ' status-banner-stale' : ''}`} role="alert">
              <p>{dashboard.error}</p>
              {dashboard.stale ? (
                <p>
                  Showing the last successful data for {dashboard.loadedUsername} as a {loadedLabel}.
                </p>
              ) : null}
            </div>
          ) : null}

          {dashboard.status === 'idle' && !dashboard.loadedUsername ? (
            <div className="empty-state">
              <h3>Start in App Player with a hosted GitHub connection</h3>
              <p>Use App Player or the Local Play URL from the global ms app dev command, sign in to the hosted GitHub connection, and then load a public user or organization owner.</p>
            </div>
          ) : null}

          {dashboard.status === 'loading' && dashboard.repos.length === 0 ? (
            <div className="empty-state">
              <h3>Loading repositories</h3>
              <p>Fetching sequential pages of public repository data through the generated GitHub connector.</p>
            </div>
          ) : null}

          {dashboard.loadedUsername && dashboard.repos.length === 0 && dashboard.status === 'ready' ? (
            <div className="empty-state">
              <h3>No public repositories found</h3>
              <p>This owner has no public repositories available through the selected connector listing operation.</p>
            </div>
          ) : null}

          {dashboard.repos.length > 0 && filteredRepos.length === 0 ? (
            <div className="empty-state compact-empty-state">
              <h3>No repositories match the current filters</h3>
              <p>Try clearing the search text or broadening the language, archived, or fork filters.</p>
            </div>
          ) : null}

          <div className="repo-list">
            {filteredRepos.map((repo) => (
              <RepoCard key={repo.id} repo={repo} />
            ))}
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

function formatUserFacingError(
  error: unknown,
  username: string,
  accountType: GitHubAccountType,
): string {
  const ownerLabel = accountType === 'organization' ? 'organization' : 'user';

  if (error instanceof GitHubApiError) {
    if (error.code === 'rate_limit') {
      const resetTime = error.backoff.cooldownUntil
        ? new Date(error.backoff.cooldownUntil).toLocaleString()
        : null;
      return resetTime
        ? `The hosted GitHub connector throttled requests for this ${ownerLabel}. Try again after ${resetTime}.`
        : `The hosted GitHub connector throttled requests for this ${ownerLabel}.`;
    }

    if (error.code === 'connector_unavailable') {
      return 'The GitHub connector is unavailable here. Open the app in App Player or the Local Play URL from the global ms app dev command, then sign in to the hosted GitHub connection.';
    }

    if (error.code === 'auth_required') {
      return 'The hosted GitHub connection needs authentication. Open the app through App Player or the Local Play URL and complete the GitHub sign-in there.';
    }

    if (error.status === 404) {
      return `GitHub could not find the ${ownerLabel} ${username}.`;
    }

    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return `An unexpected error occurred while loading ${username}.`;
}
