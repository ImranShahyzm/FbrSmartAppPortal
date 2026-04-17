import * as React from 'react';
import { Create, HttpError, SimpleForm, useNotify, useRedirect } from 'react-admin';

import { apiFetch } from '../../api/httpClient';
import { mapCheckBooksToApi } from './checkBookPayload';
import { OdooSplitFormLayout } from '../../common/layout/OdooSplitFormLayout';
import { GenBankInformationFormInner } from './GenBankInformationFormInner';

async function transformBankCreate(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    const newCode = String(data.newGlCode ?? '').trim();
    const newTitle = String(data.newGlTitle ?? '').trim();
    if (!newCode || !newTitle) {
        throw new Error(
            'Enter both chart code and chart name so a Bank and Cash GL account (type 9) can be created.'
        );
    }
    const res = await apiFetch(
        '/api/glChartAccounts',
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                glCode: newCode,
                glTitle: newTitle,
                glType: 9,
                allowReconciliation: false,
            }),
        },
        { auth: true, retryOn401: true }
    );
    if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(j.message ?? 'Failed to create GL account');
    }
    const row = (await res.json()) as { id?: number };
    const glcaId = row.id != null ? Number(row.id) : null;
    if (glcaId == null || !Number.isFinite(glcaId) || glcaId <= 0) {
        throw new Error('Could not read new chart account id from the server.');
    }
    const checkBooks = mapCheckBooksToApi(data);
    return {
        bankAccountTitle: data.bankAccountTitle != null ? String(data.bankAccountTitle) : '',
        glcaId,
        bankAccountNumber: data.bankAccountNumber != null ? String(data.bankAccountNumber) : '',
        bankName: data.bankName != null ? String(data.bankName) : '',
        bankBranchCode: data.bankBranchCode != null ? String(data.bankBranchCode) : '',
        bankAddress: data.bankAddress != null ? String(data.bankAddress) : '',
        validateChequeBook: Boolean(data.validateChequeBook),
        checkBooks,
    };
}

export function GenBankInformationCreate() {
    const notify = useNotify();
    const redirect = useRedirect();
    return (
        <Create
            resource="genBankInformation"
            title="resources.genBankInformation.name"
            actions={false}
            transform={transformBankCreate}
            redirect={false}
            mutationOptions={{
                onSuccess: (data: { id?: string | number }) => {
                    if (data?.id != null) redirect('edit', 'genBankInformation', data.id);
                },
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
                '& .RaCreate-main': { maxWidth: '100%', width: '100%', p: 0, pt: 0, mt: 0 },
                '& .RaCreate-content': { p: 0, pt: 0, mt: 0 },
                '& .RaCreate-card': {
                    maxWidth: '100% !important',
                    width: '100%',
                    m: 0,
                    boxShadow: 'none',
                },
            }}
        >
            <SimpleForm
                sx={{ maxWidth: 'none', width: '100%', p: 0, pt: 0, mt: 0 }}
                toolbar={false}
                defaultValues={{ checkBooks: [], validateChequeBook: false }}
            >
                <OdooSplitFormLayout>
                    <GenBankInformationFormInner variant="create" />
                </OdooSplitFormLayout>
            </SimpleForm>
        </Create>
    );
}
