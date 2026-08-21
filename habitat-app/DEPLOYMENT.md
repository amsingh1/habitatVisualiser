# Deployment Runbook — Habitat Visualiser

## What you're deploying
A Next.js app (`nextjs-app`) + MongoDB (`mongodb`), run via Docker Compose.
The app image is pulled from Docker Hub — nothing is built on the server.

> **Before first deploy:** the app owner must build and push the Docker Hub
> image (`amsingh2/habitat-app:latest`) from this branch's code
> (`docker build -t amsingh2/habitat-app:latest . && docker push amsingh2/habitat-app:latest`).
> This codebase (pnpm, Next 16.2, React 18.3) is not the same code as any
> previously pushed image under that tag — make sure it's been rebuilt from
> here before you pull.

## What you need before you start

From the git repo (already included, nothing extra to ask for):
- `docker-compose.yml`
- `mongo-init/init-restore.sh`

Delivered to you separately, out-of-band (not in git — contains real user
data and secrets):
- `mongo-dump/` — a folder of `.bson`/`.metadata.json` files, seeds the
  database on first start
- `.env.local` — real secrets (see `.env.local.example` in the repo for the
  list of variables it must contain)

If the Docker Hub repo is **private**, you'll also be given a Docker Hub
username + read-only access token to `docker login` with. If it's public,
skip that step.

## Directory layout on the server

Put everything in one directory:
```
habitat-app/
├── docker-compose.yml
├── mongo-init/
│   └── init-restore.sh
├── mongo-dump/              <- delivered separately
│   ├── eu_veg_units.bson
│   ├── habitats.bson
│   └── users.bson
└── .env.local               <- delivered separately
```

## Steps

1. `cd habitat-app`
2. (If private image) `docker login -u <username>`, paste the access token when prompted for a password.
3. `docker compose pull` — pulls `amsingh2/habitat-app:latest` and `mongo:latest`.
4. `docker compose up -d`
5. Check both containers came up healthy:
   ```
   docker compose ps
   ```
6. Smoke test:
   ```
   curl http://localhost:3001/api/health
   ```
   should return HTTP 200.

## How the database gets seeded

`mongo-init/init-restore.sh` runs automatically, but **only the first time**
the `mongodb_data` volume is empty (a genuinely fresh deploy). It restores
`mongo-dump/` into the `habitat_db` database via `mongorestore`. On every
subsequent restart/redeploy it's a no-op — existing data is never
overwritten.

If you ever need to re-seed from scratch (e.g. standing up a new
environment), wipe the volume first:
```
docker compose down -v
docker compose up -d
```
This deletes all current MongoDB data before the restore runs again — only
do this deliberately.

## Updating to a new app version

The app owner pushes a new tag/`:latest` to Docker Hub. On the server:
```
docker compose pull
docker compose up -d
```
This only replaces the `nextjs-app` container — the `mongodb` container and
its data volume are untouched.

## Persistent data on this host

- MongoDB data: named Docker volume `mongodb_data` (survives `docker compose down`, wiped only by `down -v`)
- Uploaded images/files: bind-mounted at `./public/uploads` — back this up like any other data on the host

## Troubleshooting

- **Port 3001 already in use**: another process is bound to it; either free it or change the `"3001:3001"` port mapping in `docker-compose.yml`.
- **`mongodb` never becomes healthy**: `docker compose logs mongodb` — check for restore errors if this is a first start.
- **App can't reach MongoDB**: confirm `.env.local` doesn't need editing — `MONGODB_URI` is already set correctly by `docker-compose.yml` for the two containers to reach each other over the internal `app-network`; you shouldn't need to change it.
- **Auth (Google OAuth) not working**: check `NEXTAUTH_URL` in `.env.local` matches the real public URL of this deployment.
