import * as React from 'react';
import {
    BooleanInput,
    PrevNextButtons,
    TextInput,
    useTranslate,
} from 'react-admin';
import {
    Box,
    Card,
    CardContent,
    Grid,
    Tab,
    Tabs,
    Typography,
} from '@mui/material';

import {
    FormSaveBridge,
    FormDocumentWorkflowBar,
    FORM_SAVE_GEN_BANK_INFORMATION,
} from '../../common/formToolbar';
import {
    masterDetailTabbedCardContentSx,
    masterDetailTabbedCardSx,
    masterDetailTabsSx,
} from '../../common/masterDetailFormTheme';
import {
    CompactTextInput,
    FieldRow,
} from '../../common/odooCompactFormFields';
import { GenChequeBooksTabPanel } from './GenChequeBooksTabPanel';

const NAV_TEAL = '#3d7a7a';

const BANK_TAB_LABELS = ['Cheque book details'] as const;

const MULTILINE_COMPACT_SX = {
    '& .MuiInputBase-root': { minHeight: 'auto', alignItems: 'flex-start' },
    '& .MuiInputBase-input': { py: '6px' },
};

function BankTabPanels({ tab, variant }: { tab: number; variant: 'create' | 'edit' }) {
    return (
        <Box sx={{ pt: 1.5 }}>
            <Box sx={{ display: tab === 0 ? 'block' : 'none' }}>
                <GenChequeBooksTabPanel variant={variant} />
            </Box>
        </Box>
    );
}

export function GenBankInformationFormInner({ variant }: { variant: 'create' | 'edit' }) {
    const translate = useTranslate();
    const [tab, setTab] = React.useState(0);

    return (
        <>
            <FormSaveBridge eventName={FORM_SAVE_GEN_BANK_INFORMATION} />

            <FormDocumentWorkflowBar
                saveEventName={FORM_SAVE_GEN_BANK_INFORMATION}
                resource="genBankInformation"
                listPath="/genBankInformation"
                title={translate('resources.genBankInformation.name', { smart_count: 1 })}
                subtitle={translate('shell.accounting.bank_information_subtitle', {
                    _: 'Bank accounts and linked chart postings (GL type 9).',
                })}
                showDelete={variant === 'edit'}
                sx={{ borderColor: NAV_TEAL }}
                navigationActions={
                    variant === 'edit' ? (
                        <PrevNextButtons resource="genBankInformation" sort={{ field: 'id', order: 'DESC' }} />
                    ) : null
                }
            />

            {/* ── Primary detail card ── */}
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

                    {/* Section header */}
                    <Box sx={{ mb: 1 }}>
                        <Typography variant="h5" fontWeight={700} sx={{ lineHeight: 1.2, fontSize: '1.25rem' }}>
                            {variant === 'create'
                                ? translate('shell.accounting.bank_account_new', { _: 'New bank account' })
                                : translate('shell.accounting.bank_account_edit', { _: 'Edit bank account' })}
                        </Typography>
                    </Box>

                    <FieldRow label="Account title">
                        <CompactTextInput
                            source="bankAccountTitle"
                            label={false}
                            fullWidth
                        />
                    </FieldRow>

                    <Grid container columnSpacing={2} rowSpacing={0} sx={{ width: '100%', mb: '4px' }}>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <FieldRow label="Account number">
                                <CompactTextInput source="bankAccountNumber" label={false} fullWidth />
                            </FieldRow>
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <FieldRow label="Bank name">
                                <CompactTextInput source="bankName" label={false} fullWidth />
                            </FieldRow>
                        </Grid>
                    </Grid>

                    <Grid container columnSpacing={2} rowSpacing={0} sx={{ width: '100%', mb: '4px' }}>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <FieldRow label="Branch code">
                                <CompactTextInput source="bankBranchCode" label={false} fullWidth />
                            </FieldRow>
                        </Grid>
                        <Grid size={{ xs: 12, md: 8 }}>
                            <FieldRow label="Validate cheque book" alignItems="center">
                                <BooleanInput
                                    source="validateChequeBook"
                                    label={false}
                                    helperText={false}
                                    sx={{
                                        m: 0,
                                        '& .MuiFormControlLabel-root': { m: 0 },
                                        '& .MuiSwitch-root': { my: 0 },
                                    }}
                                />
                            </FieldRow>
                        </Grid>
                    </Grid>

                    <FieldRow label="Bank address" alignItems="flex-start">
                        <CompactTextInput
                            source="bankAddress"
                            label={false}
                            fullWidth
                            multiline
                            minRows={2}
                            sx={MULTILINE_COMPACT_SX}
                        />
                    </FieldRow>

                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                        {translate('resources.genBankInformation.validate_cheque_book_help', {
                            _: 'When enabled, bank payments must use a cheque number from the active book.',
                        })}
                    </Typography>

                    {/* Create-only: new GL account section */}
                    {variant === 'create' && (
                        <Box sx={{ mt: 2 }}>
                            <Typography
                                variant="overline"
                                color="text.secondary"
                                sx={{ fontSize: '0.7rem', display: 'block', mb: 0.5 }}
                            >
                                New chart account (Bank &amp; Cash)
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                                {translate('resources.genBankInformation.new_gl_hint')}
                            </Typography>
                            <Grid container columnSpacing={2} rowSpacing={0} sx={{ width: '100%' }}>
                                <Grid size={{ xs: 12, md: 6 }}>
                                    <FieldRow label="Chart code">
                                        <CompactTextInput source="newGlCode" label={false} fullWidth />
                                    </FieldRow>
                                </Grid>
                                <Grid size={{ xs: 12, md: 6 }}>
                                    <FieldRow label="Chart name">
                                        <CompactTextInput source="newGlTitle" label={false} fullWidth />
                                    </FieldRow>
                                </Grid>
                            </Grid>
                        </Box>
                    )}
                </CardContent>
            </Card>

            {/* ── Tabbed cheque books card ── */}
            <Card variant="outlined" sx={masterDetailTabbedCardSx}>
                <CardContent sx={masterDetailTabbedCardContentSx}>
                    <Tabs
                        value={tab}
                        onChange={(_, v) => setTab(v)}
                        variant="scrollable"
                        scrollButtons="auto"
                        sx={masterDetailTabsSx}
                    >
                        {BANK_TAB_LABELS.map(label => (
                            <Tab key={label} label={label} />
                        ))}
                    </Tabs>
                    <BankTabPanels tab={tab} variant={variant} />
                </CardContent>
            </Card>
        </>
    );
}