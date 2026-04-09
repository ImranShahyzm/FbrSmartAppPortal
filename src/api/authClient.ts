import { apiFetch } from './httpClient';
import {
    clearAuthCache,
    Identity,
    setAccessToken,
    setIdentityCached,
} from './tokenStorage';

function normalizeIdentityPayload(x: unknown): Identity | null {
    if (x == null || typeof x !== 'object') return null;
    const raw = x as Record<string, unknown>;
    const id = raw.id ?? raw.Id;
    if (id == null || String(id) === '') return null;
    return {
        id: String(id),
        fullName: String(raw.fullName ?? raw.FullName ?? ''),
        role: raw.role != null ? String(raw.role) : raw.Role != null ? String(raw.Role) : undefined,
        companyId:
            typeof raw.companyId === 'number'
                ? raw.companyId
                : typeof raw.CompanyId === 'number'
                  ? raw.CompanyId
                  : undefined,
        companyName:
            raw.companyName != null
                ? String(raw.companyName)
                : raw.CompanyName != null
                  ? String(raw.CompanyName)
                  : undefined,
        profileImage:
            raw.profileImage != null
                ? String(raw.profileImage)
                : raw.ProfileImage != null
                  ? String(raw.ProfileImage)
                  : undefined,
        companyIsActivated:
            raw.companyIsActivated === false || raw.CompanyIsActivated === false ? false : true,
    };
}

export async function login(username: string, password: string) {
    const res = await apiFetch(
        '/api/auth/login',
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        },
        { auth: false, retryOn401: false }
    );

    if (!res.ok) {
        clearAuthCache();
        throw new Error('Invalid credentials');
    }

    const data = (await res.json()) as {
        accessToken: string;
        identity?: Identity;
        /** Some API stacks serialize nested DTO with PascalCase */
        Identity?: Identity;
    };

    if (!data?.accessToken) {
        clearAuthCache();
        throw new Error('Invalid login response');
    }

    setAccessToken(data.accessToken);
    const identity = normalizeIdentityPayload(data.identity ?? data.Identity);
    if (identity) setIdentityCached(identity);
}

export async function logout() {
    try {
        await apiFetch(
            '/api/auth/logout',
            { method: 'POST' },
            { auth: true, retryOn401: false }
        );
    } finally {
        clearAuthCache();
    }
}

export async function getMe(): Promise<Identity> {
    const res = await apiFetch('/api/auth/me', { method: 'GET' }, { auth: true });
    if (!res.ok) {
        clearAuthCache();
        throw new Error('Not authenticated');
    }
    const raw = await res.json();
    const me = normalizeIdentityPayload(raw);
    if (!me?.id) throw new Error('Not authenticated');
    return me;
}

