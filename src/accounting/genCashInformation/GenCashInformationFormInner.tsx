import * as React from 'react';
import { PrevNextButtons, TextInput, useTranslate } from 'react-admin';
import { Box, Card, CardContent, Divider, Grid, Tab, Tabs, Typography } from '@mui/material';

import { FormHeaderToolbar, FormSaveBridge, FORM_SAVE_GEN_CASH_INFORMATION } from '../../common/formToolbar';
import {
    masterDetailPrimaryCardContentSx,
    masterDetailPrimaryCardSx,
    masterDetailTabbedCardContentSx,
    masterDetailTabbedCardSx,
    masterDetailTabsSx,
    stickySimpleFormHeaderBarSx,
} from '../../common/masterDetailFormTheme';
import { securityGroupSimpleFormFieldSx } from '../../settings/SecurityGroupForm';
import { GenCashUsersTabPanel } from './GenCashUsersTabPanel';

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

export function GenCashInformationFormInner({ variant }: { variant: 'create' | 'edit' }) {
    const translate = useTranslate();
    const [tab, setTab] = React.useState(0);

    return (
        <>
            <FormSaveBridge eventName={FORM_SAVE_GEN_CASH_INFORMATION} />

            <Box sx={stickySimpleFormHeaderBarSx}>
                <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle2" fontWeight={700} noWrap sx={{ fontSize: '0.85rem' }}>
                        {translate('resources.genCashInformation.name', { smart_count: 1 })}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: '0.72rem' }}>
                        {translate('shell.accounting.cash_information_subtitle')}
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    {variant === 'edit' ? (
                        <>
                            <PrevNextButtons
                                resource="genCashInformation"
                                sort={{ field: 'id', order: 'DESC' }}
                            />
                            <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />
                        </>
                    ) : null}
                    <FormHeaderToolbar
                        saveEventName={FORM_SAVE_GEN_CASH_INFORMATION}
                        resource="genCashInformation"
                        listPath="/genCashInformation"
                        showDelete={variant === 'edit'}
                    />
                </Box>
            </Box>

            <Card variant="outlined" sx={masterDetailPrimaryCardSx}>
                <CardContent sx={masterDetailPrimaryCardContentSx}>
                    <Grid container spacing={1.5}>
                        <Grid size={{ xs: 12 }}>
                            <TextInput
                                source="accountTitle"
                                label={translate('resources.genCashInformation.fields.account_title')}
                                fullWidth
                                sx={{ m: 0, ...securityGroupSimpleFormFieldSx }}
                            />
                        </Grid>

                        {variant === 'create' ? (
                            <>
                                <Grid size={{ xs: 12 }}>
                                    <SectionLabel>{translate('shell.accounting.cash_chart_section')}</SectionLabel>
                                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                                        {translate('resources.genCashInformation.new_gl_hint')}
                                    </Typography>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <TextInput
                                        source="newGlCode"
                                        label={translate('resources.genCashInformation.fields.new_gl_code')}
                                        fullWidth
                                        sx={{ m: 0, ...securityGroupSimpleFormFieldSx }}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <TextInput
                                        source="newGlTitle"
                                        label={translate('resources.genCashInformation.fields.new_gl_title')}
                                        fullWidth
                                        sx={{ m: 0, ...securityGroupSimpleFormFieldSx }}
                                    />
                                </Grid>
                            </>
                        ) : null}
                    </Grid>
                </CardContent>
            </Card>

            <Card variant="outlined" sx={masterDetailTabbedCardSx}>
                <CardContent sx={masterDetailTabbedCardContentSx}>
                    <Tabs
                        value={tab}
                        onChange={(_, v) => setTab(v)}
                        variant="scrollable"
                        scrollButtons="auto"
                        sx={masterDetailTabsSx}
                    >
                        <Tab label="Users" />
                    </Tabs>
                    <Box sx={{ pt: 1.5 }}>
                        <Box sx={{ display: tab === 0 ? 'block' : 'none' }}>
                            <GenCashUsersTabPanel />
                        </Box>
                    </Box>
                </CardContent>
            </Card>
        </>
    );
}
