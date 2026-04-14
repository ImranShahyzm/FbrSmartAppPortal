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
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TableChartIcon from '@mui/icons-material/TableChart';
import { format } from 'date-fns';
import { pdf } from '@react-pdf/renderer';

import { apiFetch } from '../../api/httpClient';
import { ACCOUNTING_SUITE_APP_ID } from '../../apps/appsRegistry';
import { useCanAccess } from '../../auth/useCanAccess';
import type { GlAccountTypeRow } from '../glAccountTypeHierarchyMenu';

import { TrialBalancePdfDocument } from './TrialBalancePdf';

type TrialBalanceRow = {
    glCaid: number;
    glCode: string;
    glTitle: string;
    level: number;
    isParent: number;
    glNature: number;
    glLevel: number;
    glType?: number | null;
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

const EPS = 0.0005;

function formatMoney(n: number): string {
    if (!Number.isFinite(n)) return '0.00';
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Absolute amount for display (no sign). */
function formatMoneyAbs(n: number): string {
    if (!Number.isFinite(n)) return '0.00';
    return Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatBalanceDrCr(n: number): string {
    if (Math.abs(n) < EPS) return '0.00';
    const label = n < 0 ? 'Cr' : 'Dr';
    return `${formatMoneyAbs(n)}\u00a0${label}`;
}

function isRowAllZeros(r: TrialBalanceRow): boolean {
    return (
        Math.abs(r.openingBalance) < EPS &&
        Math.abs(r.periodDr) < EPS &&
        Math.abs(r.periodCr) < EPS &&
        Math.abs(r.endBalance) < EPS
    );
}

function escapeCsvField(s: string): string {
    if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
}

function downloadTextFile(content: string, filename: string, mime: string) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

const compactNumericCellSx = { py: 0.375, px: 1.25, borderColor: 'divider' } as const;
const compactAccountCellSx = { py: 0.375, px: 1.25, borderColor: 'divider' } as const;

function MoneyCell({ value }: { value: number }) {
    const isZero = Math.abs(value) < 0.0005;
    const isNeg = value < 0;
    return (
        <TableCell
            align="right"
            sx={{
                ...compactNumericCellSx,
                color: isZero ? 'text.secondary' : isNeg ? 'error.main' : 'text.primary',
            }}
        >
            {formatMoney(value)}
        </TableCell>
    );
}

/** Opening / end balance: positive → … Dr, negative → … Cr (no minus), zero → muted 0.00 */
function BalanceMoneyCell({ value }: { value: number }) {
    const isZero = Math.abs(value) < 0.0005;
    if (isZero) {
        return (
            <TableCell align="right" sx={{ ...compactNumericCellSx, fontVariantNumeric: 'tabular-nums', color: 'text.secondary' }}>
                0.00
            </TableCell>
        );
    }
    const isCredit = value < 0;
    const label = isCredit ? 'Cr' : 'Dr';
    return (
        <TableCell
            align="right"
            sx={{
                ...compactNumericCellSx,
                fontVariantNumeric: 'tabular-nums',
                color: isCredit ? 'error.main' : 'text.primary',
            }}
        >
            {`${formatMoneyAbs(value)}\u00a0${label}`}
        </TableCell>
    );
}

function QuickFilterPill({ label, active, onClick }: { label: string; active?: boolean; onClick?: () => void }) {
    return (
        <Box
            component="button"
            type="button"
            onClick={onClick}
            sx={{
                display: 'inline-flex',
                alignItems: 'center',
                px: '10px',
                py: '2px',
                height: 24,
                fontSize: 12,
                fontWeight: active ? 600 : 400,
                color: active ? '#fff' : 'text.secondary',
                bgcolor: active ? 'secondary.main' : 'transparent',
                border: '1px solid',
                borderColor: active ? 'secondary.main' : 'divider',
                borderRadius: '12px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                '&:hover': { borderColor: 'secondary.main', color: active ? '#fff' : 'secondary.main' },
            }}
        >
            {label}
        </Box>
    );
}

export function TrialBalanceReportPage() {
    const translate = useTranslate();
    const canRead = useCanAccess(ACCOUNTING_SUITE_APP_ID, 'accountingReports', 'read');

    const [from, setFrom] = React.useState(() => format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'));
    const [to, setTo] = React.useState(() => format(new Date(), 'yyyy-MM-dd'));
    const [postedOnly, setPostedOnly] = React.useState(true);
    const [hideZeroBalances, setHideZeroBalances] = React.useState(false);
    const [selectedTypeIds, setSelectedTypeIds] = React.useState<Set<string>>(() => new Set());
    const [accountTypes, setAccountTypes] = React.useState<GlAccountTypeRow[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [exporting, setExporting] = React.useState<'pdf' | 'excel' | null>(null);
    const [error, setError] = React.useState<string | null>(null);
    const [data, setData] = React.useState<TrialBalanceResponse | null>(null);

    React.useEffect(() => {
        if (!canRead) return;
        let cancel = false;
        (async () => {
            try {
                const res = await apiFetch('/api/glAccountTypes', { method: 'GET' });
                if (!res.ok || cancel) return;
                const j: unknown = await res.json();
                if (!Array.isArray(j) || cancel) return;
                const parsed: GlAccountTypeRow[] = j.map((raw: unknown) => {
                    const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
                    return {
                        id: Number(o.id) || 0,
                        title: o.title != null ? String(o.title) : null,
                        mainParent: o.mainParent != null ? Number(o.mainParent) : null,
                        orderBy: o.orderBy != null ? Number(o.orderBy) : null,
                        selectable: Boolean(o.selectable),
                    };
                });
                setAccountTypes(parsed.filter(t => t.id > 0));
            } catch {
                /* ignore */
            }
        })();
        return () => {
            cancel = true;
        };
    }, [canRead]);

    const accountTypesOrdered = React.useMemo(
        () =>
            [...accountTypes]
                .filter(t => t.selectable)
                .sort((a, b) => (Number(a.orderBy) || 0) - (Number(b.orderBy) || 0)),
        [accountTypes]
    );

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

    const toggleTypeFilter = React.useCallback((typeIdStr: string) => {
        setSelectedTypeIds(prev => {
            const n = new Set(prev);
            if (n.has(typeIdStr)) n.delete(typeIdStr);
            else n.add(typeIdStr);
            return n;
        });
    }, []);

    const clearAllTypeFilters = React.useCallback(() => {
        setSelectedTypeIds(new Set());
    }, []);

    if (!canRead) {
        return <Navigate to="/" replace />;
    }

    const periodLabel =
        from && to ? `${format(new Date(from + 'T12:00:00'), 'MMM yyyy')}` : '—';

    const rows = data?.rows ?? [];

    const displayRows = React.useMemo(() => {
        let list = rows;
        if (selectedTypeIds.size > 0) {
            const idNums = new Set(Array.from(selectedTypeIds).map(s => Number(s)).filter(x => !Number.isNaN(x)));
            list = list.filter(r => r.glType != null && idNums.has(r.glType));
        }
        if (hideZeroBalances) {
            list = list.filter(r => !isRowAllZeros(r));
        }
        return list;
    }, [rows, selectedTypeIds, hideZeroBalances]);

    const buildExportFilenameBase = React.useCallback(() => {
        const a = from.replace(/-/g, '');
        const b = to.replace(/-/g, '');
        return `TrialBalance_${a}_${b}`;
    }, [from, to]);

    const buildPdfRows = React.useCallback(() => {
        return displayRows.map(r => {
            const account = `${String(r.glCode ?? '').trim()} ${String(r.glTitle ?? '').trim()}`.trim();
            return {
                account,
                opening: formatBalanceDrCr(r.openingBalance),
                debit: formatMoney(r.periodDr),
                credit: formatMoney(r.periodCr),
                end: formatBalanceDrCr(r.endBalance),
            };
        });
    }, [displayRows]);

    const onExportExcel = React.useCallback(() => {
        const headers = [
            translate('shell.accounting.tb_col_account', { _: 'Account' }),
            translate('shell.accounting.tb_group_initial', { _: 'Opening Balance' }),
            translate('shell.accounting.tb_col_debit', { _: 'Debit' }),
            translate('shell.accounting.tb_col_credit', { _: 'Credit' }),
            translate('shell.accounting.tb_group_end', { _: 'End balance' }),
        ];
        const lines: string[] = [headers.map(escapeCsvField).join(',')];
        for (const r of displayRows) {
            const account = `${String(r.glCode ?? '').trim()} ${String(r.glTitle ?? '').trim()}`.trim();
            lines.push(
                [
                    escapeCsvField(account),
                    escapeCsvField(formatBalanceDrCr(r.openingBalance)),
                    escapeCsvField(formatMoney(r.periodDr)),
                    escapeCsvField(formatMoney(r.periodCr)),
                    escapeCsvField(formatBalanceDrCr(r.endBalance)),
                ].join(',')
            );
        }
        const csv = `\uFEFF${lines.join('\r\n')}`;
        downloadTextFile(csv, `${buildExportFilenameBase()}.csv`, 'text/csv;charset=utf-8');
    }, [buildExportFilenameBase, displayRows, translate]);

    const onExportPdf = React.useCallback(async () => {
        setExporting('pdf');
        try {
            const doc = (
                <TrialBalancePdfDocument
                    title={translate('shell.accounting.trial_balance', { _: 'Trial balance' })}
                    periodLine={`${translate('shell.accounting.tb_period_activity')}: ${periodLabel}`}
                    dateRangeLine={`${from} → ${to}`}
                    postedLine={
                        translate('shell.accounting.posted_only', { _: 'Posted entries only' }) +
                        ': ' +
                        (postedOnly ? translate('ra.boolean.true') : translate('ra.boolean.false'))
                    }
                    columnLabels={{
                        account: translate('shell.accounting.tb_col_account', { _: 'Account' }),
                        opening: translate('shell.accounting.tb_group_initial', { _: 'Opening Balance' }),
                        debit: translate('shell.accounting.tb_col_debit', { _: 'Debit' }),
                        credit: translate('shell.accounting.tb_col_credit', { _: 'Credit' }),
                        end: translate('shell.accounting.tb_group_end', { _: 'End balance' }),
                    }}
                    rows={buildPdfRows()}
                />
            );
            const blob = await pdf(doc).toBlob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${buildExportFilenameBase()}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
        } finally {
            setExporting(null);
        }
    }, [buildExportFilenameBase, buildPdfRows, from, periodLabel, postedOnly, to, translate]);

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
                    sx={{ p: 2, mb: 2, borderRadius: `${cardRadiusPx}px`, overflow: 'hidden', bgcolor: 'common.white' }}
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
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={hideZeroBalances}
                                    onChange={e => setHideZeroBalances(e.target.checked)}
                                    size="small"
                                />
                            }
                            label={translate('shell.accounting.tb_hide_zero_balances', { _: 'Hide zero balances' })}
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
                        <Button
                            variant="outlined"
                            size="small"
                            startIcon={<PictureAsPdfIcon sx={{ fontSize: 18 }} />}
                            onClick={() => void onExportPdf()}
                            disabled={loading || displayRows.length === 0 || exporting !== null}
                            sx={{ borderRadius: 2, ml: { xs: 0, sm: 'auto' } }}
                        >
                            {exporting === 'pdf'
                                ? '…'
                                : translate('shell.accounting.tb_export_pdf', { _: 'Export PDF' })}
                        </Button>
                        <Button
                            variant="outlined"
                            size="small"
                            startIcon={<TableChartIcon sx={{ fontSize: 18 }} />}
                            onClick={onExportExcel}
                            disabled={loading || displayRows.length === 0}
                            sx={{ borderRadius: 2 }}
                        >
                            {translate('shell.accounting.tb_export_excel', { _: 'Export Excel' })}
                        </Button>
                    </Box>

                    <Box
                        sx={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            alignItems: 'center',
                            gap: '6px',
                            mt: 2,
                            pt: 2,
                            borderTop: '1px solid',
                            borderColor: 'divider',
                        }}
                    >
                        <Typography variant="caption" color="text.secondary" sx={{ width: '100%', mb: 0.5 }}>
                            {translate('resources.glChartAccounts.fields.type_label', { _: 'Account type' })}
                        </Typography>
                        <QuickFilterPill
                            label={translate('shell.accounting.tb_filter_all', { _: 'All' })}
                            active={selectedTypeIds.size === 0}
                            onClick={clearAllTypeFilters}
                        />
                        {accountTypesOrdered.map(t => {
                            const idStr = String(t.id);
                            return (
                                <QuickFilterPill
                                    key={t.id}
                                    label={t.title ?? '—'}
                                    active={selectedTypeIds.has(idStr)}
                                    onClick={() => toggleTypeFilter(idStr)}
                                />
                            );
                        })}
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
                    <Paper
                        variant="outlined"
                        sx={{ borderRadius: `${cardRadiusPx}px`, overflow: 'hidden', bgcolor: 'common.white' }}
                    >
                        <TableContainer>
                            <Table size="small" stickyHeader>
                                <TableHead>
                                    <TableRow>
                                        <TableCell
                                            rowSpan={2}
                                            sx={{
                                                fontWeight: 700,
                                                bgcolor: '#f8f9fa',
                                                verticalAlign: 'bottom',
                                                py: 0.75,
                                                borderColor: 'divider',
                                            }}
                                        >
                                            {translate('shell.accounting.tb_col_account', { _: 'Account' })}
                                        </TableCell>
                                        <TableCell
                                            align="center"
                                            colSpan={1}
                                            sx={{ fontWeight: 700, bgcolor: '#f8f9fa', py: 0.75, borderColor: 'divider' }}
                                        >
                                            {translate('shell.accounting.tb_group_initial', { _: 'Opening Balance' })}
                                        </TableCell>
                                        <TableCell
                                            align="center"
                                            colSpan={2}
                                            sx={{ fontWeight: 700, bgcolor: '#f8f9fa', py: 0.75, borderColor: 'divider' }}
                                        >
                                            {periodLabel}
                                        </TableCell>
                                        <TableCell
                                            align="center"
                                            colSpan={1}
                                            sx={{ fontWeight: 700, bgcolor: '#f8f9fa', py: 0.75, borderColor: 'divider' }}
                                        >
                                            {translate('shell.accounting.tb_group_end', { _: 'End balance' })}
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell
                                            align="right"
                                            sx={{ fontWeight: 700, bgcolor: '#f8f9fa', py: 0.5, borderColor: 'divider' }}
                                        >
                                            {translate('shell.accounting.tb_col_balance', { _: 'Balance' })}
                                        </TableCell>
                                        <TableCell
                                            align="right"
                                            sx={{ fontWeight: 700, bgcolor: '#f8f9fa', py: 0.5, borderColor: 'divider' }}
                                        >
                                            {translate('shell.accounting.tb_col_debit', { _: 'Debit' })}
                                        </TableCell>
                                        <TableCell
                                            align="right"
                                            sx={{ fontWeight: 700, bgcolor: '#f8f9fa', py: 0.5, borderColor: 'divider' }}
                                        >
                                            {translate('shell.accounting.tb_col_credit', { _: 'Credit' })}
                                        </TableCell>
                                        <TableCell
                                            align="right"
                                            sx={{ fontWeight: 700, bgcolor: '#f8f9fa', py: 0.5, borderColor: 'divider' }}
                                        >
                                            {translate('shell.accounting.tb_col_balance', { _: 'Balance' })}
                                        </TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {displayRows.map(r => (
                                        <TableRow key={r.glCaid} hover>
                                            <TableCell
                                                sx={{
                                                    ...compactAccountCellSx,
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
                                            <BalanceMoneyCell value={r.openingBalance} />
                                            <MoneyCell value={r.periodDr} />
                                            <MoneyCell value={r.periodCr} />
                                            <BalanceMoneyCell value={r.endBalance} />
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
