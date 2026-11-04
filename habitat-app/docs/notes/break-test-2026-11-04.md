# Break test of the app — findings

Status: **open, nothing fixed yet** (written 2026-11-04). This is a review and attempt to break the app on
`main` at `35ac80c`. Every item says how it was checked. Items already in `upload-security-backlog.md` are
only referenced, not repeated.

## How it was tested

- No MongoDB in the agent session: Docker is not running, the MongoDB download is blocked, and running a
  downloaded FerretDB binary was not allowed. So:
  - The app ran with `pnpm run dev` against an **unreachable** `MONGODB_URI`, with a session cookie made
    locally with a test `NEXTAUTH_SECRET`.
  - Pages were tested in Chromium (Playwright) with API responses intercepted, to see how the UI handles
    data a user can store.
  - What Mongo receives was checked with Mongoose's own query/update casting and the real `Habitat` model,
    without a server.
- `pnpm build` passes. `pnpm lint` has 4 errors and 8 warnings: three `set-state-in-effect` errors and one
  false positive in `community-client.jsx`. Lint is not run in CI. `pnpm audit --prod`: 3 moderate,
  transitive via `archiver` (`glob`, `minimatch`), below the CI `high` gate.
- **Not tested** (needs a real database): register/login end to end, leaderboards, downloads, real edits.

## Findings, most serious first

### 1. One user can break the vegetation map and My images for everyone (confirmed in browser)
- `PUT /api/habitats` builds `habitatName` as `vegAlliance || vegOrder || vegClass || habitatName`. If a
  user sends `habitatName: null` and the three veg fields as `''`, it stores `habitatName: null`.
  `findByIdAndUpdate` does not run validators (no `runValidators`), so `required` is not checked.
  Confirmed by casting the update: `{"$set":{"habitatName":null,...}}`.
- `src/components/habitat/MapComponent.jsx:137` calls `habitat.habitatName.length`. Browser test: one such
  record makes **`/habitats` and `/my-images` crash on load** for every logged-in user
  ("Cannot read properties of null (reading 'length')"). The app has no `error.jsx` or error boundary.
- Signup is open, so anyone can do this with their own record.
- The same PUT gap also lets `state`, `country`, `gpsCoordinate` and `date` be set to `''`/`null`, even
  though they are required on create. These did not crash the pages in the browser test.
- Fix: validate required fields in PUT (or pass `runValidators: true`), and guard `habitatName` in
  `MapComponent`.

### 2. Email enumeration through query operators in register and login (confirmed by casting)
- `POST /api/auth/register` passes `email` from the JSON body straight to `User.findOne({ email })`.
  Mongoose keeps operators (`sanitizeFilter` is off): `{"email":{"$regex":"^adm"},"name":"x","password":"x"}`
  answers "User already exists" (422) if any email starts with `adm`, and creates nothing.
  Repeating this character by character reveals every account email.
- The credentials login does the same. next-auth accepts a JSON body on
  `/api/auth/callback/credentials` (`next-auth/next/utils.js` `getBody`), and `authorize` returns different
  messages: "No user found with this email" vs "Password doesn't match". The sign-in form shows these
  messages, so plain emails can be checked as well.
- Fix: require `typeof email === 'string'` (and password/name) in both places, normalise case, and use one
  message such as "Invalid email or password".

### 3. Stack traces and internals returned to the browser (confirmed)
- `POST` and `PUT /api/habitats` return `stack` in every 500. Invalid JSON triggers it **without a login**,
  because `req.json()` runs before the session check. The stack shows server paths and library versions.
- The leaderboards and eu-veg search routes return `error.message` (for example the DB host and port).
- POST/PUT/DELETE also `console.log` the full session and request body (emails) on every call.
- Fix: return a generic message; check the session before parsing; drop the debug logs.

### 4. A failed first DB connection is cached forever (confirmed)
- `src/lib/mongodb.js` stores `cached.promise` and never clears it on failure. Test: the first request ran
  with MongoDB down. Then the DB port was opened, and every route using `connectDB()` still answered with
  the same `ECONNREFUSED` in 0.2 s, with no new attempt. The eu-veg route, which connects on its own, got a
  fresh error.
- Result: if MongoDB is unavailable when the app first touches it (for example mongo restarted before the
  app), the app stays broken until the container is restarted. `depends_on: service_healthy` only covers
  the first start.
- Fix: `cached.promise = null` when the connection fails. Also use `connectDB()` in
  `eu-veg-units/search/route.js`, which calls `mongoose.connect` itself.

### 5. Any logged-in user can read every contributor's email
- `GET /api/habitats` (all records), `GET /api/habitats?id=...` (any record) and `all-search` return whole
  documents, including `userEmail`.
- `autocomplete` and `all-search` accept any `field`, so `field=userEmail` lists emails directly.
- With open signup this is effectively public. Fix: leave `userEmail` out of responses, and allow only a
  fixed list of `field` values.

### 6. ZIP download can exhaust server memory
- `POST /api/habitats/download` collects the whole ZIP in memory (`chunks` and then `Buffer.concat`). It
  does this for up to 10 x 10 MB originals per record, for any number of records, and downloads one at a
  time with 45 s timeouts and 3 retries.
- A user with many records (or an admin selecting all) can make the container run out of memory. Even
  without that, the request can run for a very long time. There is no limit on `habitatIds`.
- Fix: limit the number of records/images per request, and stream the archive instead of buffering it.

### 7. CSV export: broken quoting and formula injection
- `generateCSV` escapes quotes only in `notes`. A `"` in the name, state, species or user name shifts the
  columns.
- Values starting with `=`, `+`, `-` or `@` run as formulas when an admin opens the export in Excel.
- Fix: escape every field, and prefix formula characters with `'`.

### 8. Input not validated on save
- POST accepts any `gpsCoordinate` string ("999,abc"), any date (year 2999), and unlimited text (5 MB of
  notes was accepted by the model). Wrong types cause a 500 with a stack trace instead of a 400.
- The UI copes with junk coordinates (no crash; the marker falls back to 0,0 or the value shows as "NaN").
- Fix: check latitude −90..90 and longitude −180..180, a sensible date range, and length limits.

### 9. Same email, two identities (Google vs password)
- With a JWT session and no adapter, a Google login's `session.user.id` is the Google `sub`, not the Mongo
  `_id`. A person who used both sign-in methods has two separate sets of "my images" and edit rights, and
  appears twice on the leaderboards.
- Some checks use the email instead: the download filter, the user role and the edit form's client check.
  Because signup has no email verification, someone can register a victim's Gmail with a password before
  the victim signs in with Google. They then share the victim's role (including admin, if granted on that
  account) and can download the victim's records.
- Ties into backlog item 4 (signup verification).

### 10. Smaller items
- Public `GET /api/habitats?slider=true&limit=0` returns every record's images (no limit). It also
  selects a `location` field that does not exist.
- The edit form checks ownership by email, while the server checks by id, so mixed-login users see a form
  they cannot save (403).
- Already tracked in `upload-security-backlog.md`: no rate limits on sign/register/login, open signup, no
  Cloudinary cleanup.
