import type {
  GitHubRepo,
  LanguageBreakdownItem,
  LanguageDistributionItem,
  ManifestFile,
  RepoFilters,
  RepoSummary,
  RepoTechDetails,
  RootContentEntry,
} from '../types';

const manifestPriority = [
  'package.json',
  'pyproject.toml',
  'requirements.txt',
  'cargo.toml',
  'go.mod',
  'pom.xml',
  'pipfile',
  'composer.json',
];

const packageJsonMap: Array<[string, string, 'framework' | 'tooling']> = [
  ['react', 'React', 'framework'],
  ['next', 'Next.js', 'framework'],
  ['vue', 'Vue', 'framework'],
  ['@angular/core', 'Angular', 'framework'],
  ['svelte', 'Svelte', 'framework'],
  ['vite', 'Vite', 'tooling'],
  ['typescript', 'TypeScript', 'tooling'],
  ['express', 'Express', 'framework'],
  ['fastify', 'Fastify', 'framework'],
  ['@nestjs/core', 'NestJS', 'framework'],
  ['jest', 'Jest', 'tooling'],
  ['vitest', 'Vitest', 'tooling'],
  ['@playwright/test', 'Playwright', 'tooling'],
  ['cypress', 'Cypress', 'tooling'],
  ['eslint', 'ESLint', 'tooling'],
  ['tailwindcss', 'Tailwind CSS', 'tooling'],
];

const manifestDependencyMaps: Partial<Record<string, Array<{
  token: string;
  label: string;
  category: 'framework' | 'tooling';
}>>> = {
  'pyproject.toml': [
    { token: 'fastapi', label: 'FastAPI', category: 'framework' },
    { token: 'django', label: 'Django', category: 'framework' },
    { token: 'flask', label: 'Flask', category: 'framework' },
    { token: 'streamlit', label: 'Streamlit', category: 'framework' },
    { token: 'pytest', label: 'Pytest', category: 'tooling' },
    { token: 'poetry', label: 'Poetry', category: 'tooling' },
  ],
  'requirements.txt': [
    { token: 'fastapi', label: 'FastAPI', category: 'framework' },
    { token: 'django', label: 'Django', category: 'framework' },
    { token: 'flask', label: 'Flask', category: 'framework' },
    { token: 'streamlit', label: 'Streamlit', category: 'framework' },
    { token: 'pytest', label: 'Pytest', category: 'tooling' },
  ],
  'cargo.toml': [
    { token: 'actix-web', label: 'Actix Web', category: 'framework' },
    { token: 'axum', label: 'Axum', category: 'framework' },
    { token: 'tokio', label: 'Tokio', category: 'tooling' },
  ],
  'go.mod': [
    { token: 'github.com/gin-gonic/gin', label: 'Gin', category: 'framework' },
    { token: 'github.com/labstack/echo/v4', label: 'Echo', category: 'framework' },
    { token: 'github.com/spf13/cobra', label: 'Cobra', category: 'tooling' },
  ],
  'pom.xml': [
    { token: 'spring-boot-starter', label: 'Spring Boot', category: 'framework' },
    { token: 'junit', label: 'JUnit', category: 'tooling' },
    { token: 'maven', label: 'Maven', category: 'tooling' },
  ],
  pipfile: [
    { token: 'fastapi', label: 'FastAPI', category: 'framework' },
    { token: 'django', label: 'Django', category: 'framework' },
    { token: 'flask', label: 'Flask', category: 'framework' },
    { token: 'streamlit', label: 'Streamlit', category: 'framework' },
    { token: 'pytest', label: 'Pytest', category: 'tooling' },
  ],
  'composer.json': [],
};

function addDetectionsFromNames(
  dependencyNames: Iterable<string>,
  detections: Array<{ token: string; label: string; category: 'framework' | 'tooling' }>,
  evidenceFile: string,
  addDetection: (category: 'framework' | 'tooling', label: string, evidenceFile: string) => void,
) {
  const availableNames = new Set(
    [...dependencyNames]
      .map((name) => name.trim().toLowerCase())
      .filter(Boolean),
  );

  detections.forEach(({ token, label, category }) => {
    if (availableNames.has(token)) {
      addDetection(category, label, evidenceFile);
    }
  });
}

function parseLineBasedDependencies(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/#.*/, '').trim())
    .filter(Boolean)
    .map((line) => line.replace(/^\[.*\]$/, '').trim())
    .filter(Boolean)
    .map((line) => {
      const equalIndex = line.indexOf('=');
      const candidate = equalIndex >= 0 ? line.slice(0, equalIndex).trim() : line;
      return candidate.replace(/\[.*\]/, '').split(/[<>=!~;\s]/, 1)[0]?.trim().toLowerCase() ?? '';
    })
    .filter(Boolean);
}

function parsePyProjectDependencies(text: string): string[] {
  const dependencies = new Set<string>();
  let section = '';
  let inDependencyArray = false;

  text.split(/\r?\n/).forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      return;
    }

    const sectionMatch = line.match(/^\[(.+)\]$/);
    if (sectionMatch) {
      section = sectionMatch[1].trim().toLowerCase();
      inDependencyArray = false;
      return;
    }

    if (line.startsWith('dependencies = [')) {
      inDependencyArray = true;
    }

    if (inDependencyArray) {
      const matches = [...line.matchAll(/"([^"]+)"/g)];
      matches.forEach((match) => {
        const name = match[1]?.split(/[<>=!~;\s]/, 1)[0]?.trim().toLowerCase();
        if (name) {
          dependencies.add(name);
        }
      });
      if (line.includes(']')) {
        inDependencyArray = false;
      }
      return;
    }

    if (section.startsWith('tool.poetry.dependencies') || section.startsWith('tool.poetry.group.')) {
      const [name] = line.split('=', 1);
      const dependencyName = name?.trim().toLowerCase();
      if (dependencyName && dependencyName !== 'python') {
        dependencies.add(dependencyName);
      }
    }
  });

  return [...dependencies];
}

function parseGoModDependencies(text: string): string[] {
  const dependencies = new Set<string>();
  let inRequireBlock = false;

  text.split(/\r?\n/).forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line || line.startsWith('//')) {
      return;
    }

    if (line === 'require (') {
      inRequireBlock = true;
      return;
    }

    if (inRequireBlock && line === ')') {
      inRequireBlock = false;
      return;
    }

    const content = inRequireBlock ? line : line.startsWith('require ') ? line.slice('require '.length).trim() : null;
    if (!content) {
      return;
    }

    const dependencyName = content.split(/\s+/, 1)[0]?.trim().toLowerCase();
    if (dependencyName) {
      dependencies.add(dependencyName);
    }
  });

  return [...dependencies];
}

function parseCargoDependencies(text: string): string[] {
  const dependencies = new Set<string>();
  let section = '';

  text.split(/\r?\n/).forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      return;
    }

    const sectionMatch = line.match(/^\[(.+)\]$/);
    if (sectionMatch) {
      section = sectionMatch[1].trim().toLowerCase();
      return;
    }

    if (!/(^dependencies$|^dev-dependencies$|^build-dependencies$)/.test(section)) {
      return;
    }

    const [name] = line.split('=', 1);
    const dependencyName = name?.trim().toLowerCase();
    if (dependencyName) {
      dependencies.add(dependencyName);
    }
  });

  return [...dependencies];
}

function parsePomDependencies(text: string): string[] {
  const dependencies = new Set<string>();
  const withoutComments = text.replace(/<!--[\s\S]*?-->/g, '');
  for (const block of withoutComments.matchAll(/<dependency\b[^>]*>([\s\S]*?)<\/dependency>/gi)) {
    const dependencyName = block[1].match(/<artifactId>\s*([^<\s]+)\s*<\/artifactId>/i)?.[1]?.toLowerCase();
    if (dependencyName) dependencies.add(dependencyName);
  }

  return [...dependencies];
}

export function summarizeRepos(repos: GitHubRepo[]): RepoSummary {
  const languages = new Set(
    repos.map((repo) => repo.language?.trim()).filter((language): language is string => Boolean(language)),
  );

  return {
    repoCount: repos.length,
    totalStars: repos.reduce((sum, repo) => sum + repo.stargazers_count, 0),
    totalForks: repos.reduce((sum, repo) => sum + repo.forks_count, 0),
    distinctLanguages: languages.size,
  };
}

export function buildPrimaryLanguageDistribution(repos: GitHubRepo[]): LanguageDistributionItem[] {
  const counts = new Map<string, number>();

  repos.forEach((repo) => {
    const language = repo.language?.trim() || 'Unspecified';
    counts.set(language, (counts.get(language) ?? 0) + 1);
  });

  return [...counts.entries()]
    .map(([language, count]) => ({ language, count }))
    .sort((left, right) => right.count - left.count || left.language.localeCompare(right.language));
}

export function collectPrimaryLanguages(repos: GitHubRepo[]): string[] {
  return [...new Set(repos.map((repo) => repo.language?.trim()).filter((language): language is string => Boolean(language)))]
    .sort((left, right) => left.localeCompare(right));
}

export function filterAndSortRepos(repos: GitHubRepo[], filters: RepoFilters): GitHubRepo[] {
  const query = filters.query.trim().toLowerCase();

  return repos
    .filter((repo) => {
      if (filters.language !== 'all' && (repo.language ?? '') !== filters.language) {
        return false;
      }

      if (filters.archived === 'active' && repo.archived) {
        return false;
      }

      if (filters.archived === 'archived' && !repo.archived) {
        return false;
      }

      if (filters.fork === 'source' && repo.fork) {
        return false;
      }

      if (filters.fork === 'fork' && !repo.fork) {
        return false;
      }

      if (!query) {
        return true;
      }

      const haystack = [repo.name, repo.description ?? '', repo.topics?.join(' ') ?? ''].join(' ').toLowerCase();
      return haystack.includes(query);
    })
    .sort((left, right) => {
      switch (filters.sort) {
        case 'stars':
          return right.stargazers_count - left.stargazers_count || left.name.localeCompare(right.name);
        case 'name':
          return left.name.localeCompare(right.name);
        case 'updated':
        default:
          return new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime() || left.name.localeCompare(right.name);
      }
    });
}

export function selectManifestCandidates(entries: RootContentEntry[]): RootContentEntry[] {
  const files = entries.filter((entry) => entry.type === 'file');
  const byName = new Map(files.map((entry) => [entry.name.toLowerCase(), entry]));
  const selected: RootContentEntry[] = [];

  manifestPriority.forEach((name) => {
    const match = byName.get(name);
    if (match) {
      selected.push(match);
    }
  });

  return selected.slice(0, 2);
}

export function buildLanguageBreakdown(languageBytes: Record<string, number> | null): LanguageBreakdownItem[] {
  if (!languageBytes) {
    return [];
  }

  const totalBytes = Object.values(languageBytes).reduce((sum, value) => sum + value, 0);
  if (totalBytes <= 0) {
    return [];
  }

  return Object.entries(languageBytes)
    .map(([language, bytes]) => ({
      language,
      bytes,
      percentage: Number(((bytes / totalBytes) * 100).toFixed(1)),
    }))
    .sort((left, right) => right.bytes - left.bytes || left.language.localeCompare(right.language));
}

export function buildRepoTechDetails(input: {
  rootEntries: RootContentEntry[] | null;
  manifests: ManifestFile[];
  languageBytes: Record<string, number> | null;
  notes: string[];
}): RepoTechDetails {
  const frameworks = new Set<string>();
  const tooling = new Set<string>();
  const rootSignals = new Set<string>();
  const evidenceFiles = new Set<string>();
  const notes = [...input.notes];

  const addDetection = (category: 'framework' | 'tooling', label: string, evidenceFile: string) => {
    if (category === 'framework') {
      frameworks.add(label);
    } else {
      tooling.add(label);
    }

    evidenceFiles.add(evidenceFile);
  };

  const rootEntryNames = new Set((input.rootEntries ?? []).map((entry) => entry.name.toLowerCase()));
  if (rootEntryNames.has('dockerfile') || rootEntryNames.has('docker-compose.yml') || rootEntryNames.has('docker-compose.yaml')) {
    rootSignals.add('Docker');
  }
  if ([...rootEntryNames].some((entry) => entry.endsWith('.sln') || entry.endsWith('.csproj') || entry === 'global.json' || entry === 'directory.build.props')) {
    rootSignals.add('.NET');
  }
  if (rootEntryNames.has('tsconfig.json')) {
    rootSignals.add('TypeScript configuration');
  }

  input.manifests.forEach((manifest) => {
    const name = manifest.name.toLowerCase();
    const text = manifest.text;
    evidenceFiles.add(manifest.name);

    if (name === 'package.json') {
      try {
        const parsed = JSON.parse(text) as {
          dependencies?: Record<string, string>;
          devDependencies?: Record<string, string>;
          peerDependencies?: Record<string, string>;
          optionalDependencies?: Record<string, string>;
        };
        const dependencyNames = Object.keys({
          ...(parsed.dependencies ?? {}),
          ...(parsed.devDependencies ?? {}),
          ...(parsed.peerDependencies ?? {}),
          ...(parsed.optionalDependencies ?? {}),
        });

        addDetectionsFromNames(
          dependencyNames,
          packageJsonMap.map(([token, label, category]) => ({ token, label, category })),
          manifest.name,
          addDetection,
        );
      } catch {
        notes.push(`${manifest.name} could not be parsed as JSON.`);
      }
      return;
    }

    if (name === 'pyproject.toml') {
      addDetectionsFromNames(
        parsePyProjectDependencies(text),
        manifestDependencyMaps[name] ?? [],
        manifest.name,
        addDetection,
      );
      return;
    }

    if (name === 'requirements.txt' || name === 'pipfile') {
      addDetectionsFromNames(
        parseLineBasedDependencies(text),
        manifestDependencyMaps[name] ?? [],
        manifest.name,
        addDetection,
      );
      return;
    }

    if (name === 'cargo.toml') {
      addDetectionsFromNames(
        parseCargoDependencies(text),
        manifestDependencyMaps[name] ?? [],
        manifest.name,
        addDetection,
      );
      return;
    }

    if (name === 'go.mod') {
      addDetectionsFromNames(
        parseGoModDependencies(text),
        manifestDependencyMaps[name] ?? [],
        manifest.name,
        addDetection,
      );
      return;
    }

    if (name === 'pom.xml') {
      addDetectionsFromNames(
        parsePomDependencies(text),
        manifestDependencyMaps[name] ?? [],
        manifest.name,
        addDetection,
      );
      return;
    }

    if (name === 'composer.json') {
      try {
        JSON.parse(text);
      } catch {
        notes.push(`${manifest.name} could not be parsed as JSON.`);
      }
    }
  });

  const manifestStatus = input.rootEntries === null ? 'unavailable' : input.rootEntries.length === 0 ? 'empty' : 'available';

  return {
    languageBreakdown: buildLanguageBreakdown(input.languageBytes),
    frameworks: [...frameworks].sort((left, right) => left.localeCompare(right)),
    tooling: [...tooling].sort((left, right) => left.localeCompare(right)),
    rootSignals: [...rootSignals].sort((left, right) => left.localeCompare(right)),
    evidenceFiles: [...evidenceFiles].sort((left, right) => left.localeCompare(right)),
    notes: [...new Set(notes)],
    manifestStatus,
  };
}
