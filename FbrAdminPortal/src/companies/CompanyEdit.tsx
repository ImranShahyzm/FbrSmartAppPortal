import * as React from 'react';
import {
    Edit,
    ReferenceInput,
    SimpleForm,
    useDataProvider,
    useNotify,
    useRecordContext,
    useRefresh,
} from 'react-admin';
import { useWatch } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import {
    Box,
    Card,
    CardContent,
    CircularProgress,
    Divider,
    Grid,
    IconButton,
    Tooltip,
    Typography,
} from '@mui/material';
import { apiFetch } from '../api/httpClient';
import {
    CompactAutocompleteInput,
    CompactNumberInput,
    CompactSelectInput,
    CompactTextInput,
    FieldRow,
} from '../common/compactFormFields';
import { AdminCompanyChatter } from './CompanyChatter';
import { LogoBase64Input } from './LogoBase64Input';
import { FormHeaderToolbar, FormSaveBridge, FORM_SAVE_ADMIN_COMPANY } from '../common/formToolbar';

const CARD_SX = {
    mt: 0,
    width: '100%',
    maxWidth: '100%',
    borderColor: '#dee2e6',
    borderRadius: '4px',
    boxShadow: 'none',
} as const;

const CHEVRON_H = 32;
const CHEVRON_OVERLAP = 10;

const COMPANY_LIST_PAGE = 100_000;

function CompanyRecordPagination({ companyId }: { companyId: string | undefined }) {
    const dataProvider = useDataProvider();
    const navigate = useNavigate();
    const [ids, setIds] = React.useState<string[]>([]);
    const [total, setTotal] = React.useState(0);

    React.useEffect(() => {
        if (!companyId) return;
        let cancelled = false;
        dataProvider
            .getList('companies', {
                pagination: { page: 1, perPage: COMPANY_LIST_PAGE },
                sort: { field: 'id', order: 'ASC' },
                filter: {},
            })
            .then(res => {
                if (cancelled) return;
                const rows = res.data as { id?: number | string }[];
                setIds(rows.map(r => String(r.id ?? '')).filter(Boolean));
                setTotal(typeof res.total === 'number' ? res.total : rows.length);
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, [dataProvider, companyId]);

    if (!companyId) return null;

    const idx = ids.indexOf(companyId);
    const pos = idx >= 0 ? idx + 1 : '—';
    const prevId = idx > 0 ? ids[idx - 1] : null;
    const nextId = idx >= 0 && idx < ids.length - 1 ? ids[idx + 1] : null;

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, justifyContent: 'center' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12, whiteSpace: 'nowrap', mr: 0.5 }}>
                {pos} / {total || ids.length}
            </Typography>
            <Tooltip title="Previous company">
                <span>
                    <IconButton
                        size="small"
                        disabled={!prevId}
                        onClick={() => prevId && navigate(`/companies/${encodeURIComponent(prevId)}`)}
                        sx={{ p: '2px' }}
                    >
                        <NavigateBeforeIcon sx={{ fontSize: 20 }} />
                    </IconButton>
                </span>
            </Tooltip>
            <Tooltip title="Next company">
                <span>
                    <IconButton
                        size="small"
                        disabled={!nextId}
                        onClick={() => nextId && navigate(`/companies/${encodeURIComponent(nextId)}`)}
                        sx={{ p: '2px' }}
                    >
                        <NavigateNextIcon sx={{ fontSize: 20 }} />
                    </IconButton>
                </span>
            </Tooltip>
        </Box>
    );
}

function StatusBreadcrumb({ stages, activeKey }: { stages: Array<{ key: string; label: string }>; activeKey: string }) {
    const activeIdx = stages.findIndex(s => s.key === activeKey);

    return (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {stages.map((s, i) => {
                const isPast = i < activeIdx;
                const isActive = i === activeIdx;
                const isFirst = i === 0;
                const isLast = i === stages.length - 1;

                const bg = isActive ? '#875A7B' : isPast ? '#c8b4c3' : '#e9e9e9';
                const color = isActive || isPast ? '#fff' : '#666';

                const clipPath = (() => {
                    const arrowW = 10;
                    if (isFirst && isLast) return 'none';
                    if (isFirst)
                        return `polygon(0 0, calc(100% - ${arrowW}px) 0, 100% 50%, calc(100% - ${arrowW}px) 100%, 0 100%)`;
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

function CompanyWorkflowBar() {
    const record = useRecordContext<any>();
    const notify = useNotify();
    const refresh = useRefresh();
    const [loading, setLoading] = React.useState(false);

    const watchActivated = useWatch({ name: 'isActivated' }) as boolean | undefined;
    const watchPayment = useWatch({ name: 'paymentStatus' }) as string | undefined;

    const id = record?.id != null ? String(record.id) : '';
    const activated = Boolean(watchActivated ?? record?.isActivated);
    const pay = String(watchPayment ?? record?.paymentStatus ?? '').toLowerCase();

    const billingOk = pay === 'confirmed' || pay === 'waived';
    const activeKey = !activated ? 'pending' : billingOk ? 'billing' : 'active';

    const stages = [
        { key: 'pending', label: 'Pending' },
        { key: 'active', label: 'Active' },
        { key: 'billing', label: 'Billing OK' },
    ];

    const setActivation = async (isActivated: boolean) => {
        if (!record?.id) return;
        setLoading(true);
        try {
            const res = await apiFetch(`/api/admin/companies/${record.id}/activation`, {
                method: 'PUT',
                body: JSON.stringify({ isActivated }),
            });
            if (!res.ok) {
                const t = await res.text();
                throw new Error(t || 'Activation failed');
            }
            notify(isActivated ? 'Company activated' : 'Company deactivated', { type: 'success' });
            refresh();
        } catch (e: any) {
            notify(e?.message ?? 'Activation failed', { type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    if (!id) return null;

    const canActivate = !activated;
    const canDeactivate = activated;

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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                {canActivate && (
                    <OdooActionButton
                        label="Activate"
                        variant="primary"
                        loading={loading}
                        disabled={loading}
                        onClick={() => void setActivation(true)}
                    />
                )}
                {canDeactivate && (
                    <OdooActionButton
                        label="Deactivate"
                        variant="danger"
                        loading={loading}
                        disabled={loading}
                        onClick={() => void setActivation(false)}
                    />
                )}
            </Box>
            <StatusBreadcrumb stages={stages} activeKey={activeKey} />
        </Box>
    );
}

function CompanySubHeader() {
    const record = useRecordContext<any>();
    const titleWatch = useWatch({ name: 'title' }) as string | undefined;
    const displayTitle = String(titleWatch ?? record?.title ?? '').trim() || `ID ${record?.id ?? ''}`;
    const companyId = record?.id != null ? String(record.id) : undefined;

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
                gap: 1,
                flexWrap: 'nowrap',
            }}
        >
            <Box sx={{ minWidth: 0, flex: '0 1 auto' }}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ fontSize: '0.85rem' }} noWrap>
                    Company {displayTitle}
                </Typography>
            </Box>
            <Box sx={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'center' }}>
                <CompanyRecordPagination companyId={companyId} />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: '0 0 auto' }}>
                <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />
                <FormHeaderToolbar
                    saveEventName={FORM_SAVE_ADMIN_COMPANY}
                    resource="companies"
                    listPath="/companies"
                    showDelete={false}
                    showSave
                />
            </Box>
        </Box>
    );
}

export default function CompanyEdit() {
    return (
        <Edit
            title="Company"
            mutationMode="pessimistic"
            actions={false}
            redirect={false}
            sx={{
                width: '100%',
                maxWidth: '100%',
                '& .RaEdit-main': { maxWidth: '100%', width: '100%' },
                '& .RaEdit-card': { maxWidth: '100% !important', width: '100%', boxShadow: 'none' },
            }}
        >
            <SimpleForm toolbar={false} sx={{ maxWidth: 'none', width: '100%' }}>
                <FormSaveBridge eventName={FORM_SAVE_ADMIN_COMPANY} />
                <Grid container columnSpacing={2} rowSpacing={0} alignItems="flex-start" sx={{ width: '100%' }}>
                    <Grid size={{ xs: 12, lg: 8 }}>
                        <CompanySubHeader />
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
                            <CompanyWorkflowBar />
                        </Box>

                        <Card variant="outlined" sx={CARD_SX}>
                            <CardContent sx={{ p: '16px 20px !important' }}>
                                <Typography variant="overline" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                    Company
                                </Typography>

                                <Grid container columnSpacing={4} rowSpacing={0} alignItems="flex-start" sx={{ width: '100%' }}>
                                    <Grid size={{ xs: 12, lg: 9 }}>
                                        <FieldRow label="Company name">
                                            <CompactTextInput source="title" label={false} fullWidth />
                                        </FieldRow>
                                        <FieldRow label="Short title">
                                            <CompactTextInput source="shortTitle" label={false} fullWidth />
                                        </FieldRow>

                                        <Grid container columnSpacing={2} sx={{ width: '100%', mt: 0.5, mb: '4px' }}>
                                            <Grid size={{ xs: 12, sm: 6 }}>
                                                <FieldRow label="NTN No">
                                                    <CompactTextInput source="ntnNo" label={false} fullWidth />
                                                </FieldRow>
                                            </Grid>
                                            <Grid size={{ xs: 12, sm: 6 }}>
                                                <FieldRow label="Email">
                                                    <CompactTextInput source="email" label={false} fullWidth />
                                                </FieldRow>
                                            </Grid>
                                        </Grid>

                                        <FieldRow label="Phone">
                                            <CompactTextInput source="phone" label={false} fullWidth />
                                        </FieldRow>

                                        <Grid container columnSpacing={2} sx={{ width: '100%', mb: '4px' }}>
                                            <Grid size={{ xs: 12, sm: 6 }}>
                                                <FieldRow label="Website">
                                                    <CompactTextInput source="website" label={false} fullWidth />
                                                </FieldRow>
                                            </Grid>
                                            <Grid size={{ xs: 12, sm: 6 }}>
                                                <FieldRow label="FBR Province">
                                                    <ReferenceInput source="fbrProvinceId" reference="fbrProvinces" perPage={1000}>
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
                                    </Grid>

                                    <Grid
                                        size={{ xs: 12, lg: 3 }}
                                        sx={{
                                            alignSelf: 'flex-start',
                                            maxHeight: { lg: 240 },
                                            overflow: 'hidden',
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                justifyContent: { xs: 'flex-start', lg: 'flex-end' },
                                                width: '100%',
                                                maxHeight: { lg: 236 },
                                                overflow: 'hidden',
                                                '& *': { maxWidth: '100% !important' },
                                            }}
                                        >
                                            <LogoBase64Input
                                                source="logoBase64"
                                                accept="image/*"
                                                label="Company logo"
                                                compact
                                            />
                                        </Box>
                                    </Grid>
                                </Grid>

                                <Typography
                                    variant="overline"
                                    color="text.secondary"
                                    sx={{ fontSize: '0.7rem', display: 'block', mt: 1, mb: 0.5 }}
                                >
                                    Payment
                                </Typography>
                                <Grid container columnSpacing={2} sx={{ width: '100%', mb: '4px' }}>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <FieldRow label="Payment status">
                                            <CompactSelectInput
                                                source="paymentStatus"
                                                label={false}
                                                fullWidth
                                                choices={[
                                                    { id: 'pending', name: 'Pending' },
                                                    { id: 'confirmed', name: 'Confirmed' },
                                                    { id: 'failed', name: 'Failed' },
                                                    { id: 'waived', name: 'Waived' },
                                                ]}
                                            />
                                        </FieldRow>
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <FieldRow label="Payment model">
                                            <CompactSelectInput
                                                source="paymentModel"
                                                label={false}
                                                fullWidth
                                                choices={[
                                                    { id: 'monthly', name: 'Monthly' },
                                                    { id: 'annual', name: 'Annual' },
                                                    { id: 'custom', name: 'Custom' },
                                                ]}
                                            />
                                        </FieldRow>
                                    </Grid>
                                </Grid>
                                <FieldRow label="Notes">
                                    <CompactTextInput source="paymentNotes" label={false} fullWidth multiline />
                                </FieldRow>
                                <Grid container columnSpacing={2} sx={{ width: '100%', mb: '4px' }}>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <FieldRow label="Amount">
                                            <CompactNumberInput source="amount" label={false} fullWidth />
                                        </FieldRow>
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <FieldRow label="Currency">
                                            <CompactTextInput source="currency" label={false} fullWidth />
                                        </FieldRow>
                                    </Grid>
                                </Grid>

                                <Typography
                                    variant="overline"
                                    color="text.secondary"
                                    sx={{ fontSize: '0.7rem', display: 'block', mt: 1, mb: 0.5 }}
                                >
                                    FBR tokens
                                </Typography>
                                <FieldRow label="Enable sandbox">
                                    <CompactSelectInput
                                        source="enableSandBox"
                                        label={false}
                                        fullWidth
                                        choices={[
                                            { id: true, name: 'Yes' },
                                            { id: false, name: 'No' },
                                        ]}
                                    />
                                </FieldRow>
                                <FieldRow label="Sandbox token">
                                    <CompactTextInput source="fbrTokenSandBox" label={false} fullWidth />
                                </FieldRow>
                                <FieldRow label="Production token">
                                    <CompactTextInput source="fbrTokenProduction" label={false} fullWidth />
                                </FieldRow>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid size={{ xs: 12, lg: 4 }} sx={{ alignSelf: 'stretch' }}>
                        <Box
                            sx={{
                                position: { md: 'sticky' },
                                top: { md: '72px' },
                                alignSelf: 'flex-start',
                                height: { md: 'calc(100vh - 88px)' },
                                maxHeight: { md: 'calc(100vh - 88px)' },
                                minHeight: 0,
                                display: 'flex',
                                flexDirection: 'column',
                            }}
                        >
                            <AdminCompanyChatter />
                        </Box>
                    </Grid>
                </Grid>
            </SimpleForm>
        </Edit>
    );
}