import React, { useMemo, CSSProperties, Suspense } from 'react';
import { Title, useGetList, useTranslate } from 'react-admin';
import { useMediaQuery, Theme, Skeleton, Card, CardHeader, CardContent } from '@mui/material';
import { subDays, startOfDay } from 'date-fns';
import AttachMoney from '@mui/icons-material/AttachMoney';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import BlockIcon from '@mui/icons-material/Block';

import AdminWelcome from './AdminWelcome';
import CardWithIcon from './CardWithIcon';
import type { ChartOrder } from './orderChartTypes';

const NEW_DAYS = 30;

const styles = {
    flex: { display: 'flex' },
    flexColumn: { display: 'flex', flexDirection: 'column' },
    leftCol: { flex: 1, marginRight: '0.5em' },
    singleCol: { marginTop: '1em', marginBottom: '1em' },
};

const Spacer = () => <span style={{ width: '1em' }} />;
const VerticalSpacer = () => <span style={{ height: '1em' }} />;

const OrderChart = React.lazy(() => import('./OrderChart'));

function moneyNoSymbol(v: number) {
    return (Number(v) || 0).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

type CompanyRow = {
    id: number;
    isActivated?: boolean;
    registeredAtUtc?: string;
    paymentStatus?: string;
    amount?: number | null;
};

function buildChartOrdersFromCompanies(rows: CompanyRow[]): ChartOrder[] {
    return rows.map(r => ({
        id: String(r.id),
        date: new Date(r.registeredAtUtc ?? new Date().toISOString()),
        status: 'posted',
        total: Number(r.amount) || 0,
    }));
}

export default function AdminDashboard() {
    const translate = useTranslate();
    const isXSmall = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'));
    const isSmall = useMediaQuery((theme: Theme) => theme.breakpoints.down('lg'));

    const { data: companies, isPending } = useGetList<CompanyRow>('companies', {
        pagination: { page: 1, perPage: 100_000 },
        sort: { field: 'id', order: 'ASC' },
        filter: {},
    });

    const { total, activated, deactivated, newCount, revenue, chartOrders } = useMemo(() => {
        const rows = companies ?? [];
        const now = Date.now();
        const cutoff = now - NEW_DAYS * 24 * 60 * 60 * 1000;
        let t = 0;
        let act = 0;
        let deact = 0;
        let nw = 0;
        let rev = 0;

        for (const r of rows) {
            t += 1;
            if (r.isActivated === true) act += 1;
            else deact += 1;
            const reg = r.registeredAtUtc ? new Date(r.registeredAtUtc).getTime() : 0;
            if (reg && reg >= cutoff) nw += 1;
            const ps = String(r.paymentStatus ?? '').toLowerCase();
            if (ps === 'confirmed' || ps === 'waived') rev += Number(r.amount) || 0;
        }

        let chartOrders = buildChartOrdersFromCompanies(rows);
        if (chartOrders.length === 0) {
            chartOrders = Array.from({ length: 30 }, (_, i) => {
                const d = subDays(startOfDay(new Date()), i);
                const wave = Math.sin(i / 2) * 1200 + (i % 7 === 0 ? 2500 : 0);
                return {
                    id: `dummy-${i}`,
                    date: d,
                    status: 'posted',
                    total: Math.max(0, 1800 + wave),
                } as ChartOrder;
            });
        }

        return { total: t, activated: act, deactivated: deact, newCount: nw, revenue: rev, chartOrders };
    }, [companies]);

    const revenueLabel = moneyNoSymbol(revenue);
    const monthHistoryTitle = translate('pos.dashboard.month_history', { _: 'Last month history' });

    if (isPending) {
        return (
            <>
                <Title title={translate('ra.page.dashboard', { _: 'Dashboard' })} />
                <Skeleton variant="rectangular" height={220} sx={{ m: 2, borderRadius: 1 }} />
            </>
        );
    }

    const dashboardTitle = translate('ra.page.dashboard', { _: 'Dashboard' });

    return (
        <>
            <Title title={dashboardTitle} />
            {isXSmall ? (
                <div>
                    <div style={styles.flexColumn as CSSProperties}>
                        <AdminWelcome totalCompanies={total} />
                        <CardWithIcon
                            to="/companies"
                            icon={AttachMoney}
                            title={translate('pos.dashboard.monthly_revenue', { _: 'Monthly revenue' })}
                            subtitle={revenueLabel}
                        />
                        <VerticalSpacer />
                        <CardWithIcon
                            to="/companies"
                            icon={ShoppingCartIcon}
                            title="New companies (30 days)"
                            subtitle={newCount}
                        />
                        <VerticalSpacer />
                        <CardWithIcon
                            to="/companies"
                            icon={FactCheckIcon}
                            title="Activated companies"
                            subtitle={activated}
                        />
                        <VerticalSpacer />
                        <CardWithIcon
                            to="/companies"
                            icon={BlockIcon}
                            title="Deactivated companies"
                            subtitle={deactivated}
                        />
                    </div>
                </div>
            ) : isSmall ? (
                <div style={styles.flexColumn as CSSProperties}>
                    <div style={styles.singleCol}>
                        <AdminWelcome totalCompanies={total} />
                    </div>
                    <div style={styles.flex}>
                        <CardWithIcon
                            to="/companies"
                            icon={AttachMoney}
                            title={translate('pos.dashboard.monthly_revenue', { _: 'Monthly revenue' })}
                            subtitle={revenueLabel}
                        />
                        <Spacer />
                        <CardWithIcon
                            to="/companies"
                            icon={ShoppingCartIcon}
                            title="New companies (30 days)"
                            subtitle={newCount}
                        />
                    </div>
                    <div style={styles.flex}>
                        <CardWithIcon
                            to="/companies"
                            icon={FactCheckIcon}
                            title="Activated companies"
                            subtitle={activated}
                        />
                        <Spacer />
                        <CardWithIcon
                            to="/companies"
                            icon={BlockIcon}
                            title="Deactivated companies"
                            subtitle={deactivated}
                        />
                    </div>
                    <div style={styles.singleCol}>
                        <Card>
                            <CardHeader title={monthHistoryTitle} />
                            <CardContent>
                                <Suspense fallback={<Skeleton height={300} />}>
                                    <OrderChart orders={chartOrders} />
                                </Suspense>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            ) : (
                <>
                    <AdminWelcome totalCompanies={total} />
                    <div style={styles.flex}>
                        <div style={styles.leftCol}>
                            <div style={styles.flex}>
                                <CardWithIcon
                                    to="/companies"
                                    icon={AttachMoney}
                                    title={translate('pos.dashboard.monthly_revenue', { _: 'Monthly revenue' })}
                                    subtitle={revenueLabel}
                                />
                                <Spacer />
                                <CardWithIcon
                                    to="/companies"
                                    icon={ShoppingCartIcon}
                                    title="New companies (30 days)"
                                    subtitle={newCount}
                                />
                            </div>
                            <div style={{ ...styles.flex, marginTop: '1em' }}>
                                <CardWithIcon
                                    to="/companies"
                                    icon={FactCheckIcon}
                                    title="Activated companies"
                                    subtitle={activated}
                                />
                                <Spacer />
                                <CardWithIcon
                                    to="/companies"
                                    icon={BlockIcon}
                                    title="Deactivated companies"
                                    subtitle={deactivated}
                                />
                            </div>
                            <div style={styles.singleCol}>
                                <Card>
                                    <CardHeader title={monthHistoryTitle} />
                                    <CardContent>
                                        <Suspense fallback={<Skeleton height={300} />}>
                                            <OrderChart orders={chartOrders} />
                                        </Suspense>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </>
    );
}
