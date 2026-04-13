/** GLAccontType ids (seed): Receivable, Bank and Cash, Prepayments — default control account picker. */
export const GL_ACCOUNT_TYPE_IDS_CONTROL_DEFAULT = [8, 9, 12];

/** GLAccontType ids (seed): Income, Other Income — default income account picker. */
export const GL_ACCOUNT_TYPE_IDS_INCOME_DEFAULT = [20, 21];

/** Matches backend VoucherSystemTypeCodes */
export const VOUCHER_SYSTEM_TYPE_CHOICES = [
    { id: 0, name: 'Sales' },
    { id: 1, name: 'Purchase' },
    { id: 2, name: 'Cash' },
    { id: 3, name: 'Bank' },
    { id: 4, name: 'Credit Card' },
    { id: 5, name: 'Miscellaneous' },
] as const;

export function voucherSystemTypeLabel(id: number | undefined | null): string {
    if (id == null) return '';
    const row = VOUCHER_SYSTEM_TYPE_CHOICES.find(c => c.id === id);
    return row?.name ?? String(id);
}
