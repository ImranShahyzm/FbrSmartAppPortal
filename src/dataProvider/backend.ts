import simpleRestProvider from 'ra-data-simple-rest';
import { fetchUtils, DataProvider, HttpError } from 'react-admin';

import { getAccessToken } from '../api/tokenStorage';
import { apiFetch } from '../api/httpClient';
import { API_BASE_URL } from '../api/apiBaseUrl';

const httpClient = (url: string, options: any = {}) => {
    // Use the same refresh-on-401 logic as the app auth client.
    // This prevents "stuck" 401s that make saves look like they do nothing.
    const headers = new Headers(options.headers ?? {});
    headers.set('Accept', 'application/json');
    // Ensure JSON writes send correct content type (fixes 415 on PUT/POST)
    if (options?.body != null && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    const token = getAccessToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);

    // Prefer apiFetch when calling our backend to allow refresh flow.
    // Note: `''.startsWith('')` is true in JS, so treat empty base + `/api` paths explicitly.
    const isOurApi =
        (API_BASE_URL !== '' && url.startsWith(API_BASE_URL)) ||
        (API_BASE_URL === '' && url.startsWith('/api'));
    if (isOurApi) {
        const path = API_BASE_URL !== '' ? url.slice(API_BASE_URL.length) : url;
        return apiFetch(
            path,
            {
                ...options,
                headers,
            },
            { auth: true, retryOn401: true }
        ).then(async res => {
            const text = await res.text();
            let json: any = {};
            try {
                json = text ? JSON.parse(text) : {};
            } catch {
                json = text ? { message: text } : {};
            }
            const out = {
                status: res.status,
                headers: res.headers,
                body: text,
                json,
            };
            if (res.status < 200 || res.status >= 300) {
                const message =
                    (json && typeof json === 'object' && 'message' in json && json.message
                        ? String(json.message)
                        : res.statusText) || 'Http Error';
                throw new HttpError(message, res.status, json);
            }
            return out;
        });
    }

    return fetchUtils.fetchJson(url, { ...options, headers, credentials: 'include' });
};

export const backendDataProvider: DataProvider = simpleRestProvider(
    `${API_BASE_URL}/api`,
    httpClient
);

