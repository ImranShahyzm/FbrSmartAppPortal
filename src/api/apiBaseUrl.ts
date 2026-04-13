/**
 * API origin for `fetch`. Baked in at **build** time from `VITE_API_BASE_URL`.
 *
 * - **Production (IIS, same host):** leave `VITE_API_BASE_URL` empty in `.env.production`
 *   → `""` so requests go to `/api/...` on the current site (no localhost:5227).
 * - **Development:** when unset, defaults to `''` so requests use the Vite dev server origin and
 *   `vite.config.ts` proxies `/api` and `/uploads` to `http://localhost:5227` (no cross-origin fetch).
 *   Set `VITE_API_BASE_URL=http://localhost:5227` if you need to bypass the proxy.
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
        return '';
    }
    return '';
}

export const API_BASE_URL = computeApiBaseUrl();
