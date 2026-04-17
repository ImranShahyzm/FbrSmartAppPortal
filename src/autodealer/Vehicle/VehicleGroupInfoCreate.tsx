import * as React from 'react';
import { Create, SimpleForm, useNotify, useRedirect } from 'react-admin';
import { Box, Divider, Typography } from '@mui/material';
import { VehicleGroupInformationFormFields } from './VehicleGroupInfoFormFields';
import { VehicleGroupInformationFormToolbar } from './VehicleGroupInfoFormToolbar';
import { FormSaveBridge, FORM_SAVE_CUSTOMER } from '../../common/formToolbar';
import { OdooSplitFormLayout } from '../../common/layout/OdooSplitFormLayout';

export default function VehicleGroupInformationCreate() {
    const notify = useNotify();
    const redirect = useRedirect();

    const handleSave = async (data: any) => {
        try {
            const { title, vehicles = [] } = data;

            if (!title?.trim()) {
                notify('Vehicle Group Title is required', { type: 'warning' });
                return;
            }

            // ==================== 1. Create Vehicle Group ====================
            const groupResponse = await fetch('http://localhost:5227/api/VehicleGroup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    VehicleGroupTitle: title.trim(),
                }),
            });

            if (!groupResponse.ok) {
                const errorText = await groupResponse.text();
                throw new Error(`Vehicle Group failed: ${errorText}`);
            }

            const groupData = await groupResponse.json();
            const vehicleGroupID = groupData?.vehicleGroupID || 
                                 groupData?.id || 
                                 groupData?.VehicleGroupID;

            if (!vehicleGroupID) {
                throw new Error('Vehicle Group created but no ID returned');
            }

            // ==================== 2. Create Vehicle Info ====================
            if (vehicles.length > 0) {
                const vehiclePromises = vehicles
                    .filter((v: any) => v.vehicleTitle?.trim())
                    .map((v: any) =>
                        fetch('http://localhost:5227/api/VehicleInfo', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                VehicleGroupID: vehicleGroupID,
                                VehicleCode: v.vehicleCode?.trim() || null,
                                VehicleTitle: v.vehicleTitle.trim(),
                            }),
                        })
                    );

                await Promise.all(vehiclePromises);
            }

            notify('Vehicle Group and Vehicles created successfully!', { type: 'success' });
            redirect('list', 'VehicleGroup');
        } catch (error: any) {
            console.error(error);
            notify(`Error: ${error.message}`, { type: 'error' });
        }
    };

    return (
        <Create
            title="Vehicle Group Info"
            actions={false}
            sx={{
                width: '100%',
                maxWidth: '100%',
                '& .RaCreate-main': { maxWidth: '100%', width: '100%' },
                '& .RaCreate-card': {
                    maxWidth: '100% !important',
                    width: '100%',
                    boxShadow: 'none',
                },
            }}
        >
            <SimpleForm
                defaultValues={{ vehicles: [] }}
                sx={{ maxWidth: 'none', width: '100%' }}
                toolbar={false}
                onSubmit={handleSave}
            >
                <FormSaveBridge eventName={FORM_SAVE_CUSTOMER} />

                <Box
                    sx={{
                        position: { md: 'sticky' },
                        top: { md: 0 },
                        zIndex: 5,
                        bgcolor: 'background.paper',
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        px: 2,
                        py: '6px',
                        mb: 1.5,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 2,
                        flexWrap: 'wrap',
                    }}
                >
                    <Box sx={{ minWidth: 0 }}>
                        <Typography variant="subtitle2" fontWeight={700} noWrap sx={{ fontSize: '0.85rem' }}>
                            Vehicle Group
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: '0.72rem' }}>
                            All changes are saved on the server.
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />
                        <VehicleGroupInformationFormToolbar />
                    </Box>
                </Box>

                <OdooSplitFormLayout>
                    <VehicleGroupInformationFormFields />
                </OdooSplitFormLayout>
            </SimpleForm>
        </Create>
    );
}