import { Create, SimpleForm } from 'react-admin';
import { Box, IconButton, Tooltip } from '@mui/material';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';

import { SalesServiceInformationFormFields } from './SalesServiceInfoFormFields';
import {
    FormDocumentWorkflowBar,
    FormSaveBridge,
    FORM_SAVE_SALES_SERVICE_INFO,
} from '../../common/formToolbar';
import { OdooSplitFormLayout } from '../../common/layout/OdooSplitFormLayout';

export default function SalesServiceInformationCreate() {
    return (
        <Create
            title="Sales Service Info"
            actions={false}
            redirect="edit"
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
            <SimpleForm mode="onSubmit" sx={{ maxWidth: 'none', width: '100%' }} toolbar={false}>
                <FormSaveBridge eventName={FORM_SAVE_SALES_SERVICE_INFO} />

                <FormDocumentWorkflowBar
                    title="Sales Service Info"
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
                    saveEventName={FORM_SAVE_SALES_SERVICE_INFO}
                    resource="salesServiceInfo"
                    listPath="/salesServiceInfo"
                    showDelete={false}
                    showSave
                />

                <OdooSplitFormLayout>
                    <SalesServiceInformationFormFields variant="create" />
                </OdooSplitFormLayout>
            </SimpleForm>
        </Create>
    );
}
