import { buildSafeGitHubOwnerUrl, buildSafeGitHubRepoUrl } from '../api/github';
import type { GitHubRepo } from '../types';

function ExternalLinkIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="icon">
      <path d="M14 5h5v5M10 14 19 5M19 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type RepoCardProps = {
  repo: GitHubRepo;
};

export function RepoCard({ repo }: RepoCardProps) {
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
    </article>
  );
}
