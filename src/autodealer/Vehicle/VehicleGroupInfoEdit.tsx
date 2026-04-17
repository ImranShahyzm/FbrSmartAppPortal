import { Edit, PrevNextButtons, SimpleForm, useRecordContext } from 'react-admin';
import { Box } from '@mui/material';

import { VehicleGroupInformationFormFields } from './VehicleGroupInfoFormFields';
import {
    FormDocumentWorkflowBar,
    FormSaveBridge,
    FORM_SAVE_VEHICLE_GROUP,
} from '../../common/formToolbar';
import { OdooSplitFormLayout } from '../../common/layout/OdooSplitFormLayout';

function VehicleGroupEditHeader() {
    const record = useRecordContext<{
        title?: string;
        vehicleGroupTitle?: string;
        vehicleGroupName?: string;
        id?: string | number;
    }>();
    const name =
        String(record?.title ?? record?.vehicleGroupTitle ?? record?.vehicleGroupName ?? '').trim();
    const displayTitle = name || `#${record?.id ?? ''}`;

    return (
        <FormDocumentWorkflowBar
            title={
                <>
                    Vehicle Group
                    {displayTitle ? (
                        <Box component="span" sx={{ ml: 0.75, fontWeight: 700 }}>
                            {displayTitle}
                        </Box>
                    ) : null}
                </>
            }
            subtitle="All changes are saved on the server."
            sx={{ mb: 1, py: '4px' }}
            navigationActions={
                <PrevNextButtons resource="vehicleGroupInfo" sort={{ field: 'id', order: 'DESC' }} />
            }
            saveEventName={FORM_SAVE_VEHICLE_GROUP}
            resource="vehicleGroupInfo"
            listPath="/vehicleGroupInfo"
            showDelete
            deleteConfirmMessage="Delete this vehicle group information?"
            deleteSuccessMessage="Vehicle group information deleted"
        />
    );
}

export default function VehicleGroupInformationEdit() {
    return (
        <Edit
            title="Vehicle Group Info"
            mutationMode="pessimistic"
            actions={false}
            sx={{
                width: '100%',
                maxWidth: '100%',
                '& .RaEdit-main': { maxWidth: '100%', width: '100%' },
                '& .RaEdit-card': {
                    maxWidth: '100% !important',
                    width: '100%',
                    boxShadow: 'none',
                },
            }}
        >
            <SimpleForm sx={{ maxWidth: 'none', width: '100%' }} toolbar={false}>
                <FormSaveBridge eventName={FORM_SAVE_VEHICLE_GROUP} />
                <VehicleGroupEditHeader />

                <OdooSplitFormLayout>
                    <VehicleGroupInformationFormFields />
                </OdooSplitFormLayout>
            </SimpleForm>
        </Edit>
    );
}
