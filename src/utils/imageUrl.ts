/**
 * Securely resolves a product image source for safe Electron rendering.
 * Never outputs full raw Windows file:/// paths to avoid Chromium local resource security errors.
 */
export function getProductImageUrl(image?: string | null): string | null {
  if (!image || typeof image !== 'string') return null;
  const trimmed = image.trim();
  if (!trimmed) return null;

  // Web URLs, Blob URLs, and Data URLs are already safely formatted
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('data:')
  ) {
    return trimmed;
  }

  // Extract pure filename (strip Windows drive C:\... or Unix /... paths if present in database)
  const filename = trimmed.replace(/^.*[\\/]/, '');
  if (!filename) return null;

  // Use the secure Electron privileged custom protocol
  return `app-media://product-image/${encodeURIComponent(filename)}`;
}
