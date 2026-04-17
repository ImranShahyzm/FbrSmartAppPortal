import * as React from 'react';
import {
    List,
    DataTable,
    DateField,
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
    Typography,
    Avatar,
} from '@mui/material';
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewKanbanOutlinedIcon from '@mui/icons-material/ViewKanbanOutlined';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';

const NAV_TEAL = '#3d7a7a';
const NAV_TEAL_DARK = '#2e6262';

// Store keys
const VEHICLE_GROUP_COLUMNS_STORE_KEY = 'vehicleGroupInfo.columns';
const VEHICLE_GROUP_COLUMNS_BUTTON_ID = 'vehicleGroupInfo.columnsButton';

function VehicleGroupInformationListActions() {
    const { page, perPage, total } = useListContext();
    const [q, setQ] = useOdooListSearchQ();
    const [view, setView] = useStore<'list' | 'kanban'>('vehicleGroupInfo.listView', 'list');
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
                        onClick={() => navigate(createPath({ type: 'create', resource: 'vehicleGroupInfo' }))}
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
                            '&:hover': { bgcolor: NAV_TEAL_DARK, boxShadow: 'none' } 
                        }}
                    >
                        New Vehicle Group
                    </Button>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 0.5 }}>
                        <Typography variant="body1" sx={{ fontWeight: 700, fontSize: 15 }}>
                            Vehicle Group Setup
                        </Typography>
                        <IconButton 
                            size="small" 
                            sx={{ color: 'text.secondary', p: '2px' }} 
                            onClick={() => document.getElementById(VEHICLE_GROUP_COLUMNS_BUTTON_ID)?.click()}
                        >
                            <SettingsOutlinedIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                        <Box sx={{ display: 'none' }}>
                            <ColumnsButton id={VEHICLE_GROUP_COLUMNS_BUTTON_ID} storeKey={VEHICLE_GROUP_COLUMNS_STORE_KEY} />
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
                            placeholder="Search sales service name or account number..."
                            sx={{ flex: 1, fontSize: 13, px: 1, py: '4px' }}
                        />
                        <IconButton size="small" sx={{ p: '4px' }}>
                            <SearchIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                    </Paper>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {total != null && (
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12 }}>
                            {pageStart}–{pageEnd} / {total}
                        </Typography>
                    )}
                    <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                    {viewButtons.map(({ key, icon }) => (
                        <IconButton
                            key={key}
                            size="small"
                            onClick={() => setView(key as any)}
                            sx={{ 
                                bgcolor: view === key ? '#e0f2f1' : 'transparent', 
                                color: view === key ? NAV_TEAL : 'text.secondary' 
                            }}
                        >
                            {icon}
                        </IconButton>
                    ))}
                </Box>
            </Box>
        </TopToolbar>
    );
}

function VehicleGroupInformationKanban() {
    const { data, isLoading } = useListContext();
    const navigate = useNavigate();
    const createPath = useCreatePath();

    if (isLoading) {
        return (
            <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="text.secondary">Loading vehicle groups...</Typography>
            </Box>
        );
    }

    if (!data || Object.keys(data).length === 0) {
        return (
            <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="body1" color="text.secondary">
                    No vehicle groups found
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
                    sm: 'repeat(auto-fill, minmax(280px, 1fr))',
                    md: 'repeat(auto-fill, minmax(300px, 1fr))'
                },
                gap: 2.5
            }}
        >
            {rows.map((record: any) => {
                const id = record.vehicleGroupInfoID || record.VehicleGroupInfoID || record.vehicleGroupID || record.VehicleGroupID || record.id;
                
                return (
                    <Paper
                        key={id}
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
                                resource: 'vehicleGroupInfo', 
                                id 
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
                                    📋
                                </Avatar>

                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography 
                                        variant="subtitle1" 
                                        fontWeight={600}
                                        sx={{ lineHeight: 1.3, mb: 0.5 }}
                                    >
                                        {record.saleServiceName || 'Untitled Sales Service'}
                                    </Typography>

                                    <Typography 
                                        variant="body2" 
                                        color="text.secondary"
                                        sx={{ mb: 0.5 }}
                                    >
                                        {record.saleServiceAccountNumber || '—'}
                                    </Typography>

                                    <Typography 
                                        variant="caption" 
                                        color="text.secondary"
                                        sx={{ display: 'block' }}
                                    >
                                        ID: {id || '—'}
                                    </Typography>
                                </Box>
                            </Box>

                            {/* Description */}
                            {record.description && (
                                <Typography 
                                    variant="body2" 
                                    color="text.secondary" 
                                    sx={{ 
                                        mb: 2, 
                                        display: '-webkit-box', 
                                        WebkitLineClamp: 2, 
                                        WebkitBoxOrient: 'vertical', 
                                        overflow: 'hidden' 
                                    }}
                                >
                                    {record.description}
                                </Typography>
                            )}

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
                                Click to edit sales service
                            </Typography>
                        </Box>
                    </Paper>
                );
            })}
        </Box>
    );
}

const Column = DataTable.Col;

export default function VehicleGroupInformationList() {
    const [view] = useStore<'list' | 'kanban'>('vehicleGroupInfo.listView', 'list');

    return (
        <List
            resource="vehicleGroupInfo"
            actions={<VehicleGroupInformationListActions />}
            perPage={25}
            sort={{ field: 'vehicleGroupName', order: 'ASC' }}   // Better default sort
        >
            {view === 'kanban' ? (
                <VehicleGroupInformationKanban />
            ) : (
                <DataTable
                    rowClick="edit"
                    bulkActionButtons={false}
                    storeKey={VEHICLE_GROUP_COLUMNS_STORE_KEY}
                    sx={{ '& .MuiTableCell-head': { fontWeight: 700 } }}
                >
                    <Column source="vehicleGroupInfoID" label="ID" />           {/* Primary Key */}
                    <Column source="vehicleGroupName" label="Vehicle Group Name" />
                    <Column source="vehicleGroupAccountNumber" label="Account Number" />
                    <Column source="description" label="Description" />
                    <Column source="vehicleGroupTitle" label="Vehicle Group Title" />
                    <Column source="entryUserDateTime" label="Created Date">
                        <DateField source="entryUserDateTime" showTime />
                    </Column>
                </DataTable>
            )}
        </List>
    );
}