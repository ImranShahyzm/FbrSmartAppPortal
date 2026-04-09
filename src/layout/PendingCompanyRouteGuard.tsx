import * as React from 'react';
import { useGetIdentity } from 'react-admin';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * Self-registered tenants may only use the dashboard until a platform admin activates the company.
 */
export function PendingCompanyRouteGuard({ children }: { children: React.ReactNode }) {
    const { identity, isLoading } = useGetIdentity();
    const location = useLocation();
    const navigate = useNavigate();

    React.useEffect(() => {
        if (isLoading) return;
        const act =
            (identity as { companyIsActivated?: boolean } | undefined)?.companyIsActivated !== false;
        if (act) return;
        const p = location.pathname;
        if (p === '/' || p === '') return;
        navigate('/', { replace: true });
    }, [identity, isLoading, location.pathname, navigate]);

    return <>{children}</>;
}
