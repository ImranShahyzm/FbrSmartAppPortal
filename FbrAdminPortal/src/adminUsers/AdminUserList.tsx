import * as React from 'react';
import {
    List,
    DataTable,
    TextField,
    EmailField,
    BooleanField,
    TopToolbar,
    useListContext,
    useStore,
    FunctionField,
    ColumnsButton,
} from 'react-admin';
import { useOdooListSearchQ } from '../common/useOdooListSearchQ';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Button,
    IconButton,
    InputBase,
    Paper,
    Tooltip,
    Typography,
    Divider,
    Avatar,
    Chip,
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
import { getInitials } from './getInitials';

const NAV_TEAL = '#3d7a7a';
const NAV_TEAL_DARK = '#2e6262';
const ADMIN_USER_COLUMNS_STORE_KEY = 'admin-users.columns';
const ADMIN_USER_COLUMNS_BUTTON_ID = 'admin-users.columnsButton';

function AdminUserListActions() {
    const navigate = useNavigate();
    const { page, perPage, total, setPage } = useListContext();
    const [q, setQ] = useOdooListSearchQ();
    const [view, setView] = useStore<'list' | 'kanban'>('admin-users.listView', 'list');
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
        <TopToolbar sx={{ width: '100%', p: 0, minHeight: 'unset', flexDirection: 'column', pt: '12px' }}>
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
                    <Button
                        variant="contained"
                        size="small"
                        onClick={() => navigate('/admin-users/create')}
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
                            Admin users
                        </Typography>
                        <IconButton
                            size="small"
                            sx={{ color: 'text.secondary', p: '2px' }}
                            onClick={() => {
                                const el = document.getElementById(ADMIN_USER_COLUMNS_BUTTON_ID) as HTMLButtonElement | null;
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
                                id={ADMIN_USER_COLUMNS_BUTTON_ID}
                                storeKey={ADMIN_USER_COLUMNS_STORE_KEY}
                                sx={{ minWidth: 0, px: '6px' }}
                            />
                        </Box>
                    </Box>
                </Box>
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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: '0 0 auto' }}>
                    {total != null && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12, whiteSpace: 'nowrap', mr: 0.5 }}>
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
                                    onClick={() => !disabled && setView(key as 'list' | 'kanban')}
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

function AdminUserKanban() {
    const navigate = useNavigate();
    const { data, isLoading } = useListContext();
    if (isLoading) return null;
    const rows = data ? Object.values(data) : [];
    return (
        <Box sx={{ p: 1.5 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 1.5 }}>
                {rows.map((r: { id?: string; fullName?: string; email?: string; role?: string; isActive?: boolean }) => {
                    const name = r?.fullName ?? r?.id ?? 'User';
                    const initials = getInitials(r?.fullName);
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
                            onClick={() => r.id && navigate(`/admin-users/${encodeURIComponent(r.id)}`)}
                        >
                            <Box
                                sx={{
                                    width: '100%',
                                    height: 140,
                                    bgcolor: '#f9f9f9',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderBottom: '1px solid #f0f0f0',
                                }}
                            >
                                <Avatar
                                    sx={{ width: 72, height: 72, bgcolor: '#2a9d8f', fontSize: '1.5rem', fontWeight: 700 }}
                                >
                                    {initials}
                                </Avatar>
                            </Box>
                            <Box sx={{ p: 1.25 }}>
                                <Typography variant="body2" fontWeight={700} noWrap>
                                    {name}
                                </Typography>
                                {r?.email ? (
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }} noWrap>
                                        {r.email}
                                    </Typography>
                                ) : null}
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.75, flexWrap: 'wrap' }}>
                                    {r?.role ? (
                                        <Chip label={r.role} size="small" sx={{ height: 22, fontSize: 11, fontWeight: 600 }} />
                                    ) : null}
                                    <Chip
                                        label={r?.isActive === false ? 'Archived' : 'Active'}
                                        size="small"
                                        sx={{
                                            height: 22,
                                            fontSize: 11,
                                            fontWeight: 600,
                                            bgcolor: r?.isActive === false ? '#ffebee' : '#e8f5e9',
                                        }}
                                    />
                                </Box>
                            </Box>
                        </Paper>
                    );
                })}
            </Box>
        </Box>
    );
}

const Column = DataTable.Col;

export default function AdminUserList() {
    const [view] = useStore<'list' | 'kanban'>('admin-users.listView', 'list');
    return (
        <List
            resource="admin-users"
            sort={{ field: 'fullName', order: 'ASC' }}
            perPage={25}
            actions={<AdminUserListActions />}
            sx={{
                '& .RaList-main': { maxWidth: '100%', width: '100%' },
                '& .RaList-content': { boxShadow: 'none' },
            }}
        >
            {view === 'kanban' ? (
                <AdminUserKanban />
            ) : (
                <DataTable
                    rowClick="edit"
                    bulkActionButtons={false}
                    storeKey={ADMIN_USER_COLUMNS_STORE_KEY}
                    sx={{
                        '& .column-avatar': { width: 64 },
                        '& .MuiTableCell-head': { fontWeight: 700 },
                    }}
                >
                    <Column source="avatar" label="Photo" disableSort>
                        <FunctionField
                            label=""
                            render={(record: { fullName?: string }) => (
                                <Avatar sx={{ width: 40, height: 40, fontSize: 14, fontWeight: 700, bgcolor: '#2a9d8f' }}>
                                    {getInitials(record?.fullName)}
                                </Avatar>
                            )}
                        />
                    </Column>
                    <Column source="fullName" label="Name">
                        <TextField source="fullName" />
                    </Column>
                    <Column source="email" label="Email">
                        <EmailField source="email" emptyText="—" />
                    </Column>
                    <Column source="role" label="Role">
                        <TextField source="role" />
                    </Column>
                    <Column source="isActive" label="Active">
                        <BooleanField source="isActive" />
                    </Column>
                </DataTable>
            )}
        </List>
    );
}
