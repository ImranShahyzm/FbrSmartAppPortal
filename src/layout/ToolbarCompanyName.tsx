import * as React from 'react';
import { Typography, Box } from '@mui/material';
import { apiFetch } from '../api/httpClient';

/**
 * Company title beside user menu (Odoo-style right cluster). Logo is shown as the browser tab favicon only.
 */
export function ToolbarCompanyName() {
    const [title, setTitle] = React.useState<string | null>(null);

    React.useEffect(() => {
        let alive = true;
        apiFetch('/api/companies/my', { method: 'GET' })
            .then(async res => {
                if (!res.ok) return null;
                return (await res.json()) as { title?: string } | null;
            })
            .then(data => {
                if (!alive) return;
                if (data?.title) setTitle(data.title);
            })
            .catch(() => {});

        return () => {
            alive = false;
        };
    }, []);

    if (!title) return null;

    return (
        <Box
            sx={{
                maxWidth: { xs: 120, sm: 220, md: 280 },
                display: { xs: 'none', sm: 'block' },
                textAlign: 'right',
                px: 1,
            }}
        >
            <Typography
                variant="body2"
                sx={{
                    fontWeight: 600,
                    lineHeight: 1.2,
                    color: 'inherit',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                }}
            >
                {title}
            </Typography>
        </Box>
    );
}
