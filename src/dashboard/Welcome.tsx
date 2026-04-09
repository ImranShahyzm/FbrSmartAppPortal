import * as React from 'react';
import { Box, Card, Typography } from '@mui/material';

import publishArticleSvg from './fbr_welcome.svg?raw';

const Welcome = () => {
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
            <Box
                sx={{
                    display: 'flex',
                }}
            >
                <Box
                    sx={{
                        flex: '1',
                    }}
                >
                        <Typography variant="h5" component="h2" gutterBottom fontWeight={800}>
                            Welcome to the FBR Smart Application — a secure and efficient way to integrate your invoices with FBR.
                        </Typography>
                    <Box
                        sx={{
                            maxWidth: '40em',
                        }}
                    >
                        <Typography variant="body1" component="p" gutterBottom>
                                Powered by Corbis Soft, this application enables you to seamlessly send and share your invoices with FBR and your customers.
                        </Typography>
                            <Typography variant="body1" component="p" gutterBottom>
                                This platform is designed to simplify invoice management, ensure compliance, and provide a smooth user experience for handling your business transactions.
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
                        // Vite serves SVG URLs fine normally, but some setups break SVG-as-img.
                        // Rendering inline avoids asset URL/mime/CSP issues.
                        dangerouslySetInnerHTML={{ __html: publishArticleSvg }}
                    />
                </Box>
            </Box>
        </Card>
    );
};

export default Welcome;
