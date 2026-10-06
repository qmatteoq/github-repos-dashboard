import type { RepoSummary } from '../types';

type SummaryCardsProps = {
  summary: RepoSummary;
  filteredCount: number;
};

function SummaryIcon({ path }: { path: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="summary-icon">
      <path d={path} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SummaryCards({ summary, filteredCount }: SummaryCardsProps) {
  const cards = [
    {
      label: 'Loaded repositories',
      value: summary.repoCount.toLocaleString(),
      detail: `${filteredCount.toLocaleString()} in current view`,
      path: 'M4 6.5h16v11H4zM8 4v5M16 4v5',
    },
    {
      label: 'Total stars',
      value: summary.totalStars.toLocaleString(),
      detail: 'Across all loaded repositories',
      path: 'm12 3 2.9 5.9 6.6 1-4.8 4.7 1.1 6.7L12 18l-5.8 3.3 1.1-6.7L2.5 9.9l6.6-1L12 3Z',
    },
    {
      label: 'Total forks',
      value: summary.totalForks.toLocaleString(),
      detail: 'Public owner repos only',
      path: 'M7 5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Zm10 9a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM7 10v5a4 4 0 0 0 4 4h3',
    },
    {
      label: 'Distinct languages',
      value: summary.distinctLanguages.toLocaleString(),
      detail: 'Primary language count only',
      path: 'M8 7 4 12l4 5M16 7l4 5-4 5M13 4l-2 16',
    },
  ];

  return (
    <section className="summary-grid" aria-label="Repository summary">
      {cards.map((card) => (
        <article key={card.label} className="summary-card">
          <div className="summary-card-header">
            <SummaryIcon path={card.path} />
            <span>{card.label}</span>
          </div>
          <strong>{card.value}</strong>
          <p>{card.detail}</p>
        </article>
      ))}
    </section>
  );
}
