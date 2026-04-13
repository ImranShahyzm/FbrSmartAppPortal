/** Keep fields the API accepts for create/update, including multi-company mapping. */
export function transformGlChartAccountPayload(data: Record<string, unknown>): Record<string, unknown> {
    const glTypeRaw = data.glType;
    const glType =
        typeof glTypeRaw === 'string' ? parseInt(glTypeRaw, 10) : Number(glTypeRaw);

    const companyIdsRaw = data.companyIds;
    const companyIds = Array.isArray(companyIdsRaw)
        ? companyIdsRaw.map(x => Number(x)).filter(n => Number.isFinite(n))
        : [];

    const mappingCodesRaw = data.mappingCodes;
    const mappingCodes: Record<string, string> = {};
    if (mappingCodesRaw && typeof mappingCodesRaw === 'object' && !Array.isArray(mappingCodesRaw)) {
        for (const [k, v] of Object.entries(mappingCodesRaw as Record<string, unknown>)) {
            if (v != null && String(v).trim() !== '') mappingCodes[k] = String(v).trim();
        }
    }

    return {
        glCode: data.glCode != null ? String(data.glCode).trim() : '',
        glTitle: data.glTitle != null ? String(data.glTitle).trim() : '',
        glType: Number.isFinite(glType) ? glType : undefined,
        allowReconciliation: Boolean(data.allowReconciliation),
        companyIds,
        mappingCodes,
    };
}

/** Normalize getOne/create/update payloads from the API for the form (companyIds, mappingCodes). */
export function normalizeGlChartAccountRecord(data: Record<string, unknown>): Record<string, unknown> {
    const companyIds = Array.isArray(data.companyIds)
        ? (data.companyIds as unknown[]).map(x => Number(x)).filter(n => Number.isFinite(n))
        : [];

    const mappingCodes: Record<string, string> = {};
    const mc = data.mappingCodes;
    if (mc && typeof mc === 'object' && !Array.isArray(mc)) {
        for (const [k, v] of Object.entries(mc as Record<string, unknown>)) {
            if (v != null && String(v).trim() !== '') mappingCodes[k] = String(v).trim();
        }
    }

    return { ...data, companyIds, mappingCodes };
}
