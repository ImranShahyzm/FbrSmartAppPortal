import {
    ACCOUNTING_SUITE_APP_ID,
    DEFAULT_ACTIVE_APP_ID,
    SETTINGS_APP_ID,
} from '../apps/appsRegistry';

/** Synced from the shell when active workspace changes; read by apiFetch for X-Active-App-Id. */
let currentActiveAppId: string | null = null;

export function setActiveAppIdForHttpHeader(appId: string | null) {
    currentActiveAppId = appId;
}

function inferActiveAppFromPathname(): string {
    if (typeof window === 'undefined') return DEFAULT_ACTIVE_APP_ID;
    const path = window.location.pathname;
    if (path === '/settings' || path.startsWith('/settings/')) return SETTINGS_APP_ID;
    if (path === '/accounting' || path.startsWith('/accounting/')) return ACCOUNTING_SUITE_APP_ID;
    if (path === '/fbr' || path.startsWith('/fbr/')) return DEFAULT_ACTIVE_APP_ID;
    return DEFAULT_ACTIVE_APP_ID;
}

/** Non-empty app id for API calls: store wins, else URL basename, else default. */
export function getActiveAppIdForHttpHeader(): string {
    const fromStore = currentActiveAppId?.trim();
    if (fromStore) return fromStore;
    return inferActiveAppFromPathname();
}
