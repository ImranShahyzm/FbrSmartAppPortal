import * as React from 'react';
import { Create, HttpError, SimpleForm, useNotify } from 'react-admin';
import { useLocation } from 'react-router-dom';

import { GlJournalVoucherForm } from './GlJournalVoucherForm';
import type { JournalDuplicateState } from './glJournalVoucherDuplicate';
import { emptyGlJournalLine } from './GlJournalVoucherLinesGrid';
import { mapGlJournalVoucherToApiBody } from './glJournalVoucherTransform';

function mergeDuplicateDefaults(dup: JournalDuplicateState | undefined): Record<string, unknown> {
    if (!dup) return {};
    const raw = dup.voucherDate;
    const voucherDate =
        raw instanceof Date ? raw : raw != null ? new Date(String(raw)) : new Date();
    const lines =
        dup.lines && dup.lines.length > 0 ? dup.lines : [emptyGlJournalLine(), emptyGlJournalLine()];
    return {
        voucherTypeId: dup.voucherTypeId,
        voucherDate: Number.isNaN(voucherDate.getTime()) ? new Date() : voucherDate,
        remarks: dup.remarks,
        manualNo: dup.manualNo,
        lines,
    };
}

export default function GlJournalVoucherCreate() {
    const notify = useNotify();
    const location = useLocation();
    const duplicateDefaults = (location.state as { duplicateDefaults?: JournalDuplicateState } | null)
        ?.duplicateDefaults;

    const defaultValues = React.useMemo(
        () => ({
            voucherDate: new Date(),
            remarks: '',
            manualNo: '',
            lines: [emptyGlJournalLine(), emptyGlJournalLine()],
            ...mergeDuplicateDefaults(duplicateDefaults),
        }),
        [duplicateDefaults, location.key]
    );

    return (
        <Create
            key={location.key}
            resource="glJournalVouchers"
            title="resources.glJournalVouchers.create_title"
            actions={false}
            redirect="edit"
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
                '& .RaCreate-main': { maxWidth: '100%', width: '100%' },
                '& .RaCreate-card': {
                    maxWidth: '100% !important',
                    width: '100%',
                    boxShadow: 'none',
                },
            }}
        >
            <SimpleForm
                mode="onSubmit"
                sx={{ maxWidth: 'none', width: '100%' }}
                toolbar={false}
                defaultValues={defaultValues}
            >
                <GlJournalVoucherForm variant="create" />
            </SimpleForm>
        </Create>
    );
}
