import * as React from 'react';
import { Box, CircularProgress } from '@mui/material';
import { useStore } from 'react-admin';
import { useLocation } from 'react-router-dom';

import { ACTIVE_APP_STORE_KEY } from './activeAppStore';
import {
    APPS_REGISTRY,
    DEFAULT_ACTIVE_APP_ID,
    appRegistryEntryById,
    resolveAppIdFromPathname,
    type WorkspaceComponentProps,
} from './appsRegistry';

export type ActiveWorkspaceProps = Omit<WorkspaceComponentProps, 'app'>;

export function ActiveWorkspace(props: ActiveWorkspaceProps) {
    const location = useLocation();
    const [activeAppId, setActiveAppId] = useStore<string>(ACTIVE_APP_STORE_KEY, DEFAULT_ACTIVE_APP_ID);

    const fromPath = resolveAppIdFromPathname(location.pathname);
    const effectiveAppId = fromPath ?? activeAppId;

    React.useEffect(() => {
        if (!fromPath) return;
        if (fromPath === activeAppId) return;
        setActiveAppId(fromPath);
    }, [fromPath, activeAppId, setActiveAppId]);

    const app =
        appRegistryEntryById(effectiveAppId) ??
        appRegistryEntryById(DEFAULT_ACTIVE_APP_ID) ??
        APPS_REGISTRY[0];

    if (!app) return null;

    const Workspace = app.WorkspaceComponent;

    return (
        <React.Suspense
            fallback={
                <Box display="flex" justifyContent="center" alignItems="center" minHeight={240} width="100%">
                    <CircularProgress />
                </Box>
            }
        >
            <Workspace {...props} app={app} key={app.id} />
        </React.Suspense>
    );
}

export default ActiveWorkspace;
