import { apiFetch } from './httpClient';
import { clearAuthCache, setAccessToken, setIdentityCached, type AdminIdentity } from './tokenStorage';

function normalizeIdentity(raw: unknown): AdminIdentity | null {
    if (raw == null || typeof raw !== 'object') return null;
    const o = raw as Record<string, unknown>;
    const id = o.id ?? o.Id;
    if (id == null || String(id) === '') return null;
    return {
        id: String(id),
        fullName: String(o.fullName ?? o.FullName ?? ''),
        email: String(o.email ?? o.Email ?? ''),
        role: o.role != null ? String(o.role) : o.Role != null ? String(o.Role) : undefined,
    };
}

export async function login(email: string, password: string) {
    const res = await apiFetch(
        '/api/admin/auth/login',
        {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        },
        { auth: false, retryOn401: false }
    );
    if (!res.ok) {
        clearAuthCache();
        throw new Error('Invalid credentials');
    }
    const data = (await res.json()) as { accessToken: string; identity?: unknown; Identity?: unknown };
    if (!data?.accessToken) {
        clearAuthCache();
        throw new Error('Invalid login response');
    }
    setAccessToken(data.accessToken);
    const me = normalizeIdentity(data.identity ?? data.Identity);
    if (me) setIdentityCached(me);
}

export async function logout() {
    try {
        await apiFetch('/api/admin/auth/logout', { method: 'POST' }, { auth: true, retryOn401: false });
    } finally {
        clearAuthCache();
    }
}

export async function getMe(): Promise<AdminIdentity> {
    const res = await apiFetch('/api/admin/auth/me', { method: 'GET' }, { auth: true });
    if (!res.ok) {
        clearAuthCache();
        throw new Error('Not authenticated');
    }
    const raw = await res.json();
    const me = normalizeIdentity(raw);
    if (!me?.id) throw new Error('Not authenticated');
    return me;
}

