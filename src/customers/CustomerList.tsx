import * as React from 'react';
import {
    List,
    DataTable,
    EmailField,
    TopToolbar,
    useListContext,
    useStore,
    ColumnsButton,
    useCreatePath,
} from 'react-admin';
import { useNavigate } from 'react-router-dom';
import { useOdooListSearchQ } from '../common/useOdooListSearchQ';
import {
    Box,
    Button,
    Divider,
    IconButton,
    InputBase,
    Paper,
    Tooltip,
    Typography,
    Avatar,
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
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';

// ── Theme color — match your nav ─────────────────────────────────────────────
const NAV_TEAL = '#3d7a7a';
const NAV_TEAL_DARK = '#2e6262';

const CUSTOMER_COLUMNS_STORE_KEY = 'customers.columns';
const CUSTOMER_COLUMNS_BUTTON_ID = 'customers.columnsButton';

function getInitials(name?: string) {
    const s = String(name ?? '').trim();
    if (!s) return '?';
    const parts = s.split(/\s+/).filter(Boolean);
    const a = parts[0]?.[0] ?? '';
    const b = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
    return (a + b).toUpperCase() || '?';
}

// ── Toolbar (match ProductProfileList) ────────────────────────────────────────
function CustomerListActions() {
    const { page, perPage, total, setPage } = useListContext();
    const [q, setQ] = useOdooListSearchQ();
    const [view, setView] = useStore<'list' | 'kanban'>('customers.listView', 'list');
    const createPath = useCreatePath();
    const navigate = useNavigate();

    const pageStart = total ? (page - 1) * perPage + 1 : 0;
    const pageEnd = total ? Math.min(page * perPage, total) : 0;

    const viewButtons = [
        { key: 'list', icon: <ViewListIcon fontSize="small" />, label: 'List' },
        { key: 'kanban', icon: <ViewKanbanOutlinedIcon fontSize="small" />, label: 'Kanban' },
        { key: 'calendar', icon: <CalendarMonthOutlinedIcon fontSize="small" />, label: 'Calendar', disabled: true },
        { key: 'pivot', icon: <TableChartOutlinedIcon fontSize="small" />, label: 'Pivot', disabled: true },
        { key: 'graph', icon: <ShowChartOutlinedIcon fontSize="small" />, label: 'Graph', disabled: true },
        { key: 'activity', icon: <AccessTimeIcon fontSize="small" />, label: 'Activity', disabled: true },
    ];

    return (
        <TopToolbar sx={{ width: '100%', p: 0, minHeight: 'unset', flexDirection: 'column', pt: { xs: '4px', md: '12px' } }}>
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
                {/* Left */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', flex: '0 0 auto' }}>
                    <Button
                        variant="contained"
                        size="small"
                        onClick={() =>
                            navigate(
                                createPath({
                                    type: 'create',
                                    resource: 'customers',
                                })
                            )
                        }
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

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 0.5, position: 'relative' }}>
                        <Typography variant="body1" sx={{ fontWeight: 700, fontSize: 15 }}>
                            Customers
                        </Typography>
                        <IconButton
                            size="small"
                            sx={{ color: 'text.secondary', p: '2px' }}
                            onClick={() => {
                                const el = document.getElementById(CUSTOMER_COLUMNS_BUTTON_ID) as HTMLButtonElement | null;
                                el?.click();
                            }}
                        >
                            <SettingsOutlinedIcon sx={{ fontSize: 16 }} />
                        </IconButton>
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
                                id={CUSTOMER_COLUMNS_BUTTON_ID}
                                storeKey={CUSTOMER_COLUMNS_STORE_KEY}
                                sx={{ minWidth: 0, px: '6px' }}
                            />
                        </Box>
                    </Box>
                </Box>

                {/* Center search */}
                <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                    <Paper
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
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                px: 1,
                                py: '5px',
                                bgcolor: '#eef6f6',
                                borderRight: '1px solid #e0e0e0',
                                cursor: 'pointer',
                                '&:hover': { bgcolor: '#d9eeee' },
                            }}
                        >
                            <FilterListIcon sx={{ fontSize: 18, color: NAV_TEAL }} />
                        </Box>
                        <InputBase
                            value={q}
                            onChange={e => setQ(e.target.value)}
                            placeholder="Search..."
                            sx={{ flex: 1, fontSize: 13, px: 1, py: '4px' }}
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
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                borderLeft: '1px solid #e0e0e0',
                                pl: 0.25,
                                cursor: 'pointer',
                            }}
                        >
                            <ArrowDropDownIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                        </Box>
                    </Paper>
                </Box>

                {/* Right: pagination + views */}
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

// ── Kanban card (match ProductProfileList layout) ──────────────────────────────
function CustomerKanban() {
    const { data, isLoading } = useListContext();
    const createPath = useCreatePath();
    const navigate = useNavigate();
    if (isLoading) return null;
    const rows = data ? Object.values(data) : [];

    return (
        <Box sx={{ p: 1.5 }}>
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: 1.5,
                }}
            >
                {rows.map((r: any) => {
                    const name = r?.partyName ?? r?.partyBusinessName ?? 'Customer';
                    const subtitle = r?.partyBusinessName && r?.partyBusinessName !== r?.partyName ? r.partyBusinessName : null;

                    return (
                        <Paper
                            key={r.id}
                            variant="outlined"
                            sx={{
                                cursor: 'pointer',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                transition: 'box-shadow .15s',
                                '&:hover': { boxShadow: 3 },
                            }}
                            onClick={() =>
                                navigate(
                                    createPath({
                                        type: 'edit',
                                        resource: 'customers',
                                        id: r.id,
                                    })
                                )
                            }
                        >
                            {/* Header band */}
                            <Box
                                sx={{
                                    width: '100%',
                                    height: 56,
                                    bgcolor: '#f9f9f9',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                    px: 1.25,
                                    borderBottom: '1px solid #f0f0f0',
                                }}
                            >
                                <Avatar
                                    sx={{
                                        width: 36,
                                        height: 36,
                                        bgcolor: '#eef6f6',
                                        color: NAV_TEAL,
                                        fontWeight: 800,
                                        fontSize: 13,
                                        border: '1px solid #d7e7e7',
                                    }}
                                >
                                    {getInitials(name)}
                                </Avatar>
                                <Box sx={{ minWidth: 0 }}>
                                    <Typography variant="body2" fontWeight={700} noWrap>
                                        {name}
                                    </Typography>
                                    {subtitle ? (
                                        <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                                            {subtitle}
                                        </Typography>
                                    ) : null}
                                </Box>
                            </Box>

                            {/* Body */}
                            <Box sx={{ p: 1.25 }}>
                                {r?.phoneOne ? (
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                        Phone: {r.phoneOne}
                                    </Typography>
                                ) : null}
                                {r?.email ? (
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                        Email: {r.email}
                                    </Typography>
                                ) : null}
                                {r?.ntnno ? (
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                                        NTN: {r.ntnno}
                                    </Typography>
                                ) : null}
                                {r?.saleTaxRegNo ? (
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                        STN: {r.saleTaxRegNo}
                                    </Typography>
                                ) : null}
                            </Box>
                        </Paper>
                    );
                })}
            </Box>
        </Box>
    );
}

const Column = DataTable.Col;

export default function CustomerList() {
    const [view] = useStore<'list' | 'kanban'>('customers.listView', 'list');

    return (
        <List
            resource="customers"
            actions={<CustomerListActions />}
            perPage={25}
            sort={{ field: 'partyName', order: 'ASC' }}
        >
            {view === 'kanban' ? (
                <CustomerKanban />
            ) : (
                <DataTable
                    rowClick="edit"
                    bulkActionButtons={false}
                    storeKey={CUSTOMER_COLUMNS_STORE_KEY}
                    hiddenColumns={['addressOne']}
                    sx={{ '& .MuiTableCell-head': { fontWeight: 700 } }}
                >
                    <Column source="partyName" label="Party Name" />
                    <Column source="partyBusinessName" label="Business Name" />
                    <Column source="phoneOne" label="Phone" />
                    <Column source="email" label="Email">
                        <EmailField source="email" emptyText="—" />
                    </Column>
                    <Column source="ntnno" label="NTN" />
                    <Column source="saleTaxRegNo" label="STN" />
                    <Column source="addressOne" label="Address" disableSort />
                </DataTable>
            )}
        </List>
    );
}

