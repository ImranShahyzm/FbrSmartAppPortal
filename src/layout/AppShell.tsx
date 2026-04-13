import * as React from 'react';
import { Box } from '@mui/material';

import { SyncActiveAppFromPath } from '../apps/SyncActiveAppFromPath';
import AppBar from './AppBar';

export function AppShell(props: { children: React.ReactNode }) {
    return (
        <Box
            sx={{
                minHeight: '100dvh',
                height: '100dvh',
                display: 'flex',
                flexDirection: 'column',
                // Keep the app constrained to viewport; scrolling happens in the content area.
                overflow: 'hidden',
            }}
        >
            <AppBar />
            <Box
                sx={{
                    flex: 1,
                    minHeight: 0,
                    overflow: 'auto',
                    WebkitOverflowScrolling: 'touch',
                }}
            >
                <SyncActiveAppFromPath />
                {props.children}
            </Box>
        </Box>
    );
}

export default AppShell;
