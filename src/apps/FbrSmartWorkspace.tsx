import * as React from 'react';
import { Admin, CustomRoutes, Resource } from 'react-admin';
import { Route } from 'react-router-dom';

import authProvider from '../authProvider';
import categories from '../categories';
import companies from '../companies';
import customers from '../customers';
import { Dashboard } from '../dashboard';
import fbrInvoices from '../orders';
import invoices from '../invoices';
import products from '../products';
import productProfiles from '../productProfiles';
import reviews from '../reviews';
import Segments from '../segments/Segments';
import { AppNotification } from '../layout/AppNotification';
import FbrLayout from '../layout/Layout';
import { useResourcePermissionGate } from '../auth/useResourcePermissionGate';
import { createScopedReactRouterProvider } from './scopedRouterProvider';
import type { WorkspaceComponentProps } from './appsRegistry';
import {
    FbrScenarioCreate,
    FbrScenarioEdit,
    FbrScenarioList,
} from '../fbrMasters/FbrScenarioAdmin';
import {
    FbrSalesTaxRateCreate,
    FbrSalesTaxRateEdit,
    FbrSalesTaxRateList,
} from '../fbrMasters/FbrSalesTaxRateAdmin';

/** @deprecated Use {@link WorkspaceComponentProps} from `appsRegistry`. */
export type FbrSmartWorkspaceProps = WorkspaceComponentProps;

export function FbrSmartWorkspace(props: WorkspaceComponentProps) {
    const { app } = props;
    const routerProvider = React.useMemo(
        () => createScopedReactRouterProvider(app.basePath),
        [app.basePath]
    );
    const { showResource } = useResourcePermissionGate(app.permissionsPrefix);
    const adminTitle = app.adminTitle ?? app.name;

    return (
        <Admin
            title={adminTitle}
            basename={app.basePath}
            routerProvider={routerProvider}
            dataProvider={props.dataProvider}
            authProvider={authProvider}
            dashboard={Dashboard}
            loginPage={false}
            layout={FbrLayout}
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
                    <Route path="/segments" element={<Segments />} />
                </CustomRoutes>
                {showResource('customers') ? <Resource name="customers" {...customers} /> : null}
                {showResource('fbrInvoices') ? <Resource name="fbrInvoices" {...fbrInvoices} /> : null}
                {showResource('invoices') ? <Resource name="invoices" {...invoices} /> : null}
                {showResource('products') ? <Resource name="products" {...products} /> : null}
                {showResource('productProfiles') ? <Resource name="productProfiles" {...productProfiles} /> : null}
                {showResource('fbrScenarios') ? (
                    <Resource
                        name="fbrScenarios"
                        list={FbrScenarioList}
                        edit={FbrScenarioEdit}
                        create={FbrScenarioCreate}
                    />
                ) : null}
                {showResource('fbrSalesTaxRates') ? (
                    <Resource
                        name="fbrSalesTaxRates"
                        options={{ label: 'Taxes' }}
                        list={FbrSalesTaxRateList}
                        edit={FbrSalesTaxRateEdit}
                        create={FbrSalesTaxRateCreate}
                    />
                ) : null}
                {showResource('companies') ? <Resource name="companies" {...companies} /> : null}
                {showResource('categories') ? <Resource name="categories" {...categories} /> : null}
                {showResource('reviews') ? <Resource name="reviews" {...reviews} /> : null}
            </>
        </Admin>
    );
}

export default FbrSmartWorkspace;
