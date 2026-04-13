import * as React from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import {
    ReferenceInput,
    SelectInput,
    TextInput,
    DateInput,
    useTranslate,
    useNotify,
    useRefresh,
    useRecordContext,
    PrevNextButtons,
    useDataProvider,
    useGetIdentity,
} from 'react-admin';
import { useLocation, useNavigate } from 'react-router-dom';
import { pdf } from '@react-pdf/renderer';
import { Box, Card, CardContent, Grid, Typography } from '@mui/material';

import { apiFetch } from '../api/httpClient';
import { SplitFormLayout } from '../common/layout/SplitFormLayout';
import { RecordThreadPanel } from '../common/recordThread';
import { StatusBreadcrumb, WorkflowActionButton } from '../common/workflowChevronUi';
import {
    FormSaveBridge,
    FORM_SAVE_GL_JOURNAL_VOUCHER,
    FormDocumentWorkflowBar,
} from '../common/formToolbar';
import { useAccountingAccess } from './useAccountingAccess';
import {
    JV_UNDERLINE_FIELD_SX,
    JournalFieldRow,
} from './glJournalVoucherFieldStyles';
import { GlJournalVoucherLinesGrid, type GlJournalLineRow } from './GlJournalVoucherLinesGrid';
import { GlJournalVoucherPdfDocument } from './GlJournalVoucherPdf';
import { buildGlJournalVoucherPdfProps, chartAccountDisplayLabel } from './glJournalVoucherPrintModel';
import { buildJournalDuplicatePayload, navigateToJournalDuplicate } from './glJournalVoucherDuplicate';
import { parseMoney } from './glJournalVoucherMoney';

const GL_JOURNAL_VOUCHERS_THREAD_KEY = 'glJournalVouchers';

const MISC_VOUCHER_TYPE_FILTER = { systemType: 5 };

function JournalDocHeading({ isCreate }: { isCreate: boolean }) {
    const translate = useTranslate();
    const manualNo = useWatch({ name: 'manualNo' }) as string | undefined;
    const record = useRecordContext<Record<string, unknown>>();
    const voucherNo = String(record?.voucherNo ?? '').trim();
    return (
        <Box sx={{ mb: 2, pr: { xs: 5, sm: 7 } }}>
            <Typography variant="overline" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                {translate('resources.glJournalVouchers.document_label', { _: 'Journal voucher' })}
            </Typography>
            <Typography variant="h5" fontWeight={700} sx={{ lineHeight: 1.2, fontSize: '1.25rem' }}>
                {isCreate ? translate('resources.glJournalVouchers.create_title') : voucherNo || '—'}
            </Typography>
            {!isCreate && manualNo?.trim() ? (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                    {translate('resources.glJournalVouchers.fields.reference')}: {manualNo.trim()}
                </Typography>
            ) : null}
        </Box>
    );
}

function JournalVoucherWorkflowBar({
    voucherId,
    canWrite,
    approvalStatusCode,
    posted,
    cancelled,
    canPostBalance,
}: {
    voucherId: number | null;
    canWrite: boolean;
    approvalStatusCode: string;
    posted: boolean;
    cancelled: boolean;
    canPostBalance: boolean;
}) {
    const notify = useNotify();
    const translate = useTranslate();
    const refresh = useRefresh();
    const [loading, setLoading] = React.useState<'approve' | 'confirm' | 'post' | 'void' | null>(null);

    const code = String(approvalStatusCode ?? 'draft').toLowerCase();
    const st = cancelled || code === 'deleted' ? 'deleted' : code;

    const canApprove = Boolean(
        canWrite && voucherId != null && st === 'draft' && !posted && !cancelled
    );
    const canConfirm = Boolean(
        canWrite && voucherId != null && st === 'approved' && !posted && !cancelled
    );
    const canPost = Boolean(
        canWrite &&
            voucherId != null &&
            st === 'confirmed' &&
            !posted &&
            !cancelled &&
            canPostBalance
    );
    const canVoid = Boolean(
        canWrite &&
            voucherId != null &&
            !posted &&
            !cancelled &&
            (st === 'draft' || st === 'approved' || st === 'confirmed')
    );

    const breadcrumbStages = [
        { key: 'draft', label: translate('resources.glJournalVouchers.workflow.draft', { _: 'Draft' }) },
        {
            key: 'approved',
            label: translate('resources.glJournalVouchers.workflow.approved', { _: 'Approved' }),
        },
        {
            key: 'confirmed',
            label: translate('resources.glJournalVouchers.workflow.confirmed', { _: 'Confirmed' }),
        },
        { key: 'posted', label: translate('resources.glJournalVouchers.workflow.posted', { _: 'Posted' }) },
    ];

    const isDeleted = st === 'deleted' || cancelled;
    const activeBreadcrumbKey = isDeleted ? 'deleted' : posted ? 'posted' : st;
    const displayStages = isDeleted
        ? [
              {
                  key: 'deleted',
                  label: translate('resources.glJournalVouchers.workflow.deleted', { _: 'Deleted' }),
              },
          ]
        : breadcrumbStages;

    const run = async (path: string, phase: 'approve' | 'confirm' | 'post' | 'void') => {
        if (voucherId == null) return;
        setLoading(phase);
        try {
            const res = await apiFetch(
                `/api/glJournalVouchers/${voucherId}/${path}`,
                { method: 'POST' },
                { auth: true, retryOn401: true }
            );
            if (!res.ok) {
                const j = await res.json().catch(() => ({}));
                notify((j as { message?: string }).message ?? 'Request failed', { type: 'warning' });
                return;
            }
            const okMsg =
                phase === 'post'
                    ? translate('resources.glJournalVouchers.posted_ok')
                    : phase === 'approve'
                      ? translate('resources.glJournalVouchers.notifications.approved_ok', {
                            _: 'Voucher approved.',
                        })
                      : phase === 'confirm'
                        ? translate('resources.glJournalVouchers.notifications.confirmed_ok', {
                              _: 'Voucher confirmed.',
                          })
                        : translate('resources.glJournalVouchers.notifications.void_ok', {
                              _: 'Voucher voided.',
                          });
            notify(okMsg, { type: 'success' });
            refresh();
        } catch {
            notify('ra.notification.http_error', { type: 'error' });
        } finally {
            setLoading(null);
        }
    };

    if (voucherId == null) return null;

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
                {canApprove ? (
                    <WorkflowActionButton
                        label={translate('resources.glJournalVouchers.actions.approve', { _: 'Approve' })}
                        variant="primary"
                        loading={loading === 'approve'}
                        disabled={loading !== null}
                        onClick={() => void run('approve', 'approve')}
                    />
                ) : null}
                {canConfirm ? (
                    <WorkflowActionButton
                        label={translate('resources.glJournalVouchers.actions.confirm', { _: 'Confirm' })}
                        variant="primary"
                        loading={loading === 'confirm'}
                        disabled={loading !== null}
                        onClick={() => void run('confirm', 'confirm')}
                    />
                ) : null}
                {canPost ? (
                    <WorkflowActionButton
                        label={translate('resources.glJournalVouchers.actions.post', { _: 'Post' })}
                        variant="primary"
                        loading={loading === 'post'}
                        disabled={loading !== null}
                        onClick={() => void run('post', 'post')}
                    />
                ) : null}
                {canVoid ? (
                    <WorkflowActionButton
                        label={translate('resources.glJournalVouchers.actions.void', { _: 'Void' })}
                        variant="danger"
                        loading={loading === 'void'}
                        disabled={loading !== null}
                        onClick={() => void run('void', 'void')}
                    />
                ) : null}
            </Box>
            <StatusBreadcrumb stages={displayStages} activeKey={activeBreadcrumbKey} />
        </Box>
    );
}

export function GlJournalVoucherForm(props: { variant: 'create' | 'edit' }) {
    const { variant } = props;
    const translate = useTranslate();
    const notify = useNotify();
    const record = useRecordContext<Record<string, unknown>>();
    const { watch, getValues } = useFormContext();
    const dataProvider = useDataProvider();
    const { identity } = useGetIdentity();
    const navigate = useNavigate();
    const location = useLocation();
    const canDelete = useAccountingAccess('glJournalVouchers', 'delete');
    const canWrite = useAccountingAccess('glJournalVouchers', 'write');

    const posted = Boolean(record?.posted ?? record?.Posted);
    const cancelled = Boolean(record?.cancelled ?? record?.Cancelled);
    const approvalStatusCode = String(record?.approvalStatusCode ?? 'draft');
    const readOnly =
        posted ||
        Boolean(record?.readOnly ?? record?.ReadOnly) ||
        cancelled ||
        approvalStatusCode.toLowerCase() === 'deleted';
    const id = record?.id != null ? Number(record.id) : null;
    const voucherNo = String(record?.voucherNo ?? '').trim();

    const linesForm = watch('lines') as GlJournalLineRow[] | undefined;
    const liveDr = linesForm?.reduce((s, l) => s + parseMoney(l?.dr), 0) ?? 0;
    const liveCr = linesForm?.reduce((s, l) => s + parseMoney(l?.cr), 0) ?? 0;
    const canPostBalance =
        (linesForm?.length ?? 0) > 0 && Math.abs(liveDr - liveCr) < 0.0005 && liveDr > 0;

    const isCreate = variant === 'create';

    const onDuplicateJournal = React.useCallback(() => {
        const values = getValues() as Record<string, unknown>;
        if (!values.voucherTypeId) {
            notify(
                translate('resources.glJournalVouchers.duplicate_need_type', {
                    _: 'Select a voucher type before duplicating.',
                }),
                { type: 'warning' }
            );
            return;
        }
        const payload = buildJournalDuplicatePayload(values);
        navigateToJournalDuplicate(navigate, location, payload);
        notify(
            translate('resources.glJournalVouchers.duplicate_opening', {
                _: 'Opened a new voucher with copied lines.',
            }),
            { type: 'success' }
        );
    }, [getValues, location, navigate, notify, translate]);

    const onPrintJournalPdf = React.useCallback(async () => {
        const values = getValues() as Record<string, unknown>;
        const vtId = values.voucherTypeId;
        if (!vtId) {
            notify(
                translate('resources.glJournalVouchers.print_need_type', {
                    _: 'Select a voucher type before printing.',
                }),
                { type: 'warning' }
            );
            return;
        }
        try {
            const { data: vtRaw } = await dataProvider.getOne('glVoucherTypes', { id: vtId });
            const vt = vtRaw as Record<string, unknown>;
            const formLines = (values.lines as GlJournalLineRow[]) ?? [];
            const recLines = (record?.lines as Record<string, unknown>[]) ?? [];
            const accountIds = Array.from(
                new Set(formLines.map(l => l.glAccountId).filter((x): x is number => Number(x) > 0))
            );
            const labelById: Record<number, string> = {};
            if (accountIds.length > 0) {
                const { data: accounts } = await dataProvider.getMany('glChartAccounts', {
                    ids: accountIds,
                });
                for (const a of accounts ?? []) {
                    const row = a as Record<string, unknown>;
                    const aid = Number(row.id);
                    if (Number.isFinite(aid)) labelById[aid] = chartAccountDisplayLabel(row);
                }
            }
            const lineDisplayLabels = formLines.map((l, i) => {
                const fromRec = recLines[i]?.glAccountLabel ?? recLines[i]?.glaccountlabel;
                if (fromRec != null && String(fromRec).trim() !== '') return String(fromRec).trim();
                if (l.glAccountId && labelById[l.glAccountId]) return labelById[l.glAccountId];
                return '—';
            });
            const rawDate = values.voucherDate;
            const voucherDate =
                rawDate instanceof Date
                    ? rawDate
                    : rawDate != null
                      ? new Date(String(rawDate))
                      : new Date();
            const companyName =
                identity && typeof identity === 'object' && 'companyName' in identity
                    ? String((identity as { companyName?: string }).companyName ?? '')
                    : '';
            const userName =
                identity && typeof identity === 'object' && 'fullName' in identity
                    ? String((identity as { fullName?: string }).fullName ?? '')
                    : '';

            const pdfProps = buildGlJournalVoucherPdfProps({
                companyName,
                userName,
                voucherType: vt,
                formLines,
                lineDisplayLabels,
                voucherNo: String(record?.voucherNo ?? values.voucherNo ?? '—'),
                voucherDate: Number.isNaN(voucherDate.getTime()) ? new Date() : voucherDate,
                posted: Boolean(record?.posted),
                approvalStatusCode: String(record?.approvalStatusCode ?? 'draft'),
                postedAtUtc: record?.postedAtUtc as string | Date | null | undefined,
                enteredAtUtc: record?.enteredAtUtc as string | Date | null | undefined,
            });
            const blob = await pdf(<GlJournalVoucherPdfDocument {...pdfProps} />).toBlob();
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank', 'noopener,noreferrer');
            window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
        } catch (e) {
            notify(e instanceof Error ? e.message : 'Print failed', { type: 'warning' });
        }
    }, [dataProvider, getValues, identity, notify, record, translate]);

    const settingsItems = React.useMemo(
        () => [
            {
                key: 'duplicate',
                label: translate('resources.glJournalVouchers.actions.duplicate', { _: 'Duplicate' }),
                onClick: onDuplicateJournal,
            },
            {
                key: 'print',
                label: translate('resources.glJournalVouchers.actions.print_pdf', { _: 'Print PDF' }),
                onClick: onPrintJournalPdf,
            },
        ],
        [onDuplicateJournal, onPrintJournalPdf, translate]
    );

    return (
        <>
            <FormSaveBridge eventName={FORM_SAVE_GL_JOURNAL_VOUCHER} />
            <SplitFormLayout sidebar={<RecordThreadPanel resourceKey={GL_JOURNAL_VOUCHERS_THREAD_KEY} />}>
                <Box sx={{ minWidth: 0, width: '100%' }}>
                    <FormDocumentWorkflowBar
                        title={
                            isCreate
                                ? translate('resources.glJournalVouchers.create_title')
                                : `${translate('resources.glJournalVouchers.title_one')} ${voucherNo || `#${id ?? ''}`}`
                        }
                        subtitle={translate('resources.glJournalVouchers.subtitle')}
                        leadingActions={
                            !isCreate ? (
                                <PrevNextButtons
                                    resource="glJournalVouchers"
                                    sort={{ field: 'voucherDate', order: 'DESC' }}
                                />
                            ) : null
                        }
                        saveEventName={FORM_SAVE_GL_JOURNAL_VOUCHER}
                        resource="glJournalVouchers"
                        listPath="/glJournalVouchers"
                        showDelete={!isCreate && canDelete && !posted && !cancelled}
                        disableSave={readOnly || !canWrite}
                        disableDelete={readOnly || posted || !canDelete}
                        showSave={!readOnly && canWrite}
                        settingsItems={settingsItems}
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
                            <JournalVoucherWorkflowBar
                                voucherId={id}
                                canWrite={canWrite}
                                approvalStatusCode={approvalStatusCode}
                                posted={posted}
                                cancelled={cancelled}
                                canPostBalance={canPostBalance}
                            />
                        </Box>
                    ) : null}
                    <Box component="fieldset" disabled={readOnly} sx={{ border: 'none', m: 0, p: 0, minWidth: 0 }}>
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
                            <CardContent
                                sx={{
                                    p: '16px 20px !important',
                                    position: 'relative',
                                    pr: { xs: '14px !important', sm: '20px !important' },
                                }}
                            >
                                <JournalDocHeading isCreate={isCreate} />

                                <Grid container columnSpacing={4} rowSpacing={0}>
                                    <Grid size={{ xs: 12 }}>
                                        <JournalFieldRow
                                            label={translate('resources.glJournalVouchers.fields.voucher_type', {
                                                _: 'Voucher type',
                                            })}
                                        >
                                            <ReferenceInput
                                                source="voucherTypeId"
                                                reference="glVoucherTypes"
                                                perPage={200}
                                                filter={MISC_VOUCHER_TYPE_FILTER}
                                            >
                                                <SelectInput
                                                    fullWidth
                                                    optionText="title"
                                                    label={false}
                                                    variant="standard"
                                                    margin="none"
                                                    size="small"
                                                    disabled={readOnly}
                                                    sx={{
                                                        ...JV_UNDERLINE_FIELD_SX,
                                                        '& .MuiSelect-select': { py: '5px' },
                                                        '& .MuiSelect-icon': { top: 'calc(50% - 12px)' },
                                                    }}
                                                />
                                            </ReferenceInput>
                                        </JournalFieldRow>
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <JournalFieldRow
                                            label={translate('resources.glJournalVouchers.fields.voucher_date')}
                                        >
                                            <DateInput
                                                source="voucherDate"
                                                label={false}
                                                variant="standard"
                                                margin="none"
                                                size="small"
                                                fullWidth
                                                disabled={readOnly}
                                                sx={JV_UNDERLINE_FIELD_SX}
                                            />
                                        </JournalFieldRow>
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <JournalFieldRow label={translate('resources.glJournalVouchers.fields.reference')}>
                                            <TextInput
                                                source="manualNo"
                                                label={false}
                                                variant="standard"
                                                margin="none"
                                                size="small"
                                                fullWidth
                                                disabled={readOnly}
                                                sx={JV_UNDERLINE_FIELD_SX}
                                            />
                                        </JournalFieldRow>
                                    </Grid>
                                    <Grid size={{ xs: 12 }}>
                                        <JournalFieldRow label={translate('resources.glJournalVouchers.fields.remarks')}>
                                            <TextInput
                                                source="remarks"
                                                label={false}
                                                variant="standard"
                                                margin="none"
                                                size="small"
                                                fullWidth
                                                multiline
                                                minRows={2}
                                                disabled={readOnly}
                                                sx={JV_UNDERLINE_FIELD_SX}
                                            />
                                        </JournalFieldRow>
                                    </Grid>
                                </Grid>

                                <Box sx={{ mt: 2 }}>
                                    <GlJournalVoucherLinesGrid readOnly={readOnly} />
                                </Box>
                            </CardContent>
                        </Card>
                    </Box>
                </Box>
            </SplitFormLayout>
        </>
    );
}
