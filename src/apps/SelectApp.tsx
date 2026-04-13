import * as React from 'react';
import { Box, Button, Paper, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useStore, useTranslate } from 'react-admin';

import { getIdentityCached } from '../api/tokenStorage';
import { ACTIVE_APP_STORE_KEY } from './activeAppStore';
import { APPS_REGISTRY, DEFAULT_ACTIVE_APP_ID, workspaceRootPath } from './appsRegistry';

/**
 * Shown when the user must pick an allowed workspace (no permissions, or invalid stored selection).
 */
export function SelectApp() {
    const translate = useTranslate();
    const navigate = useNavigate();
    const [, setActiveAppId] = useStore<string>(ACTIVE_APP_STORE_KEY, DEFAULT_ACTIVE_APP_ID);
    const identity = getIdentityCached();
    const allowed = new Set(identity?.apps ?? []);
    const apps = APPS_REGISTRY.filter(a => allowed.has(a.id));

    return (
        <Box sx={{ p: 3, maxWidth: 560, mx: 'auto', mt: 4 }}>
            <Typography variant="h5" gutterBottom>
                {translate('shell.select_app.title', { _: 'Select an application' })}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {translate('shell.select_app.subtitle', {
                    _: 'Choose a workspace you have access to.',
                })}
            </Typography>
            {apps.length === 0 ? (
                <Typography color="error">
                    {translate('shell.select_app.none', {
                        _: 'No applications are assigned to your account.',
                    })}
                </Typography>
            ) : (
                <Box sx={{ display: 'grid', gap: 1.5 }}>
                    {apps.map(app => (
                        <Paper key={app.id} sx={{ p: 2 }}>
                            <Typography variant="subtitle1" fontWeight={600}>
                                {app.name}
                            </Typography>
                            {app.description ? (
                                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                                    {app.description}
                                </Typography>
                            ) : null}
                            <Button
                                variant="contained"
                                size="small"
                                onClick={() => {
                                    setActiveAppId(app.id);
                                    navigate(workspaceRootPath(app.id), { replace: true });
                                }}
                            >
                                {translate('shell.select_app.open', { _: 'Open' })}
                            </Button>
                        </Paper>
                    ))}
                </Box>
            )}
        </Box>
    );
}

export default SelectApp;
