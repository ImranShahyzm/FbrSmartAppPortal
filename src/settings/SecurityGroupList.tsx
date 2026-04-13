import * as React from 'react';
import {
    List,
    DataTable,
    BooleanField,
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
import SecurityIcon from '@mui/icons-material/Security';

import { PermissionGuard } from '../auth/PermissionGuard';
import { SETTINGS_APP_ID } from '../apps/appsRegistry';

const NAV_TEAL = '#3d7a7a';
const NAV_TEAL_DARK = '#2e6262';

const SECURITY_GROUP_COLUMNS_STORE_KEY = 'securityGroups.columns';
const SECURITY_GROUP_COLUMNS_BUTTON_ID = 'securityGroups.columnsButton';

function SecurityGroupListActions() {
    const { page, perPage, total, setPage } = useListContext();
    const [q, setQ] = useOdooListSearchQ();
    const [view, setView] = useStore<'list' | 'kanban'>('securityGroups.listView', 'list');
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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', flex: '0 0 auto' }}>
                    <PermissionGuard appIdOrPrefix={SETTINGS_APP_ID} resource="securityGroups" action="create">
                        <Button
                            variant="contained"
                            size="small"
                            onClick={() =>
                                navigate(
                                    createPath({
                                        type: 'create',
                                        resource: 'securityGroups',
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
                    </PermissionGuard>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 0.5, position: 'relative' }}>
                        <Typography variant="body1" sx={{ fontWeight: 700, fontSize: 15 }}>
                            Security groups
                        </Typography>
                        <IconButton
                            size="small"
                            sx={{ color: 'text.secondary', p: '2px' }}
                            onClick={() => {
                                const el = document.getElementById(SECURITY_GROUP_COLUMNS_BUTTON_ID) as HTMLButtonElement | null;
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
                                id={SECURITY_GROUP_COLUMNS_BUTTON_ID}
                                storeKey={SECURITY_GROUP_COLUMNS_STORE_KEY}
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

function SecurityGroupKanban() {
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
                    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                    gap: 1.5,
                }}
            >
                {rows.map((r: { id?: string | number; name?: string; applicationScope?: string }) => (
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
                                    resource: 'securityGroups',
                                    id: r.id,
                                })
                            )
                        }
                    >
                        <Box
                            sx={{
                                width: '100%',
                                minHeight: 56,
                                bgcolor: '#f9f9f9',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                px: 1.25,
                                py: 1,
                                borderBottom: '1px solid #f0f0f0',
                            }}
                        >
                            <Box
                                sx={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: '50%',
                                    bgcolor: '#eef6f6',
                                    color: NAV_TEAL,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <SecurityIcon sx={{ fontSize: 20 }} />
                            </Box>
                            <Box sx={{ minWidth: 0 }}>
                                <Typography variant="body2" fontWeight={700} noWrap>
                                    {r.name ?? '—'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                                    {r.applicationScope ?? '—'}
                                </Typography>
                            </Box>
                        </Box>
                    </Paper>
                ))}
            </Box>
        </Box>
    );
}

const Column = DataTable.Col;

export function SecurityGroupList() {
    const [view] = useStore<'list' | 'kanban'>('securityGroups.listView', 'list');

    return (
        <List
            resource="securityGroups"
            actions={<SecurityGroupListActions />}
            perPage={25}
            sort={{ field: 'name', order: 'ASC' }}
        >
            {view === 'kanban' ? (
                <SecurityGroupKanban />
            ) : (
                <DataTable
                    rowClick="edit"
                    bulkActionButtons={false}
                    storeKey={SECURITY_GROUP_COLUMNS_STORE_KEY}
                    sx={{ '& .MuiTableCell-head': { fontWeight: 700 } }}
                >
                    <Column source="name" label="Name" />
                    <Column source="applicationScope" label="Application" />
                    <Column source="shareGroup" label="Shared">
                        <BooleanField source="shareGroup" />
                    </Column>
                </DataTable>
            )}
        </List>
    );
}

export default SecurityGroupList;
