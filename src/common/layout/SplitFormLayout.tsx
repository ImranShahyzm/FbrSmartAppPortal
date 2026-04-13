import * as React from 'react';
import { Box, type SxProps, type Theme } from '@mui/material';

type SplitFormLayoutProps = {
    children: React.ReactNode;
    /** Optional right column (e.g. record thread). Omit for full-width main content. */
    sidebar?: React.ReactNode;
    mainColumnSx?: SxProps<Theme>;
};

/**
 * Two-column form layout: main content + optional side panel.
 * Desktop: ~68% / ~30%; mobile: stacked.
 */
export function SplitFormLayout({ children, sidebar, mainColumnSx }: SplitFormLayoutProps) {
    if (sidebar == null) {
        return <Box sx={{ width: '100%', maxWidth: '100%' }}>{children}</Box>;
    }

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                alignItems: { xs: 'stretch', md: 'flex-start' },
                gap: 2,
                width: '100%',
                maxWidth: '100%',
                minHeight: { md: 'calc(100vh - 120px)' },
            }}
        >
            <Box
                sx={{
                    flex: { md: '1 1 68%' },
                    minWidth: 0,
                    width: { xs: '100%', md: 'auto' },
                    ...(mainColumnSx as object),
                }}
            >
                {children}
            </Box>
            <Box
                sx={{
                    flex: { md: '0 0 30%' },
                    width: { xs: '100%', md: 'auto' },
                    maxWidth: { md: 420 },
                    minWidth: { md: 280 },
                    alignSelf: { md: 'stretch' },
                }}
            >
                {sidebar}
            </Box>
        </Box>
    );
}
