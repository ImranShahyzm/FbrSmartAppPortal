import * as React from 'react';
import { PrevNextButtons, required, useRecordContext, useTranslate } from 'react-admin';
import { Box, Card, CardContent, Divider, Typography } from '@mui/material';
import { useWatch } from 'react-hook-form';

import { FormHeaderToolbar, FormSaveBridge, FORM_SAVE_GL_ACCOUNT_GROUP } from '../../common/formToolbar';
import { stickySimpleFormHeaderBarSx } from '../../common/masterDetailFormTheme';
import { CompactNumberInput, CompactTextInput, FieldRow } from '../../common/odooCompactFormFields';
import { GlAccountGroupColorInput } from './GlAccountGroupColorInput';
import { GlAccountGroupParentInput } from './GlAccountGroupParentInput';

const CARD_SX = {
    borderRadius: 1,
    borderColor: 'divider',
    bgcolor: 'background.paper',
    boxShadow: 'none',
} as const;

export function GlAccountGroupFormInner({ variant }: { variant: 'create' | 'edit' }) {
    const translate = useTranslate();
    const record = useRecordContext();
    const id = record?.id != null ? Number(record.id) : null;

    const fromCode = useWatch({ name: 'fromCode' });
    const toCode = useWatch({ name: 'toCode' });

    const validateRange = React.useCallback(
        (value: unknown) => {
            const f = Number(fromCode);
            const t = Number(toCode);
            if (!Number.isFinite(f) || !Number.isFinite(t)) return undefined;
            if (f >= t) return 'From code must be less than To code.';
            return undefined;
        },
        [fromCode, toCode]
    );

    const validateHex = React.useCallback((value: unknown) => {
        const s = String(value ?? '').trim();
        if (!s) return 'Color is required.';
        if (!/^#[0-9A-Fa-f]{6}$/.test(s)) return 'Color must be a valid HEX value like #FF5733.';
        return undefined;
    }, []);

    return (
        <>
            <FormSaveBridge eventName={FORM_SAVE_GL_ACCOUNT_GROUP} />

            <Box sx={stickySimpleFormHeaderBarSx}>
                <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle2" fontWeight={700} noWrap sx={{ fontSize: '0.85rem' }}>
                        {translate('resources.glAccountGroups.name', { smart_count: 1, _: 'Account Groups' })}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: '0.72rem' }}>
                        {translate('shell.accounting.account_groups_subtitle', {
                            _: 'Hierarchical grouping by account code range (with reporting color).',
                        })}
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    {variant === 'edit' ? (
                        <>
                            <PrevNextButtons resource="glAccountGroups" sort={{ field: 'id', order: 'DESC' }} />
                            <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />
                        </>
                    ) : null}
                    <FormHeaderToolbar
                        saveEventName={FORM_SAVE_GL_ACCOUNT_GROUP}
                        resource="glAccountGroups"
                        listPath="/glAccountGroups"
                        showDelete={variant === 'edit'}
                    />
                </Box>
            </Box>

            <Card variant="outlined" sx={CARD_SX}>
                <CardContent sx={{ p: '16px 20px !important' }}>
                    <FieldRow label="Group name">
                        <CompactTextInput source="groupName" label={false} validate={[required()]} />
                    </FieldRow>
                    <FieldRow label="From code">
                        <CompactNumberInput
                            source="fromCode"
                            label={false}
                            validate={[required(), validateRange]}
                            sx={{ maxWidth: 280 }}
                        />
                    </FieldRow>
                    <FieldRow label="To code">
                        <CompactNumberInput
                            source="toCode"
                            label={false}
                            validate={[required(), validateRange]}
                            sx={{ maxWidth: 280 }}
                        />
                    </FieldRow>
                    <FieldRow label="Parent group">
                        <GlAccountGroupParentInput source="parentGroupId" excludeId={id} />
                    </FieldRow>
                    <FieldRow label="Color">
                        <GlAccountGroupColorInput source="colorHex" validate={[required(), validateHex]} />
                    </FieldRow>
                </CardContent>
            </Card>
        </>
    );
}

