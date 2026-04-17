import * as React from 'react';
import { BooleanInput, ReferenceInput, required } from 'react-admin';
import { useWatch } from 'react-hook-form';
import { Box, Card, CardContent, Grid, Typography } from '@mui/material';
import { ProductImageBase64Input } from './ProductImageBase64Input';
import { FbrHsCodeInput, ProductProfileFbrHsUomFields } from './ProductProfileFbrHsUomFields';
import {
    CompactAutocompleteInput,
    CompactNumberInput,
    CompactSelectInput,
    CompactTextInput,
    FieldRow,
} from './productProfileCompactForm';

const FBR_PRODUCT_TYPE_CHOICES = [
    { id: 'purchase', name: 'purchase' },
    { id: 'sale', name: 'sale' },
    { id: 'Services', name: 'Services' },
    { id: 'none', name: 'none' },
];

export function ProductProfileFormFields() {
    const productName = useWatch({ name: 'productName' }) as string | undefined;
    const sroScheduleNoText = useWatch({ name: 'sroScheduleNoText' }) as string | undefined;
    const sroItemRefText = useWatch({ name: 'sroItemRefText' }) as string | undefined;
    const showFixedNotifiedFields =
        Boolean(sroScheduleNoText && String(sroScheduleNoText).trim().length > 0) ||
        Boolean(sroItemRefText && String(sroItemRefText).trim().length > 0);
    const [allowedUomIds, setAllowedUomIds] = React.useState<number[] | null>(null);

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
                                Product
                            </Typography>
                            <Typography variant="h5" fontWeight={700} sx={{ lineHeight: 1.2, fontSize: '1.25rem' }}>
                                {productName?.trim() || 'New product registration'}
                            </Typography>
                        </Box>

                        <FieldRow label="Product Name">
                            <CompactTextInput
                                source="productName"
                                label={false}
                                validate={required()}
                                fullWidth
                            />
                        </FieldRow>

                        <Grid container columnSpacing={2} rowSpacing={0} sx={{ width: '100%', mb: '4px' }}>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <FieldRow label="Product No">
                                    <CompactTextInput
                                        source="productNo"
                                        label={false}
                                        validate={required()}
                                        fullWidth
                                    />
                                </FieldRow>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <FieldRow label="HS Code">
                                    <FbrHsCodeInput onAllowedUomIdsChange={setAllowedUomIds} />
                                </FieldRow>
                            </Grid>
                        </Grid>

                        <ProductProfileFbrHsUomFields allowedUomIds={allowedUomIds} />

                        <Box sx={{ mt: 1, width: '100%' }}>
                            <FieldRow label="Sale Type FBR">
                                <ReferenceInput
                                    source="fbrPdiTransTypeId"
                                    reference="fbrPdiTransTypes"
                                    label={false}
                                    perPage={50}
                                >
                                    <CompactAutocompleteInput
                                        optionText="description"
                                        optionValue="id"
                                        label={false}
                                        fullWidth
                                        noOptionsText="No matches"
                                        TextFieldProps={{
                                            placeholder: 'Search by name or transaction type ID…',
                                        }}
                                    />
                                </ReferenceInput>
                            </FieldRow>

                            <FieldRow label="Product Type">
                                <CompactSelectInput
                                    source="fbrProductType"
                                    label={false}
                                    choices={FBR_PRODUCT_TYPE_CHOICES}
                                    emptyText="—"
                                    fullWidth
                                />
                            </FieldRow>

                            <Grid container columnSpacing={2} rowSpacing={0} sx={{ width: '100%', mb: '4px' }}>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <FieldRow label="Sales Prices">
                                        <CompactNumberInput source="rateValue" label={false} fullWidth />
                                    </FieldRow>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <FieldRow label="Purchase Price">
                                        <CompactNumberInput source="purchasePrice" label={false} fullWidth />
                                    </FieldRow>
                                </Grid>
                            </Grid>

                            <FieldRow label="SRO Schedule Number">
                                <CompactTextInput
                                    source="sroScheduleNoText"
                                    label={false}
                                    fullWidth
                                    placeholder="e.g. SRO 2023/2501 (optional)"
                                />
                            </FieldRow>

                            <FieldRow label="SRO Item">
                                <CompactTextInput
                                    source="sroItemRefText"
                                    label={false}
                                    fullWidth
                                    placeholder="e.g. 45(i) (optional)"
                                />
                            </FieldRow>

                            {showFixedNotifiedFields ? (
                                <Grid container columnSpacing={2} rowSpacing={0} sx={{ width: '100%', mb: '4px' }}>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <FieldRow label="Fixed Notified Applicable">
                                            <BooleanInput
                                                source="fixedNotifiedApplicable"
                                                label={false}
                                                sx={{
                                                    '& .MuiFormControlLabel-root': { m: 0 },
                                                    '& .MuiFormHelperText-root': { display: 'none' },
                                                    '& .MuiCheckbox-root': { p: '4px' },
                                                }}
                                            />
                                        </FieldRow>
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <FieldRow label="MRP Rate">
                                            <CompactNumberInput
                                                source="mrpRateValue"
                                                label={false}
                                                fullWidth
                                            />
                                        </FieldRow>
                                    </Grid>
                                </Grid>
                            ) : null}
                        </Box>
                    </Grid>

                    <Grid size={{ xs: 12, lg: 3 }} sx={{ alignSelf: 'flex-start' }}>
                        <Box
                            sx={{
                                display: 'flex',
                                justifyContent: { xs: 'flex-start', lg: 'flex-end' },
                                width: '100%',
                            }}
                        >
                            <ProductImageBase64Input
                                source="productImageBase64"
                                imageSource="productImage"
                                label="Product Image"
                            />
                        </Box>
                    </Grid>
                </Grid>
            </CardContent>
        </Card>
    );
}
