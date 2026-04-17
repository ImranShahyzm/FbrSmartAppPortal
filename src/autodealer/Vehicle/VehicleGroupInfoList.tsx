import * as React from 'react';
import {
    List,
    DataTable,
    DateField,
    useListContext,
    useStore,
    useCreatePath,
} from 'react-admin';
import { useNavigate } from 'react-router-dom';
import { Box, Paper, Typography, Avatar } from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

import {
    AutodealerListToolbar,
    type AutodealerGroupPreset,
} from '../../common/autodealer/AutodealerListToolbar';

const NAV_TEAL = '#3d7a7a';

const VEHICLE_GROUP_COLUMNS_STORE_KEY = 'vehicleGroupInfo.columns';
const VEHICLE_GROUP_COLUMNS_BUTTON_ID = 'vehicleGroupInfo.columnsButton';
const VEHICLE_LIST_VIEW_KEY = 'vehicleGroupInfo.listView';
const VEHICLE_GROUP_BY_KEY = 'vehicleGroupInfo.groupBy';

const VEHICLE_GROUP_PRESETS: AutodealerGroupPreset[] = [
    { value: 'none', label: 'None', sort: { field: 'vehicleGroupTitle', order: 'ASC' } },
    { value: 'title', label: 'Title', sort: { field: 'vehicleGroupTitle', order: 'ASC' } },
    { value: 'created', label: 'Created date', sort: { field: 'entryUserDateTime', order: 'DESC' } },
];

function VehicleGroupInformationListActions() {
    const createPath = useCreatePath();
    const navigate = useNavigate();

    return (
        <AutodealerListToolbar
            newLabel="New"
            onNew={() => navigate(createPath({ type: 'create', resource: 'vehicleGroupInfo' }))}
            title="Vehicle Group Setup"
            columnsButtonId={VEHICLE_GROUP_COLUMNS_BUTTON_ID}
            columnsStoreKey={VEHICLE_GROUP_COLUMNS_STORE_KEY}
            searchPlaceholder="Search vehicle group title..."
            listViewStoreKey={VEHICLE_LIST_VIEW_KEY}
            groupByPresets={VEHICLE_GROUP_PRESETS}
            groupByStoreKey={VEHICLE_GROUP_BY_KEY}
        />
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
                    md: 'repeat(auto-fill, minmax(300px, 1fr))',
                },
                gap: 2.5,
            }}
        >
            {rows.map((record: any) => {
                const id =
                    record.vehicleGroupID ||
                    record.VehicleGroupID ||
                    record.vehicleGroupInfoID ||
                    record.VehicleGroupInfoID ||
                    record.id;
                const title =
                    record.vehicleGroupTitle || record.VehicleGroupTitle || 'Untitled vehicle group';

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
                                borderColor: NAV_TEAL,
                            },
                        }}
                        onClick={() =>
                            navigate(
                                createPath({
                                    type: 'edit',
                                    resource: 'vehicleGroupInfo',
                                    id,
                                })
                            )
                        }
                    >
                        <Box sx={{ p: 2.5, flex: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                <Avatar
                                    sx={{
                                        bgcolor: NAV_TEAL,
                                        width: 52,
                                        height: 52,
                                    }}
                                >
                                    🚗
                                </Avatar>

                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography
                                        variant="subtitle1"
                                        fontWeight={600}
                                        sx={{ lineHeight: 1.3, mb: 0.5 }}
                                    >
                                        {title}
                                    </Typography>

                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                        ID: {id ?? '—'}
                                    </Typography>
                                </Box>
                            </Box>

                            <Box sx={{ mt: 'auto' }}>
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                                >
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
                                        minute: '2-digit',
                                    }}
                                    sx={{ fontSize: '0.875rem', fontWeight: 500 }}
                                />
                            </Box>
                        </Box>

                        <Box
                            sx={{
                                borderTop: '1px solid',
                                borderColor: 'divider',
                                px: 2.5,
                                py: 1.5,
                                bgcolor: '#f8f9fa',
                                borderBottomLeftRadius: '10px',
                                borderBottomRightRadius: '10px',
                            }}
                        >
                            <Typography variant="caption" color="text.secondary">
                                Click to edit vehicle group
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
    const [view] = useStore<'list' | 'kanban'>(VEHICLE_LIST_VIEW_KEY, 'list');

    return (
        <List
            resource="vehicleGroupInfo"
            actions={<VehicleGroupInformationListActions />}
            perPage={25}
            sort={{ field: 'vehicleGroupTitle', order: 'ASC' }}
        >
            {/* Keep DataTable mounted in kanban so ColumnsButton + ColumnsSelector (gear) keep working */}
            <Box sx={{ display: view === 'list' ? 'block' : 'none' }} aria-hidden={view !== 'list'}>
                <DataTable
                    rowClick="edit"
                    bulkActionButtons={false}
                    storeKey={VEHICLE_GROUP_COLUMNS_STORE_KEY}
                    sx={{ '& .MuiTableCell-head': { fontWeight: 700 } }}
                >
                    <Column source="vehicleGroupID" label="ID" />
                    <Column source="vehicleGroupTitle" label="Vehicle group title" />
                    <Column source="entryUserDateTime" label="Created Date">
                        <DateField source="entryUserDateTime" showTime />
                    </Column>
                </DataTable>
            </Box>
            {view === 'kanban' ? <VehicleGroupInformationKanban /> : null}
        </List>
    );
}
