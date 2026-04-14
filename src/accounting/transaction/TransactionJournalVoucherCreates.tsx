import * as React from 'react';
import { Create, HttpError, SimpleForm, useNotify, useTranslate } from 'react-admin';
import { useLocation } from 'react-router-dom';

import { GlJournalVoucherForm } from '../GlJournalVoucherForm';
import type { JournalDuplicateState } from '../glJournalVoucherDuplicate';
import { emptyGlJournalLine } from '../GlJournalVoucherLinesGrid';
import { mapGlJournalVoucherToApiBody } from '../glJournalVoucherTransform';

function mergeDuplicateDefaults(dup: JournalDuplicateState | undefined): Record<string, unknown> {
    if (!dup) return {};
    const raw = dup.voucherDate;
    const voucherDate =
        raw instanceof Date ? raw : raw != null ? new Date(String(raw)) : new Date();
    const lines =
        dup.lines && dup.lines.length > 0 ? dup.lines : [emptyGlJournalLine(), emptyGlJournalLine()];
    return {
        voucherTypeId: dup.voucherTypeId,
        voucherDate: Number.isNaN(voucherDate.getTime()) ? new Date() : voucherDate,
        remarks: dup.remarks,
        manualNo: dup.manualNo,
        bankCashGlAccountId:
            dup.bankCashGlAccountId != null && Number(dup.bankCashGlAccountId) > 0
                ? Number(dup.bankCashGlAccountId)
                : null,
        lines,
    };
}

function TransactionJournalVoucherCreate(props: {
    titleTranslateKey: string;
    voucherTypeFilter: Record<string, unknown>;
    bankCashLinkKind: 'bank' | 'cash';
}) {
    const notify = useNotify();
    const translate = useTranslate();
    const location = useLocation();
    const duplicateDefaults = (location.state as { duplicateDefaults?: JournalDuplicateState } | null)
        ?.duplicateDefaults;

    const defaultValues = React.useMemo(
        () => ({
            voucherDate: new Date(),
            remarks: '',
            manualNo: '',
            bankCashGlAccountId: null as number | null,
            lines: [emptyGlJournalLine(), emptyGlJournalLine()],
            ...mergeDuplicateDefaults(duplicateDefaults),
        }),
        [duplicateDefaults, location.key]
    );

    const docTitle = translate(props.titleTranslateKey);

    return (
        <Create
            key={location.key}
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
            <SimpleForm
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
                />
            </SimpleForm>
        </Create>
    );
}

export function BankPaymentJournalVoucherCreate() {
    return (
        <TransactionJournalVoucherCreate
            titleTranslateKey="resources.glJournalVouchers.create_bank_payment"
            voucherTypeFilter={{ systemType: 3, controlAccountTxnNature: 1 }}
            bankCashLinkKind="bank"
        />
    );
}

export function CashPaymentJournalVoucherCreate() {
    return (
        <TransactionJournalVoucherCreate
            titleTranslateKey="resources.glJournalVouchers.create_cash_payment"
            voucherTypeFilter={{ systemType: 2, controlAccountTxnNature: 1 }}
            bankCashLinkKind="cash"
        />
    );
}

export function BankReceiptJournalVoucherCreate() {
    return (
        <TransactionJournalVoucherCreate
            titleTranslateKey="resources.glJournalVouchers.create_bank_receipt"
            voucherTypeFilter={{ systemType: 3, controlAccountTxnNature: 0 }}
            bankCashLinkKind="bank"
        />
    );
}

export function CashReceiptJournalVoucherCreate() {
    return (
        <TransactionJournalVoucherCreate
            titleTranslateKey="resources.glJournalVouchers.create_cash_receipt"
            voucherTypeFilter={{ systemType: 2, controlAccountTxnNature: 0 }}
            bankCashLinkKind="cash"
        />
    );
}
