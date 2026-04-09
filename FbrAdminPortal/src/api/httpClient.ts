import { API_BASE_URL } from './apiBaseUrl';
import { clearAuthCache, getAccessToken, setAccessToken } from './tokenStorage';

let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
    if (!refreshPromise) {
        refreshPromise = (async () => {
            const res = await fetch(`${API_BASE_URL}/api/admin/auth/refresh`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
            });
            if (!res.ok) {
                clearAuthCache();
                throw new Error('Refresh failed');
            }
            const data = (await res.json()) as { accessToken: string };
            if (!data?.accessToken) {
                clearAuthCache();
                throw new Error('Invalid refresh response');
            }
            setAccessToken(data.accessToken);
            return data.accessToken;
        })().finally(() => {
            refreshPromise = null;
        });
    }
    return refreshPromise;
}

export async function apiFetch(
    path: string,
    init: RequestInit = {},
    opts: { auth?: boolean; retryOn401?: boolean } = {}
) {
    const auth = opts.auth ?? true;
    const retryOn401 = opts.retryOn401 ?? true;

    const headers = new Headers(init.headers ?? {});
    headers.set('Accept', 'application/json');
    if (init.body != null && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

    if (auth) {
        const token = getAccessToken();
        if (token) headers.set('Authorization', `Bearer ${token}`);
    }

    const res = await fetch(`${API_BASE_URL}${path}`, {
        ...init,
        headers,
        credentials: 'include',
    });

    if (res.status !== 401 || !auth || !retryOn401) return res;

    try {
        const newToken = await refreshAccessToken();
        const retryHeaders = new Headers(init.headers ?? {});
        retryHeaders.set('Accept', 'application/json');
        retryHeaders.set('Authorization', `Bearer ${newToken}`);
        if (init.body != null && !retryHeaders.has('Content-Type')) retryHeaders.set('Content-Type', 'application/json');

        return await fetch(`${API_BASE_URL}${path}`, {
            ...init,
            headers: retryHeaders,
            credentials: 'include',
        });
    } catch {
        return res;
    }
}

