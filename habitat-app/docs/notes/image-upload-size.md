# Image upload size — open issue and plan

Status: **open** (written 2026-10-29). Written for humans and agents picking this up later.

## The problem

Uploading the "Upload New Vegetation type" form with a large phone photo failed with:

`Unexpected token '<', "<html> <h"... is not valid JSON`

Small images uploaded fine.

## Root cause

- `src/components/habitat/HabitatUpload.jsx` POSTs the images to `/api/upload` and calls `response.json()`.
- The deployment puts a reverse proxy (nginx, per `DEPLOYMENT.md`) in front of the app. nginx rejects request bodies over **1 MB by default** with an HTML "413 Request Entity Too Large" page. The request never reaches the app, so the app never sends JSON.
- The JSON parse error was only a symptom. The real failure is the oversized upload.
- Unconfirmed: the customer's exact proxy. Their `DEPLOYMENT.md` shows an nginx snippet with no `client_max_body_size`, which fits. Confirm with the `/api/upload` status in the browser dev tools Network tab (413 = size limit, 502/504 = timeout, 500 = server error).

## What is already done (PR #12)

- The upload code now checks that the response is JSON. A 413 or other non-JSON reply shows a readable message instead of the parse error.
- `DEPLOYMENT.md` documents `client_max_body_size 25m;` (and a longer proxy read timeout) for nginx.
- Browser-side image compression was tried and **removed on purpose**: the product needs original, high-quality images stored in Cloudinary, and compression would have shrunk the stored file. Do not re-add it without asking.

## What is still open

1. **The customer's proxy still needs the nginx change.** Until `client_max_body_size` is raised there (and nginx reloaded), large photos still fail, now with a readable message.
2. **No size limit exists in the app.** `src/app/api/upload/route.js` reads each file fully into memory, converts it to a base64 data URI and uploads it to Cloudinary. There is no check on file size or count.
3. **Pick and enforce a limit.** The effective limit is the smallest of:
   - Cloudinary plan limit per image (about 10 MB on the free plan, more on paid plans — check the actual plan).
   - nginx `client_max_body_size`, which must cover one whole request (all images in it).
   - The app's own limit (currently none).

## Plan agreed in discussion

- Choose the per-image limit from the Cloudinary plan. Example: plan allows 10 MB, so the app allows 10 MB.
- Set nginx above the largest possible request. Example: 5 images x 10 MB means `client_max_body_size 60m;`.
- Check each file's size **in the form before upload** and show a clear message ("Image is 14 MB, the maximum is 10 MB").
- Check again **on the server** in `/api/upload`, since client checks can be bypassed. Also cap the number of images per request.
- Bigger alternative: upload directly from the browser to Cloudinary using a signed upload created by the server. The photo then never passes through the proxy or the app, so the nginx and app limits stop mattering. More work, but the standard way to handle large originals.

## Inputs needed from the owner before implementing

- The Cloudinary plan and its per-image size limit.
- The maximum number of images allowed per habitat.
- Whether to keep uploading through `/api/upload` or switch to direct Cloudinary upload.

## Related, already finished (same PR)

Vegetation alliance dropdown showing only 300 of 1,103 alliances: fixed with a paged, server-searched dropdown (`src/components/habitat/VegUnitCombobox.jsx` and `src/app/api/eu-veg-units/search/route.js`). Not related to image size.
