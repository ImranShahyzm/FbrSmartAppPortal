import * as React from 'react';
import {
    DateInput,
    Form,
    NumberInput,
    PrevNextButtons,
    SelectInput,
    TextInput,
    ReferenceInput,
    AutocompleteInput,
    useTranslate,
    useRecordContext,
    useRefresh,
    useNotify,
    useDataProvider,
    useRedirect,
    required,
} from 'react-admin';
import { useFormContext, useWatch } from 'react-hook-form';
import { Alert, Box, Button, Card, CardContent, CircularProgress, Divider, Grid, Typography } from '@mui/material';

import { postFbrInvoiceToFbr, postFbrInvoiceValidate } from '../api/fbrInvoiceFbrApi';
import { parseApiUtcInstant } from '../common/parseApiUtcInstant';
import { FormSaveBridge, FORM_SAVE_FBR_INVOICE } from '../common/formToolbar';
import { FormHeaderToolbar } from '../common/formToolbar';
import { CustomerInvoicePreview } from './CustomerInvoicePreview';
import { InvoiceTotalsForm } from './InvoiceTotalsForm';
import { OrderChatter } from './OrderChatter';
import { OrderInvoiceLines, emptyInvoiceLine } from './OrderInvoiceLines';
import { pdf } from '@react-pdf/renderer';
import { toDataURL as qrToDataUrl } from 'qrcode';
import { FbrInvoicePdf } from './FbrInvoicePdf';
import Swal from 'sweetalert2';

const PAYMENT_TERM_CHOICES = [
    { id: 'immediate', name: 'Immediate' },
    { id: 'net_15', name: 'Net 15' },
    { id: 'net_30', name: 'Net 30' },
    { id: 'net_60', name: 'Net 60' },
];

/** Match FbrSalesTaxRateAdmin: bold compact labels + underline fields */
const INVOICE_FIELD_LABEL_SX = {
    fontWeight: 700,
    fontSize: '0.8rem',
    color: '#212529',
    minWidth: 140,
    lineHeight: '30px',
} as const;

const INVOICE_FIELD_VALUE_SX = {
    fontSize: '0.8rem',
    color: '#212529',
    lineHeight: '30px',
} as const;

const INVOICE_UNDERLINE_FIELD_SX = {
    mb: 0,
    '& .MuiFormHelperText-root': { display: 'none' },
    '& .MuiInputBase-root': { fontSize: '0.8rem', minHeight: 30 },
    '& .MuiInputBase-input': { py: '5px' },
    '& .MuiInputLabel-root': { display: 'none' },
} as const;

function InvoiceFieldRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                minHeight: 34,
                mb: '4px',
            }}
        >
            <Typography sx={{ ...INVOICE_FIELD_LABEL_SX }}>{label}</Typography>
            <Box sx={{ flex: 1, minWidth: 0, ...INVOICE_FIELD_VALUE_SX }}>{children}</Box>
        </Box>
    );
}

/** Odoo-style diagonal corner ribbon (replaces inline Status field). */
function InvoiceStatusRibbon({ visible }: { visible: boolean }) {
    const record = useRecordContext<any>();
    const status = useWatch({ name: 'status' }) as string | undefined;
    if (!visible) return null;

    const st = String(status ?? record?.status ?? '').toLowerCase();
    const text =
        st === 'ordered'
            ? 'Draft'
            : st === 'delivered'
              ? 'Validated'
              : st === 'posted'
                ? 'Posted'
                : st === 'cancelled'
                  ? 'Cancelled'
                  : (st || '—').toUpperCase();

    const bg =
        st === 'ordered'
            ? '#6c757d'
            : st === 'delivered'
              ? '#2e7d32'
              : st === 'posted'
                ? '#1b5e20'
                : st === 'cancelled'
                  ? '#c62828'
                  : '#546e7a';

    return (
        <Box
            aria-hidden
            sx={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: { xs: 100, sm: 120 },
                height: { xs: 100, sm: 120 },
                overflow: 'hidden',
                pointerEvents: 'none',
                zIndex: 2,
            }}
        >
            <Box
                sx={{
                    position: 'absolute',
                    top: { xs: 18, sm: 22 },
                    right: { xs: -36, sm: -42 },
                    width: { xs: 200, sm: 220 },
                    py: '5px',
                    bgcolor: bg,
                    color: '#fff',
                    fontSize: { xs: '0.62rem', sm: '0.68rem' },
                    fontWeight: 800,
                    textAlign: 'center',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
                    transform: 'rotate(45deg)',
                    transformOrigin: 'center',
                    lineHeight: 1.2,
                }}
            >
                {text}
            </Box>
        </Box>
    );
}

export type FbrInvoiceFormMode = 'create' | 'edit';

export function FbrInvoiceForm({ mode }: { mode: FbrInvoiceFormMode }) {
    const translate = useTranslate();
    const isCreate = mode === 'create';
    const record = useRecordContext<any>();
    const formKey = isCreate ? 'fbr-invoice-create' : `fbr-invoice-${record?.id ?? 'edit'}`;
    const isLocked = Boolean(record?.isLocked);
    const [isEditing, setIsEditing] = React.useState<boolean>(() => isCreate);

    const createDefaults = React.useMemo(
        () => ({
            invoiceDate: new Date(),
            paymentTerms: 'immediate',
            status: 'ordered',
            reference: '',
            deliveryFees: 0,
            fbrScenarioId: null,
            lines: [emptyInvoiceLine()],
        }),
        []
    );

    return (
        <Form key={formKey} defaultValues={isCreate ? createDefaults : undefined}>
            <FormSaveBridge eventName={FORM_SAVE_FBR_INVOICE} />
            <Box
                sx={{
                    height: { xs: 'auto', md: 'calc(100vh - 64px)' },
                    overflow: { xs: 'visible', md: 'hidden' },
                    display: 'flex',
                    flexDirection: { xs: 'column', md: 'row' },
                    gap: 2,
                    width: '100%',
                    maxWidth: '100%',
                    alignItems: { xs: 'flex-start', md: 'stretch' },
                }}
            >
                <Box
                    sx={{
                        flex: '1 1 68%',
                        minWidth: 0,
                        minHeight: 0,
                        height: { md: '100%' },
                        width: '100%',
                        overflow: { md: 'auto' },
                        pr: { md: 1 },
                    }}
                >
                    <InvoiceSubHeader
                        isCreate={isCreate}
                        isLocked={isLocked}
                        isEditing={isEditing}
                        onStartEdit={() => setIsEditing(true)}
                        onStopEdit={() => setIsEditing(false)}
                    />
                    {!isCreate ? (
                        <Box
                            sx={{
                                mt: 0.75,
                                mb: 1,
                                px: 1.5,
                                py: 0.75,
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 1,
                                bgcolor: 'background.paper',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 1,
                                flexWrap: 'wrap',
                            }}
                        >
                            <InvoiceWorkflowBar isLocked={isLocked} />
                        </Box>
                    ) : null}
                    <Box
                        component="fieldset"
                        disabled={!isCreate && (isLocked || !isEditing)}
                        sx={{ border: 'none', m: 0, p: 0, minWidth: 0, display: 'block' }}
                    >
                        <Card
                            variant="outlined"
                            sx={{
                                mt: isCreate ? 0 : 1,
                                borderColor: '#dee2e6',
                                borderRadius: '4px',
                                boxShadow: 'none',
                                position: 'relative',
                                overflow: 'hidden',
                            }}
                        >
                            <InvoiceStatusRibbon visible={!isCreate} />
                            <CardContent
                                sx={{
                                    p: '16px 20px !important',
                                    position: 'relative',
                                    pr: { xs: '14px !important', sm: '20px !important' },
                                }}
                            >
                                <Box sx={{ pr: { xs: 5, sm: 7 } }}>
                                    <InvoiceDocHeading isCreate={isCreate} />
                                </Box>

                                <Grid container columnSpacing={4} rowSpacing={0}>
                                    <Grid size={{ xs: 12, md: 6 }}>
                                        <InvoiceFieldRow
                                            label={translate('resources.orders.fields.customer_id', { _: 'Customer' })}
                                        >
                                            <ReferenceInput source="customerPartyId" reference="customers" label={false}>
                                                <AutocompleteInput
                                                    filterToQuery={(q: string) => ({ q })}
                                                    optionText={(r: Record<string, string | number | undefined>) =>
                                                        r?.id != null ? String(r.partyName ?? r.id) : ''
                                                    }
                                                    fullWidth
                                                    size="small"
                                                    variant="standard"
                                                    margin="none"
                                                    label={false}
                                                    validate={required()}
                                                    sx={{
                                                        ...INVOICE_UNDERLINE_FIELD_SX,
                                                        '& .MuiAutocomplete-inputRoot': {
                                                            flexWrap: 'nowrap',
                                                            minHeight: 30,
                                                            pt: '4px !important',
                                                            pb: '4px !important',
                                                        },
                                                    }}
                                                />
                                            </ReferenceInput>
                                        </InvoiceFieldRow>
                                        <CustomerInvoicePreview />
                                    </Grid>
                                    <Grid size={{ xs: 12, md: 6 }}>
                                        <Grid container columnSpacing={4} rowSpacing={0}>
                                            <Grid size={{ xs: 12, sm: 6 }}>
                                                <InvoiceFieldRow
                                                    label={translate('resources.orders.invoice.invoice_date', {
                                                        _: 'Invoice date',
                                                    })}
                                                >
                                                    <DateInput
                                                        source="invoiceDate"
                                                        label={false}
                                                        variant="standard"
                                                        margin="none"
                                                        size="small"
                                                        fullWidth
                                                        validate={required()}
                                                        sx={INVOICE_UNDERLINE_FIELD_SX}
                                                    />
                                                </InvoiceFieldRow>
                                            </Grid>
                                            <Grid size={{ xs: 12, sm: 6 }}>
                                                {!isCreate ? (
                                                    <InvoiceFieldRow
                                                        label={translate('resources.orders.invoice.reference', {
                                                            _: 'Reference',
                                                        })}
                                                    >
                                                        <TextInput
                                                            source="reference"
                                                            label={false}
                                                            variant="standard"
                                                            margin="none"
                                                            size="small"
                                                            fullWidth
                                                            sx={INVOICE_UNDERLINE_FIELD_SX}
                                                        />
                                                    </InvoiceFieldRow>
                                                ) : (
                                                    <InvoiceFieldRow
                                                        label={translate('resources.orders.invoice.payment_terms', {
                                                            _: 'Payment terms',
                                                        })}
                                                    >
                                                        <SelectInput
                                                            source="paymentTerms"
                                                            label={false}
                                                            variant="standard"
                                                            margin="none"
                                                            size="small"
                                                            choices={PAYMENT_TERM_CHOICES}
                                                            fullWidth
                                                            sx={{
                                                                ...INVOICE_UNDERLINE_FIELD_SX,
                                                                '& .MuiSelect-select': { py: '5px' },
                                                                '& .MuiSelect-icon': {
                                                                    top: 'calc(50% - 12px)',
                                                                },
                                                            }}
                                                        />
                                                    </InvoiceFieldRow>
                                                )}
                                            </Grid>
                                            {!isCreate ? (
                                                <Grid size={{ xs: 12, sm: 6 }}>
                                                    <InvoiceFieldRow
                                                        label={translate('resources.orders.invoice.payment_terms', {
                                                            _: 'Payment terms',
                                                        })}
                                                    >
                                                        <SelectInput
                                                            source="paymentTerms"
                                                            label={false}
                                                            variant="standard"
                                                            margin="none"
                                                            size="small"
                                                            choices={PAYMENT_TERM_CHOICES}
                                                            fullWidth
                                                            sx={{
                                                                ...INVOICE_UNDERLINE_FIELD_SX,
                                                                '& .MuiSelect-select': { py: '5px' },
                                                                '& .MuiSelect-icon': {
                                                                    top: 'calc(50% - 12px)',
                                                                },
                                                            }}
                                                        />
                                                    </InvoiceFieldRow>
                                                </Grid>
                                            ) : null}
                                            {isCreate ? (
                                                <Grid size={{ xs: 12, sm: 6 }}>
                                                    <InvoiceFieldRow
                                                        label={translate('resources.orders.invoice.reference', {
                                                            _: 'Reference',
                                                        })}
                                                    >
                                                        <TextInput
                                                            source="reference"
                                                            label={false}
                                                            variant="standard"
                                                            margin="none"
                                                            size="small"
                                                            fullWidth
                                                            sx={INVOICE_UNDERLINE_FIELD_SX}
                                                        />
                                                    </InvoiceFieldRow>
                                                </Grid>
                                            ) : null}
                                            <Grid size={{ xs: 12 }} sx={{ minWidth: 0 }}>
                                                <InvoiceFieldRow
                                                    label={translate('resources.fbrInvoices.fields.fbr_scenario', {
                                                        _: 'FBR scenario',
                                                    })}
                                                >
                                                    <ReferenceInput
                                                        source="fbrScenarioId"
                                                        reference="fbrScenarios"
                                                        label={false}
                                                    >
                                                        <AutocompleteInput
                                                            optionText={(r: {
                                                                scenarioCode?: string;
                                                                description?: string;
                                                            }) =>
                                                                r?.scenarioCode
                                                                    ? `${r.scenarioCode}${r.description ? ` — ${r.description}` : ''}`
                                                                    : ''
                                                            }
                                                            filterToQuery={(q: string) => ({ q })}
                                                            fullWidth
                                                            size="small"
                                                            variant="standard"
                                                            margin="none"
                                                            label={false}
                                                            sx={{
                                                                ...INVOICE_UNDERLINE_FIELD_SX,
                                                                width: '100%',
                                                                maxWidth: '100%',
                                                                '& .MuiAutocomplete-inputRoot': {
                                                                    flexWrap: 'wrap',
                                                                    minHeight: 30,
                                                                    pt: '4px !important',
                                                                    pb: '4px !important',
                                                                    minWidth: 0,
                                                                },
                                                                '& .MuiAutocomplete-input': {
                                                                    minWidth: '120px !important',
                                                                    textOverflow: 'ellipsis',
                                                                },
                                                            }}
                                                        />
                                                    </ReferenceInput>
                                                </InvoiceFieldRow>
                                            </Grid>
                                        </Grid>
                                    </Grid>
                                </Grid>

                                <Box sx={{ mt: 2 }}>
                                    <OrderInvoiceLines />
                                </Box>

                                <Typography
                                    sx={{
                                        ...INVOICE_FIELD_LABEL_SX,
                                        minWidth: 0,
                                        display: 'block',
                                        mt: 2,
                                        mb: '6px',
                                    }}
                                >
                                    {translate('resources.orders.section.total', { _: 'Totals' })}
                                </Typography>
                                <InvoiceTotalsForm />
                            </CardContent>
                        </Card>
                    </Box>
                </Box>

                {!isCreate ? (
                    <Box
                        sx={{
                            flex: { md: '0 0 30%' },
                            width: { xs: '100%', md: 'auto' },
                            maxWidth: { md: 420 },
                            minWidth: { md: 320 },
                            overflow: { md: 'auto' },
                            minHeight: 0,
                            height: { md: '100%' },
                            pr: { md: 0.5 },
                        }}
                    >
                        <OrderChatter />
                        <Box sx={{ mt: 2 }}>
                            <InvoiceActivityLog />
                        </Box>
                    </Box>
                ) : (
                    <Box
                        sx={{
                            flex: { md: '0 0 30%' },
                            maxWidth: { md: 360 },
                            p: 2,
                            border: '1px dashed',
                            borderColor: 'divider',
                            borderRadius: 1,
                            alignSelf: 'flex-start',
                        }}
                    >
                        <Typography variant="body2" color="text.secondary">
                            {translate('resources.fbrInvoices.chatter_after_save', {
                                _: 'Save the invoice once to enable attachments.',
                            })}
                        </Typography>
                    </Box>
                )}
            </Box>
        </Form>
    );
}

// ─────────────────────────────────────────────
// Odoo-style status breadcrumb chevrons
// ─────────────────────────────────────────────
const CHEVRON_H = 32;
const CHEVRON_OVERLAP = 10; // px each chevron overlaps the next

function StatusBreadcrumb({ stages, activeKey }: { stages: Array<{ key: string; label: string }>; activeKey: string }) {
    const activeIdx = stages.findIndex(s => s.key === activeKey);

    return (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {stages.map((s, i) => {
                const isPast = i < activeIdx;
                const isActive = i === activeIdx;
                const isFirst = i === 0;
                const isLast = i === stages.length - 1;

                // Colours matching Odoo's purple/grey palette
                const bg = isActive ? '#875A7B' : isPast ? '#c8b4c3' : '#e9e9e9';
                const color = isActive || isPast ? '#fff' : '#666';

                // Each chevron is a clipped div — left notch in, right arrow out
                // except first (no left notch) and last (no right arrow)
                const clipPath = (() => {
                    const h = CHEVRON_H;
                    const arrowW = 10; // width of the arrow tip
                    if (isFirst && isLast) return 'none';
                    if (isFirst) return `polygon(0 0, calc(100% - ${arrowW}px) 0, 100% 50%, calc(100% - ${arrowW}px) 100%, 0 100%)`;
                    if (isLast) return `polygon(${arrowW}px 0, 100% 0, 100% 100%, ${arrowW}px 100%, 0 50%)`;
                    return `polygon(${arrowW}px 0, calc(100% - ${arrowW}px) 0, 100% 50%, calc(100% - ${arrowW}px) 100%, ${arrowW}px 100%, 0 50%)`;
                })();

                return (
                    <Box
                        key={s.key}
                        sx={{
                            position: 'relative',
                            ml: i === 0 ? 0 : `-${CHEVRON_OVERLAP}px`,
                            zIndex: stages.length - i,
                            height: CHEVRON_H,
                            display: 'flex',
                            alignItems: 'center',
                            px: isFirst ? '14px' : '20px',
                            pr: isLast ? '14px' : '20px',
                            bgcolor: bg,
                            color,
                            clipPath,
                            fontSize: 12,
                            fontWeight: isActive ? 700 : 500,
                            letterSpacing: '0.01em',
                            userSelect: 'none',
                            transition: 'background 0.15s',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {s.label}
                    </Box>
                );
            })}
        </Box>
    );
}

// ─────────────────────────────────────────────
// Odoo-style action button (solid purple fill)
// ─────────────────────────────────────────────
function OdooActionButton({
    label,
    onClick,
    loading,
    variant = 'primary',
    disabled,
}: {
    label: string;
    onClick: () => void;
    loading?: boolean;
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    disabled?: boolean;
}) {
    const styles: Record<string, React.CSSProperties> = {
        primary: { background: '#875A7B', color: '#fff', border: '1px solid #6d476a' },
        secondary: { background: '#fff', color: '#875A7B', border: '1px solid #875A7B' },
        danger: { background: '#fff', color: '#d9534f', border: '1px solid #d9534f' },
        ghost: { background: '#f8f8f8', color: '#555', border: '1px solid #ccc' },
    };
    const s = styles[variant];

    return (
        <Box
            component="button"
            type="button"
            onClick={onClick}
            disabled={disabled || loading}
            sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                height: 30,
                px: '12px',
                borderRadius: '4px',
                fontSize: 13,
                fontWeight: 600,
                cursor: disabled || loading ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.55 : 1,
                transition: 'filter 0.1s',
                '&:hover:not(:disabled)': { filter: 'brightness(0.92)' },
                '&:active:not(:disabled)': { filter: 'brightness(0.85)' },
                ...s,
            }}
        >
            {loading ? <CircularProgress size={13} sx={{ color: 'inherit' }} /> : null}
            {label}
        </Box>
    );
}

// ─────────────────────────────────────────────
// Workflow bar — action buttons LEFT, status breadcrumb RIGHT
// ─────────────────────────────────────────────
function InvoiceWorkflowBar({ isLocked }: { isLocked: boolean }) {
    const record = useRecordContext<any>();
    const refresh = useRefresh();
    const notify = useNotify();
    const { setValue } = useFormContext();
    const status = useWatch({ name: 'status' }) as string | undefined;
    const [loading, setLoading] = React.useState<'validate' | 'post' | 'status' | null>(null);

    const id = record?.id != null ? String(record.id) : '';
    const st = String(status ?? record?.status ?? '').toLowerCase();

    const canValidate = !isLocked && st === 'ordered' && id.length > 0;
    const canPost = !isLocked && st === 'delivered' && id.length > 0;
    const canCancel = !isLocked && st !== 'posted' && st !== 'cancelled' && id.length > 0;
    const canResetDraft = !isLocked && st === 'cancelled' && id.length > 0;

    // Status breadcrumb stages — mirrors Odoo's invoice flow
    const breadcrumbStages = [
        { key: 'ordered', label: 'Draft' },
        { key: 'delivered', label: 'Validated' },
        { key: 'posted', label: 'Posted' },
    ];
    // If cancelled, show a single cancelled breadcrumb instead
    const isCancelled = st === 'cancelled';
    const activeBreadcrumbKey = isCancelled ? 'cancelled' : st;
    const displayStages = isCancelled
        ? [{ key: 'cancelled', label: 'Cancelled' }]
        : breadcrumbStages;

    const onValidate = async () => {
        setLoading('validate');
        try {
            await postFbrInvoiceValidate(id);
            notify('Invoice validated', { type: 'success' });
            refresh();
        } catch {
            refresh();
        } finally {
            setLoading(null);
        }
    };

    const onPost = async () => {
        const r = await Swal.fire({
            title: 'Confirm invoice?',
            text: 'It will be posted to FBR and locked.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Confirm',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#1976d2',
            cancelButtonColor: '#6b7280',
            reverseButtons: true,
            focusCancel: true,
        });
        if (!r.isConfirmed) return;
        setLoading('post');
        try {
            await postFbrInvoiceToFbr(id);
            notify('Invoice posted to FBR', { type: 'success' });
            refresh();
        } catch {
            refresh();
        } finally {
            setLoading(null);
        }
    };

    const setStatusAndSave = async (next: 'ordered' | 'cancelled') => {
        setLoading('status');
        try {
            setValue('status', next, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
            window.dispatchEvent(new Event(FORM_SAVE_FBR_INVOICE));
            refresh();
        } finally {
            setLoading(null);
        }
    };

    if (!id) return null;

    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                flexWrap: 'wrap',
                gap: 1,
            }}
        >
            {/* ── Left: action buttons ── */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                {canValidate && (
                    <OdooActionButton
                        label="Validate"
                        variant="primary"
                        loading={loading === 'validate'}
                        disabled={loading !== null}
                        onClick={() => void onValidate()}
                    />
                )}
                {canPost && (
                    <OdooActionButton
                        label="Confirm & Post"
                        variant="primary"
                        loading={loading === 'post'}
                        disabled={loading !== null}
                        onClick={() => void onPost()}
                    />
                )}
                {canCancel && (
                    <OdooActionButton
                        label="Cancel"
                        variant="danger"
                        loading={loading === 'status'}
                        disabled={loading !== null}
                        onClick={() => void setStatusAndSave('cancelled')}
                    />
                )}
                {canResetDraft && (
                    <OdooActionButton
                        label="Reset to Draft"
                        variant="ghost"
                        loading={loading === 'status'}
                        disabled={loading !== null}
                        onClick={() => void setStatusAndSave('ordered')}
                    />
                )}
            </Box>

            {/* ── Right: status breadcrumb ── */}
            <StatusBreadcrumb stages={displayStages} activeKey={activeBreadcrumbKey} />
        </Box>
    );
}

// ─────────────────────────────────────────────
// Sub-header (sticky top bar)
// ─────────────────────────────────────────────
function InvoiceSubHeader({
    isCreate,
    isLocked,
    isEditing,
    onStartEdit,
    onStopEdit,
}: {
    isCreate: boolean;
    isLocked: boolean;
    isEditing: boolean;
    onStartEdit: () => void;
    onStopEdit: () => void;
}) {
    const translate = useTranslate();
    const dataProvider = useDataProvider();
    const redirect = useRedirect();
    const record = useRecordContext<any>();
    const notify = useNotify();
    const reference = useWatch({ name: 'reference' }) as string | undefined;
    const fbrInvoiceNumberWatch = useWatch({ name: 'fbrInvoiceNumber' }) as string | undefined;

    const onDuplicate = React.useCallback(async () => {
        if (!record?.id) return;
        const src = await dataProvider.getOne('fbrInvoices', { id: record.id });
        const d: any = src.data ?? {};
        const payload = {
            customerPartyId: d.customerPartyId,
            invoiceDateUtc: new Date().toISOString(),
            paymentTerms: d.paymentTerms ?? 'immediate',
            status: 'ordered',
            deliveryFees: Number(d.deliveryFees) || 0,
            fbrScenarioId: d.fbrScenarioId ?? null,
            reference: d.reference != null && String(d.reference).trim() !== '' ? String(d.reference).trim() : '',
            lines: (d.lines ?? []).map((l: any) => ({
                productProfileId: l.productProfileId,
                quantity: Number(l.quantity) || 0,
                unitPrice: Number(l.unitPrice) || 0,
                taxRate: Number(l.taxRate) || 0,
                fbrSalesTaxRateId: l.fbrSalesTaxRateId ?? null,
                fbrSalesTaxRateIds: Array.isArray(l.fbrSalesTaxRateIds) ? l.fbrSalesTaxRateIds : undefined,
                discountRate: Number(l.discountRate) || 0,
                remarks: String(l.remarks ?? ''),
            })),
        };
        const created = await dataProvider.create('fbrInvoices', { data: payload });
        redirect('edit', 'fbrInvoices', created.data.id);
    }, [dataProvider, redirect, record?.id]);

    const onPrint = React.useCallback(async () => {
        if (!record) return;
        try {
            let sellerName = '', sellerAddress = '', sellerNtn = '', sellerPhone = '';
            try {
                const companies = await dataProvider.getList('companies', {
                    pagination: { page: 1, perPage: 1 },
                    sort: { field: 'id', order: 'ASC' },
                    filter: {},
                });
                const c: any = (companies.data as any[])?.[0];
                if (c) {
                    sellerName = String(c.title ?? c.shortTitle ?? '');
                    sellerAddress = String(c.address ?? '');
                    sellerNtn = String(c.ntnNo ?? '');
                    sellerPhone = String(c.phone ?? '');
                }
            } catch { /* ignore */ }

            let customerName = '', customerAddress = '', customerNtn = '', customerPhone = '';
            try {
                const customerId = (record.customerPartyId ?? record.customer_id ?? record.customerId) as any;
                if (customerId != null && customerId !== '') {
                    const cust = await dataProvider.getOne('customers', { id: customerId });
                    const cu: any = cust.data;
                    customerName = String(cu.partyBusinessName ?? cu.partyName ?? '');
                    customerAddress = String(cu.addressOne ?? cu.address ?? '');
                    customerNtn = String(cu.ntnno ?? cu.ntnNo ?? '');
                    customerPhone = String(cu.phoneOne ?? cu.phone ?? '');
                }
            } catch { /* ignore */ }

            const qrText = String(
                record.fbrInvoiceNumber || record.invoiceNumber || record.reference || record.id || ''
            );
            let qrDataUrl: string | null = null;
            try {
                qrDataUrl = qrText ? await qrToDataUrl(qrText, { margin: 1, width: 240 }) : null;
            } catch { qrDataUrl = null; }

            const status = String(record.status ?? '').toLowerCase();
            const statusLabel =
                status === 'ordered' ? 'Draft'
                : status === 'delivered' ? 'Validated'
                : status === 'posted' ? 'Confirmed'
                : status === 'cancelled' ? 'Cancelled'
                : status || '—';

            const doc = (
                <FbrInvoicePdf
                    sellerName={sellerName}
                    sellerAddress={sellerAddress}
                    sellerNtn={sellerNtn}
                    sellerPhone={sellerPhone}
                    invoiceNumber={String(record.invoiceNumber ?? '').trim()}
                    reference={record.reference ?? reference ?? ''}
                    invoiceDate={new Date(record.invoiceDate ?? record.invoiceDateUtc ?? Date.now()).toLocaleDateString()}
                    paymentTerms={record.paymentTerms ?? ''}
                    statusLabel={statusLabel}
                    returned={Boolean(record.returned)}
                    deliveryFees={Number(record.deliveryFees) || 0}
                    fbrInvoiceNumber={record.fbrInvoiceNumber ?? ''}
                    scenarioText={record.fbrScenarioId ? String(record.fbrScenarioId) : ''}
                    customerName={customerName || record.customerName || ''}
                    customerAddress={customerAddress || record.customerAddress || ''}
                    customerNtn={customerNtn}
                    customerPhone={customerPhone}
                    fbrError={record.fbrLastError ?? null}
                    lines={(record.lines ?? []) as any[]}
                    totalExTaxes={Number(record.totalExTaxes) || 0}
                    taxes={Number(record.taxes) || 0}
                    total={Number(record.total) || 0}
                    qrDataUrl={qrDataUrl}
                />
            );

            const blob = await pdf(doc).toBlob();
            const url = URL.createObjectURL(blob);
            const w = window.open(url, '_blank');
            if (!w) notify('Popup blocked. Please allow popups to print.', { type: 'warning' });
        } catch (e: any) {
            notify(e?.message ? String(e.message) : 'Failed to generate PDF', { type: 'error' });
        }
    }, [notify, record, reference, dataProvider]);

    return (
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
                py: 1,
                mb: 1.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 2,
                flexWrap: 'wrap',
            }}
        >
            <Box sx={{ minWidth: 0 }}>
                <Typography
                    variant="subtitle2"
                    fontWeight={700}
                    sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 1, rowGap: 0.25 }}
                >
                    <span>
                        {isCreate
                            ? 'Invoice'
                            : `Invoice ${String(record?.invoiceNumber ?? '').trim() || reference || ''}`}
                    </span>
                    {!isCreate && fbrInvoiceNumberWatch ? (
                        <Typography
                            component="span"
                            variant="caption"
                            fontWeight={600}
                            color="primary"
                            sx={{ fontSize: '0.8rem' }}
                        >
                            FBR {fbrInvoiceNumberWatch}
                        </Typography>
                    ) : null}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                    {translate('resources.fbrInvoices.subheader.hint', { _: 'All changes are saved on the server.' })}
                </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                {!isCreate ? (
                    <PrevNextButtons
                        resource="fbrInvoices"
                        filterDefaultValues={{ status: 'ordered' }}
                        sort={{ field: 'invoiceDate', order: 'DESC' }}
                    />
                ) : null}
                <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />
                <FormHeaderToolbar
                    saveEventName={FORM_SAVE_FBR_INVOICE}
                    resource="fbrInvoices"
                    listPath="/fbrInvoices"
                    showDelete={!isCreate}
                    disableSave={!isCreate && isLocked}
                    disableDelete={!isCreate && isLocked}
                    showSave={isCreate || isEditing}
                    settingsItems={
                        isCreate
                            ? []
                            : [
                                  {
                                      key: 'edit',
                                      label: isEditing ? 'Stop editing' : 'Edit',
                                      onClick: async () => { if (isEditing) onStopEdit(); else onStartEdit(); },
                                      disabled: isLocked,
                                  },
                                  { key: 'duplicate', label: 'Duplicate', onClick: onDuplicate },
                                  { key: 'print', label: 'Print', onClick: onPrint },
                              ]
                    }
                />
            </Box>
        </Box>
    );
}

function InvoiceActivityLog() {
    const record = useRecordContext<any>();
    const created = record?.createdAtUtc ?? record?.createdAt;
    const updated = record?.updatedAtUtc ?? record?.updatedAt;
    const createdBy = record?.createdByDisplayName as string | undefined;
    const updatedBy = record?.updatedByDisplayName as string | undefined;
    const createdAt = created ? parseApiUtcInstant(created) ?? null : null;
    const updatedAt = updated ? parseApiUtcInstant(updated) ?? null : null;
    const updatedDiffers =
        createdAt && updatedAt ? createdAt.getTime() !== updatedAt.getTime() : Boolean(updatedAt);
    const fbrErr = (record?.fbrLastError as string | null | undefined) ?? null;

    return (
        <Card variant="outlined">
            <CardContent sx={{ pt: 2, '&:last-child': { pb: 2 } }}>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                    Activities
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                    Creation and update logs
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {fbrErr ? (
                        <Alert severity="error" sx={{ '& .MuiAlert-message': { width: '100%' }, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                            <Typography variant="body2" fontWeight={700} sx={{ mb: 0.5 }}>FBR Error</Typography>
                            <Typography variant="body2" component="div" sx={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}>
                                {fbrErr}
                            </Typography>
                        </Alert>
                    ) : null}
                    {createdAt ? (
                        <Typography variant="body2">
                            <b>Created</b> {createdBy ? <>{createdBy} </> : null}{createdAt.toLocaleString()}
                        </Typography>
                    ) : null}
                    {updatedAt && updatedDiffers ? (
                        <Typography variant="body2">
                            <b>Updated</b> {updatedBy ? <>{updatedBy} </> : null}{updatedAt.toLocaleString()}
                        </Typography>
                    ) : null}
                    {!createdAt && !updatedAt ? (
                        <Typography variant="body2" color="text.secondary">No activity yet.</Typography>
                    ) : null}
                </Box>
            </CardContent>
        </Card>
    );
}

function InvoiceDocHeading({ isCreate }: { isCreate: boolean }) {
    const translate = useTranslate();
    const invoiceNumber = useWatch({ name: 'invoiceNumber' }) as string | undefined;
    const reference = useWatch({ name: 'reference' }) as string | undefined;
    return (
        <Box sx={{ mb: 2 }}>
            <Typography variant="overline" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                {translate('resources.orders.invoice.document', { _: 'Invoice' })}
            </Typography>
            <Typography variant="h5" fontWeight={700} sx={{ lineHeight: 1.2, fontSize: '1.25rem' }}>
                {isCreate
                    ? translate('resources.fbrInvoices.new_invoice_title', { _: 'New invoice' })
                    : invoiceNumber?.trim() || '—'}
            </Typography>
            {!isCreate && reference?.trim() ? (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                    {translate('resources.orders.invoice.reference', { _: 'Reference' })}: {reference.trim()}
                </Typography>
            ) : null}
        </Box>
    );
}