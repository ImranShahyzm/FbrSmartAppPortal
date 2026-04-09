import * as React from 'react';
import { Notification } from 'react-admin';

/**
 * Global toast: top-right (Odoo-style placement), below the app bar.
 * Card-style body with a colored left stripe per severity.
 */
export const AppNotification = () => (
    <Notification
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        sx={theme => ({
            '&.MuiSnackbar-root': {
                top: { xs: 56, sm: 72 },
                right: { xs: 8, sm: 16 },
            },
            '& .RaNotification-error': {
                backgroundColor: theme.palette.background.paper,
                color: theme.palette.text.primary,
                borderLeft: `4px solid ${theme.palette.error.main}`,
                boxShadow: theme.shadows[3],
                minWidth: { xs: 260, sm: 280 },
            },
            '& .RaNotification-success': {
                backgroundColor: theme.palette.background.paper,
                color: theme.palette.text.primary,
                borderLeft: `4px solid ${theme.palette.success.main}`,
                boxShadow: theme.shadows[3],
                minWidth: { xs: 260, sm: 280 },
            },
            '& .RaNotification-warning': {
                backgroundColor: theme.palette.background.paper,
                color: theme.palette.text.primary,
                borderLeft: `4px solid ${theme.palette.warning.main}`,
                boxShadow: theme.shadows[3],
                minWidth: { xs: 260, sm: 280 },
            },
        })}
    />
);
