import { formatMoneyInput, parseMoney } from './glJournalVoucherMoney';

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

/** Shape sent to POST/PUT /api/glJournalVouchers */
export function mapGlJournalVoucherToApiBody(data: Record<string, unknown>) {
    const linesRaw = data.lines as unknown[] | undefined;
    const lines = Array.isArray(linesRaw)
        ? linesRaw.map((row: unknown) => {
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
          })
        : [];

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

    return {
        voucherTypeId: Number(data.voucherTypeId) || 0,
        voucherDate: voucherDateStr,
        remarks: data.remarks != null ? String(data.remarks) : '',
        manualNo: data.manualNo != null ? String(data.manualNo) : '',
        branchId: data.branchId != null && data.branchId !== '' ? Number(data.branchId) : null,
        bankCashGlAccountId,
        lines,
    };
}

export function normalizeGlJournalVoucherRecord(row: Record<string, unknown>): Record<string, unknown> {
    const id = row.id ?? row.Id;
    const rawLines = row.lines;
    const lines = Array.isArray(rawLines)
        ? rawLines.map((ln: unknown) => {
              const l = ln && typeof ln === 'object' && !Array.isArray(ln) ? (ln as Record<string, unknown>) : {};
              const dr = Number(l.dr ?? 0);
              const cr = Number(l.cr ?? 0);
              const pid = l.partyId;
              let taxIds: number[] = [];
              if (Array.isArray(l.fbrSalesTaxRateIds)) {
                  taxIds = (l.fbrSalesTaxRateIds as unknown[]).map(x => Number(x)).filter(x => Number.isFinite(x) && x > 0);
              } else if (l.fbrSalesTaxRateId != null && Number(l.fbrSalesTaxRateId) > 0) {
                  taxIds = [Number(l.fbrSalesTaxRateId)];
              }
              return {
                  glAccountId: l.glAccountId != null ? Number(l.glAccountId) : null,
                  narration: l.narration != null ? String(l.narration) : '',
                  dr: dr === 0 ? '' : formatMoneyInput(dr),
                  cr: cr === 0 ? '' : formatMoneyInput(cr),
                  fbrSalesTaxRateIds: taxIds,
                  partyId: pid != null && pid !== '' && Number(pid) > 0 ? Number(pid) : null,
              };
          })
        : [];
    const bcRaw = row.bankCashGlAccountId ?? row.BankCashGlAccountId;
    const bankCashGlAccountId =
        bcRaw != null && bcRaw !== '' && Number(bcRaw) > 0 ? Number(bcRaw) : null;

    return {
        ...row,
        ...(id !== undefined ? { id } : {}),
        bankCashGlAccountId,
        cancelled: Boolean(row.cancelled ?? row.Cancelled),
        approvalStatusCode: String(row.approvalStatusCode ?? row.ApprovalStatusCode ?? 'draft'),
        approvalStatusId: row.approvalStatusId ?? row.ApprovalStatusId,
        approvalStatusName: row.approvalStatusName ?? row.ApprovalStatusName,
        enteredAtUtc: row.enteredAtUtc ?? row.EnteredAtUtc,
        postedAtUtc: row.postedAtUtc ?? row.PostedAtUtc,
        lines,
    };
}
