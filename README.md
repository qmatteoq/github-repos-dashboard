# GitHub repository insights dashboard

This managed runtime app loads public repositories for a GitHub user or organization through the generated GitHub Power Platform connector and visualizes primary language counts, stars, forks, descriptions, update dates, archive state, and fork state in a React, TypeScript, and Vite client.

## Runtime requirements

Run the app through Microsoft App Player or the Local Play URL printed by the globally installed `ms app dev` command. A plain standalone Vite URL cannot call the hosted GitHub connector because the managed apps SDK depends on the host bridge and connection context.

Sign in to the hosted GitHub connection in App Player before loading data. The dashboard only uses the generated public listing operations: `GetRepos` for users with `type=owner` and `GetOrgRepos` for organizations with `type=public`.

The dashboard now reports primary language counts only. It does not fetch language byte shares, manifests, framework hints, tooling hints, or any direct `api.github.com` metadata.

## Local development

Use Node.js 24.11 or later and keep your existing company-managed npm configuration. Local installs in this repository must continue to use the machine's configured internal proxy registry; do not add a project `.npmrc` registry override.

Install dependencies:

```bash
npm install
```

Start local development through the global managed apps CLI so the connector bridge is available:

```bash
ms app dev
```

Run tests:

```bash
npm test
```

Build the production bundle:

```bash
npm run build
```

## Managed runtime registration

`ms.config.json` is already stamped for the real managed runtime app with app ID `d203bb2a-d163-448c-801c-3df90b89d198`, environment ID `52ad1371-bae3-ec57-85f7-e72f6d5b2304`, `repoType` `none`, cloud `public`, build path `./dist`, and build command `npm run build`.

The managed runtime app ID above is not the same as the deployment service principal client ID. Keep using the existing managed runtime IDs in source control; deployment automation uses the separate service principal `github-repos-dashboard-deploy` with client ID `c9ff501a-e47f-48df-b885-50a13e37bd40`, an environment-scoped `EnvironmentAdmin` role assignment, and GitHub Actions secrets `PP_SP_CLIENT_ID`, `PP_SP_CLIENT_SECRET`, and `PP_SP_TENANT_ID`.

Because this app uses `repoType: none`, the repository does not need direct Enterprise Cloud source binding and does not represent an internal managed-runtime Git-backed app. Deployment uploads an external artifact instead.

## Manual GitHub Actions deployment

The repository includes `.github/workflows/deploy-managed-app.yml` for manual deployment only. It does not deploy on push yet.

The target environment has external artifact deployment enabled, and the repository secrets above are now configured. Rotate `PP_SP_CLIENT_SECRET` before its current expiration at `2027-01-04T14:50:26Z`; do not store or document the secret value in this repository.

Run the workflow from the `main` branch:

1. Open the **Deploy managed app** workflow in GitHub Actions.
2. Leave `confirm_deploy` as `false` for the default validation-only run. That path still validates secrets, runs CI, packs the app, and checks `ms app info --non-interactive --json` with the service principal, but it skips the live deploy step.
3. Set `confirm_deploy` to `true` only when you want the same main-branch run to proceed to live deployment.

The workflow validates the required secrets and `ms.config.json`, runs `npm ci`, `npm test`, and `npm run build`, packs with the official managed apps actions pinned to immutable SHAs, verifies service-principal access with `ms app info --non-interactive --json`, and deploys only when explicitly confirmed.

GitHub-hosted runners are allowed to use their default public npm configuration for the managed apps CLI action. That cloud-runner allowance does not change the local repository policy above: local development here must continue using the machine's configured internal registry proxy.

The first [validation-only run](https://github.com/qmatteoq/github-repos-dashboard/actions/runs/37485211863) built and packed the app successfully. Service-principal authentication succeeded, but `ms app info` returned HTTP 403: the caller lacks `Repositories.MicrosoftApps.Read` on this app. The environment has no Dataverse database, and the documented BAP `EnvironmentAdmin` assignment was confirmed present for the service principal. That assignment has not provided the required app-read access. CLI edit sharing is unavailable for `repoType: none` apps. The workflow remains blocked at this access check; no live deployment has been attempted.
