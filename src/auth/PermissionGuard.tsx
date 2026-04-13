import * as React from 'react';

import { useCanAccess } from './useCanAccess';

type Props = {
    appIdOrPrefix: string;
    resource: string;
    action: 'read' | 'write' | 'create' | 'delete';
    children: React.ReactNode;
};

/** Renders children only when the user has the flat permission string. */
export function PermissionGuard(props: Props) {
    const ok = useCanAccess(props.appIdOrPrefix, props.resource, props.action);
    if (!ok) return null;
    return <>{props.children}</>;
}
