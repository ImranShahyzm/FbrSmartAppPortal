import { useCanAccess } from '../auth/useCanAccess';
import { ACCOUNTING_SUITE_APP_ID } from '../apps/appsRegistry';

export type AccountingSecurableResource =
    | 'glChartAccounts'
    | 'glVoucherTypes'
    | 'glJournalVouchers'
    | 'genBankInformation'
    | 'genCashInformation'
    | 'accountingReports';

/** Flat strings e.g. accounting.glChartAccounts.read, accounting.glVoucherTypes.create */
export function useAccountingAccess(
    resource: AccountingSecurableResource,
    level: 'read' | 'write' | 'create' | 'delete'
): boolean {
    const action =
        level === 'read'
            ? 'read'
            : level === 'write'
              ? 'write'
              : level === 'create'
                ? 'create'
                : 'delete';
    return useCanAccess(ACCOUNTING_SUITE_APP_ID, resource, action);
}
