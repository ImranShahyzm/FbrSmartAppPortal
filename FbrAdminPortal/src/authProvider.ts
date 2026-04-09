import type { AuthProvider } from 'react-admin';
import { getMe, login as apiLogin, logout as apiLogout } from './api/authClient';
import { clearAuthCache, getAccessToken, getIdentityCached, setIdentityCached, type AdminIdentity } from './api/tokenStorage';

function toRaIdentity(me: AdminIdentity) {
    return {
        id: me.id,
        fullName: me.fullName,
        email: me.email,
        role: me.role,
    };
}

const authProvider: AuthProvider = {
    login: async ({ username, password }) => {
        await apiLogin(String(username ?? ''), String(password ?? ''));
    },
    logout: async () => {
        await apiLogout();
    },
    checkError: (error: any) => {
        const status = error?.status ?? error?.response?.status;
        if (status === 401) {
            clearAuthCache();
            return Promise.reject();
        }
        return Promise.resolve();
    },
    checkAuth: async () => {
        if (getAccessToken()) return;
        await getMe();
    },
    getPermissions: () => Promise.resolve(),
    getIdentity: async () => {
        const cached = getIdentityCached();
        if (getAccessToken()) {
            try {
                const me = await getMe();
                setIdentityCached(me);
                return toRaIdentity(me);
            } catch {
                if (cached?.id) return toRaIdentity(cached);
                throw new Error('Not authenticated');
            }
        }
        if (cached?.id) return toRaIdentity(cached);
        throw new Error('Not authenticated');
    },
};

export default authProvider;

