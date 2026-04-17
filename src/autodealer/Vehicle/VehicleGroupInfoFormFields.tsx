import * as React from 'react';
import { TextInput, required } from 'react-admin';
import { Box, Card, CardContent, Grid, Typography } from '@mui/material';
import {
    CompactTextInput,
    FieldRow,
} from '../../common/odooCompactFormFields';
import { VehicleGroupVehiclesTable } from './VehicleGroupVehiclesTable'; // New component

export function VehicleGroupInformationFormFields() {
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
                        <Box sx={{ mb: 3 }}>
                            <Typography variant="overline" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                Vehicle Group
                            </Typography>
                            <Typography variant="h5" fontWeight={700} sx={{ lineHeight: 1.2, fontSize: '1.25rem' }}>
                                New Vehicle Group
                            </Typography>
                        </Box>

                        {/* Title instead of Name */}
                        <FieldRow label="Title">
                            <CompactTextInput
                                source="title"
                                label={false}
                                validate={required()}
                                fullWidth
                            />
                        </FieldRow>

                        {/* Vehicles Assignment Table */}
                        <Box sx={{ mt: 4 }}>
                            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
                                Vehicles
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                Add vehicle information to this group
                            </Typography>
                            <VehicleGroupVehiclesTable />
                        </Box>
                    </Grid>

                    {/* Right Side (optional for future use) */}
                    <Grid size={{ xs: 12, lg: 3 }} sx={{ alignSelf: 'flex-start' }}>
                        <Box sx={{ pt: { lg: 8 } }} />
                    </Grid>
                </Grid>
            </CardContent>
        </Card>
    );
}