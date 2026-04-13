import type { NavigateFunction } from 'react-router-dom';

import type { GlJournalLineRow } from './GlJournalVoucherLinesGrid';

export type JournalDuplicateState = {
    voucherTypeId?: number;
    voucherDate?: string | Date;
    remarks: string;
    manualNo: string;
    lines: GlJournalLineRow[];
};

export function buildJournalDuplicatePayload(values: Record<string, unknown>): JournalDuplicateState {
    const lines = (values.lines as GlJournalLineRow[]) ?? [];
    return {
        voucherTypeId:
            values.voucherTypeId != null && values.voucherTypeId !== ''
                ? Number(values.voucherTypeId)
                : undefined,
        voucherDate: values.voucherDate as Date | string | undefined,
        remarks: values.remarks != null ? String(values.remarks) : '',
        manualNo: values.manualNo != null ? String(values.manualNo) : '',
        lines: lines.map(l => ({
            glAccountId: l.glAccountId,
            narration: l.narration ?? '',
            dr: l.dr ?? '',
            cr: l.cr ?? '',
            fbrSalesTaxRateIds: [...(l.fbrSalesTaxRateIds ?? [])],
            partyId: l.partyId ?? null,
        })),
    };
}

/** Navigate to scoped `…/glJournalVouchers/create` with duplicate form state. */
export function navigateToJournalDuplicate(
    navigate: NavigateFunction,
    location: { pathname: string },
    payload: JournalDuplicateState
) {
    const segments = location.pathname.split('/').filter(Boolean);
    const idx = segments.lastIndexOf('glJournalVouchers');
    const base = idx >= 0 ? `/${segments.slice(0, idx + 1).join('/')}` : '/glJournalVouchers';
    navigate(`${base}/create`, { state: { duplicateDefaults: payload } });
}
