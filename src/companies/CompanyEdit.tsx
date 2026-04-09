import * as React from 'react';
import {
    Edit,
    SimpleForm,
    BooleanInput,
    ReferenceInput,
    required,
    useNotify,
    useRecordContext,
    useRefresh,
    useTranslate,
} from 'react-admin';
import { useWatch } from 'react-hook-form';
import { LogoBase64Input } from './LogoBase64Input';
import {
    Box,
    Button,
    Card,
    CardContent,
    Divider,
    Grid,
    Tooltip,
    Typography,
} from '@mui/material';
import { parseApiUtcInstant } from '../common/parseApiUtcInstant';
import { postCompanyFbrPdiSync } from '../api/fbrPdiApi';
import {
    FormHeaderToolbar,
    FormSaveBridge,
    FORM_SAVE_COMPANY,
} from '../common/formToolbar';
import {
    CompactAutocompleteInput,
    CompactNumberInput,
    CompactTextInput,
    FieldRow,
} from '../common/odooCompactFormFields';
import { OdooSplitFormLayout } from '../common/layout/OdooSplitFormLayout';
import { CompanyChatter } from './CompanyChatter';

const ADDRESS_SINGLE_LINE_SX = {
    '& .MuiInputBase-input': {
        textOverflow: 'ellipsis',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
    },
};

/** FBR PDI sync in the sticky header (must render inside form / record context). */
function CompanyFbrPdiSyncToolbarButton() {
    const record = useRecordContext<{
        id?: number;
        fbrPdiLastSuccessAtUtc?: string;
        fbrPdiLastError?: string;
    }>();
    const refresh = useRefresh();
    const notify = useNotify();
    const translate = useTranslate();
    const [busy, setBusy] = React.useState(false);

    const onSync = async () => {
        if (record?.id == null) return;
        setBusy(true);
        try {
            const r = await postCompanyFbrPdiSync(Number(record.id));
            if (r.success) {
                notify(
                    translate('resources.companies.notifications.fbr_pdi_synced', {
                        _: 'FBR PDI reference data synced.',
                    }),
                    { type: 'success' }
                );
            } else {
                notify(r.error ?? 'FBR PDI sync failed', { type: 'warning' });
            }
            refresh();
        } catch (e: unknown) {
            notify(e instanceof Error ? e.message : 'FBR PDI sync failed', { type: 'error' });
        } finally {
            setBusy(false);
        }
    };

    const lastSync =
        record?.fbrPdiLastSuccessAtUtc != null
            ? parseApiUtcInstant(record.fbrPdiLastSuccessAtUtc)?.toLocaleString() ?? '—'
            : '—';
    const tip = [
        translate('resources.companies.fbr_pdi_sync_tooltip', {
            _: 'Pull latest FBR PDI reference data (UOMs, trans types, HS codes, etc.) for this company.',
        }),
        '',
        `${translate('resources.companies.last_sync', { _: 'Last sync' })}: ${lastSync}`,
        record?.fbrPdiLastError ? `\n${record.fbrPdiLastError}` : '',
    ]
        .filter(Boolean)
        .join('\n');

    if (record?.id == null) return null;

    return (
        <Tooltip title={<span style={{ whiteSpace: 'pre-line' }}>{tip}</span>} placement="bottom">
            <span>
                <Button
                    variant="outlined"
                    size="small"
                    disabled={busy}
                    onClick={() => void onSync()}
                    sx={{ textTransform: 'none', fontSize: 12, py: '3px', px: 1.25, fontWeight: 600 }}
                >
                    {translate('resources.companies.fbr_pdi_sync_button', {
                        _: 'Sync FBR reference data',
                    })}
                </Button>
            </span>
        </Tooltip>
    );
}

function CompanyFormCard() {
    const title = useWatch({ name: 'title' }) as string | undefined;

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
                                Company
                            </Typography>
                            <Typography variant="h5" fontWeight={700} sx={{ lineHeight: 1.2, fontSize: '1.25rem' }}>
                                {title?.trim() || 'Company'}
                            </Typography>
                        </Box>

                        <FieldRow label="Company name">
                            <CompactTextInput
                                source="title"
                                label={false}
                                validate={required()}
                                fullWidth
                            />
                        </FieldRow>
                        <FieldRow label="Short title">
                            <CompactTextInput
                                source="shortTitle"
                                label={false}
                                validate={required()}
                                fullWidth
                            />
                        </FieldRow>

                        <Grid container columnSpacing={2} sx={{ width: '100%', mt: 0.5, mb: '4px' }}>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <FieldRow label="NTN No">
                                    <CompactTextInput source="ntnNo" label={false} fullWidth />
                                </FieldRow>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <FieldRow label="ST Registration">
                                    <CompactTextInput source="st_Registration" label={false} fullWidth />
                                </FieldRow>
                            </Grid>
                        </Grid>

                        <FieldRow label="Address">
                            <CompactTextInput
                                source="address"
                                label={false}
                                fullWidth
                                sx={ADDRESS_SINGLE_LINE_SX}
                            />
                        </FieldRow>

                        <Grid container columnSpacing={2} sx={{ width: '100%', mb: '4px' }}>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <FieldRow label="Phone">
                                    <CompactTextInput source="phone" label={false} fullWidth />
                                </FieldRow>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <FieldRow label="Email">
                                    <CompactTextInput source="email" label={false} fullWidth />
                                </FieldRow>
                            </Grid>
                        </Grid>

                        <Grid container columnSpacing={2} sx={{ width: '100%', mb: '4px' }}>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <FieldRow label="Website">
                                    <CompactTextInput source="website" label={false} fullWidth />
                                </FieldRow>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <FieldRow label="FBR Province">
                                    <ReferenceInput source="fbrProvinceId" reference="fbrProvinces" label={false}>
                                        <CompactAutocompleteInput
                                            optionText="provincename"
                                            optionValue="id"
                                            label={false}
                                            fullWidth
                                        />
                                    </ReferenceInput>
                                </FieldRow>
                            </Grid>
                        </Grid>

                        <FieldRow label="No. of employees">
                            <CompactNumberInput source="employeeCount" label={false} fullWidth />
                        </FieldRow>

                        <Typography
                            variant="overline"
                            color="text.secondary"
                            sx={{ fontSize: '0.7rem', display: 'block', mt: 1, mb: 0.5 }}
                        >
                            FBR configuration
                        </Typography>

                        <FieldRow label="Enable sandbox">
                            <BooleanInput
                                source="enableSandBox"
                                label={false}
                                sx={{
                                    m: 0,
                                    '& .MuiFormControlLabel-root': { ml: 0 },
                                    '& .MuiSwitch-root': { ml: 0 },
                                }}
                            />
                        </FieldRow>
                        <FieldRow label="FBR Sandbox token">
                            <CompactTextInput source="fbrTokenSandBox" label={false} fullWidth />
                        </FieldRow>
                        <FieldRow label="FBR Production token">
                            <CompactTextInput source="fbrTokenProduction" label={false} fullWidth />
                        </FieldRow>
                    </Grid>

                    <Grid size={{ xs: 12, lg: 3 }} sx={{ alignSelf: 'flex-start' }}>
                        <Box
                            sx={{
                                display: 'flex',
                                justifyContent: { xs: 'flex-start', lg: 'flex-end' },
                                width: '100%',
                                overflow: 'hidden',
                                '& *': { maxWidth: '100% !important' },
                                '& img': { maxWidth: '100% !important', height: 'auto' },
                            }}
                        >
                            <LogoBase64Input source="logoBase64" accept="image/*" label="Company logo" />
                        </Box>
                    </Grid>
                </Grid>
            </CardContent>
        </Card>
    );
}

function CompanyEditInner() {
    const notify = useNotify();
    return (
        <Edit
            title="Company"
            mutationMode="pessimistic"
            actions={false}
            sx={{
                width: '100%',
                maxWidth: '100%',
                '& .RaEdit-main': { maxWidth: '100%', width: '100%' },
                '& .RaEdit-card': {
                    maxWidth: '100% !important',
                    width: '100%',
                    boxShadow: 'none',
                },
            }}
            mutationOptions={{
                onSuccess: (result: Record<string, unknown>) => {
                    const payload = (result?.data ?? result) as Record<string, unknown> | undefined;
                    const w = payload?.fbrPdiSyncWarning;
                    if (w) notify(String(w), { type: 'warning' });
                },
            }}
        >
            <SimpleForm sx={{ maxWidth: 'none', width: '100%' }} toolbar={false}>
                <FormSaveBridge eventName={FORM_SAVE_COMPANY} />

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
                    <Box sx={{ minWidth: 0 }}>
                        <Typography variant="subtitle2" fontWeight={700} noWrap sx={{ fontSize: '0.85rem' }}>
                            Company
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: '0.72rem' }}>
                            All changes are saved on the server.
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <CompanyFbrPdiSyncToolbarButton />
                        <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />
                        <FormHeaderToolbar
                            saveEventName={FORM_SAVE_COMPANY}
                            resource="companies"
                            listPath="/companies"
                        />
                    </Box>
                </Box>

                <OdooSplitFormLayout
                    sidebar={<CompanyChatter />}
                    mainColumnSx={{
                        minHeight: { md: 0 },
                        height: { md: 'calc(100vh - 120px)' },
                        overflow: { md: 'auto' },
                        pr: { md: 1 },
                    }}
                >
                    <CompanyFormCard />
                </OdooSplitFormLayout>
            </SimpleForm>
        </Edit>
    );
}

export default function CompanyEdit() {
    return <CompanyEditInner />;
}
