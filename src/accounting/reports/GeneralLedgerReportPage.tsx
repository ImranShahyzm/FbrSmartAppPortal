import * as React from 'react';
import { useTranslate } from 'react-admin';
import { Navigate } from 'react-router-dom';
import {
    Alert,
    Box,
    Button,
    Checkbox,
    CircularProgress,
    Collapse,
    FormControlLabel,
    FormGroup,
    IconButton,
    InputAdornment,
    Menu,
    Paper,
    Switch,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TableChartIcon from '@mui/icons-material/TableChart';
import SearchIcon from '@mui/icons-material/Search';
import { pdf } from '@react-pdf/renderer';
import { IoOptions } from 'react-icons/io5';
import { format } from 'date-fns';

import { AccountLedgerPdfDocument } from './AccountLedgerPdf';
import { apiFetch } from '../../api/httpClient';
import { ACCOUNTING_SUITE_APP_ID } from '../../apps/appsRegistry';
import { useCanAccess } from '../../auth/useCanAccess';

// ─── Constants ───────────────────────────────────────────────────────────────

const EPS = 0.0005;
const GL_LEDGER_COLUMNS_KEY = 'glLedger.optionalColumns';

// ─── Types ───────────────────────────────────────────────────────────────────

type DatePreset = 'month' | 'quarter' | 'year' | null;
type OptionalColKey = 'scheme' | 'partner';
type OptionalCols = Record<OptionalColKey, boolean>;

type SummaryRow = {
    glCaid: number;
    glCode: string;
    glTitle: string;
    level: number;
    isParent: number;
    periodDr: number;
    periodCr: number;
    endBalance: number;
};

type SummaryResponse = {
    rows: SummaryRow[];
    hasUnpostedInPeriod: boolean;
    dateFrom: string;
    dateTo: string;
    postedOnly: boolean;
};

type LedgerLine = {
    vDetailId: number;
    vId: number;
    voucherTypeTitle: string;
    voucherNo: string;
    vDate: string;
    enteredAt?: string | null;
    narration: string;
    debit: number;
    credit: number;
    runningBalance: number;
    schemeId?: number | null;
    schemeName?: string | null;
    schemeShortCode?: string | null;
    partnerName?: string | null;
    prNumber?: string | null;
};

type LinesResponse = {
    glCaid: number;
    openingBalance: number;
    lines: LedgerLine[];
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatMoney(n: number): string {
    if (!Number.isFinite(n)) return '0.00';
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatMoneyAbs(n: number): string {
    if (!Number.isFinite(n)) return '0.00';
    return Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatBalanceDrCr(n: number): string {
    if (Math.abs(n) < EPS) return '0.00';
    const label = n < 0 ? 'Cr' : 'Dr';
    return `${formatMoneyAbs(n)}\u00a0${label}`;
}

function startOfMonth(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function thisQuarterRange(d: Date): { from: Date; to: Date } {
    const q = Math.floor(d.getMonth() / 3);
    const startM = q * 3;
    return {
        from: new Date(d.getFullYear(), startM, 1),
        to: new Date(d.getFullYear(), startM + 3, 0),
    };
}

function thisYearRange(d: Date): { from: Date; to: Date } {
    return {
        from: new Date(d.getFullYear(), 0, 1),
        to: new Date(d.getFullYear(), 11, 31),
    };
}

function loadOptionalCols(): OptionalCols {
    const defaults: OptionalCols = { scheme: false, partner: false };
    try {
        const raw = localStorage.getItem(GL_LEDGER_COLUMNS_KEY);
        if (!raw) return defaults;
        return { ...defaults, ...JSON.parse(raw) };
    } catch {
        return defaults;
    }
}

function saveOptionalCols(c: OptionalCols) {
    localStorage.setItem(GL_LEDGER_COLUMNS_KEY, JSON.stringify(c));
}

function escapeCsvField(s: string): string {
    if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
}

// ─── Style constants ──────────────────────────────────────────────────────────

/**
 * Shared dense cell style used on every TableCell so the grid stays compact.
 * All numeric cells additionally get tabular-nums for aligned columns.
 */
const cellSx = {
    py: '3px',
    px: '10px',
    fontSize: 12,
    lineHeight: 1.4,
    borderColor: 'divider',
} as const;

const headCellSx = {
    ...cellSx,
    py: '5px',
    fontSize: 11,
    fontWeight: 600,
    color: 'text.secondary',
    bgcolor: 'grey.50',
    whiteSpace: 'nowrap',
} as const;

/** Detail sub-table cell (slightly smaller, indented background) */
const detailCellSx = {
    py: '3px',
    px: '8px',
    fontSize: 11.5,
    lineHeight: 1.35,
    borderColor: 'divider',
    bgcolor: 'grey.50',
} as const;

const detailHeadCellSx = {
    ...detailCellSx,
    py: '4px',
    fontSize: 11,
    fontWeight: 600,
    color: 'text.secondary',
    bgcolor: 'grey.100',
} as const;

/** First column in detail header / line rows — aligns with transaction Type cells */
const detailCol1Sx = { ...detailCellSx, pl: 3.5 };
const detailHeadCol1Sx = { ...detailHeadCellSx, pl: 3.5 };
/** Opening balance label sits one step left of the column grid (see reference hierarchy) */
const detailOpeningLabelSx = { ...detailCellSx, pl: 2, fontWeight: 600, fontStyle: 'italic', color: 'text.secondary' };

// ─── Small reusable cells ────────────────────────────────────────────────────

function NumCell({ value, muted }: { value: number; muted?: boolean }) {
    const isZero = Math.abs(value) < EPS;
    return (
        <TableCell
            align="right"
            sx={{
                ...cellSx,
                fontVariantNumeric: 'tabular-nums',
                color: isZero && muted ? 'text.disabled' : 'text.primary',
            }}
        >
            {isZero && muted ? '—' : formatMoney(value)}
        </TableCell>
    );
}

function BalCell({ value, sx: extraSx }: { value: number; sx?: object }) {
    const isZero = Math.abs(value) < EPS;
    const isCr = value < 0;
    return (
        <TableCell
            align="right"
            sx={{
                ...cellSx,
                fontVariantNumeric: 'tabular-nums',
                color: isZero ? 'text.disabled' : isCr ? 'error.main' : 'text.primary',
                ...extraSx,
            }}
        >
            {isZero ? '0.00' : `${formatMoneyAbs(value)}\u00a0${isCr ? 'Cr' : 'Dr'}`}
        </TableCell>
    );
}

/** Numeric cell used in the detail sub-table (dashes zero values) */
function DetailNumCell({ value }: { value: number }) {
    const isZero = Math.abs(value) < EPS;
    return (
        <TableCell
            align="right"
            sx={{
                ...detailCellSx,
                fontVariantNumeric: 'tabular-nums',
                color: isZero ? 'text.disabled' : 'text.primary',
            }}
        >
            {isZero ? '—' : formatMoney(value)}
        </TableCell>
    );
}

function DetailBalCell({ value }: { value: number }) {
    const isZero = Math.abs(value) < EPS;
    const isCr = value < 0;
    return (
        <TableCell
            align="right"
            sx={{
                ...detailCellSx,
                fontVariantNumeric: 'tabular-nums',
                color: isZero ? 'text.disabled' : isCr ? 'error.main' : 'text.primary',
            }}
        >
            {isZero ? '0.00' : `${formatMoneyAbs(value)}\u00a0${isCr ? 'Cr' : 'Dr'}`}
        </TableCell>
    );
}

// ─── API helpers ──────────────────────────────────────────────────────────────

async function fetchLinesApi(
    glCaid: number,
    from: string,
    to: string,
    postedOnly: boolean
): Promise<LinesResponse> {
    const q = new URLSearchParams({
        glCaid: String(glCaid),
        dateFrom: from,
        dateTo: to,
        postedOnly: postedOnly ? 'true' : 'false',
    });
    const res = await apiFetch(`/api/accountingReports/general-ledger/lines?${q.toString()}`, { method: 'GET' });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(typeof body?.message === 'string' ? body.message : `Error ${res.status}`);
    return body as LinesResponse;
}

// ─── PDF / CSV builders ───────────────────────────────────────────────────────

function buildLedgerPdfProps(
    accountLabel: string,
    data: LinesResponse,
    from: string,
    to: string,
    postedOnly: boolean,
    t: (k: string, o?: Record<string, unknown>) => string,
    optional: { showPartner: boolean; showScheme: boolean }
) {
    const lines = data.lines.map(line => ({
        type: line.voucherTypeTitle,
        vNo: line.voucherNo,
        date: line.vDate,
        narration: line.narration,
        partner: line.partnerName ?? '—',
        scheme: line.schemeShortCode ?? line.schemeName ?? '—',
        debit: Math.abs(line.debit) < EPS ? '—' : formatMoney(line.debit),
        credit: Math.abs(line.credit) < EPS ? '—' : formatMoney(line.credit),
        balance: formatBalanceDrCr(line.runningBalance),
    }));
    return {
        title: t('shell.accounting.general_ledger'),
        accountLine: accountLabel,
        dateRangeLine: `${from} → ${to}`,
        postedLine: `${t('shell.accounting.posted_only')}: ${postedOnly ? t('ra.boolean.true') : t('ra.boolean.false')}`,
        showPartner: optional.showPartner,
        showScheme: optional.showScheme,
        columnLabels: {
            type: t('shell.accounting.gl_col_type'),
            vNo: t('shell.accounting.gl_col_v_no'),
            date: t('shell.accounting.gl_col_date'),
            narration: t('shell.accounting.gl_col_narration'),
            partner: t('shell.accounting.gl_col_partner'),
            scheme: t('shell.accounting.gl_col_scheme'),
            debit: t('shell.accounting.tb_col_debit'),
            credit: t('shell.accounting.tb_col_credit'),
            balance: t('shell.accounting.gl_col_balance_run'),
        },
        openingLabel: t('shell.accounting.gl_opening_balance'),
        openingBalance: formatBalanceDrCr(data.openingBalance),
        lines,
    };
}

function buildLedgerCsv(
    accountLabel: string,
    data: LinesResponse,
    t: (k: string, o?: Record<string, unknown>) => string,
    optional: { showPartner: boolean; showScheme: boolean }
): string {
    const headers = [
        t('shell.accounting.gl_col_type'),
        t('shell.accounting.gl_col_v_no'),
        t('shell.accounting.gl_col_date'),
        t('shell.accounting.gl_col_narration'),
        ...(optional.showPartner ? [t('shell.accounting.gl_col_partner')] : []),
        ...(optional.showScheme ? [t('shell.accounting.gl_col_scheme')] : []),
        t('shell.accounting.tb_col_debit'),
        t('shell.accounting.tb_col_credit'),
        t('shell.accounting.gl_col_balance_run'),
    ];
    const rows: string[][] = [headers.map(escapeCsvField)];
    rows.push(
        [
            t('shell.accounting.gl_opening_balance'), '', '', '',
            ...(optional.showPartner ? [''] : []),
            ...(optional.showScheme ? [''] : []),
            '', '',
            formatBalanceDrCr(data.openingBalance),
        ].map(escapeCsvField)
    );
    for (const line of data.lines) {
        rows.push(
            [
                line.voucherTypeTitle,
                line.voucherNo,
                line.vDate,
                line.narration,
                ...(optional.showPartner ? [line.partnerName ?? ''] : []),
                ...(optional.showScheme ? [line.schemeShortCode ?? line.schemeName ?? ''] : []),
                Math.abs(line.debit) < EPS ? '' : formatMoney(line.debit),
                Math.abs(line.credit) < EPS ? '' : formatMoney(line.credit),
                formatBalanceDrCr(line.runningBalance),
            ].map(escapeCsvField)
        );
    }
    return `\uFEFF${accountLabel}\r\n${rows.map(r => r.join(',')).join('\r\n')}`;
}

// ─── Detail sub-table ─────────────────────────────────────────────────────────

interface LedgerDetailTableProps {
    data: LinesResponse;
    optionalPartner: boolean;
    optionalScheme: boolean;
    translate: (k: string, o?: Record<string, unknown>) => string;
}

function LedgerDetailTable({ data, optionalPartner, optionalScheme, translate }: LedgerDetailTableProps) {
    /** How many leading columns before the Dr/Cr/Bal trio */
    const leadingColCount = 4 + (optionalPartner ? 1 : 0) + (optionalScheme ? 1 : 0);

    return (
        <Box>
            <Table
                size="small"
                sx={{
                    bgcolor: 'grey.50',
                    '& .MuiTableCell-root': { borderColor: 'divider' },
                }}
            >
                {/* ── Detail header ── */}
                <TableHead>
                    <TableRow>
                        <TableCell sx={detailHeadCol1Sx}>{translate('shell.accounting.gl_col_type')}</TableCell>
                        <TableCell sx={detailHeadCellSx}>{translate('shell.accounting.gl_col_v_no')}</TableCell>
                        <TableCell sx={detailHeadCellSx}>{translate('shell.accounting.gl_col_date')}</TableCell>
                        <TableCell sx={detailHeadCellSx}>{translate('shell.accounting.gl_col_narration')}</TableCell>
                        {optionalPartner && (
                            <TableCell sx={detailHeadCellSx}>{translate('shell.accounting.gl_col_partner')}</TableCell>
                        )}
                        {optionalScheme && (
                            <TableCell sx={detailHeadCellSx}>{translate('shell.accounting.gl_col_scheme')}</TableCell>
                        )}
                        <TableCell align="right" sx={detailHeadCellSx}>{translate('shell.accounting.tb_col_debit')}</TableCell>
                        <TableCell align="right" sx={detailHeadCellSx}>{translate('shell.accounting.tb_col_credit')}</TableCell>
                        <TableCell align="right" sx={detailHeadCellSx}>{translate('shell.accounting.gl_col_balance_run')}</TableCell>
                    </TableRow>
                </TableHead>

                <TableBody>
                    {/* ── Opening balance row ── */}
                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                        <TableCell colSpan={leadingColCount} sx={detailOpeningLabelSx}>
                            {translate('shell.accounting.gl_opening_balance')}
                        </TableCell>
                        <TableCell align="right" sx={{ ...detailCellSx, color: 'text.disabled' }}>—</TableCell>
                        <TableCell align="right" sx={{ ...detailCellSx, color: 'text.disabled' }}>—</TableCell>
                        <DetailBalCell value={data.openingBalance} />
                    </TableRow>

                    {/* ── Journal lines ── */}
                    {data.lines.map(line => (
                        <TableRow
                            key={line.vDetailId}
                            hover
                            sx={{ '&:last-child td': { borderBottom: 'none' } }}
                        >
                            <TableCell sx={detailCol1Sx}>{line.voucherTypeTitle}</TableCell>
                            <TableCell sx={{ ...detailCellSx, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                                {line.voucherNo}
                            </TableCell>
                            <TableCell sx={{ ...detailCellSx, whiteSpace: 'nowrap' }}>{line.vDate}</TableCell>
                            <TableCell
                                sx={{
                                    ...detailCellSx,
                                    maxWidth: 220,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}
                                title={line.narration}
                            >
                                {line.narration}
                            </TableCell>
                            {optionalPartner && (
                                <TableCell sx={{ ...detailCellSx, color: 'text.secondary' }}>
                                    {line.partnerName ?? '—'}
                                </TableCell>
                            )}
                            {optionalScheme && (
                                <TableCell sx={{ ...detailCellSx, color: 'text.secondary' }}>
                                    {line.schemeShortCode ?? line.schemeName ?? '—'}
                                </TableCell>
                            )}
                            <DetailNumCell value={line.debit} />
                            <DetailNumCell value={line.credit} />
                            <DetailBalCell value={line.runningBalance} />
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </Box>
    );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function GeneralLedgerReportPage() {
    const translate = useTranslate();
    const canRead = useCanAccess(ACCOUNTING_SUITE_APP_ID, 'accountingReports', 'read');

    // ── Date range state ──
    const [datePreset, setDatePreset] = React.useState<DatePreset>('month');
    const [from, setFrom] = React.useState(() => format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    const [to, setTo] = React.useState(() => format(endOfMonth(new Date()), 'yyyy-MM-dd'));

    // ── Filter state ──
    const [postedOnly, setPostedOnly] = React.useState(true);
    const [includeZeroClosing, setIncludeZeroClosing] = React.useState(false);
    const [accountSearch, setAccountSearch] = React.useState('');

    // ── Summary data ──
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [summary, setSummary] = React.useState<SummaryResponse | null>(null);

    // ── Expand / detail state ──
    const [expanded, setExpanded] = React.useState<Set<number>>(() => new Set());
    const [linesByKey, setLinesByKey] = React.useState<Map<string, LinesResponse>>(() => new Map());
    const linesByKeyRef = React.useRef(linesByKey);
    React.useEffect(() => { linesByKeyRef.current = linesByKey; }, [linesByKey]);
    const [linesLoading, setLinesLoading] = React.useState<Set<number>>(() => new Set());
    const [linesError, setLinesError] = React.useState<Map<number, string>>(() => new Map());

    // ── Optional columns ──
    const [optionalCols, setOptionalCols] = React.useState<OptionalCols>(loadOptionalCols);
    const [colMenuAnchor, setColMenuAnchor] = React.useState<null | HTMLElement>(null);

    // ── Export state ──
    const [exporting, setExporting] = React.useState<'pdf' | 'excel' | null>(null);

    // ── Date preset handler ──
    const applyPreset = React.useCallback((p: Exclude<DatePreset, null>) => {
        setDatePreset(p);
        const now = new Date();
        if (p === 'month') {
            setFrom(format(startOfMonth(now), 'yyyy-MM-dd'));
            setTo(format(endOfMonth(now), 'yyyy-MM-dd'));
        } else if (p === 'quarter') {
            const { from: f, to: t } = thisQuarterRange(now);
            setFrom(format(f, 'yyyy-MM-dd'));
            setTo(format(t, 'yyyy-MM-dd'));
        } else {
            const { from: f, to: t } = thisYearRange(now);
            setFrom(format(f, 'yyyy-MM-dd'));
            setTo(format(t, 'yyyy-MM-dd'));
        }
    }, []);

    // ── Load summary ──
    const loadSummary = React.useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const q = new URLSearchParams({
                dateFrom: from,
                dateTo: to,
                postedOnly: postedOnly ? 'true' : 'false',
                nonZeroClosingOnly: includeZeroClosing ? 'false' : 'true',
            });
            const res = await apiFetch(
                `/api/accountingReports/general-ledger/summary?${q.toString()}`,
                { method: 'GET' }
            );
            const body = await res.json().catch(() => ({}));
            if (!res.ok) {
                setError(typeof body?.message === 'string' ? body.message : `Error ${res.status}`);
                setSummary(null);
                return;
            }
            setSummary(body as SummaryResponse);
            setExpanded(new Set());
            setLinesByKey(new Map());
            setLinesError(new Map());
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Request failed';
            setError(
                msg === 'Failed to fetch'
                    ? `${msg} — check that the API is running and Vite can proxy /api.`
                    : msg
            );
            setSummary(null);
        } finally {
            setLoading(false);
        }
    }, [from, to, postedOnly, includeZeroClosing]);

    React.useEffect(() => { void loadSummary(); }, [loadSummary]);

    // ── Cache key for lines ──
    const linesCacheKey = React.useCallback(
        (glCaid: number) => `${glCaid}|${from}|${to}|${postedOnly ? '1' : '0'}`,
        [from, to, postedOnly]
    );

    // ── Fetch lines for a single account ──
    const fetchLines = React.useCallback(async (glCaid: number) => {
        const key = linesCacheKey(glCaid);
        if (linesByKeyRef.current.has(key)) return;
        setLinesLoading(s => new Set(s).add(glCaid));
        setLinesError(m => { const n = new Map(m); n.delete(glCaid); return n; });
        try {
            const q = new URLSearchParams({
                glCaid: String(glCaid),
                dateFrom: from,
                dateTo: to,
                postedOnly: postedOnly ? 'true' : 'false',
            });
            const res = await apiFetch(
                `/api/accountingReports/general-ledger/lines?${q.toString()}`,
                { method: 'GET' }
            );
            const body = await res.json().catch(() => ({}));
            if (!res.ok) {
                setLinesError(m => new Map(m).set(glCaid, typeof body?.message === 'string' ? body.message : `Error ${res.status}`));
                return;
            }
            setLinesByKey(m => new Map(m).set(key, body as LinesResponse));
        } catch (e) {
            setLinesError(m => new Map(m).set(glCaid, e instanceof Error ? e.message : 'Request failed'));
        } finally {
            setLinesLoading(s => { const n = new Set(s); n.delete(glCaid); return n; });
        }
    }, [from, to, postedOnly, linesCacheKey]);

    // ── Toggle expand / collapse ──
    const toggleExpand = React.useCallback(async (glCaid: number) => {
        if (expanded.has(glCaid)) {
            setExpanded(prev => { const n = new Set(prev); n.delete(glCaid); return n; });
            return;
        }
        await fetchLines(glCaid);
        setExpanded(prev => new Set(prev).add(glCaid));
    }, [expanded, fetchLines]);

    // ── Optional column toggles ──
    const toggleOptional = (key: OptionalColKey) => {
        setOptionalCols(prev => {
            const next = { ...prev, [key]: !prev[key] };
            saveOptionalCols(next);
            return next;
        });
    };

    // ── Export single account ──
    const exportAccountLedger = React.useCallback(
        async (r: SummaryRow, mode: 'pdf' | 'excel') => {
            const key = linesCacheKey(r.glCaid);
            let data = linesByKey.get(key);
            if (!data) {
                try {
                    data = await fetchLinesApi(r.glCaid, from, to, postedOnly);
                    setLinesByKey(m => new Map(m).set(key, data!));
                } catch (e) {
                    window.alert(e instanceof Error ? e.message : 'Failed to load lines');
                    return;
                }
            }
            const label = `${String(r.glCode ?? '').trim()} ${String(r.glTitle ?? '').trim()}`.trim();
            const safe = `${from.replace(/-/g, '')}_${to.replace(/-/g, '')}_${r.glCaid}`;
            const exportOptional = { showPartner: optionalCols.partner, showScheme: optionalCols.scheme };

            if (mode === 'excel') {
                const csv = buildLedgerCsv(label, data, translate, exportOptional);
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `AccountLedger_${safe}.csv`;
                a.click();
                URL.revokeObjectURL(url);
                return;
            }

            setExporting('pdf');
            try {
                const props = buildLedgerPdfProps(label, data, from, to, postedOnly, translate, exportOptional);
                const blob = await pdf(<AccountLedgerPdfDocument {...props} />).toBlob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `AccountLedger_${safe}.pdf`;
                a.click();
                URL.revokeObjectURL(url);
            } finally {
                setExporting(null);
            }
        },
        [from, to, postedOnly, linesByKey, linesCacheKey, translate, optionalCols.partner, optionalCols.scheme]
    );

    if (!canRead) return <Navigate to="/" replace />;

    // ── Derived data ──
    const rows = summary?.rows ?? [];
    const filteredRows = React.useMemo(() => {
        const q = accountSearch.trim().toLowerCase();
        if (!q) return rows;
        return rows.filter(r =>
            `${String(r.glCode ?? '').trim()} ${String(r.glTitle ?? '').trim()}`.toLowerCase().includes(q)
        );
    }, [rows, accountSearch]);

    const singleFilteredAccount = filteredRows.length === 1 ? filteredRows[0] : null;

    // ── Render ──
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
            <Box sx={{ maxWidth: 1300, mx: 'auto' }}>

                {/* ── Page header ── */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                    <Typography variant="h6" fontWeight={700}>
                        {translate('shell.accounting.general_ledger')}
                    </Typography>
                    <Tooltip title={translate('shell.accounting.gl_optional_columns')}>
                        <IconButton
                            size="small"
                            onClick={e => setColMenuAnchor(e.currentTarget)}
                            sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}
                        >
                            <IoOptions size={18} />
                        </IconButton>
                    </Tooltip>
                    <Menu anchorEl={colMenuAnchor} open={Boolean(colMenuAnchor)} onClose={() => setColMenuAnchor(null)}>
                        <Box sx={{ px: 2, py: 1, minWidth: 220 }}>
                            <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                                {translate('shell.accounting.gl_optional_columns')}
                            </Typography>
                            <FormGroup>
                                <FormControlLabel
                                    control={<Checkbox checked={optionalCols.partner} onChange={() => toggleOptional('partner')} size="small" />}
                                    label={translate('shell.accounting.gl_col_partner')}
                                />
                                <FormControlLabel
                                    control={<Checkbox checked={optionalCols.scheme} onChange={() => toggleOptional('scheme')} size="small" />}
                                    label={translate('shell.accounting.gl_col_scheme')}
                                />
                            </FormGroup>
                        </Box>
                    </Menu>
                </Box>

                {/* ── Filters card ── */}
                <Paper
                    variant="outlined"
                    sx={{ p: 2, mb: 2, borderRadius: 2, bgcolor: 'common.white' }}
                >
                    {/* Preset buttons */}
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', mb: 1.5 }}>
                        {(['month', 'quarter', 'year'] as const).map(p => (
                            <Button
                                key={p}
                                size="small"
                                variant={datePreset === p ? 'contained' : 'outlined'}
                                onClick={() => applyPreset(p)}
                                sx={{ borderRadius: 1.5, textTransform: 'none', fontSize: 12, py: '3px' }}
                            >
                                {translate(`shell.accounting.gl_preset_${p}`)}
                            </Button>
                        ))}
                    </Box>

                    {/* Search + date pickers + toggles */}
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
                        <TextField
                            size="small"
                            placeholder={translate('shell.accounting.gl_search_placeholder')}
                            value={accountSearch}
                            onChange={e => setAccountSearch(e.target.value)}
                            sx={{ minWidth: { xs: '100%', sm: 240 } }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon fontSize="small" color="action" />
                                    </InputAdornment>
                                ),
                                sx: { fontSize: 13, py: 0 },
                            }}
                        />

                        {/* From date */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
                                {translate('shell.accounting.date_from')}
                            </Typography>
                            <input
                                type="date"
                                value={from}
                                onChange={e => { setDatePreset(null); setFrom(e.target.value); }}
                                style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #ccc', fontSize: 12 }}
                            />
                        </Box>

                        {/* To date */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
                                {translate('shell.accounting.date_to')}
                            </Typography>
                            <input
                                type="date"
                                value={to}
                                onChange={e => { setDatePreset(null); setTo(e.target.value); }}
                                style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #ccc', fontSize: 12 }}
                            />
                        </Box>

                        <FormControlLabel
                            control={<Switch checked={postedOnly} onChange={e => setPostedOnly(e.target.checked)} size="small" />}
                            label={<Typography sx={{ fontSize: 12 }}>{translate('shell.accounting.posted_only')}</Typography>}
                        />
                        <FormControlLabel
                            control={<Switch checked={includeZeroClosing} onChange={e => setIncludeZeroClosing(e.target.checked)} size="small" />}
                            label={<Typography sx={{ fontSize: 12 }}>{translate('shell.accounting.gl_include_zero_closing')}</Typography>}
                        />
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={() => void loadSummary()}
                            disabled={loading}
                            sx={{ borderRadius: 1.5, textTransform: 'none', fontSize: 12, py: '3px' }}
                        >
                            {translate('ra.action.refresh', { _: 'Refresh' })}
                        </Button>
                    </Box>
                </Paper>

                {/* ── Error ── */}
                {error && (
                    <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>
                )}

                {/* ── Table card ── */}
                {loading && !summary ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                        <CircularProgress size={32} />
                    </Box>
                ) : (
                    <Paper
                        variant="outlined"
                        sx={{ borderRadius: 2, overflow: 'hidden', bgcolor: 'common.white' }}
                    >
                        {/* Single-account export bar */}
                        {singleFilteredAccount && (
                            <Box
                                sx={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    alignItems: 'center',
                                    gap: 1,
                                    px: 1.5,
                                    py: 0.75,
                                    borderBottom: '1px solid',
                                    borderColor: 'divider',
                                    bgcolor: 'grey.50',
                                }}
                            >
                                <Typography variant="body2" color="text.secondary" sx={{ mr: 'auto', fontSize: 12 }}>
                                    {translate('shell.accounting.gl_single_account_export_hint')}
                                </Typography>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<PictureAsPdfIcon sx={{ fontSize: 16 }} />}
                                    disabled={exporting !== null}
                                    onClick={() => void exportAccountLedger(singleFilteredAccount, 'pdf')}
                                    sx={{ fontSize: 12, py: '2px', borderRadius: 1.5, textTransform: 'none' }}
                                >
                                    {translate('shell.accounting.gl_export_pdf')}
                                </Button>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<TableChartIcon sx={{ fontSize: 16 }} />}
                                    onClick={() => void exportAccountLedger(singleFilteredAccount, 'excel')}
                                    sx={{ fontSize: 12, py: '2px', borderRadius: 1.5, textTransform: 'none' }}
                                >
                                    {translate('shell.accounting.gl_export_excel')}
                                </Button>
                            </Box>
                        )}

                        {/* ── Summary table ── */}
                        <TableContainer>
                            <Table
                                size="small"
                                stickyHeader
                                sx={{ '& .MuiTableCell-root': { borderColor: 'divider' } }}
                            >
                                <TableHead>
                                    <TableRow>
                                        {/* Expand toggle column */}
                                        <TableCell sx={{ ...headCellSx, width: 36, px: '4px' }} />
                                        <TableCell sx={{ ...headCellSx, textAlign: 'left' }}>
                                            {translate('shell.accounting.tb_col_account')}
                                        </TableCell>
                                        <TableCell align="right" sx={{ ...headCellSx, width: 110 }}>
                                            {translate('shell.accounting.tb_col_debit')}
                                        </TableCell>
                                        <TableCell align="right" sx={{ ...headCellSx, width: 110 }}>
                                            {translate('shell.accounting.tb_col_credit')}
                                        </TableCell>
                                        <TableCell align="right" sx={{ ...headCellSx, width: 120 }}>
                                            {translate('shell.accounting.gl_col_balance_end')}
                                        </TableCell>
                                    </TableRow>
                                </TableHead>

                                <TableBody>
                                    {filteredRows.map(r => {
                                        const isOpen = expanded.has(r.glCaid);
                                        const lk = linesCacheKey(r.glCaid);
                                        const linesData = linesByKey.get(lk);
                                        const busy = linesLoading.has(r.glCaid);
                                        const lineErr = linesError.get(r.glCaid);

                                        return (
                                            <React.Fragment key={r.glCaid}>
                                                {/* ── Summary row ── */}
                                                <TableRow
                                                    hover
                                                    sx={{
                                                        cursor: 'pointer',
                                                        '&:hover': { bgcolor: 'action.hover' },
                                                        '& td': { borderBottom: isOpen ? 'none' : undefined },
                                                    }}
                                                    onClick={() => void toggleExpand(r.glCaid)}
                                                >
                                                    {/* Expand button */}
                                                    <TableCell sx={{ ...cellSx, width: 36, px: '4px', borderColor: 'divider' }}>
                                                        <IconButton
                                                            size="small"
                                                            aria-expanded={isOpen}
                                                            sx={{ p: '2px' }}
                                                            onClick={e => { e.stopPropagation(); void toggleExpand(r.glCaid); }}
                                                        >
                                                            {isOpen
                                                                ? <KeyboardArrowDownIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                                                : <KeyboardArrowRightIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                                            }
                                                        </IconButton>
                                                    </TableCell>

                                                    {/* Account name */}
                                                    <TableCell
                                                        sx={{
                                                            ...cellSx,
                                                            pl: 1 + Math.min(r.level, 8) * 2,
                                                            fontWeight: r.isParent !== 0 ? 500 : 400,
                                                        }}
                                                    >
                                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 0.5 }}>
                                                            <Box sx={{ minWidth: 0, display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                                                                <Typography
                                                                    component="span"
                                                                    sx={{ fontSize: 11, fontVariantNumeric: 'tabular-nums', color: 'text.secondary', flexShrink: 0 }}
                                                                >
                                                                    {String(r.glCode ?? '').trim()}
                                                                </Typography>
                                                                <Typography component="span" sx={{ fontSize: 12 }}>
                                                                    {String(r.glTitle ?? '').trim()}
                                                                </Typography>
                                                            </Box>

                                                            {/* Per-row export icons */}
                                                            <Box
                                                                sx={{ display: 'flex', flexShrink: 0, opacity: 0.5, '&:hover': { opacity: 1 } }}
                                                                onClick={e => e.stopPropagation()}
                                                            >
                                                                <Tooltip title={translate('shell.accounting.gl_export_pdf')}>
                                                                    <IconButton
                                                                        size="small"
                                                                        disabled={exporting !== null}
                                                                        onClick={() => void exportAccountLedger(r, 'pdf')}
                                                                        sx={{ p: '2px' }}
                                                                    >
                                                                        <PictureAsPdfIcon sx={{ fontSize: 14 }} />
                                                                    </IconButton>
                                                                </Tooltip>
                                                                <Tooltip title={translate('shell.accounting.gl_export_excel')}>
                                                                    <IconButton
                                                                        size="small"
                                                                        onClick={() => void exportAccountLedger(r, 'excel')}
                                                                        sx={{ p: '2px' }}
                                                                    >
                                                                        <TableChartIcon sx={{ fontSize: 14 }} />
                                                                    </IconButton>
                                                                </Tooltip>
                                                            </Box>
                                                        </Box>
                                                    </TableCell>

                                                    <NumCell value={r.periodDr} />
                                                    <NumCell value={r.periodCr} />
                                                    <BalCell value={r.endBalance} />
                                                </TableRow>

                                                {/* ── Collapsible detail rows ── */}
                                                <TableRow>
                                                    <TableCell colSpan={5} sx={{ p: 0, border: 'none' }}>
                                                        <Collapse in={isOpen} timeout="auto" unmountOnExit>
                                                            <Box
                                                                sx={{
                                                                    pl: { xs: 2.5, sm: 3.5 },
                                                                    pr: 0.5,
                                                                    py: 1,
                                                                    ml: { xs: 1.5, sm: 2.5 },
                                                                    borderLeft: '2px solid',
                                                                    borderLeftColor: 'grey.300',
                                                                    bgcolor: 'grey.50',
                                                                    borderTop: '1px solid',
                                                                    borderTopColor: 'divider',
                                                                }}
                                                            >
                                                                {busy ? (
                                                                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                                                                        <CircularProgress size={24} />
                                                                    </Box>
                                                                ) : lineErr ? (
                                                                    <Alert severity="error" sx={{ m: 0.5 }}>{lineErr}</Alert>
                                                                ) : linesData ? (
                                                                    <LedgerDetailTable
                                                                        data={linesData}
                                                                        optionalPartner={optionalCols.partner}
                                                                        optionalScheme={optionalCols.scheme}
                                                                        translate={translate}
                                                                    />
                                                                ) : null}
                                                            </Box>
                                                        </Collapse>
                                                    </TableCell>
                                                </TableRow>
                                            </React.Fragment>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                )}
            </Box>
        </Box>
    );
}