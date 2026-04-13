import * as React from 'react';
import { Routes as ReactRouterRoutes, useLocation } from 'react-router-dom';
import { reactRouterProvider } from 'ra-core';

import { stripWorkspacePathPrefix } from './workspacePathUtils';

/**
 * Every react-admin `<Routes>` (including nested resource routes) uses the provider's `Routes`.
 * RR v7 requires any overridden `location.pathname` to start with the parent route's pathnameBase
 * (e.g. `/fbr` under `<Route path="/fbr/*">`). It then strips that prefix before matching children,
 * so `/fbr` → `/` (dashboard) and `/fbr/fbrInvoices` → `/fbrInvoices` (resources).
 */
export function createScopedReactRouterProvider(workspacePathPrefix: string) {
    const ScopedRoutes = (props: React.ComponentProps<typeof ReactRouterRoutes>) => {
        const location = useLocation();
        const scopedLocation = React.useMemo(() => {
            const stripped = stripWorkspacePathPrefix(location.pathname, workspacePathPrefix);
            if (stripped == null) return location;
            const base = workspacePathPrefix.replace(/\/$/, '');
            const pathname = stripped === '/' ? base : `${base}${stripped}`;
            return { ...location, pathname };
        }, [location, workspacePathPrefix]);

        return <ReactRouterRoutes {...props} location={scopedLocation} />;
    };

    return {
        ...reactRouterProvider,
        Routes: ScopedRoutes,
    };
}

const scopedRouterProviderExports = { createScopedReactRouterProvider };
export default scopedRouterProviderExports;
