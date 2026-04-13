import * as React from 'react';
import { useTranslate } from 'react-admin';
import { Navigate } from 'react-router-dom';
import { Box, Paper, Typography } from '@mui/material';

import { ACCOUNTING_SUITE_APP_ID } from '../../apps/appsRegistry';
import { useCanAccess } from '../../auth/useCanAccess';

export function GeneralLedgerPlaceholderPage() {
    const translate = useTranslate();
    const canRead = useCanAccess(ACCOUNTING_SUITE_APP_ID, 'accountingReports', 'read');

    if (!canRead) {
        return <Navigate to="/" replace />;
    }

    return (
        <Box sx={{ p: 3, maxWidth: 720, mx: 'auto' }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                {translate('shell.accounting.general_ledger')}
            </Typography>
            <Paper variant="outlined" sx={{ p: 3 }}>
                <Typography color="text.secondary">
                    {translate('shell.accounting.general_ledger_coming_soon', {
                        _: 'General ledger report is coming soon.',
                    })}
                </Typography>
            </Paper>
        </Box>
    );
}
