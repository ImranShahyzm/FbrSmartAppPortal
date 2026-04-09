import * as React from 'react';
import { Box, Card, Typography } from '@mui/material';

import publishArticleSvg from './fbr_welcome.svg?raw';

export default function AdminWelcome({ totalCompanies }: { totalCompanies: number }) {
    return (
        <Card
            sx={{
                background: theme =>
                    `linear-gradient(45deg, ${theme.palette.secondary.dark} 0%, ${theme.palette.secondary.light} 50%, ${theme.palette.primary.dark} 100%)`,
                color: theme => theme.palette.primary.contrastText,
                padding: '20px',
                marginTop: 2,
                marginBottom: '1em',
            }}
        >
            <Box sx={{ display: 'flex' }}>
                <Box sx={{ flex: '1' }}>
                    <Typography variant="h5" component="h2" gutterBottom fontWeight={800}>
                        FBR Admin Portal — company onboarding, activation, and billing.
                    </Typography>
                    <Box sx={{ maxWidth: '40em' }}>
                        <Typography variant="body1" component="p" gutterBottom>
                            Monitor all registered tenants from one place. You are managing{' '}
                            <strong>{totalCompanies}</strong> compan{totalCompanies === 1 ? 'y' : 'ies'}.
                        </Typography>
                        <Typography variant="body1" component="p" gutterBottom>
                            Use the KPIs below for a quick snapshot; open Companies for full lists, edits, and the
                            activity log.
                        </Typography>
                    </Box>
                </Box>
                <Box
                    sx={{
                        display: { xs: 'none', sm: 'none', md: 'flex' },
                        width: '16em',
                        height: '9em',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        marginLeft: 'auto',
                    }}
                >
                    <Box
                        aria-label="FBR"
                        sx={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            '& svg': {
                                width: '100%',
                                height: '100%',
                            },
                            filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.18))',
                        }}
                        dangerouslySetInnerHTML={{ __html: publishArticleSvg }}
                    />
                </Box>
            </Box>
        </Card>
    );
}
