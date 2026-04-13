import * as React from 'react';
import { useFormContext } from 'react-hook-form';
import { BooleanInput, TextInput, useRecordContext } from 'react-admin';
import { Box, Card, CardContent, Divider, Tab, Tabs, Tooltip, Typography } from '@mui/material';

import { FormSaveBridge, FORM_SAVE_SECURITY_GROUP, FormHeaderToolbar } from '../common/formToolbar';
import {
    masterDetailPrimaryCardContentSx,
    masterDetailPrimaryCardSx,
    masterDetailTabbedCardContentSx,
    masterDetailTabbedCardSx,
    masterDetailTabsSx,
    stickySimpleFormHeaderBarSx,
} from '../common/masterDetailFormTheme';
import { SETTINGS_SECURITY_GROUPS_LIST_PATH } from '../apps/workspacePaths';
import {
    type AccessRightFormRow,
    catalogToAccessRights,
    fetchPermissionCatalog,
    mergeCatalogWithSaved,
} from './permissionCatalogApi';
import { SecurityGroupAccessRightsTabPanel } from './SecurityGroupAccessRightsTab';
import { SecurityGroupRecordRulesTabPanel } from './SecurityGroupRecordRulesTabPanel';
import { SecurityGroupMenusTabPanel, SecurityGroupUsersTabPanel } from './SecurityGroupUsersMenusTabs';

const BRAND = '#017E84';

const SG_TAB_LABELS = ['Users', 'Menus', 'Access Rights', 'Record Rules', 'Notes'] as const;

const validateRequired = (message = 'Required') => (v: unknown) =>
    v == null || (typeof v === 'string' && v.trim() === '') ? message : undefined;

type SecurityGroupFormVariant = 'create' | 'edit';

function AccessRightsCatalogSeed({ variant }: { variant: SecurityGroupFormVariant }) {
    const record = useRecordContext<{ id?: number; accessRights?: unknown[] }>();
    const { setValue, getValues } = useFormContext();
    const mergedEditIdRef = React.useRef<number | null>(null);

    React.useEffect(() => {
        let cancelled = false;
        (async () => {
            const editId = variant === 'edit' ? record?.id : undefined;
            try {
                if (variant === 'edit' && editId != null) {
                    if (mergedEditIdRef.current === editId) return;
                    mergedEditIdRef.current = editId;
                }
                const apps = await fetchPermissionCatalog();
                if (cancelled) return;
                const catalogRows = catalogToAccessRights(apps);
                if (variant === 'create') {
                    const cur = getValues('accessRights');
                    if (Array.isArray(cur) && cur.length > 0) return;
                    setValue('accessRights', catalogRows, { shouldDirty: false, shouldTouch: false });
                    return;
                }
                if (editId == null) return;
                const saved = Array.isArray(record?.accessRights) ? record.accessRights : [];
                const merged = mergeCatalogWithSaved(catalogRows, saved as AccessRightFormRow[]);
                setValue('accessRights', merged, { shouldDirty: false, shouldTouch: false });
            } catch {
                if (variant === 'edit' && editId != null) mergedEditIdRef.current = null;
            }
        })();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [variant, record?.id, getValues, setValue]);

    return null;
}

export function HelpIcon({ title }: { title?: string }) {
    const icon = (
        <Box
            component="span"
            sx={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 13,
                height: 13,
                borderRadius: '50%',
                border: `1px solid ${BRAND}`,
                color: BRAND,
                fontSize: '9px',
                fontWeight: 700,
                lineHeight: 1,
                ml: '4px',
                cursor: title ? 'help' : 'default',
                flexShrink: 0,
                verticalAlign: 'middle',
                userSelect: 'none',
            }}
        >
            ?
        </Box>
    );
    if (title) {
        return (
            <Tooltip title={title} enterDelay={250} placement="top" arrow>
                {icon}
            </Tooltip>
        );
    }
    return icon;
}

export function FieldRow({
    label,
    children,
    alignTop = false,
}: {
    label: React.ReactNode;
    children: React.ReactNode;
    alignTop?: boolean;
}) {
    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: alignTop ? 'flex-start' : 'center',
                minHeight: 34,
                py: '2px',
            }}
        >
            <Box
                sx={{
                    width: 210,
                    minWidth: 210,
                    flexShrink: 0,
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#1a1a1a',
                    pr: 1.5,
                    pt: alignTop ? '7px' : 0,
                    lineHeight: 1.4,
                    display: 'flex',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                }}
            >
                {label}
            </Box>
            <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center' }}>{children}</Box>
        </Box>
    );
}

/** Compact inline inputs inside security group forms (shared with tab panels). */
export const securityGroupSimpleFormFieldSx = {
    '& .MuiInputBase-root': {
        fontSize: 13,
        borderRadius: '2px',
        background: '#fff',
    },
    '& .MuiInputBase-input': {
        fontSize: 13,
        padding: '3px 8px',
        height: '22px',
        color: '#1a1a1a',
    },
    '& .MuiOutlinedInput-notchedOutline': {
        borderColor: '#d0d0d0',
        borderWidth: '1px !important',
    },
    '& .MuiInputBase-root:hover .MuiOutlinedInput-notchedOutline': {
        borderColor: '#aaa',
    },
    '& .MuiInputBase-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
        borderColor: `${BRAND} !important`,
        borderWidth: '1px !important',
    },
    '& .MuiInputBase-root.Mui-focused': {
        boxShadow: 'none',
    },
    '& .MuiInputBase-root.Mui-error .MuiOutlinedInput-notchedOutline': {
        borderColor: '#e57373 !important',
    },
    '& .MuiInputBase-root.Mui-error': {
        background: '#fff5f5',
    },
    '& .MuiFormLabel-root': { fontSize: 13, color: '#1a1a1a' },
    '& .MuiFormLabel-root.Mui-focused': { color: BRAND },
    '& .MuiFormLabel-root.Mui-error': { color: '#d32f2f' },
    '& .MuiFormHelperText-root': { fontSize: 11, marginLeft: 0, marginTop: '2px' },
    '& .MuiCheckbox-root': { padding: '3px', color: '#bbb' },
    '& .MuiCheckbox-root.Mui-checked': { color: BRAND },
    '& .MuiSwitch-switchBase.Mui-checked': { color: BRAND },
    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: BRAND },
    '& .MuiFormControlLabel-root': { marginLeft: 0 },
    '& .RaSimpleFormIterator-line': {
        borderBottom: '1px solid #f0f0f0',
        padding: '4px 0',
        gap: '6px',
    },
    '& .RaSimpleFormIterator-line:hover': { background: '#f9feff' },
    '& .RaSimpleFormIterator-add button': {
        color: BRAND,
        fontSize: 13,
        textTransform: 'none',
        fontWeight: 400,
    },
    '& .RaSimpleFormIterator-add button:hover': { background: '#e6f4f4' },
    '& .MuiChip-root': {
        height: 20,
        fontSize: 12,
        borderRadius: '2px',
        background: '#e6f4f4',
        color: '#015f63',
        border: '1px solid #b2d8da',
    },
    '& .MuiChip-deleteIcon': { color: '#015f63', fontSize: 14 },
    '& input[type=number]': { MozAppearance: 'textfield' },
    '& input[type=number]::-webkit-outer-spin-button': { WebkitAppearance: 'none' },
    '& input[type=number]::-webkit-inner-spin-button': { WebkitAppearance: 'none' },
} as const;

export type SecurityGroupFormProps = { variant: SecurityGroupFormVariant };

function SecurityGroupMasterFields() {
    return (
        <>
            <FieldRow label={<>Application <HelpIcon /></>}>
                <TextInput
                    source="applicationScope"
                    label={false}
                    helperText={false}
                    sx={{ m: 0, '& .MuiInputBase-root': { width: 300 } }}
                />
            </FieldRow>
            <FieldRow label={<>Name <HelpIcon /></>}>
                <TextInput
                    source="name"
                    label={false}
                    validate={validateRequired()}
                    helperText={false}
                    fullWidth
                    sx={{
                        m: 0,
                        width: '100%',
                        '& .MuiInputBase-root': { width: '100%' },
                    }}
                />
            </FieldRow>
            <FieldRow label={<>Share Group <HelpIcon /></>}>
                <BooleanInput source="shareGroup" label={false} helperText={false} sx={{ m: 0 }} />
            </FieldRow>
        </>
    );
}

function SecurityGroupTabPanels({ tab, variant }: { tab: number; variant: SecurityGroupFormVariant }) {
    return (
        <Box sx={{ pt: 1.5 }}>
            <Box sx={{ display: tab === 0 ? 'block' : 'none' }}>
                <SecurityGroupUsersTabPanel />
            </Box>

            <Box sx={{ display: tab === 1 ? 'block' : 'none' }}>
                <SecurityGroupMenusTabPanel />
            </Box>

            <Box sx={{ display: tab === 2 ? 'block' : 'none' }}>
                <AccessRightsCatalogSeed variant={variant} />
                <SecurityGroupAccessRightsTabPanel />
            </Box>

            <Box sx={{ display: tab === 3 ? 'block' : 'none' }}>
                <SecurityGroupRecordRulesTabPanel />
            </Box>

            <Box sx={{ display: tab === 4 ? 'block' : 'none' }}>
                <Box sx={{ p: 2, width: '100%' }}>
                    <TextInput
                        source="notes"
                        label={false}
                        fullWidth
                        multiline
                        rows={5}
                        helperText={false}
                        sx={{ m: 0, width: '100%' }}
                    />
                </Box>
            </Box>
        </Box>
    );
}

/**
 * Body for create/edit: must be rendered inside react-admin `SimpleForm` (toolbar false).
 * Master fields first, then tab strip and panels — same structure as {@link UserMainFormBlocks}.
 */
export function SecurityGroupForm({ variant }: SecurityGroupFormProps) {
    const [tab, setTab] = React.useState(0);

    return (
        <>
            <FormSaveBridge eventName={FORM_SAVE_SECURITY_GROUP} />

            <Box sx={stickySimpleFormHeaderBarSx}>
                <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle2" fontWeight={700} noWrap sx={{ fontSize: '0.85rem' }}>
                        Security group
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: '0.72rem' }}>
                        All changes are saved on the server.
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />
                    <FormHeaderToolbar
                        saveEventName={FORM_SAVE_SECURITY_GROUP}
                        resource="securityGroups"
                        listPath={SETTINGS_SECURITY_GROUPS_LIST_PATH}
                        showDelete={variant === 'edit'}
                    />
                </Box>
            </Box>

            <Card variant="outlined" sx={masterDetailPrimaryCardSx}>
                <CardContent sx={masterDetailPrimaryCardContentSx}>
                    <SecurityGroupMasterFields />
                </CardContent>
            </Card>

            <Card variant="outlined" sx={masterDetailTabbedCardSx}>
                <CardContent sx={masterDetailTabbedCardContentSx}>
                    <Tabs
                        value={tab}
                        onChange={(_, v) => setTab(v)}
                        variant="scrollable"
                        scrollButtons="auto"
                        sx={masterDetailTabsSx}
                    >
                        {SG_TAB_LABELS.map(label => (
                            <Tab key={label} label={label} />
                        ))}
                    </Tabs>
                    <SecurityGroupTabPanels tab={tab} variant={variant} />
                </CardContent>
            </Card>
        </>
    );
}
