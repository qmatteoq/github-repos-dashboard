# GitHub repository insights dashboard

This app loads all public repositories owned by a GitHub user or organization, then lets you filter, sort, and inspect the public metadata in a standalone browser client.

## Setup

Use Node.js 22 or later, then install dependencies with the existing npm configuration already available on your machine:

```bash
npm install
```

Start the local development server when needed:

```bash
npm run dev
```

Build the production bundle:

```bash
npm run build
```

Run the test suite:

```bash
npm test
```

## What the app does

- Loads all public owner repositories through the GitHub REST API endpoint `GET /users/{username}/repos?type=owner&per_page=100`, following pagination until the full owned set is complete.
- Shows repository metadata including owner, description, updated date, optional pushed date, primary language, stars, forks, and archive or fork badges.
- Provides summary cards for total repositories, stars, forks, and distinct primary languages.
- Filters by search text, primary language, archived state, and fork state, then sorts by updated date, stars, or name.
- Refreshes manually or every 5, 15, or 30 minutes. Auto refresh defaults to 5 minutes, pauses when the tab is hidden and during rate limit cooldown windows, and waits a full interval after a failed attempt before retrying.
- Fetches on demand repository detail data for language byte percentages plus framework and tooling hints detected from root manifests and root file names.

## Public API limitations

This app uses only public unauthenticated GitHub API requests from the browser. Typical unauthenticated limits are 60 requests per hour per IP, though GitHub can change that behavior. The UI shows remaining requests and the reset time when GitHub provides those headers.

Repository tech detection is evidence based and root only. It inspects the root contents listing and reads at most two small root manifests through the GitHub contents API. Nested manifests, generated files, monorepo workspaces, and private dependencies are outside scope, so missing detections do not prove a tool is absent.

Tech details are cached in memory until the repository's push timestamp changes. Expanded details reload after a repository refresh detects a new push. A failed refresh preserves the last successful repository list and marks it stale; an incomplete paginated response is never shown as the complete list.

Cached ETags are used for repeat requests when possible, but conditional requests still count against GitHub rate limits.

## Security and privacy

- No secrets, tokens, or sign in are required.
- The app stores only the last successfully loaded username in local storage.
- All repository links are constructed as safe GitHub URLs.
