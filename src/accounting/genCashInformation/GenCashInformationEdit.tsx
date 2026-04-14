import * as React from 'react';
import { Edit, HttpError, SimpleForm, useNotify } from 'react-admin';

import { SplitFormLayout } from '../../common/layout/SplitFormLayout';
import { RecordThreadPanel } from '../../common/recordThread';
import { GenCashInformationFormInner } from './GenCashInformationFormInner';

const GEN_CASH_INFORMATION_THREAD_KEY = 'genCashInformation';

async function transformCashUpdate(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    const cashAccount =
        data.cashAccount != null && data.cashAccount !== '' ? Number(data.cashAccount) : null;
    if (cashAccount == null || !Number.isFinite(cashAccount) || cashAccount <= 0) {
        throw new Error('Missing cash chart account.');
    }
    const branchId = data.branchId;
    return {
        accountTitle: data.accountTitle != null ? String(data.accountTitle) : '',
        cashAccount,
        branchId:
            branchId != null && branchId !== '' && Number(branchId) > 0 ? Number(branchId) : null,
    };
}

export function GenCashInformationEdit() {
    const notify = useNotify();
    return (
        <Edit
            resource="genCashInformation"
            title="resources.genCashInformation.name"
            actions={false}
            mutationMode="pessimistic"
            transform={transformCashUpdate}
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
                '& .RaEdit-main': { maxWidth: '100%', width: '100%' },
                '& .RaEdit-card': {
                    maxWidth: '100% !important',
                    width: '100%',
                    boxShadow: 'none',
                },
            }}
        >
            <SimpleForm sx={{ maxWidth: 'none', width: '100%' }} toolbar={false}>
                <SplitFormLayout sidebar={<RecordThreadPanel resourceKey={GEN_CASH_INFORMATION_THREAD_KEY} />}>
                    <GenCashInformationFormInner variant="edit" />
                </SplitFormLayout>
            </SimpleForm>
        </Edit>
    );
}
