import * as React from 'react';
import { RadioButtonGroupInput, ReferenceInput, email, required } from 'react-admin';
import { useWatch } from 'react-hook-form';
import { Box, Card, CardContent, Grid, Typography } from '@mui/material';
import { CustomerLogoBase64Input } from './CustomerLogoBase64Input';
import {
    CompactAutocompleteInput,
    CompactTextInput,
    FieldRow,
} from '../common/odooCompactFormFields';

const MULTILINE_COMPACT_SX = {
    '& .MuiInputBase-root': { minHeight: 'auto', alignItems: 'flex-start' },
    '& .MuiInputBase-input': { py: '6px' },
};

/** Same compact Odoo-style density as Product Registration. */
export function CustomerFormFields() {
    const partyName = useWatch({ name: 'partyName' }) as string | undefined;

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
                        <Box sx={{ mb: 1 }}>
                            <Typography variant="overline" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                Customer / Party
                            </Typography>
                            <Typography variant="h5" fontWeight={700} sx={{ lineHeight: 1.2, fontSize: '1.25rem' }}>
                                {partyName?.trim() || 'New customer'}
                            </Typography>
                        </Box>

                        <FieldRow label="Party name">
                            <CompactTextInput
                                source="partyName"
                                label={false}
                                validate={required()}
                                fullWidth
                            />
                        </FieldRow>
                        <FieldRow label="Business name">
                            <CompactTextInput source="partyBusinessName" label={false} fullWidth />
                        </FieldRow>

                        <Grid container columnSpacing={2} rowSpacing={0} sx={{ width: '100%', mb: '4px' }}>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <FieldRow label="Address" alignItems="flex-start">
                                    <CompactTextInput
                                        source="addressOne"
                                        label={false}
                                        fullWidth
                                        multiline
                                        minRows={2}
                                        sx={MULTILINE_COMPACT_SX}
                                    />
                                </FieldRow>
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <FieldRow label="Phone">
                                    <CompactTextInput source="phoneOne" label={false} fullWidth />
                                </FieldRow>
                            </Grid>
                        </Grid>

                        <Grid container columnSpacing={2} rowSpacing={0} sx={{ width: '100%', mb: '4px' }}>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <FieldRow label="FBR Province">
                                    <ReferenceInput
                                        source="provinceID"
                                        reference="fbrProvinces"
                                        label={false}
                                    >
                                        <CompactAutocompleteInput
                                            optionText="provincename"
                                            optionValue="id"
                                            label={false}
                                            fullWidth
                                        />
                                    </ReferenceInput>
                                </FieldRow>
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <FieldRow label="Contact number">
                                    <CompactTextInput source="contactPersonMobile" label={false} fullWidth />
                                </FieldRow>
                            </Grid>
                        </Grid>

                        <Grid container columnSpacing={2} rowSpacing={0} sx={{ width: '100%', mb: '4px' }}>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <FieldRow label="Email">
                                    <CompactTextInput
                                        source="email"
                                        label={false}
                                        fullWidth
                                        validate={email()}
                                    />
                                </FieldRow>
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <FieldRow label="NTN No">
                                    <CompactTextInput source="ntnno" label={false} fullWidth />
                                </FieldRow>
                            </Grid>
                        </Grid>

                        <Grid container columnSpacing={2} rowSpacing={0} sx={{ width: '100%' }}>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <FieldRow label="STN No">
                                    <CompactTextInput source="saleTaxRegNo" label={false} fullWidth />
                                </FieldRow>
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <FieldRow label="Contact person">
                                    <CompactTextInput source="contactPerson" label={false} fullWidth />
                                </FieldRow>
                            </Grid>
                        </Grid>
                    </Grid>

                    <Grid size={{ xs: 12, lg: 3 }} sx={{ alignSelf: 'flex-start' }}>
                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: { xs: 'flex-start', lg: 'flex-end' },
                                width: '100%',
                                gap: 1,
                            }}
                        >
                            <CustomerLogoBase64Input
                                source="businessLogoBase64"
                                label="Business Logo"
                            />
                            <Box
                                sx={{
                                    width: '100%',
                                    display: 'flex',
                                    justifyContent: { xs: 'flex-start', lg: 'flex-end' },
                                }}
                            >
                                <Box sx={{ minWidth: 220 }}>
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        sx={{ display: 'block', mb: 0.25, fontSize: '0.72rem' }}
                                    >
                                        FBR Status
                                    </Typography>
                                    <RadioButtonGroupInput
                                        source="fbrStatusActive"
                                        label={false}
                                        defaultValue="true"
                                        row
                                        choices={[
                                            { id: 'true', name: 'Active' },
                                            { id: 'false', name: 'Inactive' },
                                        ]}
                                        format={(v: any) => (v === null || v === undefined ? undefined : v ? 'true' : 'false')}
                                        parse={(v: any) => (v === null || v === undefined ? undefined : v === 'true')}
                                        sx={{
                                            '& .MuiFormControlLabel-root': { mr: 1, my: 0 },
                                            '& .MuiFormControlLabel-label': { fontSize: '0.82rem' },
                                            '& .MuiRadio-root': { p: 0.25 },
                                        }}
                                    />
                                </Box>
                            </Box>
                        </Box>
                    </Grid>
                </Grid>
            </CardContent>
        </Card>
    );
}
