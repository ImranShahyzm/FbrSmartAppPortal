/** Build API cheque book lines from form state; drops blank rows. */
export function mapCheckBooksToApi(data: Record<string, unknown>): Array<{
    id?: number;
    serialNoStart: number;
    serialNoEnd: number;
    isActive: boolean;
    branchId?: number | null;
}> {
    const raw = data.checkBooks;
    if (!Array.isArray(raw)) return [];
    const out: Array<{
        id?: number;
        serialNoStart: number;
        serialNoEnd: number;
        isActive: boolean;
        branchId?: number | null;
    }> = [];
    for (const item of raw) {
        const row = item as Record<string, unknown>;
        const ss = String(row.serialNoStart ?? '').trim().replace(/,/g, '');
        const se = String(row.serialNoEnd ?? '').trim().replace(/,/g, '');
        const hasId = typeof row.id === 'number' && row.id > 0;
        if (!ss && !se && !hasId) continue;
        if (!ss || !se) {
            throw new Error('Each cheque book needs both start and end serial numbers.');
        }
        const ns = Number(ss);
        const ne = Number(se);
        if (!Number.isFinite(ns) || !Number.isFinite(ne)) {
            throw new Error('Cheque serial numbers must be numeric.');
        }
        out.push({
            id: hasId ? Number(row.id) : undefined,
            serialNoStart: ns,
            serialNoEnd: ne,
            isActive: Boolean(row.isActive),
            branchId:
                row.branchId != null && Number(row.branchId) > 0 ? Number(row.branchId) : null,
        });
    }
    return out;
}
