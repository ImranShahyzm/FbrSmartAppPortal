import * as React from 'react';
import { Box, Typography } from '@mui/material';
import { AutocompleteInput, NumberInput, SelectInput, TextInput } from 'react-admin';

export const FIELD_LABEL_SX = {
    fontWeight: 700,
    fontSize: '0.8rem',
    color: '#212529',
    minWidth: 140,
    lineHeight: '30px',
};

export const FIELD_VALUE_SX = {
    fontSize: '0.8rem',
    color: '#212529',
    lineHeight: '30px',
};

export const UNDERLINE_FIELD_SX = {
    mb: 0,
    '& .MuiFormHelperText-root': { display: 'none' },
    '& .MuiInputBase-root': { fontSize: '0.8rem', minHeight: 30 },
    '& .MuiInputBase-input': { py: '5px' },
    '& .MuiInputLabel-root': { display: 'none' },
};

const FIELD_LABEL_COL_PX = 220;

export function FieldRow({
    label,
    children,
    alignItems = 'center',
}: {
    label: React.ReactNode;
    children: React.ReactNode;
    alignItems?: 'center' | 'flex-start';
}) {
    return (
        <Box sx={{ display: 'flex', alignItems, minHeight: 34, mb: '4px' }}>
            <Typography
                component="div"
                sx={{
                    ...FIELD_LABEL_SX,
                    flex: `0 0 ${FIELD_LABEL_COL_PX}px`,
                    width: FIELD_LABEL_COL_PX,
                    maxWidth: FIELD_LABEL_COL_PX,
                    minWidth: 0,
                    pr: 2,
                    boxSizing: 'border-box',
                    alignSelf: alignItems === 'flex-start' ? 'flex-start' : 'center',
                    whiteSpace: 'normal',
                    wordBreak: 'break-word',
                    lineHeight: 1.35,
                    py: '2px',
                }}
            >
                {label}
            </Typography>
            <Box
                sx={{
                    flex: 1,
                    minWidth: 0,
                    width: '100%',
                    ...FIELD_VALUE_SX,
                    '& .RaReferenceInput-root': { width: '100%', display: 'block' },
                    '& .ra-input': { width: '100%', maxWidth: '100%' },
                    '& .MuiFormControl-root': { width: '100%', maxWidth: '100%' },
                    '& .MuiTextField-root': { width: '100%', maxWidth: '100%' },
                    '& .MuiAutocomplete-root': { width: '100%', maxWidth: '100%' },
                }}
            >
                {children}
            </Box>
        </Box>
    );
}

export const CompactTextInput = (props: React.ComponentProps<typeof TextInput>) => (
    <TextInput
        {...props}
        variant="standard"
        margin="none"
        size="small"
        sx={{ ...UNDERLINE_FIELD_SX, ...(props.sx as object) }}
    />
);

export const CompactNumberInput = (props: React.ComponentProps<typeof NumberInput>) => (
    <NumberInput
        {...props}
        variant="standard"
        margin="none"
        size="small"
        sx={{ ...UNDERLINE_FIELD_SX, ...(props.sx as object) }}
    />
);

export const CompactSelectInput = (props: React.ComponentProps<typeof SelectInput>) => (
    <SelectInput
        {...props}
        variant="standard"
        margin="none"
        size="small"
        sx={{
            ...UNDERLINE_FIELD_SX,
            '& .MuiSelect-select': { py: '5px' },
            '& .MuiSelect-icon': { top: 'calc(50% - 12px)' },
            ...(props.sx as object),
        }}
    />
);

export const CompactAutocompleteInput = (props: React.ComponentProps<typeof AutocompleteInput>) => (
    <AutocompleteInput
        {...props}
        variant="standard"
        margin="none"
        size="small"
        sx={{
            ...UNDERLINE_FIELD_SX,
            width: '100%',
            maxWidth: '100%',
            '& .MuiFormControl-root': { width: '100%', maxWidth: '100%' },
            '& .MuiTextField-root': { width: '100%', maxWidth: '100%' },
            '& .MuiAutocomplete-inputRoot': { minHeight: 30, py: '2px' },
            '& .MuiAutocomplete-input': { py: '5px !important' },
            ...(props.sx as object),
        }}
    />
);

