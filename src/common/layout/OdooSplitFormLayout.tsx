import * as React from 'react';
import { Box, type SxProps, type Theme } from '@mui/material';

type OdooSplitFormLayoutProps = {
    children: React.ReactNode;
    /** Right column (e.g. chatter). Omit for full-width main content. */
    sidebar?: React.ReactNode;
    /** Extra styles for the main column when `sidebar` is set (e.g. scroll). */
    mainColumnSx?: SxProps<Theme>;
};

/**
 * Odoo-like split: main ~68% + side ~30% on desktop; stacked on mobile.
 * Used by product registration, company edit (with chatter), and as full-width wrapper when no sidebar.
 */
export function OdooSplitFormLayout({ children, sidebar, mainColumnSx }: OdooSplitFormLayoutProps) {
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
