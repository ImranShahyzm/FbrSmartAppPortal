import * as React from 'react';
import { useTranslate } from 'react-admin';
import { Navigate } from 'react-router-dom';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    FormControlLabel,
    Paper,
    Switch,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material';
import { format } from 'date-fns';

import { apiFetch } from '../../api/httpClient';
import { ACCOUNTING_SUITE_APP_ID } from '../../apps/appsRegistry';
import { useCanAccess } from '../../auth/useCanAccess';

type TrialBalanceRow = {
    glCaid: number;
    glCode: string;
    glTitle: string;
    level: number;
    isParent: number;
    glNature: number;
    glLevel: number;
    openingBalance: number;
    periodDr: number;
    periodCr: number;
    endBalance: number;
};

type TrialBalanceResponse = {
    rows: TrialBalanceRow[];
    hasUnpostedInPeriod: boolean;
    dateFrom: string;
    dateTo: string;
    postedOnly: boolean;
};

function formatMoney(n: number): string {
    if (!Number.isFinite(n)) return '0.00';
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function MoneyCell({ value }: { value: number }) {
    const isZero = Math.abs(value) < 0.0005;
    const isNeg = value < 0;
    return (
        <TableCell
            align="right"
            sx={{
                fontVariantNumeric: 'tabular-nums',
                color: isZero ? 'text.secondary' : isNeg ? 'error.main' : 'text.primary',
            }}
        >
            {formatMoney(value)}
        </TableCell>
    );
}

export function TrialBalanceReportPage() {
    const translate = useTranslate();
    const canRead = useCanAccess(ACCOUNTING_SUITE_APP_ID, 'accountingReports', 'read');

    const [from, setFrom] = React.useState(() => format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'));
    const [to, setTo] = React.useState(() => format(new Date(), 'yyyy-MM-dd'));
    const [postedOnly, setPostedOnly] = React.useState(true);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [data, setData] = React.useState<TrialBalanceResponse | null>(null);

    const load = React.useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const q = new URLSearchParams({
                dateFrom: from,
                dateTo: to,
                postedOnly: postedOnly ? 'true' : 'false',
            });
            const res = await apiFetch(`/api/accountingReports/trial-balance?${q.toString()}`, { method: 'GET' });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) {
                setError(typeof body?.message === 'string' ? body.message : `Error ${res.status}`);
                setData(null);
                return;
            }
            setData(body as TrialBalanceResponse);
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Request failed';
            setError(
                msg === 'Failed to fetch'
                    ? `${msg} — check that the API is running (e.g. localhost:5227) and that Vite can proxy /api, or set VITE_API_BASE_URL.`
                    : msg
            );
            setData(null);
        } finally {
            setLoading(false);
        }
    }, [from, to, postedOnly]);

    React.useEffect(() => {
        void load();
    }, [load]);

    if (!canRead) {
        return <Navigate to="/" replace />;
    }

    const periodLabel =
        from && to
            ? `${format(new Date(from + 'T12:00:00'), 'MMM yyyy')}`
            : '—';

    const rows = data?.rows ?? [];

    /** Rounded corners for filter card, alerts, and table (px for consistent look across themes). */
    const cardRadiusPx = 12;

    return (
        <Box
            sx={{
                width: '100%',
                minHeight: '100%',
                boxSizing: 'border-box',
                bgcolor: 'grey.100',
                py: { xs: 2, sm: 3, md: 4 },
                px: { xs: 2, sm: 4, md: 6, lg: 10, xl: 14 },
            }}
        >
            <Box
                sx={{
                    maxWidth: 1080,
                    mx: 'auto',
                }}
            >
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                {translate('shell.accounting.trial_balance')}
            </Typography>

            <Paper
                variant="outlined"
                sx={{ p: 2, mb: 2, borderRadius: `${cardRadiusPx}px`, overflow: 'hidden' }}
            >
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                            {translate('shell.accounting.date_from', { _: 'From' })}
                        </Typography>
                        <input
                            type="date"
                            value={from}
                            onChange={e => setFrom(e.target.value)}
                            style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid #ccc' }}
                        />
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                            {translate('shell.accounting.date_to', { _: 'To' })}
                        </Typography>
                        <input
                            type="date"
                            value={to}
                            onChange={e => setTo(e.target.value)}
                            style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid #ccc' }}
                        />
                    </Box>
                    <FormControlLabel
                        control={
                            <Switch
                                checked={postedOnly}
                                onChange={e => setPostedOnly(e.target.checked)}
                                size="small"
                            />
                        }
                        label={translate('shell.accounting.posted_only', { _: 'Posted entries only' })}
                    />
                    <Button
                        variant="outlined"
                        size="small"
                        onClick={() => void load()}
                        disabled={loading}
                        sx={{ borderRadius: 2 }}
                    >
                        {translate('ra.action.refresh', { _: 'Refresh' })}
                    </Button>
                </Box>
            </Paper>

            {error ? (
                <Alert severity="error" sx={{ mb: 2, borderRadius: `${cardRadiusPx}px` }}>
                    {error}
                </Alert>
            ) : null}

            {data?.hasUnpostedInPeriod ? (
                <Alert severity="info" sx={{ mb: 2, borderRadius: `${cardRadiusPx}px` }}>
                    {translate('shell.accounting.trial_balance_unposted_banner', {
                        _: 'There are unposted journal entries on or within this period.',
                    })}
                </Alert>
            ) : null}

            {loading && !data ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                    <CircularProgress size={36} />
                </Box>
            ) : (
                <Paper variant="outlined" sx={{ borderRadius: `${cardRadiusPx}px`, overflow: 'hidden' }}>
                    <TableContainer>
                        <Table size="small" stickyHeader>
                            <TableHead>
                                <TableRow>
                                    <TableCell
                                        rowSpan={2}
                                        sx={{ fontWeight: 700, bgcolor: 'grey.100', verticalAlign: 'bottom' }}
                                    >
                                        {translate('shell.accounting.tb_col_account', { _: 'Account' })}
                                    </TableCell>
                                    <TableCell align="center" colSpan={1} sx={{ fontWeight: 700, bgcolor: 'grey.100' }}>
                                        {translate('shell.accounting.tb_group_initial', { _: 'Initial balance' })}
                                    </TableCell>
                                    <TableCell align="center" colSpan={2} sx={{ fontWeight: 700, bgcolor: 'grey.100' }}>
                                        {periodLabel}
                                    </TableCell>
                                    <TableCell align="center" colSpan={1} sx={{ fontWeight: 700, bgcolor: 'grey.100' }}>
                                        {translate('shell.accounting.tb_group_end', { _: 'End balance' })}
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell align="right" sx={{ fontWeight: 700, bgcolor: 'grey.50' }}>
                                        {translate('shell.accounting.tb_col_balance', { _: 'Balance' })}
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, bgcolor: 'grey.50' }}>
                                        {translate('shell.accounting.tb_col_debit', { _: 'Debit' })}
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, bgcolor: 'grey.50' }}>
                                        {translate('shell.accounting.tb_col_credit', { _: 'Credit' })}
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, bgcolor: 'grey.50' }}>
                                        {translate('shell.accounting.tb_col_balance', { _: 'Balance' })}
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {rows.map(r => (
                                    <TableRow key={r.glCaid} hover>
                                        <TableCell
                                            sx={{
                                                pl: 1 + Math.min(r.level, 8) * 2,
                                                fontWeight: r.isParent !== 0 ? 600 : 400,
                                            }}
                                        >
                                            <Typography component="span" variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                                                {String(r.glCode ?? '').trim()}
                                            </Typography>{' '}
                                            <Typography component="span" variant="body2">
                                                {String(r.glTitle ?? '').trim()}
                                            </Typography>
                                        </TableCell>
                                        <MoneyCell value={r.openingBalance} />
                                        <MoneyCell value={r.periodDr} />
                                        <MoneyCell value={r.periodCr} />
                                        <MoneyCell value={r.endBalance} />
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            )}
            </Box>
        </Box>
    );
}
