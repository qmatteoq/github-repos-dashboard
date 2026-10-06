import { buildSafeGitHubOwnerUrl, buildSafeGitHubRepoUrl } from '../api/github';
import type { GitHubRepo, RepoDetailState } from '../types';

type RepoCardProps = {
  repo: GitHubRepo;
  detailState: RepoDetailState;
  expanded: boolean;
  onToggleDetails: () => void;
};

function ExternalLinkIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="icon">
      <path d="M14 5h5v5M10 14 19 5M19 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DetailList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="detail-block">
      <h4>{title}</h4>
      <div className="token-wrap">
        {items.map((item) => (
          <span key={item} className="token">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

export function RepoCard({ repo, detailState, expanded, onToggleDetails }: RepoCardProps) {
  return (
    <article className="repo-card">
      <div className="repo-card-header">
        <div>
          <div className="repo-title-row">
            <h3>{repo.name}</h3>
            <a
              href={buildSafeGitHubRepoUrl(repo.owner.login, repo.name)}
              target="_blank"
              rel="noreferrer noopener"
              className="repo-link"
            >
              <span>Open on GitHub</span>
              <ExternalLinkIcon />
            </a>
          </div>
          <p className="repo-owner">
            <a href={buildSafeGitHubOwnerUrl(repo.owner.login)} target="_blank" rel="noreferrer noopener">
              {repo.owner.login}
            </a>
          </p>
        </div>

        <div className="badge-row">
          {repo.archived ? <span className="badge">Archived</span> : null}
          {repo.fork ? <span className="badge">Fork</span> : null}
        </div>
      </div>

      <p className={`repo-description${repo.description ? '' : ' repo-description-empty'}`}>
        {repo.description || 'No description provided.'}
      </p>

      <dl className="repo-metadata">
        <div>
          <dt>Updated</dt>
          <dd>{new Date(repo.updated_at).toLocaleString()}</dd>
        </div>
        <div>
          <dt>Pushed</dt>
          <dd>{repo.pushed_at ? new Date(repo.pushed_at).toLocaleString() : 'Not available'}</dd>
        </div>
        <div>
          <dt>Primary language</dt>
          <dd>{repo.language || 'Unspecified'}</dd>
        </div>
        <div>
          <dt>Stars</dt>
          <dd>{repo.stargazers_count.toLocaleString()}</dd>
        </div>
        <div>
          <dt>Forks</dt>
          <dd>{repo.forks_count.toLocaleString()}</dd>
        </div>
      </dl>

      <div className="repo-card-footer">
        <button type="button" className="secondary-button" onClick={onToggleDetails} aria-expanded={expanded}>
          {expanded ? 'Hide tech details' : 'Show tech details'}
        </button>
      </div>

      {expanded ? (
        <section className="detail-panel" aria-label={`Tech details for ${repo.name}`}>
          <p className="detail-caption">Detected from root manifests and root file names only.</p>

          {detailState.status === 'loading' ? <p className="detail-note">Loading public detail data...</p> : null}
          {detailState.status === 'error' ? (
            <p className="message-error" role="alert">
              {detailState.error}
            </p>
          ) : null}

          {detailState.status === 'loaded' && detailState.data ? (
            <>
              <DetailList title="Frameworks" items={detailState.data.frameworks} />
              {detailState.data.frameworks.length === 0 && detailState.data.manifestStatus === 'available' ? (
                <p className="detail-note">No frameworks were detected from the inspected root manifests.</p>
              ) : null}
              <DetailList title="Tooling" items={detailState.data.tooling} />
              <DetailList title="Root signals" items={detailState.data.rootSignals} />

              <div className="detail-block">
                <h4>Language byte percentages</h4>
                {detailState.data.languageBreakdown.length === 0 ? (
                  <p className="detail-note">Language percentages are unavailable for this repository.</p>
                ) : (
                  <ul className="language-breakdown-list">
                    {detailState.data.languageBreakdown.map((item) => (
                      <li key={item.language}>
                        <span>{item.language}</span>
                        <strong>{item.percentage}%</strong>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="detail-block">
                <h4>Evidence files</h4>
                {detailState.data.evidenceFiles.length > 0 ? (
                  <p className="detail-note">{detailState.data.evidenceFiles.join(', ')}</p>
                ) : (
                  <p className="detail-note">No manifest evidence files were read.</p>
                )}
              </div>

              {detailState.data.notes.length > 0 ? (
                <div className="detail-block">
                  <h4>Notes</h4>
                  <ul className="detail-note-list">
                    {detailState.data.notes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {detailState.data.manifestStatus === 'unavailable' ? (
                <p className="detail-note">Root manifest inspection is unavailable for this repository.</p>
              ) : null}
              {detailState.data.manifestStatus === 'empty' ? (
                <p className="detail-note">This repository has no root contents available to inspect.</p>
              ) : null}
            </>
          ) : null}
        </section>
      ) : null}
    </article>
  );
}
