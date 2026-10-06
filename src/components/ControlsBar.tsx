import type { GitHubAccountType, RequestBackoffInfo, RepoFilters } from '../types';

type ControlsBarProps = {
  inputUsername: string;
  accountType: GitHubAccountType;
  onInputUsernameChange: (value: string) => void;
  onAccountTypeChange: (value: GitHubAccountType) => void;
  onSubmit: () => void;
  validationError: string | null;
  isLoading: boolean;
  canRefresh: boolean;
  onRefresh: () => void;
  autoRefreshEnabled: boolean;
  onAutoRefreshChange: (value: boolean) => void;
  refreshIntervalMs: number;
  onRefreshIntervalChange: (value: number) => void;
  filters: RepoFilters;
  onFiltersChange: (next: RepoFilters) => void;
  languages: string[];
  backoff: RequestBackoffInfo;
  cooldownMessage: string | null;
  activeTheme: 'light' | 'dark';
  onToggleTheme: () => void;
  lastSuccessfulSyncLabel: string | null;
  persistenceWarning: string | null;
};

const refreshOptions = [
  { label: '5 min', value: 5 * 60 * 1000 },
  { label: '15 min', value: 15 * 60 * 1000 },
  { label: '30 min', value: 30 * 60 * 1000 },
];

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="icon">
      <path d="M15.5 15.5 21 21M10.5 17a6.5 6.5 0 1 1 0-13 6.5 6.5 0 0 1 0 13Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="icon">
      <path d="M20 6v6h-6M4 18v-6h6M6.9 9A7 7 0 0 1 18 7.7L20 12M18 15a7 7 0 0 1-11.1 1.3L4 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ThemeIcon({ activeTheme }: { activeTheme: 'light' | 'dark' }) {
  return activeTheme === 'dark' ? (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="icon">
      <path d="M20 15.5A8.5 8.5 0 1 1 8.5 4a7 7 0 1 0 11.5 11.5Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="icon">
      <path d="M12 3v2.5M12 18.5V21M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M3 12h2.5M18.5 12H21M4.6 19.4l1.8-1.8M17.6 6.4l1.8-1.8M12 16.5A4.5 4.5 0 1 0 12 7.5a4.5 4.5 0 0 0 0 9Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ControlsBar(props: ControlsBarProps) {
  const backoffLine = props.backoff.message
    ? props.backoff.message
    : props.backoff.cooldownUntil
      ? `Connector backoff is active until ${new Date(props.backoff.cooldownUntil).toLocaleString()}.`
      : 'Connector responses can pause auto refresh when the host reports throttling.';

  return (
    <section className="hero-card" aria-label="Dashboard controls">
      <div className="hero-header">
        <div>
          <p className="eyebrow">Public repository intelligence</p>
          <h1>GitHub repository insights</h1>
          <p className="hero-copy">
            Load public repositories through the hosted GitHub connector, then filter the list and compare primary language counts across a user or organization.
          </p>
        </div>
        <button type="button" className="secondary-button icon-button" onClick={props.onToggleTheme}>
          <ThemeIcon activeTheme={props.activeTheme} />
          <span>{props.activeTheme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
        </button>
      </div>

      <div className="controls-layout">
        <form
          className="load-form"
          onSubmit={(event) => {
            event.preventDefault();
            props.onSubmit();
          }}
        >
          <label className="field">
            <span className="field-label">Owner type</span>
            <select
              value={props.accountType}
              onChange={(event) => props.onAccountTypeChange(event.target.value as GitHubAccountType)}
            >
              <option value="user">User</option>
              <option value="organization">Organization</option>
            </select>
          </label>
          <label className="field">
            <span className="field-label">GitHub owner login</span>
            <div className="input-shell">
              <SearchIcon />
              <input
                type="text"
                value={props.inputUsername}
                onChange={(event) => props.onInputUsernameChange(event.target.value)}
                placeholder="microsoft"
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
                aria-describedby={props.validationError ? 'username-error' : undefined}
              />
            </div>
          </label>
          <div className="form-actions">
            <button type="submit" className="primary-button" disabled={props.isLoading}>
              {props.isLoading ? 'Loading repositories' : 'Load repositories'}
            </button>
            <button type="button" className="secondary-button icon-button" onClick={props.onRefresh} disabled={!props.canRefresh}>
              <RefreshIcon />
              <span>Refresh now</span>
            </button>
          </div>
          {props.validationError ? (
            <p className="message-error" id="username-error" role="alert">
              {props.validationError}
            </p>
          ) : null}
          {props.persistenceWarning ? (
            <p className="message-warning" role="status">
              {props.persistenceWarning}
            </p>
          ) : null}
        </form>

        <div className="control-grid">
          <label className="field">
            <span className="field-label">Search repositories</span>
            <input
              type="search"
              value={props.filters.query}
              onChange={(event) => props.onFiltersChange({ ...props.filters, query: event.target.value })}
              placeholder="Name, description, or topics"
            />
          </label>

          <label className="field">
            <span className="field-label">Sort by</span>
            <select
              value={props.filters.sort}
              onChange={(event) =>
                props.onFiltersChange({ ...props.filters, sort: event.target.value as RepoFilters['sort'] })
              }
            >
              <option value="updated">Updated</option>
              <option value="stars">Stars</option>
              <option value="name">Name</option>
            </select>
          </label>

          <label className="field">
            <span className="field-label">Primary language</span>
            <select
              value={props.filters.language}
              onChange={(event) => props.onFiltersChange({ ...props.filters, language: event.target.value })}
            >
              <option value="all">All languages</option>
              {props.languages.map((language) => (
                <option key={language} value={language}>
                  {language}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="field-label">Archived</span>
            <select
              value={props.filters.archived}
              onChange={(event) =>
                props.onFiltersChange({ ...props.filters, archived: event.target.value as RepoFilters['archived'] })
              }
            >
              <option value="all">All</option>
              <option value="active">Active only</option>
              <option value="archived">Archived only</option>
            </select>
          </label>

          <label className="field">
            <span className="field-label">Forks</span>
            <select
              value={props.filters.fork}
              onChange={(event) => props.onFiltersChange({ ...props.filters, fork: event.target.value as RepoFilters['fork'] })}
            >
              <option value="all">All</option>
              <option value="source">Sources only</option>
              <option value="fork">Forks only</option>
            </select>
          </label>

          <div className="field auto-refresh-group">
            <span className="field-label">Refresh</span>
            <label className="toggle-row">
              <input
                type="checkbox"
                checked={props.autoRefreshEnabled}
                onChange={(event) => props.onAutoRefreshChange(event.target.checked)}
              />
              <span>Auto refresh</span>
            </label>
            <select
              value={props.refreshIntervalMs}
              onChange={(event) => props.onRefreshIntervalChange(Number(event.target.value))}
              disabled={!props.autoRefreshEnabled}
              aria-label="Auto refresh interval"
            >
              {refreshOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="meta-strip">
        <p>{props.lastSuccessfulSyncLabel ? `Last successful sync ${props.lastSuccessfulSyncLabel}` : 'No successful sync yet.'}</p>
        <p>Open this app in App Player or the Local Play URL from the global ms app dev command, then sign in to the hosted GitHub connection.</p>
        <p>{props.cooldownMessage ?? backoffLine}</p>
      </div>
    </section>
  );
}
