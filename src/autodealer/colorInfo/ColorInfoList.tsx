import * as React from 'react';
import {
    List,
    DataTable,
    DateField, // Added for EntryUserDateTime
    TopToolbar,
    useListContext,
    useStore,
    ColumnsButton,
    useCreatePath,
} from 'react-admin';
import { useNavigate } from 'react-router-dom';
import { useOdooListSearchQ } from '../../common/useOdooListSearchQ';
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
import PaletteIcon from '@mui/icons-material/Palette'; // Better icon for Colors

const NAV_TEAL = '#3d7a7a';
const NAV_TEAL_DARK = '#2e6262';

// Standardize store keys to match resource
const COLOR_COLUMNS_STORE_KEY = 'colorInformation.columns';
const COLOR_COLUMNS_BUTTON_ID = 'colorInformation.columnsButton';

function getInitials(name?: string) {
    const s = String(name ?? '').trim();
    if (!s) return '?';
    return s.charAt(0).toUpperCase();
}

function ColorInformationListActions() {
    const { page, perPage, total, setPage } = useListContext();
    const [q, setQ] = useOdooListSearchQ();
    const [view, setView] = useStore<'list' | 'kanban'>('colorInformation.listView', 'list');
    const createPath = useCreatePath();
    const navigate = useNavigate();

    const pageStart = total ? (page - 1) * perPage + 1 : 0;
    const pageEnd = total ? Math.min(page * perPage, total) : 0;

    const viewButtons = [
        { key: 'list', icon: <ViewListIcon fontSize="small" />, label: 'List' },
        { key: 'kanban', icon: <ViewKanbanOutlinedIcon fontSize="small" />, label: 'Kanban' },
    ];

    return (
        <TopToolbar sx={{ width: '100%', p: 0, minHeight: 'unset', flexDirection: 'column', pt: { xs: '4px', md: '12px' } }}>
            <Box sx={{ width: '100%', bgcolor: 'common.white', borderBottom: '1px solid', borderColor: 'divider', px: 2, py: '6px', display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', flex: '0 0 auto' }}>
                    <Button
                        variant="contained"
                        size="small"
                        onClick={() => navigate(createPath({ type: 'create', resource: 'colorInformation' }))}
                        sx={{ bgcolor: NAV_TEAL, color: '#fff', textTransform: 'none', fontWeight: 700, fontSize: 13, borderRadius: '4px', px: 2, py: '4px', minHeight: 30, boxShadow: 'none', '&:hover': { bgcolor: NAV_TEAL_DARK, boxShadow: 'none' } }}
                    >
                        New Color
                    </Button>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 0.5 }}>
                        <Typography variant="body1" sx={{ fontWeight: 700, fontSize: 15 }}>
                            Color Setup
                        </Typography>
                        <IconButton size="small" sx={{ color: 'text.secondary', p: '2px' }} onClick={() => document.getElementById(COLOR_COLUMNS_BUTTON_ID)?.click()}>
                            <SettingsOutlinedIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                        <Box sx={{ display: 'none' }}>
                            <ColumnsButton id={COLOR_COLUMNS_BUTTON_ID} storeKey={COLOR_COLUMNS_STORE_KEY} />
                        </Box>
                    </Box>
                </Box>

                <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                    <Paper variant="outlined" sx={{ width: 'min(560px, 100%)', display: 'flex', alignItems: 'center', borderRadius: '4px', borderColor: '#c9c9c9', overflow: 'hidden' }}>
                        <Box sx={{ px: 1, py: '5px', bgcolor: '#eef6f6', borderRight: '1px solid #e0e0e0' }}>
                            <FilterListIcon sx={{ fontSize: 18, color: NAV_TEAL }} />
                        </Box>
                        <InputBase
                            value={q}
                            onChange={e => setQ(e.target.value)}
                            placeholder="Search color titles..."
                            sx={{ flex: 1, fontSize: 13, px: 1, py: '4px' }}
                        />
                        <IconButton size="small" sx={{ p: '4px' }}><SearchIcon sx={{ fontSize: 18 }} /></IconButton>
                    </Paper>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {total != null && (
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12 }}>
                            {pageStart}–{pageEnd} / {total}
                        </Typography>
                    )}
                    <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                    {viewButtons.map(({ key, icon, label }) => (
                        <IconButton
                            key={key}
                            size="small"
                            onClick={() => setView(key as any)}
                            sx={{ bgcolor: view === key ? '#e0f2f1' : 'transparent', color: view === key ? NAV_TEAL : 'text.secondary' }}
                        >
                            {icon}
                        </IconButton>
                    ))}
                </Box>
            </Box>
        </TopToolbar>
    );
}

function ColorInformationKanban() {
    const { data, isLoading } = useListContext();
    const navigate = useNavigate();
    const createPath = useCreatePath();

    if (isLoading) {
        return (
            <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="text.secondary">Loading colors...</Typography>
            </Box>
        );
    }

    if (!data || Object.keys(data).length === 0) {
        return (
            <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="body1" color="text.secondary">
                    No colors found
                </Typography>
            </Box>
        );
    }

    const rows = Object.values(data);

    return (
        <Box 
            sx={{ 
                p: { xs: 1.5, sm: 2.5 }, 
                display: 'grid',
                gridTemplateColumns: {
                    xs: 'repeat(auto-fill, minmax(180px, 1fr))',
                    sm: 'repeat(auto-fill, minmax(240px, 1fr))',
                    md: 'repeat(auto-fill, minmax(260px, 1fr))'
                },
                gap: 2.5
            }}
        >
            {rows.map((record: any) => (
                <Paper
                    key={record.id || record.colorID || record.ColorID}
                    variant="outlined"
                    sx={{
                        cursor: 'pointer',
                        borderRadius: '10px',
                        transition: 'all 0.2s ease',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        '&:hover': { 
                            boxShadow: 4,
                            borderColor: NAV_TEAL 
                        },
                    }}
                    onClick={() => navigate(
                        createPath({ 
                            type: 'edit', 
                            resource: 'colorInformation', 
                            id: record.id || record.colorID || record.ColorID 
                        })
                    )}
                >
                    <Box sx={{ p: 2.5, flex: 1 }}>
                        {/* Avatar + Title */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                            <Avatar 
                                sx={{ 
                                    bgcolor: NAV_TEAL, 
                                    width: 52, 
                                    height: 52 
                                }}
                            >
                                <PaletteIcon />
                            </Avatar>

                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography 
                                    variant="subtitle1" 
                                    fontWeight={600}
                                    sx={{ lineHeight: 1.3, mb: 0.5 }}
                                >
                                    {record.colorTitle || record.ColorTitle || 'Untitled Color'}
                                </Typography>

                                {/* ID */}
                                <Typography 
                                    variant="caption" 
                                    color="text.secondary"
                                    sx={{ display: 'block' }}
                                >
                                    ID: {record.colorID || record.ColorID || record.id || '—'}
                                </Typography>
                            </Box>
                        </Box>

                        {/* Created Date */}
                        <Box sx={{ mt: 'auto' }}>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <AccessTimeIcon sx={{ fontSize: 14 }} />
                                Created: 
                            </Typography>
                            <DateField
                                source="entryUserDateTime"
                                record={record}
                                showTime
                                options={{ 
                                    year: 'numeric', 
                                    month: 'short', 
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                }}
                                sx={{ fontSize: '0.875rem', fontWeight: 500 }}
                            />
                        </Box>
                    </Box>

                    {/* Footer */}
                    <Box 
                        sx={{ 
                            borderTop: '1px solid',
                            borderColor: 'divider',
                            px: 2.5, 
                            py: 1.5,
                            bgcolor: '#f8f9fa',
                            borderBottomLeftRadius: '10px',
                            borderBottomRightRadius: '10px'
                        }}
                    >
                        <Typography variant="caption" color="text.secondary">
                            Click to edit color
                        </Typography>
                    </Box>
                </Paper>
            ))}
        </Box>
    );
}
const Column = DataTable.Col;

export default function ColorInformationList() {
    const [view] = useStore<'list' | 'kanban'>('colorInformation.listView', 'list');

    return (
        <List
            resource="colorInformation"
            actions={<ColorInformationListActions/>}
            perPage={25}
            // Sorting by the property name in your C# Model
            sort={{ field: 'ColorTitle', order: 'ASC' }}
        >
            {view === 'kanban' ? (
                <ColorInformationKanban />
            ) : (
                <DataTable
                    rowClick="edit"
                    bulkActionButtons={false}
                    storeKey={COLOR_COLUMNS_STORE_KEY}
                    sx={{ '& .MuiTableCell-head': { fontWeight: 700 } }}
                >
                    {/* Integrated sources from ColorInfo model */}
<Column source="colorID" label="ID" />
<Column source="colorTitle" label="Color Title" />
<Column source="entryUserDateTime" label="Created Date">
    <DateField source="entryUserDateTime" showTime />
</Column>
                </DataTable>
            )}
        </List>
    );
}