import * as React from 'react';
import { PrevNextButtons, TextInput, useTranslate } from 'react-admin';
import { Box, Card, CardContent, Divider, Grid, Typography } from '@mui/material';

import { FormHeaderToolbar, FormSaveBridge, FORM_SAVE_GEN_BANK_INFORMATION } from '../../common/formToolbar';
import {
    masterDetailPrimaryCardContentSx,
    masterDetailPrimaryCardSx,
    stickySimpleFormHeaderBarSx,
} from '../../common/masterDetailFormTheme';
import { securityGroupSimpleFormFieldSx } from '../../settings/SecurityGroupForm';

function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <Typography
            variant="overline"
            sx={{
                display: 'block',
                letterSpacing: '0.08em',
                fontWeight: 700,
                color: 'text.secondary',
                fontSize: 11,
                mt: 0.5,
                mb: 1,
            }}
        >
            {children}
        </Typography>
    );
}

export function GenBankInformationFormInner({ variant }: { variant: 'create' | 'edit' }) {
    const translate = useTranslate();

    return (
        <>
            <FormSaveBridge eventName={FORM_SAVE_GEN_BANK_INFORMATION} />

            <Box sx={stickySimpleFormHeaderBarSx}>
                <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle2" fontWeight={700} noWrap sx={{ fontSize: '0.85rem' }}>
                        {translate('resources.genBankInformation.name', { smart_count: 1 })}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: '0.72rem' }}>
                        {translate('shell.accounting.bank_information_subtitle', {
                            _: 'Bank accounts and linked chart postings (GL type 9).',
                        })}
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    {variant === 'edit' ? (
                        <>
                            <PrevNextButtons
                                resource="genBankInformation"
                                sort={{ field: 'id', order: 'DESC' }}
                            />
                            <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />
                        </>
                    ) : null}
                    <FormHeaderToolbar
                        saveEventName={FORM_SAVE_GEN_BANK_INFORMATION}
                        resource="genBankInformation"
                        listPath="/genBankInformation"
                        showDelete={variant === 'edit'}
                    />
                </Box>
            </Box>

            <Card variant="outlined" sx={masterDetailPrimaryCardSx}>
                <CardContent sx={masterDetailPrimaryCardContentSx}>
                    <Grid container spacing={1.5}>
                        <Grid size={{ xs: 12 }}>
                            <TextInput
                                source="bankAccountTitle"
                                label={translate('resources.genBankInformation.fields.bank_account_title')}
                                fullWidth
                                sx={{ m: 0, ...securityGroupSimpleFormFieldSx }}
                            />
                        </Grid>

                        {variant === 'create' ? (
                            <>
                                <Grid size={{ xs: 12 }}>
                                    <SectionLabel>
                                        {translate('shell.accounting.bank_chart_section', {
                                            _: 'New chart account (Bank & Cash)',
                                        })}
                                    </SectionLabel>
                                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                                        {translate('resources.genBankInformation.new_gl_hint')}
                                    </Typography>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <TextInput
                                        source="newGlCode"
                                        label={translate('resources.genBankInformation.fields.new_gl_code', {
                                            _: 'Chart code',
                                        })}
                                        fullWidth
                                        sx={{ m: 0, ...securityGroupSimpleFormFieldSx }}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <TextInput
                                        source="newGlTitle"
                                        label={translate('resources.genBankInformation.fields.new_gl_title', {
                                            _: 'Chart name',
                                        })}
                                        fullWidth
                                        sx={{ m: 0, ...securityGroupSimpleFormFieldSx }}
                                    />
                                </Grid>
                            </>
                        ) : null}

                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextInput
                                source="bankAccountNumber"
                                label={translate('resources.genBankInformation.fields.bank_account_number')}
                                fullWidth
                                sx={{ m: 0, ...securityGroupSimpleFormFieldSx }}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextInput
                                source="bankName"
                                label={translate('resources.genBankInformation.fields.bank_name')}
                                fullWidth
                                sx={{ m: 0, ...securityGroupSimpleFormFieldSx }}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextInput
                                source="bankBranchCode"
                                label={translate('resources.genBankInformation.fields.bank_branch_code')}
                                fullWidth
                                sx={{ m: 0, ...securityGroupSimpleFormFieldSx }}
                            />
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                            <TextInput
                                source="bankAddress"
                                label={translate('resources.genBankInformation.fields.bank_address')}
                                fullWidth
                                multiline
                                minRows={2}
                                sx={{ m: 0, ...securityGroupSimpleFormFieldSx }}
                            />
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>
        </>
    );
}
