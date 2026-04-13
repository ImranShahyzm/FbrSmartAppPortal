import { DataProvider } from 'react-admin';
import { backendDataProvider } from './backend';
import {
    mapFbrInvoiceToUpsertBody,
    normalizeFbrInvoiceRecord,
} from '../orders/fbrInvoiceDataProvider';
import { apiFetch } from '../api/httpClient';
import { normalizeGlChartAccountRecord } from '../accounting/glChartAccountTransform';
import { normalizeGlJournalVoucherRecord } from '../accounting/glJournalVoucherTransform';

/** Ensure react-admin record id + camelCase for voucher type API payloads. */
function normalizeGlVoucherTypeRecord(row: unknown): Record<string, unknown> {
    const o =
        row && typeof row === 'object' && !Array.isArray(row)
            ? { ...(row as Record<string, unknown>) }
            : {};
    const id = o.id ?? o.Id;
    return { ...o, ...(id !== undefined ? { id } : {}) };
}

const backendResources = new Set([
    'productProfiles',
    'companies',
    'users',
    'customers',
    'fbrProvinces',
    'fbrSaleTypes',
    'fbrRates',
    'fbrSroSchedules',
    'fbrSroItems',
    'fbrInvoices',
    'fbrScenarios',
    'fbrSalesTaxRates',
    'glChartAccounts',
    'glVoucherTypes',
    'glJournalVouchers',
    'registerCurrencies',
    'securityGroups',
]);

const pdiListResources: Record<string, (params: Record<string, unknown>) => string> = {
    fbrPdiTransTypes: p => {
        const q =
            p.filter != null && typeof p.filter === 'object' && p.filter !== null && 'q' in p.filter
                ? String((p.filter as { q?: unknown }).q ?? '')
                : '';
        const pag = p.pagination as { perPage?: number } | undefined;
        const per = pag?.perPage;
        const take = typeof per === 'number' && per > 0 ? Math.min(per, 500) : 50;
        return `fbrPdi/trans-types?q=${encodeURIComponent(q)}&take=${take}`;
    },
    fbrPdiUoms: p => {
        const q = p.filter != null && typeof p.filter === 'object' && p.filter !== null && 'q' in p.filter
            ? String((p.filter as { q?: unknown }).q ?? '')
            : '';
        const pag = p.pagination as { perPage?: number } | undefined;
        const per = pag?.perPage;
        const take =
            typeof per === 'number' && per > 0 ? Math.min(per, 500) : 200;
        return `fbrPdi/uoms?q=${encodeURIComponent(q)}&take=${take}`;
    },
    fbrPdiItemDescCodes: p => {
        const q = p.filter != null && typeof p.filter === 'object' && p.filter !== null && 'q' in p.filter
            ? String((p.filter as { q?: unknown }).q ?? '')
            : '';
        const take = 50;
        return `fbrPdi/item-desc-codes?q=${encodeURIComponent(q)}&take=${take}`;
    },
};

/** List rows: ensure grid columns bind if API ever returns PascalCase. */
function normalizeFbrInvoiceListRow(row: unknown): Record<string, unknown> {
    const o =
        row && typeof row === 'object' && !Array.isArray(row)
            ? { ...(row as Record<string, unknown>) }
            : {};
    if (o.customerAddress == null && o.CustomerAddress != null)
        o.customerAddress = o.CustomerAddress;
    if (o.customerNtn == null && o.CustomerNtn != null) o.customerNtn = o.CustomerNtn;
    if (o.customerPhone == null && o.CustomerPhone != null) o.customerPhone = o.CustomerPhone;
    if (o.customerName == null && o.CustomerName != null) o.customerName = o.CustomerName;
    return o;
}

/**
 * Some `/api/{resource}` endpoints ignore `Range` / `range` and return the full list while still
 * sending `Content-Range` with the real total. simple-rest then feeds the whole JSON array as
 * `data`, so the table shows every row while pagination shows the correct page range.
 * Slice client-side only when the payload is larger than the requested page size.
 */
function sliceListToPagination<T>(
    result: { data: T[]; total?: number },
    pagination?: { page?: number; perPage?: number }
): { data: T[]; total: number } {
    const page = pagination?.page ?? 1;
    const perPage = pagination?.perPage ?? 25;
    const data = Array.isArray(result.data) ? result.data : [];
    const resolvedTotal =
        typeof result.total === 'number' && !Number.isNaN(result.total) ? result.total : data.length;
    if (perPage <= 0 || data.length <= perPage) {
        return { data, total: resolvedTotal };
    }
    const start = Math.max(0, (page - 1) * perPage);
    return {
        data: data.slice(start, start + perPage),
        total: resolvedTotal,
    };
}

/** react-admin requires every getMany row to have an `id` (camelCase). */
function normalizeFbrSalesTaxRateRow(row: unknown, fallbackId: string | number): Record<string, unknown> {
    const o =
        row && typeof row === 'object' && !Array.isArray(row)
            ? (row as Record<string, unknown>)
            : {};
    const id = o.id ?? o.Id ?? fallbackId;
    const percentage = o.percentage ?? o.Percentage;
    return { ...o, id, ...(percentage !== undefined ? { percentage } : {}) };
}

async function pdiGetList(pathWithQuery: string): Promise<{ data: unknown[]; total: number }> {
    const res = await apiFetch(`/api/${pathWithQuery}`, { method: 'GET' });
    let parsed: unknown;
    try {
        parsed = await res.json();
    } catch {
        parsed = null;
    }
    if (!res.ok) {
        const msg =
            parsed && typeof parsed === 'object' && parsed !== null && 'message' in parsed
                ? String((parsed as { message?: unknown }).message ?? res.statusText)
                : res.statusText;
        throw new Error(msg);
    }
    const data = Array.isArray(parsed) ? parsed : [];
    return { data, total: data.length };
}

export default (type: string) => {
    const dataProviderPromise = getDataProvider(type);

    const dataProviderWithGeneratedData = new Proxy(defaultDataProvider, {
        get(_, name) {
            if (name === 'supportAbortSignal') {
                return import.meta.env.MODE === 'production';
            }
            return (resource: string, params: any) => {
                const method = name.toString();
                const pdiBuilder = pdiListResources[resource];
                if (pdiBuilder && method === 'getList') {
                    return pdiGetList(pdiBuilder(params));
                }

                if (resource === 'fbrPdiTransTypes' && method === 'getMany') {
                    const ids = (params.ids as (string | number)[]).filter(
                        id => id !== '' && id != null
                    );
                    if (ids.length === 0) {
                        return Promise.resolve({ data: [] });
                    }
                    const idNums = new Set(ids.map(id => Number(id)));
                    return pdiGetList(
                        `fbrPdi/trans-types?q=${encodeURIComponent('')}&take=500`
                    ).then(res => {
                        const rows = res.data as Array<{ id?: number }>;
                        const data = rows.filter(
                            r => r != null && idNums.has(Number(r.id))
                        );
                        return { data };
                    });
                }

                if (resource === 'fbrSalesTaxRates' && method === 'getMany') {
                    const ids = (params.ids as (string | number)[]).filter(
                        id => id !== '' && id != null
                    );
                    return (async () => {
                        const data: Record<string, unknown>[] = [];
                        for (const id of ids) {
                            const res = await apiFetch(
                                `/api/fbrSalesTaxRates/${encodeURIComponent(String(id))}`,
                                { method: 'GET' }
                            );
                            const text = await res.text();
                            let row: unknown;
                            try {
                                row = text ? JSON.parse(text) : {};
                            } catch {
                                continue;
                            }
                            if (!res.ok) continue;
                            data.push(normalizeFbrSalesTaxRateRow(row, id));
                        }
                        return { data };
                    })();
                }

                if (resource === 'fbrSalesTaxRates' && method === 'getList') {
                    const filt =
                        params.filter && typeof params.filter === 'object' && params.filter !== null
                            ? (params.filter as Record<string, unknown>)
                            : {};
                    const rawAsOf = filt.asOf;
                    const asOf =
                        rawAsOf instanceof Date && !Number.isNaN(rawAsOf.getTime())
                            ? rawAsOf.toISOString().slice(0, 10)
                            : typeof rawAsOf === 'string' && rawAsOf.trim() !== ''
                              ? rawAsOf.trim().slice(0, 10)
                              : '';
                    const qRaw = filt.q;
                    const q =
                        typeof qRaw === 'string' && qRaw.trim() !== ''
                            ? qRaw.trim()
                            : typeof qRaw === 'number'
                              ? String(qRaw)
                              : '';
                    const qsParts: string[] = [];
                    if (asOf) qsParts.push(`asOf=${encodeURIComponent(asOf)}`);
                    if (q) qsParts.push(`filter=${encodeURIComponent(JSON.stringify({ q }))}`);
                    const qs = qsParts.length > 0 ? `?${qsParts.join('&')}` : '';
                    return (async () => {
                        const res = await apiFetch(`/api/fbrSalesTaxRates${qs}`, { method: 'GET' });
                        const text = await res.text();
                        let parsed: unknown;
                        try {
                            parsed = text ? JSON.parse(text) : [];
                        } catch {
                            parsed = [];
                        }
                        if (!res.ok) {
                            const msg =
                                parsed &&
                                typeof parsed === 'object' &&
                                parsed !== null &&
                                'message' in parsed
                                    ? String((parsed as { message?: unknown }).message ?? res.statusText)
                                    : res.statusText;
                            throw new Error(msg);
                        }
                        const rawList = Array.isArray(parsed) ? parsed : [];
                        const data = rawList.map((row, i) => {
                            const o =
                                row && typeof row === 'object' && !Array.isArray(row)
                                    ? (row as Record<string, unknown>)
                                    : {};
                            const fallbackId = (o.id ?? o.Id ?? i) as string | number;
                            return normalizeFbrSalesTaxRateRow(row, fallbackId);
                        });
                        const cr = res.headers.get('Content-Range') ?? '';
                        let total = data.length;
                        const slash = cr.lastIndexOf('/');
                        if (slash >= 0) {
                            const n = parseInt(cr.slice(slash + 1), 10);
                            if (!Number.isNaN(n)) total = n;
                        }
                        return { data, total };
                    })();
                }

                if (backendResources.has(resource)) {
                    if (resource === 'fbrInvoices' && method === 'getList') {
                        return backendDataProvider
                            .getList(resource, params)
                            .then(result =>
                                sliceListToPagination(
                                    {
                                        ...result,
                                        data: (result.data as unknown[]).map(normalizeFbrInvoiceListRow),
                                    },
                                    params.pagination
                                )
                            );
                    }
                    if (resource === 'glChartAccounts' && method === 'getList') {
                        return backendDataProvider
                            .getList(resource, params)
                            .then(result => sliceListToPagination(result, params.pagination));
                    }
                    if (
                        resource === 'glVoucherTypes' &&
                        (method === 'getOne' || method === 'create' || method === 'update')
                    ) {
                        return (
                            backendDataProvider as Record<
                                string,
                                (r: string, p: unknown) => Promise<{ data: unknown }>
                            >
                        )[method](resource, params).then(result => ({
                            data: normalizeGlVoucherTypeRecord(result.data as Record<string, unknown>),
                        }));
                    }
                    if (
                        resource === 'glChartAccounts' &&
                        (method === 'getOne' || method === 'create' || method === 'update')
                    ) {
                        return (
                            backendDataProvider as Record<
                                string,
                                (r: string, p: unknown) => Promise<{ data: unknown }>
                            >
                        )[method](resource, params).then(result => ({
                            data: normalizeGlChartAccountRecord(result.data as Record<string, unknown>),
                        }));
                    }
                    if (
                        resource === 'glJournalVouchers' &&
                        (method === 'getOne' || method === 'create' || method === 'update')
                    ) {
                        return (
                            backendDataProvider as Record<
                                string,
                                (r: string, p: unknown) => Promise<{ data: unknown }>
                            >
                        )[method](resource, params).then(result => ({
                            data: normalizeGlJournalVoucherRecord(result.data as Record<string, unknown>),
                        }));
                    }
                    if (resource === 'fbrInvoices' && method === 'getOne') {
                        return backendDataProvider
                            .getOne(resource, params)
                            .then(result => ({
                                data: normalizeFbrInvoiceRecord(
                                    result.data as Record<string, unknown>
                                ),
                            }));
                    }
                    if (resource === 'fbrInvoices' && method === 'create') {
                        const data = mapFbrInvoiceToUpsertBody(params.data);
                        return backendDataProvider
                            .create(resource, { ...params, data })
                            .then(result => ({
                                data: normalizeFbrInvoiceRecord(
                                    result.data as Record<string, unknown>
                                ),
                            }));
                    }
                    if (resource === 'fbrInvoices' && method === 'update') {
                        const data = mapFbrInvoiceToUpsertBody(params.data);
                        return backendDataProvider
                            .update(resource, { ...params, data })
                            .then(result => ({
                                data: normalizeFbrInvoiceRecord(
                                    result.data as Record<string, unknown>
                                ),
                            }));
                    }
                    if (method === 'getList') {
                        return backendDataProvider
                            .getList(resource, params)
                            .then(result => sliceListToPagination(result, params.pagination));
                    }
                    return (backendDataProvider as Record<string, (r: string, p: unknown) => Promise<unknown>>)[method](
                        resource,
                        params
                    );
                }

                return dataProviderPromise.then(dataProvider =>
                    dataProvider[name.toString()](resource, params)
                );
            };
        },
    });

    return dataProviderWithGeneratedData;
};

const getDataProvider = async (type: string): Promise<DataProvider> => {
    if (type === 'graphql') {
        return import('./graphql').then(factory => factory.default());
    }
    return import('./rest').then(provider => provider.default);
};

const defaultDataProvider: DataProvider = {
    // @ts-ignore
    create: () => Promise.resolve({ data: { id: 0 } }),
    // @ts-ignore
    delete: () => Promise.resolve({ data: {} }),
    deleteMany: () => Promise.resolve({}),
    getList: () => Promise.resolve({ data: [], total: 0 }),
    getMany: () => Promise.resolve({ data: [] }),
    getManyReference: () => Promise.resolve({ data: [], total: 0 }),
    // @ts-ignore
    getOne: () => Promise.resolve({ data: {} }),
    // @ts-ignore
    update: () => Promise.resolve({ data: {} }),
    updateMany: () => Promise.resolve({}),
};
