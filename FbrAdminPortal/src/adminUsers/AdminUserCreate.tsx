import * as React from 'react';
import { Create, SimpleForm } from 'react-admin';
import { Box, Divider, Typography } from '@mui/material';
import { FormSaveBridge, FORM_SAVE_ADMIN_USER } from '../common/formToolbar';
import { AdminUserFormToolbar } from './AdminUserFormToolbar';
import { AdminUserMainFormBlocks, transformAdminUserCreatePayload } from './adminUserFormShared';

export default function AdminUserCreate() {
    return (
        <Create
            title="Admin user"
            actions={false}
            transform={transformAdminUserCreatePayload}
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
                    role: 'Admin',
                    isActive: true,
                    password: '',
                    confirmPassword: '',
                }}
            >
                <FormSaveBridge eventName={FORM_SAVE_ADMIN_USER} />

                <Box
                    sx={{
                        position: { md: 'sticky' },
                        top: { md: 0 },
                        zIndex: 5,
                        bgcolor: 'background.paper',
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        px: 2,
                        py: '6px',
                        mb: 1.5,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 2,
                        flexWrap: 'wrap',
                    }}
                >
                    <Box sx={{ minWidth: 0 }}>
                        <Typography variant="subtitle2" fontWeight={700} noWrap sx={{ fontSize: '0.85rem' }}>
                            Admin user
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: '0.72rem' }}>
                            Saved to the admin portal database. Set the initial password under Account security.
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />
                        <AdminUserFormToolbar />
                    </Box>
                </Box>

                <AdminUserMainFormBlocks mode="create" />
            </SimpleForm>
        </Create>
    );
}
