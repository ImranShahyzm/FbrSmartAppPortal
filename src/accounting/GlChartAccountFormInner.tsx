import * as React from 'react';
import {
    AutocompleteArrayInput,
    BooleanInput,
    ReferenceArrayInput,
    required,
    useTranslate,
} from 'react-admin';
import { useWatch } from 'react-hook-form';
import { format } from 'date-fns';
import {
    Box,
    Card,
    CardContent,
    CircularProgress,
    Divider,
    Grid,
    Tab,
    Tabs,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

import { apiFetch } from '../api/httpClient';
import { ACCOUNTING_SUITE_APP_ID } from '../apps/appsRegistry';
import { useCanAccess } from '../auth/useCanAccess';
import {
    FormSaveBridge,
    FORM_SAVE_GL_CHART_ACCOUNT,
} from '../common/formToolbar';
import { FormDocumentWorkflowBar } from '../common/formToolbar';
import { SplitFormLayout } from '../common/layout/SplitFormLayout';
import { CompactTextInput, FieldRow, UNDERLINE_FIELD_SX } from '../common/odooCompactFormFields';
import { GlAccountTypeHierarchyInput } from './GlAccountTypeHierarchyInput';
import { GlChartAccountMappingTable } from './GlChartAccountMappingTable';
import { PhaseTagPicker } from './PhaseTagPicker';
import { RecordThreadPanel } from '../common/recordThread';

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

const EPS = 0.0005;

function startOfMonth(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function formatMoneyAbs(n: number): string {
    if (!Number.isFinite(n)) return '0.00';
    return Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type GlLedgerSummaryRow = {
    glCaid: number;
    endBalance: number;
};

type GlLedgerSummaryResponse = {
    rows: GlLedgerSummaryRow[];
    dateFrom: string;
    dateTo: string;
    postedOnly: boolean;
};

type GlLedgerLine = {
    runningBalance: number;
};

type GlLedgerLinesResponse = {
    openingBalance: number;
    lines: GlLedgerLine[];
};

type GlChartAccountFormInnerProps = {
    mode: 'create' | 'edit';
    recordReadOnly?: boolean;
};

export function GlChartAccountFormInner({ mode, recordReadOnly }: GlChartAccountFormInnerProps) {
    const translate = useTranslate();
    const [tab, setTab] = React.useState(0);
    const canReadGlReport = useCanAccess(ACCOUNTING_SUITE_APP_ID, 'accountingReports', 'read');

    const glTitle = useWatch({ name: 'glTitle' }) as string | undefined;
    const glCode = useWatch({ name: 'glCode' }) as string | undefined;
    const idVal = useWatch({ name: 'id' }) as number | undefined;
    const readOnly = mode === 'edit' && Boolean(recordReadOnly);

    const [glBalanceLoading, setGlBalanceLoading] = React.useState(false);
    const [glBalanceError, setGlBalanceError] = React.useState<string | null>(null);
    const [glEndBalance, setGlEndBalance] = React.useState<number | null>(null);
    const [glBalanceRange, setGlBalanceRange] = React.useState<{ from: string; to: string } | null>(null);

    React.useEffect(() => {
        if (!canReadGlReport || mode !== 'edit' || !idVal || idVal <= 0) {
            setGlEndBalance(null);
            setGlBalanceError(null);
            setGlBalanceLoading(false);
            setGlBalanceRange(null);
            return;
        }

        let cancelled = false;
        const run = async () => {
            setGlBalanceLoading(true);
            setGlBalanceError(null);
            try {
                const now = new Date();
                const dateFrom = format(startOfMonth(now), 'yyyy-MM-dd');
                const dateTo = format(endOfMonth(now), 'yyyy-MM-dd');
                const q = new URLSearchParams({
                    dateFrom,
                    dateTo,
                    postedOnly: 'true',
                    nonZeroClosingOnly: 'true',
                });
                const res = await apiFetch(`/api/accountingReports/general-ledger/summary?${q.toString()}`, { method: 'GET' });
                const body = (await res.json().catch(() => ({}))) as GlLedgerSummaryResponse & { message?: string };
                if (!res.ok) {
                    throw new Error(typeof body?.message === 'string' ? body.message : `Error ${res.status}`);
                }
                const row = body.rows?.find(r => r.glCaid === idVal);
                if (cancelled) return;
                const range = { from: body.dateFrom ?? dateFrom, to: body.dateTo ?? dateTo };
                setGlBalanceRange(range);

                if (row) {
                    setGlEndBalance(row.endBalance);
                    return;
                }

                const qLines = new URLSearchParams({
                    glCaid: String(idVal),
                    dateFrom: range.from,
                    dateTo: range.to,
                    postedOnly: 'true',
                });
                const resLines = await apiFetch(`/api/accountingReports/general-ledger/lines?${qLines.toString()}`, { method: 'GET' });
                const bodyLines = (await resLines.json().catch(() => ({}))) as GlLedgerLinesResponse & { message?: string };
                if (!resLines.ok) {
                    throw new Error(typeof bodyLines?.message === 'string' ? bodyLines.message : `Error ${resLines.status}`);
                }
                const lines = Array.isArray(bodyLines.lines) ? bodyLines.lines : [];
                const last = lines.length > 0 ? lines[lines.length - 1]!.runningBalance : Number(bodyLines.openingBalance ?? 0);
                if (cancelled) return;
                setGlEndBalance(last);
            } catch (e) {
                if (cancelled) return;
                setGlEndBalance(null);
                setGlBalanceError(e instanceof Error ? e.message : 'Request failed');
                setGlBalanceRange(null);
            } finally {
                if (!cancelled) setGlBalanceLoading(false);
            }
        };

        void run();
        return () => {
            cancelled = true;
        };
    }, [canReadGlReport, mode, idVal]);

    const balanceTooltip =
        glBalanceRange != null
            ? `Same period-end balance as General Ledger (${glBalanceRange.from}–${glBalanceRange.to}, posted vouchers only).`
            : 'Same period-end balance as General Ledger (month to date, posted vouchers only).';

    const balanceTypography = (() => {
        if (mode === 'create' || !idVal || idVal <= 0) {
            return (
                <Typography variant="body2" fontWeight={700} color="text.disabled">
                    —
                </Typography>
            );
        }
        if (!canReadGlReport) {
            return (
                <Typography variant="body2" fontWeight={700} color="text.disabled">
                    —
                </Typography>
            );
        }
        if (glBalanceLoading) {
            return <CircularProgress size={16} thickness={5} />;
        }
        if (glBalanceError) {
            return (
                <Typography variant="body2" fontWeight={700} color="warning.main" sx={{ maxWidth: 220 }} noWrap title={glBalanceError}>
                    —
                </Typography>
            );
        }
        if (glEndBalance === null) {
            return (
                <Typography variant="body2" fontWeight={700} color="text.disabled">
                    —
                </Typography>
            );
        }
        const v = glEndBalance;
        const isZero = Math.abs(v) < EPS;
        const isCr = v < 0;
        return (
            <Typography
                variant="body2"
                fontWeight={700}
                sx={{
                    fontVariantNumeric: 'tabular-nums',
                    color: isZero ? 'text.disabled' : isCr ? 'error.main' : 'text.primary',
                }}
            >
                {isZero ? '0.00' : `${formatMoneyAbs(v)}\u00a0${isCr ? 'Cr' : 'Dr'}`}
            </Typography>
        );
    })();

    const breadcrumb =
        mode === 'create'
            ? 'Chart of Accounts / New'
            : `Chart of Accounts / ${(glCode ?? '').trim() || '—'}`;

    const titleTop = mode === 'create' ? `New ${translate('resources.glChartAccounts.name', { smart_count: 1 })}` : translate('resources.glChartAccounts.name', { smart_count: 1 });

    return (
        <>
            <FormSaveBridge eventName={FORM_SAVE_GL_CHART_ACCOUNT} />

            <FormDocumentWorkflowBar
                title={titleTop}
                subtitle={`${breadcrumb}${glCode?.trim() ? ` / ${glCode.trim()}` : ''}`}
                saveEventName={FORM_SAVE_GL_CHART_ACCOUNT}
                resource="glChartAccounts"
                listPath="/glChartAccounts"
                showDelete={false}
                centerContent={
                    <Tooltip title={balanceTooltip}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                Balance
                            </Typography>
                            {balanceTypography}
                        </Box>
                    </Tooltip>
                }
                sx={{ mb: 1, py: '4px' }}
            />

            <SplitFormLayout sidebar={<RecordThreadPanel resourceKey="glChartAccounts" />}>
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
                        <Box sx={{ mb: 1.5 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block' }}>
                                Account Name
                            </Typography>
                            <CompactTextInput
                                source="glTitle"
                                label={false}
                                fullWidth
                                validate={required()}
                                disabled={readOnly}
                                placeholder="e.g. Current Assets"
                                sx={{
                                    ...UNDERLINE_FIELD_SX,
                                    '& .MuiInputBase-root': { fontSize: 22, fontWeight: 700, minHeight: 42 },
                                    '& .MuiInputBase-input': { py: '6px' },
                                }}
                            />

                            <Box sx={{ mt: 1.25 }}>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block' }}>
                                    Code
                                </Typography>
                                <CompactTextInput
                                    source="glCode"
                                    label={false}
                                    fullWidth
                                    validate={required()}
                                    disabled={readOnly}
                                    placeholder="e.g. 101000"
                                    sx={{
                                        ...UNDERLINE_FIELD_SX,
                                        '& .MuiInputBase-root': { fontSize: 20, fontWeight: 700, minHeight: 40 },
                                        '& .MuiInputBase-input': { py: '6px' },
                                    }}
                                />
                            </Box>
                        </Box>

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
                                        <PhaseTagPicker disabled={readOnly} />
                                    </FieldRow>
                                </Grid>
                                <Grid size={{ xs: 12, md: 6 }}>
                                    <FieldRow label="Deprecated">
                                        <BooleanInput source="deprecated" label={false} disabled={readOnly} sx={{ mt: 0.5 }} />
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
            </SplitFormLayout>
        </>
    );
}
