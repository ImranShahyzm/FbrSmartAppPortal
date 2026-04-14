import { SETTINGS_APP_ID, workspaceRootPath } from './appsRegistry';

/**
 * URL segments that exist only under the accounting workspace. Legacy paths like `/glChartAccounts`
 * always resolve to `/accounting/...`.
 */
export const LEGACY_ACCOUNTING_ONLY_FIRST_SEGMENTS = new Set([
    'glChartAccounts',
    'glJournalVouchers',
    'bankPayments',
    'cashPayments',
    'bankReceipts',
    'cashReceipts',
    'genBankInformation',
    'genCashInformation',
]);

/**
 * URL segments that are FBR-workspace–specific (no accounting route registered). Legacy paths always
 * resolve to `/fbr/...`.
 *
 * If you register the same resource in accounting (or another app), remove its segment from this set
 * so `/customers`-style URLs can follow the active app below.
 */
/** Top-level paths that always resolve to the Settings workspace (e.g. `/users` → `/settings/users`). */
export const LEGACY_SETTINGS_ONLY_FIRST_SEGMENTS = new Set(['users']);

export const LEGACY_FBR_ONLY_FIRST_SEGMENTS = new Set([
    'fbrInvoices',
    'invoices',
    'products',
    'productProfiles',
    'fbrScenarios',
    'fbrSalesTaxRates',
    'categories',
    'reviews',
    'segments',
]);

export function workspaceRootFromActiveAppId(activeAppId: string): string {
    return workspaceRootPath(activeAppId);
}

/**
 * For a legacy top-level path (no `/fbr` or `/accounting` prefix), returns the workspace prefix to
 * prepend, or `null` if the path is already workspace-scoped or empty.
 *
 * Segments in neither exclusive set use the **current launcher selection** so shared modules (e.g.
 * customers) can live under `/fbr/...` or `/accounting/...` depending on the active app.
 */
export function legacyWorkspacePrefixForPath(pathname: string, activeAppId: string): string | null {
    if (pathname === '/' || pathname === '') return null;
    if (pathname === '/fbr' || pathname.startsWith('/fbr/')) return null;
    if (pathname === '/accounting' || pathname.startsWith('/accounting/')) return null;
    if (pathname === '/settings' || pathname.startsWith('/settings/')) return null;

    const first = pathname.split('/').filter(Boolean)[0] ?? '';
    if (!first) return null;

    if (LEGACY_ACCOUNTING_ONLY_FIRST_SEGMENTS.has(first)) {
        return '/accounting';
    }
    if (LEGACY_FBR_ONLY_FIRST_SEGMENTS.has(first)) {
        return '/fbr';
    }

    if (LEGACY_SETTINGS_ONLY_FIRST_SEGMENTS.has(first)) {
        return workspaceRootPath(SETTINGS_APP_ID);
    }

    return workspaceRootFromActiveAppId(activeAppId);
}
