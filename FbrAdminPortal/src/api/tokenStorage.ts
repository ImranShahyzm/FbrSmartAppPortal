export type AdminIdentity = {
    id: string;
    fullName: string;
    email: string;
    role?: string;
};

const ACCESS_TOKEN_KEY = 'adminAccessToken';
const IDENTITY_KEY = 'adminIdentity';

export function getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token: string) {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function clearAccessToken() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
}

export function getIdentityCached(): AdminIdentity | null {
    const raw = localStorage.getItem(IDENTITY_KEY);
    if (!raw) return null;
    try {
        return JSON.parse(raw) as AdminIdentity;
    } catch {
        return null;
    }
}

export function setIdentityCached(identity: AdminIdentity) {
    localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
}

export function clearIdentityCached() {
    localStorage.removeItem(IDENTITY_KEY);
}

export function clearAuthCache() {
    clearAccessToken();
    clearIdentityCached();
}

