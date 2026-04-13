import * as React from 'react';
import { Admin, CustomRoutes, Resource } from 'react-admin';
import { Navigate, Route } from 'react-router-dom';

import authProvider from '../authProvider';
import { useResourcePermissionGate } from '../auth/useResourcePermissionGate';
import { AppNotification } from '../layout/AppNotification';
import { AccountingLayout } from '../layout/AccountingLayout';
import users from '../users';
import { SecurityGroupCreate } from '../settings/SecurityGroupCreate';
import { SecurityGroupEdit } from '../settings/SecurityGroupEdit';
import { SecurityGroupList } from '../settings/SecurityGroupList';
import { SettingsDashboard } from '../settings/SettingsDashboard';
import { RecordRuleFieldSettings } from '../settings/RecordRuleFieldSettings';
import { createScopedReactRouterProvider } from './scopedRouterProvider';
import type { WorkspaceComponentProps } from './appsRegistry';

/** @deprecated Use {@link WorkspaceComponentProps} from `appsRegistry`. */
export type SettingsWorkspaceProps = WorkspaceComponentProps;

export function SettingsWorkspace(props: WorkspaceComponentProps) {
    const { app } = props;
    const routerProvider = React.useMemo(
        () => createScopedReactRouterProvider(app.basePath),
        [app.basePath]
    );
    const { showResource } = useResourcePermissionGate(app.permissionsPrefix);
    const adminTitle = app.adminTitle ?? app.name;
    const securityGroupsListPath = `${app.basePath.replace(/\/$/, '')}/securityGroups`;

    return (
        <Admin
            title={adminTitle}
            basename={app.basePath}
            routerProvider={routerProvider}
            dataProvider={props.dataProvider}
            authProvider={authProvider}
            dashboard={SettingsDashboard}
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
            <>
                <CustomRoutes>
                    <Route
                        path="security_groups"
                        element={<Navigate to={securityGroupsListPath} replace />}
                    />
                    <Route
                        path="security_groups/*"
                        element={<Navigate to={securityGroupsListPath} replace />}
                    />
                    <Route path="recordRuleFieldSettings" element={<RecordRuleFieldSettings />} />
                </CustomRoutes>
                {showResource('securityGroups') ? (
                    <Resource
                        name="securityGroups"
                        list={SecurityGroupList}
                        edit={SecurityGroupEdit}
                        create={SecurityGroupCreate}
                        options={{ label: 'Security groups' }}
                    />
                ) : null}
                {showResource('users') ? (
                    <Resource name="users" {...users} options={{ label: 'Users' }} />
                ) : null}
            </>
        </Admin>
    );
}

export default SettingsWorkspace;
