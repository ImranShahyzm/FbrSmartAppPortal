import * as React from 'react';
import { Create, HttpError, SimpleForm, useNotify, useRedirect } from 'react-admin';

import { apiFetch } from '../../api/httpClient';
import { GenCashInformationFormInner } from './GenCashInformationFormInner';

async function transformCashCreate(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    const newCode = String(data.newGlCode ?? '').trim();
    const newTitle = String(data.newGlTitle ?? '').trim();
    if (!newCode || !newTitle) {
        throw new Error(
            'Enter both chart code and chart name so a Bank and Cash GL account can be created.'
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
    const cashAccount = row.id != null ? Number(row.id) : null;
    if (cashAccount == null || !Number.isFinite(cashAccount) || cashAccount <= 0) {
        throw new Error('Could not read new chart account id from the server.');
    }
    return {
        accountTitle: data.accountTitle != null ? String(data.accountTitle) : '',
        cashAccount,
        userIds: Array.isArray(data.userIds) ? (data.userIds as unknown[]).map(x => String(x)) : [],
    };
}

export function GenCashInformationCreate() {
    const notify = useNotify();
    const redirect = useRedirect();
    return (
        <Create
            resource="genCashInformation"
            title="resources.genCashInformation.name"
            actions={false}
            transform={transformCashCreate}
            redirect={false}
            mutationOptions={{
                onSuccess: (data: { id?: string | number }) => {
                    if (data?.id != null) redirect('edit', 'genCashInformation', data.id);
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
                '& .RaCreate-main': { maxWidth: '100%', width: '100%' },
                '& .RaCreate-card': {
                    maxWidth: '100% !important',
                    width: '100%',
                    boxShadow: 'none',
                },
            }}
        >
            <SimpleForm
                sx={{ maxWidth: 'none', width: '100%' }}
                toolbar={false}
                defaultValues={{ userIds: [] }}
            >
                <GenCashInformationFormInner variant="create" />
            </SimpleForm>
        </Create>
    );
}
