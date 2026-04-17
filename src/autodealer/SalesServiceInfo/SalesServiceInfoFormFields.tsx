import * as React from 'react';
import { NumberInput, required } from 'react-admin';
import { Box, Card, CardContent, Grid, Typography } from '@mui/material';
import {
    CompactNumberInput,
    CompactTextInput,
    FieldRow,
} from '../../common/odooCompactFormFields';

type FormVariant = 'create' | 'edit';

/** Field names match API camelCase JSON: name, glcaId, description, vehicleGroupId (see SaleServiceInfo). */
export function SalesServiceInformationFormFields(props: { variant?: FormVariant }) {
    const variant = props.variant ?? 'create';
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
                {variant === 'edit' ? (
                    <NumberInput source="saleServiceInfoID" sx={{ display: 'none' }} />
                ) : null}
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
                                source="name"
                                label={false}
                                validate={required()}
                                fullWidth
                            />
                        </FieldRow>

                        <FieldRow label="GL account ID">
                            <CompactNumberInput
                                source="glcaId"
                                label={false}
                                validate={required()}
                                fullWidth
                            />
                        </FieldRow>

                        <FieldRow label="Description" alignItems="flex-start">
                            <CompactTextInput
                                source="description"
                                label={false}
                                multiline
                                minRows={3}
                                fullWidth
                            />
                        </FieldRow>

                        <FieldRow label="Vehicle group ID">
                            <CompactNumberInput source="vehicleGroupId" label={false} fullWidth />
                        </FieldRow>
                    </Grid>

                    <Grid size={{ xs: 12, lg: 3 }} sx={{ alignSelf: 'flex-start' }}>
                        <Box sx={{ pt: { lg: 6 } }} />
                    </Grid>
                </Grid>
            </CardContent>
        </Card>
    );
}
