import * as React from 'react';
import { useLocation } from 'react-router-dom';
import { useStore } from 'react-admin';

import { setActiveAppIdForHttpHeader } from '../api/activeAppIdHeader';
import { ACTIVE_APP_STORE_KEY } from './activeAppStore';
import { APPS_REGISTRY, DEFAULT_ACTIVE_APP_ID } from './appsRegistry';

/** Keeps launcher highlight in sync when the user navigates by URL (e.g. deep link). */
export function SyncActiveAppFromPath() {
    const { pathname } = useLocation();
    const [activeAppId, setActiveAppId] = useStore<string>(ACTIVE_APP_STORE_KEY, DEFAULT_ACTIVE_APP_ID);

    React.useLayoutEffect(() => {
        for (const app of APPS_REGISTRY) {
            if (pathname === app.basePath || pathname.startsWith(`${app.basePath}/`)) {
                setActiveAppId(app.id);
                return;
            }
        }
    }, [pathname, setActiveAppId]);

    React.useEffect(() => {
        setActiveAppIdForHttpHeader(activeAppId);
    }, [activeAppId]);

    return null;
}

export default SyncActiveAppFromPath;
