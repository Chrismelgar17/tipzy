/**
 * Upload a local image URI to Cloudinary and return the public HTTPS URL.
 *
 * Setup (one-time):
 *  1. Create a free account at https://cloudinary.com
 *  2. In the Cloudinary dashboard go to Settings → Upload → Upload presets
 *  3. Click "Add upload preset", set Signing mode = "Unsigned", save → copy the preset name
 *  4. Add to your .env / Railway env vars:
 *       EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
 *       EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_unsigned_preset
 */

const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

/**
 * Upload a local file:// URI to Cloudinary.
 * Returns the permanent https URL on success.
 * Throws if env vars are missing or upload fails.
 */
export async function uploadImageToCloud(localUri: string): Promise<string> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error(
      'Image upload is not configured.\n\nPlease set EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME and EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET in your environment variables.\n\nSee lib/upload.ts for setup instructions.'
    );
  }

  const formData = new FormData();
  formData.append('file', {
    uri: localUri,
    type: 'image/jpeg',
    name: 'upload.jpg',
  } as any);
  formData.append('upload_preset', UPLOAD_PRESET);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Upload failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  if (!data.secure_url) {
    throw new Error('Upload succeeded but no URL was returned.');
  }

  return data.secure_url as string;
}

/** Returns true if the URI is a local device path (needs uploading). */
export function isLocalUri(uri: string): boolean {
  return uri.startsWith('file://') || uri.startsWith('content://') || uri.startsWith('/');
}
