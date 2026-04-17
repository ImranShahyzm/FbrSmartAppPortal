import * as React from 'react';
import { Edit, PrevNextButtons, SimpleForm, TextInput, required, useRecordContext, useTranslate } from 'react-admin';
import { Box } from '@mui/material';

import {
    FormDocumentWorkflowBar,
    FormSaveBridge,
    FORM_SAVE_COLOR_INFORMATION,
} from '../../common/formToolbar';

function ColorEditHeader() {
    const translate = useTranslate();
    const record = useRecordContext<{ colorTitle?: string; id?: string | number }>();
    const title = String(record?.colorTitle ?? '').trim();
    const displayTitle = title || (record?.id != null ? `#${record.id}` : '');

    return (
        <FormDocumentWorkflowBar
            title={
                <>
                    {translate('resources.colorInfo.document', { _: 'Color' })}
                    {displayTitle ? (
                        <Box component="span" sx={{ ml: 0.75, fontWeight: 700 }}>
                            {displayTitle}
                        </Box>
                    ) : null}
                </>
            }
            subtitle={translate('resources.colorInfo.subtitle', {
                _: 'All changes are saved on the server.',
            })}
            sx={{ mb: 1, py: '4px' }}
            navigationActions={
                <PrevNextButtons resource="colorInformation" sort={{ field: 'id', order: 'DESC' }} />
            }
            saveEventName={FORM_SAVE_COLOR_INFORMATION}
            resource="colorInformation"
            listPath="/colorInformation"
            showDelete
            deleteConfirmMessage="Delete this color?"
            deleteSuccessMessage="Color deleted successfully"
        />
    );
}

export default function ColorInformationEdit() {
    return (
        <Edit title="Color Information" mutationMode="pessimistic" actions={false}>
            <SimpleForm toolbar={false}>
                <FormSaveBridge eventName={FORM_SAVE_COLOR_INFORMATION} />
                <ColorEditHeader />

                <Box sx={{ maxWidth: 700, mx: 'auto', width: '100%' }}>
                    <TextInput
                        source="colorTitle"
                        label="Color Title"
                        validate={required()}
                        fullWidth
                        variant="outlined"
                    />
                </Box>
            </SimpleForm>
        </Edit>
    );
}
