import { Edit, PrevNextButtons, SimpleForm, useRecordContext } from 'react-admin';
import { Box } from '@mui/material';

import { SalesServiceInformationFormFields } from './SalesServiceInfoFormFields';
import {
    FormDocumentWorkflowBar,
    FormSaveBridge,
    FORM_SAVE_SALES_SERVICE_INFO,
} from '../../common/formToolbar';
import { OdooSplitFormLayout } from '../../common/layout/OdooSplitFormLayout';

function SalesServiceEditHeader() {
    const record = useRecordContext<{ name?: string; id?: string | number }>();
    const name = String(record?.name ?? '').trim();
    const displayTitle = name || `#${record?.id ?? ''}`;

    return (
        <FormDocumentWorkflowBar
            title={
                <>
                    Sales Service Info
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
                <PrevNextButtons resource="salesServiceInfo" sort={{ field: 'id', order: 'DESC' }} />
            }
            saveEventName={FORM_SAVE_SALES_SERVICE_INFO}
            resource="salesServiceInfo"
            listPath="/salesServiceInfo"
            showDelete
            deleteConfirmMessage="Delete this sales service information?"
            deleteSuccessMessage="Sales service information deleted"
        />
    );
}

export default function SalesServiceInformationEdit() {
    return (
        <Edit
            title="Sales Service Info"
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
                <FormSaveBridge eventName={FORM_SAVE_SALES_SERVICE_INFO} />
                <SalesServiceEditHeader />

                <OdooSplitFormLayout>
                    <SalesServiceInformationFormFields variant="edit" />
                </OdooSplitFormLayout>
            </SimpleForm>
        </Edit>
    );
}
