import * as React from 'react';
import {
    BulkDeleteButton,
    ColumnsButton,
    DataTable,
    DateField,
    FunctionField,
    List,
    TextField,
    TopToolbar,
    useCreatePath,
    useListContext,
    useRedirect,
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

import { FbrPillChip } from '../common/fbrPillChip';
import { formatMoneyTotals } from './glJournalVoucherMoney';
import { useAccountingAccess } from './useAccountingAccess';
import { VOUCHER_SYSTEM_TYPE_CHOICES } from './voucherTypeConstants';

const NAV_TEAL = '#3d7a7a';
const NAV_TEAL_DARK = '#2e6262';

/** Matches miscellaneous journal vouchers in create flow. */
const MISC_SYSTEM_TYPE = 5;

const GL_JOURNAL_VOUCHERS_COLUMNS_STORE_KEY = 'glJournalVouchers.columns';
const GL_JOURNAL_VOUCHERS_COLUMNS_BUTTON_ID = 'glJournalVouchers.columnsButton';
const GL_JOURNAL_VOUCHERS_GROUP_BY_STORE_KEY = 'glJournalVouchers.groupBy';

export type GlJournalVoucherGroupByMode =
    | 'none'
    | 'journalTitle'
    | 'voucherDateDay'
    | 'approvalStatusCode';

const POSTED_LEDGER_FILTER_OPTIONS: { value: string; label: string }[] = [
    { value: '', label: 'All' },
    { value: 'false', label: 'Not posted' },
    { value: 'true', label: 'Posted' },
];

const APPROVAL_FILTER_OPTIONS: { value: string; label: string }[] = [
    { value: '', label: 'All' },
    { value: 'draft', label: 'Draft' },
    { value: 'approved', label: 'Approved' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'posted', label: 'Posted' },
    { value: 'deleted', label: 'Deleted' },
];

const SYSTEM_TYPE_FILTER_OPTIONS: { value: string; label: string }[] = [
    { value: '', label: 'All journals' },
    ...VOUCHER_SYSTEM_TYPE_CHOICES.map(c => ({ value: String(c.id), label: c.name })),
];

const GROUP_BY_OPTIONS: { value: GlJournalVoucherGroupByMode; label: string }[] = [
    { value: 'none', label: 'None' },
    { value: 'journalTitle', label: 'Journal' },
    { value: 'voucherDateDay', label: 'Accounting date' },
    { value: 'approvalStatusCode', label: 'Workflow status' },
];

function Title() {
    const { defaultTitle } = useListContext();
    return <span>{defaultTitle}</span>;
}

function EmptyJournalVouchers() {
    const translate = useTranslate();
    const createPath = useCreatePath();
    const canCreate = useAccountingAccess('glJournalVouchers', 'create');
    return (
        <Box sx={{ py: 4, px: 2, textAlign: 'center', maxWidth: 480, mx: 'auto' }}>
            <Typography variant="body1" color="text.secondary" paragraph>
                {translate('shell.accounting.journal_vouchers_empty', {
                    _: 'No journal vouchers match your filters.',
                })}
            </Typography>
            {canCreate ? (
                <Button
                    component={Link}
                    to={createPath({ resource: 'glJournalVouchers', type: 'create' })}
                    variant="contained"
                    color="primary"
                    sx={{ textTransform: 'none' }}
                >
                    {translate('resources.glJournalVouchers.create_title')}
                </Button>
            ) : null}
        </Box>
    );
}

function workflowPillTone(
    code: string,
    translate: ReturnType<typeof useTranslate>
): { label: string; bg: string; color: string; border: string } {
    const c = String(code ?? 'draft').toLowerCase();
    switch (c) {
        case 'draft':
            return {
                label: translate('resources.glJournalVouchers.workflow.draft'),
                bg: '#e3f2fd',
                color: '#1565c0',
                border: '#90caf9',
            };
        case 'approved':
            return {
                label: translate('resources.glJournalVouchers.workflow.approved'),
                bg: '#fff8e1',
                color: '#f57f17',
                border: '#ffe082',
            };
        case 'confirmed':
            return {
                label: translate('resources.glJournalVouchers.workflow.confirmed'),
                bg: '#43a047',
                color: '#ffffff',
                border: '#43a047',
            };
        case 'posted':
            return {
                label: translate('resources.glJournalVouchers.workflow.posted'),
                bg: '#1b5e20',
                color: '#ffffff',
                border: '#1b5e20',
            };
        case 'deleted':
            return {
                label: translate('resources.glJournalVouchers.workflow.deleted'),
                bg: '#ffebee',
                color: '#c62828',
                border: '#ef9a9a',
            };
        default:
            return {
                label: c || '—',
                bg: '#f5f5f5',
                color: '#616161',
                border: '#e0e0e0',
            };
    }
}

function JournalWorkflowChip({ record }: { record: { approvalStatusCode?: string } }) {
    const translate = useTranslate();
    const code = String(record?.approvalStatusCode ?? 'draft');
    return <FbrPillChip tone={workflowPillTone(code, translate)} />;
}

function formatVoucherDate(v: unknown): string {
    if (v == null) return '—';
    const d = v instanceof Date ? v : new Date(String(v));
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString();
}

function voucherDateDayKey(v: unknown): string {
    const d = v instanceof Date ? v : new Date(String(v));
    if (Number.isNaN(d.getTime())) return '—';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

type JvGroupedSection = { key: string; displayLabel: string; rows: Record<string, unknown>[] };

function GlJournalVoucherGroupedDataTable() {
    const translate = useTranslate();
    const redirect = useRedirect();
    const { data, isLoading } = useListContext();
    const [groupBy] = useStore<GlJournalVoucherGroupByMode>(GL_JOURNAL_VOUCHERS_GROUP_BY_STORE_KEY, 'none');
    const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(() => new Set());

    const groups = React.useMemo((): JvGroupedSection[] => {
        if (groupBy === 'none') return [];
        const arr = data ? (Object.values(data) as Record<string, unknown>[]) : [];
        const map = new Map<string, { displayLabel: string; rows: Record<string, unknown>[] }>();

        for (const r of arr) {
            let uniqueKey: string;
            let displayLabel: string;
            if (groupBy === 'journalTitle') {
                const j = String(r.journalTitle ?? '').trim() || '—';
                uniqueKey = `j:${j}`;
                displayLabel = j;
            } else if (groupBy === 'voucherDateDay') {
                const day = voucherDateDayKey(r.voucherDate);
                uniqueKey = `d:${day}`;
                displayLabel = day === '—' ? '—' : day;
            } else {
                const code = String(r.approvalStatusCode ?? 'draft').toLowerCase();
                uniqueKey = `a:${code}`;
                displayLabel = workflowPillTone(code, translate).label;
            }
            const prev = map.get(uniqueKey);
            if (prev) prev.rows.push(r);
            else map.set(uniqueKey, { displayLabel, rows: [r] });
        }

        return Array.from(map.entries())
            .map(([key, v]) => ({
                key,
                displayLabel: v.displayLabel,
                rows: v.rows,
            }))
            .sort((a, b) => a.displayLabel.localeCompare(b.displayLabel));
    }, [data, groupBy, translate]);

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

    const groupPrefix =
        groupBy === 'journalTitle'
            ? `${translate('resources.glJournalVouchers.fields.journal')}: `
            : groupBy === 'voucherDateDay'
              ? `${translate('resources.glJournalVouchers.fields.voucher_date')}: `
              : `${translate('resources.glJournalVouchers.fields.status')}: `;

    return (
        <TableContainer>
            <Table size="small">
                <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.100' }}>
                        <TableCell sx={{ width: 40, fontWeight: 700 }} aria-label="Expand" />
                        <TableCell sx={{ fontWeight: 700 }}>
                            {translate('resources.glJournalVouchers.fields.voucher_no')}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>
                            {translate('resources.glJournalVouchers.fields.voucher_date')}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>
                            {translate('resources.glJournalVouchers.fields.journal')}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>
                            {translate('resources.glJournalVouchers.fields.status')}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>
                            {translate('resources.glJournalVouchers.fields.total_dr')}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>
                            {translate('resources.glJournalVouchers.fields.total_cr')}
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
                                        colSpan={6}
                                        sx={{
                                            color: NAV_TEAL,
                                            fontWeight: 700,
                                            fontSize: 13,
                                            py: 1,
                                            borderBottom: `1px solid ${NAV_TEAL}33`,
                                        }}
                                    >
                                        {groupPrefix}
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
                                          const dr = Number(r.totalDr ?? 0);
                                          const cr = Number(r.totalCr ?? 0);
                                          return (
                                              <TableRow
                                                  key={String(id)}
                                                  hover
                                                  sx={{ cursor: 'pointer' }}
                                                  onClick={e => {
                                                      e.stopPropagation();
                                                      redirect('edit', 'glJournalVouchers', id as Identifier);
                                                  }}
                                              >
                                                  <TableCell />
                                                  <TableCell>{String(r.voucherNo ?? '') || '—'}</TableCell>
                                                  <TableCell>{formatVoucherDate(r.voucherDate)}</TableCell>
                                                  <TableCell>{String(r.journalTitle ?? '') || '—'}</TableCell>
                                                  <TableCell>
                                                      <JournalWorkflowChip
                                                          record={{
                                                              approvalStatusCode: String(r.approvalStatusCode ?? ''),
                                                          }}
                                                      />
                                                  </TableCell>
                                                  <TableCell sx={{ textAlign: 'right' }}>
                                                      {formatMoneyTotals(dr)}
                                                  </TableCell>
                                                  <TableCell sx={{ textAlign: 'right' }}>
                                                      {formatMoneyTotals(cr)}
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

function JournalVoucherListToolbar() {
    const translate = useTranslate();
    const createPath = useCreatePath();
    const { filterValues, setFilters, page, perPage, total, setPage } = useListContext();
    const [groupBy, setGroupBy] = useStore<GlJournalVoucherGroupByMode>(
        GL_JOURNAL_VOUCHERS_GROUP_BY_STORE_KEY,
        'none'
    );
    const [view, setView] = useStore<'list' | 'kanban' | 'calendar' | 'pivot' | 'graph' | 'activity'>(
        'glJournalVouchers.listView',
        'list'
    );
    const [q, setQ] = React.useState<string>(String((filterValues as Record<string, unknown>)?.q ?? ''));
    const [uploadMenuAnchor, setUploadMenuAnchor] = React.useState<null | HTMLElement>(null);
    const [settingsMenuAnchor, setSettingsMenuAnchor] = React.useState<null | HTMLElement>(null);
    const [searchPanelOpen, setSearchPanelOpen] = React.useState(false);
    const searchBarRef = React.useRef<HTMLDivElement | null>(null);
    const canCreate = useAccountingAccess('glJournalVouchers', 'create');

    const closeSearchPanel = React.useCallback(() => setSearchPanelOpen(false), []);
    const toggleSearchPanel = React.useCallback(() => setSearchPanelOpen(o => !o), []);

    const fv = filterValues as Record<string, unknown>;
    const currentSystemType = String(fv?.systemType ?? '');
    const systemTypeChipLabel =
        SYSTEM_TYPE_FILTER_OPTIONS.find(o => o.value === currentSystemType)?.label ?? currentSystemType;

    const postedRaw = fv?.posted;
    const postedKey =
        typeof postedRaw === 'boolean' ? (postedRaw ? 'true' : 'false') : '';
    const postedChipLabel =
        POSTED_LEDGER_FILTER_OPTIONS.find(o => o.value === postedKey)?.label ?? '';

    const currentApproval = String(fv?.approvalStatus ?? '');
    const approvalChipLabel =
        APPROVAL_FILTER_OPTIONS.find(o => o.value === currentApproval)?.label ?? currentApproval;

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
            const curFv = filterValuesRef.current as Record<string, unknown>;
            const cur = String(curFv.q ?? '').trim();
            if (cur === next) return;
            setFiltersRef.current({ ...curFv, q: next || undefined } as any, null);
        }, 250);
        return () => window.clearTimeout(t);
    }, [q]);

    const pageStart = total ? (page - 1) * perPage + 1 : 0;
    const pageEnd = total ? Math.min(page * perPage, total) : 0;

    const viewButtons = [
        { key: 'list' as const, icon: <ViewListIcon fontSize="small" />, label: 'List' },
        { key: 'kanban' as const, icon: <ViewKanbanOutlinedIcon fontSize="small" />, label: 'Kanban' },
        {
            key: 'calendar' as const,
            icon: <CalendarMonthOutlinedIcon fontSize="small" />,
            label: 'Calendar',
            disabled: true,
        },
        { key: 'pivot' as const, icon: <TableChartOutlinedIcon fontSize="small" />, label: 'Pivot', disabled: true },
        { key: 'graph' as const, icon: <ShowChartOutlinedIcon fontSize="small" />, label: 'Graph', disabled: true },
        { key: 'activity' as const, icon: <AccessTimeIcon fontSize="small" />, label: 'Activity', disabled: true },
    ];

    const showMiscChip = Number(currentSystemType) === MISC_SYSTEM_TYPE;

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
                            to={createPath({ resource: 'glJournalVouchers', type: 'create' })}
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
                        <MenuItem disabled>
                            {translate('shell.accounting.import_journal_vouchers', {
                                _: 'Import journal vouchers (coming soon)',
                            })}
                        </MenuItem>
                    </Menu>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 0.5 }}>
                        <Typography variant="body1" sx={{ fontWeight: 700, fontSize: 15, color: 'text.primary' }}>
                            {translate('resources.glJournalVouchers.name', { smart_count: 2 })}
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
                                        GL_JOURNAL_VOUCHERS_COLUMNS_BUTTON_ID
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
                                id={GL_JOURNAL_VOUCHERS_COLUMNS_BUTTON_ID}
                                storeKey={GL_JOURNAL_VOUCHERS_COLUMNS_STORE_KEY}
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

                        {showMiscChip ? (
                            <Chip
                                label={translate('shell.accounting.misc_journals_quick_filter', {
                                    _: 'Miscellaneous journals',
                                })}
                                size="small"
                                onDelete={() => {
                                    const next = { ...fv };
                                    delete next.systemType;
                                    setFilters(next as any, null);
                                    setPage(1);
                                }}
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
                        ) : null}

                        {postedKey ? (
                            <Chip
                                label={postedChipLabel}
                                size="small"
                                onDelete={() => {
                                    const next = { ...fv };
                                    delete next.posted;
                                    setFilters(next as any, null);
                                    setPage(1);
                                }}
                                sx={{
                                    ml: 0.5,
                                    height: 22,
                                    borderRadius: '999px',
                                    fontWeight: 600,
                                    fontSize: 12,
                                    maxWidth: 160,
                                    '& .MuiChip-label': { px: '8px', overflow: 'hidden', textOverflow: 'ellipsis' },
                                }}
                            />
                        ) : null}

                        {currentApproval ? (
                            <Chip
                                label={approvalChipLabel}
                                size="small"
                                onDelete={() => {
                                    const next = { ...fv };
                                    delete next.approvalStatus;
                                    setFilters(next as any, null);
                                    setPage(1);
                                }}
                                sx={{
                                    ml: 0.5,
                                    height: 22,
                                    borderRadius: '999px',
                                    fontWeight: 600,
                                    fontSize: 12,
                                    maxWidth: 180,
                                    '& .MuiChip-label': { px: '8px', overflow: 'hidden', textOverflow: 'ellipsis' },
                                }}
                            />
                        ) : null}

                        {currentSystemType && Number(currentSystemType) !== MISC_SYSTEM_TYPE ? (
                            <Chip
                                label={systemTypeChipLabel}
                                size="small"
                                onDelete={() => {
                                    const next = { ...fv };
                                    delete next.systemType;
                                    setFilters(next as any, null);
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
                                    width: { xs: 'min(100vw - 24px, 520px)', sm: 900 },
                                    maxWidth: 'calc(100vw - 24px)',
                                    overflow: 'hidden',
                                },
                            },
                        }}
                    >
                        <Box sx={{ display: 'flex', minHeight: 240, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
                            <Box
                                sx={{
                                    flex: 1,
                                    minWidth: 200,
                                    borderRight: { xs: 'none', sm: '1px solid' },
                                    borderBottom: { xs: '1px solid', sm: 'none' },
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
                                    Posted to ledger
                                </Typography>
                                <MuiList disablePadding sx={{ py: 0 }}>
                                    {POSTED_LEDGER_FILTER_OPTIONS.map(opt => {
                                        const active = postedKey === opt.value;
                                        return (
                                            <ListItemButton
                                                key={opt.value || 'all'}
                                                selected={active}
                                                dense
                                                onClick={() => {
                                                    const next = { ...fv };
                                                    if (opt.value === 'true') next.posted = true;
                                                    else if (opt.value === 'false') next.posted = false;
                                                    else delete next.posted;
                                                    setFilters(next as any, null);
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
                                    Workflow
                                </Typography>
                                <MuiList disablePadding sx={{ py: 0, maxHeight: 200, overflow: 'auto' }}>
                                    {APPROVAL_FILTER_OPTIONS.map(opt => {
                                        const active = currentApproval === opt.value;
                                        return (
                                            <ListItemButton
                                                key={opt.value || 'all-ap'}
                                                selected={active}
                                                dense
                                                onClick={() => {
                                                    const next = { ...fv };
                                                    if (opt.value) next.approvalStatus = opt.value;
                                                    else delete next.approvalStatus;
                                                    setFilters(next as any, null);
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
                                    Journal type
                                </Typography>
                                <MuiList disablePadding sx={{ py: 0, maxHeight: 220, overflow: 'auto' }}>
                                    {SYSTEM_TYPE_FILTER_OPTIONS.map(opt => {
                                        const active = currentSystemType === opt.value;
                                        return (
                                            <ListItemButton
                                                key={opt.value || 'all-st'}
                                                selected={active}
                                                dense
                                                onClick={() => {
                                                    const next = { ...fv };
                                                    if (opt.value) next.systemType = Number(opt.value);
                                                    else delete next.systemType;
                                                    setFilters(next as any, null);
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
                                    minWidth: 200,
                                    borderRight: { xs: 'none', sm: '1px solid' },
                                    borderBottom: { xs: '1px solid', sm: 'none' },
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

                            <Box sx={{ flex: 1, minWidth: 200, py: 1, px: 0.5 }}>
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

function JournalVoucherKanban() {
    const { data, isLoading } = useListContext();
    const redirect = useRedirect();
    if (isLoading) return null;
    const rows = data ? (Object.values(data) as Record<string, unknown>[]) : [];
    return (
        <Box sx={{ p: 1 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 1.5 }}>
                {rows.map(r => {
                    const id = r.id ?? r.Id;
                    const no = String(r.voucherNo ?? '').trim() || '—';
                    const j = String(r.journalTitle ?? '').trim() || '—';
                    return (
                        <Paper
                            key={String(id)}
                            variant="outlined"
                            sx={{
                                p: 1.25,
                                cursor: 'pointer',
                                '&:hover': { borderColor: 'text.primary' },
                            }}
                            onClick={() => redirect('edit', 'glJournalVouchers', id as Identifier)}
                        >
                            <Typography variant="body2" fontWeight={700} noWrap>
                                {no}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block" noWrap sx={{ mt: 0.5 }}>
                                {j}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block" noWrap>
                                {formatVoucherDate(r.voucherDate)}
                            </Typography>
                            <Box sx={{ mt: 1 }}>
                                <JournalWorkflowChip
                                    record={{ approvalStatusCode: String(r.approvalStatusCode ?? '') }}
                                />
                            </Box>
                        </Paper>
                    );
                })}
            </Box>
        </Box>
    );
};

const Column = DataTable.Col<any>;

function JournalVoucherBulkActions() {
    const canDelete = useAccountingAccess('glJournalVouchers', 'delete');
    if (!canDelete) return false;
    return <BulkDeleteButton />;
}

export function GlJournalVoucherList() {
    const translate = useTranslate();
    const [view] = useStore<'list' | 'kanban' | 'calendar' | 'pivot' | 'graph' | 'activity'>(
        'glJournalVouchers.listView',
        'list'
    );
    const [groupBy] = useStore<GlJournalVoucherGroupByMode>(GL_JOURNAL_VOUCHERS_GROUP_BY_STORE_KEY, 'none');

    return (
        <List
            resource="glJournalVouchers"
            sort={{ field: 'voucherDate', order: 'DESC' }}
            perPage={25}
            filterDefaultValues={{ systemType: MISC_SYSTEM_TYPE }}
            actions={<JournalVoucherListToolbar />}
            empty={<EmptyJournalVouchers />}
            title={<Title />}
            sx={{
                '& .RaList-main': { maxWidth: '100%' },
                '& .RaList-content': { overflowX: 'auto' },
            }}
        >
            {view === 'kanban' ? (
                <JournalVoucherKanban />
            ) : groupBy !== 'none' ? (
                <>
                    <GlJournalVoucherGroupedDataTable />
                    <PageTotalFooter />
                </>
            ) : (
                <>
                    <DataTable
                        rowClick="edit"
                        bulkActionButtons={<JournalVoucherBulkActions />}
                        storeKey={GL_JOURNAL_VOUCHERS_COLUMNS_STORE_KEY}
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
                        hiddenColumns={['readOnly', 'posted']}
                    >
                        <Column source="voucherNo" label={translate('resources.glJournalVouchers.fields.voucher_no')} />
                        <Column source="voucherDate" label={translate('resources.glJournalVouchers.fields.voucher_date')}>
                            <DateField source="voucherDate" label={false} showTime />
                        </Column>
                        <Column source="journalTitle" label={translate('resources.glJournalVouchers.fields.journal')}>
                            <TextField source="journalTitle" label={false} emptyText="—" />
                        </Column>
                        <Column
                            source="approvalStatusCode"
                            label={translate('resources.glJournalVouchers.fields.status')}
                            disableSort
                        >
                            <FunctionField
                                label=""
                                render={(r: { approvalStatusCode?: string }) => (
                                    <JournalWorkflowChip record={{ approvalStatusCode: r.approvalStatusCode }} />
                                )}
                            />
                        </Column>
                        <Column
                            source="posted"
                            label={translate('resources.glJournalVouchers.fields.ledger_posted', {
                                _: 'Posted to ledger',
                            })}
                            disableSort
                        >
                            <FunctionField
                                label=""
                                render={(r: { posted?: boolean }) =>
                                    r.posted
                                        ? translate('resources.glJournalVouchers.status.posted')
                                        : translate('resources.glJournalVouchers.status.draft')
                                }
                            />
                        </Column>
                        <Column
                            source="totalDr"
                            label={translate('resources.glJournalVouchers.fields.total_dr')}
                            disableSort
                            sx={{ '& .MuiTableCell-root': { textAlign: 'right' } }}
                        >
                            <FunctionField
                                label=""
                                render={(r: { totalDr?: number }) => formatMoneyTotals(Number(r.totalDr ?? 0))}
                            />
                        </Column>
                        <Column
                            source="totalCr"
                            label={translate('resources.glJournalVouchers.fields.total_cr')}
                            disableSort
                            sx={{ '& .MuiTableCell-root': { textAlign: 'right' } }}
                        >
                            <FunctionField
                                label=""
                                render={(r: { totalCr?: number }) => formatMoneyTotals(Number(r.totalCr ?? 0))}
                            />
                        </Column>
                        <Column source="readOnly" label="Read-only" disableSort>
                            <FunctionField
                                label=""
                                render={(r: { readOnly?: boolean }) => (r.readOnly ? 'Yes' : 'No')}
                            />
                        </Column>
                    </DataTable>
                    <PageTotalFooter />
                </>
            )}
        </List>
    );
}

export default GlJournalVoucherList;
