import * as React from 'react';
import { Layout, useStore } from 'react-admin';
import { PendingCompanyRouteGuard } from './PendingCompanyRouteGuard';
import { SyncBrowserTitle } from './SyncBrowserTitle';
import type { ThemeName } from '../themes/themes';
import { isOdooShellTheme } from '../apps/activeAppStore';
import { NoMenu, NoSidebar } from './shellLayoutHelpers';

function EmptyAppBar() {
    return null;
}

/**
 * Odoo shell AppBar uses a wrapping Toolbar below `lg` (two rows). RA Layout's
 * default appFrame marginTop only fits a single bar row, so list toolbars
 * (e.g. FBR Invoices) slide under the fixed header on phones.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
    const [themeName, setThemeName] = useStore<ThemeName>('themeName', 'nano');
    React.useEffect(() => {
        if (themeName !== 'nano') setThemeName('nano');
    }, [themeName, setThemeName]);
    const odooShell = isOdooShellTheme(themeName);

    return (
        <Layout
            appBar={EmptyAppBar}
            menu={NoMenu}
            sidebar={NoSidebar}
            sx={theme => ({
                // @ts-ignore TS mixes up the Theme type from all the different versions of MUI in the monorepo
                backgroundColor: (theme.vars || theme).palette.background.default,
                ...(odooShell
                    ? {
                          // Shell bar is outside RA; theme still applies default appFrame offset — force flush.
                          [`& .RaLayout-appFrame`]: {
                              marginTop: '0 !important',
                          },
                          [`& .RaLayout-content`]: {
                              paddingTop: 0,
                              marginTop: 0,
                          },
                          [`& .RaLayout-main`]: {
                              paddingTop: 0,
                              marginTop: 0,
                          },
                      }
                    : {}),
            })}
        >
            <PendingCompanyRouteGuard>
                <SyncBrowserTitle />
                {children}
            </PendingCompanyRouteGuard>
        </Layout>
    );
}
