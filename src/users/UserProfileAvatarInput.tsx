import * as React from 'react';
import { useInput, useRecordContext } from 'react-admin';
import { useWatch } from 'react-hook-form';
import { Box, Button, Typography } from '@mui/material';
import { API_BASE_URL } from '../api/apiBaseUrl';

function readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = () => reject(new Error('read failed'));
        r.readAsDataURL(file);
    });
}

export function getInitials(name?: string) {
    const s = String(name ?? '').trim();
    if (!s) return '?';
    const parts = s.split(/\s+/).filter(Boolean);
    const a = parts[0]?.[0] ?? '';
    const b = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
    return (a + b).toUpperCase() || '?';
}

export function imgSrc(path?: string | null) {
    if (!path) return null;
    return `${API_BASE_URL}/${String(path).replace(/^\/+/, '')}`;
}

/** Square avatar: uploaded image, or server path, or initials on teal. */
export function UserProfileAvatarInput(props: { source?: string }) {
    const source = props.source ?? 'profileImageBase64';
    const { field } = useInput({ source, defaultValue: '' });
    const record = useRecordContext<{ profileImage?: string | null }>();
    const fullName = useWatch({ name: 'fullName' }) as string | undefined;

    const dataPreview =
        typeof field.value === 'string' && field.value.startsWith('data:') ? field.value : null;
    const serverUrl = dataPreview ? null : imgSrc(record?.profileImage);
    const imageUrl = dataPreview || serverUrl;

    const onPick: React.ChangeEventHandler<HTMLInputElement> = async e => {
        const file = e.target.files?.[0];
        if (!file) return;
        field.onChange(await readFileAsDataUrl(file));
        e.target.value = '';
    };

    const initials = getInitials(fullName);

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: { xs: 'flex-start', sm: 'flex-end' },
                gap: 0.75,
            }}
        >
            <Box
                sx={{
                    width: 72,
                    height: 72,
                    borderRadius: 1,
                    flexShrink: 0,
                    overflow: 'hidden',
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: '#2a9d8f',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                {imageUrl ? (
                    <Box
                        component="img"
                        src={imageUrl}
                        alt=""
                        sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                ) : (
                    <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '1.5rem' }}>{initials}</Typography>
                )}
            </Box>
            <Button variant="outlined" size="small" component="label" sx={{ textTransform: 'none', fontSize: 12, py: 0.25 }}>
                Upload photo
                <input hidden type="file" accept="image/*" onChange={onPick} />
            </Button>
        </Box>
    );
}
