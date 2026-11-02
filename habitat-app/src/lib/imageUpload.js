// Image upload limits and Cloudinary URL helpers. Shared by the upload form,
// the sign route, the habitat save routes and the components that show images.
// Contains no secrets: safe to import in browser code.
//
// Limits follow the Cloudinary Free plan (10 MB, 25 MP per image) and the
// owner's decision of 10 photos per record. Raise them here after a plan upgrade.
// See docs/notes/image-upload-size.md.

export const MAX_IMAGES_PER_RECORD = 10;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_IMAGE_MEGAPIXELS = 25;

// Cloudinary folder all habitat photos are stored in (unchanged from the old
// server-side upload, so old and new photos stay together).
export const UPLOAD_FOLDER = 'your_app_name';

// Formats Cloudinary accepts for upload (locked into the upload signature).
export const ALLOWED_FORMATS = ['jpg', 'png', 'heic', 'heif', 'webp'];
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'heic', 'heif', 'webp'];

// What the file picker offers. Extensions are listed because some browsers
// report HEIC files with an empty MIME type.
export const FILE_INPUT_ACCEPT =
  'image/jpeg,image/png,image/heic,image/heif,image/webp,.jpg,.jpeg,.png,.heic,.heif,.webp';

export function formatMegabytes(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(/\.0$/, '')} MB`;
}

export function isAllowedImageFile(file) {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  return ALLOWED_EXTENSIONS.includes(ext);
}

// Display variants. Each is a fixed transformation string so Cloudinary can
// cache it, and so "Strict transformations" can allow exactly these.
// The stored original is never changed.
export const IMAGE_VARIANTS = {
  // Lists, cards, map popups, form previews.
  thumb: 'c_limit,w_400,q_auto,f_auto',
  // Detail view and home slider: large, visually lossless.
  large: 'c_limit,w_2560,q_auto:best,f_auto',
  // Full resolution for close inspection. Converts HEIC to a format browsers
  // can show; pixel size is the original's.
  full: 'q_auto:best,f_auto',
};

const CLOUDINARY_UPLOAD_MARKER = '/image/upload/';

// Returns a Cloudinary delivery URL for the given variant. URLs that are not
// plain Cloudinary image URLs (Google avatars, old local paths, data: previews)
// are returned unchanged. variant 'original' returns the stored file as uploaded.
export function cloudinaryImageUrl(url, variant = 'large') {
  if (!url || typeof url !== 'string') return url;
  if (variant === 'original') return url;
  const transformation = IMAGE_VARIANTS[variant];
  if (!transformation) return url;
  if (!url.startsWith('https://res.cloudinary.com/')) return url;
  const at = url.indexOf(CLOUDINARY_UPLOAD_MARKER);
  if (at === -1) return url;
  const prefix = url.slice(0, at + CLOUDINARY_UPLOAD_MARKER.length);
  const rest = url.slice(at + CLOUDINARY_UPLOAD_MARKER.length);
  // Only plain stored URLs (optional version, then the public id) get a
  // transformation; anything already transformed is left alone.
  if (!/^(v\d+\/)?[^/]/.test(rest) || rest.includes(',')) return url;
  return `${prefix}${transformation}/${rest}`;
}

// True if the URL is an image stored by this app in our Cloudinary cloud and
// folder, with no transformation. Used by the server before saving a record.
export function isOwnCloudinaryImageUrl(url, cloudName) {
  if (!cloudName || typeof url !== 'string') return false;
  const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(
    `^https://res\\.cloudinary\\.com/${escape(cloudName)}/image/upload/(v\\d+/)?${escape(UPLOAD_FOLDER)}/[A-Za-z0-9_\\-.]+$`
  );
  return pattern.test(url);
}

// Server-side check of the image list sent with a habitat record.
// existingUrls: the record's current images (edit mode). They may be kept even
// if they predate these rules (old folders or local paths), and an old record
// with more than the maximum may keep them, but cannot add more.
// Returns { value: string[] } or { error: string }.
export function validateImageUrls(imageUrl, { cloudName, existingUrls = [] } = {}) {
  if (!Array.isArray(imageUrl) || imageUrl.length === 0) {
    return { error: 'At least one image is required' };
  }
  if (!imageUrl.every((u) => typeof u === 'string' && u.length > 0)) {
    return { error: 'Invalid image list' };
  }
  const existing = new Set(existingUrls);
  const newUrls = imageUrl.filter((u) => !existing.has(u));
  if (newUrls.length > 0 && imageUrl.length > MAX_IMAGES_PER_RECORD) {
    return { error: `A record can have at most ${MAX_IMAGES_PER_RECORD} images` };
  }
  if (imageUrl.length > Math.max(MAX_IMAGES_PER_RECORD, existing.size)) {
    return { error: `A record can have at most ${MAX_IMAGES_PER_RECORD} images` };
  }
  const invalid = newUrls.find((u) => !isOwnCloudinaryImageUrl(u, cloudName));
  if (invalid) {
    return { error: 'One or more images were not uploaded through this application' };
  }
  return { value: imageUrl };
}
