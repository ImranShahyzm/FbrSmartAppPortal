import * as React from 'react';
import { Box, Typography } from '@mui/material';
import { Title, useTranslate } from 'react-admin';
import { Link } from 'react-router-dom';

import {
    SETTINGS_RECORD_RULE_FIELD_SETTINGS_PATH,
    SETTINGS_SECURITY_GROUPS_LIST_PATH,
} from '../apps/workspacePaths';

/**
 * Minimal home for the Settings workspace — no invoice widgets or demo dashboard content.
 */
export function SettingsDashboard() {
    const translate = useTranslate();
    return (
        <Box sx={{ p: 2, maxWidth: 720 }}>
            <Title title={translate('shell.settings.title', { _: 'Settings' })} />
            <Typography variant="h5" component="h1" gutterBottom>
                {translate('shell.settings.title', { _: 'Settings' })}
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
                {translate('shell.settings.dashboard_blurb', {
                    _: 'Configure security groups and access from the top navigation.',
                })}
            </Typography>
            <Typography variant="body2" component="div" sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Link to={SETTINGS_SECURITY_GROUPS_LIST_PATH}>
                    {translate('shell.settings.security_groups', { _: 'Security groups' })}
                </Link>
                <Link to={SETTINGS_RECORD_RULE_FIELD_SETTINGS_PATH}>
                    {translate('shell.settings.record_rule_fields', { _: 'Record rule fields (which columns to use)' })}
                </Link>
            </Typography>
        </Box>
    );
}

export default SettingsDashboard;
