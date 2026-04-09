import * as React from 'react';
import {
    useRecordContext,
    useTranslate,
    useGetIdentity,
    useRefresh,
} from 'react-admin';
import AttachFile from '@mui/icons-material/AttachFile';
import Send from '@mui/icons-material/Send';
import {
    Avatar,
    Box,
    Button,
    Card,
    CardContent,
    Divider,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    TextField,
    Typography,
} from '@mui/material';

import {
    postCompanyChatter,
    type ChatterAttachmentPayload,
} from '../api/postCompanyChatter';

type ChatterAttachment = {
    name?: string;
    mime?: string;
    dataBase64?: string;
};

type ChatterMessage = {
    id: string;
    body: string;
    createdAt: string;
    authorDisplayName?: string;
    attachments?: ChatterAttachment[];
};

const MAX_ATTACH_BYTES = 400_000;

function stripDataUrl(base64OrDataUrl: string): string {
    const comma = base64OrDataUrl.indexOf(',');
    if (base64OrDataUrl.startsWith('data:') && comma >= 0) {
        return base64OrDataUrl.slice(comma + 1);
    }
    return base64OrDataUrl;
}

export function CompanyChatter() {
    const record = useRecordContext<{
        id: string | number;
        chatterMessages?: ChatterMessage[];
    }>();
    const translate = useTranslate();
    const { identity } = useGetIdentity();
    const refresh = useRefresh();
    const companyId = record?.id != null ? String(record.id) : '';

    const [messages, setMessages] = React.useState<ChatterMessage[]>([]);
    const [body, setBody] = React.useState('');
    const [pendingFiles, setPendingFiles] = React.useState<ChatterAttachmentPayload[]>([]);
    const [posting, setPosting] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        setMessages(record?.chatterMessages ?? []);
    }, [record?.id, record?.chatterMessages]);

    const readFileAsPayload = (file: File): Promise<ChatterAttachmentPayload> =>
        new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const dataUrl = reader.result as string;
                resolve({
                    name: file.name,
                    mime: file.type || 'application/octet-stream',
                    dataBase64: stripDataUrl(dataUrl),
                });
            };
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
        });

    const onPickFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files?.length) return;
        const next: ChatterAttachmentPayload[] = [];
        for (let i = 0; i < files.length; i++) {
            const f = files[i];
            if (f.size > MAX_ATTACH_BYTES) continue;
            try {
                next.push(await readFileAsPayload(f));
            } catch {
                /* skip */
            }
        }
        setPendingFiles(p => [...p, ...next]);
        e.target.value = '';
    };

    const send = async () => {
        const text = body.trim();
        if (!companyId || (!text && pendingFiles.length === 0)) return;
        setPosting(true);
        setError(null);
        try {
            await postCompanyChatter(companyId, text, pendingFiles);
            setBody('');
            setPendingFiles([]);
            refresh();
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Failed to post');
        } finally {
            setPosting(false);
        }
    };

    const displayName =
        (identity?.fullName as string) ||
        (identity?.id != null ? String(identity.id) : 'User');

    return (
        <Card
            variant="outlined"
            sx={{
                position: { md: 'sticky' },
                top: { md: 16 },
                maxHeight: { md: 'calc(100vh - 120px)' },
                overflow: 'auto',
            }}
        >
            <CardContent sx={{ pt: 2, '&:last-child': { pb: 2 } }}>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                    {translate('resources.companies.chatter.title', { _: 'Chatter' })}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                    {translate('resources.companies.chatter.stored_on_server', {
                        _: 'Notes and attachments are saved on the server with this company.',
                    })}
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
                    <TextField
                        multiline
                        minRows={3}
                        size="small"
                        fullWidth
                        placeholder={translate('resources.companies.chatter.placeholder', {
                            _: 'Log an internal note…',
                        })}
                        value={body}
                        onChange={e => setBody(e.target.value)}
                    />
                    {pendingFiles.length > 0 ? (
                        <Typography variant="caption" color="text.secondary">
                            {pendingFiles.map(f => f.name).join(', ')}
                        </Typography>
                    ) : null}
                    {error ? (
                        <Typography variant="caption" color="error">
                            {error}
                        </Typography>
                    ) : null}
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Button
                            component="label"
                            variant="outlined"
                            size="small"
                            startIcon={<AttachFile />}
                        >
                            {translate('resources.companies.chatter.attach', { _: 'Attach' })}
                            <input
                                type="file"
                                hidden
                                multiple
                                accept="image/*,.pdf,.doc,.docx"
                                onChange={onPickFiles}
                            />
                        </Button>
                        <Button
                            variant="contained"
                            size="small"
                            startIcon={<Send />}
                            onClick={send}
                            disabled={posting || (!body.trim() && pendingFiles.length === 0)}
                        >
                            {translate('resources.companies.chatter.post', { _: 'Post' })}
                        </Button>
                    </Box>
                </Box>

                <Divider sx={{ my: 1 }} />

                <List dense disablePadding>
                    {[...messages].reverse().map(m => (
                        <React.Fragment key={m.id}>
                            <ListItem alignItems="flex-start" sx={{ px: 0 }}>
                                <ListItemAvatar>
                                    <Avatar sx={{ width: 32, height: 32 }}>
                                        {(m.authorDisplayName || displayName)
                                            .charAt(0)
                                            .toUpperCase()}
                                    </Avatar>
                                </ListItemAvatar>
                                <ListItemText
                                    secondaryTypographyProps={{ component: 'div' }}
                                    primary={
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                gap: 1,
                                            }}
                                        >
                                            <Typography variant="body2" fontWeight={600}>
                                                {m.authorDisplayName || displayName}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {m.createdAt
                                                    ? new Date(m.createdAt).toLocaleString()
                                                    : ''}
                                            </Typography>
                                        </Box>
                                    }
                                    secondary={
                                        <>
                                            {m.body ? (
                                                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                                                    {m.body}
                                                </Typography>
                                            ) : null}
                                            {m.attachments?.length ? (
                                                <Typography variant="caption" color="text.secondary">
                                                    {m.attachments
                                                        .map(a => a?.name)
                                                        .filter(Boolean)
                                                        .join(', ')}
                                                </Typography>
                                            ) : null}
                                        </>
                                    }
                                />
                            </ListItem>
                            <Divider />
                        </React.Fragment>
                    ))}
                </List>
            </CardContent>
        </Card>
    );
}

