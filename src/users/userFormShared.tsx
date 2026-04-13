import * as React from 'react';
import {
    TextInput,
    BooleanInput,
    SelectInput,
    RadioButtonGroupInput,
    ReferenceInput,
    SelectArrayInput,
    required,
    useGetList,
} from 'react-admin';
import { Box, Card, CardContent, Divider, Grid, Tab, Tabs, Tooltip, Typography } from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import {
    CompactAutocompleteInput,
    CompactTextInput,
    FieldRow,
    UNDERLINE_FIELD_SX,
} from '../common/odooCompactFormFields';
import { UserProfileAvatarInput } from './UserProfileAvatarInput';
import {
    masterDetailPrimaryCardContentSx,
    masterDetailPrimaryCardSx,
    masterDetailTabbedCardContentSx,
    masterDetailTabbedCardSx,
    masterDetailTabsSx,
} from '../common/masterDetailFormTheme';

export const ROLE_CHOICES = [
    { id: 'Admin', name: 'Admin' },
    { id: 'User', name: 'User' },
];

export const LANGUAGE_CHOICES = [
    { id: 'en-US', name: 'English (US)' },
    { id: 'en-GB', name: 'English (UK)' },
    { id: 'ur', name: 'Urdu' },
];

export const TIMEZONE_CHOICES = [
    { id: 'Asia/Karachi', name: 'Asia/Karachi' },
    { id: 'UTC', name: 'UTC' },
    { id: 'Europe/Brussels', name: 'Europe/Brussels' },
    { id: 'Europe/London', name: 'Europe/London' },
    { id: 'America/New_York', name: 'America/New_York' },
    { id: 'Asia/Dubai', name: 'Asia/Dubai' },
];

export const CAL_PRIVACY_CHOICES = [
    { id: 'public', name: 'Public' },
    { id: 'private', name: 'Private' },
    { id: 'only_me', name: 'Only me' },
];

const ARRAY_SX = {
    ...UNDERLINE_FIELD_SX,
    '& .MuiFormGroup-root': { flexDirection: 'row', flexWrap: 'wrap', gap: 0.5 },
    '& .MuiFormControlLabel-root': { mr: 1, ml: 0 },
};

function LabelWithTip({ label, title }: { label: string; title: string }) {
    return (
        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
            {label}
            <Tooltip title={title} placement="right">
                <HelpOutlineIcon sx={{ fontSize: 14, color: 'action.active', cursor: 'help' }} />
            </Tooltip>
        </Box>
    );
}

function UserCompanyAccessFields() {
    const { data: companies, isLoading } = useGetList('companies', {
        pagination: { page: 1, perPage: 100 },
        sort: { field: 'id', order: 'ASC' },
    });
    const choices = React.useMemo(
        () => (companies ?? []).map((c: { id: number; title?: string }) => ({ id: c.id, name: c.title ?? `#${c.id}` })),
        [companies]
    );

    return (
        <>
            <Typography
                variant="overline"
                color="text.secondary"
                sx={{ fontSize: '0.7rem', display: 'block', mt: 0.5, mb: 0.5 }}
            >
                Multi companies
            </Typography>
            <Divider sx={{ mb: 1 }} />
            <FieldRow label="Allowed companies" alignItems="flex-start">
                <SelectArrayInput
                    source="allowedCompanyIds"
                    label={false}
                    choices={choices}
                    optionText="name"
                    optionValue="id"
                    disabled={isLoading}
                    sx={ARRAY_SX}
                />
            </FieldRow>
            <FieldRow label="Default company">
                <ReferenceInput source="defaultCompanyId" reference="companies" label={false}>
                    <CompactAutocompleteInput optionText="title" optionValue="id" label={false} fullWidth />
                </ReferenceInput>
            </FieldRow>
        </>
    );
}

function UserHeaderCard() {
    return (
        <Card variant="outlined" sx={masterDetailPrimaryCardSx}>
            <CardContent sx={masterDetailPrimaryCardContentSx}>
                <Grid container columnSpacing={3} alignItems="flex-start">
                    <Grid size={{ xs: 12, sm: 9 }}>
                        <FieldRow label="Name">
                            <CompactTextInput source="fullName" label={false} validate={required()} fullWidth />
                        </FieldRow>
                        <FieldRow
                            label={
                                <LabelWithTip
                                    label="Email address"
                                    title="Used for invitations and outbound email context."
                                />
                            }
                        >
                            <CompactTextInput source="email" label={false} fullWidth />
                        </FieldRow>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 3 }} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', sm: 'flex-end' } }}>
                        <UserProfileAvatarInput />
                    </Grid>
                </Grid>
            </CardContent>
        </Card>
    );
}

function UserTabPanels({ tab, mode }: { tab: number; mode: 'create' | 'edit' }) {
    return (
        <Box sx={{ pt: 1.5 }}>
            <Box sx={{ display: tab === 0 ? 'block' : 'none' }}>
                <UserCompanyAccessFields />
            </Box>
            <Box sx={{ display: tab === 1 ? 'block' : 'none' }}>
                <Typography
                    variant="overline"
                    color="text.secondary"
                    sx={{ fontSize: '0.7rem', display: 'block', mb: 0.5 }}
                >
                    Localization
                </Typography>
                <Divider sx={{ mb: 1 }} />
                <FieldRow
                    label={<LabelWithTip label="Language" title="Interface language for this user." />}
                >
                    <SelectInput
                        source="preferredLanguage"
                        label={false}
                        choices={LANGUAGE_CHOICES}
                        variant="standard"
                        margin="none"
                        size="small"
                        fullWidth
                        sx={{
                            ...UNDERLINE_FIELD_SX,
                            '& .MuiSelect-select': { py: '5px' },
                        }}
                    />
                </FieldRow>
                <FieldRow
                    label={
                        <LabelWithTip
                            label="Timezone"
                            title={"Used to display dates and deadlines in the user's local time."}
                        />
                    }
                >
                    <SelectInput
                        source="timeZoneId"
                        label={false}
                        choices={TIMEZONE_CHOICES}
                        variant="standard"
                        margin="none"
                        size="small"
                        fullWidth
                        sx={{
                            ...UNDERLINE_FIELD_SX,
                            '& .MuiSelect-select': { py: '5px' },
                        }}
                    />
                </FieldRow>
                <FieldRow label="Onboarding">
                    <BooleanInput
                        source="onboardingEnabled"
                        label={false}
                        sx={{
                            m: 0,
                            '& .MuiFormControlLabel-root': { ml: 0 },
                            '& .MuiSwitch-root': { ml: 0 },
                        }}
                    />
                </FieldRow>
                <FieldRow label="Message delivery" alignItems="flex-start">
                    <RadioButtonGroupInput
                        source="notificationChannel"
                        label={false}
                        row={false}
                        choices={[
                            { id: 'email', name: 'Handle by emails' },
                            { id: 'inApp', name: 'Handle in app' },
                        ]}
                        sx={{
                            '& .MuiFormControlLabel-root': { minHeight: 32 },
                            '& .MuiRadio-root': { py: 0.25 },
                        }}
                    />
                </FieldRow>
                <FieldRow label="Email signature" alignItems="flex-start">
                    <TextInput
                        source="emailSignature"
                        label={false}
                        multiline
                        minRows={2}
                        variant="standard"
                        margin="none"
                        size="small"
                        fullWidth
                        sx={UNDERLINE_FIELD_SX}
                    />
                </FieldRow>
                <FieldRow label="Calendar default privacy">
                    <SelectInput
                        source="calendarDefaultPrivacy"
                        label={false}
                        choices={CAL_PRIVACY_CHOICES}
                        variant="standard"
                        margin="none"
                        size="small"
                        fullWidth
                        sx={{
                            ...UNDERLINE_FIELD_SX,
                            '& .MuiSelect-select': { py: '5px' },
                        }}
                    />
                </FieldRow>
            </Box>
            <Box sx={{ display: tab === 2 ? 'block' : 'none' }}>
                <Typography
                    variant="overline"
                    color="text.secondary"
                    sx={{ fontSize: '0.7rem', display: 'block', mb: 0.5 }}
                >
                    Access
                </Typography>
                <Divider sx={{ mb: 1 }} />
                <FieldRow label="Username">
                    <CompactTextInput source="username" label={false} validate={required()} fullWidth />
                </FieldRow>
                {mode === 'create' ? (
                    <FieldRow label="Initial password">
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
                ) : null}
                <FieldRow label="Role">
                    <SelectInput
                        source="role"
                        label={false}
                        choices={ROLE_CHOICES}
                        variant="standard"
                        margin="none"
                        size="small"
                        fullWidth
                        sx={{
                            ...UNDERLINE_FIELD_SX,
                            '& .MuiSelect-select': { py: '5px' },
                        }}
                    />
                </FieldRow>
                <FieldRow label="Active">
                    <BooleanInput
                        source="isActive"
                        label={false}
                        sx={{
                            m: 0,
                            '& .MuiFormControlLabel-root': { ml: 0 },
                            '& .MuiSwitch-root': { ml: 0 },
                        }}
                    />
                </FieldRow>
            </Box>
        </Box>
    );
}

/** Single screen for create + edit: header card + tabbed sections. */
export function UserMainFormBlocks({ mode }: { mode: 'create' | 'edit' }) {
    const [tab, setTab] = React.useState(0);

    return (
        <>
            <UserHeaderCard />
            <Card variant="outlined" sx={masterDetailTabbedCardSx}>
                <CardContent sx={masterDetailTabbedCardContentSx}>
                    <Tabs
                        value={tab}
                        onChange={(_, v) => setTab(v)}
                        variant="scrollable"
                        scrollButtons="auto"
                        sx={masterDetailTabsSx}
                    >
                        <Tab label="Access rights" />
                        <Tab label="Preferences" />
                        <Tab label="Account security" />
                    </Tabs>
                    <UserTabPanels tab={tab} mode={mode} />
                </CardContent>
            </Card>
        </>
    );
}

/** Edit save: drop password field and only send new image when user picked a file. */
export function stripEphemeralUserFields(data: Record<string, unknown>): Record<string, unknown> {
    const o = { ...data };
    delete o.password;
    if (typeof o.profileImageBase64 !== 'string' || !o.profileImageBase64.startsWith('data:')) {
        delete o.profileImageBase64;
    }
    return o;
}

export function transformUserCreatePayload(data: Record<string, unknown>) {
    const { password, ...rest } = data;
    const o = { ...rest } as Record<string, unknown>;
    if (typeof o.profileImageBase64 !== 'string' || !o.profileImageBase64.startsWith('data:')) {
        delete o.profileImageBase64;
    }
    return { ...o, initialPassword: password };
}
