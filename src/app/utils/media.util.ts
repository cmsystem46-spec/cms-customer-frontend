import { environment } from '../../environments/environment';

/**
 * Resolves any image/media path into a fully qualified URL.
 * Handles:
 * 1. Already absolute URLs (http://, https://, data:, blob:)
 * 2. Filenames / relative paths by prepending environment.apiUrl (with /uploads/ normalization)
 * 3. Null / undefined / empty values
 */
export function getMediaUrl(path?: string | null): string {
  if (!path) return '';
  const trimmed = path.trim();
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }

  const base = (
    (environment as any).mediaUrl ||
    environment.apiUrl ||
    'http://localhost:5000'
  ).replace(/\/+$/, '');

  const clean = trimmed.replace(/^\/+/, '');
  if (clean.startsWith('uploads/')) {
    return `${base}/${clean}`;
  }
  return `${base}/uploads/${clean}`;
}
