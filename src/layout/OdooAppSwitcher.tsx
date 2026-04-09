import * as React from 'react';
import {
    IconButton,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    Paper,
    Typography,
    Box,
} from '@mui/material';
import { useStore, useTranslate } from 'react-admin';
import { IoAppsOutline } from 'react-icons/io5';

import { APPS_REGISTRY, DEFAULT_ACTIVE_APP_ID } from '../apps/appsRegistry';
import { STORE_KEY_ACTIVE_APP } from '../apps/activeAppStore';

/**
 * Odoo-style 3×3 app grid launcher (opens app picker dialog).
 */
export function OdooAppSwitcher() {
    const [open, setOpen] = React.useState(false);
    const translate = useTranslate();
    const [activeAppId, setActiveAppId] = useStore<string>(
        STORE_KEY_ACTIVE_APP,
        DEFAULT_ACTIVE_APP_ID
    );

    const selectApp = (id: string, disabled?: boolean) => {
        if (disabled) return;
        setActiveAppId(id);
        setOpen(false);
    };

    return (
        <>
            <Tooltip title={translate('pos.odoo.apps', { _: 'Apps' })} enterDelay={400}>
                <IconButton
                    color="inherit"
                    onClick={() => setOpen(true)}
                    aria-label="Apps"
                    size="small"
                    sx={{ mr: 0.5 }}
                >
                    <IoAppsOutline size={22} style={{ display: 'block' }} />
                </IconButton>
            </Tooltip>
            <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>{translate('pos.odoo.all_apps', { _: 'All apps' })}</DialogTitle>
                <DialogContent>
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)' },
                            gap: 2,
                            pt: 1,
                            pb: 2,
                        }}
                    >
                        {APPS_REGISTRY.map(app => (
                            <Paper
                                key={app.id}
                                elevation={activeAppId === app.id ? 4 : 1}
                                onClick={() => selectApp(app.id, app.disabled)}
                                sx={{
                                    p: 2,
                                    cursor: app.disabled ? 'default' : 'pointer',
                                    opacity: app.disabled ? 0.55 : 1,
                                    borderTop: 4,
                                    borderColor: app.accentColor ?? 'primary.main',
                                    height: '100%',
                                    '&:hover': {
                                        bgcolor: app.disabled ? undefined : 'action.hover',
                                    },
                                }}
                            >
                                <Typography variant="subtitle2" fontWeight={700}>
                                    {app.name}
                                </Typography>
                                {app.description ? (
                                    <Typography variant="caption" color="text.secondary">
                                        {app.description}
                                    </Typography>
                                ) : null}
                                {app.disabled ? (
                                    <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                                        {translate('pos.odoo.soon', { _: 'Coming soon' })}
                                    </Typography>
                                ) : null}
                            </Paper>
                        ))}
                    </Box>
                </DialogContent>
            </Dialog>
        </>
    );
}
