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
import { CompactAutocompleteInput } from '../common/odooCompactFormFields';
import { GlJournalVoucherLinesGrid, type GlJournalLineRow } from './GlJournalVoucherLinesGrid';
import { GlJournalVoucherPdfDocument } from './GlJournalVoucherPdf';
import { buildGlJournalVoucherPdfProps, chartAccountDisplayLabel } from './glJournalVoucherPrintModel';
import { buildJournalDuplicatePayload, navigateToJournalDuplicate } from './glJournalVoucherDuplicate';
import { parseMoney } from './glJournalVoucherMoney';
import type { LineEntryMode } from './glJournalVoucherTransform';

const GL_JOURNAL_VOUCHERS_THREAD_KEY = 'glJournalVouchers';

const MISC_VOUCHER_TYPE_FILTER = { systemType: 5 };

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

function JournalDocHeading({
    isCreate,
    titleOverride,
}: {
    isCreate: boolean;
    titleOverride?: string;
}) {
    const translate = useTranslate();
    const manualNo = useWatch({ name: 'manualNo' }) as string | undefined;
    const record = useRecordContext<Record<string, unknown>>();
    const voucherNo = String(record?.voucherNo ?? '').trim();
    return (
        <Box sx={{ mb: 2, pr: { xs: 5, sm: 7 } }}>
            <Typography variant="overline" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                {translate('resources.glJournalVouchers.document_label')}
            </Typography>
            <Typography variant="h5" fontWeight={700} sx={{ lineHeight: 1.2, fontSize: '1.25rem' }}>
                {isCreate
                    ? titleOverride ?? translate('resources.glJournalVouchers.create_title')
                    : voucherNo || '—'}
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
    canDelete,
    approvalStatusCode,
    posted,
    cancelled,
    canPostBalance,
}: {
    voucherId: number | null;
    canWrite: boolean;
    canDelete: boolean;
    approvalStatusCode: string;
    posted: boolean;
    cancelled: boolean;
    canPostBalance: boolean;
}) {
    const notify = useNotify();
    const translate = useTranslate();
    const refresh = useRefresh();
    const [loading, setLoading] = React.useState<'approve' | 'confirm' | 'post' | 'void' | null>(null);
    const [statusResetBusy, setStatusResetBusy] = React.useState(false);

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
        { key: 'draft', label: translate('resources.glJournalVouchers.workflow.draft') },
        {
            key: 'approved',
            label: translate('resources.glJournalVouchers.workflow.approved'),
        },
        {
            key: 'confirmed',
            label: translate('resources.glJournalVouchers.workflow.confirmed'),
        },
        { key: 'posted', label: translate('resources.glJournalVouchers.workflow.posted') },
    ];

    const isDeleted = st === 'deleted' || cancelled;
    const activeBreadcrumbKey = isDeleted ? 'deleted' : posted ? 'posted' : st;
    const displayStages = isDeleted
        ? [
              {
                  key: 'deleted',
                  label: translate('resources.glJournalVouchers.workflow.deleted'),
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
                      ? translate('resources.glJournalVouchers.notifications.approved_ok')
                      : phase === 'confirm'
                        ? translate('resources.glJournalVouchers.notifications.confirmed_ok')
                        : translate('resources.glJournalVouchers.notifications.void_ok');
            notify(okMsg, { type: 'success' });
            refresh();
        } catch {
            notify('ra.notification.http_error', { type: 'error' });
        } finally {
            setLoading(null);
        }
    };

    const onClickStatus = React.useCallback(async (next: string) => {
        if (voucherId == null) return;
        if (!canWrite) return;
        const nextCode = String(next ?? '').toLowerCase();
        if (nextCode !== 'draft' && nextCode !== 'approved' && nextCode !== 'confirmed') return;
        if (st === 'deleted' || cancelled) return;
        if (posted && !canDelete) return;
        if (nextCode === st) return;
        setStatusResetBusy(true);
        try {
            const res = await apiFetch(
                `/api/glJournalVouchers/${voucherId}/set-approval-status`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code: nextCode }),
                },
                { auth: true, retryOn401: true }
            );
            if (!res.ok) {
                const j = await res.json().catch(() => ({}));
                notify((j as { message?: string }).message ?? 'Request failed', { type: 'warning' });
                return;
            }
            notify(translate('resources.glJournalVouchers.notifications.status_reset_ok', { _: 'Status updated.' }), { type: 'success' });
            refresh();
        } catch (e) {
            notify(e instanceof Error ? e.message : 'Request failed', { type: 'warning' });
        } finally {
            setStatusResetBusy(false);
        }
    }, [voucherId, canWrite, canDelete, st, posted, cancelled, notify, translate, refresh]);

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
                        label={translate('resources.glJournalVouchers.actions.approve')}
                        variant="primary"
                        loading={loading === 'approve'}
                        disabled={loading !== null || statusResetBusy}
                        onClick={() => void run('approve', 'approve')}
                    />
                ) : null}
                {canConfirm ? (
                    <WorkflowActionButton
                        label={translate('resources.glJournalVouchers.actions.confirm')}
                        variant="primary"
                        loading={loading === 'confirm'}
                        disabled={loading !== null || statusResetBusy}
                        onClick={() => void run('confirm', 'confirm')}
                    />
                ) : null}
                {canPost ? (
                    <WorkflowActionButton
                        label={translate('resources.glJournalVouchers.actions.post')}
                        variant="primary"
                        loading={loading === 'post'}
                        disabled={loading !== null || statusResetBusy}
                        onClick={() => void run('post', 'post')}
                    />
                ) : null}
                {canVoid ? (
                    <WorkflowActionButton
                        label={translate('resources.glJournalVouchers.actions.void')}
                        variant="danger"
                        loading={loading === 'void'}
                        disabled={loading !== null || statusResetBusy}
                        onClick={() => void run('void', 'void')}
                    />
                ) : null}
            </Box>
            <StatusBreadcrumb stages={displayStages} activeKey={activeBreadcrumbKey} onStageClick={k => void onClickStatus(k)} />
        </Box>
    );
}

export type GlJournalVoucherFormProps = {
    variant: 'create' | 'edit';
    /** When set (create flows), restricts voucher type list. When omitted, miscellaneous (5) only. */
    voucherTypeFilter?: Record<string, unknown>;
    /** Master bank/cash GL account picker; when set on create, filters chart to linked bank or cash books. */
    bankCashLinkKind?: 'bank' | 'cash';
    /** Optional create screen title (translation string passed from parent). */
    createDocumentTitle?: string;
    /** Create flow: bank payment uses debit-only lines + paired bank credits on save. */
    lineEntryMode?: LineEntryMode;
    /** Show cheque fields even before voucher type metadata loads (e.g. bank payment create). */
    forceShowChequeFields?: boolean;
};

export function GlJournalVoucherForm(props: GlJournalVoucherFormProps) {
    const {
        variant,
        voucherTypeFilter: voucherTypeFilterProp,
        bankCashLinkKind: bankCashLinkKindProp,
        lineEntryMode: lineEntryModeProp,
        forceShowChequeFields: forceShowChequeFieldsProp,
    } = props;
    const translate = useTranslate();
    const notify = useNotify();
    const record = useRecordContext<Record<string, unknown>>();
    const { watch, getValues, setValue } = useFormContext();
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
    const lineEntryModeW = useWatch({ name: 'lineEntryMode' }) as LineEntryMode | undefined;
    const effectiveLineEntryMode: LineEntryMode = lineEntryModeProp ?? lineEntryModeW ?? 'standard';
    const debitOnly =
        effectiveLineEntryMode === 'bank_payment_debit_only' ||
        effectiveLineEntryMode === 'cash_payment_debit_only';
    const creditOnly =
        effectiveLineEntryMode === 'bank_receipt_credit_only' ||
        effectiveLineEntryMode === 'cash_receipt_credit_only';
    const bankPaymentDebitOnly = effectiveLineEntryMode === 'bank_payment_debit_only';
    const hasDebitLines =
        (linesForm ?? []).some(l => Number(l?.glAccountId) > 0 && parseMoney(l?.dr) > 0) ?? false;
    const hasCreditLines =
        (linesForm ?? []).some(l => Number(l?.glAccountId) > 0 && parseMoney(l?.cr) > 0) ?? false;
    const noUserCredit =
        (linesForm ?? []).every(l => parseMoney(l?.cr) < 0.0005) ?? true;
    const noUserDebit =
        (linesForm ?? []).every(l => parseMoney(l?.dr) < 0.0005) ?? true;
    const canPostBalance = debitOnly
        ? hasDebitLines && noUserCredit && liveDr > 0
        : creditOnly
          ? hasCreditLines && noUserDebit && liveCr > 0
          : (linesForm?.length ?? 0) > 0 && Math.abs(liveDr - liveCr) < 0.0005 && liveDr > 0;

    const isCreate = variant === 'create';

    const voucherTypeIdW = useWatch({ name: 'voucherTypeId' }) as number | string | null | undefined;
    const bankCashGlAccountIdW = useWatch({ name: 'bankCashGlAccountId' }) as number | string | null | undefined;
    const chequeNoW = useWatch({ name: 'chequeNo' }) as string | null | undefined;

    const [resolvedBankCashKind, setResolvedBankCashKind] = React.useState<'bank' | 'cash' | null>(null);

    React.useEffect(() => {
        if (bankCashLinkKindProp != null) {
            setResolvedBankCashKind(bankCashLinkKindProp);
            return;
        }
        if (isCreate || voucherTypeIdW == null || voucherTypeIdW === '') {
            setResolvedBankCashKind(null);
            return;
        }
        let cancelled = false;
        void dataProvider
            .getOne('glVoucherTypes', { id: voucherTypeIdW })
            .then(({ data }) => {
                if (cancelled) return;
                const st = Number((data as Record<string, unknown>).systemType);
                if (st === 3) setResolvedBankCashKind('bank');
                else if (st === 2) setResolvedBankCashKind('cash');
                else setResolvedBankCashKind(null);
            })
            .catch(() => {
                if (!cancelled) setResolvedBankCashKind(null);
            });
        return () => {
            cancelled = true;
        };
    }, [bankCashLinkKindProp, dataProvider, isCreate, voucherTypeIdW]);

    const bankCashLinkKind = resolvedBankCashKind ?? undefined;

    const showBankAndChequeDateW = useWatch({ name: 'showBankAndChequeDate' }) as boolean | undefined;
    const showChequeFields =
        Boolean(forceShowChequeFieldsProp) ||
        (Boolean(showBankAndChequeDateW) && bankCashLinkKind === 'bank');

    const voucherTypeFilter = React.useMemo(() => {
        if (!isCreate && voucherTypeIdW != null && voucherTypeIdW !== '')
            return { ids: [Number(voucherTypeIdW)] };
        if (voucherTypeFilterProp != null) return voucherTypeFilterProp;
        return MISC_VOUCHER_TYPE_FILTER;
    }, [isCreate, voucherTypeFilterProp, voucherTypeIdW]);

    React.useEffect(() => {
        if (!bankCashLinkKind || !isCreate || voucherTypeIdW == null || voucherTypeIdW === '') return;
        let cancelled = false;
        void dataProvider
            .getOne('glVoucherTypes', { id: voucherTypeIdW })
            .then(({ data }) => {
                if (cancelled) return;
                const def = (data as Record<string, unknown>).defaultControlGlAccountId;
                if (def != null && Number(def) > 0) setValue('bankCashGlAccountId', Number(def));
            });
        return () => {
            cancelled = true;
        };
    }, [bankCashLinkKind, dataProvider, isCreate, setValue, voucherTypeIdW]);

    React.useEffect(() => {
        if (voucherTypeIdW == null || voucherTypeIdW === '') return;
        let cancelled = false;
        void dataProvider
            .getOne('glVoucherTypes', { id: voucherTypeIdW })
            .then(({ data }) => {
                if (cancelled) return;
                const d = data as Record<string, unknown>;
                setValue('showBankAndChequeDate', Boolean(d.showBankAndChequeDate), { shouldDirty: false });
            })
            .catch(() => {
                /* ignore */
            });
        return () => {
            cancelled = true;
        };
    }, [dataProvider, setValue, voucherTypeIdW]);

    /** Bank payment create: suggest next free cheque from active book when the field is still empty. */
    React.useEffect(() => {
        if (!isCreate || !bankPaymentDebitOnly || readOnly) return;
        const gla =
            bankCashGlAccountIdW != null && bankCashGlAccountIdW !== ''
                ? Number(bankCashGlAccountIdW)
                : NaN;
        if (!Number.isFinite(gla) || gla <= 0) return;
        const currentCheque = String(chequeNoW ?? '').trim();
        // If the user manually typed something different, don't overwrite it.
        // If the value is empty, or it was auto-filled for a different bank, refresh it.
        const lastAuto = (GlJournalVoucherForm as any)._lastAutoCheque as
            | { glAccountId: number; chequeNo: string }
            | undefined;
        const canOverwrite =
            currentCheque === '' ||
            (lastAuto != null && lastAuto.chequeNo === currentCheque && lastAuto.glAccountId !== gla);
        if (!canOverwrite) return;
        let cancelled = false;
        const timer = window.setTimeout(() => {
            void (async () => {
                try {
                    const res = await apiFetch(
                        `/api/glJournalVouchers/next-cheque-number?bankCashGlAccountId=${gla}`,
                        { method: 'GET' },
                        { auth: true, retryOn401: true }
                    );
                    if (!res.ok || cancelled) return;
                    const j = (await res.json()) as { suggestedChequeNo?: string | null };
                    if (cancelled) return;
                    const cur = String(getValues('chequeNo') ?? '').trim();
                    if ((cur === '' || (lastAuto != null && lastAuto.chequeNo === cur)) && j.suggestedChequeNo) {
                        setValue('chequeNo', j.suggestedChequeNo, { shouldDirty: false });
                        (GlJournalVoucherForm as any)._lastAutoCheque = {
                            glAccountId: gla,
                            chequeNo: j.suggestedChequeNo,
                        };
                    }
                } catch {
                    /* ignore */
                }
            })();
        }, 400);
        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [
        isCreate,
        bankPaymentDebitOnly,
        readOnly,
        bankCashGlAccountIdW,
        chequeNoW,
        getValues,
        setValue,
    ]);

    const onDuplicateJournal = React.useCallback(() => {
        const values = getValues() as Record<string, unknown>;
        if (!values.voucherTypeId) {
            notify(
                translate('resources.glJournalVouchers.duplicate_need_type'),
                { type: 'warning' }
            );
            return;
        }
        const payload = buildJournalDuplicatePayload({
            ...values,
            voucherSystemType: values.voucherSystemType ?? record?.voucherSystemType,
            controlAccountTxnNature: values.controlAccountTxnNature ?? record?.controlAccountTxnNature,
            lineEntryMode: values.lineEntryMode ?? record?.lineEntryMode,
        });
        navigateToJournalDuplicate(navigate, location, payload);
        notify(
            translate('resources.glJournalVouchers.duplicate_opening'),
            { type: 'success' }
        );
    }, [getValues, location, navigate, notify, record, translate]);

    const onPrintJournalPdf = React.useCallback(async () => {
        const values = getValues() as Record<string, unknown>;
        const vtId = values.voucherTypeId;
        if (!vtId) {
            notify(
                translate('resources.glJournalVouchers.print_need_type'),
                { type: 'warning' }
            );
            return;
        }
        try {
            const { data: vtRaw } = await dataProvider.getOne('glVoucherTypes', { id: vtId });
            const vt = vtRaw as Record<string, unknown>;
            const formLines =
                (record?.linesFull as GlJournalLineRow[] | undefined) ??
                ((values.lines as GlJournalLineRow[]) ?? []);
            const recLines = (record?.linesFull ?? record?.lines ?? []) as Record<string, unknown>[];
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
                const fromLine = l.glAccountLabel;
                if (fromLine != null && String(fromLine).trim() !== '') return String(fromLine).trim();
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
                label: translate('resources.glJournalVouchers.actions.duplicate'),
                onClick: onDuplicateJournal,
            },
            {
                key: 'print',
                label: translate('resources.glJournalVouchers.actions.print_pdf'),
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
                                ? props.createDocumentTitle ??
                                  translate('resources.glJournalVouchers.create_title')
                                : `${translate('resources.glJournalVouchers.title_one')} ${voucherNo || `#${id ?? ''}`}`
                        }
                        subtitle={translate('resources.glJournalVouchers.subtitle')}
                        sx={{
                            // Match dashboard tight spacing under the top nav (AppShell already adds a 2px gap).
                            mb: 1,
                            py: '4px',
                        }}
                        navigationActions={
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
                                canDelete={canDelete}
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
                                    minWidth: 0,
                                    maxWidth: '100%',
                                }}
                            >
                                <JournalDocHeading
                                    isCreate={isCreate}
                                    titleOverride={props.createDocumentTitle}
                                />

                                <Grid container columnSpacing={4} rowSpacing={0}>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <JournalFieldRow
                                            label={translate('resources.glJournalVouchers.fields.voucher_type')}
                                        >
                                            <ReferenceInput
                                                source="voucherTypeId"
                                                reference="glVoucherTypes"
                                                perPage={200}
                                                filter={voucherTypeFilter}
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
                                    {bankCashLinkKind ? (
                                        <Grid size={{ xs: 12, sm: 6 }}>
                                            <JournalFieldRow
                                                label={translate(
                                                    bankCashLinkKind === 'bank'
                                                        ? 'resources.glJournalVouchers.fields.bank_account'
                                                        : 'resources.glJournalVouchers.fields.cash_account'
                                                )}
                                            >
                                                <ReferenceInput
                                                    source="bankCashGlAccountId"
                                                    reference="glChartAccounts"
                                                    perPage={200}
                                                    filter={{
                                                        bankCashLinkKind,
                                                        ...(bankCashLinkKind === 'cash'
                                                            ? { cashUserScope: true }
                                                            : {}),
                                                    }}
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
                                                            bankCashLinkKind,
                                                            postingOnly: true,
                                                        })}
                                                        fullWidth
                                                        parse={v => v ?? null}
                                                        disabled={readOnly}
                                                        sx={{
                                                            ...JV_UNDERLINE_FIELD_SX,
                                                            '& .MuiAutocomplete-inputRoot': { minHeight: 36 },
                                                        }}
                                                    />
                                                </ReferenceInput>
                                            </JournalFieldRow>
                                        </Grid>
                                    ) : null}
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
                                    {showChequeFields ? (
                                        <>
                                            <Grid size={{ xs: 12, sm: 6 }}>
                                                <JournalFieldRow
                                                    label={translate('resources.glJournalVouchers.fields.cheque_no')}
                                                >
                                                    <TextInput
                                                        source="chequeNo"
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
                                                <JournalFieldRow
                                                    label={translate('resources.glJournalVouchers.fields.cheque_date')}
                                                >
                                                    <DateInput
                                                        source="chequeDate"
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
                                        </>
                                    ) : null}
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

                                <Box sx={{ mt: 2, minWidth: 0, maxWidth: '100%' }}>
                                    <GlJournalVoucherLinesGrid
                                        readOnly={readOnly}
                                        lineEntryMode={effectiveLineEntryMode}
                                    />
                                </Box>
                            </CardContent>
                        </Card>
                    </Box>
                </Box>
            </SplitFormLayout>
        </>
    );
}
