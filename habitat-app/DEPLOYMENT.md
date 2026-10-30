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
3. `docker compose pull` — pulls the app image and `mongo:8.0`.

   To deploy a specific app version rather than `:latest` (recommended — it
   gives you something to roll back to), set `APP_IMAGE_TAG` first:
   ```
   echo "APP_IMAGE_TAG=1.0.0" > .env
   docker compose pull
   ```
   Note this is a plain `.env` beside `docker-compose.yml`, which Compose reads
   to substitute variables in the file itself. It is *not* `.env.local`, which
   only supplies environment variables inside the running container. Both files
   can coexist; they do different jobs.
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

## TLS / putting this behind a domain

The app speaks **plain HTTP on port 3001** and is bound to `127.0.0.1`, so it
is not reachable from the internet directly. That is deliberate: Next.js should
not terminate TLS. A reverse proxy in front holds the certificate.

```
Internet ──HTTPS:443──> reverse proxy (holds cert) ──HTTP──> nextjs-app:3001
```

If this host already has TLS termination (an ingress, or a shared load
balancer), point it at `127.0.0.1:3001` and skip the rest of this section.

Otherwise Caddy is the least work — it obtains and renews Let's Encrypt
certificates automatically. A complete `Caddyfile`:

```
habitat.example.org {
    reverse_proxy 127.0.0.1:3001
}
```

Three requirements, whichever proxy is used:

1. **Forward the original protocol and host.** The proxy must send
   `X-Forwarded-Proto: https` and preserve the `Host` header. Without them
   NextAuth builds callback URLs with `http://` and Google sign-in fails with
   a redirect-URI mismatch that looks nothing like a proxy problem. Caddy's
   `reverse_proxy` does this by default; nginx needs it stated explicitly:
   ```
   proxy_set_header Host              $host;
   proxy_set_header X-Forwarded-Proto $scheme;
   proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
   ```
2. **Allow large request bodies.** Users upload phone photos (often 3–10 MB).
   nginx rejects bodies over 1 MB by default with an HTML "413 Request Entity
   Too Large" page, which the app shows as `Unexpected token '<' ... is not
   valid JSON`. Set a limit in the `server` (or `location`) block:
   ```
   client_max_body_size 25m;
   ```
   Then `nginx -t && systemctl reload nginx`. Caddy has no body limit by
   default, so nothing is needed there. The upload may also take a while, so
   keep the proxy read timeout generous (nginx: `proxy_read_timeout 120s;`).
3. **`NEXTAUTH_URL` in `.env.local` must exactly match the public HTTPS URL**
   — same scheme, same hostname, no trailing slash.

The app owner must also register `https://<your-domain>/api/auth/callback/google`
as an authorized redirect URI in the Google Cloud console, or Google sign-in
will fail on first use.

## Persistent data on this host

- MongoDB data: named Docker volume `mongodb_data` (survives `docker compose down`, wiped only by `down -v`)
- Uploaded images/files: bind-mounted at `./public/uploads` — back this up like any other data on the host

## Troubleshooting

- **Port 3001 already in use**: another process is bound to it; either free it or change the `"127.0.0.1:3001:3001"` port mapping in `docker-compose.yml`.
- **`curl` from another machine to port 3001 refuses to connect**: expected. The app is deliberately bound to loopback only (see TLS section) — reach it through the reverse proxy, or from the host itself.
- **`mongodb` never becomes healthy**: `docker compose logs mongodb` — check for restore errors if this is a first start.
- **App can't reach MongoDB**: confirm `.env.local` doesn't need editing — `MONGODB_URI` is already set correctly by `docker-compose.yml` for the two containers to reach each other over the internal `app-network`; you shouldn't need to change it.
- **Uploading an image fails with `Unexpected token '<', "<html>..." is not valid JSON`**: the proxy is rejecting the upload with an HTML error page, almost always nginx's 1 MB default body limit. Add `client_max_body_size 25m;` (see TLS section) and reload nginx. Check the status of the `/api/upload` request in the browser dev tools Network tab: 413 = size limit, 502/504 = proxy timeout.
- **Auth (Google OAuth) not working**: check `NEXTAUTH_URL` in `.env.local` matches the real public URL of this deployment.
