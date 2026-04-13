import * as React from 'react';
import { Layout, type LayoutProps } from 'react-admin';

import { NoMenu, NoSidebar } from './shellLayoutHelpers';

function EmptyAppBar() {
    return null;
}

export function AccountingLayout(props: LayoutProps) {
    return (
        <Layout
            {...props}
            appBar={EmptyAppBar}
            menu={NoMenu}
            sidebar={NoSidebar}
            sx={theme => ({
                // @ts-ignore TS mixes up the Theme type from all the different versions of MUI in the monorepo
                backgroundColor: (theme.vars || theme).palette.background.default,
                // Top bar lives in AppShell; same as FBR Odoo shell — drop RA’s reserved app bar offset.
                [`& .RaLayout-appFrame`]: {
                    marginTop: '0 !important',
                },
                [`& .RaLayout-content`]: {
                    paddingTop: 0,
                    marginTop: 0,
                },
            })}
        />
    );
}

export default AccountingLayout;
