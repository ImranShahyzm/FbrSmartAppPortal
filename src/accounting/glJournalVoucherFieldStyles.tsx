import * as React from 'react';
import { Box, Typography } from '@mui/material';

/** Match FbrInvoiceForm: bold compact labels + underline fields */
export const JV_FIELD_LABEL_SX = {
    fontWeight: 700,
    fontSize: '0.8rem',
    color: '#212529',
    minWidth: 140,
    lineHeight: '30px',
} as const;

export const JV_FIELD_VALUE_SX = {
    fontSize: '0.8rem',
    color: '#212529',
    lineHeight: '30px',
} as const;

export const JV_UNDERLINE_FIELD_SX = {
    mb: 0,
    '& .MuiFormHelperText-root': { display: 'none' },
    '& .MuiInputBase-root': { fontSize: '0.8rem', minHeight: 30 },
    '& .MuiInputBase-input': { py: '5px' },
    '& .MuiInputLabel-root': { display: 'none' },
} as const;

export function JournalFieldRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                minHeight: 34,
                mb: '4px',
            }}
        >
            <Typography sx={{ ...JV_FIELD_LABEL_SX }}>{label}</Typography>
            <Box sx={{ flex: 1, minWidth: 0, ...JV_FIELD_VALUE_SX }}>{children}</Box>
        </Box>
    );
}
