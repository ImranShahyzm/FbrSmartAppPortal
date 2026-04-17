import * as React from 'react';
import { required } from 'react-admin';
import { TextInput } from 'react-admin';
import { Box, Card, CardContent, Typography } from '@mui/material';

export function ColorInformationFormFields() {
    return (
        <Card variant="outlined" sx={{ maxWidth: 700, mx: 'auto' }}>
            <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
                    Color Information
                </Typography>

                <TextInput
                    source="colorTitle"
                    label="Color Title"
                    validate={required()}
                    fullWidth
                />
            </CardContent>
        </Card>
    );
}