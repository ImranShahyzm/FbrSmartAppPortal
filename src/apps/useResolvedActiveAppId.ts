import { useLocation } from 'react-router-dom';
import { useStore } from 'react-admin';

import { ACTIVE_APP_STORE_KEY } from './activeAppStore';
import { DEFAULT_ACTIVE_APP_ID, resolveAppIdFromPathname } from './appsRegistry';

/**
 * Prefer the workspace implied by the current URL so the shell matches the mounted Admin
 * before SyncActiveAppFromPath's effect updates the store.
 */
export function useResolvedActiveAppId(): string {
    const { pathname } = useLocation();
    const [stored] = useStore<string>(ACTIVE_APP_STORE_KEY, DEFAULT_ACTIVE_APP_ID);
    return resolveAppIdFromPathname(pathname) ?? stored;
}
