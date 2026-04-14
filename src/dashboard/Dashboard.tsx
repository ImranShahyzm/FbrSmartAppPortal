import React, { useMemo, CSSProperties, Suspense } from 'react';
import {
    Title,
    Translate,
    useGetIdentity,
    useGetList,
    useTranslate,
} from 'react-admin';
import {
    useMediaQuery,
    Theme,
    Skeleton,
    Card,
    CardHeader,
    CardContent,
    Alert,
} from '@mui/material';
import { subDays, startOfDay } from 'date-fns';

import Welcome from './Welcome';
import MonthlyRevenue from './MonthlyRevenue';
import NbNewOrders from './NbNewOrders';
import PendingValidations from './PendingValidations';
import PendingPostings from './PendingPostings';

import { Order } from '../types';

interface State {
    nbNewOrders?: number;
    recentOrders?: Order[];
    revenue?: string;
    pendingValidations?: number;
    pendingPostings?: number;
}

const styles = {
    flex: { display: 'flex' },
    flexColumn: { display: 'flex', flexDirection: 'column' },
    leftCol: { flex: 1, marginRight: '0.5em' },
    rightCol: { flex: 1, marginLeft: '0.5em' },
    /** Vertical sections below the welcome banner (keep top margin — not used for the banner itself). */
    singleCol: { marginTop: '1em', marginBottom: '1em' },
    /** Welcome banner only: no extra top margin (AppShell provides ~4px under the navbar). */
    welcomeBannerWrap: { marginBottom: '1em' },
};

const Spacer = () => <span style={{ width: '1em' }} />;
const VerticalSpacer = () => <span style={{ height: '1em' }} />;

const OrderChart = React.lazy(() => import('./OrderChart'));

type FbrInvoiceRow = {
    id: string;
    createdAtUtc?: string;
    invoiceDate?: string;
    status?: string;
    total?: number;
};

function moneyNoSymbol(v: number) {
    return (Number(v) || 0).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

function toOrderLike(inv: FbrInvoiceRow): Order {
    return {
        id: inv.id,
        date: new Date(inv.invoiceDate ?? inv.createdAtUtc ?? new Date().toISOString()),
        status: (inv.status as any) ?? 'ordered',
        total: Number(inv.total) || 0,
        basket: [],
        customer_id: 0,
        delivery_fees: 0,
        taxes: 0,
        total_ex_taxes: 0,
        reference: '',
    } as any;
}

function buildDummyOrders(): Order[] {
    const now = startOfDay(new Date());
    return Array.from({ length: 30 }, (_, i) => {
        const d = subDays(now, i);
        const wave = Math.sin(i / 2) * 1200 + (i % 7 === 0 ? 2500 : 0);
        const total = Math.max(0, 1800 + wave);
        return {
            id: `dummy-${i}`,
            date: d,
            status: 'posted',
            total,
            basket: [],
            customer_id: 0,
            delivery_fees: 0,
            taxes: 0,
            total_ex_taxes: 0,
            reference: '',
        } as any;
    });
}

function PendingCompanyDashboard() {
    const translate = useTranslate();
    const isXSmall = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'));
    const isSmall = useMediaQuery((theme: Theme) => theme.breakpoints.down('lg'));
    const dummyOrders = useMemo(() => buildDummyOrders(), []);
    const { recentOrders, revenue, nbNewOrders, pendingValidations, pendingPostings } =
        useMemo<State>(() => {
            const dummyRevenue = dummyOrders.reduce((a, o) => a + (Number(o.total) || 0), 0);
            return {
                recentOrders: dummyOrders,
                revenue: moneyNoSymbol(dummyRevenue),
                nbNewOrders: 27,
                pendingValidations: 6,
                pendingPostings: 3,
            };
        }, [dummyOrders]);

    const dashboardTitle = translate('ra.page.dashboard', { _: 'Dashboard' });
    return (
        <>
            <Title title={dashboardTitle} />
            <Alert severity="info" sx={{ mb: 2 }}>
                Waiting for your company settings to be finalized or activation. You can use the dashboard below;
                other areas will unlock once your company is approved.
            </Alert>
            {isXSmall ? (
                <div>
                    <div style={styles.flexColumn as CSSProperties}>
                        <Welcome />
                        <MonthlyRevenue value={revenue} />
                        <VerticalSpacer />
                        <NbNewOrders value={nbNewOrders} />
                        <VerticalSpacer />
                        <PendingValidations value={pendingValidations} />
                        <VerticalSpacer />
                        <PendingPostings value={pendingPostings} />
                        <div style={styles.singleCol}>
                            <Card>
                                <CardHeader title={<Translate i18nKey="pos.dashboard.month_history" />} />
                                <CardContent>
                                    <Suspense fallback={<Skeleton height={300} />}>
                                        <OrderChart orders={recentOrders} />
                                    </Suspense>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            ) : isSmall ? (
                <div style={styles.flexColumn as CSSProperties}>
                    <div style={styles.welcomeBannerWrap}>
                        <Welcome />
                    </div>
                    <div style={styles.flex}>
                        <MonthlyRevenue value={revenue} />
                        <Spacer />
                        <NbNewOrders value={nbNewOrders} />
                    </div>
                    <div style={styles.flex}>
                        <PendingValidations value={pendingValidations} />
                        <Spacer />
                        <PendingPostings value={pendingPostings} />
                    </div>
                    <div style={styles.singleCol}>
                        <Card>
                            <CardHeader title={<Translate i18nKey="pos.dashboard.month_history" />} />
                            <CardContent>
                                <Suspense fallback={<Skeleton height={300} />}>
                                    <OrderChart orders={recentOrders} />
                                </Suspense>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            ) : (
                <>
                    <Welcome />
                    <div style={styles.flex}>
                        <div style={styles.leftCol}>
                            <div style={styles.flex}>
                                <MonthlyRevenue value={revenue} />
                                <Spacer />
                                <NbNewOrders value={nbNewOrders} />
                            </div>
                            <div style={{ ...styles.flex, marginTop: '1em' }}>
                                <PendingValidations value={pendingValidations} />
                                <Spacer />
                                <PendingPostings value={pendingPostings} />
                            </div>
                            <div style={styles.singleCol}>
                                <Card>
                                    <CardHeader title={<Translate i18nKey="pos.dashboard.month_history" />} />
                                    <CardContent>
                                        <Suspense fallback={<Skeleton height={300} />}>
                                            <OrderChart orders={recentOrders} />
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

function ActiveDashboard() {
    const translate = useTranslate();
    const isXSmall = useMediaQuery((theme: Theme) =>
        theme.breakpoints.down('sm')
    );
    const isSmall = useMediaQuery((theme: Theme) =>
        theme.breakpoints.down('lg')
    );
    const aMonthAgo = useMemo(() => subDays(startOfDay(new Date()), 30), []);

    const { data: invoices } = useGetList<FbrInvoiceRow>('fbrInvoices', {
        filter: {},
        sort: { field: 'invoiceDate', order: 'DESC' },
        pagination: { page: 1, perPage: 200 },
    });

    const aggregation = useMemo<State>(() => {
        if (!invoices) return {};
        if (invoices.length === 0) {
            // First time user: show dummy dashboard
            const dummyOrders = buildDummyOrders();
            const dummyRevenue = dummyOrders.reduce((a, o) => a + (Number(o.total) || 0), 0);
            return {
                recentOrders: dummyOrders,
                revenue: moneyNoSymbol(dummyRevenue),
                nbNewOrders: 27,
                pendingValidations: 6,
                pendingPostings: 3,
            };
        }

        const ordersLike = invoices.map(toOrderLike);
        const monthStart = aMonthAgo.getTime();

        let revenue = 0;
        let nbNew = 0;
        let pendingValidations = 0;
        let pendingPostings = 0;

        for (const inv of invoices) {
            const createdAt = new Date(inv.createdAtUtc ?? inv.invoiceDate ?? new Date().toISOString()).getTime();
            if (createdAt >= monthStart) nbNew++;

            const st = String(inv.status ?? '').toLowerCase();
            if (st === 'ordered') pendingValidations++;
            if (st === 'delivered') pendingPostings++;

            const invDate = new Date(inv.invoiceDate ?? inv.createdAtUtc ?? new Date().toISOString()).getTime();
            if (invDate >= monthStart && st !== 'cancelled') revenue += Number(inv.total) || 0;
        }

        return {
            recentOrders: ordersLike,
            revenue: moneyNoSymbol(revenue),
            nbNewOrders: nbNew,
            pendingValidations,
            pendingPostings,
        };
    }, [aMonthAgo, invoices]);

    const { nbNewOrders, revenue, recentOrders, pendingValidations, pendingPostings } = aggregation;
    const dashboardTitle = translate('ra.page.dashboard', { _: 'Dashboard' });
    return (
        <>
            <Title title={dashboardTitle} />
            {isXSmall ? (
        <div>
            <div style={styles.flexColumn as CSSProperties}>
                <Welcome />
                <MonthlyRevenue value={revenue} />
                <VerticalSpacer />
                <NbNewOrders value={nbNewOrders} />
                <VerticalSpacer />
                <PendingValidations value={pendingValidations} />
                <VerticalSpacer />
                <PendingPostings value={pendingPostings} />
                <div style={styles.singleCol}>
                    <Card>
                        <CardHeader
                            title={
                                <Translate i18nKey="pos.dashboard.month_history" />
                            }
                        />
                        <CardContent>
                            <Suspense fallback={<Skeleton height={300} />}>
                                <OrderChart orders={recentOrders} />
                            </Suspense>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
            ) : isSmall ? (
        <div style={styles.flexColumn as CSSProperties}>
            <div style={styles.welcomeBannerWrap}>
                <Welcome />
            </div>
            <div style={styles.flex}>
                <MonthlyRevenue value={revenue} />
                <Spacer />
                <NbNewOrders value={nbNewOrders} />
            </div>
            <div style={styles.flex}>
                <PendingValidations value={pendingValidations} />
                <Spacer />
                <PendingPostings value={pendingPostings} />
            </div>
            <div style={styles.singleCol}>
                <Card>
                    <CardHeader
                        title={
                            <Translate i18nKey="pos.dashboard.month_history" />
                        }
                    />
                    <CardContent>
                        <Suspense fallback={<Skeleton height={300} />}>
                            <OrderChart orders={recentOrders} />
                        </Suspense>
                    </CardContent>
                </Card>
            </div>
        </div>
            ) : (
        <>
            <Welcome />
            <div style={styles.flex}>
                <div style={styles.leftCol}>
                    <div style={styles.flex}>
                        <MonthlyRevenue value={revenue} />
                        <Spacer />
                        <NbNewOrders value={nbNewOrders} />
                    </div>
                    <div style={{ ...styles.flex, marginTop: '1em' }}>
                        <PendingValidations value={pendingValidations} />
                        <Spacer />
                        <PendingPostings value={pendingPostings} />
                    </div>
                    <div style={styles.singleCol}>
                        <Card>
                            <CardHeader
                                title={
                                    <Translate i18nKey="pos.dashboard.month_history" />
                                }
                            />
                            <CardContent>
                                <Suspense fallback={<Skeleton height={300} />}>
                                    <OrderChart orders={recentOrders} />
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

const Dashboard = () => {
    const { identity, isLoading } = useGetIdentity();
    if (isLoading) {
        return <Skeleton variant="rectangular" height={220} sx={{ m: 2, borderRadius: 1 }} />;
    }
    const pending =
        (identity as { companyIsActivated?: boolean } | undefined)?.companyIsActivated === false;
    if (pending) return <PendingCompanyDashboard />;
    return <ActiveDashboard />;
};

export default Dashboard;
