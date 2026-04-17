import * as React from 'react';
import { Create, SimpleForm, useNotify, useRedirect } from 'react-admin';
import { useFormContext } from 'react-hook-form';
import { Box, IconButton, Tooltip } from '@mui/material';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';

import { VehicleGroupInformationFormFields } from './VehicleGroupInfoFormFields';
import {
    FormDocumentWorkflowBar,
    FORM_SAVE_VEHICLE_GROUP,
} from '../../common/formToolbar';
import { OdooSplitFormLayout } from '../../common/layout/OdooSplitFormLayout';

/**
 * Cloud save must run the custom create flow (VehicleGroup + VehicleInfo APIs), not the default dataProvider.create.
 */
function VehicleGroupCreateSaveBridge(props: { onSave: (data: Record<string, unknown>) => Promise<void> }) {
    const { handleSubmit } = useFormContext();
    const notify = useNotify();
    const onSaveRef = React.useRef(props.onSave);
    onSaveRef.current = props.onSave;

    React.useEffect(() => {
        const onWindowSave = () => {
            handleSubmit(async values => {
                try {
                    await onSaveRef.current(values);
                } catch (error: unknown) {
                    const msg =
                        error instanceof Error ? error.message : typeof error === 'string' ? error : 'Save failed';
                    notify(msg, { type: 'warning' });
                }
            })();
        };
        window.addEventListener(FORM_SAVE_VEHICLE_GROUP, onWindowSave);
        return () => window.removeEventListener(FORM_SAVE_VEHICLE_GROUP, onWindowSave);
    }, [handleSubmit, notify]);

    return null;
}

export default function VehicleGroupInformationCreate() {
    const notify = useNotify();
    const redirect = useRedirect();

    const handleSave = React.useCallback(
        async (data: Record<string, unknown>) => {
            const title = data.title as string | undefined;
            const vehicles = (data.vehicles as unknown[]) ?? [];

            if (!title?.trim()) {
                notify('Vehicle Group Title is required', { type: 'warning' });
                return;
            }

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
            const vehicleGroupID =
                groupData?.vehicleGroupID ?? groupData?.id ?? groupData?.VehicleGroupID;

            if (!vehicleGroupID) {
                throw new Error('Vehicle Group created but no ID returned');
            }

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
                        }).then(async res => {
                            if (!res.ok) {
                                const t = await res.text();
                                throw new Error(`VehicleInfo create failed: ${t}`);
                            }
                            return res;
                        })
                    );

                await Promise.all(vehiclePromises);
            }

            notify('Vehicle Group and Vehicles created successfully!', { type: 'success' });
            redirect('list', 'vehicleGroupInfo');
        },
        [notify, redirect]
    );

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
                mode="onSubmit"
                sx={{ maxWidth: 'none', width: '100%' }}
                toolbar={false}
                onSubmit={handleSave}
            >
                <VehicleGroupCreateSaveBridge onSave={handleSave} />

                <FormDocumentWorkflowBar
                    title="Vehicle Group"
                    subtitle="All changes are saved on the server."
                    sx={{ mb: 1, py: '4px' }}
                    navigationActions={
                        <Box sx={{ display: 'inline-flex', alignItems: 'center' }}>
                            <Tooltip title="Previous">
                                <span>
                                    <IconButton size="small" disabled sx={{ color: 'text.primary' }}>
                                        <NavigateBeforeIcon sx={{ fontSize: 18 }} />
                                    </IconButton>
                                </span>
                            </Tooltip>
                            <Tooltip title="Next">
                                <span>
                                    <IconButton size="small" disabled sx={{ color: 'text.primary' }}>
                                        <NavigateNextIcon sx={{ fontSize: 18 }} />
                                    </IconButton>
                                </span>
                            </Tooltip>
                        </Box>
                    }
                    saveEventName={FORM_SAVE_VEHICLE_GROUP}
                    resource="vehicleGroupInfo"
                    listPath="/vehicleGroupInfo"
                    showDelete={false}
                    showSave
                />

                <OdooSplitFormLayout>
                    <VehicleGroupInformationFormFields />
                </OdooSplitFormLayout>
            </SimpleForm>
        </Create>
    );
}
