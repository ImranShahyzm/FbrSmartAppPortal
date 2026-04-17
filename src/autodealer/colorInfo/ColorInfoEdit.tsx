import * as React from 'react';
import { Edit, SimpleForm, TextInput, required } from 'react-admin';
import { Box, Typography, Paper } from '@mui/material';
import { FormHeaderToolbar, FormSaveBridge, FORM_SAVE_CUSTOMER } from '../../common/formToolbar';

export default function ColorInformationEdit() {
    return (
        <Edit
            title="Color Information"
            mutationMode="pessimistic"
        >
            <SimpleForm>
                <FormSaveBridge eventName={FORM_SAVE_CUSTOMER} />

                {/* Sticky Header */}
                <Paper
                    variant="outlined"
                    sx={{
                        position: { md: 'sticky' },
                        top: { md: 0 },
                        zIndex: 5,
                        p: 2,
                        mb: 3,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 2,
                    }}
                >
                    <Box>
                        <Typography variant="h6" fontWeight={600}>
                            Color Information
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Edit color details • Changes are saved automatically
                        </Typography>
                    </Box>

                    <FormHeaderToolbar
                        saveEventName={FORM_SAVE_CUSTOMER}
                        resource="colorInformation"
                        listPath="/colorInformation"
                        showDelete
                        deleteConfirmMessage="Delete this color?"
                        deleteSuccessMessage="Color deleted successfully"
                    />
                </Paper>

                {/* Main Form Fields */}
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