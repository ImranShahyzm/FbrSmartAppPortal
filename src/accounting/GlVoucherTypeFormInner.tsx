import * as React from 'react';
import {
    PrevNextButtons,
    RadioButtonGroupInput,
    ReferenceInput,
    SelectInput,
    TextInput,
    useGetIdentity,
    useTranslate,
} from 'react-admin';
import { useWatch } from 'react-hook-form';
import { Box, Card, CardContent, Divider, Grid, Tab, Tabs, Typography } from '@mui/material';

import { CompactAutocompleteInput } from '../common/odooCompactFormFields';
import { FormSaveBridge, FORM_SAVE_GL_VOUCHER_TYPE, FormHeaderToolbar } from '../common/formToolbar';
import {
    masterDetailPrimaryCardContentSx,
    masterDetailPrimaryCardSx,
    masterDetailTabbedCardContentSx,
    masterDetailTabbedCardSx,
    masterDetailTabsSx,
    stickySimpleFormHeaderBarSx,
} from '../common/masterDetailFormTheme';
import {
    FieldRow,
    HelpIcon,
    securityGroupSimpleFormFieldSx,
} from '../settings/SecurityGroupForm';
import {
    GL_ACCOUNT_TYPE_IDS_CONTROL_DEFAULT,
    GL_ACCOUNT_TYPE_IDS_INCOME_DEFAULT,
    VOUCHER_SYSTEM_TYPE_CHOICES,
} from './voucherTypeConstants';

const TAB_LABELS = ['General', 'Advanced settings', 'Custom Signatures'] as const;

const YES_NO_RADIO_SX = {
    m: 0,
    '& .MuiFormGroup-root': {
        flexDirection: 'row',
        flexWrap: 'nowrap',
        columnGap: 2,
        alignItems: 'center',
    },
    '& .MuiFormControlLabel-root': { margin: 0, minHeight: 0 },
    '& .MuiRadio-root': { padding: 0.35 },
} as const;

function glChartAutocompleteText(record: {
    glCode?: string | null;
    glTitle?: string | null;
    typeLabel?: string | null;
}): string {
    const code = (record.glCode ?? '').trim();
    const title = (record.glTitle ?? '').trim();
    const t = (record.typeLabel ?? '').trim();
    const main = [code, title].filter(Boolean).join(' — ');
    return t ? `${main} (${t})` : main;
}

function CompactFieldRow({
    label,
    children,
    alignTop = false,
    labelMinWidth = 210,
}: {
    label: React.ReactNode;
    children: React.ReactNode;
    alignTop?: boolean;
    /** Wider labels avoid wrapping on long headings (e.g. default account fields). */
    labelMinWidth?: number;
}) {
    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: alignTop ? 'flex-start' : 'center',
                minHeight: 26,
                py: 0,
                mb: 0.35,
            }}
        >
            <Box
                sx={{
                    width: labelMinWidth,
                    minWidth: labelMinWidth,
                    flexShrink: 0,
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#1a1a1a',
                    pr: 1.5,
                    pt: alignTop ? '6px' : 0,
                    lineHeight: 1.35,
                }}
            >
                {label}
            </Box>
            <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center' }}>{children}</Box>
        </Box>
    );
}

function VoucherYesNoField({ source, label }: { source: string; label: React.ReactNode }) {
    const translate = useTranslate();
    return (
        <CompactFieldRow label={label}>
            <RadioButtonGroupInput
                source={source}
                label={false}
                row
                choices={[
                    { id: true, name: translate('resources.glVoucherTypes.yes', { _: 'Yes' }) },
                    { id: false, name: translate('resources.glVoucherTypes.no', { _: 'No' }) },
                ]}
                sx={YES_NO_RADIO_SX}
            />
        </CompactFieldRow>
    );
}

function AccountingSectionLabel({ children }: { children: React.ReactNode }) {
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

function GlVoucherSignatureFields() {
    const translate = useTranslate();
    const count = useWatch({ name: 'signatureSlotCount' }) as number | null | undefined;
    const n = count === 2 || count === 3 || count === 4 ? count : 0;
    return (
        <Box sx={{ pt: 0.5 }}>
            <AccountingSectionLabel>
                {translate('resources.glVoucherTypes.tab_custom_signatures', {
                    _: 'Custom Signatures',
                })}
            </AccountingSectionLabel>
            <FieldRow
                label={translate('resources.glVoucherTypes.signature_count', { _: 'No. of signatures' })}
            >
                <SelectInput
                    source="signatureSlotCount"
                    label={false}
                    choices={[
                        { id: '', name: '—' },
                        { id: 2, name: '2' },
                        { id: 3, name: '3' },
                        { id: 4, name: '4' },
                    ]}
                    format={v => (v === null || v === undefined ? '' : v)}
                    parse={v =>
                        v === '' || v === null || v === undefined ? null : Number(v)
                    }
                    sx={{ m: 0, minWidth: 120, ...securityGroupSimpleFormFieldSx }}
                />
            </FieldRow>
            {n >= 1 ? (
                <TextInput
                    source="signatureName1"
                    label={translate('resources.glVoucherTypes.signature_line_n', {
                        n: 1,
                        _: 'Signature line 1',
                    })}
                    fullWidth
                    sx={{ m: 0, mb: 1, ...securityGroupSimpleFormFieldSx }}
                />
            ) : null}
            {n >= 2 ? (
                <TextInput
                    source="signatureName2"
                    label={translate('resources.glVoucherTypes.signature_line_n', {
                        n: 2,
                        _: 'Signature line 2',
                    })}
                    fullWidth
                    sx={{ m: 0, mb: 1, ...securityGroupSimpleFormFieldSx }}
                />
            ) : null}
            {n >= 3 ? (
                <TextInput
                    source="signatureName3"
                    label={translate('resources.glVoucherTypes.signature_line_n', {
                        n: 3,
                        _: 'Signature line 3',
                    })}
                    fullWidth
                    sx={{ m: 0, mb: 1, ...securityGroupSimpleFormFieldSx }}
                />
            ) : null}
            {n >= 4 ? (
                <TextInput
                    source="signatureName4"
                    label={translate('resources.glVoucherTypes.signature_line_n', {
                        n: 4,
                        _: 'Signature line 4',
                    })}
                    fullWidth
                    sx={{ m: 0, mb: 1, ...securityGroupSimpleFormFieldSx }}
                />
            ) : null}
        </Box>
    );
}

export function GlVoucherTypeFormInner({ variant }: { variant: 'create' | 'edit' }) {
    const translate = useTranslate();
    const { identity } = useGetIdentity();
    const companyName =
        (identity as { companyName?: string } | undefined)?.companyName?.trim() || '—';
    const [tab, setTab] = React.useState(0);

    return (
        <>
            <FormSaveBridge eventName={FORM_SAVE_GL_VOUCHER_TYPE} />

            <Box sx={stickySimpleFormHeaderBarSx}>
                <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle2" fontWeight={700} noWrap sx={{ fontSize: '0.85rem' }}>
                        {translate('resources.glVoucherTypes.name', { smart_count: 1 })}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: '0.72rem' }}>
                        {translate('shell.accounting.voucher_type_save_hint', {
                            _: 'Voucher templates for postings (cash, bank, journal, etc.).',
                        })}
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    {variant === 'edit' ? (
                        <>
                            <PrevNextButtons
                                resource="glVoucherTypes"
                                sort={{ field: 'title', order: 'ASC' }}
                            />
                            <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />
                        </>
                    ) : null}
                    <FormHeaderToolbar
                        saveEventName={FORM_SAVE_GL_VOUCHER_TYPE}
                        resource="glVoucherTypes"
                        listPath="/glVoucherTypes"
                        showDelete={variant === 'edit'}
                    />
                </Box>
            </Box>

            <Card variant="outlined" sx={masterDetailPrimaryCardSx}>
                <CardContent sx={masterDetailPrimaryCardContentSx}>
                    <TextInput
                        source="title"
                        label={translate('resources.glVoucherTypes.fields.title')}
                        placeholder={translate('shell.accounting.voucher_title_placeholder', {
                            _: 'e.g. Customer invoices',
                        })}
                        fullWidth
                        sx={{
                            ...securityGroupSimpleFormFieldSx,
                            m: 0,
                            mb: 1.5,
                            '& .MuiInputBase-input': { fontSize: '1.05rem', py: 1 },
                        }}
                    />
                    <FieldRow
                        label={
                            <>
                                {translate('resources.glVoucherTypes.fields.system_type')}{' '}
                                <HelpIcon
                                    title={translate('resources.glVoucherTypes.help.system_type', {
                                        _: 'Determines the nature of this voucher when posting (cash, bank, sales, etc.).',
                                    })}
                                />
                            </>
                        }
                    >
                        <SelectInput
                            source="systemType"
                            label={false}
                            choices={VOUCHER_SYSTEM_TYPE_CHOICES.map(c => ({ id: c.id, name: c.name }))}
                            sx={{ m: 0, minWidth: 220, ...securityGroupSimpleFormFieldSx }}
                        />
                    </FieldRow>
                    <FieldRow
                        label={
                            <>
                                {translate('resources.glVoucherTypes.fields.prefix_on_documents', {
                                    _: 'Prefix on documents',
                                })}{' '}
                                <HelpIcon
                                    title={translate('resources.glVoucherTypes.help.prefix_on_documents', {
                                        _: 'Used as a prefix on vouchers when they are created or printed (e.g. invoice or voucher numbers).',
                                    })}
                                />
                            </>
                        }
                    >
                        <TextInput
                            source="documentPrefix"
                            label={false}
                            placeholder={translate('resources.glVoucherTypes.prefix_placeholder', {
                                _: 'e.g. INV, BNK, ABC',
                            })}
                            inputProps={{ maxLength: 32 }}
                            sx={{ m: 0, maxWidth: 280, ...securityGroupSimpleFormFieldSx }}
                        />
                    </FieldRow>
                    <FieldRow
                        label={
                            <>
                                {translate('shell.accounting.company', { _: 'Company' })}{' '}
                                <HelpIcon
                                    title={translate('resources.glVoucherTypes.help.company', {
                                        _: 'When you use more than one company, this voucher type applies only to the company shown here.',
                                    })}
                                />
                            </>
                        }
                    >
                        <Typography variant="body2" sx={{ fontSize: 13, color: '#1a1a1a' }}>
                            {companyName}
                        </Typography>
                    </FieldRow>
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
                        {TAB_LABELS.map(label => (
                            <Tab key={label} label={label} />
                        ))}
                    </Tabs>

                    <Box sx={{ display: tab === 0 ? 'block' : 'none', pt: 1.5 }}>
                        <AccountingSectionLabel>
                            {translate('shell.accounting.accounting_information', { _: 'Accounting information' })}
                        </AccountingSectionLabel>
                        <FieldRow label={<>Description</>} alignTop>
                            <TextInput
                                source="description"
                                label={false}
                                multiline
                                minRows={2}
                                fullWidth
                                sx={{ m: 0, ...securityGroupSimpleFormFieldSx }}
                            />
                        </FieldRow>
                        <FieldRow
                            label={
                                <>
                                    {translate('resources.glVoucherTypes.fields.currency')}{' '}
                                    <HelpIcon
                                        title={translate('resources.glVoucherTypes.help.currency', {
                                            _: 'Reserved for a later release: will control transactions based on this voucher type’s base currency.',
                                        })}
                                    />
                                </>
                            }
                        >
                            <ReferenceInput
                                source="currencyId"
                                reference="registerCurrencies"
                                perPage={200}
                            >
                                <SelectInput
                                    optionText={(r: {
                                        id?: number;
                                        currencySymbol?: string;
                                        currencyShortName?: string;
                                        currencyName?: string;
                                    }) =>
                                        r
                                            ? `${r.currencySymbol ?? ''} ${r.currencyShortName ?? r.currencyName ?? ''}`.trim()
                                            : ''
                                    }
                                    label={false}
                                    sx={{ m: 0, minWidth: 280, ...securityGroupSimpleFormFieldSx }}
                                />
                            </ReferenceInput>
                        </FieldRow>
                    </Box>

                    <Box sx={{ display: tab === 1 ? 'block' : 'none', pt: 1.5 }}>
                        <Grid container spacing={1.5} alignItems="flex-start">
                            <Grid size={{ xs: 12, md: 5 }}>
                                <AccountingSectionLabel>
                                    {translate('shell.accounting.control_section', { _: 'Control' })}
                                </AccountingSectionLabel>
                                <VoucherYesNoField
                                    source="status"
                                    label={translate('resources.glVoucherTypes.fields.status_active', {
                                        _: 'Status (active)',
                                    })}
                                />
                                <VoucherYesNoField
                                    source="showBankAndChequeDate"
                                    label={translate('resources.glVoucherTypes.fields.show_bank_and_cheque_date', {
                                        _: 'Show bank and cheque date',
                                    })}
                                />
                                <VoucherYesNoField
                                    source="showToPartyV"
                                    label={translate('resources.glVoucherTypes.fields.show_to_party', {
                                        _: 'Show to party',
                                    })}
                                />
                                <VoucherYesNoField
                                    source="interTransferPolicy"
                                    label={translate('resources.glVoucherTypes.fields.inter_transfer_policy', {
                                        _: 'Inter-transfer policy',
                                    })}
                                />
                                <VoucherYesNoField
                                    source="showToAccountBook"
                                    label={translate('resources.glVoucherTypes.fields.show_to_account_book', {
                                        _: 'Show to account book',
                                    })}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 7 }} sx={{ pl: { md: 0 } }}>
                                <AccountingSectionLabel>
                                    {translate('resources.glVoucherTypes.default_accounts_section', {
                                        _: 'Default accounts',
                                    })}
                                </AccountingSectionLabel>

                                <CompactFieldRow
                                    labelMinWidth={268}
                                    label={
                                        <>
                                            {translate('resources.glVoucherTypes.fields.default_control_account', {
                                                _: 'Default control account',
                                            })}{' '}
                                            <HelpIcon />
                                        </>
                                    }
                                >
                                    <ReferenceInput
                                        source="defaultControlGlAccountId"
                                        reference="glChartAccounts"
                                        perPage={50}
                                        filter={{ glTypeIds: GL_ACCOUNT_TYPE_IDS_CONTROL_DEFAULT }}
                                    >
                                        <CompactAutocompleteInput
                                            label={false}
                                            optionText={(r: {
                                                glCode?: string | null;
                                                glTitle?: string | null;
                                                typeLabel?: string | null;
                                            }) => glChartAutocompleteText(r)}
                                            filterToQuery={(q: string) => ({
                                                q,
                                                glTypeIds: GL_ACCOUNT_TYPE_IDS_CONTROL_DEFAULT,
                                            })}
                                            fullWidth
                                            parse={v => v ?? null}
                                        />
                                    </ReferenceInput>
                                </CompactFieldRow>

                                <CompactFieldRow
                                    labelMinWidth={268}
                                    label={translate('resources.glVoucherTypes.fields.control_txn_nature', {
                                        _: 'Control account transaction nature',
                                    })}
                                >
                                    <SelectInput
                                        source="controlAccountTxnNature"
                                        label={false}
                                        emptyText="—"
                                        choices={[
                                            {
                                                id: 0,
                                                name: translate('resources.glVoucherTypes.debit', { _: 'Debit' }),
                                            },
                                            {
                                                id: 1,
                                                name: translate('resources.glVoucherTypes.credit', { _: 'Credit' }),
                                            },
                                        ]}
                                        format={v => (v === null || v === undefined ? '' : v)}
                                        parse={v =>
                                            v === '' || v === null || v === undefined ? null : Number(v)
                                        }
                                        sx={{ m: 0, minWidth: 200, ...securityGroupSimpleFormFieldSx }}
                                    />
                                </CompactFieldRow>

                                <CompactFieldRow
                                    labelMinWidth={268}
                                    label={
                                        <>
                                            {translate('resources.glVoucherTypes.fields.default_income_account', {
                                                _: 'Default income account',
                                            })}{' '}
                                            <HelpIcon />
                                        </>
                                    }
                                >
                                    <ReferenceInput
                                        source="defaultIncomeGlAccountId"
                                        reference="glChartAccounts"
                                        perPage={50}
                                        filter={{ glTypeIds: GL_ACCOUNT_TYPE_IDS_INCOME_DEFAULT }}
                                    >
                                        <CompactAutocompleteInput
                                            label={false}
                                            optionText={(r: {
                                                glCode?: string | null;
                                                glTitle?: string | null;
                                                typeLabel?: string | null;
                                            }) => glChartAutocompleteText(r)}
                                            filterToQuery={(q: string) => ({
                                                q,
                                                glTypeIds: GL_ACCOUNT_TYPE_IDS_INCOME_DEFAULT,
                                            })}
                                            fullWidth
                                            parse={v => v ?? null}
                                        />
                                    </ReferenceInput>
                                </CompactFieldRow>
                            </Grid>
                        </Grid>
                    </Box>

                    <Box sx={{ display: tab === 2 ? 'block' : 'none', pt: 1.5 }}>
                        <GlVoucherSignatureFields />
                    </Box>
                </CardContent>
            </Card>
        </>
    );
}
