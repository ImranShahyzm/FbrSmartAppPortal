import type { ThemeName } from '../themes/themes';

/** localStorage-backed key (via react-admin store) */
export const STORE_KEY_ACTIVE_APP = 'activeAppId';

function getTabId(): string {
    const k = 'tabId';
    const existing = sessionStorage.getItem(k);
    if (existing) return existing;
    const id =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? // @ts-ignore
              crypto.randomUUID()
            : String(Math.random()).slice(2) + String(Date.now());
    sessionStorage.setItem(k, id);
    return id;
}

/** Per-tab store key for active app selection (avoid ':' for broad compatibility). */
export const ACTIVE_APP_STORE_KEY = `${STORE_KEY_ACTIVE_APP}_${getTabId()}`;

/** Optional: only render Odoo top nav + launcher when theme is nano */
export function isOdooShellTheme(themeName: ThemeName): boolean {
    return themeName === 'nano';
}
