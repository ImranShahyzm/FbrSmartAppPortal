import { formatMoneyInput, parseMoney } from './glJournalVoucherMoney';

const VOUCHER_SYSTEM_TYPE_BANK = 3;
const VOUCHER_SYSTEM_TYPE_CASH = 2;
/** Payment (outflow) bank voucher types use controlAccountTxnNature === 1 in this app. */
const CONTROL_NATURE_PAYMENT = 1;
/** Receipt (inflow) vouchers use controlAccountTxnNature === 0 in this app. */
const CONTROL_NATURE_RECEIPT = 0;

export type LineEntryMode =
    | 'standard'
    | 'bank_payment_debit_only'
    | 'cash_payment_debit_only'
    | 'bank_receipt_credit_only'
    | 'cash_receipt_credit_only';

function normalizeTaxIds(raw: unknown): number[] {
    if (Array.isArray(raw)) {
        return raw.map(x => Number(x)).filter(x => Number.isFinite(x) && x > 0);
    }
    if (raw != null && raw !== '' && typeof raw === 'object' && !Array.isArray(raw)) {
        /* ignore */
    }
    const single = raw != null && raw !== '' ? Number(raw) : NaN;
    return Number.isFinite(single) && single > 0 ? [single] : [];
}

type ApiLineBody = {
    glAccountId: number;
    narration: string;
    dr: number;
    cr: number;
    fbrSalesTaxRateIds: number[];
    partyId: number | null;
};

function mapRawLinesToApi(linesRaw: unknown[] | undefined): ApiLineBody[] {
    if (!Array.isArray(linesRaw)) return [];
    return linesRaw.map((row: unknown) => {
        const r = row && typeof row === 'object' && !Array.isArray(row) ? (row as Record<string, unknown>) : {};
        const pid = r.partyId;
        const taxIds = normalizeTaxIds(r.fbrSalesTaxRateIds ?? r.fbrSalesTaxRateId);
        return {
            glAccountId: Number(r.glAccountId) || 0,
            narration: r.narration != null ? String(r.narration) : '',
            dr: parseMoney(r.dr),
            cr: parseMoney(r.cr),
            fbrSalesTaxRateIds: taxIds,
            partyId: pid != null && pid !== '' && Number(pid) > 0 ? Number(pid) : null,
        };
    });
}

function inferLineEntryMode(data: Record<string, unknown>): LineEntryMode {
    if (data.lineEntryMode === 'bank_payment_debit_only') return 'bank_payment_debit_only';
    if (data.lineEntryMode === 'cash_payment_debit_only') return 'cash_payment_debit_only';
    if (data.lineEntryMode === 'bank_receipt_credit_only') return 'bank_receipt_credit_only';
    if (data.lineEntryMode === 'cash_receipt_credit_only') return 'cash_receipt_credit_only';
    const vs = Number(data.voucherSystemType ?? (data as { VoucherSystemType?: unknown }).VoucherSystemType ?? 0);
    const natRaw = data.controlAccountTxnNature ?? (data as { ControlAccountTxnNature?: unknown }).ControlAccountTxnNature;
    const nat = natRaw != null && natRaw !== '' ? Number(natRaw) : NaN;
    if (vs === VOUCHER_SYSTEM_TYPE_BANK && nat === CONTROL_NATURE_PAYMENT) return 'bank_payment_debit_only';
    if (vs === VOUCHER_SYSTEM_TYPE_CASH && nat === CONTROL_NATURE_PAYMENT) return 'cash_payment_debit_only';
    if (vs === VOUCHER_SYSTEM_TYPE_BANK && nat === CONTROL_NATURE_RECEIPT) return 'bank_receipt_credit_only';
    if (vs === VOUCHER_SYSTEM_TYPE_CASH && nat === CONTROL_NATURE_RECEIPT) return 'cash_receipt_credit_only';
    return 'standard';
}

/** Per user debit line, append a matching credit line on the control account. */
function expandPaymentPairedCredits(lines: ApiLineBody[], bankCashGlAccountId: number, label: string): ApiLineBody[] {
    const out: ApiLineBody[] = [];
    for (const line of lines) {
        const gid = line.glAccountId;
        if (gid <= 0) continue;
        const dr = line.dr;
        const cr = line.cr;
        if (dr <= 0 && cr <= 0) continue;
        if (cr > 0 && dr > 0) {
            throw new Error('Each line must have either debit or credit, not both.');
        }
        if (cr > 0) {
            throw new Error(`${label} lines must use debit only. Remove credit amounts from detail lines.`);
        }
        if (dr > 0) {
            if (gid === bankCashGlAccountId) {
                throw new Error('Do not post debits directly to the control account; use other GL lines.');
            }
            out.push(line);
            out.push({
                glAccountId: bankCashGlAccountId,
                narration: line.narration,
                dr: 0,
                cr: dr,
                fbrSalesTaxRateIds: [],
                partyId: null,
            });
        }
    }
    return out;
}

/** Per user credit line, append a matching debit line on the control account. */
function expandReceiptPairedDebits(lines: ApiLineBody[], bankCashGlAccountId: number, label: string): ApiLineBody[] {
    const out: ApiLineBody[] = [];
    for (const line of lines) {
        const gid = line.glAccountId;
        if (gid <= 0) continue;
        const dr = line.dr;
        const cr = line.cr;
        if (dr <= 0 && cr <= 0) continue;
        if (cr > 0 && dr > 0) {
            throw new Error('Each line must have either debit or credit, not both.');
        }
        if (dr > 0) {
            throw new Error(`${label} lines must use credit only. Remove debit amounts from detail lines.`);
        }
        if (cr > 0) {
            if (gid === bankCashGlAccountId) {
                throw new Error('Do not post credits directly to the control account; use other GL lines.');
            }
            out.push(line);
            out.push({
                glAccountId: bankCashGlAccountId,
                narration: line.narration,
                dr: cr,
                cr: 0,
                fbrSalesTaxRateIds: [],
                partyId: null,
            });
        }
    }
    return out;
}

function formatDateOnly(v: unknown): string | undefined {
    if (v == null || v === '') return undefined;
    const d =
        v instanceof Date
            ? v
            : typeof v === 'string'
              ? new Date(v)
              : new Date(String(v));
    if (Number.isNaN(d.getTime())) return undefined;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Shape sent to POST/PUT /api/glJournalVouchers */
export function mapGlJournalVoucherToApiBody(data: Record<string, unknown>) {
    const mode = inferLineEntryMode(data);
    let lines = mapRawLinesToApi(data.lines as unknown[] | undefined);

    const vd = data.voucherDate;
    const d =
        vd instanceof Date
            ? vd
            : typeof vd === 'string'
              ? new Date(vd)
              : new Date();
    const voucherDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const bc = data.bankCashGlAccountId;
    const bankCashGlAccountId =
        bc != null && bc !== '' && Number(bc) > 0 ? Number(bc) : null;

    if (mode === 'bank_payment_debit_only') {
        if (bankCashGlAccountId == null) {
            throw new Error('Select a bank / cash account before saving.');
        }
        lines = expandPaymentPairedCredits(lines, bankCashGlAccountId, 'Bank payment');
    }

    if (mode === 'cash_payment_debit_only') {
        if (bankCashGlAccountId == null) {
            throw new Error('Select a bank / cash account before saving.');
        }
        lines = expandPaymentPairedCredits(lines, bankCashGlAccountId, 'Cash payment');
    }

    if (mode === 'bank_receipt_credit_only') {
        if (bankCashGlAccountId == null) {
            throw new Error('Select a bank / cash account before saving.');
        }
        lines = expandReceiptPairedDebits(lines, bankCashGlAccountId, 'Bank receipt');
    }

    if (mode === 'cash_receipt_credit_only') {
        if (bankCashGlAccountId == null) {
            throw new Error('Select a bank / cash account before saving.');
        }
        lines = expandReceiptPairedDebits(lines, bankCashGlAccountId, 'Cash receipt');
    }

    const chequeDateStr = formatDateOnly(data.chequeDate);

    return {
        voucherTypeId: Number(data.voucherTypeId) || 0,
        voucherDate: voucherDateStr,
        remarks: data.remarks != null ? String(data.remarks) : '',
        manualNo: data.manualNo != null ? String(data.manualNo) : '',
        branchId: data.branchId != null && data.branchId !== '' ? Number(data.branchId) : null,
        bankCashGlAccountId,
        chequeNo: data.chequeNo != null && String(data.chequeNo).trim() !== '' ? String(data.chequeNo).trim() : null,
        chequeDate: chequeDateStr ?? null,
        lines,
    };
}

export function isBankPaymentDebitOnlyRow(row: Record<string, unknown>): boolean {
    const vs = Number(row.voucherSystemType ?? row.VoucherSystemType ?? 0);
    const natRaw = row.controlAccountTxnNature ?? row.ControlAccountTxnNature;
    const nat = natRaw != null && natRaw !== '' ? Number(natRaw) : NaN;
    return vs === VOUCHER_SYSTEM_TYPE_BANK && nat === CONTROL_NATURE_PAYMENT;
}

export function isCashPaymentDebitOnlyRow(row: Record<string, unknown>): boolean {
    const vs = Number(row.voucherSystemType ?? row.VoucherSystemType ?? 0);
    const natRaw = row.controlAccountTxnNature ?? row.ControlAccountTxnNature;
    const nat = natRaw != null && natRaw !== '' ? Number(natRaw) : NaN;
    return vs === VOUCHER_SYSTEM_TYPE_CASH && nat === CONTROL_NATURE_PAYMENT;
}

export function isBankReceiptCreditOnlyRow(row: Record<string, unknown>): boolean {
    const vs = Number(row.voucherSystemType ?? row.VoucherSystemType ?? 0);
    const natRaw = row.controlAccountTxnNature ?? row.ControlAccountTxnNature;
    const nat = natRaw != null && natRaw !== '' ? Number(natRaw) : NaN;
    return vs === VOUCHER_SYSTEM_TYPE_BANK && nat === CONTROL_NATURE_RECEIPT;
}

export function isCashReceiptCreditOnlyRow(row: Record<string, unknown>): boolean {
    const vs = Number(row.voucherSystemType ?? row.VoucherSystemType ?? 0);
    const natRaw = row.controlAccountTxnNature ?? row.ControlAccountTxnNature;
    const nat = natRaw != null && natRaw !== '' ? Number(natRaw) : NaN;
    return vs === VOUCHER_SYSTEM_TYPE_CASH && nat === CONTROL_NATURE_RECEIPT;
}

export function normalizeGlJournalVoucherRecord(row: Record<string, unknown>): Record<string, unknown> {
    const id = row.id ?? row.Id;
    const rawLines = row.lines;
    const linesMapped = Array.isArray(rawLines)
        ? rawLines.map((ln: unknown) => {
              const l = ln && typeof ln === 'object' && !Array.isArray(ln) ? (ln as Record<string, unknown>) : {};
              const dr = Number(l.dr ?? 0);
              const cr = Number(l.cr ?? 0);
              const pid = l.partyId;
              let taxIds: number[] = [];
              if (Array.isArray(l.fbrSalesTaxRateIds)) {
                  taxIds = (l.fbrSalesTaxRateIds as unknown[])
                      .map(x => Number(x))
                      .filter(x => Number.isFinite(x) && x > 0);
              } else if (l.fbrSalesTaxRateId != null && Number(l.fbrSalesTaxRateId) > 0) {
                  taxIds = [Number(l.fbrSalesTaxRateId)];
              }
              const glAccountLabel =
                  l.glAccountLabel != null
                      ? String(l.glAccountLabel)
                      : l.glaccountlabel != null
                        ? String(l.glaccountlabel)
                        : undefined;
              return {
                  glAccountId: l.glAccountId != null ? Number(l.glAccountId) : null,
                  narration: l.narration != null ? String(l.narration) : '',
                  dr: dr === 0 ? '' : formatMoneyInput(dr),
                  cr: cr === 0 ? '' : formatMoneyInput(cr),
                  fbrSalesTaxRateIds: taxIds,
                  partyId: pid != null && pid !== '' && Number(pid) > 0 ? Number(pid) : null,
                  ...(glAccountLabel !== undefined ? { glAccountLabel } : {}),
              };
          })
        : [];

    const bcRaw = row.bankCashGlAccountId ?? row.BankCashGlAccountId;
    const bankCashGlAccountId =
        bcRaw != null && bcRaw !== '' && Number(bcRaw) > 0 ? Number(bcRaw) : null;

    const voucherSystemType = Number(row.voucherSystemType ?? row.VoucherSystemType ?? 0);
    const controlRaw = row.controlAccountTxnNature ?? row.ControlAccountTxnNature;
    const controlAccountTxnNature =
        controlRaw != null && controlRaw !== '' ? Number(controlRaw) : null;

    const chequeRaw = row.chequeDate ?? row.ChequeDate;
    let chequeDate: Date | null = null;
    if (chequeRaw != null && chequeRaw !== '') {
        const cd = chequeRaw instanceof Date ? chequeRaw : new Date(String(chequeRaw));
        if (!Number.isNaN(cd.getTime())) chequeDate = cd;
    }

    const showBankAndChequeDate = Boolean(row.showBankAndChequeDate ?? row.ShowBankAndChequeDate);

    let lines = linesMapped;
    let linesFull: typeof linesMapped | undefined;
    const inferredRow = {
        ...row,
        voucherSystemType,
        controlAccountTxnNature: controlAccountTxnNature ?? undefined,
    };
    const lineEntryMode: LineEntryMode =
        isBankPaymentDebitOnlyRow(inferredRow)
            ? 'bank_payment_debit_only'
            : isCashPaymentDebitOnlyRow(inferredRow)
              ? 'cash_payment_debit_only'
              : isBankReceiptCreditOnlyRow(inferredRow)
                ? 'bank_receipt_credit_only'
                : isCashReceiptCreditOnlyRow(inferredRow)
                  ? 'cash_receipt_credit_only'
                  : 'standard';

    const hideControlLines =
        lineEntryMode === 'bank_payment_debit_only' ||
        lineEntryMode === 'cash_payment_debit_only' ||
        lineEntryMode === 'bank_receipt_credit_only' ||
        lineEntryMode === 'cash_receipt_credit_only';

    if (hideControlLines && bankCashGlAccountId != null && linesMapped.length > 0) {
        linesFull = linesMapped;
        lines = linesMapped.filter(l => {
            const crNum = parseMoney(l.cr);
            const drNum = parseMoney(l.dr);
            const gid = Number(l.glAccountId);
            if (lineEntryMode === 'bank_payment_debit_only' || lineEntryMode === 'cash_payment_debit_only') {
                return !(crNum > 0 && gid === bankCashGlAccountId);
            }
            // receipts: hide auto debit control lines
            return !(drNum > 0 && gid === bankCashGlAccountId);
        });
    }

    return {
        ...row,
        ...(id !== undefined ? { id } : {}),
        bankCashGlAccountId,
        voucherSystemType,
        controlAccountTxnNature,
        showBankAndChequeDate,
        chequeNo: row.chequeNo != null ? String(row.chequeNo) : row.ChequeNo != null ? String(row.ChequeNo) : '',
        chequeDate,
        lineEntryMode,
        ...(linesFull ? { linesFull } : {}),
        cancelled: Boolean(row.cancelled ?? row.Cancelled),
        approvalStatusCode: String(row.approvalStatusCode ?? row.ApprovalStatusCode ?? 'draft'),
        approvalStatusId: row.approvalStatusId ?? row.ApprovalStatusId,
        approvalStatusName: row.approvalStatusName ?? row.ApprovalStatusName,
        enteredAtUtc: row.enteredAtUtc ?? row.EnteredAtUtc,
        postedAtUtc: row.postedAtUtc ?? row.PostedAtUtc,
        lines,
    };
}
