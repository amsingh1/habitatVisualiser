# Image upload size — open issue and plan

Status: **open** (written 2026-10-29, plan updated 2026-10-30). Written for humans and agents picking this up later.

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

## Decision (2026-10-30): direct signed upload to Cloudinary, no compression

New customer request: large images should be stored at original resolution, with a resized version used for the web. Plan agreed in discussion (not implemented yet):

1. **Upload the untouched original straight from the browser to Cloudinary.** No client-side compression: once the browser shrinks a photo, the original is gone and Cloudinary can only store the shrunk copy. A pasted guide proposing `browser-image-compression` plus an incoming-transformation limit (2560px) was rejected for this reason.
2. **Use a signed upload, not an unsigned preset.** Add a route such as `/api/upload/sign` that checks the NextAuth session and returns a short-lived signature, timestamp and folder. An unsigned preset would let anyone upload to the account without logging in.
3. **The photo no longer passes through nginx or the app.** This removes the 413 error and the `client_max_body_size` dependency, and the in-memory base64 handling in `src/app/api/upload/route.js`. `HabitatUpload.jsx` then sends only the returned URLs in the habitat JSON.
4. **Resize for the web at display time** with Cloudinary URL transformations (for example `w_1600,q_auto,f_auto`) in the places that render images (`ImageSlider`, the lists, the detail page). The original stays stored. Existing records keep working because the transformation is only applied to the URL when displayed.
5. **Still check file size in the form before upload** and show a clear message, and cap the number of images. Cloudinary's per-file limit still applies (about 10 MB on the free plan).

### Cloudinary plan: credits, not just MB
Cloudinary plans are measured mainly in **credits**, not a plain MB quota. Per Cloudinary's pricing and billing pages (web search 2026-10-30, not checked against the customer's account), 1 credit = 1,000 transformations, or 1 GB of managed storage, or 1 GB of viewing bandwidth; the free plan has a monthly credit allowance (about 25 credits) and a per-image file size cap (about 10 MB; paid plans allow more). Check the pricing page and the customer's Console for the current numbers.

Why this matters for this plan:
- Keeping **originals** uses more storage credits than small files.
- Showing **resized copies** through URL transformations uses transformation credits (each new size/format is a transformation, then cached) plus bandwidth credits. Use a small fixed set of sizes so transformations are reused.
- So the credit allowance, not only the per-image MB limit, decides how many originals can be stored and served. Check the customer's credit usage in the Console before committing.

### Current usage (customer's Console, 2026-10-30)
Free plan, 0.53 of 25 credits used in the last 30 days: storage 531 MB (about 200 images, roughly 2.7 MB each), bandwidth 23 MB (34 image views), 1 transformation. Credits are not a blocker today. Storing originals (phone photos are often 3-8 MB) will use more storage, and bandwidth would grow if originals were served directly, so display copies must be resized. The hard limit is the free plan's per-image cap (about 10 MB, to be confirmed in the Console): larger photos are rejected by Cloudinary.

### Upload behaviour decided (2026-10-30)
- **Per-photo limit of 10 MB, checked in the form** before upload, with a clear message naming the file and its size ("IMG_123.jpg is 14 MB, the maximum is 10 MB"). Cloudinary enforces its own cap as well.
- **No combined size limit.** The cap is per image, and each photo is its own request straight to Cloudinary, so 10 photos of 10 MB (100 MB total) is fine. nginx and the app do not see these requests.
- **Upload on submit, not on file select.** This avoids orphaned images in Cloudinary when a user abandons the form. Show progress ("Uploading 3 of 10").
- **Upload photos one at a time** at first (two or three in parallel is a later optimisation).
- **Save the habitat record only after all photos succeed.** If one fails, keep the ones that worked, say which photo failed, and let the user retry.
- **Cap the number of photos per record** (value still to be decided) to protect storage credits; worst case is about 0.1 credit per record at 10 x 10 MB.
- **When saving the record, the server checks that every submitted image URL belongs to our Cloudinary cloud and folder**, so arbitrary links cannot be stored.
- Mobile users on weak connections may time out on large files, so retry matters.

### Still needed from the customer
- Cloudinary plan, its monthly credits and current usage, and its per-image size limit.
- Maximum number of images per record.
- Confirm "repository" means Cloudinary.

### Things to check when implementing
- Create and edit mode both in `HabitatUpload.jsx`, and every place that renders `imageUrl`.
- Error handling for Cloudinary's own error responses (different from today's 413 handling).
- Cleanup of uploaded images if the habitat save fails (not handled today either).
- Cannot be tested without the customer's real Cloudinary account and proxy.
