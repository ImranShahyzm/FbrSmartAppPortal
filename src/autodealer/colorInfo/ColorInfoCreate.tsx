import * as React from 'react';
import { Create, SimpleForm, TextInput, required, useTranslate } from 'react-admin';
import { Box, CardContent, IconButton, Paper, Tooltip, Typography } from '@mui/material';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';

import {
    FormDocumentWorkflowBar,
    FormSaveBridge,
    FORM_SAVE_COLOR_INFORMATION,
} from '../../common/formToolbar';

export default function ColorInformationCreate() {
    const translate = useTranslate();

    return (
        <Create actions={false} title="Create Color Information" redirect="edit">
            <SimpleForm mode="onSubmit" toolbar={false}>
                <FormSaveBridge eventName={FORM_SAVE_COLOR_INFORMATION} />

                <FormDocumentWorkflowBar
                    title={translate('resources.colorInfo.document', { _: 'Color' })}
                    subtitle={translate('resources.colorInfo.subtitle', {
                        _: 'All changes are saved on the server.',
                    })}
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
                    saveEventName={FORM_SAVE_COLOR_INFORMATION}
                    resource="colorInformation"
                    listPath="/colorInformation"
                    showDelete={false}
                    showSave
                />

                <Box
                    sx={{
                        width: '100%',
                        maxWidth: 720,
                        mx: 'auto',
                        px: { xs: 2, sm: 3 },
                    }}
                >
                    <Paper
                        elevation={0}
                        variant="outlined"
                        sx={{
                            borderRadius: 2,
                            borderColor: 'divider',
                            overflow: 'hidden',
                        }}
                    >
                        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
                            <Typography
                                variant="overline"
                                color="text.secondary"
                                sx={{ fontSize: '0.7rem', display: 'block', mb: 0.5 }}
                            >
                                {translate('resources.colorInfo.document', { _: 'Color' })}
                            </Typography>
                            <Typography variant="h5" fontWeight={700} sx={{ lineHeight: 1.2, fontSize: '1.25rem', mb: 3 }}>
                                {translate('resources.colorInfo.new_invoice_title', {
                                    _: 'New color Information',
                                })}
                            </Typography>

                            <TextInput
                                source="colorTitle"
                                label="Color Title"
                                validate={required()}
                                fullWidth
                                sx={{
                                    '& .MuiInputBase-root': {
                                        backgroundColor: '#fff',
                                    },
                                }}
                            />
                        </CardContent>
                    </Paper>
                </Box>
            </SimpleForm>
        </Create>
    );
}
