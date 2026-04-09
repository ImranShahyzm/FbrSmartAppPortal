import * as React from 'react';
import { useWatch } from 'react-hook-form';
import { useGetOne } from 'react-admin';
import { Box, Typography } from '@mui/material';

/** Odoo-style address block under customer selector. */
export function CustomerInvoicePreview() {
    const customerPartyId = useWatch({ name: 'customerPartyId' }) as number | undefined;

    const { data, isPending } = useGetOne(
        'customers',
        { id: customerPartyId! },
        { enabled: customerPartyId != null && customerPartyId !== ('' as unknown as number) }
    );

    if (!customerPartyId || isPending || !data) {
        return (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, fontSize: '0.8rem' }}>
                —
            </Typography>
        );
    }

    const d = data as Record<string, unknown>;
    const name =
        (d.partyName as string) ||
        `${(d.first_name as string) || ''} ${(d.last_name as string) || ''}`.trim() ||
        '—';
    const addr =
        (d.addressOne as string) ||
        (d.address as string) ||
        '';
    const email = (d.email as string) || '';

    return (
        <Box
            sx={{
                mt: 1,
                p: 1.25,
                borderRadius: '4px',
                bgcolor: 'action.hover',
                border: '1px solid',
                borderColor: 'divider',
            }}
        >
            <Typography variant="subtitle2" fontWeight={700} sx={{ fontSize: '0.8rem' }}>
                {name}
            </Typography>
            {addr ? (
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                    {addr}
                </Typography>
            ) : null}
            {email ? (
                <Typography variant="body2" color="primary" sx={{ mt: 0.35, fontSize: '0.8rem' }}>
                    {email}
                </Typography>
            ) : null}
        </Box>
    );
}
