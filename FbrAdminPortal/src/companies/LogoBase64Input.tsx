import * as React from 'react';
import { useInput, useRecordContext } from 'react-admin';
import { useFormContext } from 'react-hook-form';
import { Box, Button, Typography } from '@mui/material';
import { FIELD_LABEL_SX } from '../common/compactFormFields';
import { API_BASE_URL } from '../api/apiBaseUrl';

/** Serves uploaded files from the API host; with empty base uses root path so Vite `/uploads` proxy works. */
function publicFileUrl(relativePath: string): string {
    const p = String(relativePath).replace(/^\//, '');
    const base = API_BASE_URL.replace(/\/$/, '');
    return base ? `${base}/${p}` : `/${p}`;
}

/** Downscale large photos so JSON bodies stay small and the API accepts the save. */
async function fileToCompressedDataUrl(file: File, maxDimension = 720, jpegQuality = 0.88): Promise<string> {
    const bitmap = await createImageBitmap(file);
    try {
        const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
        const w = Math.max(1, Math.round(bitmap.width * scale));
        const h = Math.max(1, Math.round(bitmap.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return readFileAsDataUrl(file);
        ctx.drawImage(bitmap, 0, 0, w, h);
        return canvas.toDataURL('image/jpeg', jpegQuality);
    } finally {
        bitmap.close();
    }
}

function readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.onload = () => resolve(String(reader.result));
        reader.readAsDataURL(file);
    });
}

export function LogoBase64Input(props: {
    source: string;
    label?: string;
    accept?: string;
    thumbnailMode?: boolean;
    /** Tighter preview for admin column (aligns with form rows). */
    compact?: boolean;
}) {
    const showLabel = Boolean(props.label);
    const { setValue } = useFormContext();
    const { field } = useInput({
        source: props.source,
        /** Keep file-derived strings as-is (avoid any empty-string → null edge cases). */
        parse: (v: unknown) => v as string | null,
    });
    const record = useRecordContext<any>();
    const fileInputRef = React.useRef<HTMLInputElement | null>(null);
    const [preview, setPreview] = React.useState<string | null>(
        typeof field.value === 'string' ? field.value : null
    );

    const accept = props.accept ?? 'image/*';

    const onChange: React.ChangeEventHandler<HTMLInputElement> = async e => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = '';

        let base64: string;
        try {
            base64 = await fileToCompressedDataUrl(file);
        } catch {
            base64 = await readFileAsDataUrl(file);
        }
        setValue(props.source, base64, { shouldDirty: true, shouldTouch: true, shouldValidate: false });
        field.onChange(base64);
        setPreview(base64);
    };

    React.useEffect(() => {
        if (typeof field.value === 'string') setPreview(field.value);
        else if (field.value == null) setPreview(null);
    }, [field.value]);

    const resolvedSrc =
        preview ?? (record?.companyImage ? publicFileUrl(String(record.companyImage)) : null);

    const imgKey = String(record?.companyImage ?? '');

    if (props.thumbnailMode) {
        return (
            <Box
                onClick={() => fileInputRef.current?.click()}
                sx={{
                    width: 64,
                    height: 64,
                    borderRadius: '6px',
                    border: '0.5px solid',
                    borderColor: 'divider',
                    bgcolor: 'action.hover',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    position: 'relative',
                    flexShrink: 0,
                    '&:hover .logo-change-overlay': { opacity: 1 },
                }}
            >
                <input ref={fileInputRef} hidden type="file" accept={accept} onChange={onChange} />
                {resolvedSrc ? (
                    <Box
                        component="img"
                        key={imgKey}
                        src={resolvedSrc}
                        alt="Company logo"
                        sx={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                ) : (
                    <Typography sx={{ fontSize: 10, color: 'text.disabled', textAlign: 'center', px: 0.5 }}>
                        Logo
                    </Typography>
                )}
                <Box
                    className="logo-change-overlay"
                    sx={{
                        position: 'absolute',
                        inset: 0,
                        bgcolor: 'rgba(0,0,0,0.38)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: 0,
                        transition: 'opacity 0.15s',
                    }}
                >
                    <Typography sx={{ color: '#fff', fontSize: 10, fontWeight: 600 }}>
                        {resolvedSrc ? 'Change' : 'Upload'}
                    </Typography>
                </Box>
            </Box>
        );
    }

    const compact = props.compact ?? false;
    const imgSx = compact
        ? {
              maxWidth: '100%',
              width: 'auto',
              height: 'auto',
              maxHeight: 152,
              objectFit: 'contain' as const,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              p: 0.5,
              display: 'block',
          }
        : {
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
                gap: 0.75,
                alignItems: 'flex-start',
                maxWidth: '100%',
                ...(compact ? { maxHeight: { lg: 228 }, overflow: 'hidden' } : {}),
            }}
        >
            {showLabel ? (
                <Typography sx={{ ...FIELD_LABEL_SX, minWidth: 'unset', lineHeight: 1.2 }}>{props.label}</Typography>
            ) : null}
            <Button variant="outlined" component="label" size="small" sx={{ py: 0.25, fontSize: 12 }}>
                Select logo
                <input ref={fileInputRef} hidden type="file" accept={accept} onChange={onChange} />
            </Button>
            {resolvedSrc ? (
                <Box
                    component="img"
                    key={imgKey || 'preview'}
                    src={resolvedSrc}
                    alt="Logo preview"
                    sx={imgSx}
                />
            ) : null}
        </Box>
    );
}
