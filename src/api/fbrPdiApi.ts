import { apiFetch } from './httpClient';

export async function postCompanyFbrPdiSync(companyId: number): Promise<{
    success: boolean;
    error?: string;
    syncedAtUtc?: string;
}> {
    const res = await apiFetch(`/api/companies/${companyId}/fbr-pdi-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
    });
    const json = (await res.json()) as {
        success?: boolean;
        error?: string;
        syncedAtUtc?: string;
    };
    if (!res.ok) {
        return { success: false, error: (json as { message?: string }).message ?? res.statusText };
    }
    return {
        success: Boolean(json.success),
        error: json.error,
        syncedAtUtc: json.syncedAtUtc,
    };
}

export async function fetchFbrPdiHsUom(
    hsCode: string,
    annexureId = 3
): Promise<{ uomIds: number[] }> {
    const q = new URLSearchParams({ hsCode: hsCode.trim(), annexureId: String(annexureId) });
    const res = await apiFetch(`/api/fbrPdi/hs-uom?${q.toString()}`, { method: 'GET' });
    const json = (await res.json()) as { uomIds?: number[]; message?: string };
    if (!res.ok) {
        throw new Error(json.message ?? 'HS_UOM request failed');
    }
    return { uomIds: json.uomIds ?? [] };
}

export async function fetchFbrPdiSaleTypeRates(
    transTypeId: number,
    dateYmd?: string
): Promise<Array<{ id: number; rateId: number; rateDesc: string; rateValue: number }>> {
    const q = new URLSearchParams({ transTypeId: String(transTypeId) });
    if (dateYmd) q.set('date', dateYmd);
    const res = await apiFetch(`/api/fbrPdi/sale-type-rates?${q.toString()}`, { method: 'GET' });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { message?: string }).message ?? res.statusText);
    }
    return (await res.json()) as Array<{
        id: number;
        rateId: number;
        rateDesc: string;
        rateValue: number;
    }>;
}
