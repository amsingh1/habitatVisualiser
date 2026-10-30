# Habitat Visualiser — Deployment

Next.js app (`nextjs-app`) + MongoDB (`mongodb`), run with Docker Compose.
The app image `amsingh2/habitat-app:latest` is pulled from Docker Hub; nothing is built on the server.

## Files in this folder
- `docker-compose.yml`
- `.env.local` — app secrets (hidden file, make sure it is copied too)
- `mongo-init/init-restore.sh` and `mongo-dump/` — seed the database on first start

## Before going live
1. `.env.local` already has `NEXTAUTH_URL=https://vegif.eu` (no trailing slash). Keep it exactly
   like this; if the domain changes, update it to match.
2. The Google OAuth client already has `https://vegif.eu` and `http://vegif.eu` registered
   (with the `/api/auth/callback/google` redirect URI), so no Google changes are needed for this domain.
   The site must be served over HTTPS; `NEXTAUTH_URL` stays `https://vegif.eu`.
3. Put a TLS reverse proxy in front (see below).

## Deploy
Run from this folder:
```
docker compose pull
docker compose up -d
docker compose ps              # both services should be running / healthy
curl http://localhost:3001/api/health   # expect HTTP 200
```

## Database
`mongo-dump/` is restored into `habitat_db` automatically on the first start only (empty data directory).
Later restarts never overwrite data. To wipe and re-seed: `docker compose down -v && docker compose up -d`
(this deletes all MongoDB data if it is stored in a named volume).

### Production (vegif.eu): data is kept in a bind mount
On the vegif.eu server Docker volumes are dropped routinely. With a named volume (`mongodb_data`) that wiped
the database each time, and `mongo-dump/` was then restored over the empty database, losing everything added
since. To keep the data, DevOps changed the `mongodb` service to mount a folder on the server instead of a
Docker volume:
```
volumes:
  - ./vegif.eu/mongodb_data:/data/db      # was: mongodb_data:/data/db
```
Volume cleanup (`down -v`, `docker volume prune`) does not touch a bind-mounted folder, so the data persists. The
dump is only restored if that folder is deleted or empty. Back the folder up.

## Update to a new app version
```
docker compose pull
docker compose up -d
```
Only `nextjs-app` is replaced; MongoDB and its data are untouched.

On vegif.eu Watchtower is enabled (label `com.centurylinklabs.watchtower.enable: "true"` on the containers). It
pulls a new `:latest` image and restarts the container automatically, so just push the new image with the
`latest` tag; the commands above are not needed.

Rollback: every build published by CI (`.github/workflows/docker-publish.yml`) gets two tags: `latest` and an
immutable `main-<sha>` tag (short commit hash, e.g. `main-1a2b3c4`). To roll back to a specific build, set the
image in `docker-compose.yml` to that tag, e.g. `amsingh2/habitat-app:main-1a2b3c4`, then
`docker compose pull && docker compose up -d`. Watchtower only follows the tag you name, so switch back to
`latest` afterwards to resume automatic updates. Without this, `latest` is used.

## TLS / reverse proxy
The app serves plain HTTP on `127.0.0.1:3001` and is not reachable from outside. Put a reverse
proxy with the TLS certificate in front of it. It must forward `Host` and `X-Forwarded-Proto: https`,
otherwise Google sign-in fails with a redirect-URI mismatch.

Caddy (sets the headers automatically):
```
vegif.eu {
    reverse_proxy 127.0.0.1:3001
}
```
nginx:
```
proxy_set_header Host              $host;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
```

Allow large request bodies. Users upload phone photos (often 3–10 MB). nginx rejects bodies over 1 MB by
default with an HTML "413 Request Entity Too Large" page, which the app shows as
`Unexpected token '<' ... is not valid JSON`. Set a limit in the `server` (or `location`) block:
```
client_max_body_size 25m;
proxy_read_timeout 120s;
```
Then `nginx -t && systemctl reload nginx`. Caddy has no body limit by default, so nothing is needed there.

## Persistent data
- MongoDB: Docker volume `mongodb_data` (removed by `down -v` or volume cleanup), or the bind-mounted
  folder if you use one (see Database) — include in backups
- Images are stored in Cloudinary, not on the server; there is no uploads directory to back up.

## Troubleshooting
- Port 3001 in use: free it or change the port mapping in `docker-compose.yml`.
- `mongodb` not healthy: `docker compose logs mongodb` (look for restore errors on first start).
- Google sign-in fails: check `NEXTAUTH_URL` and the registered redirect URI.
- Uploading an image fails with `Unexpected token '<', "<html>..." is not valid JSON`: the proxy is rejecting
  the upload, almost always nginx's 1 MB default body limit. Set `client_max_body_size 25m;` (see TLS section)
  and reload nginx. Check the status of the `/api/upload` request in the browser dev tools Network tab:
  413 = size limit, 502/504 = proxy timeout.
- Docker Hub repo private: `docker login -u <username>` with the access token before `docker compose pull`.
