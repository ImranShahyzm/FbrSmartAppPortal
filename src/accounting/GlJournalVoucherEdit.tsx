import * as React from 'react';
import { Edit, HttpError, SimpleForm, useNotify } from 'react-admin';

import { GlJournalVoucherForm } from './GlJournalVoucherForm';
import { mapGlJournalVoucherToApiBody } from './glJournalVoucherTransform';

export default function GlJournalVoucherEdit() {
    const notify = useNotify();
    return (
        <Edit
            resource="glJournalVouchers"
            title="resources.glJournalVouchers.title"
            actions={false}
            mutationMode="pessimistic"
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
                '& .RaEdit-main': { maxWidth: '100%', width: '100%' },
                '& .RaEdit-card': {
                    maxWidth: '100% !important',
                    width: '100%',
                    boxShadow: 'none',
                },
            }}
        >
            <SimpleForm mode="onSubmit" sx={{ maxWidth: 'none', width: '100%' }} toolbar={false}>
                <GlJournalVoucherForm variant="edit" />
            </SimpleForm>
        </Edit>
    );
}
