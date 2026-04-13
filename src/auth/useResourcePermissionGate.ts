import { useGetIdentity, usePermissions } from 'react-admin';

import type { PermissionsPayload } from '../api/tokenStorage';

/**
 * Mount `<Resource>` while auth is still loading so React Admin registers routes (avoids welcome / 404).
 * After load, only users with `prefix.resource.read` or Admin keep access.
 */
type PendingQuery = { isPending?: boolean; isLoading?: boolean };

export function useResourcePermissionGate(appPermissionPrefix: string) {
    const permsQuery = usePermissions();
    const identityQuery = useGetIdentity();
    const permissionsPending = Boolean(
        (permsQuery as PendingQuery).isPending ?? (permsQuery as PendingQuery).isLoading
    );
    const identityPending = Boolean(
        (identityQuery as PendingQuery).isPending ?? (identityQuery as PendingQuery).isLoading
    );
    const p = permsQuery.permissions as PermissionsPayload | undefined;
    const list = Array.isArray(p?.permissions) ? p.permissions : [];
    const { identity } = identityQuery;
    const isAdmin = String((identity as { role?: string } | undefined)?.role ?? '').toLowerCase() === 'admin';
    const authSettled = !identityPending && !permissionsPending;

    const canRead = (resource: string) =>
        isAdmin || list.includes(`${appPermissionPrefix}.${resource}.read`);

    const showResource = (resource: string) => !authSettled || canRead(resource);

    return { showResource, canRead, authSettled, isAdmin };
}
