import * as React from 'react';
import { Create, HttpError, SimpleForm, useNotify, useRedirect } from 'react-admin';

import { GlVoucherTypeFormInner } from './GlVoucherTypeFormInner';

function GlVoucherTypeCreateContent() {
    const notify = useNotify();
    const redirect = useRedirect();
    return (
        <Create
            resource="glVoucherTypes"
            title="resources.glVoucherTypes.name"
            actions={false}
            redirect={false}
            mutationOptions={{
                onSuccess: (data: { id?: string | number }) => {
                    if (data?.id != null) {
                        redirect('edit', 'glVoucherTypes', data.id);
                    }
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
                defaultValues={{
                    status: true,
                    systemType: 2,
                    showBankAndChequeDate: false,
                    showToPartyV: true,
                    interTransferPolicy: false,
                    showToAccountBook: true,
                    defaultControlGlAccountId: null,
                    controlAccountTxnNature: null,
                    defaultIncomeGlAccountId: null,
                    signatureSlotCount: null,
                    signatureName1: '',
                    signatureName2: '',
                    signatureName3: '',
                    signatureName4: '',
                    documentPrefix: '',
                }}
            >
                <GlVoucherTypeFormInner variant="create" />
            </SimpleForm>
        </Create>
    );
}

export default function GlVoucherTypeCreate() {
    return <GlVoucherTypeCreateContent />;
}
