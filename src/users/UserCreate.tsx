import * as React from 'react';
import { Create, SimpleForm, useGetIdentity, Loading } from 'react-admin';
import { Box, Divider, Typography } from '@mui/material';
import { FormSaveBridge, FORM_SAVE_USER } from '../common/formToolbar';
import { UserFormToolbar } from './UserFormToolbar';
import { stickySimpleFormHeaderBarSx } from '../common/masterDetailFormTheme';
import { UserMainFormBlocks, transformUserCreatePayload } from './userFormShared';

export default function UserCreate() {
    const { identity, isLoading } = useGetIdentity();

    if (isLoading || identity?.companyId == null) {
        return <Loading />;
    }

    const cid = identity.companyId;

    return (
        <Create
            title="User"
            actions={false}
            transform={transformUserCreatePayload}
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
                    allowedCompanyIds: [cid],
                    defaultCompanyId: cid,
                    role: 'User',
                    isActive: true,
                    preferredLanguage: 'en-US',
                    timeZoneId: 'Asia/Karachi',
                    calendarDefaultPrivacy: 'public',
                    notificationChannel: 'email',
                    onboardingEnabled: false,
                    profileImageBase64: '',
                }}
            >
                <FormSaveBridge eventName={FORM_SAVE_USER} />

                <Box sx={stickySimpleFormHeaderBarSx}>
                    <Box sx={{ minWidth: 0 }}>
                        <Typography variant="subtitle2" fontWeight={700} noWrap sx={{ fontSize: '0.85rem' }}>
                            User
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: '0.72rem' }}>
                            All changes are saved on the server. Set the initial password under Account security.
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />
                        <UserFormToolbar />
                    </Box>
                </Box>

                <UserMainFormBlocks mode="create" />
            </SimpleForm>
        </Create>
    );
}
