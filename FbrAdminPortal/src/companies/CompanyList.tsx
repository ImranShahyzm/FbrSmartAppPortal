import * as React from 'react';
import {
    ColumnsButton,
    DataTable,
    DateField,
    List,
    TopToolbar,
    useListContext,
    FunctionField,
    BooleanField,
    useStore,
} from 'react-admin';
import {
    Box,
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
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewKanbanOutlinedIcon from '@mui/icons-material/ViewKanbanOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import ShowChartOutlinedIcon from '@mui/icons-material/ShowChartOutlined';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
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
import { useNavigate } from 'react-router-dom';

const NAV_TEAL = '#3d7a7a';

const COMPANY_COLUMNS_STORE_KEY = 'adminCompanies.columns';
const COMPANY_COLUMNS_BUTTON_ID = 'adminCompanies.columnsButton';
const COMPANY_GROUP_BY_STORE_KEY = 'adminCompanies.groupBy';

export type CompanyGroupByMode = 'none' | 'paymentStatus' | 'activation';

const PAYMENT_FILTER_OPTIONS: { value: string; label: string }[] = [
    { value: '', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'failed', label: 'Failed' },
    { value: 'waived', label: 'Waived' },
];

const ACTIVATION_FILTER_OPTIONS: { value: string; label: string }[] = [
    { value: '', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
];

const GROUP_BY_OPTIONS: { value: CompanyGroupByMode; label: string }[] = [
    { value: 'none', label: 'None' },
    { value: 'paymentStatus', label: 'Payment' },
    { value: 'activation', label: 'Activation' },
];

function parseRegisteredAt(v: unknown): Date | null {
    if (v == null) return null;
    if (v instanceof Date) return v;
    const d = new Date(String(v));
    return Number.isNaN(d.getTime()) ? null : d;
}

function CompanyListActions() {
    const { filterValues, setFilters, page, perPage, total, setPage } = useListContext();
    const [groupBy, setGroupBy] = useStore<CompanyGroupByMode>(COMPANY_GROUP_BY_STORE_KEY, 'none');
    const [view, setView] = useStore<'list' | 'kanban' | 'calendar' | 'pivot' | 'graph' | 'activity'>(
        'adminCompanies.listView',
        'list'
    );
    const [q, setQ] = React.useState<string>(String((filterValues as any)?.q ?? ''));
    const [settingsMenuAnchor, setSettingsMenuAnchor] = React.useState<null | HTMLElement>(null);
    const searchBarRef = React.useRef<HTMLDivElement | null>(null);
    const [searchPanelOpen, setSearchPanelOpen] = React.useState(false);

    const closeSearchPanel = React.useCallback(() => setSearchPanelOpen(false), []);
    const toggleSearchPanel = React.useCallback(() => setSearchPanelOpen(o => !o), []);

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
    const pageEnd = total ? Math.min(page * perPage, total) : 0;

    const currentPayment = String((filterValues as any)?.paymentStatus ?? '');
    const paymentChipLabel =
        PAYMENT_FILTER_OPTIONS.find(o => o.value === currentPayment)?.label ?? currentPayment;

    const currentActivation = String((filterValues as any)?.activation ?? '');
    const activationChipLabel =
        ACTIVATION_FILTER_OPTIONS.find(o => o.value === currentActivation)?.label ?? currentActivation;

    const viewButtons = [
        { key: 'list', icon: <ViewListIcon fontSize="small" />, label: 'List' },
        { key: 'kanban', icon: <ViewKanbanOutlinedIcon fontSize="small" />, label: 'Kanban' },
        { key: 'calendar', icon: <CalendarMonthOutlinedIcon fontSize="small" />, label: 'Calendar', disabled: true },
        { key: 'pivot', icon: <TableChartOutlinedIcon fontSize="small" />, label: 'Pivot', disabled: true },
        { key: 'graph', icon: <ShowChartOutlinedIcon fontSize="small" />, label: 'Graph', disabled: true },
        { key: 'activity', icon: <AccessTimeIcon fontSize="small" />, label: 'Activity', disabled: true },
    ];

    return (
        <TopToolbar
            sx={{
                width: '100%',
                p: 0,
                minHeight: 'unset',
                flexDirection: 'column',
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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', flex: '0 0 auto' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 0.5 }}>
                        <Typography variant="body1" sx={{ fontWeight: 700, fontSize: 15, color: 'text.primary' }}>
                            Companies
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
                                        COMPANY_COLUMNS_BUTTON_ID
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
                                id={COMPANY_COLUMNS_BUTTON_ID}
                                storeKey={COMPANY_COLUMNS_STORE_KEY}
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

                        {currentPayment ? (
                            <Chip
                                label={paymentChipLabel}
                                size="small"
                                onDelete={() => {
                                    const fv = { ...(filterValues as Record<string, unknown>) };
                                    delete fv.paymentStatus;
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

                        {currentActivation ? (
                            <Chip
                                label={activationChipLabel}
                                size="small"
                                onDelete={() => {
                                    const fv = { ...(filterValues as Record<string, unknown>) };
                                    delete fv.activation;
                                    setFilters(fv as any, null);
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
                                    Payment
                                </Typography>
                                <MuiList disablePadding sx={{ py: 0 }}>
                                    {PAYMENT_FILTER_OPTIONS.map(opt => {
                                        const active = currentPayment === opt.value;
                                        return (
                                            <ListItemButton
                                                key={opt.value || 'all'}
                                                selected={active}
                                                dense
                                                onClick={() => {
                                                    const fv = {
                                                        ...(filterValues as Record<string, unknown>),
                                                    };
                                                    if (opt.value) fv.paymentStatus = opt.value;
                                                    else delete fv.paymentStatus;
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
                                    Activation
                                </Typography>
                                <MuiList disablePadding sx={{ py: 0 }}>
                                    {ACTIVATION_FILTER_OPTIONS.map(opt => {
                                        const active = currentActivation === opt.value;
                                        return (
                                            <ListItemButton
                                                key={opt.value || 'all-act'}
                                                selected={active}
                                                dense
                                                onClick={() => {
                                                    const fv = {
                                                        ...(filterValues as Record<string, unknown>),
                                                    };
                                                    if (opt.value) fv.activation = opt.value;
                                                    else delete fv.activation;
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
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>
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

type PaymentChipCfg = { label: string; bg: string; color: string; border: string };

const PAYMENT_STATUS_STYLES: Record<string, PaymentChipCfg> = {
    pending: { label: 'Pending', bg: '#fff8e1', color: '#f57f17', border: '#ffca28' },
    confirmed: { label: 'Confirmed', bg: '#2e7d32', color: '#ffffff', border: '#2e7d32' },
    failed: { label: 'Failed', bg: '#c62828', color: '#ffffff', border: '#c62828' },
    waived: { label: 'Waived', bg: '#546e7a', color: '#ffffff', border: '#546e7a' },
};

function CompanyPaymentChip({ record }: { record: any }) {
    const st = String(record?.paymentStatus ?? '').toLowerCase();
    const cfg: PaymentChipCfg = PAYMENT_STATUS_STYLES[st] ?? {
        label: record?.paymentStatus ?? '—',
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
                '& .MuiChip-label': { px: '10px', py: 0 },
            }}
        />
    );
}

const OdooPaymentField = () => (
    <FunctionField label="Payment" render={(record: any) => <CompanyPaymentChip record={record} />} />
);

const GROUP_HEADER_LABEL_COLSPAN = 4;
const GROUP_HEADER_TAIL_COLSPAN = 3;

type GroupedSection = { key: string; displayLabel: string; rows: any[] };

function CompanyGroupedDataTable() {
    const navigate = useNavigate();
    const { data, isLoading } = useListContext();
    const [groupBy] = useStore<CompanyGroupByMode>(COMPANY_GROUP_BY_STORE_KEY, 'none');
    const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(() => new Set());

    const groups = React.useMemo((): GroupedSection[] => {
        if (groupBy === 'none') return [];
        const arr = data ? (Object.values(data) as any[]) : [];
        const map = new Map<string, { displayLabel: string; rows: any[] }>();

        for (const r of arr) {
            let uniqueKey: string;
            let displayLabel: string;
            if (groupBy === 'paymentStatus') {
                const ps = String(r.paymentStatus ?? '').trim() || '—';
                uniqueKey = `pay:${ps}`;
                displayLabel = PAYMENT_FILTER_OPTIONS.find(o => o.value === ps)?.label ?? ps;
            } else {
                const act = r.isActivated ? 'active' : 'inactive';
                uniqueKey = `act:${act}`;
                displayLabel = act === 'active' ? 'Active' : 'Inactive';
            }
            const prev = map.get(uniqueKey);
            if (prev) prev.rows.push(r);
            else map.set(uniqueKey, { displayLabel, rows: [r] });
        }

        map.forEach(v => {
            v.rows.sort((a: any, b: any) => Number(a.id) - Number(b.id));
        });

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
                    <TableRow>
                        <TableCell sx={{ width: 40, fontWeight: 700 }} aria-label="Expand" />
                        <TableCell sx={{ fontWeight: 700 }}>ID</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Company</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>NTN</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Registered</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Payment</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Activated</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
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
                                        {groupBy === 'paymentStatus' ? 'Payment: ' : 'Activation: '}
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
                                                  navigate(`/companies/${encodeURIComponent(r.id)}`);
                                              }}
                                          >
                                              <TableCell />
                                              <TableCell>{r.id}</TableCell>
                                              <TableCell>{r.title ?? ''}</TableCell>
                                              <TableCell>{r.ntnNo ?? ''}</TableCell>
                                              <TableCell>
                                                  {parseRegisteredAt(r.registeredAtUtc)?.toLocaleString() ?? ''}
                                              </TableCell>
                                              <TableCell>
                                                  <CompanyPaymentChip record={r} />
                                              </TableCell>
                                              <TableCell>{r.isActivated ? 'Yes' : 'No'}</TableCell>
                                              <TableCell>{r.email ?? ''}</TableCell>
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

const Title = () => {
    const { defaultTitle } = useListContext();
    return <span>{defaultTitle}</span>;
};

function CompanyKanban() {
    const { data, isLoading } = useListContext();
    const navigate = useNavigate();
    if (isLoading) return null;
    const rows = data ? Object.values(data) : [];
    return (
        <Box sx={{ p: 1 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 1.5 }}>
                {rows.map((r: any) => {
                    const displayName = (r?.title as string | undefined) || `Company ${r.id}`;
                    const initials = displayName
                        .split(' ')
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((s: string) => s[0]?.toUpperCase())
                        .join('');
                    return (
                        <Paper
                            key={r.id}
                            variant="outlined"
                            sx={{ p: 1.25, cursor: 'pointer', '&:hover': { borderColor: 'text.primary' } }}
                            onClick={() => navigate(`/companies/${encodeURIComponent(r.id)}`)}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box
                                    sx={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 1,
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        overflow: 'hidden',
                                        bgcolor: 'background.default',
                                        flex: '0 0 auto',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'text.secondary',
                                        fontSize: 12,
                                        fontWeight: 700,
                                    }}
                                >
                                    {initials || '—'}
                                </Box>
                                <Box sx={{ minWidth: 0 }}>
                                    <Typography variant="body2" fontWeight={700} noWrap>
                                        {displayName}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" noWrap>
                                        {r.ntnNo ?? r.email ?? ''}
                                    </Typography>
                                </Box>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1, alignItems: 'center' }}>
                                <CompanyPaymentChip record={r} />
                                <Typography variant="caption" color="text.secondary">
                                    {r.isActivated ? 'Active' : 'Inactive'}
                                </Typography>
                            </Box>
                        </Paper>
                    );
                })}
            </Box>
        </Box>
    );
}

const Column = DataTable.Col<any>;

export default function CompanyList() {
    const [view] = useStore<'list' | 'kanban'>('adminCompanies.listView', 'list');
    const [groupBy] = useStore<CompanyGroupByMode>(COMPANY_GROUP_BY_STORE_KEY, 'none');
    return (
        <List
            resource="companies"
            sort={{ field: 'id', order: 'ASC' }}
            perPage={25}
            actions={<CompanyListActions />}
            title={<Title />}
        >
            {view === 'kanban' ? (
                <CompanyKanban />
            ) : groupBy !== 'none' ? (
                <CompanyGroupedDataTable />
            ) : (
                <DataTable
                    rowClick="edit"
                    storeKey={COMPANY_COLUMNS_STORE_KEY}
                    bulkActionButtons={false}
                    hiddenColumns={['shortTitle', 'email', 'phone', 'paymentModel']}
                >
                    <Column source="id" label="ID" />
                    <Column source="title" label="Company" />
                    <Column source="shortTitle" label="Short title" />
                    <Column source="ntnNo" label="NTN" />
                    <Column source="registeredAtUtc" label="Request date">
                        <DateField source="registeredAtUtc" showTime transform={parseRegisteredAt as (v: unknown) => Date} />
                    </Column>
                    <Column source="paymentStatus" label="Payment" disableSort>
                        <OdooPaymentField />
                    </Column>
                    <Column source="paymentModel" label="Payment model" />
                    <Column source="isActivated" label="Activated">
                        <BooleanField source="isActivated" />
                    </Column>
                    <Column source="email" label="Email" disableSort />
                    <Column source="phone" label="Phone" disableSort />
                </DataTable>
            )}
        </List>
    );
}
