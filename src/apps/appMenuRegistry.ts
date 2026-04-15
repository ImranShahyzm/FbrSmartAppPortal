import { APPS_REGISTRY, type AppRegistryEntry } from './appsRegistry';

export type RegisteredAppMenuEntry = {
    /** Stable key stored in GroupMenuGrant.MenuKey (workspace path + segment). */
    menuKey: string;
    /** Hierarchical label (Odoo-style path) */
    pathLabel: string;
    appId: string;
};

/** One registry row per distinct workspace URL prefix (avoids duplicate launcher ids). */
function uniqueAppsByBasePath(): AppRegistryEntry[] {
    const seen = new Set<string>();
    const out: AppRegistryEntry[] = [];
    for (const a of APPS_REGISTRY) {
        const bp = a.basePath.endsWith('/') ? a.basePath.slice(0, -1) : a.basePath;
        if (seen.has(bp)) continue;
        seen.add(bp);
        out.push(a);
    }
    return out;
}

function base(app: AppRegistryEntry): string {
    return app.basePath.endsWith('/') ? app.basePath.slice(0, -1) : app.basePath;
}

function menusForApp(app: AppRegistryEntry): RegisteredAppMenuEntry[] {
    const n = app.name;
    const id = app.id;
    const bp = base(app);

    if (id === 'fbr-smart') {
        return [
            { menuKey: `${bp}/dashboard`, pathLabel: `${n}/Dashboard`, appId: id },
            { menuKey: `${bp}/fbrInvoices`, pathLabel: `${n}/Sales/FBR Invoices`, appId: id },
            { menuKey: `${bp}/customers`, pathLabel: `${n}/Customers`, appId: id },
            { menuKey: `${bp}/productProfiles`, pathLabel: `${n}/Catalog/Product Registration`, appId: id },
            { menuKey: `${bp}/fbrSalesTaxRates`, pathLabel: `${n}/Catalog/Taxes`, appId: id },
            { menuKey: `${bp}/companies`, pathLabel: `${n}/Catalog/Company`, appId: id },
            { menuKey: `${bp}/fbrScenarios`, pathLabel: `${n}/Catalog/FBR Scenarios`, appId: id },
            { menuKey: `${bp}/categories`, pathLabel: `${n}/Catalog/Categories`, appId: id },
            { menuKey: `${bp}/reviews`, pathLabel: `${n}/Catalog/Reviews`, appId: id },
        ];
    }

    if (id === 'accounting-suite') {
        return [
            { menuKey: `${bp}/dashboard`, pathLabel: `${n}/Dashboard`, appId: id },
            { menuKey: `${bp}/customers`, pathLabel: `${n}/Customers`, appId: id },
            { menuKey: `${bp}/glJournalVouchers/create`, pathLabel: `${n}/Accounting/Journal vouchers (new)`, appId: id },
            { menuKey: `${bp}/glJournalVouchers`, pathLabel: `${n}/Accounting/Vouchers log book`, appId: id },
            { menuKey: `${bp}/bankPayments/create`, pathLabel: `${n}/Transaction/Payments/Bank payments`, appId: id },
            { menuKey: `${bp}/cashPayments/create`, pathLabel: `${n}/Transaction/Payments/Cash payments`, appId: id },
            { menuKey: `${bp}/bankReceipts/create`, pathLabel: `${n}/Transaction/Receipts/Bank receipts`, appId: id },
            { menuKey: `${bp}/cashReceipts/create`, pathLabel: `${n}/Transaction/Receipts/Cash receipts`, appId: id },
            { menuKey: `${bp}/glChartAccounts`, pathLabel: `${n}/Configuration/Chart of accounts`, appId: id },
            { menuKey: `${bp}/glVoucherTypes`, pathLabel: `${n}/Configuration/Voucher types`, appId: id },
            { menuKey: `${bp}/genBankInformation`, pathLabel: `${n}/Configuration/Bank information`, appId: id },
            { menuKey: `${bp}/genCashInformation`, pathLabel: `${n}/Configuration/Cash information`, appId: id },
        ];
    }

    if (bp === '/settings' || id === 'settings') {
        return [
            { menuKey: `${bp}/dashboard`, pathLabel: `${n}/Dashboard`, appId: id },
            { menuKey: `${bp}/users`, pathLabel: `${n}/Users & Companies/Users`, appId: id },
            { menuKey: `${bp}/securityGroups`, pathLabel: `${n}/Users & Companies/Security groups`, appId: id },
        ];
    }

    // Same workspace as Settings (`SettingsWorkspace`); menu keys must align with permission catalog + URLs.
    if (id === 'auto-dealers') {
        return [
            { menuKey: `${bp}/dashboard`, pathLabel: `${n}/Dashboard`, appId: id },
            { menuKey: `${bp}/users`, pathLabel: `${n}/Users & Companies/Users`, appId: id },
            { menuKey: `${bp}/securityGroups`, pathLabel: `${n}/Users & Companies/Security groups`, appId: id },
        ];
    }

    return [{ menuKey: `${bp}/dashboard`, pathLabel: `${n}/Dashboard`, appId: id }];
}

/** All registered launcher apps and their navigation targets (for security group menu grants). */
export function getRegisteredAppMenus(): RegisteredAppMenuEntry[] {
    const menus: RegisteredAppMenuEntry[] = [];
    for (const app of uniqueAppsByBasePath()) {
        menus.push(...menusForApp(app));
    }
    return menus;
}

export function menuLabelForKey(menuKey: string): string {
    const row = getRegisteredAppMenus().find(m => m.menuKey === menuKey);
    return row?.pathLabel ?? menuKey;
}

/**
 * Map a workspace menu path (e.g. `/fbr/customers`) to permission catalog keys.
 * First path segment after leading slash is the permissions prefix; last segment is the resource model key.
 */
export function menuKeyToAccessPair(menuKey: string): { permissionsPrefix: string; modelKey: string } | null {
    const parts = menuKey.replace(/^\//, '').split('/').filter(Boolean);
    if (parts.length < 2) return null;
    const permissionsPrefix = parts[0];
    const modelKey = parts[parts.length - 1];
    if (!permissionsPrefix || !modelKey) return null;
    return { permissionsPrefix, modelKey };
}
