import * as React from 'react';
import { Create, HttpError, SimpleForm, useNotify, useRedirect } from 'react-admin';

import { GlAccountGroupFormInner } from './GlAccountGroupFormInner';

export default function GlAccountGroupCreate() {
    const notify = useNotify();
    const redirect = useRedirect();
    return (
        <Create
            resource="glAccountGroups"
            title="resources.glAccountGroups.name"
            actions={false}
            redirect={false}
            mutationOptions={{
                onSuccess: (data: { id?: string | number }) => {
                    if (data?.id != null) redirect('edit', 'glAccountGroups', data.id);
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
                '& .RaCreate-card': { maxWidth: '100% !important', width: '100%', boxShadow: 'none' },
            }}
        >
            <SimpleForm
                sx={{ maxWidth: 'none', width: '100%' }}
                toolbar={false}
                defaultValues={{
                    groupName: '',
                    fromCode: null,
                    toCode: null,
                    parentGroupId: null,
                    colorHex: '#3d7a7a',
                }}
            >
                <GlAccountGroupFormInner variant="create" />
            </SimpleForm>
        </Create>
    );
}

