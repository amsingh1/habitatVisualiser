# Upload, form and signup security — backlog

Status: **open, deliberately postponed** (written 2026-11-02). Priority now is that photo upload works
reliably (see `image-upload-size.md`). Nothing below is implemented unless marked done. Pick these up before
the app is opened to the public or when abuse is seen.

## Why this exists

The direct signed upload (`/api/upload/sign`, browser to Cloudinary) removed the size problem but moved the
abuse surface:

- The 10-photo cap is only checked when a record is **saved**. A logged-in user can request signatures and
  upload to Cloudinary repeatedly without ever saving a record.
- Each signature is locked to one new file name (`public_id`), so one signature creates one image. Capping
  signatures per user therefore caps uploads per user.
- **Signup is open**: `src/app/api/auth/register/route.js` takes any name, email and password with no email
  verification. "Logged in" is weak protection; one person can create many accounts.
- Cloudinary signatures cannot carry a size limit. The only per-file cap is the plan's (10 MB / 25 MP on the
  Free plan). The Free plan has 25 credits per month; filling storage could break uploads for everyone.

## Backlog (in suggested order)

### 1. Rate limit `/api/upload/sign` (per user)
- Proposed: **40 signatures per hour and 150 per day per user**. Real use is 10 photos per record plus
  retries (each retry may ask for a new signature), so normal users should never hit it.
- Over the limit: HTTP 429 with a clear message ("Too many uploads, try again later"). The form already shows
  server error text; check how it treats 429 (it must not count as a "connection problem" and retry).
- An in-memory counter is enough while one container runs (see `DEPLOYMENT.md`). It resets on restart. With
  several instances, store the counters in MongoDB instead.

### 2. Limit account creation (per IP)
- Proposed: about 5 registrations per hour per IP on `/api/auth/register`.
- Without this, limit 1 is easy to get around with many accounts.

### 3. Limit login attempts
- The email/password login (`CredentialsProvider` in `src/app/api/auth/[...nextauth]/route.js`) can be
  guessed at. Limit failed attempts per email and per IP.

### 4. Decide on signup verification
Open question for the owner: is open signup intended?
- Email verification before an account may upload, or
- Google-only sign-in for uploading (Google already verifies the email), or
- Keep open signup and rely on the limits above.

### 5. Cleanup of unused photos
- Photos from abandoned or failed forms stay in Cloudinary. Images removed from a record, or from a deleted
  record, are also never deleted from Cloudinary (this was already the case before the direct upload).
- Idea: a scheduled job that deletes images in the upload folder older than a few days that no record uses.
  Needs care: never delete an image that a record still references.

### 6. Cloudinary account side (no code)
- Set a usage alert in the Console so credits are not used up unnoticed.
- Turn on **Strict transformations** after the three display sizes exist (steps in `image-upload-size.md`).
- Two-factor login and a short list of Console users; regenerate the API secret if it is ever exposed.

### 7. Smaller items
- Image URLs are public: anyone with a URL can view the photo. Private photos would need Cloudinary
  authenticated delivery with signed viewing URLs (separate decision).
- Check other forms for the same problems when they are touched: the save routes already take owner data
  from the session, not from the request.

## When implementing
- Add tests for: a normal 10-photo upload with one retry still passes; the 41st signature in an hour gets
  429; the limit is per user, not global.
- Update `image-upload-size.md` ("Still open", rate limiting) and mark items here as done with the date.
