import * as React from 'react';
import { Create, HttpError, Loading, SimpleForm, useGetList, useNotify, useTranslate } from 'react-admin';
import { useLocation } from 'react-router-dom';

import { GlJournalVoucherForm } from '../GlJournalVoucherForm';
import type { JournalDuplicateState } from '../glJournalVoucherDuplicate';
import { emptyGlJournalLine } from '../GlJournalVoucherLinesGrid';
import { mapGlJournalVoucherToApiBody, type LineEntryMode } from '../glJournalVoucherTransform';

/** Stable references so useGetList / effects do not treat the filter as changed every render. */
const VT_FILTER_BANK_PAYMENT = Object.freeze({ systemType: 3, controlAccountTxnNature: 1 });
const VT_FILTER_CASH_PAYMENT = Object.freeze({ systemType: 2, controlAccountTxnNature: 1 });
const VT_FILTER_BANK_RECEIPT = Object.freeze({ systemType: 3, controlAccountTxnNature: 0 });
const VT_FILTER_CASH_RECEIPT = Object.freeze({ systemType: 2, controlAccountTxnNature: 0 });

function mergeDuplicateDefaults(dup: JournalDuplicateState | undefined): Record<string, unknown> {
    if (!dup) return {};
    const raw = dup.voucherDate;
    const voucherDate =
        raw instanceof Date ? raw : raw != null ? new Date(String(raw)) : new Date();
    const lines =
        dup.lines && dup.lines.length > 0 ? dup.lines : [emptyGlJournalLine(), emptyGlJournalLine()];
    const rawChq = dup.chequeDate;
    const chequeDate =
        rawChq instanceof Date
            ? rawChq
            : rawChq != null && rawChq !== ''
              ? new Date(String(rawChq))
              : null;
    return {
        voucherTypeId: dup.voucherTypeId,
        voucherDate: Number.isNaN(voucherDate.getTime()) ? new Date() : voucherDate,
        remarks: dup.remarks,
        manualNo: dup.manualNo,
        bankCashGlAccountId:
            dup.bankCashGlAccountId != null && Number(dup.bankCashGlAccountId) > 0
                ? Number(dup.bankCashGlAccountId)
                : null,
        chequeNo: dup.chequeNo ?? '',
        chequeDate:
            chequeDate != null && !Number.isNaN(chequeDate.getTime()) ? chequeDate : null,
        ...(dup.lineEntryMode ? { lineEntryMode: dup.lineEntryMode } : {}),
        lines,
    };
}

function TransactionJournalVoucherCreate(props: {
    titleTranslateKey: string;
    voucherTypeFilter: Record<string, unknown>;
    bankCashLinkKind: 'bank' | 'cash';
    /** When set, POST body uses paired bank credits per debit line (bank payment). */
    lineEntryMode?: LineEntryMode;
    /** Show cheque no/date on create without waiting for voucher type flags. */
    forceShowChequeFields?: boolean;
}) {
    const notify = useNotify();
    const translate = useTranslate();
    const location = useLocation();
    const duplicateDefaults = (location.state as { duplicateDefaults?: JournalDuplicateState } | null)
        ?.duplicateDefaults;

    const hasDupVoucherType =
        duplicateDefaults?.voucherTypeId != null && Number(duplicateDefaults.voucherTypeId) > 0;

    const { data: voucherTypesFirstPage, isLoading: voucherTypesLoading } = useGetList('glVoucherTypes', {
        filter: props.voucherTypeFilter,
        sort: { field: 'id', order: 'ASC' },
        pagination: { page: 1, perPage: 1 },
    });

    const resolvedDefaultVoucherTypeId = React.useMemo(() => {
        if (hasDupVoucherType && duplicateDefaults?.voucherTypeId != null) {
            return Number(duplicateDefaults.voucherTypeId);
        }
        const first = voucherTypesFirstPage?.[0] as { id?: number } | undefined;
        if (first != null && typeof first.id === 'number' && first.id > 0) return first.id;
        return undefined;
    }, [hasDupVoucherType, duplicateDefaults, voucherTypesFirstPage]);

    const defaultValues = React.useMemo(() => {
        const merged = mergeDuplicateDefaults(duplicateDefaults);
        const vtId =
            merged.voucherTypeId != null && Number(merged.voucherTypeId) > 0
                ? Number(merged.voucherTypeId)
                : resolvedDefaultVoucherTypeId;
        return {
            voucherDate: new Date(),
            remarks: '',
            manualNo: '',
            bankCashGlAccountId: null as number | null,
            chequeNo: '',
            chequeDate: null as Date | null,
            showBankAndChequeDate: false,
            lines: [emptyGlJournalLine(), emptyGlJournalLine()],
            ...(props.lineEntryMode ? { lineEntryMode: props.lineEntryMode } : {}),
            ...merged,
            ...(vtId != null && vtId > 0 ? { voucherTypeId: vtId } : {}),
        };
    }, [
        duplicateDefaults,
        location.key,
        location.pathname,
        props.lineEntryMode,
        resolvedDefaultVoucherTypeId,
    ]);

    /** Mount the form only after the first matching voucher type is known (or list finished empty). Avoids ReferenceInput clearing setValue during choice load. */
    const bootstrapReady = hasDupVoucherType || !voucherTypesLoading;

    const docTitle = translate(props.titleTranslateKey);

    return (
        <Create
            key={`${location.pathname}:${location.key}`}
            resource="glJournalVouchers"
            title={props.titleTranslateKey}
            actions={false}
            redirect="edit"
            transform={(data: Record<string, unknown>) => mapGlJournalVoucherToApiBody(data)}
            mutationOptions={{
                onError: (error: unknown) => {
                    const msg =
                        error instanceof HttpError
                            ? error.message
                            : error instanceof Error
                              ? error.message
                              : 'Save failed';
                    notify(msg, { type: 'warning' });
                },
            }}
            sx={{
                width: '100%',
                maxWidth: '100%',
                '& .RaCreate-main': { maxWidth: '100%', width: '100%' },
                '& .RaCreate-card': {
                    maxWidth: '100% !important',
                    width: '100%',
                    boxShadow: 'none',
                },
            }}
        >
            {bootstrapReady ? (
                <SimpleForm
                    key={`${location.pathname}:${location.key}`}
                    mode="onSubmit"
                    sx={{ maxWidth: 'none', width: '100%' }}
                    toolbar={false}
                    defaultValues={defaultValues}
                >
                    <GlJournalVoucherForm
                        variant="create"
                        voucherTypeFilter={props.voucherTypeFilter}
                        bankCashLinkKind={props.bankCashLinkKind}
                        createDocumentTitle={docTitle}
                        lineEntryMode={props.lineEntryMode}
                        forceShowChequeFields={props.forceShowChequeFields}
                    />
                </SimpleForm>
            ) : (
                <Loading />
            )}
        </Create>
    );
}

export function BankPaymentJournalVoucherCreate() {
    return (
        <TransactionJournalVoucherCreate
            titleTranslateKey="resources.glJournalVouchers.create_bank_payment"
            voucherTypeFilter={VT_FILTER_BANK_PAYMENT}
            bankCashLinkKind="bank"
            lineEntryMode="bank_payment_debit_only"
            forceShowChequeFields
        />
    );
}

export function CashPaymentJournalVoucherCreate() {
    return (
        <TransactionJournalVoucherCreate
            titleTranslateKey="resources.glJournalVouchers.create_cash_payment"
            voucherTypeFilter={VT_FILTER_CASH_PAYMENT}
            bankCashLinkKind="cash"
            lineEntryMode="cash_payment_debit_only"
        />
    );
}

export function BankReceiptJournalVoucherCreate() {
    return (
        <TransactionJournalVoucherCreate
            titleTranslateKey="resources.glJournalVouchers.create_bank_receipt"
            voucherTypeFilter={VT_FILTER_BANK_RECEIPT}
            bankCashLinkKind="bank"
            lineEntryMode="bank_receipt_credit_only"
        />
    );
}

export function CashReceiptJournalVoucherCreate() {
    return (
        <TransactionJournalVoucherCreate
            titleTranslateKey="resources.glJournalVouchers.create_cash_receipt"
            voucherTypeFilter={VT_FILTER_CASH_RECEIPT}
            bankCashLinkKind="cash"
            lineEntryMode="cash_receipt_credit_only"
        />
    );
}
