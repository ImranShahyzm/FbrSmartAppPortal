import * as React from 'react';
import { Admin, CustomRoutes, Resource } from 'react-admin';
import { Navigate, Route } from 'react-router-dom';

import authProvider from '../authProvider';
import { useResourcePermissionGate } from '../auth/useResourcePermissionGate';
import { AppNotification } from '../layout/AppNotification';
import { AccountingLayout } from '../layout/AccountingLayout';
import { createScopedReactRouterProvider } from './scopedRouterProvider';
import type { WorkspaceComponentProps } from './appsRegistry';
import { autoDealerDataProvider } from '../autodealer/colorInfo/autoDealerProvider';

import ColorInformation from '../autodealer/colorInfo/ColorInfoCreate';
import ColorInformationEdit from '../autodealer/colorInfo/ColorInfoEdit';
import ColorInformationList from '../autodealer/colorInfo/ColorInfoList';
import SalesServiceInformationEdit from '../autodealer/SalesServiceInfo/SalesServiceInfoEdit';
import SalesServiceInformationList from '../autodealer/SalesServiceInfo/SalesServiceInfoList';
import SalesServiceInformationCreate from '../autodealer/SalesServiceInfo/SalesServiceInfoCreate';
import VehicleGroupInformationList from '../autodealer/Vehicle/VehicleGroupInfoList';
import VehicleGroupInformationCreate from '../autodealer/Vehicle/VehicleGroupInfoCreate';
import VehicleGroupInformationEdit from '../autodealer/Vehicle/VehicleGroupInfoEdit';

// Placeholder for missing components so links don't break
const P = (name: string) => () => <div style={{ padding: '20px' }}>{name} Component</div>;

export function AutoDealersWorkspace(props: WorkspaceComponentProps) {
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
            dataProvider={autoDealerDataProvider}
            authProvider={authProvider}
            dashboard={undefined}
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
                    <Route path="/" element={<Navigate to={`${base}/colorInformation`} replace />} />
                </CustomRoutes>

             <Resource
    name="colorInformation"
    list={ColorInformationList}
    create={ColorInformation}       
    edit={ColorInformationEdit}    
/>
<Resource
    name="salesServiceInfo"                    // ← Changed to PascalCase
    list={SalesServiceInformationList}
    create={SalesServiceInformationCreate}       
    edit={SalesServiceInformationEdit}    
/>
<Resource
    name="vehicleGroupInfo"                    // ← Changed to PascalCase
    list={VehicleGroupInformationList}
    create={VehicleGroupInformationCreate}       
    edit={VehicleGroupInformationEdit}    
/>
                <Resource name="vehicleGroupInfo" list={P('Vehicle Group Info')} />
                <Resource name="variantInformation" list={P('Variant Info')} />
                <Resource name="bankInformation" list={P('Bank Info')} />
                <Resource name="autoDealerReports" list={P('Reports')} />
            </>
        </Admin>
    );
}

export default AutoDealersWorkspace;