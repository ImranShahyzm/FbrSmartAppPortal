/** Parse amount from user input (allows thousands separators). */
export function parseMoney(v: unknown): number {
    if (v === '' || v == null) return 0;
    const s = String(v).replace(/,/g, '').trim();
    if (s === '') return 0;
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
}

/** Display amount with grouping; empty string when zero (for optional fields). */
export function formatMoneyInput(n: number, maxFrac = 3): string {
    if (!Number.isFinite(n) || n === 0) return '';
    return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: maxFrac });
}

export function formatMoneyTotals(n: number, maxFrac = 3): string {
    if (!Number.isFinite(n)) return '0';
    return n.toLocaleString(undefined, { minimumFractionDigits: maxFrac, maximumFractionDigits: maxFrac });
}
