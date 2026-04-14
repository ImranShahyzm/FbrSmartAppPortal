import * as React from 'react';
import {
    BulkDeleteButton,
    ColumnsButton,
    DataTable,
    List,
    TextField,
    TopToolbar,
    useCreatePath,
    useListContext,
    useTranslate,
} from 'react-admin';
import { Link } from 'react-router-dom';
import {
    Box,
    Button,
    Divider,
    IconButton,
    InputBase,
    Menu,
    MenuItem,
    Paper,
    Popover,
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

import { useAccountingAccess } from '../useAccountingAccess';

const NAV_TEAL = '#3d7a7a';
const NAV_TEAL_DARK = '#2e6262';

const GEN_CASH_COLUMNS_STORE_KEY = 'genCashInformation.columns';
const GEN_CASH_COLUMNS_BUTTON_ID = 'genCashInformation.columnsButton';

function Title() {
    const { defaultTitle } = useListContext();
    return <span>{defaultTitle}</span>;
}

function EmptyCashInformation() {
    const translate = useTranslate();
    return (
        <Box sx={{ py: 4, px: 2, textAlign: 'center', maxWidth: 420, mx: 'auto' }}>
            <Typography variant="body1" color="text.secondary" paragraph>
                {translate('shell.accounting.gen_cash_information_empty')}
            </Typography>
        </Box>
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

function CashInformationListToolbar() {
    const translate = useTranslate();
    const createPath = useCreatePath();
    const { filterValues, setFilters, page, setPage, perPage, total } = useListContext();
    const canCreate = useAccountingAccess('genCashInformation', 'create');

    const [q, setQ] = React.useState(() => String((filterValues as Record<string, unknown>)?.q ?? ''));
    const [searchPanelOpen, setSearchPanelOpen] = React.useState(false);
    const searchBarRef = React.useRef<HTMLDivElement | null>(null);
    const [settingsMenuAnchor, setSettingsMenuAnchor] = React.useState<null | HTMLElement>(null);

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

    const toggleSearchPanel = () => setSearchPanelOpen(o => !o);
    const closeSearchPanel = () => setSearchPanelOpen(false);

    const viewButtons = [
        { key: 'list' as const, icon: <ViewListIcon fontSize="small" />, label: 'List' },
        { key: 'kanban' as const, icon: <ViewKanbanOutlinedIcon fontSize="small" />, label: 'Kanban', disabled: true },
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
                            to={createPath({ resource: 'genCashInformation', type: 'create' })}
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

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 0.5 }}>
                        <Typography variant="body1" sx={{ fontWeight: 700, fontSize: 15, color: 'text.primary' }}>
                            {translate('resources.genCashInformation.name', { smart_count: 2 })}
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
                                        GEN_CASH_COLUMNS_BUTTON_ID
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
                                id={GEN_CASH_COLUMNS_BUTTON_ID}
                                storeKey={GEN_CASH_COLUMNS_STORE_KEY}
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
                        <Tooltip title="Filters">
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
                                    width: { xs: 'min(100vw - 24px, 360px)', sm: 400 },
                                    maxWidth: 'calc(100vw - 24px)',
                                    p: 2,
                                },
                            },
                        }}
                    >
                        <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                            Filters
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {translate('shell.accounting.gen_cash_filters_placeholder')}
                        </Typography>
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
                                    sx={{
                                        p: '5px',
                                        borderRadius: '4px',
                                        bgcolor: key === 'list' ? '#e0f2f1' : 'transparent',
                                        color: key === 'list' ? NAV_TEAL : 'text.secondary',
                                        border: key === 'list' ? `1px solid ${NAV_TEAL}55` : '1px solid transparent',
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

const Column = DataTable.Col<any>;

function CashBulkActions() {
    const canDelete = useAccountingAccess('genCashInformation', 'delete');
    if (!canDelete) return false;
    return <BulkDeleteButton />;
}

export function GenCashInformationList() {
    const translate = useTranslate();

    return (
        <List
            resource="genCashInformation"
            sort={{ field: 'id', order: 'DESC' }}
            perPage={25}
            actions={<CashInformationListToolbar />}
            empty={<EmptyCashInformation />}
            title={<Title />}
            sx={{
                '& .RaList-main': { maxWidth: '100%' },
                '& .RaList-content': { overflowX: 'auto' },
            }}
        >
            <DataTable
                rowClick="edit"
                bulkActionButtons={<CashBulkActions />}
                storeKey={GEN_CASH_COLUMNS_STORE_KEY}
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
            >
                <Column source="accountTitle" label={translate('resources.genCashInformation.fields.account_title')}>
                    <TextField source="accountTitle" />
                </Column>
                <Column source="cashAccount" label={translate('resources.genCashInformation.fields.cash_account')}>
                    <TextField source="cashAccount" />
                </Column>
                <Column source="branchId" label={translate('resources.genCashInformation.fields.branch_id')}>
                    <TextField source="branchId" emptyText="—" />
                </Column>
            </DataTable>
            <PageTotalFooter />
        </List>
    );
}
