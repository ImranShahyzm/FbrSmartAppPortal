import * as React from 'react';
import { Create, HttpError, SimpleForm, useNotify } from 'react-admin';
import { GlChartAccountFormInner } from './GlChartAccountFormInner';
import { transformGlChartAccountPayload } from './glChartAccountTransform';

export default function GlChartAccountCreate() {
    const notify = useNotify();
    return (
        <Create
            resource="glChartAccounts"
            title="Chart of accounts"
            actions={false}
            redirect="edit"
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
                    allowReconciliation: false,
                    companyIds: [],
                    mappingCodes: {},
                }}
            >
                <GlChartAccountFormInner mode="create" />
            </SimpleForm>
        </Create>
    );
}
