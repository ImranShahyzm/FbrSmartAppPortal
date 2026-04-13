import * as React from 'react';
import { Admin, CustomRoutes, Resource } from 'react-admin';
import { Navigate, Route } from 'react-router-dom';

import authProvider from '../authProvider';
import { useResourcePermissionGate } from '../auth/useResourcePermissionGate';
import customers from '../customers';
import { Dashboard } from '../dashboard';
import { AppNotification } from '../layout/AppNotification';
import { AccountingLayout } from '../layout/AccountingLayout';
import { ChartOfAccountsList } from '../accounting/ChartOfAccountsList';
import GlChartAccountCreate from '../accounting/GlChartAccountCreate';
import GlChartAccountEdit from '../accounting/GlChartAccountEdit';
import { GlVoucherTypeList } from '../accounting/GlVoucherTypeList';
import GlJournalVoucherCreate from '../accounting/GlJournalVoucherCreate';
import GlJournalVoucherEdit from '../accounting/GlJournalVoucherEdit';
import GlJournalVoucherList from '../accounting/GlJournalVoucherList';
import GlVoucherTypeCreate from '../accounting/GlVoucherTypeCreate';
import GlVoucherTypeEdit from '../accounting/GlVoucherTypeEdit';
import { GeneralLedgerPlaceholderPage } from '../accounting/reports/GeneralLedgerPlaceholderPage';
import { TrialBalanceReportPage } from '../accounting/reports/TrialBalanceReportPage';
import { createScopedReactRouterProvider } from './scopedRouterProvider';
import type { WorkspaceComponentProps } from './appsRegistry';

/** @deprecated Use {@link WorkspaceComponentProps} from `appsRegistry`. */
export type AccountingWorkspaceProps = WorkspaceComponentProps;

export function AccountingWorkspace(props: WorkspaceComponentProps) {
    const { app } = props;
    const routerProvider = React.useMemo(
        () => createScopedReactRouterProvider(app.basePath),
        [app.basePath]
    );
    const { showResource } = useResourcePermissionGate(app.permissionsPrefix);
    const adminTitle = app.adminTitle ?? app.name;
    const base = app.basePath.endsWith('/') ? app.basePath.slice(0, -1) : app.basePath;

    return (
        <Admin
            title={adminTitle}
            basename={app.basePath}
            routerProvider={routerProvider}
            dataProvider={props.dataProvider}
            authProvider={authProvider}
            dashboard={Dashboard}
            loginPage={false}
            layout={AccountingLayout}
            notification={AppNotification}
            i18nProvider={props.i18nProvider}
            disableTelemetry
            theme={props.theme}
            lightTheme={props.lightTheme}
            darkTheme={props.darkTheme}
            defaultTheme="light"
            requireAuth
        >
            {/* Resources must be direct Fragment children of Admin — RA does not recurse custom wrappers */}
            <>
                <CustomRoutes>
                    <Route
                        path="/journalVouchers"
                        element={<Navigate to={`${base}/glJournalVouchers/create`} replace />}
                    />
                    <Route
                        path="/vouchersLogBook"
                        element={<Navigate to={`${base}/glJournalVouchers`} replace />}
                    />
                    <Route path="/reports/trial-balance" element={<TrialBalanceReportPage />} />
                    <Route path="/reports/general-ledger" element={<GeneralLedgerPlaceholderPage />} />
                </CustomRoutes>
                {showResource('glChartAccounts') ? (
                    <Resource
                        name="glChartAccounts"
                        list={ChartOfAccountsList}
                        create={GlChartAccountCreate}
                        edit={GlChartAccountEdit}
                    />
                ) : null}
                {showResource('glVoucherTypes') ? (
                    <Resource
                        name="glVoucherTypes"
                        list={GlVoucherTypeList}
                        create={GlVoucherTypeCreate}
                        edit={GlVoucherTypeEdit}
                    />
                ) : null}
                {showResource('glJournalVouchers') ? (
                    <Resource
                        name="glJournalVouchers"
                        list={GlJournalVoucherList}
                        create={GlJournalVoucherCreate}
                        edit={GlJournalVoucherEdit}
                    />
                ) : null}
                {showResource('customers') ? <Resource name="customers" {...customers} /> : null}
            </>
        </Admin>
    );
}

export default AccountingWorkspace;
