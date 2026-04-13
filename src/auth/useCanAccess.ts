import { useGetIdentity, usePermissions } from 'react-admin';

import type { PermissionsPayload } from '../api/tokenStorage';
import { appRegistryEntryById } from '../apps/appsRegistry';

function resolvePrefix(appIdOrPrefix: string): string {
    const entry = appRegistryEntryById(appIdOrPrefix);
    if (entry) return entry.permissionsPrefix;
    return appIdOrPrefix;
}

/**
 * @param appIdOrPrefix Registry app id (e.g. fbr-smart) or permissions prefix (e.g. fbr)
 * @param resource Resource key matching the permission catalog (e.g. customers, glChartAccounts)
 */
export function useCanAccess(
    appIdOrPrefix: string,
    resource: string,
    action: 'read' | 'write' | 'create' | 'delete'
): boolean {
    const { identity } = useGetIdentity();
    const { permissions } = usePermissions();

    if (String((identity as { role?: string } | undefined)?.role ?? '').toLowerCase() === 'admin') {
        return true;
    }

    const payload = permissions as PermissionsPayload | undefined;
    const list = Array.isArray(payload?.permissions) ? payload.permissions : [];
    const prefix = resolvePrefix(appIdOrPrefix);
    const key = `${prefix}.${resource}.${action}`;
    return list.includes(key);
}
