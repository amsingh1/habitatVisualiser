# Habitat Visualiser

Next.js app in `habitat-app/` (MongoDB, NextAuth, Cloudinary for images). Deployment: `habitat-app/DEPLOYMENT.md`.

## Notes for agents

Open issues, decisions and history are written down in `habitat-app/docs/notes/`. Read the relevant note before working on a related area, and add or update a note when you leave something unfinished.

- `habitat-app/docs/notes/image-upload-size.md` — image upload fails on large photos (proxy body limit); open: choose and enforce a size limit. Do not add image compression: original-quality images are required.

## Working rules

- After every change, big or small, check that existing behavior still works and is not impacted. Look at everything that uses the code you touched (callers, other components, API consumers, edit mode as well as create mode) and say what you checked and what you could not test.
- Keep changes limited to what was asked. Do not alter unrelated behavior.

## Dependencies & security
- Use **pnpm**, not npm. `habitat-app/pnpm-lock.yaml` is what CI and the
  Docker image install. Delete any `package-lock.json`; never run
  `npm audit fix --force`.
- Fix a vulnerability by bumping the dependency in `package.json`, running
  `pnpm install`, then `pnpm audit`; commit `package.json` and
  `pnpm-lock.yaml` together.
- Transitive-only issues: add an entry under `overrides:` in
  `habitat-app/pnpm-workspace.yaml` (pnpm 12 ignores `pnpm.overrides` in
  `package.json`). Remove overrides that are no longer needed.
- If `minimumReleaseAgeExclude` in `pnpm-workspace.yaml` blocks a fresh patch
  release, add that exact version there.
- Keep `next` pinned to an exact version.
- Builds must use the locked versions in `pnpm-lock.yaml` only. Install with
  `pnpm install --frozen-lockfile` (the Dockerfile does this); it fails
  instead of changing the lockfile if `package.json` and the lockfile
  disagree. Use plain `pnpm install` only when deliberately adding or
  bumping a dependency, and commit the updated lockfile with it.
- Do not delete or regenerate `pnpm-lock.yaml`, and do not run `pnpm update`
  unless asked. Version ranges like `^1.2.3` in `package.json` are resolved
  by the lockfile, so they do not change a build on their own.
- Keep pnpm's `minimumReleaseAge` protection on; do not disable it.
- CI (`docker-publish.yml`) blocks publishing on `pnpm audit --prod
  --audit-level=high` and a Trivy critical-severity scan. Do not weaken or
  remove those steps to get a build through.
- Require the publish workflow to pass in branch protection on `main`.

## Local run without Docker
`habitat-app/.env.local` (git-ignored) points `MONGODB_URI` at a local Mongo
container on `127.0.0.1:27019`, separate from the devops-handover stack. Run
`pnpm run dev` in `habitat-app`.
