import * as React from 'react';
import { useInput, useRecordContext } from 'react-admin';
import { Box, Button, Typography } from '@mui/material';
import { FIELD_LABEL_SX } from '../common/odooCompactFormFields';
import { API_BASE_URL } from '../api/apiBaseUrl';

export function LogoBase64Input(props: {
    source: string;
    label?: string;
    accept?: string;
}) {
    const { field } = useInput({ source: props.source });
    const record = useRecordContext<any>();
    const apiBaseUrl = API_BASE_URL;
    const fileInputRef = React.useRef<HTMLInputElement | null>(null);
    const [preview, setPreview] = React.useState<string | null>(
        typeof field.value === 'string' ? field.value : null
    );

    const accept = props.accept ?? 'image/*';

    const onChange: React.ChangeEventHandler<HTMLInputElement> = async e => {
        const file = e.target.files?.[0];
        if (!file) return;

        const base64 = await readFileAsDataUrl(file);
        field.onChange(base64);
        setPreview(base64);
    };

    React.useEffect(() => {
        const handler = () => {
            fileInputRef.current?.click();
        };
        window.addEventListener('companyLogoSelect', handler);
        return () => window.removeEventListener('companyLogoSelect', handler);
    }, []);

    const imgSx = {
        width: 220,
        height: 220,
        objectFit: 'contain' as const,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        p: 1,
        display: 'block',
        flexShrink: 0,
    };

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
                alignItems: 'flex-end',
            }}
        >
            <Typography sx={{ ...FIELD_LABEL_SX, minWidth: 'unset', alignSelf: 'flex-end' }}>
                {props.label ?? 'Company logo'}
            </Typography>
            <Button variant="outlined" component="label" size="small">
                Select Logo
                <input
                    ref={fileInputRef}
                    hidden
                    type="file"
                    accept={accept}
                    onChange={onChange}
                />
            </Button>
            {preview ? (
                <Box component="img" src={preview} alt="Logo preview" sx={imgSx} />
            ) : record?.companyImage ? (
                <Box
                    component="img"
                    src={`${apiBaseUrl}/${String(record.companyImage).replace(/^\//, '')}`}
                    alt="Company logo"
                    sx={imgSx}
                />
            ) : null}
        </Box>
    );
}

function readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.onload = () => resolve(String(reader.result));
        reader.readAsDataURL(file);
    });
}
