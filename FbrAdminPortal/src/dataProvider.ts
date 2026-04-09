import simpleRestProvider from 'ra-data-simple-rest';
import { DataProvider, fetchUtils, HttpError } from 'react-admin';
import { apiFetch } from './api/httpClient';
import { API_BASE_URL } from './api/apiBaseUrl';
import { getAccessToken } from './api/tokenStorage';

const httpClient = (url: string, options: any = {}) => {
    const headers = new Headers(options.headers ?? {});
    headers.set('Accept', 'application/json');
    if (options?.body != null && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    const token = getAccessToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);

    const isOurApi =
        (API_BASE_URL !== '' && url.startsWith(API_BASE_URL)) ||
        (API_BASE_URL === '' && url.startsWith('/api'));
    if (isOurApi) {
        const path = API_BASE_URL !== '' ? url.slice(API_BASE_URL.length) : url;
        return apiFetch(path, { ...options, headers }, { auth: true, retryOn401: true }).then(async res => {
            const text = await res.text();
            let json: any = {};
            try {
                json = text ? JSON.parse(text) : {};
            } catch {
                json = text ? { message: text } : {};
            }
            const out = { status: res.status, headers: res.headers, body: text, json };
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

const base = simpleRestProvider(`${API_BASE_URL}/api/admin`, httpClient);

async function fetchAdminFbrProvincesNormalized(): Promise<Array<{ id: number; provincename: string }>> {
    const res = await apiFetch('/api/admin/fbr-provinces', { method: 'GET' }, { auth: true, retryOn401: true });
    const text = await res.text();
    let raw: unknown[] = [];
    try {
        const parsed = text ? JSON.parse(text) : [];
        raw = Array.isArray(parsed) ? parsed : [];
    } catch {
        raw = [];
    }
    if (!res.ok) {
        throw new HttpError(res.statusText || 'Failed to load provinces', res.status, raw);
    }
    const normalized = raw.map((row: any) => ({
        id: Number(row.id ?? row.Id),
        provincename: String(row.provincename ?? row.Provincename ?? ''),
    }));
    normalized.sort((a, b) => a.provincename.localeCompare(b.provincename, undefined, { sensitivity: 'base' }));
    return normalized;
}

function sortCompanyRows<T extends Record<string, unknown>>(rows: T[], field: string, order: 'ASC' | 'DESC'): T[] {
    const m = order === 'DESC' ? -1 : 1;
    return [...rows].sort((a, b) => {
        const va = a[field];
        const vb = b[field];
        if (va == null && vb == null) return 0;
        if (va == null) return 1;
        if (vb == null) return -1;
        if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * m;
        if (typeof va === 'boolean' && typeof vb === 'boolean') return (Number(va) - Number(vb)) * m;
        return String(va).localeCompare(String(vb), undefined, { numeric: true }) * m;
    });
}

function applyCompanyListFilters(rows: any[], filter: Record<string, unknown>) {
    let out = [...rows];
    const q = String(filter.q ?? '').trim().toLowerCase();
    if (q) {
        out = out.filter(r => {
            const hay = [r.title, r.shortTitle, r.ntnNo, r.email, r.phone, String(r.id)]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();
            return hay.includes(q);
        });
    }
    const ps = filter.paymentStatus;
    if (ps) out = out.filter(r => String(r.paymentStatus ?? '') === String(ps));
    const act = filter.activation;
    if (act === 'active') out = out.filter(r => r.isActivated === true);
    if (act === 'inactive') out = out.filter(r => r.isActivated !== true);
    return out;
}

export const dataProvider: DataProvider = {
    ...base,
    getList: async (resource, params) => {
        if (resource === 'fbrProvinces') {
            const normalized = await fetchAdminFbrProvincesNormalized();
            const total = normalized.length;
            return { data: normalized, total };
        }

        if (resource !== 'companies') return base.getList(resource, params);

        const r = await base.getList(resource, {
            ...params,
            pagination: { page: 1, perPage: 100_000 },
            filter: {},
        });
        const all = Array.isArray(r.data) ? r.data : [];
        let rows = applyCompanyListFilters(all, (params.filter || {}) as Record<string, unknown>);
        const field = params.sort?.field ?? 'id';
        const order = (params.sort?.order as 'ASC' | 'DESC') ?? 'ASC';
        rows = sortCompanyRows(rows, field, order);
        const total = rows.length;
        const page = params.pagination?.page ?? 1;
        const perPage = params.pagination?.perPage ?? 25;
        const start = (page - 1) * perPage;
        const data = rows.slice(start, start + perPage);
        return { data, total };
    },

    getMany: async (resource, params) => {
        if (resource === 'fbrProvinces') {
            const all = await fetchAdminFbrProvincesNormalized();
            const want = new Set(
                (params.ids as (string | number)[])
                    .filter(id => id !== '' && id != null)
                    .map(id => Number(id))
            );
            const data = all.filter(r => want.has(Number(r.id))) as any[];
            return { data };
        }
        return base.getMany(resource, params);
    },

    update: async (resource, params) => {
        if (resource !== 'companies') return base.update(resource, params);

        const data = params.data as Record<string, unknown>;
        const id = params.id;

        const fp = data.fbrProvinceId;
        let fbrProvinceId: number | null = null;
        if (fp !== '' && fp !== undefined && fp !== null) {
            const n = typeof fp === 'number' ? fp : Number(fp);
            fbrProvinceId = Number.isFinite(n) ? n : null;
        }

        const body: Record<string, unknown> = {
            title: data.title,
            shortTitle: data.shortTitle,
            email: data.email,
            phone: data.phone,
            website: data.website,
            ntnNo: data.ntnNo,
            employeeCount: data.employeeCount,
            enableSandBox: data.enableSandBox,
            fbrTokenSandBox: data.fbrTokenSandBox,
            fbrTokenProduction: data.fbrTokenProduction,
            fbrProvinceId,
            paymentStatus: data.paymentStatus,
            paymentModel: data.paymentModel,
            paymentNotes: data.paymentNotes,
            amount: data.amount,
            currency: data.currency,
        };

        const logo = data.logoBase64;
        if (typeof logo === 'string') {
            const t = logo.trim();
            if (t.length > 0 && /^data:/i.test(t)) {
                body.logoBase64 = t;
            }
        }

        const res = await apiFetch(
            `/api/admin/companies/${encodeURIComponent(String(id))}`,
            {
                method: 'PUT',
                headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            },
            { auth: true, retryOn401: true }
        );
        const text = await res.text();
        let json: any = {};
        try {
            json = text ? JSON.parse(text) : {};
        } catch {
            json = text ? { message: text } : {};
        }
        if (!res.ok) {
            const message =
                (json && typeof json === 'object' && json.message ? String(json.message) : res.statusText) ||
                'Http Error';
            throw new HttpError(message, res.status, json);
        }
        return { data: json };
    },
};
