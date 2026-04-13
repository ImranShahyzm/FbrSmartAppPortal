import * as React from 'react';
import { Edit, HttpError, SimpleForm, useNotify, useRecordContext } from 'react-admin';
import { GlChartAccountFormInner } from './GlChartAccountFormInner';
import { transformGlChartAccountPayload } from './glChartAccountTransform';

function GlChartAccountEditForm() {
    const record = useRecordContext<{ readOnly?: boolean }>();
    return <GlChartAccountFormInner mode="edit" recordReadOnly={Boolean(record?.readOnly)} />;
}

export default function GlChartAccountEdit() {
    const notify = useNotify();
    return (
        <Edit
            resource="glChartAccounts"
            title="Chart of accounts"
            actions={false}
            mutationMode="pessimistic"
            transform={data => transformGlChartAccountPayload(data as Record<string, unknown>)}
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
                <GlChartAccountEditForm />
            </SimpleForm>
        </Edit>
    );
}
