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
import PaletteIcon from '@mui/icons-material/Palette';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

import {
    AutodealerListToolbar,
    type AutodealerGroupPreset,
} from '../../common/autodealer/AutodealerListToolbar';

const NAV_TEAL = '#3d7a7a';

const COLOR_COLUMNS_STORE_KEY = 'colorInformation.columns';
const COLOR_COLUMNS_BUTTON_ID = 'colorInformation.columnsButton';
const COLOR_LIST_VIEW_KEY = 'colorInformation.listView';
const COLOR_GROUP_BY_KEY = 'colorInformation.groupBy';

const COLOR_GROUP_PRESETS: AutodealerGroupPreset[] = [
    { value: 'none', label: 'None', sort: { field: 'colorTitle', order: 'ASC' } },
    { value: 'title', label: 'Color title', sort: { field: 'colorTitle', order: 'ASC' } },
    { value: 'created', label: 'Created date', sort: { field: 'entryUserDateTime', order: 'DESC' } },
];

function ColorInformationListActions() {
    const createPath = useCreatePath();
    const navigate = useNavigate();

    return (
        <AutodealerListToolbar
            newLabel="New Color"
            onNew={() => navigate(createPath({ type: 'create', resource: 'colorInformation' }))}
            title="Color Setup"
            columnsButtonId={COLOR_COLUMNS_BUTTON_ID}
            columnsStoreKey={COLOR_COLUMNS_STORE_KEY}
            searchPlaceholder="Search color titles..."
            listViewStoreKey={COLOR_LIST_VIEW_KEY}
            groupByPresets={COLOR_GROUP_PRESETS}
            groupByStoreKey={COLOR_GROUP_BY_KEY}
        />
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
                    md: 'repeat(auto-fill, minmax(260px, 1fr))',
                },
                gap: 2.5,
            }}
        >
            {rows.map((record: any) => (
                <Paper
                    key={record.id || record.colorID || record.ColorID}
                    variant="outlined"
                    onClick={() =>
                        navigate(
                            createPath({
                                type: 'edit',
                                resource: 'colorInformation',
                                id: record.id || record.colorID || record.ColorID,
                            })
                        )
                    }
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

                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                        ID: {record.colorID || record.ColorID || record.id || '—'}
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
    const [view] = useStore<'list' | 'kanban'>(COLOR_LIST_VIEW_KEY, 'list');

    return (
        <List
            resource="colorInformation"
            actions={<ColorInformationListActions />}
            perPage={25}
            sort={{ field: 'colorTitle', order: 'ASC' }}
        >
            <Box sx={{ display: view === 'list' ? 'block' : 'none' }} aria-hidden={view !== 'list'}>
                <DataTable
                    rowClick="edit"
                    bulkActionButtons={false}
                    storeKey={COLOR_COLUMNS_STORE_KEY}
                    sx={{ '& .MuiTableCell-head': { fontWeight: 700 } }}
                >
                    <Column source="colorID" label="ID" />
                    <Column source="colorTitle" label="Color Title" />
                    <Column source="entryUserDateTime" label="Created Date">
                        <DateField source="entryUserDateTime" showTime />
                    </Column>
                </DataTable>
            </Box>
            {view === 'kanban' ? <ColorInformationKanban /> : null}
        </List>
    );
}
