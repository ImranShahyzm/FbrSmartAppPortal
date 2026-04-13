import * as React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useStore } from 'react-admin';

import { ACTIVE_APP_STORE_KEY } from './activeAppStore';
import { DEFAULT_ACTIVE_APP_ID } from './appsRegistry';
import { legacyWorkspacePrefixForPath } from './legacyWorkspaceRouting';

/**
 * Rewrites legacy top-level react-admin URLs to `/fbr/...`, `/accounting/...`, or `/settings/...`.
 * Shared modules follow the **active app** from the launcher unless the segment is
 * accounting-only, FBR-only, or settings-only (see `legacyWorkspaceRouting.ts`).
 */
function legacyRedirectTarget(pathname: string, activeAppId: string): string | null {
    const prefix = legacyWorkspacePrefixForPath(pathname, activeAppId);
    if (prefix == null) return null;
    return `${prefix}${pathname}`;
}

export function LegacyWorkspacePathRedirect(props: { children: React.ReactNode }) {
    const location = useLocation();
    const [activeAppId] = useStore<string>(ACTIVE_APP_STORE_KEY, DEFAULT_ACTIVE_APP_ID);
    const target = legacyRedirectTarget(location.pathname, activeAppId);
    if (target) {
        return (
            <Navigate
                to={`${target}${location.search}${location.hash}`}
                replace
            />
        );
    }
    return props.children;
}

export default LegacyWorkspacePathRedirect;
