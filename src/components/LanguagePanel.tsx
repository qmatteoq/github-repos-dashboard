import type { LanguageDistributionItem } from '../types';

type LanguagePanelProps = {
  distribution: LanguageDistributionItem[];
  totalRepoCount: number;
  filteredRepoCount: number;
};

export function LanguagePanel({ distribution, totalRepoCount, filteredRepoCount }: LanguagePanelProps) {
  const visibleTotal = distribution.reduce((sum, item) => sum + item.count, 0);

  return (
    <aside className="panel-card" aria-labelledby="language-panel-title">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Primary language counts</p>
          <h2 id="language-panel-title">Language distribution</h2>
        </div>
        <p className="panel-subtitle">
          {filteredRepoCount.toLocaleString()} of {totalRepoCount.toLocaleString()} repositories in view
        </p>
      </div>

      {distribution.length === 0 ? (
        <p className="empty-note">No language data is available for the current view.</p>
      ) : (
        <ol className="language-list">
          {distribution.map((item) => {
            const width = visibleTotal > 0 ? (item.count / visibleTotal) * 100 : 0;
            return (
              <li key={item.language} className="language-row">
                <div className="language-row-top">
                  <span>{item.language}</span>
                  <span>{item.count.toLocaleString()}</span>
                </div>
                <div className="language-bar" aria-hidden="true">
                  <span className="language-bar-fill" style={{ inlineSize: `${width}%` }} />
                </div>
              </li>
            );
          })}
        </ol>
      )}
      <p className="panel-footnote">Counts represent repository primary languages, not code volume.</p>
    </aside>
  );
}
