import * as React from 'react';
import { Edit, HttpError, SimpleForm, useNotify } from 'react-admin';

import { SplitFormLayout } from '../common/layout/SplitFormLayout';
import { RecordThreadPanel } from '../common/recordThread';
import { GlVoucherTypeFormInner } from './GlVoucherTypeFormInner';

const GL_VOUCHER_TYPES_THREAD_KEY = 'glVoucherTypes';

export default function GlVoucherTypeEdit() {
    const notify = useNotify();
    return (
        <Edit
            resource="glVoucherTypes"
            title="resources.glVoucherTypes.name"
            actions={false}
            mutationMode="pessimistic"
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
                <SplitFormLayout
                    sidebar={<RecordThreadPanel resourceKey={GL_VOUCHER_TYPES_THREAD_KEY} />}
                >
                    <GlVoucherTypeFormInner variant="edit" />
                </SplitFormLayout>
            </SimpleForm>
        </Edit>
    );
}
