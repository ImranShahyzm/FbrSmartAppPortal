import * as React from 'react';
import type { DataProvider, I18nProvider, RaThemeOptions } from 'react-admin';

const FbrSmartWorkspace = React.lazy(() =>
    import('./FbrSmartWorkspace').then(m => ({ default: m.FbrSmartWorkspace }))
);
const AccountingWorkspace = React.lazy(() =>
    import('./AccountingWorkspace').then(m => ({ default: m.AccountingWorkspace }))
);
const SettingsWorkspace = React.lazy(() =>
    import('./SettingsWorkspace').then(m => ({ default: m.SettingsWorkspace }))
);

export type AppRegistryEntry = {
    id: string;
    name: string;
    /** Shown as react-admin `<Admin title>`; defaults to {@link name} when omitted. */
    adminTitle?: string;
    description?: string;
    accentColor?: string;
    disabled?: boolean;
    /** First segment of permission strings for this app (e.g. fbr, accounting, settings). */
    permissionsPrefix: string;
    /** Browser path prefix for this workspace Admin basename. */
    basePath: string;
    /**
     * Renders the workspace shell (`<Admin>` + resources as direct Fragment children).
     * Add a new app by registering here and implementing this component in its own module — no changes to `App.tsx` / `Root.tsx` routing loops.
     */
    WorkspaceComponent: React.ComponentType<WorkspaceComponentProps>;
};

export type WorkspaceComponentProps = {
    theme?: RaThemeOptions;
    lightTheme?: RaThemeOptions;
    darkTheme?: RaThemeOptions;
    i18nProvider: I18nProvider;
    dataProvider: DataProvider;
    /** The registry entry for this workspace (ids, paths, titles, permission prefix). */
    app: AppRegistryEntry;
};

export const ACCOUNTING_SUITE_APP_ID = 'accounting-suite';

export const SETTINGS_APP_ID = 'settings';

export const APPS_REGISTRY: AppRegistryEntry[] = [
    {
        id: 'fbr-smart',
        name: 'FBR Smart',
        adminTitle: 'FBR Smart Application',
        description: 'Invoicing, catalog & company setup',
        accentColor: '#00585C',
        permissionsPrefix: 'fbr',
        basePath: '/fbr',
        WorkspaceComponent: FbrSmartWorkspace,
    },
    {
        id: ACCOUNTING_SUITE_APP_ID,
        name: 'Accounting',
        adminTitle: 'Accounting',
        description: 'General ledger, configuration & reporting',
        accentColor: '#6B4FBB',
        permissionsPrefix: 'accounting',
        basePath: '/accounting',
        WorkspaceComponent: AccountingWorkspace,
    },
     {
        id: SETTINGS_APP_ID,
        name: 'Auto Dealers',
        adminTitle: 'Auto Dealers',
        description: 'Sales, Purchase of vehicles',
        accentColor: '#2E7D32',
        permissionsPrefix: 'AutoDealers',
        basePath: '/AutoDealers',
        WorkspaceComponent: SettingsWorkspace,
    },
    {
        id: SETTINGS_APP_ID,
        name: 'Settings',
        adminTitle: 'Settings',
        description: 'Security groups & access control',
        accentColor: '#2E7D32',
        permissionsPrefix: 'settings',
        basePath: '/settings',
        WorkspaceComponent: SettingsWorkspace,
    },
];

export const DEFAULT_ACTIVE_APP_ID = 'fbr-smart';

export function appRegistryEntryById(id: string): AppRegistryEntry | undefined {
    return APPS_REGISTRY.find(a => a.id === id);
}

export function workspaceRootPath(activeAppId: string): string {
    return appRegistryEntryById(activeAppId)?.basePath ?? '/fbr';
}

/** URL wins on first paint (store may still be default until SyncActiveAppFromPath runs). */
export function resolveAppIdFromPathname(pathname: string): string | null {
    for (const app of APPS_REGISTRY) {
        const base = app.basePath;
        if (pathname === base || pathname.startsWith(`${base}/`)) return app.id;
    }
    return null;
}
