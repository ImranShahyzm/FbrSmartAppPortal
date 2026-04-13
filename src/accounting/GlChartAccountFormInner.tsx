import * as React from 'react';
import {
    AutocompleteArrayInput,
    BooleanInput,
    ReferenceArrayInput,
    required,
    useTranslate,
} from 'react-admin';
import { useWatch } from 'react-hook-form';
import {
    Box,
    Card,
    CardContent,
    Checkbox,
    Divider,
    FormControlLabel,
    Grid,
    Tab,
    Tabs,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

import {
    FormSaveBridge,
    FORM_SAVE_GL_CHART_ACCOUNT,
} from '../common/formToolbar';
import { OdooSplitFormLayout } from '../common/layout/OdooSplitFormLayout';
import { CompactTextInput, FieldRow, UNDERLINE_FIELD_SX } from '../common/odooCompactFormFields';
import { GlChartAccountChatter } from './GlChartAccountChatter';
import { GlChartAccountFormToolbar } from './GlChartAccountFormToolbar';
import { GlAccountTypeHierarchyInput } from './GlAccountTypeHierarchyInput';
import { GlChartAccountMappingTable } from './GlChartAccountMappingTable';

const REQUIRED_WRAP_SX = {
    bgcolor: 'rgba(248, 215, 218, 0.42)',
    borderRadius: 1,
    px: 1,
    py: 0.5,
    mb: '4px',
};

function LabelWithHint({ label, hint }: { label: string; hint: string }) {
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {label}
            <Tooltip title={hint} placement="right">
                <HelpOutlineIcon sx={{ fontSize: 15, color: 'primary.main', cursor: 'help' }} />
            </Tooltip>
        </Box>
    );
}

const AUTOCOMPLETE_ARRAY_SX = {
    ...UNDERLINE_FIELD_SX,
    width: '100%',
    maxWidth: '100%',
    '& .MuiFormControl-root': { width: '100%', maxWidth: '100%' },
    '& .MuiTextField-root': { width: '100%', maxWidth: '100%' },
    '& .MuiAutocomplete-inputRoot': { minHeight: 36, py: '2px', flexWrap: 'wrap' },
    '& .MuiAutocomplete-input': { py: '5px !important' },
};

type GlChartAccountFormInnerProps = {
    mode: 'create' | 'edit';
    recordReadOnly?: boolean;
};

export function GlChartAccountFormInner({ mode, recordReadOnly }: GlChartAccountFormInnerProps) {
    const translate = useTranslate();
    const [tab, setTab] = React.useState(0);

    const glTitle = useWatch({ name: 'glTitle' }) as string | undefined;
    const glCode = useWatch({ name: 'glCode' }) as string | undefined;
    const idVal = useWatch({ name: 'id' }) as number | undefined;
    const readOnly = mode === 'edit' && Boolean(recordReadOnly);

    const breadcrumb =
        mode === 'create'
            ? 'Chart of Accounts / New'
            : `Chart of Accounts / ${(glCode ?? '').trim() || '—'}`;

    const displayName = glTitle?.trim() || (mode === 'create' ? 'New account' : '—');

    return (
        <>
            <FormSaveBridge eventName={FORM_SAVE_GL_CHART_ACCOUNT} />

            <Box
                sx={{
                    position: { md: 'sticky' },
                    top: { md: 0 },
                    zIndex: 5,
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    px: 2,
                    py: '6px',
                    mb: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 2,
                    flexWrap: 'wrap',
                }}
            >
                <Box sx={{ minWidth: 0, flex: '1 1 auto' }}>
                    <Typography variant="subtitle2" fontWeight={700} noWrap sx={{ fontSize: '0.85rem' }}>
                        {translate('resources.glChartAccounts.name', { smart_count: 1 })}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem', display: 'block' }}>
                        {breadcrumb}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: '0.72rem' }}>
                        {displayName}
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                    <Box
                        sx={{
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 1,
                            px: 1.25,
                            py: 0.25,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                        }}
                    >
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                            Balance
                        </Typography>
                        <Typography variant="body2" fontWeight={700}>
                            0.00
                        </Typography>
                    </Box>
                    <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />
                    <GlChartAccountFormToolbar />
                </Box>
            </Box>

            <OdooSplitFormLayout
                sidebar={
                    <GlChartAccountChatter
                        isNew={mode === 'create'}
                        recordId={idVal ?? null}
                        recordTitle={glTitle ?? null}
                    />
                }
            >
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
                        <Grid container columnSpacing={2} rowSpacing={0} sx={{ width: '100%', mb: 1 }}>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <FieldRow label="Code">
                                    <CompactTextInput
                                        source="glCode"
                                        label={false}
                                        fullWidth
                                        validate={required()}
                                        disabled={readOnly}
                                        placeholder="e.g. 101000"
                                    />
                                </FieldRow>
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <Box sx={REQUIRED_WRAP_SX}>
                                    <FieldRow label="Account name">
                                        <CompactTextInput
                                            source="glTitle"
                                            label={false}
                                            fullWidth
                                            validate={required()}
                                            disabled={readOnly}
                                            placeholder="e.g. Current Assets"
                                        />
                                    </FieldRow>
                                </Box>
                            </Grid>
                        </Grid>

                        <Tabs
                            value={tab}
                            onChange={(_, v) => setTab(v)}
                            sx={{
                                minHeight: 40,
                                borderBottom: 1,
                                borderColor: 'divider',
                                mb: 2,
                                '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: '0.85rem' },
                            }}
                        >
                            <Tab label="Accounting" />
                            <Tab label="Mapping" />
                        </Tabs>

                        {tab === 0 ? (
                            <Grid container columnSpacing={2} rowSpacing={0} sx={{ width: '100%' }}>
                                <Grid size={{ xs: 12, md: 6 }}>
                                    <Box sx={REQUIRED_WRAP_SX}>
                                        <FieldRow
                                            label={
                                                <LabelWithHint
                                                    label="Type"
                                                    hint="Pick a leaf account type. Headers group the list (e.g. Balance Sheet → Assets)."
                                                />
                                            }
                                        >
                                            <GlAccountTypeHierarchyInput
                                                source="glType"
                                                validate={required()}
                                                disabled={readOnly}
                                            />
                                        </FieldRow>
                                    </Box>
                                    <FieldRow label="Tags">
                                        <TextField size="small" fullWidth disabled placeholder="Coming soon" variant="standard" />
                                    </FieldRow>
                                    <FieldRow label="Allowed journals">
                                        <TextField size="small" fullWidth disabled placeholder="Coming soon" variant="standard" />
                                    </FieldRow>
                                </Grid>
                                <Grid size={{ xs: 12, md: 6 }}>
                                    <FieldRow label="Deprecated">
                                        <FormControlLabel control={<Checkbox size="small" disabled />} label="" sx={{ m: 0 }} />
                                    </FieldRow>
                                    <FieldRow label="Group">
                                        <TextField size="small" fullWidth disabled placeholder="Coming soon" variant="standard" />
                                    </FieldRow>
                                    <FieldRow
                                        label={
                                            <LabelWithHint
                                                label="Companies"
                                                hint="Select companies to map on the Mapping tab (Company → Code)."
                                            />
                                        }
                                        alignItems="flex-start"
                                    >
                                        <ReferenceArrayInput source="companyIds" reference="companies" label={false}>
                                            <AutocompleteArrayInput
                                                optionText="title"
                                                optionValue="id"
                                                label={false}
                                                size="small"
                                                variant="standard"
                                                margin="none"
                                                disabled={readOnly}
                                                sx={AUTOCOMPLETE_ARRAY_SX}
                                                filterSelectedOptions
                                            />
                                        </ReferenceArrayInput>
                                    </FieldRow>
                                    <FieldRow label={translate('resources.glChartAccounts.fields.allow_reconciliation')}>
                                        <BooleanInput
                                            source="allowReconciliation"
                                            label={false}
                                            disabled={readOnly}
                                            sx={{ mt: 0.5 }}
                                        />
                                    </FieldRow>
                                </Grid>
                            </Grid>
                        ) : (
                            <GlChartAccountMappingTable />
                        )}
                    </CardContent>
                </Card>
            </OdooSplitFormLayout>
        </>
    );
}
