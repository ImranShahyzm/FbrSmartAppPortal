export type AccountingAccessRights = {
    modules?: {
        accounting?: {
            chartOfAccounts?: { read?: boolean; write?: boolean };
        };
    };
};

export type PermissionsPayload = {
    apps: string[];
    permissions: string[];
};

export type Identity = {
    id: string;
    fullName: string;
    role?: string;
    companyId?: number;
    companyName?: string;
    /** Relative uploads path from API */
    profileImage?: string | null;
    /** false when self-service company is not yet activated by platform admin */
    companyIsActivated?: boolean;
    accessRights?: AccountingAccessRights | null;
    /** Allowed launcher app ids from the API security contract */
    apps?: string[];
    /** Flat permission strings app.resource.action */
    permissions?: string[];
};

const ACCESS_TOKEN_KEY = 'accessToken';
const IDENTITY_KEY = 'identity';

export function getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token: string) {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function clearAccessToken() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
}

export function getIdentityCached(): Identity | null {
    const raw = localStorage.getItem(IDENTITY_KEY);
    if (!raw) return null;
    try {
        return JSON.parse(raw) as Identity;
    } catch {
        return null;
    }
}

export function setIdentityCached(identity: Identity) {
    localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
}

export function clearIdentityCached() {
    localStorage.removeItem(IDENTITY_KEY);
}

export function clearAuthCache() {
    clearAccessToken();
    clearIdentityCached();
}

