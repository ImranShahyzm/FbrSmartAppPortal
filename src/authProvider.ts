import { AuthProvider } from 'react-admin';

import { API_BASE_URL } from './api/apiBaseUrl';
import { getMe, login as apiLogin, logout as apiLogout } from './api/authClient';
import {
    clearAuthCache,
    getAccessToken,
    getIdentityCached,
    Identity,
    setIdentityCached,
} from './api/tokenStorage';

function avatarUrlFromProfilePath(path?: string | null): string | undefined {
    if (path == null || String(path).trim() === '') return undefined;
    const p = String(path).replace(/^\/+/, '');
    const base = API_BASE_URL.replace(/\/$/, '');
    if (base) return `${base}/${p}`;
    return `/${p}`;
}

function identityToUserIdentity(me: Identity) {
    return {
        id: me.id,
        fullName: me.fullName,
        companyName: me.companyName,
        companyId: me.companyId,
        avatar: avatarUrlFromProfilePath(me.profileImage),
        profileImage: me.profileImage,
        companyIsActivated: me.companyIsActivated !== false,
    };
}

const authProvider: AuthProvider = {
    login: async ({ username, password }) => {
        await apiLogin(username, password);
    },
    logout: async () => {
        await apiLogout();
    },
    checkError: (error: any) => {
        const status = error?.status ?? error?.response?.status;
        // 403 is used for "company not activated" while the user remains signed in.
        if (status === 401) {
            clearAuthCache();
            return Promise.reject();
        }
        return Promise.resolve();
    },
    checkAuth: async () => {
        // Fast path: have an access token; actual validity is enforced by API calls
        if (getAccessToken()) return;
        // Try to load identity via /me (will trigger refresh-on-401 in http client)
        await getMe();
    },
    getPermissions: () => Promise.resolve(),
    getIdentity: async () => {
        const cached = getIdentityCached();
        if (getAccessToken()) {
            try {
                const me = await getMe();
                setIdentityCached(me);
                return identityToUserIdentity(me);
            } catch {
                if (cached?.id) {
                    return identityToUserIdentity(cached);
                }
                throw new Error('Not authenticated');
            }
        }
        if (cached?.id) {
            return identityToUserIdentity(cached);
        }
        throw new Error('Not authenticated');
    },
};

export default authProvider;
