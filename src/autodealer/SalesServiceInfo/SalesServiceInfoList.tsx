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

const SALES_SERVICE_COLUMNS_STORE_KEY = 'salesServiceInfo.columns';
const SALES_SERVICE_COLUMNS_BUTTON_ID = 'salesServiceInfo.columnsButton';
const SALES_LIST_VIEW_KEY = 'salesServiceInfo.listView';
const SALES_GROUP_BY_KEY = 'salesServiceInfo.groupBy';

const SALES_GROUP_PRESETS: AutodealerGroupPreset[] = [
    { value: 'none', label: 'None', sort: { field: 'name', order: 'ASC' } },
    { value: 'name', label: 'Name', sort: { field: 'name', order: 'ASC' } },
    { value: 'created', label: 'Created date', sort: { field: 'entryUserDateTime', order: 'DESC' } },
];

function SalesServiceInformationListActions() {
    const createPath = useCreatePath();
    const navigate = useNavigate();

    return (
        <AutodealerListToolbar
            newLabel="New Sales Service"
            onNew={() => navigate(createPath({ type: 'create', resource: 'salesServiceInfo' }))}
            title="Sales Service Setup"
            columnsButtonId={SALES_SERVICE_COLUMNS_BUTTON_ID}
            columnsStoreKey={SALES_SERVICE_COLUMNS_STORE_KEY}
            searchPlaceholder="Search name, description, or GL account ID..."
            listViewStoreKey={SALES_LIST_VIEW_KEY}
            groupByPresets={SALES_GROUP_PRESETS}
            groupByStoreKey={SALES_GROUP_BY_KEY}
        />
    );
}

function SalesServiceInformationKanban() {
    const { data, isLoading } = useListContext();
    const navigate = useNavigate();
    const createPath = useCreatePath();

    if (isLoading) {
        return (
            <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="text.secondary">Loading sales services...</Typography>
            </Box>
        );
    }

    if (!data || Object.keys(data).length === 0) {
        return (
            <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="body1" color="text.secondary">
                    No sales services found
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
                    record.saleServiceInfoID ||
                    record.SaleServiceInfoID ||
                    record.saleServiceID ||
                    record.SaleServiceID ||
                    record.id;

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
                                    resource: 'salesServiceInfo',
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
                                    📋
                                </Avatar>

                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography
                                        variant="subtitle1"
                                        fontWeight={600}
                                        sx={{ lineHeight: 1.3, mb: 0.5 }}
                                    >
                                        {record.name || 'Untitled Sales Service'}
                                    </Typography>

                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                        {record.glcaId != null && record.glcaId !== '' ? String(record.glcaId) : '—'}
                                    </Typography>

                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                        ID: {id || '—'}
                                    </Typography>
                                </Box>
                            </Box>

                            {record.description && (
                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    sx={{
                                        mb: 2,
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden',
                                    }}
                                >
                                    {record.description}
                                </Typography>
                            )}

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

export default function SalesServiceInformationList() {
    const [view] = useStore<'list' | 'kanban'>(SALES_LIST_VIEW_KEY, 'list');

    return (
        <List
            resource="salesServiceInfo"
            actions={<SalesServiceInformationListActions />}
            perPage={25}
            sort={{ field: 'name', order: 'ASC' }}
        >
            <Box sx={{ display: view === 'list' ? 'block' : 'none' }} aria-hidden={view !== 'list'}>
                <DataTable
                    rowClick="edit"
                    bulkActionButtons={false}
                    storeKey={SALES_SERVICE_COLUMNS_STORE_KEY}
                    sx={{ '& .MuiTableCell-head': { fontWeight: 700 } }}
                >
                    <Column source="saleServiceInfoID" label="ID" />
                    <Column source="name" label="Sale Service Name" />
                    <Column source="glcaId" label="GL account ID" />
                    <Column source="description" label="Description" />
                    <Column source="vehicleGroupId" label="Vehicle group ID" />
                    <Column source="entryUserDateTime" label="Created Date">
                        <DateField source="entryUserDateTime" showTime />
                    </Column>
                </DataTable>
            </Box>
            {view === 'kanban' ? <SalesServiceInformationKanban /> : null}
        </List>
    );
}
