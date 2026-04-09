import * as React from 'react';
import {
    BulkDeleteButton,
    Button as RaButton,
    List,
    ColumnsButton,
    DataTable,
    DateField,
    TopToolbar,
    useListContext,
    FunctionField,
    useRefresh,
    useStore,
    useUnselectAll,
    type Identifier,
} from 'react-admin';
import {
    Box,
    Button,
    Chip,
    CircularProgress,
    IconButton,
    InputBase,
    List as MuiList,
    ListItemButton,
    ListItemText,
    Menu,
    MenuItem,
    Paper,
    Popover,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tooltip,
    Typography,
    Divider,
} from '@mui/material';
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewKanbanOutlinedIcon from '@mui/icons-material/ViewKanbanOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import ShowChartOutlinedIcon from '@mui/icons-material/ShowChartOutlined';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import UploadOutlinedIcon from '@mui/icons-material/UploadOutlined';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import CloseIcon from '@mui/icons-material/Close';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import StarBorderOutlinedIcon from '@mui/icons-material/StarBorderOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import Swal from 'sweetalert2';
import { Link } from 'react-router-dom';
import TaskAltOutlinedIcon from '@mui/icons-material/TaskAltOutlined';
import { apiFetch } from '../api/httpClient';
import { postFbrInvoiceValidate } from '../api/fbrInvoiceFbrApi';
import { API_BASE_URL } from '../api/apiBaseUrl';
import { utcInstantToLocalDateTransform } from '../common/parseApiUtcInstant';

// ── Match your teal nav bar color ────────────────────────────────────────────
const NAV_TEAL      = '#3d7a7a';   // adjust to your exact nav colour
const NAV_TEAL_DARK = '#2e6262';

const FBR_INVOICE_COLUMNS_STORE_KEY = 'fbrInvoices.columns';
const FBR_INVOICE_COLUMNS_BUTTON_ID = 'fbrInvoices.columnsButton';
const FBR_INVOICE_GROUP_BY_STORE_KEY = 'fbrInvoices.groupBy';

export type FbrInvoiceGroupByMode = 'none' | 'customerPartyId' | 'invoiceDateDay';

const STATUS_FILTER_OPTIONS: { value: string; label: string }[] = [
    { value: '', label: 'All' },
    { value: 'ordered', label: 'Draft' },
    { value: 'delivered', label: 'Validated' },
    { value: 'posted', label: 'Posted to FBR' },
    { value: 'cancelled', label: 'Cancelled' },
];

const GROUP_BY_OPTIONS: { value: FbrInvoiceGroupByMode; label: string }[] = [
    { value: 'none', label: 'None' },
    { value: 'customerPartyId', label: 'Customer' },
    { value: 'invoiceDateDay', label: 'Invoice date' },
];

type FbrImportResponse = {
    created: number;
    failed: number;
    results: Array<{
        groupKey: string;
        firstExcelRow: number;
        reference?: string | null;
        invoiceId?: string | null;
        error?: string | null;
    }>;
};

function OdooListActions() {
    const { filterValues, setFilters, page, perPage, total, setPage, refetch } = useListContext();
    const [groupBy, setGroupBy] = useStore<FbrInvoiceGroupByMode>(
        FBR_INVOICE_GROUP_BY_STORE_KEY,
        'none'
    );
    const [view, setView] = useStore<'list' | 'kanban' | 'calendar' | 'pivot' | 'graph' | 'activity'>(
        'fbrInvoices.listView',
        'list'
    );
    const [q, setQ]           = React.useState<string>(String((filterValues as any)?.q ?? ''));
    const [myFilter, setMyFilter] = React.useState(true);
    const [uploadMenuAnchor, setUploadMenuAnchor] = React.useState<null | HTMLElement>(null);
    const [importBusy, setImportBusy] = React.useState(false);
    const [settingsMenuAnchor, setSettingsMenuAnchor] = React.useState<null | HTMLElement>(null);
    const [demoBusy, setDemoBusy] = React.useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const searchBarRef = React.useRef<HTMLDivElement | null>(null);
    const [searchPanelOpen, setSearchPanelOpen] = React.useState(false);

    const closeSearchPanel = React.useCallback(() => setSearchPanelOpen(false), []);
    const toggleSearchPanel = React.useCallback(() => setSearchPanelOpen(o => !o), []);

    const downloadImportTemplate = React.useCallback(async () => {
        try {
            const res = await apiFetch('/api/fbrInvoices/import/template', { method: 'GET' });
            if (!res.ok) {
                let msg = res.statusText;
                try {
                    const j = await res.json();
                    if (j && typeof j === 'object' && 'message' in j) msg = String((j as { message?: unknown }).message ?? msg);
                } catch {
                    /* ignore */
                }
                await Swal.fire({ icon: 'error', title: 'Download failed', text: msg });
                return;
            }
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'FBR_Invoice_Import_Template.xlsx';
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            await Swal.fire({
                icon: 'error',
                title: 'Download failed',
                text: e instanceof Error ? e.message : String(e),
            });
        }
    }, []);

    const onImportFileSelected = React.useCallback(
        async (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (!file) return;
            setImportBusy(true);
            try {
                const fd = new FormData();
                fd.append('file', file);
                const res = await apiFetch('/api/fbrInvoices/import', { method: 'POST', body: fd });
                const text = await res.text();
                let parsed: unknown;
                try {
                    parsed = text ? JSON.parse(text) : {};
                } catch {
                    parsed = null;
                }
                if (!res.ok) {
                    const msg =
                        parsed &&
                        typeof parsed === 'object' &&
                        parsed !== null &&
                        'message' in parsed
                            ? String((parsed as { message?: unknown }).message ?? res.statusText)
                            : res.statusText;
                    await Swal.fire({ icon: 'error', title: 'Import failed', text: msg });
                    return;
                }
                const data = parsed as FbrImportResponse;
                const created = Number(data?.created) || 0;
                const failed = Number(data?.failed) || 0;
                const errLines =
                    (data?.results ?? [])
                        .filter(r => r.error)
                        .map(r => `Row ${r.firstExcelRow} (${r.groupKey}): ${r.error}`)
                        .join('\n') || undefined;
                await Swal.fire({
                    icon: failed ? 'warning' : 'success',
                    title: `Import finished`,
                    html:
                        failed > 0
                            ? `<p>Created: <b>${created}</b> &nbsp; Failed: <b>${failed}</b></p>` +
                              (errLines ? `<pre style="text-align:left;font-size:12px;max-height:240px;overflow:auto">${errLines.replace(/</g, '&lt;')}</pre>` : '')
                            : `<p>Created <b>${created}</b> invoice(s).</p>`,
                });
                if (typeof refetch === 'function') refetch();
            } catch (err) {
                await Swal.fire({
                    icon: 'error',
                    title: 'Import failed',
                    text: err instanceof Error ? err.message : String(err),
                });
            } finally {
                setImportBusy(false);
            }
        },
        [refetch]
    );

    const loadDemoData = React.useCallback(async () => {
        setSettingsMenuAnchor(null);
        const r = await Swal.fire({
            title: 'Load demo data?',
            html:
                '<p>Creates <b>10 draft invoices</b> with demo customers, rotating through your <b>FBR scenarios</b> and catalog products (must have PDI + an effective sales tax rate).</p>',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Create 10 demos',
            cancelButtonText: 'Cancel',
        });
        if (!r.isConfirmed) return;
        setDemoBusy(true);
        try {
            const res = await apiFetch('/api/fbrInvoices/demo-data', { method: 'POST' });
            const text = await res.text();
            let parsed: unknown;
            try {
                parsed = text ? JSON.parse(text) : {};
            } catch {
                parsed = null;
            }
            if (!res.ok) {
                const msg =
                    parsed &&
                    typeof parsed === 'object' &&
                    parsed !== null &&
                    'message' in parsed
                        ? String((parsed as { message?: unknown }).message ?? res.statusText)
                        : res.statusText;
                await Swal.fire({ icon: 'error', title: 'Demo data failed', text: msg });
                return;
            }
            const data = parsed as { created?: number; errors?: string[] };
            const created = Number(data?.created) || 0;
            const errs = Array.isArray(data?.errors) ? data.errors : [];
            await Swal.fire({
                icon: errs.length > 0 ? 'warning' : 'success',
                title: 'Demo data',
                html:
                    `<p>Created <b>${created}</b> invoice(s).</p>` +
                    (errs.length > 0
                        ? `<pre style="text-align:left;font-size:12px;max-height:200px;overflow:auto">${errs.join('\n').replace(/</g, '&lt;')}</pre>`
                        : ''),
            });
            if (typeof refetch === 'function') refetch();
        } catch (e) {
            await Swal.fire({
                icon: 'error',
                title: 'Demo data failed',
                text: e instanceof Error ? e.message : String(e),
            });
        } finally {
            setDemoBusy(false);
        }
    }, [refetch]);

    React.useEffect(() => {
        setQ(String((filterValues as any)?.q ?? ''));
    }, [(filterValues as any)?.q]);

    const filterValuesRef = React.useRef(filterValues);
    filterValuesRef.current = filterValues;
    const setFiltersRef = React.useRef(setFilters);
    setFiltersRef.current = setFilters;

    React.useEffect(() => {
        const t = window.setTimeout(() => {
            const next = q.trim();
            const fv = filterValuesRef.current as Record<string, unknown>;
            const cur = String(fv.q ?? '').trim();
            if (cur === next) return;
            setFiltersRef.current({ ...fv, q: next || undefined } as any, null);
        }, 250);
        return () => window.clearTimeout(t);
    }, [q]);

    const pageStart = total ? (page - 1) * perPage + 1 : 0;
    const pageEnd   = total ? Math.min(page * perPage, total) : 0;
    const currentStatus = String((filterValues as any)?.status ?? '');
    const statusChipLabel =
        STATUS_FILTER_OPTIONS.find(o => o.value === currentStatus)?.label ?? currentStatus;

    const viewButtons = [
        { key: 'list',     icon: <ViewListIcon fontSize="small" />,            label: 'List' },
        { key: 'kanban',   icon: <ViewKanbanOutlinedIcon fontSize="small" />,  label: 'Kanban' },
        { key: 'calendar', icon: <CalendarMonthOutlinedIcon fontSize="small" />, label: 'Calendar', disabled: true },
        { key: 'pivot',    icon: <TableChartOutlinedIcon fontSize="small" />,  label: 'Pivot',    disabled: true },
        { key: 'graph',    icon: <ShowChartOutlinedIcon fontSize="small" />,   label: 'Graph',    disabled: true },
        { key: 'activity', icon: <AccessTimeIcon fontSize="small" />,          label: 'Activity', disabled: true },
    ];

    return (
        <TopToolbar
            sx={{
                width: '100%',
                p: 0,
                minHeight: 'unset',
                flexDirection: 'column',
                // ── Odoo-style top spacing ────────────────────────────────
                pt: '12px',
            }}
        >
            <Box
                sx={{
                    width: '100%',
                    bgcolor: 'common.white',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    px: 2,
                    py: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                }}
            >
                {/* ── Left: New + Upload + Title ── */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', flex: '0 0 auto' }}>
                    <Button
                        component={Link}
                        to="/fbrInvoices/create"
                        variant="contained"
                        size="small"
                        sx={{
                            bgcolor: NAV_TEAL,
                            color: '#fff',
                            textTransform: 'none',
                            fontWeight: 700,
                            fontSize: 13,
                            borderRadius: '4px',
                            px: 2,
                            py: '4px',
                            minHeight: 30,
                            boxShadow: 'none',
                            '&:hover': { bgcolor: NAV_TEAL_DARK, boxShadow: 'none' },
                        }}
                    >
                        New
                    </Button>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                        style={{ display: 'none' }}
                        onChange={onImportFileSelected}
                    />
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<UploadOutlinedIcon sx={{ fontSize: '16px !important' }} />}
                        disabled={importBusy}
                        onClick={ev => setUploadMenuAnchor(ev.currentTarget)}
                        sx={{
                            textTransform: 'none',
                            fontWeight: 500,
                            fontSize: 13,
                            borderRadius: '4px',
                            px: 1.5,
                            py: '3px',
                            minHeight: 30,
                            borderColor: '#dee2e6',
                            color: 'text.primary',
                        }}
                    >
                        Upload
                    </Button>
                    <Menu
                        anchorEl={uploadMenuAnchor}
                        open={Boolean(uploadMenuAnchor)}
                        onClose={() => setUploadMenuAnchor(null)}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                    >
                        <MenuItem
                            onClick={() => {
                                setUploadMenuAnchor(null);
                                void downloadImportTemplate();
                            }}
                        >
                            Download template
                        </MenuItem>
                        <MenuItem
                            onClick={() => {
                                setUploadMenuAnchor(null);
                                fileInputRef.current?.click();
                            }}
                        >
                            Import…
                        </MenuItem>
                    </Menu>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 0.5 }}>
                        <Typography variant="body1" sx={{ fontWeight: 700, fontSize: 15, color: 'text.primary' }}>
                            Invoices
                        </Typography>
                        <IconButton
                            size="small"
                            sx={{ color: 'text.secondary', p: '2px' }}
                            onClick={ev => setSettingsMenuAnchor(ev.currentTarget)}
                            disabled={demoBusy}
                        >
                            <SettingsOutlinedIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                        <Menu
                            anchorEl={settingsMenuAnchor}
                            open={Boolean(settingsMenuAnchor)}
                            onClose={() => setSettingsMenuAnchor(null)}
                            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                        >
                            <MenuItem
                                onClick={() => {
                                    setSettingsMenuAnchor(null);
                                    const el = document.getElementById(
                                        FBR_INVOICE_COLUMNS_BUTTON_ID
                                    ) as HTMLButtonElement | null;
                                    el?.click();
                                }}
                            >
                                Choose columns
                            </MenuItem>
                            <MenuItem
                                onClick={() => void loadDemoData()}
                                disabled={demoBusy}
                            >
                                Load demo data (10 invoices)
                            </MenuItem>
                        </Menu>

                        {/* Keep ColumnsButton mounted for popover behavior, but hidden (gear triggers it) */}
                        <Box
                            sx={{
                                position: 'absolute',
                                width: 1,
                                height: 1,
                                overflow: 'hidden',
                                clip: 'rect(0 0 0 0)',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            <ColumnsButton
                                id={FBR_INVOICE_COLUMNS_BUTTON_ID}
                                storeKey={FBR_INVOICE_COLUMNS_STORE_KEY}
                                sx={{ minWidth: 0, px: '6px' }}
                            />
                        </Box>
                    </Box>
                </Box>

                {/* ── Center: Search bar ── */}
                <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                    <Paper
                        ref={searchBarRef}
                        variant="outlined"
                        sx={{
                            width: 'min(560px, 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            borderRadius: '4px',
                            borderColor: '#c9c9c9',
                            overflow: 'hidden',
                        }}
                    >
                        {/* Filter funnel — opens search panel */}
                        <Tooltip title="Filters & grouping">
                            <Box
                                component="button"
                                type="button"
                                onClick={() => setSearchPanelOpen(true)}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    px: 1,
                                    py: '5px',
                                    bgcolor: '#eef6f6',
                                    borderRight: '1px solid #e0e0e0',
                                    cursor: 'pointer',
                                    border: 'none',
                                    '&:hover': { bgcolor: '#d9eeee' },
                                }}
                            >
                                <FilterListIcon sx={{ fontSize: 18, color: NAV_TEAL }} />
                            </Box>
                        </Tooltip>

                        {myFilter && (
                            <Chip
                                label="My Quotations"
                                size="small"
                                onDelete={() => setMyFilter(false)}
                                deleteIcon={<CloseIcon sx={{ fontSize: '14px !important' }} />}
                                sx={{
                                    ml: 0.75,
                                    height: 22,
                                    borderRadius: '999px',
                                    bgcolor: '#e0f2f1',
                                    color: NAV_TEAL,
                                    border: `1px solid ${NAV_TEAL}55`,
                                    fontWeight: 600,
                                    fontSize: 12,
                                    '& .MuiChip-label': { px: '8px' },
                                    '& .MuiChip-deleteIcon': { color: NAV_TEAL, ml: '2px', mr: '4px' },
                                }}
                            />
                        )}

                        {currentStatus ? (
                            <Chip
                                label={statusChipLabel}
                                size="small"
                                onDelete={() => {
                                    const fv = { ...(filterValues as Record<string, unknown>) };
                                    delete fv.status;
                                    setFilters(fv as any, null);
                                    setPage(1);
                                }}
                                sx={{
                                    ml: 0.75,
                                    height: 22,
                                    borderRadius: '999px',
                                    fontWeight: 600,
                                    fontSize: 12,
                                    maxWidth: 160,
                                    '& .MuiChip-label': { px: '8px', overflow: 'hidden', textOverflow: 'ellipsis' },
                                }}
                            />
                        ) : null}

                        {groupBy !== 'none' ? (
                            <Chip
                                label={`Group: ${GROUP_BY_OPTIONS.find(g => g.value === groupBy)?.label ?? groupBy}`}
                                size="small"
                                onDelete={() => setGroupBy('none')}
                                sx={{
                                    ml: 0.5,
                                    height: 22,
                                    borderRadius: '999px',
                                    fontSize: 11,
                                    maxWidth: 200,
                                    '& .MuiChip-label': { px: '8px', overflow: 'hidden', textOverflow: 'ellipsis' },
                                }}
                            />
                        ) : null}

                        <InputBase
                            value={q}
                            onChange={e => setQ(e.target.value)}
                            placeholder="Search..."
                            sx={{ flex: 1, fontSize: 13, px: 1, py: '4px', minWidth: 0 }}
                            endAdornment={
                                q ? (
                                    <IconButton size="small" onClick={() => setQ('')} sx={{ p: '2px' }}>
                                        <CloseIcon sx={{ fontSize: 14 }} />
                                    </IconButton>
                                ) : null
                            }
                        />

                        <IconButton size="small" sx={{ p: '4px', color: 'text.secondary' }}>
                            <SearchIcon sx={{ fontSize: 18 }} />
                        </IconButton>

                        <Tooltip title={searchPanelOpen ? 'Close' : 'Filters, group by…'}>
                            <IconButton
                                size="small"
                                onClick={toggleSearchPanel}
                                sx={{
                                    p: '4px',
                                    borderRadius: 0,
                                    borderLeft: '1px solid #e0e0e0',
                                    color: searchPanelOpen ? NAV_TEAL : 'text.secondary',
                                    bgcolor: searchPanelOpen ? '#eef6f6' : 'transparent',
                                    '&:hover': { color: NAV_TEAL, bgcolor: '#eef6f6' },
                                }}
                            >
                                {searchPanelOpen ? (
                                    <KeyboardArrowUpIcon sx={{ fontSize: 22 }} />
                                ) : (
                                    <ArrowDropDownIcon sx={{ fontSize: 22 }} />
                                )}
                            </IconButton>
                        </Tooltip>
                    </Paper>

                    <Popover
                        open={searchPanelOpen}
                        anchorEl={searchBarRef.current}
                        onClose={closeSearchPanel}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
                        slotProps={{
                            paper: {
                                elevation: 6,
                                sx: {
                                    mt: 0.5,
                                    width: { xs: 'min(100vw - 24px, 520px)', sm: 560 },
                                    maxWidth: 'calc(100vw - 24px)',
                                    overflow: 'hidden',
                                },
                            },
                        }}
                    >
                        <Box sx={{ display: 'flex', minHeight: 220 }}>
                            {/* Filters */}
                            <Box
                                sx={{
                                    flex: 1,
                                    minWidth: 0,
                                    borderRight: '1px solid',
                                    borderColor: 'divider',
                                    py: 1,
                                    px: 0.5,
                                }}
                            >
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 0.75,
                                        px: 1,
                                        pb: 1,
                                    }}
                                >
                                    <FilterListIcon sx={{ fontSize: 20, color: NAV_TEAL }} />
                                    <Typography variant="subtitle2" fontWeight={700}>
                                        Filters
                                    </Typography>
                                </Box>
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ px: 1.5, display: 'block', mb: 0.5 }}
                                >
                                    Status
                                </Typography>
                                <MuiList disablePadding sx={{ py: 0 }}>
                                    {STATUS_FILTER_OPTIONS.map(opt => {
                                        const active = currentStatus === opt.value;
                                        return (
                                            <ListItemButton
                                                key={opt.value || 'all'}
                                                selected={active}
                                                dense
                                                onClick={() => {
                                                    const fv = {
                                                        ...(filterValues as Record<string, unknown>),
                                                    };
                                                    if (opt.value) fv.status = opt.value;
                                                    else delete fv.status;
                                                    setFilters(fv as any, null);
                                                    setPage(1);
                                                }}
                                                sx={{
                                                    py: 0.5,
                                                    px: 1.5,
                                                    '&.Mui-selected': {
                                                        bgcolor: 'action.selected',
                                                    },
                                                }}
                                            >
                                                <ListItemText
                                                    primary={opt.label}
                                                    primaryTypographyProps={{ variant: 'body2' }}
                                                />
                                            </ListItemButton>
                                        );
                                    })}
                                </MuiList>
                                <ListItemButton dense disabled sx={{ opacity: 0.55, py: 0.5 }}>
                                    <ListItemText
                                        primary="Add custom filter"
                                        primaryTypographyProps={{ variant: 'caption' }}
                                    />
                                </ListItemButton>
                            </Box>

                            {/* Group by */}
                            <Box
                                sx={{
                                    flex: 1,
                                    minWidth: 0,
                                    borderRight: '1px solid',
                                    borderColor: 'divider',
                                    py: 1,
                                    px: 0.5,
                                }}
                            >
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 0.75,
                                        px: 1,
                                        pb: 1,
                                    }}
                                >
                                    <AccountTreeOutlinedIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                                    <Typography variant="subtitle2" fontWeight={700}>
                                        Group By
                                    </Typography>
                                </Box>
                                <MuiList disablePadding sx={{ py: 0 }}>
                                    {GROUP_BY_OPTIONS.map(opt => (
                                        <ListItemButton
                                            key={opt.value}
                                            selected={groupBy === opt.value}
                                            dense
                                            onClick={() => setGroupBy(opt.value)}
                                            sx={{
                                                py: 0.5,
                                                px: 1.5,
                                                '&.Mui-selected': { bgcolor: 'action.selected' },
                                            }}
                                        >
                                            <ListItemText
                                                primary={opt.label}
                                                primaryTypographyProps={{ variant: 'body2' }}
                                            />
                                        </ListItemButton>
                                    ))}
                                </MuiList>
                                <ListItemButton dense disabled sx={{ opacity: 0.55, py: 0.5 }}>
                                    <ListItemText
                                        primary="Add custom group"
                                        primaryTypographyProps={{ variant: 'caption' }}
                                    />
                                </ListItemButton>
                            </Box>

                            {/* Favorites */}
                            <Box sx={{ flex: 1, minWidth: 0, py: 1, px: 0.5 }}>
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 0.75,
                                        px: 1,
                                        pb: 1,
                                    }}
                                >
                                    <StarBorderOutlinedIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                                    <Typography variant="subtitle2" fontWeight={700}>
                                        Favorites
                                    </Typography>
                                </Box>
                                <ListItemButton dense disabled sx={{ opacity: 0.55, py: 0.5 }}>
                                    <ListItemText
                                        primary="Save current search"
                                        secondary="Coming soon"
                                        primaryTypographyProps={{ variant: 'body2' }}
                                        secondaryTypographyProps={{ variant: 'caption' }}
                                    />
                                </ListItemButton>
                            </Box>
                        </Box>
                    </Popover>
                </Box>

                {/* ── Right: pagination + view toggles ── */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: '0 0 auto' }}>
                    {total != null && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                                {pageStart}–{pageEnd} / {total}
                            </Typography>
                            <IconButton size="small" disabled={page <= 1} onClick={() => setPage(page - 1)} sx={{ p: '2px' }}>
                                <NavigateBeforeIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                            <IconButton size="small" disabled={pageEnd >= (total ?? 0)} onClick={() => setPage(page + 1)} sx={{ p: '2px' }}>
                                <NavigateNextIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                        </Box>
                    )}

                    <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 0.5 }} />

                    {viewButtons.map(({ key, icon, label, disabled }) => (
                        <Tooltip key={key} title={label}>
                            <span>
                                <IconButton
                                    size="small"
                                    disabled={disabled}
                                    onClick={() => !disabled && setView(key as any)}
                                    sx={{
                                        p: '5px',
                                        borderRadius: '4px',
                                        bgcolor: view === key ? '#e0f2f1' : 'transparent',
                                        color:  view === key ? NAV_TEAL   : 'text.secondary',
                                        border: view === key ? `1px solid ${NAV_TEAL}55` : '1px solid transparent',
                                        '&:hover': { bgcolor: disabled ? undefined : '#eef6f6' },
                                    }}
                                >
                                    {icon}
                                </IconButton>
                            </span>
                        </Tooltip>
                    ))}
                </Box>
            </Box>
        </TopToolbar>
    );
}

type StatusChipCfg = { label: string; bg: string; color: string; border: string };

const FBR_INVOICE_STATUS_STYLES: Record<string, StatusChipCfg> = {
    ordered: {
        label: 'Draft',
        bg: '#ffffff',
        color: '#1565c0',
        border: '#1565c0',
    },
    delivered: {
        label: 'Validated',
        bg: '#2e7d32',
        color: '#ffffff',
        border: '#2e7d32',
    },
    posted: {
        label: 'Posted to FBR',
        bg: '#1b5e20',
        color: '#ffffff',
        border: '#1b5e20',
    },
    cancelled: {
        label: 'Cancelled',
        bg: '#c62828',
        color: '#ffffff',
        border: '#c62828',
    },
};

/** Shared status pill for DataTable and grouped table */
function FbrInvoiceStatusChip({ record }: { record: any }) {
    const st = String(record?.status ?? '').toLowerCase();
    const cfg: StatusChipCfg = FBR_INVOICE_STATUS_STYLES[st] ?? {
        label: record?.status ?? '',
        bg: '#f5f5f5',
        color: '#616161',
        border: '#bdbdbd',
    };
    return (
        <Chip
            size="small"
            label={cfg.label}
            sx={{
                height: 24,
                borderRadius: '999px',
                fontWeight: 700,
                fontSize: 11,
                bgcolor: cfg.bg,
                color: cfg.color,
                border: `1px solid ${cfg.border}`,
                letterSpacing: '0.02em',
                '& .MuiChip-label': { px: '10px', py: 0 },
            }}
        />
    );
}

// ── Odoo-style pill status chips ─────────────────────────────────────────────
const OdooStatusField = () => (
    <FunctionField label="Status" render={(record: any) => <FbrInvoiceStatusChip record={record} />} />
);

// ── Remove $ — use plain number format ───────────────────────────────────────
const amountOptions = {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
} as const;

const GROUP_HEADER_LABEL_COLSPAN = 5;
const GROUP_HEADER_TAIL_COLSPAN = 3;

type FbrGroupedSection = { key: string; displayLabel: string; rows: any[] };

function FbrGroupedDataTable() {
    const { data, isLoading } = useListContext();
    const [groupBy] = useStore<FbrInvoiceGroupByMode>(FBR_INVOICE_GROUP_BY_STORE_KEY, 'none');
    const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(() => new Set());

    const groups = React.useMemo((): FbrGroupedSection[] => {
        if (groupBy === 'none') return [];
        const arr = data ? (Object.values(data) as any[]) : [];
        const map = new Map<string, { displayLabel: string; rows: any[] }>();

        for (const r of arr) {
            if (groupBy === 'customerPartyId') {
                const partyId = String(r.customerPartyId ?? '');
                const uniqueKey = `party:${partyId}`;
                const displayLabel =
                    String(r.customerName ?? '').trim() || 'Customer';
                const prev = map.get(uniqueKey);
                if (prev) prev.rows.push(r);
                else map.set(uniqueKey, { displayLabel, rows: [r] });
            } else {
                const uniqueKey =
                    utcInstantToLocalDateTransform(r.invoiceDate)?.toLocaleDateString() ?? '—';
                const prev = map.get(uniqueKey);
                if (prev) prev.rows.push(r);
                else map.set(uniqueKey, { displayLabel: uniqueKey, rows: [r] });
            }
        }

        map.forEach(v => {
            v.rows.sort((a: any, b: any) => {
                const ta = utcInstantToLocalDateTransform(a.invoiceDate)?.getTime() ?? 0;
                const tb = utcInstantToLocalDateTransform(b.invoiceDate)?.getTime() ?? 0;
                return tb - ta;
            });
        });

        return Array.from(map.entries())
            .map(([key, v]) => ({
                key,
                displayLabel: v.displayLabel,
                rows: v.rows,
            }))
            .sort((a, b) => a.displayLabel.localeCompare(b.displayLabel));
    }, [data, groupBy]);

    const groupKeysSig = React.useMemo(
        () => groups.map(g => g.key).join('\u0001'),
        [groups]
    );

    React.useEffect(() => {
        setExpandedGroups(new Set());
    }, [groupBy, groupKeysSig]);

    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={32} />
            </Box>
        );
    }

    const fmtMoney = (n: unknown) =>
        (Number(n) || 0).toLocaleString(undefined, amountOptions);

    return (
        <TableContainer>
            <Table size="small">
                <TableHead>
                    <TableRow>
                        <TableCell sx={{ width: 40, fontWeight: 700 }} aria-label="Expand" />
                        <TableCell sx={{ fontWeight: 700 }}>Invoice Number</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Creation Date</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Customer</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>
                            Total Amount
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Address</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Customer NTN</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Phone</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {groups.map(({ key: groupKey, displayLabel, rows: groupRows }) => {
                        const isExpanded = expandedGroups.has(groupKey);
                        const count = groupRows.length;
                        const groupSum = groupRows.reduce(
                            (acc: number, r: any) => acc + (Number(r?.total) || 0),
                            0
                        );
                        const toggleGroup = (e: React.MouseEvent) => {
                            e.stopPropagation();
                            setExpandedGroups(prev => {
                                const next = new Set(prev);
                                if (next.has(groupKey)) next.delete(groupKey);
                                else next.add(groupKey);
                                return next;
                            });
                        };
                        return (
                            <React.Fragment key={groupKey}>
                                <TableRow
                                    hover
                                    onClick={toggleGroup}
                                    sx={{
                                        cursor: 'pointer',
                                        bgcolor: '#eef6f6',
                                        '&:hover': { bgcolor: '#e0f2f1' },
                                    }}
                                >
                                    <TableCell
                                        sx={{
                                            width: 40,
                                            py: 1,
                                            verticalAlign: 'middle',
                                            borderBottom: `1px solid ${NAV_TEAL}33`,
                                        }}
                                    >
                                        {isExpanded ? (
                                            <KeyboardArrowDownIcon sx={{ fontSize: 20, color: NAV_TEAL }} />
                                        ) : (
                                            <KeyboardArrowRightIcon sx={{ fontSize: 20, color: NAV_TEAL }} />
                                        )}
                                    </TableCell>
                                    <TableCell
                                        colSpan={GROUP_HEADER_LABEL_COLSPAN}
                                        sx={{
                                            color: NAV_TEAL,
                                            fontWeight: 700,
                                            fontSize: 13,
                                            py: 1,
                                            borderBottom: `1px solid ${NAV_TEAL}33`,
                                        }}
                                    >
                                        {groupBy === 'customerPartyId' ? 'Customer: ' : 'Invoice date: '}
                                        {displayLabel}
                                        <Typography
                                            component="span"
                                            variant="body2"
                                            sx={{ ml: 0.75, fontWeight: 600, color: 'text.secondary' }}
                                        >
                                            ({count})
                                        </Typography>
                                    </TableCell>
                                    <TableCell
                                        align="right"
                                        sx={{
                                            fontWeight: 700,
                                            fontSize: 13,
                                            py: 1,
                                            borderBottom: `1px solid ${NAV_TEAL}33`,
                                        }}
                                    >
                                        {fmtMoney(groupSum)}
                                    </TableCell>
                                    <TableCell
                                        colSpan={GROUP_HEADER_TAIL_COLSPAN}
                                        sx={{ borderBottom: `1px solid ${NAV_TEAL}33` }}
                                    />
                                </TableRow>
                                {isExpanded
                                    ? groupRows.map((r: any) => (
                                          <TableRow
                                              key={r.id}
                                              hover
                                              sx={{ cursor: 'pointer' }}
                                              onClick={e => {
                                                  e.stopPropagation();
                                                  window.location.hash = `#/fbrInvoices/${encodeURIComponent(r.id)}`;
                                              }}
                                          >
                                              <TableCell />
                                              <TableCell>{r.reference ?? ''}</TableCell>
                                              <TableCell>
                                                  {utcInstantToLocalDateTransform(
                                                      r.createdAtUtc
                                                  )?.toLocaleString() ?? ''}
                                              </TableCell>
                                              <TableCell>
                                                  {utcInstantToLocalDateTransform(
                                                      r.invoiceDate
                                                  )?.toLocaleDateString() ?? ''}
                                              </TableCell>
                                              <TableCell>
                                                  {r.customerName ?? r.customerPartyId ?? ''}
                                              </TableCell>
                                              <TableCell>
                                                  <FbrInvoiceStatusChip record={r} />
                                              </TableCell>
                                              <TableCell align="right">{fmtMoney(r.total)}</TableCell>
                                              <TableCell>{r.customerAddress ?? ''}</TableCell>
                                              <TableCell>{r.customerNtn ?? ''}</TableCell>
                                              <TableCell>{r.customerPhone ?? ''}</TableCell>
                                          </TableRow>
                                      ))
                                    : null}
                            </React.Fragment>
                        );
                    })}
                </TableBody>
            </Table>
        </TableContainer>
    );
}

const PageTotalFooter = () => {
    const { data, isLoading } = useListContext();
    if (isLoading) return null;
    const rows = data ? Object.values(data) : [];
    const sum  = rows.reduce((acc: number, r: any) => acc + (Number(r?.total) || 0), 0);
    return (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1, px: 1 }}>
            <Typography variant="body2" fontWeight={700}>
                Total (this page): {sum.toLocaleString(undefined, amountOptions)}
            </Typography>
        </Box>
    );
};

const Title = () => {
    const { defaultTitle } = useListContext();
    return <span>{defaultTitle}</span>;
};

const FBR_INVOICE_RESOURCE = 'fbrInvoices';

type FbrInvoiceListRow = { id?: Identifier; status?: string; isLocked?: boolean; reference?: string };

function fbrInvoiceListRowsById(data: unknown): Map<string, FbrInvoiceListRow> {
    const m = new Map<string, FbrInvoiceListRow>();
    if (!Array.isArray(data)) return m;
    for (const raw of data) {
        if (!raw || typeof raw !== 'object') continue;
        const r = raw as FbrInvoiceListRow & { Id?: Identifier };
        const idVal = r.id ?? r.Id;
        if (idVal == null) continue;
        m.set(String(idVal), r);
    }
    return m;
}

/** Bulk FBR validate for draft rows only; matches single-invoice Validate (postFbrInvoiceValidate). */
function FbrInvoiceBulkValidateButton() {
    const { selectedIds = [], data } = useListContext();
    const refresh = useRefresh();
    const [busy, setBusy] = React.useState(false);
    const unselectAll = useUnselectAll(FBR_INVOICE_RESOURCE);
    const rowById = React.useMemo(() => fbrInvoiceListRowsById(data), [data]);

    const handleClick = async () => {
        const ids = (selectedIds as Identifier[]).map(String);
        if (ids.length === 0) return;

        const draftIds: string[] = [];
        let skipped = 0;
        for (const id of ids) {
            const r = rowById.get(id);
            const st = String(r?.status ?? '').toLowerCase();
            if (r?.isLocked || st !== 'ordered') {
                skipped++;
                continue;
            }
            draftIds.push(id);
        }

        if (draftIds.length === 0) {
            await Swal.fire({
                icon: 'info',
                title: 'Nothing to validate',
                text:
                    skipped > 0
                        ? 'Selected invoices are not in Draft status or are locked. Only drafts can be validated.'
                        : 'No invoices selected.',
            });
            return;
        }

        const confirm = await Swal.fire({
            title: 'Validate selected invoices?',
            html:
                `<p>This will send <b>${draftIds.length}</b> draft invoice(s) to FBR for validation.</p>` +
                (skipped > 0
                    ? `<p style="font-size:13px;color:#666">${skipped} selected row(s) will be skipped (not draft or locked).</p>`
                    : ''),
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Validate',
            cancelButtonText: 'Cancel',
        });
        if (!confirm.isConfirmed) return;

        setBusy(true);
        void Swal.fire({
            title: 'Validating with FBR…',
            html: '<p style="margin:12px 0;text-align:center">Starting…</p>',
            footer: '<small>Please wait — do not close this tab.</small>',
            allowOutsideClick: false,
            allowEscapeKey: false,
            showConfirmButton: false,
            didOpen: () => {
                Swal.showLoading();
            },
        });
        await new Promise<void>(resolve => {
            window.setTimeout(resolve, 100);
        });

        let ok = 0;
        let fail = 0;
        const failures: { ref: string; msg: string }[] = [];
        try {
            for (let i = 0; i < draftIds.length; i++) {
                const id = draftIds[i];
                const row = rowById.get(id);
                const refLabel = row?.reference || String(id).slice(0, 8);
                const safeRef = String(refLabel).replace(/</g, '&lt;');
                Swal.update({
                    html:
                        `<p style="margin:12px 0;text-align:center">Invoice <b>${i + 1}</b> of <b>${draftIds.length}</b></p>` +
                        `<p style="font-size:13px;color:#555;text-align:center">${safeRef || '—'}</p>`,
                });
                Swal.showLoading();
                try {
                    await postFbrInvoiceValidate(id);
                    ok++;
                } catch (e) {
                    fail++;
                    failures.push({
                        ref: refLabel,
                        msg: e instanceof Error ? e.message : String(e),
                    });
                }
            }
        } finally {
            Swal.close();
            setBusy(false);
        }

        refresh();
        unselectAll();

        const errBlock =
            failures.length > 0
                ? `<pre style="text-align:left;font-size:12px;max-height:240px;overflow:auto">${failures
                      .map(f => `${f.ref}: ${f.msg}`)
                      .join('\n')
                      .replace(/</g, '&lt;')}</pre>`
                : '';
        await Swal.fire({
            icon: fail > 0 ? (ok > 0 ? 'warning' : 'error') : 'success',
            title: 'Bulk validation finished',
            html:
                `<p>Validated: <b>${ok}</b> &nbsp; Failed: <b>${fail}</b></p>` +
                (skipped > 0 ? `<p>Skipped: <b>${skipped}</b></p>` : '') +
                (errBlock ? `<p style="margin-top:8px">Failed invoices stay as Draft; open each invoice to see the full error on file.</p>${errBlock}` : ''),
        });
    };

    return (
        <RaButton
            label={busy ? 'Validating…' : 'Validate'}
            onClick={() => void handleClick()}
            disabled={busy || selectedIds.length === 0}
        >
            {busy ? <CircularProgress size={18} sx={{ color: 'inherit' }} /> : <TaskAltOutlinedIcon />}
        </RaButton>
    );
}

function FbrInvoiceBulkActionButtons() {
    return (
        <>
            <FbrInvoiceBulkValidateButton />
            <BulkDeleteButton />
        </>
    );
}

export default function FbrInvoiceList() {
    const [view] = useStore<'list' | 'kanban'>('fbrInvoices.listView', 'list');
    const [groupBy] = useStore<FbrInvoiceGroupByMode>(FBR_INVOICE_GROUP_BY_STORE_KEY, 'none');
    return (
        <List
            resource="fbrInvoices"
            sort={{ field: 'invoiceDate', order: 'DESC' }}
            perPage={25}
            actions={<OdooListActions />}
            title={<Title />}
        >
            {view === 'kanban' ? (
                <InvoiceKanban />
            ) : groupBy !== 'none' ? (
                <>
                    <FbrGroupedDataTable />
                    <PageTotalFooter />
                </>
            ) : (
                <>
                    <DataTable
                        rowClick="edit"
                        storeKey={FBR_INVOICE_COLUMNS_STORE_KEY}
                        bulkActionButtons={<FbrInvoiceBulkActionButtons />}
                        hiddenColumns={[
                            // default: keep “maximum” available, but start compact
                            'customerPartyId',
                            'paymentTerms',
                            'validatedAtUtc',
                            'postedAtUtc',
                            'fbrInvoiceNumber',
                            'deliveryFees',
                            'taxes',
                            'totalExTaxes',
                            'returned',
                            'fbrScenarioId',
                        ]}
                    >
                        <Column source="reference" label="Invoice Number" />
                        <Column source="createdAtUtc" label="Creation Date">
                            <DateField
                                source="createdAtUtc"
                                showTime
                                transform={utcInstantToLocalDateTransform as (v: unknown) => Date}
                            />
                        </Column>
                        <Column source="invoiceDate" label="Date">
                            <DateField
                                source="invoiceDate"
                                transform={utcInstantToLocalDateTransform as (v: unknown) => Date}
                            />
                        </Column>
                        <Column source="customerName" label="Customer" disableSort>
                            <FunctionField label="" render={(r: any) => r?.customerName ?? r?.customerPartyId ?? ''} />
                        </Column>
                        <Column source="status" label="Status" disableSort>
                            <OdooStatusField />
                        </Column>

                        <ColumnNumber source="total" label="Total Amount" options={amountOptions} />

                        {/* Extra columns available via Columns button */}
                        <Column source="customerPartyId" label="Customer ID" />
                        <Column source="customerAddress" label="Address" disableSort />
                        <Column source="customerNtn" label="Customer NTN" disableSort />
                        <Column source="customerPhone" label="Phone" disableSort />
                        <Column source="paymentTerms" label="Payment Terms" />
                        <Column source="returned" label="Returned" />
                        <Column source="fbrInvoiceNumber" label="FBR Invoice No." />
                        <Column source="validatedAtUtc" label="Validated At">
                            <DateField
                                source="validatedAtUtc"
                                showTime
                                transform={utcInstantToLocalDateTransform as (v: unknown) => Date}
                            />
                        </Column>
                        <Column source="postedAtUtc" label="Posted At">
                            <DateField
                                source="postedAtUtc"
                                showTime
                                transform={utcInstantToLocalDateTransform as (v: unknown) => Date}
                            />
                        </Column>
                        <Column source="fbrScenarioId" label="FBR Scenario" />
                        <ColumnNumber source="totalExTaxes" label="Total ex taxes" options={amountOptions} />
                        <ColumnNumber source="deliveryFees" label="Delivery fees" options={amountOptions} />
                        <ColumnNumber source="taxes" label="Taxes" options={amountOptions} />
                    </DataTable>
                    <PageTotalFooter />
                </>
            )}
        </List>
    );
}

const Column = DataTable.Col<any>;
const ColumnNumber = DataTable.NumberCol<any>;

function InvoiceKanban() {
    const { data, isLoading } = useListContext();
    if (isLoading) return null;
    const rows = data ? Object.values(data) : [];
    return (
        <Box sx={{ p: 1 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 1.5 }}>
                {rows.map((r: any) => {
                    const logo = r?.customerBusinessLogo
                        ? `${API_BASE_URL}/${String(r.customerBusinessLogo).replace(/^\/+/, '')}`
                        : null;
                    const displayName = (r?.customerName as string | undefined) || 'Customer';
                    const initials = displayName.split(' ').filter(Boolean).slice(0, 2).map((s: string) => s[0]?.toUpperCase()).join('');
                    return (
                        <Paper
                            key={r.id}
                            variant="outlined"
                            sx={{ p: 1.25, cursor: 'pointer', '&:hover': { borderColor: 'text.primary' } }}
                            onClick={() => (window.location.hash = `#/fbrInvoices/${encodeURIComponent(r.id)}`)}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box sx={{ width: 36, height: 36, borderRadius: 1, border: '1px solid', borderColor: 'divider', overflow: 'hidden', bgcolor: 'background.default', flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary', fontSize: 12, fontWeight: 700 }}>
                                    {logo ? <Box component="img" src={logo} alt="logo" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials || '—'}
                                </Box>
                                <Box sx={{ minWidth: 0 }}>
                                    <Typography variant="body2" fontWeight={700} noWrap>{displayName}</Typography>
                                    <Typography variant="caption" color="text.secondary" noWrap>{r.reference}</Typography>
                                </Box>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                                <Typography variant="caption" color="text.secondary">
                                    {r.invoiceDate
                                        ? (utcInstantToLocalDateTransform(r.invoiceDate)?.toLocaleDateString() ??
                                          '')
                                        : ''}
                                </Typography>
                                <Typography variant="body2" fontWeight={700}>{(Number(r.total) || 0).toLocaleString(undefined, amountOptions)}</Typography>
                            </Box>
                        </Paper>
                    );
                })}
            </Box>
        </Box>
    );
}