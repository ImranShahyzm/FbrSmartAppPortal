import * as React from 'react';
import { Layout, useStore } from 'react-admin';
import AppBar from './AppBar';
import Menu from './Menu';
import { PendingCompanyRouteGuard } from './PendingCompanyRouteGuard';
import { SyncBrowserTitle } from './SyncBrowserTitle';
import type { ThemeName } from '../themes/themes';
import { isOdooShellTheme } from '../apps/activeAppStore';

/**
 * Odoo shell AppBar uses a wrapping Toolbar below `md` (two rows). RA Layout's
 * default appFrame marginTop only fits a single bar row, so list toolbars
 * (e.g. FBR Invoices) slide under the fixed header on phones.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
    const [themeName] = useStore<ThemeName>('themeName', 'nano');
    const odooShell = isOdooShellTheme(themeName);

    return (
        <Layout
            appBar={AppBar}
            menu={Menu}
            sx={theme => ({
                // @ts-ignore TS mixes up the Theme type from all the different versions of MUI in the monorepo
                backgroundColor: (theme.vars || theme).palette.background.default,
                ...(odooShell
                    ? {
                          [`& .RaLayout-appFrame`]: {
                              [theme.breakpoints.down('md')]: {
                                  marginTop: theme.spacing(14),
                              },
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
