import * as React from 'react';
import { Navigate } from 'react-router-dom';
import { useStore } from 'react-admin';

import { getIdentityCached } from '../api/tokenStorage';
import { ACTIVE_APP_STORE_KEY } from './activeAppStore';
import { DEFAULT_ACTIVE_APP_ID, workspaceRootPath } from './appsRegistry';

export function RootRedirect() {
    const [activeAppId] = useStore<string>(ACTIVE_APP_STORE_KEY, DEFAULT_ACTIVE_APP_ID);
    const identity = getIdentityCached();
    const allowed = identity?.apps ?? [];

    if (allowed.length === 0) {
        return <Navigate replace to="/select-app" />;
    }

    if (!allowed.includes(activeAppId)) {
        return <Navigate replace to="/select-app" />;
    }

    return <Navigate replace to={workspaceRootPath(activeAppId)} />;
}

export default RootRedirect;
