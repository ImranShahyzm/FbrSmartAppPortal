import type { GlJournalVoucherPdfProps, GlJournalVoucherPdfSignature } from './GlJournalVoucherPdf';
import { financialYearLabelUtc } from './glJournalVoucherAmountWords';
import { formatMoneyTotals, parseMoney } from './glJournalVoucherMoney';
import type { GlJournalLineRow } from './GlJournalVoucherLinesGrid';

export function chartAccountDisplayLabel(row: Record<string, unknown>): string {
    const code = String(row.glCode ?? '').trim();
    const title = String(row.glTitle ?? '').trim();
    return `${code} ${title}`.trim() || '—';
}

function splitAccountLabel(label: string | undefined): { code: string; title: string } {
    const s = (label ?? '').trim();
    if (!s) return { code: '—', title: '—' };
    const parts = s.split(/\s+/);
    const code = parts[0] ?? '—';
    const title = parts.slice(1).join(' ') || code;
    return { code, title };
}

function formatPdfDate(d: Date): string {
    const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = d.getDate();
    const m = mon[d.getMonth()] ?? '';
    return `${day}-${m}-${d.getFullYear()}`;
}

function formatPdfDateTime(d: Date): string {
    return d.toLocaleString(undefined, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
}

function statusLabelFromCode(code: string | undefined): string {
    const c = String(code ?? 'draft').toLowerCase();
    const map: Record<string, string> = {
        draft: 'DRAFT',
        approved: 'APPROVED',
        confirmed: 'CONFIRMED',
        posted: 'POSTED',
        deleted: 'VOID',
    };
    return (map[c] ?? c.toUpperCase()) || 'DRAFT';
}

type VoucherTypeRecord = {
    title?: string;
    signatureSlotCount?: number | null;
    signatureName1?: string | null;
    signatureName2?: string | null;
    signatureName3?: string | null;
    signatureName4?: string | null;
};

export function buildSignatureSlots(vt: VoucherTypeRecord | undefined): GlJournalVoucherPdfSignature[] {
    const raw = vt?.signatureSlotCount;
    const n = raw == null ? 3 : Math.min(4, Math.max(2, Number(raw)));
    const names = [
        String(vt?.signatureName1 ?? '').trim(),
        String(vt?.signatureName2 ?? '').trim(),
        String(vt?.signatureName3 ?? '').trim(),
        String(vt?.signatureName4 ?? '').trim(),
    ];
    const slots: GlJournalVoucherPdfSignature[] = [];
    for (let i = 0; i < n; i++) {
        slots.push({
            label: (names[i] || `Signature ${i + 1}`).toUpperCase(),
        });
    }
    return slots;
}

export function buildGlJournalVoucherPdfProps(input: {
    companyName: string;
    userName: string;
    voucherType: VoucherTypeRecord | undefined;
    formLines: GlJournalLineRow[];
    /** Full "code title" label per line (same as API glAccountLabel). */
    lineDisplayLabels: string[];
    voucherNo: string;
    voucherDate: Date;
    posted: boolean;
    approvalStatusCode?: string;
    postedAtUtc?: string | Date | null;
    enteredAtUtc?: string | Date | null;
}): GlJournalVoucherPdfProps {
    const vt = input.voucherType;
    const voucherTitle = String(vt?.title ?? 'Journal voucher').trim() || 'Journal voucher';
    const fy = financialYearLabelUtc(input.voucherDate);
    const printDate = new Date();
    const printDateText = formatPdfDate(printDate);

    let postDateText = '—';
    if (input.posted && input.postedAtUtc) {
        const pd = input.postedAtUtc instanceof Date ? input.postedAtUtc : new Date(input.postedAtUtc);
        if (!Number.isNaN(pd.getTime())) postDateText = formatPdfDateTime(pd);
    } else if (!input.posted) {
        postDateText = '—';
    }

    const lines = input.formLines.map((ln, i) => {
        const dr = parseMoney(ln.dr);
        const cr = parseMoney(ln.cr);
        const lbl = input.lineDisplayLabels[i];
        const { code, title } = splitAccountLabel(lbl);
        const narration = String(ln.narration ?? '').trim();
        return {
            sno: i + 1,
            code,
            accountTitle: title,
            narration,
            debit: dr > 0 ? formatMoneyTotals(dr) : '',
            credit: cr > 0 ? formatMoneyTotals(cr) : '',
        };
    });

    const td = input.formLines.reduce((s, l) => s + parseMoney(l.dr), 0);
    const tc = input.formLines.reduce((s, l) => s + parseMoney(l.cr), 0);

    const signatures = buildSignatureSlots(vt);

    return {
        companyName: input.companyName || '—',
        voucherTitle,
        financialYear: fy,
        userName: input.userName || '—',
        printDateText,
        postDateText,
        voucherNo: input.voucherNo || '—',
        voucherDateText: formatPdfDate(input.voucherDate),
        statusLabel: statusLabelFromCode(input.approvalStatusCode),
        lines,
        totalDr: td,
        totalCr: tc,
        preparedByName: (input.userName || '').trim().toUpperCase(),
        signatures,
    };
}
