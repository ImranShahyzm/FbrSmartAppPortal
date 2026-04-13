import * as React from 'react';
import {
    BulkDeleteButton,
    ColumnsButton,
    DataTable,
    FunctionField,
    List,
    TextField,
    TopToolbar,
    useCreatePath,
    useListContext,
    useNotify,
    useRedirect,
    useRefresh,
    useStore,
    useTranslate,
    type Identifier,
} from 'react-admin';
import { Link } from 'react-router-dom';
import {
    Box,
    Button,
    Chip,
    CircularProgress,
    Divider,
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
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import FilterListIcon from '@mui/icons-material/FilterList';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewKanbanOutlinedIcon from '@mui/icons-material/ViewKanbanOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import ShowChartOutlinedIcon from '@mui/icons-material/ShowChartOutlined';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import StarBorderOutlinedIcon from '@mui/icons-material/StarBorderOutlined';
import UploadOutlinedIcon from '@mui/icons-material/UploadOutlined';

import { apiFetch } from '../api/httpClient';
import { FbrPillChip } from '../common/fbrPillChip';
import { useAccountingAccess } from './useAccountingAccess';
import { VOUCHER_SYSTEM_TYPE_CHOICES, voucherSystemTypeLabel } from './voucherTypeConstants';

const NAV_TEAL = '#3d7a7a';
const NAV_TEAL_DARK = '#2e6262';

const GL_VOUCHER_TYPES_COLUMNS_STORE_KEY = 'glVoucherTypes.columns';
const GL_VOUCHER_TYPES_COLUMNS_BUTTON_ID = 'glVoucherTypes.columnsButton';
const GL_VOUCHER_TYPES_GROUP_BY_STORE_KEY = 'glVoucherTypes.groupBy';

export type GlVoucherTypeGroupByMode = 'none' | 'systemType' | 'currencyLabel';

const SYSTEM_TYPE_FILTER_OPTIONS: { value: string; label: string }[] = [
    { value: '', label: 'All types' },
    ...VOUCHER_SYSTEM_TYPE_CHOICES.map(c => ({ value: String(c.id), label: c.name })),
];

const VOUCHER_STATUS_FILTER_OPTIONS: { value: string; label: string }[] = [
    { value: '', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
];

const GROUP_BY_OPTIONS: { value: GlVoucherTypeGroupByMode; label: string }[] = [
    { value: 'none', label: 'None' },
    { value: 'systemType', label: 'System type' },
    { value: 'currencyLabel', label: 'Currency' },
];

function Title() {
    const { defaultTitle } = useListContext();
    return <span>{defaultTitle}</span>;
}

function EmptyVoucherTypes() {
    const translate = useTranslate();
    const notify = useNotify();
    const refresh = useRefresh();
    const canCreate = useAccountingAccess('glVoucherTypes', 'create');

    const onSeed = async () => {
        try {
            const res = await apiFetch('/api/glVoucherTypes/seed-defaults', { method: 'POST' });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) {
                const msg =
                    typeof body?.message === 'string'
                        ? body.message
                        : res.status === 409
                          ? String(body?.message ?? 'Already has voucher types.')
                          : `Request failed (${res.status})`;
                throw new Error(msg);
            }
            notify(translate('shell.accounting.voucher_types_seeded', { _: 'Default voucher types loaded.' }), {
                type: 'success',
            });
            refresh();
        } catch (e) {
            notify(e instanceof Error ? e.message : 'Failed to load defaults', { type: 'error' });
        }
    };

    return (
        <Box sx={{ py: 4, px: 2, textAlign: 'center', maxWidth: 420, mx: 'auto' }}>
            <Typography variant="body1" color="text.secondary" paragraph>
                {translate('shell.accounting.voucher_types_empty', {
                    _: 'No voucher types for this company yet. Load a starter set or create one manually.',
                })}
            </Typography>
            {canCreate ? (
                <Button variant="contained" color="primary" onClick={() => void onSeed()} sx={{ textTransform: 'none' }}>
                    {translate('shell.accounting.load_default_voucher_types', { _: 'Load default voucher types' })}
                </Button>
            ) : null}
        </Box>
    );
}

type StatusChipCfg = { label: string; bg: string; color: string; border: string };

const VOUCHER_ACTIVE_STYLE: StatusChipCfg = {
    label: 'Active',
    bg: '#1b5e20',
    color: '#ffffff',
    border: '#1b5e20',
};

const VOUCHER_INACTIVE_STYLE: StatusChipCfg = {
    label: 'Inactive',
    bg: '#ffffff',
    color: '#616161',
    border: '#bdbdbd',
};

function GlVoucherTypeStatusChip({ record }: { record: { status?: boolean } }) {
    const active = Boolean(record?.status);
    const cfg = active ? VOUCHER_ACTIVE_STYLE : VOUCHER_INACTIVE_STYLE;
    return <FbrPillChip tone={{ label: cfg.label, bg: cfg.bg, color: cfg.color, border: cfg.border }} />;
}

const VoucherTypeStatusField = () => (
    <FunctionField label="Status" render={(record: { status?: boolean }) => <GlVoucherTypeStatusChip record={record} />} />
);

type GlGroupedSection = { key: string; displayLabel: string; rows: Record<string, unknown>[] };

function GlVoucherTypeGroupedDataTable() {
    const translate = useTranslate();
    const redirect = useRedirect();
    const { data, isLoading } = useListContext();
    const [groupBy] = useStore<GlVoucherTypeGroupByMode>(GL_VOUCHER_TYPES_GROUP_BY_STORE_KEY, 'none');
    const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(() => new Set());

    const groups = React.useMemo((): GlGroupedSection[] => {
        if (groupBy === 'none') return [];
        const arr = data ? (Object.values(data) as Record<string, unknown>[]) : [];
        const map = new Map<string, { displayLabel: string; rows: Record<string, unknown>[] }>();

        for (const r of arr) {
            if (groupBy === 'systemType') {
                const st = r.systemType;
                const uniqueKey = `st:${String(st ?? '')}`;
                const displayLabel = voucherSystemTypeLabel(
                    typeof st === 'number' ? st : Number(st)
                );
                const prev = map.get(uniqueKey);
                if (prev) prev.rows.push(r);
                else map.set(uniqueKey, { displayLabel, rows: [r] });
            } else {
                const cur = String(r.currencyLabel ?? '').trim() || '—';
                const uniqueKey = `cur:${cur}`;
                const prev = map.get(uniqueKey);
                if (prev) prev.rows.push(r);
                else map.set(uniqueKey, { displayLabel: cur, rows: [r] });
            }
        }

        return Array.from(map.entries())
            .map(([key, v]) => ({
                key,
                displayLabel: v.displayLabel,
                rows: v.rows,
            }))
            .sort((a, b) => a.displayLabel.localeCompare(b.displayLabel));
    }, [data, groupBy]);

    const groupKeysSig = React.useMemo(() => groups.map(g => g.key).join('\u0001'), [groups]);

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

    return (
        <TableContainer>
            <Table size="small">
                <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.100' }}>
                        <TableCell sx={{ width: 40, fontWeight: 700 }} aria-label="Expand" />
                        <TableCell sx={{ fontWeight: 700 }}>
                            {translate('resources.glVoucherTypes.fields.title')}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>
                            {translate('resources.glVoucherTypes.fields.prefix_on_documents')}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>
                            {translate('resources.glVoucherTypes.fields.system_type')}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>
                            {translate('resources.glVoucherTypes.fields.currency')}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>
                            {translate('resources.glVoucherTypes.fields.status')}
                        </TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {groups.map(({ key: groupKey, displayLabel, rows: groupRows }) => {
                        const isExpanded = expandedGroups.has(groupKey);
                        const count = groupRows.length;
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
                                    <TableCell sx={{ width: 40, py: 1, verticalAlign: 'middle' }}>
                                        {isExpanded ? (
                                            <KeyboardArrowDownIcon sx={{ fontSize: 20, color: NAV_TEAL }} />
                                        ) : (
                                            <KeyboardArrowRightIcon sx={{ fontSize: 20, color: NAV_TEAL }} />
                                        )}
                                    </TableCell>
                                    <TableCell
                                        colSpan={5}
                                        sx={{
                                            color: NAV_TEAL,
                                            fontWeight: 700,
                                            fontSize: 13,
                                            py: 1,
                                            borderBottom: `1px solid ${NAV_TEAL}33`,
                                        }}
                                    >
                                        {groupBy === 'systemType' ? 'System type: ' : 'Currency: '}
                                        {displayLabel}
                                        <Typography
                                            component="span"
                                            variant="body2"
                                            sx={{ ml: 0.75, fontWeight: 600, color: 'text.secondary' }}
                                        >
                                            ({count})
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                                {isExpanded
                                    ? groupRows.map(r => {
                                          const id = r.id ?? r.Id;
                                          return (
                                              <TableRow
                                                  key={String(id)}
                                                  hover
                                                  sx={{ cursor: 'pointer' }}
                                                  onClick={e => {
                                                      e.stopPropagation();
                                                      redirect('edit', 'glVoucherTypes', id as Identifier);
                                                  }}
                                              >
                                                  <TableCell />
                                                  <TableCell>{String(r.title ?? '')}</TableCell>
                                                  <TableCell>{String(r.documentPrefix ?? '') || '—'}</TableCell>
                                                  <TableCell>
                                                      {voucherSystemTypeLabel(
                                                          typeof r.systemType === 'number'
                                                              ? r.systemType
                                                              : Number(r.systemType)
                                                      )}
                                                  </TableCell>
                                                  <TableCell>{String(r.currencyLabel ?? '') || '—'}</TableCell>
                                                  <TableCell>
                                                      <GlVoucherTypeStatusChip
                                                          record={{ status: Boolean(r.status) }}
                                                      />
                                                  </TableCell>
                                              </TableRow>
                                          );
                                      })
                                    : null}
                            </React.Fragment>
                        );
                    })}
                </TableBody>
            </Table>
        </TableContainer>
    );
}

function VoucherTypeListToolbar() {
    const translate = useTranslate();
    const notify = useNotify();
    const refresh = useRefresh();
    const createPath = useCreatePath();
    const { filterValues, setFilters, page, perPage, total, setPage, refetch } = useListContext();
    const [groupBy, setGroupBy] = useStore<GlVoucherTypeGroupByMode>(
        GL_VOUCHER_TYPES_GROUP_BY_STORE_KEY,
        'none'
    );
    const [view, setView] = useStore<'list' | 'kanban' | 'calendar' | 'pivot' | 'graph' | 'activity'>(
        'glVoucherTypes.listView',
        'list'
    );
    const [myFilter, setMyFilter] = React.useState(true);
    const [q, setQ] = React.useState<string>(String((filterValues as Record<string, unknown>)?.q ?? ''));
    const [uploadMenuAnchor, setUploadMenuAnchor] = React.useState<null | HTMLElement>(null);
    const [settingsMenuAnchor, setSettingsMenuAnchor] = React.useState<null | HTMLElement>(null);
    const [searchPanelOpen, setSearchPanelOpen] = React.useState(false);
    const searchBarRef = React.useRef<HTMLDivElement | null>(null);
    const canCreate = useAccountingAccess('glVoucherTypes', 'create');

    const closeSearchPanel = React.useCallback(() => setSearchPanelOpen(false), []);
    const toggleSearchPanel = React.useCallback(() => setSearchPanelOpen(o => !o), []);

    const currentSystemType = String((filterValues as Record<string, unknown>)?.systemType ?? '');
    const systemTypeChipLabel =
        SYSTEM_TYPE_FILTER_OPTIONS.find(o => o.value === currentSystemType)?.label ?? currentSystemType;

    const currentStatus = String((filterValues as Record<string, unknown>)?.status ?? '');
    const statusChipLabel =
        VOUCHER_STATUS_FILTER_OPTIONS.find(o => o.value === currentStatus)?.label ?? currentStatus;

    const onSeedDefaults = React.useCallback(async () => {
        setUploadMenuAnchor(null);
        try {
            const res = await apiFetch('/api/glVoucherTypes/seed-defaults', { method: 'POST' });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) {
                const msg =
                    typeof body?.message === 'string'
                        ? body.message
                        : res.status === 409
                          ? String(body?.message ?? 'Already has voucher types.')
                          : `Request failed (${res.status})`;
                throw new Error(msg);
            }
            notify(translate('shell.accounting.voucher_types_seeded', { _: 'Default voucher types loaded.' }), {
                type: 'success',
            });
            if (typeof refetch === 'function') refetch();
            else refresh();
        } catch (e) {
            notify(e instanceof Error ? e.message : 'Failed to load defaults', { type: 'error' });
        }
    }, [notify, refresh, refetch, translate]);

    React.useEffect(() => {
        setQ(String((filterValues as Record<string, unknown>)?.q ?? ''));
    }, [(filterValues as Record<string, unknown>)?.q]);

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
    const pageEnd = total ? Math.min(page * perPage, total) : 0;

    const viewButtons = [
        { key: 'list' as const, icon: <ViewListIcon fontSize="small" />, label: 'List' },
        { key: 'kanban' as const, icon: <ViewKanbanOutlinedIcon fontSize="small" />, label: 'Kanban' },
        { key: 'calendar' as const, icon: <CalendarMonthOutlinedIcon fontSize="small" />, label: 'Calendar', disabled: true },
        { key: 'pivot' as const, icon: <TableChartOutlinedIcon fontSize="small" />, label: 'Pivot', disabled: true },
        { key: 'graph' as const, icon: <ShowChartOutlinedIcon fontSize="small" />, label: 'Graph', disabled: true },
        { key: 'activity' as const, icon: <AccessTimeIcon fontSize="small" />, label: 'Activity', disabled: true },
    ];

    return (
        <TopToolbar
            sx={{
                width: '100%',
                p: 0,
                minHeight: 'unset',
                flexDirection: 'column',
                pt: { xs: '4px', md: '12px' },
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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', flex: '0 0 auto' }}>
                    {canCreate ? (
                        <Button
                            component={Link}
                            to={createPath({ resource: 'glVoucherTypes', type: 'create' })}
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
                    ) : null}

                    {canCreate ? (
                        <>
                            <Button
                                variant="outlined"
                                size="small"
                                startIcon={<UploadOutlinedIcon sx={{ fontSize: '16px !important' }} />}
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
                                        void onSeedDefaults();
                                    }}
                                >
                                    {translate('shell.accounting.load_default_voucher_types', {
                                        _: 'Load default voucher types',
                                    })}
                                </MenuItem>
                            </Menu>
                        </>
                    ) : null}

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 0.5 }}>
                        <Typography variant="body1" sx={{ fontWeight: 700, fontSize: 15, color: 'text.primary' }}>
                            {translate('resources.glVoucherTypes.name', { smart_count: 2 })}
                        </Typography>
                        <IconButton
                            size="small"
                            sx={{ color: 'text.secondary', p: '2px' }}
                            onClick={ev => setSettingsMenuAnchor(ev.currentTarget)}
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
                                        GL_VOUCHER_TYPES_COLUMNS_BUTTON_ID
                                    ) as HTMLButtonElement | null;
                                    el?.click();
                                }}
                            >
                                Choose columns
                            </MenuItem>
                        </Menu>

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
                                id={GL_VOUCHER_TYPES_COLUMNS_BUTTON_ID}
                                storeKey={GL_VOUCHER_TYPES_COLUMNS_STORE_KEY}
                                sx={{ minWidth: 0, px: '6px' }}
                            />
                        </Box>
                    </Box>
                </Box>

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
                                label={translate('shell.accounting.voucher_types_quick_filter', {
                                    _: 'Active templates',
                                })}
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

                        {currentSystemType ? (
                            <Chip
                                label={systemTypeChipLabel}
                                size="small"
                                onDelete={() => {
                                    const fv = { ...(filterValues as Record<string, unknown>) };
                                    delete fv.systemType;
                                    setFilters(fv as any, null);
                                    setPage(1);
                                }}
                                sx={{
                                    ml: 0.5,
                                    height: 22,
                                    borderRadius: '999px',
                                    fontWeight: 600,
                                    fontSize: 12,
                                    maxWidth: 200,
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
                                    width: { xs: 'min(100vw - 24px, 520px)', sm: 720 },
                                    maxWidth: 'calc(100vw - 24px)',
                                    overflow: 'hidden',
                                },
                            },
                        }}
                    >
                        <Box sx={{ display: 'flex', minHeight: 220 }}>
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
                                    {VOUCHER_STATUS_FILTER_OPTIONS.map(opt => {
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
                                                    '&.Mui-selected': { bgcolor: 'action.selected' },
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
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ px: 1.5, display: 'block', mb: 0.5, mt: 1 }}
                                >
                                    System type
                                </Typography>
                                <MuiList disablePadding sx={{ py: 0 }}>
                                    {SYSTEM_TYPE_FILTER_OPTIONS.map(opt => {
                                        const active = currentSystemType === opt.value;
                                        return (
                                            <ListItemButton
                                                key={opt.value || 'all'}
                                                selected={active}
                                                dense
                                                onClick={() => {
                                                    const fv = {
                                                        ...(filterValues as Record<string, unknown>),
                                                    };
                                                    if (opt.value) fv.systemType = Number(opt.value);
                                                    else delete fv.systemType;
                                                    setFilters(fv as any, null);
                                                    setPage(1);
                                                }}
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

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: '0 0 auto' }}>
                    {total != null && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                            <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ fontSize: 12, whiteSpace: 'nowrap' }}
                            >
                                {pageStart}–{pageEnd} / {total}
                            </Typography>
                            <IconButton size="small" disabled={page <= 1} onClick={() => setPage(page - 1)} sx={{ p: '2px' }}>
                                <NavigateBeforeIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                            <IconButton
                                size="small"
                                disabled={pageEnd >= (total ?? 0)}
                                onClick={() => setPage(page + 1)}
                                sx={{ p: '2px' }}
                            >
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
                                        color: view === key ? NAV_TEAL : 'text.secondary',
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

const PageTotalFooter = () => {
    const { data, isLoading } = useListContext();
    if (isLoading) return null;
    const rows = data ? Object.values(data) : [];
    return (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1, px: 1 }}>
            <Typography variant="body2" fontWeight={700}>
                Rows (this page): {rows.length}
            </Typography>
        </Box>
    );
};

function VoucherTypeKanban() {
    const { data, isLoading } = useListContext();
    const translate = useTranslate();
    const redirect = useRedirect();
    if (isLoading) return null;
    const rows = data ? (Object.values(data) as Record<string, unknown>[]) : [];
    return (
        <Box sx={{ p: 1 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 1.5 }}>
                {rows.map(r => {
                    const id = r.id ?? r.Id;
                    const title = String(r.title ?? '—');
                    const prefix = String(r.documentPrefix ?? '').trim();
                    return (
                        <Paper
                            key={String(id)}
                            variant="outlined"
                            sx={{
                                p: 1.25,
                                cursor: 'pointer',
                                '&:hover': { borderColor: 'text.primary' },
                            }}
                            onClick={() => redirect('edit', 'glVoucherTypes', id as Identifier)}
                        >
                            <Typography variant="body2" fontWeight={700} noWrap>
                                {title}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block" noWrap sx={{ mt: 0.5 }}>
                                {prefix || translate('resources.glVoucherTypes.fields.prefix_on_documents')}
                            </Typography>
                            <Box sx={{ mt: 1 }}>
                                <GlVoucherTypeStatusChip record={{ status: Boolean(r.status) }} />
                            </Box>
                        </Paper>
                    );
                })}
            </Box>
        </Box>
    );
}

const Column = DataTable.Col<any>;

function VoucherTypeBulkActions() {
    const canDelete = useAccountingAccess('glVoucherTypes', 'delete');
    if (!canDelete) return false;
    return <BulkDeleteButton />;
}

export function GlVoucherTypeList() {
    const translate = useTranslate();
    const [view] = useStore<'list' | 'kanban' | 'calendar' | 'pivot' | 'graph' | 'activity'>(
        'glVoucherTypes.listView',
        'list'
    );
    const [groupBy] = useStore<GlVoucherTypeGroupByMode>(GL_VOUCHER_TYPES_GROUP_BY_STORE_KEY, 'none');

    return (
        <List
            resource="glVoucherTypes"
            sort={{ field: 'title', order: 'ASC' }}
            perPage={25}
            actions={<VoucherTypeListToolbar />}
            empty={<EmptyVoucherTypes />}
            title={<Title />}
            sx={{
                '& .RaList-main': { maxWidth: '100%' },
                '& .RaList-content': { overflowX: 'auto' },
            }}
        >
            {view === 'kanban' ? (
                <VoucherTypeKanban />
            ) : groupBy !== 'none' ? (
                <>
                    <GlVoucherTypeGroupedDataTable />
                    <PageTotalFooter />
                </>
            ) : (
                <>
                    <DataTable
                        rowClick="edit"
                        bulkActionButtons={<VoucherTypeBulkActions />}
                        storeKey={GL_VOUCHER_TYPES_COLUMNS_STORE_KEY}
                        sx={{
                            '& .MuiTableCell-head': {
                                bgcolor: 'grey.100',
                                fontWeight: 700,
                                borderBottom: '2px solid',
                                borderColor: 'divider',
                            },
                            '& .MuiTableCell-body': {
                                borderBottom: '1px solid',
                                borderColor: 'divider',
                            },
                        }}
                        hiddenColumns={[
                            'description',
                            'entryBy',
                            'companyid',
                            'userID',
                            'currencyId',
                            'showBankAndChequeDate',
                            'showToPartyV',
                            'interTransferPolicy',
                            'showToAccountBook',
                            'defaultControlGlAccountId',
                            'controlAccountTxnNature',
                            'defaultIncomeGlAccountId',
                            'signatureSlotCount',
                            'signatureName1',
                            'signatureName2',
                            'signatureName3',
                            'signatureName4',
                        ]}
                    >
                        <Column source="title" label={translate('resources.glVoucherTypes.fields.title')} />
                        <Column
                            source="documentPrefix"
                            label={translate('resources.glVoucherTypes.fields.prefix_on_documents')}
                        >
                            <TextField source="documentPrefix" label={false} emptyText="—" />
                        </Column>
                        <Column
                            source="systemType"
                            label={translate('resources.glVoucherTypes.fields.system_type')}
                            disableSort
                        >
                            <FunctionField
                                label=""
                                render={(r: { systemType?: number }) => voucherSystemTypeLabel(r.systemType)}
                            />
                        </Column>
                        <Column
                            source="currencyLabel"
                            label={translate('resources.glVoucherTypes.fields.currency')}
                            disableSort
                        >
                            <TextField source="currencyLabel" label={false} emptyText="—" />
                        </Column>
                        <Column source="status" label={translate('resources.glVoucherTypes.fields.status')} disableSort>
                            <VoucherTypeStatusField />
                        </Column>
                        <Column
                            source="description"
                            label={translate('resources.glVoucherTypes.fields.description', { _: 'Description' })}
                        >
                            <TextField source="description" label={false} emptyText="—" />
                        </Column>
                        <Column source="entryBy" label={translate('resources.glVoucherTypes.fields.entry_by_audit')}>
                            <TextField source="entryBy" label={false} emptyText="—" />
                        </Column>
                    </DataTable>
                    <PageTotalFooter />
                </>
            )}
        </List>
    );
}

export default GlVoucherTypeList;
