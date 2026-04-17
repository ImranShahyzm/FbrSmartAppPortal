import * as React from 'react';
import { TextInput, required } from 'react-admin';
import { Box, Card, CardContent, Grid, Typography } from '@mui/material';
import {
    CompactTextInput,
    FieldRow,
} from '../../common/odooCompactFormFields';

export function SalesServiceInformationFormFields() {
    return (
        <Card
            variant="outlined"
            sx={{
                mt: 0,
                width: '100%',
                maxWidth: '100%',
                borderColor: '#dee2e6',
                borderRadius: '4px',
                boxShadow: 'none',
            }}
        >
            <CardContent sx={{ p: '16px 20px !important', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                <Grid container columnSpacing={4} rowSpacing={0} alignItems="flex-start" sx={{ width: '100%' }}>
                    <Grid size={{ xs: 12, lg: 9 }}>
                        <Box sx={{ mb: 2 }}>
                            <Typography variant="overline" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                Sales Service
                            </Typography>
                            <Typography variant="h5" fontWeight={700} sx={{ lineHeight: 1.2, fontSize: '1.25rem' }}>
                                New Sales Service
                            </Typography>
                        </Box>

                        <FieldRow label="Sale Service Name">
                            <CompactTextInput
                                source="saleServiceName"
                                label={false}
                                validate={required()}
                                fullWidth
                            />
                        </FieldRow>

                        <FieldRow label="Sale Service Account Number">
                            <CompactTextInput
                                source="saleServiceAccountNumber"
                                label={false}
                                validate={required()}
                                fullWidth
                            />
                        </FieldRow>

                        <FieldRow label="Description">
                            <CompactTextInput
                                source="description"
                                label={false}
                                multiline
                                minRows={3}
                                fullWidth
                            />
                        </FieldRow>

                        <FieldRow label="Vehicle Group Title">
                            <CompactTextInput
                                source="vehicleGroupTitle"
                                label={false}
                                fullWidth
                            />
                        </FieldRow>
                    </Grid>

                    {/* Right Side - Empty for now (you can add logo or other fields later) */}
                    <Grid size={{ xs: 12, lg: 3 }} sx={{ alignSelf: 'flex-start' }}>
                        <Box sx={{ pt: { lg: 6 } }} />
                    </Grid>
                </Grid>
            </CardContent>
        </Card>
    );
}