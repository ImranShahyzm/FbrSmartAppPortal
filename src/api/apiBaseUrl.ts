/**
 * API origin for `fetch`. Baked in at **build** time from `VITE_API_BASE_URL`.
 *
 * - **Production (IIS, same host):** leave `VITE_API_BASE_URL` empty in `.env.production`
 *   → `""` so requests go to `/api/...` on the current site (no localhost:5227).
 * - **Development:** when unset, defaults to `http://localhost:5227`.
 */
function trimTrailingSlashes(s: string): string {
    return s.replace(/\/+$/, '');
}

function computeApiBaseUrl(): string {
    const raw = import.meta.env.VITE_API_BASE_URL as string | undefined;
    if (raw !== undefined && raw !== null && String(raw).trim() !== '') {
        return trimTrailingSlashes(String(raw).trim());
    }
    if (import.meta.env.DEV) {
        return 'http://localhost:5227';
    }
    return '';
}

export const API_BASE_URL = computeApiBaseUrl();
