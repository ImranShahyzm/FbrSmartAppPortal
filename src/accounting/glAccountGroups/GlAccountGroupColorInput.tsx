import * as React from 'react';
import { useInput, type Validator } from 'react-admin';
import { Box, TextField, Typography } from '@mui/material';

import { UNDERLINE_FIELD_SX } from '../../common/odooCompactFormFields';

type Props = {
    source: string;
    disabled?: boolean;
    validate?: Validator | Validator[];
};

export function GlAccountGroupColorInput(props: Props) {
    const { source, disabled, validate } = props;
    const {
        field: { value, onChange },
        fieldState: { invalid, error },
    } = useInput({ source, validate, disabled });

    const hex = typeof value === 'string' ? value : String(value ?? '');
    const safeHex = /^#[0-9A-Fa-f]{6}$/.test(hex) ? hex : '#000000';

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
            <Box
                component="input"
                type="color"
                disabled={disabled}
                value={safeHex}
                onChange={e => onChange(e.target.value)}
                style={{
                    width: 38,
                    height: 28,
                    padding: 0,
                    border: '1px solid rgba(0,0,0,0.15)',
                    borderRadius: 4,
                    background: 'transparent',
                    cursor: disabled ? 'default' : 'pointer',
                }}
            />
            <TextField
                disabled={disabled}
                variant="standard"
                fullWidth
                size="small"
                value={hex}
                onChange={e => onChange(e.target.value)}
                error={invalid}
                placeholder="#RRGGBB"
                sx={UNDERLINE_FIELD_SX}
            />
            <Box
                sx={{
                    width: 14,
                    height: 14,
                    borderRadius: '3px',
                    bgcolor: safeHex,
                    border: '1px solid',
                    borderColor: 'divider',
                    flex: '0 0 auto',
                }}
            />
            {invalid && error?.message ? (
                <Typography variant="caption" color="error" sx={{ ml: 1, whiteSpace: 'nowrap' }}>
                    {String(error.message)}
                </Typography>
            ) : null}
        </Box>
    );
}

