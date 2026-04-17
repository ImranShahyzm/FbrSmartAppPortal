import * as React from 'react';
import { Edit, HttpError, SimpleForm, useNotify } from 'react-admin';

import { SplitFormLayout } from '../../common/layout/SplitFormLayout';
import { RecordThreadPanel } from '../../common/recordThread';
import { mapCheckBooksToApi } from './checkBookPayload';
import { GenBankInformationFormInner } from './GenBankInformationFormInner';

const GEN_BANK_INFORMATION_THREAD_KEY = 'genBankInformation';

async function transformBankUpdate(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    const checkBooks = mapCheckBooksToApi(data);
    return {
        bankAccountTitle: data.bankAccountTitle != null ? String(data.bankAccountTitle) : '',
        bankAccountNumber: data.bankAccountNumber != null ? String(data.bankAccountNumber) : '',
        bankName: data.bankName != null ? String(data.bankName) : '',
        bankBranchCode: data.bankBranchCode != null ? String(data.bankBranchCode) : '',
        bankAddress: data.bankAddress != null ? String(data.bankAddress) : '',
        validateChequeBook: Boolean(data.validateChequeBook),
        checkBooks,
    };
}

export function GenBankInformationEdit() {
    const notify = useNotify();
    return (
        <Edit
            resource="genBankInformation"
            title="resources.genBankInformation.name"
            actions={false}
            mutationMode="pessimistic"
            transform={transformBankUpdate}
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
                '& .RaEdit-main': { maxWidth: '100%', width: '100%', p: 0, pt: 0, mt: 0 },
                '& .RaEdit-content': { p: 0, pt: 0, mt: 0 },
                '& .RaEdit-card': {
                    maxWidth: '100% !important',
                    width: '100%',
                    m: 0,
                    boxShadow: 'none',
                },
            }}
        >
            <SimpleForm sx={{ maxWidth: 'none', width: '100%' }} toolbar={false}>
                <SplitFormLayout sidebar={<RecordThreadPanel resourceKey={GEN_BANK_INFORMATION_THREAD_KEY} />}>
                    <GenBankInformationFormInner variant="edit" />
                </SplitFormLayout>
            </SimpleForm>
        </Edit>
    );
}
