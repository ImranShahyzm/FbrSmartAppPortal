import * as React from 'react';
import { BooleanInput, SelectInput, TextInput, required, useRecordContext, type Validator } from 'react-admin';
import { useWatch } from 'react-hook-form';
import { Avatar, Box, Card, CardContent, Divider, Grid, Tab, Tabs, Typography } from '@mui/material';
import { CompactSelectInput, CompactTextInput, FieldRow, UNDERLINE_FIELD_SX } from '../common/compactFormFields';
import { getInitials } from './getInitials';

export const ADMIN_ROLE_CHOICES = [
    { id: 'Admin', name: 'Admin' },
    { id: 'SuperAdmin', name: 'SuperAdmin' },
];

const CARD_SX = {
    mb: 1.5,
    width: '100%',
    borderColor: '#dee2e6',
    borderRadius: '4px',
    boxShadow: 'none',
} as const;

function AdminUserHeaderCard() {
    const record = useRecordContext<{ fullName?: string }>();
    const fullNameWatch = useWatch({ name: 'fullName' }) as string | undefined;
    const fullName = String(fullNameWatch ?? record?.fullName ?? '').trim();
    const initials = getInitials(fullName || undefined);

    return (
        <Card variant="outlined" sx={CARD_SX}>
            <CardContent sx={{ p: '16px 20px !important', width: '100%', boxSizing: 'border-box' }}>
                <Grid container columnSpacing={3} alignItems="flex-start">
                    <Grid size={{ xs: 12, sm: 9 }}>
                        <FieldRow label="Name">
                            <CompactTextInput source="fullName" label={false} validate={required()} fullWidth />
                        </FieldRow>
                        <FieldRow label="Email address">
                            <CompactTextInput source="email" label={false} validate={required()} fullWidth />
                        </FieldRow>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 3 }} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', sm: 'flex-end' } }}>
                        <Avatar
                            sx={{
                                width: 96,
                                height: 96,
                                fontSize: '1.75rem',
                                fontWeight: 700,
                                bgcolor: '#2a9d8f',
                            }}
                        >
                            {initials}
                        </Avatar>
                    </Grid>
                </Grid>
            </CardContent>
        </Card>
    );
}

const validateConfirmMatchesPassword: Validator = (value, allValues) => {
    if (String(value ?? '') !== String((allValues as { password?: string })?.password ?? '')) {
        return 'Passwords do not match';
    }
    return undefined;
};

const validateConfirmMatchesNewPassword: Validator = (value, allValues) => {
    const np = String((allValues as { newPassword?: string })?.newPassword ?? '').trim();
    if (!np) return undefined;
    if (String(value ?? '').trim() !== np) return 'Passwords do not match';
    return undefined;
};

function AccountSecurityFields({ mode }: { mode: 'create' | 'edit' }) {
    if (mode === 'create') {
        return (
            <>
                <FieldRow label="Password">
                    <TextInput
                        source="password"
                        label={false}
                        type="password"
                        validate={required()}
                        variant="standard"
                        margin="none"
                        size="small"
                        fullWidth
                        sx={UNDERLINE_FIELD_SX}
                    />
                </FieldRow>
                <FieldRow label="Confirm password">
                    <TextInput
                        source="confirmPassword"
                        label={false}
                        type="password"
                        validate={[required(), validateConfirmMatchesPassword]}
                        variant="standard"
                        margin="none"
                        size="small"
                        fullWidth
                        sx={UNDERLINE_FIELD_SX}
                    />
                </FieldRow>
            </>
        );
    }

    return (
        <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontSize: '0.8rem' }}>
                Leave blank to keep the current password.
            </Typography>
            <FieldRow label="New password">
                <TextInput
                    source="newPassword"
                    label={false}
                    type="password"
                    variant="standard"
                    margin="none"
                    size="small"
                    fullWidth
                    sx={UNDERLINE_FIELD_SX}
                />
            </FieldRow>
            <FieldRow label="Confirm new password">
                <TextInput
                    source="confirmPassword"
                    label={false}
                    type="password"
                    validate={validateConfirmMatchesNewPassword}
                    variant="standard"
                    margin="none"
                    size="small"
                    fullWidth
                    sx={UNDERLINE_FIELD_SX}
                />
            </FieldRow>
        </>
    );
}

function TabPanels({ tab, mode }: { tab: number; mode: 'create' | 'edit' }) {
    return (
        <Box sx={{ pt: 1.5 }}>
            <Box sx={{ display: tab === 0 ? 'block' : 'none' }}>
                <Typography
                    variant="overline"
                    color="text.secondary"
                    sx={{ fontSize: '0.7rem', display: 'block', mb: 0.5 }}
                >
                    Role & status
                </Typography>
                <Divider sx={{ mb: 1 }} />
                <FieldRow label="Role">
                    <CompactSelectInput source="role" label={false} choices={ADMIN_ROLE_CHOICES} fullWidth />
                </FieldRow>
                <FieldRow label="Active">
                    <BooleanInput source="isActive" label={false} />
                </FieldRow>
            </Box>
            <Box sx={{ display: tab === 1 ? 'block' : 'none' }}>
                <Typography
                    variant="overline"
                    color="text.secondary"
                    sx={{ fontSize: '0.7rem', display: 'block', mb: 0.5 }}
                >
                    Account security
                </Typography>
                <Divider sx={{ mb: 1 }} />
                <AccountSecurityFields mode={mode} />
            </Box>
        </Box>
    );
}

export function AdminUserMainFormBlocks({ mode }: { mode: 'create' | 'edit' }) {
    const [tab, setTab] = React.useState(0);

    return (
        <>
            <AdminUserHeaderCard />
            <Card variant="outlined" sx={{ ...CARD_SX, mb: 0 }}>
                <CardContent sx={{ p: '12px 16px 16px !important' }}>
                    <Tabs
                        value={tab}
                        onChange={(_, v) => setTab(v)}
                        variant="scrollable"
                        scrollButtons="auto"
                        sx={{
                            minHeight: 36,
                            '& .MuiTab-root': {
                                minHeight: 36,
                                py: 0.5,
                                textTransform: 'none',
                                fontWeight: 600,
                                fontSize: '0.8rem',
                            },
                        }}
                    >
                        <Tab label="Access rights" />
                        <Tab label="Account security" />
                    </Tabs>
                    <TabPanels tab={tab} mode={mode} />
                </CardContent>
            </Card>
        </>
    );
}

export function transformAdminUserCreatePayload(data: Record<string, unknown>) {
    return {
        email: data.email,
        fullName: data.fullName,
        role: data.role ?? 'Admin',
        isActive: data.isActive !== false,
        password: String(data.password ?? ''),
    };
}

export function transformAdminUserUpdate(data: Record<string, unknown>) {
    const o: Record<string, unknown> = {
        email: data.email,
        fullName: data.fullName,
        role: data.role,
        isActive: data.isActive,
    };
    const np = typeof data.newPassword === 'string' ? data.newPassword.trim() : '';
    if (np.length > 0) o.newPassword = np;
    return o;
}
