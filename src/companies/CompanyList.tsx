import * as React from 'react';
import {
    List,
    Datagrid,
    TextField,
    BooleanField,
    EmailField,
    TopToolbar,
    useListContext,
    useStore,
    FunctionField,
} from 'react-admin';
import {
    Box,
    Divider,
    IconButton,
    InputBase,
    Paper,
    Tooltip,
    Typography,
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

// ── Theme color — match your nav ─────────────────────────────────────────────
const NAV_TEAL = '#3d7a7a';

function getInitials(name?: string) {
    const s = String(name ?? '').trim();
    if (!s) return '?';
    const parts = s.split(/\s+/).filter(Boolean);
    const a = parts[0]?.[0] ?? '';
    const b = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
    return (a + b).toUpperCase() || '?';
}

// ── Toolbar (match ProductProfileList) ────────────────────────────────────────
function CompanyListActions() {
    const { filterValues, setFilters, page, perPage, total, setPage } = useListContext();
    const [view, setView] = useStore<'list' | 'kanban'>('companies.listView', 'list');
    const [q, setQ] = React.useState<string>(String((filterValues as any)?.q ?? ''));

    React.useEffect(() => {
        setQ(String((filterValues as any)?.q ?? ''));
    }, [(filterValues as any)?.q]);

    React.useEffect(() => {
        const t = window.setTimeout(() => {
            const next = q.trim();
            setFilters({ ...(filterValues as any), q: next || undefined }, null);
        }, 250);
        return () => window.clearTimeout(t);
    }, [q, setFilters, filterValues]);

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
                {/* Left */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', flex: '0 0 auto' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 0.5 }}>
                        <Typography variant="body1" sx={{ fontWeight: 700, fontSize: 15 }}>
                            Companies
                        </Typography>
                        <IconButton size="small" sx={{ color: 'text.secondary', p: '2px' }}>
                            <SettingsOutlinedIcon sx={{ fontSize: 16 }} />
                        </IconButton>
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
function CompanyKanban() {
    const { data, isLoading } = useListContext();
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
                    const title = r?.title ?? r?.shortTitle ?? `Company ${r?.id ?? ''}`.trim();
                    const shortTitle = r?.shortTitle && r?.shortTitle !== r?.title ? r.shortTitle : null;
                    const sandBox = Boolean(r?.enableSandBox);
                    const inactive = Boolean(r?.inactive);
                    const token = sandBox ? r?.fbrTokenSandBox : r?.fbrTokenProduction;
                    const fbrActive = Boolean(String(token ?? '').trim());

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
                            onClick={() => (window.location.hash = `#/companies/${encodeURIComponent(r.id)}`)}
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
                                    {getInitials(title)}
                                </Avatar>
                                <Box sx={{ minWidth: 0 }}>
                                    <Typography variant="body2" fontWeight={700} noWrap>
                                        {title}
                                    </Typography>
                                    {shortTitle ? (
                                        <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                                            {shortTitle}
                                        </Typography>
                                    ) : (
                                        <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                                            ID: {r?.id ?? ''}
                                        </Typography>
                                    )}
                                </Box>
                            </Box>

                            {/* Body */}
                            <Box sx={{ p: 1.25 }}>
                                <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 0.75 }}>
                                    <Chip
                                        size="small"
                                        label={sandBox ? 'Env: Sandbox' : 'Env: Production'}
                                        sx={{
                                            height: 20,
                                            borderRadius: '4px',
                                            bgcolor: sandBox ? '#e0f2f1' : '#f0f0f0',
                                            color: sandBox ? NAV_TEAL : 'text.primary',
                                            fontSize: 11,
                                            fontWeight: 600,
                                            border: '1px solid #e0e0e0',
                                            '& .MuiChip-label': { px: '6px', py: 0 },
                                        }}
                                    />
                                    <Chip
                                        size="small"
                                        label={fbrActive ? 'FBR: Active' : 'FBR: Not active'}
                                        sx={{
                                            height: 20,
                                            borderRadius: '4px',
                                            bgcolor: fbrActive ? '#e8f5e9' : '#f0f0f0',
                                            color: fbrActive ? '#1b5e20' : 'text.primary',
                                            fontSize: 11,
                                            fontWeight: 600,
                                            border: '1px solid #e0e0e0',
                                            '& .MuiChip-label': { px: '6px', py: 0 },
                                        }}
                                    />
                                    <Chip
                                        size="small"
                                        label={inactive ? 'Inactive' : 'Active'}
                                        sx={{
                                            height: 20,
                                            borderRadius: '4px',
                                            bgcolor: inactive ? '#fff3e0' : '#f0f0f0',
                                            color: inactive ? '#a66a00' : 'text.primary',
                                            fontSize: 11,
                                            fontWeight: 600,
                                            border: '1px solid #e0e0e0',
                                            '& .MuiChip-label': { px: '6px', py: 0 },
                                        }}
                                    />
                                </Box>

                                {r?.address ? (
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }} noWrap>
                                        Address: {r.address}
                                    </Typography>
                                ) : null}
                                {r?.ntnNo ? (
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }} noWrap>
                                        NTN: {r.ntnNo}
                                    </Typography>
                                ) : null}
                                {r?.email ? (
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }} noWrap>
                                        Email: {r.email}
                                    </Typography>
                                ) : null}
                                {r?.phone ? (
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }} noWrap>
                                        Phone: {r.phone}
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

export default function CompanyList() {
    const [view] = useStore<'list' | 'kanban'>('companies.listView', 'list');

    return (
        <List title="Company" actions={<CompanyListActions />} perPage={25} sort={{ field: 'title', order: 'ASC' }}>
            {view === 'kanban' ? (
                <CompanyKanban />
            ) : (
                <Datagrid rowClick="edit" bulkActionButtons={false}>
                    <TextField source="title" label="Company Name" />
                    <TextField source="shortTitle" label="Short Title" />
                    <TextField source="address" label="Address" />
                    <TextField source="ntnNo" label="NTN" />
                    <EmailField source="email" label="Email" />
                    <TextField source="phone" label="Phone" />
                    <FunctionField
                        label="FBR Integration"
                        sortable={false}
                        render={(record: any) => {
                            const sandBox = Boolean(record?.enableSandBox);
                            const token = sandBox ? record?.fbrTokenSandBox : record?.fbrTokenProduction;
                            const active = Boolean(String(token ?? '').trim());
                            return (
                                <Chip
                                    size="small"
                                    label={active ? 'Active' : 'Not active'}
                                    sx={{
                                        height: 20,
                                        borderRadius: '4px',
                                        bgcolor: active ? '#e8f5e9' : '#f0f0f0',
                                        color: active ? '#1b5e20' : 'text.primary',
                                        fontSize: 11,
                                        fontWeight: 600,
                                        border: '1px solid #e0e0e0',
                                        '& .MuiChip-label': { px: '6px', py: 0 },
                                    }}
                                />
                            );
                        }}
                    />
                    <BooleanField source="enableSandBox" label="Sandbox" />
                    <BooleanField source="inactive" label="Inactive" />
                </Datagrid>
            )}
        </List>
    );
}

