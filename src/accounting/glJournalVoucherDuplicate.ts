import type { NavigateFunction } from 'react-router-dom';

import type { GlJournalLineRow } from './GlJournalVoucherLinesGrid';
import type { LineEntryMode } from './glJournalVoucherTransform';

const VS_BANK = 3;
const VS_CASH = 2;
const NATURE_PAYMENT = 1;
const NATURE_RECEIPT = 0;

export type JournalDuplicateState = {
    voucherTypeId?: number;
    voucherDate?: string | Date;
    remarks: string;
    manualNo: string;
    bankCashGlAccountId?: number | null;
    chequeNo?: string;
    chequeDate?: string | Date | null;
    lineEntryMode?: LineEntryMode;
    /** From loaded voucher; used to open the matching transaction create screen (e.g. bank payment). */
    voucherSystemType?: number;
    controlAccountTxnNature?: number;
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
        bankCashGlAccountId:
            values.bankCashGlAccountId != null && values.bankCashGlAccountId !== ''
                ? Number(values.bankCashGlAccountId)
                : null,
        chequeNo: values.chequeNo != null ? String(values.chequeNo) : '',
        chequeDate: values.chequeDate as Date | string | null | undefined,
        lineEntryMode: values.lineEntryMode as LineEntryMode | undefined,
        voucherSystemType:
            values.voucherSystemType != null && values.voucherSystemType !== ''
                ? Number(values.voucherSystemType)
                : undefined,
        controlAccountTxnNature:
            values.controlAccountTxnNature != null && values.controlAccountTxnNature !== ''
                ? Number(values.controlAccountTxnNature)
                : undefined,
        lines: lines.map(l => ({
            glAccountId: l.glAccountId,
            narration: l.narration ?? '',
            dr: l.dr ?? '',
            cr: l.cr ?? '',
            fbrSalesTaxRateIds: [...(l.fbrSalesTaxRateIds ?? [])],
            partyId: l.partyId ?? null,
            ...(l.glAccountLabel != null && String(l.glAccountLabel).trim() !== ''
                ? { glAccountLabel: l.glAccountLabel }
                : {}),
        })),
    };
}

/**
 * Which CustomRoutes create screen matches this voucher (bank/cash payment vs receipt vs generic journal).
 */
function resolveDuplicateCreateResource(payload: JournalDuplicateState): string {
    if (payload.lineEntryMode === 'bank_payment_debit_only') return 'bankPayments';
    if (payload.lineEntryMode === 'cash_payment_debit_only') return 'cashPayments';
    if (payload.lineEntryMode === 'bank_receipt_credit_only') return 'bankReceipts';
    if (payload.lineEntryMode === 'cash_receipt_credit_only') return 'cashReceipts';
    const vs = Number(payload.voucherSystemType ?? 0);
    const natRaw = payload.controlAccountTxnNature;
    const nat =
        natRaw != null && Number.isFinite(Number(natRaw)) ? Number(natRaw) : NaN;
    if (vs === VS_BANK && nat === NATURE_PAYMENT) return 'bankPayments';
    if (vs === VS_CASH && nat === NATURE_PAYMENT) return 'cashPayments';
    if (vs === VS_BANK && nat === NATURE_RECEIPT) return 'bankReceipts';
    if (vs === VS_CASH && nat === NATURE_RECEIPT) return 'cashReceipts';
    return 'glJournalVouchers';
}

/**
 * Navigate to the matching scoped create route (`…/bankPayments/create`, `…/glJournalVouchers/create`, etc.)
 * with duplicate form state.
 */
export function navigateToJournalDuplicate(
    navigate: NavigateFunction,
    location: { pathname: string },
    payload: JournalDuplicateState
) {
    const resource = resolveDuplicateCreateResource(payload);
    const segments = location.pathname.split('/').filter(Boolean);
    const idx = segments.lastIndexOf('glJournalVouchers');
    const prefix = idx >= 0 ? segments.slice(0, idx).join('/') : '';
    const path =
        prefix !== '' ? `/${prefix}/${resource}/create` : `/${resource}/create`;
    navigate(path, { state: { duplicateDefaults: payload } });
}
