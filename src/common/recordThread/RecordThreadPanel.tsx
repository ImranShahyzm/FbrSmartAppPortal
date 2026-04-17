import * as React from 'react';
import { useRecordContext, useTranslate, useGetIdentity, useRefresh } from 'react-admin';
import AttachFile from '@mui/icons-material/AttachFile';
import ChatBubbleOutline from '@mui/icons-material/ChatBubbleOutline';
import Description from '@mui/icons-material/Description';
import History from '@mui/icons-material/History';
import ImageIcon from '@mui/icons-material/Image';
import InsertDriveFile from '@mui/icons-material/InsertDriveFile';
import PictureAsPdf from '@mui/icons-material/PictureAsPdf';
import Send from '@mui/icons-material/Send';
import {
    Avatar,
    Box,
    Button,
    Card,
    CardContent,
    ClickAwayListener,
    Dialog,
    DialogContent,
    Divider,
    List,
    ListItem,
    ListItemAvatar,
    ListItemButton,
    ListItemText,
    Paper,
    Popper,
    TextField,
    Typography,
} from '@mui/material';

import { parseApiUtcInstant } from '../parseApiUtcInstant';
import {
    fetchMentionUserSuggestions,
    fetchRecordThreadMessages,
    postRecordThreadNote,
    type MentionUserOption,
    type MentionUserProfile,
    type RecordThreadMessage,
} from '../../api/recordThreadApi';
import { MentionNoteBody } from './MentionNoteBody';

// Images from phones/screenshots are often > 400KB. Keep this reasonable for DB storage (base64 inflates).
const MAX_ATTACH_BYTES = 3_000_000;

/** Matches FbrAdminPortal companies chatter panel. */
const PANEL_BG = '#f0f4fa';
const PANEL_BORDER = '#d0d9e8';

const AVA = { width: 28, height: 28, fontSize: 13 };

function stripDataUrl(base64OrDataUrl: string): string {
    const comma = base64OrDataUrl.indexOf(',');
    if (base64OrDataUrl.startsWith('data:') && comma >= 0) {
        return base64OrDataUrl.slice(comma + 1);
    }
    return base64OrDataUrl;
}

type AttachmentPayload = { name: string; mime: string; dataBase64: string };

type RecordThreadPanelProps = {
    resourceKey: string;
};

/** Uses parseApiUtcInstant so stored UTC is shown in the viewer's locale and local timezone. */
function formatDayKey(iso: string): string {
    const d = parseApiUtcInstant(iso);
    if (!d) return '';
    return d.toLocaleDateString(undefined, {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

function formatFullDateTime(iso: string): string {
    const d = parseApiUtcInstant(iso);
    if (!d) return '';
    return d.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
    });
}

function formatRelativeTime(iso: string): string {
    const d = parseApiUtcInstant(iso);
    if (!d) return '';
    const now = new Date();
    const todayStr = now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const time = d.toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
    });
    if (d.toDateString() === todayStr) return `Today at ${time}`;
    if (d.toDateString() === yesterday.toDateString()) return `Yesterday at ${time}`;
    return (
        d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ` at ${time}`
    );
}

function groupByDay(items: RecordThreadMessage[]): { day: string; items: RecordThreadMessage[] }[] {
    const map = new Map<string, RecordThreadMessage[]>();
    for (const it of items) {
        const key = formatDayKey(it.createdAtUtc);
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(it);
    }
    const withTs = Array.from(map.entries()).map(([day, list]) => ({
        day,
        items: list,
        ts: Math.max(
            ...list.map((i: RecordThreadMessage) => parseApiUtcInstant(i.createdAtUtc)?.getTime() ?? 0)
        ),
    }));
    withTs.sort((a, b) => b.ts - a.ts);
    return withTs.map(({ day, items: list }) => ({ day, items: list }));
}

function getMentionState(
    text: string,
    cursor: number
): { start: number; query: string } | null {
    const before = text.slice(0, cursor);
    const at = before.lastIndexOf('@');
    if (at < 0) return null;
    const afterAt = before.slice(at + 1);
    if (afterAt.includes('\n')) return null;
    // One-line filter token only (no spaces), so a completed "@Name " does not keep the menu open.
    if (afterAt.includes(' ')) return null;
    return { start: at, query: afterAt };
}

function attachmentFileIcon(mime: string) {
    const m = (mime || '').toLowerCase();
    if (m.startsWith('image/')) return <ImageIcon sx={{ fontSize: 18 }} />;
    if (m.includes('pdf')) return <PictureAsPdf sx={{ fontSize: 18 }} />;
    if (m.includes('word') || m.includes('document') || m.includes('msword')) {
        return <Description sx={{ fontSize: 18 }} />;
    }
    return <InsertDriveFile sx={{ fontSize: 18 }} />;
}

function isImageMime(mime: string) {
    return (mime || '').toLowerCase().startsWith('image/');
}

type FileLinkProps = {
    name: string;
    mime: string;
    dataBase64?: string | null;
};

function FileAttachmentLink({ name, mime, dataBase64 }: FileLinkProps) {
    const href =
        dataBase64 && dataBase64.length > 0 ? `data:${mime || 'application/octet-stream'};base64,${dataBase64}` : '#';
    const display = name || 'file';
    return (
        <Box
            component="a"
            href={href}
            download={display}
            sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.75,
                mt: 0.5,
                mr: 1,
                color: 'primary.main',
                textDecoration: 'none',
                fontSize: '0.72rem',
                '&:hover': { textDecoration: 'underline' },
            }}
        >
            {attachmentFileIcon(mime)}
            <Typography component="span" variant="caption" sx={{ fontWeight: 600 }}>
                {display}
            </Typography>
        </Box>
    );
}

function ImageThumb({
    name,
    mime,
    dataBase64,
    onClick,
}: {
    name: string;
    mime: string;
    dataBase64: string;
    onClick: () => void;
}) {
    const src = `data:${mime || 'image/*'};base64,${dataBase64}`;
    return (
        <Box
            role="button"
            tabIndex={0}
            onClick={onClick}
            onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') onClick();
            }}
            sx={{
                width: 88,
                height: 66,
                borderRadius: 1,
                overflow: 'hidden',
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                '&:hover': { borderColor: 'primary.main' },
                outline: 'none',
            }}
            title={name}
        >
            <Box
                component="img"
                src={src}
                alt={name}
                loading="lazy"
                sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
        </Box>
    );
}

/**
 * Reusable record thread: internal notes (@mentions in text), attachments, and system lines in one timeline.
 */
export function RecordThreadPanel(props: RecordThreadPanelProps) {
    const { resourceKey } = props;
    const record = useRecordContext<{ id?: string | number }>();
    const translate = useTranslate();
    const { identity } = useGetIdentity();
    const refresh = useRefresh();

    const recordId = record?.id != null ? String(record.id) : '';

    /** When workflow fields on the parent record change (e.g. after Approve), reload the thread. */
    const threadReloadKey = React.useMemo(() => {
        const r = record as Record<string, unknown> | undefined;
        if (!r) return '';
        return [
            r.approvalStatusCode,
            r.posted,
            r.cancelled,
            r.status,
            r.updatedAt,
        ]
            .map(v => (v == null ? '' : String(v)))
            .join('|');
    }, [record]);

    const [rows, setRows] = React.useState<RecordThreadMessage[]>([]);
    const [mentionProfiles, setMentionProfiles] = React.useState<Record<string, MentionUserProfile>>({});
    const [body, setBody] = React.useState('');
    const [pendingFiles, setPendingFiles] = React.useState<AttachmentPayload[]>([]);
    const [mentionedUserIds, setMentionedUserIds] = React.useState<string[]>([]);
    const [mentionOptions, setMentionOptions] = React.useState<MentionUserOption[]>([]);
    const [mentionOpen, setMentionOpen] = React.useState(false);
    const [mentionHighlight, setMentionHighlight] = React.useState(0);
    const inputRef = React.useRef<HTMLTextAreaElement | null>(null);
    const anchorRef = React.useRef<HTMLDivElement | null>(null);

    const [loading, setLoading] = React.useState(false);
    const [posting, setPosting] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [preview, setPreview] = React.useState<{
        name: string;
        mime: string;
        dataBase64: string;
    } | null>(null);

    const load = React.useCallback(async () => {
        if (!recordId) return;
        setLoading(true);
        setError(null);
        try {
            const { messages, mentionProfiles: mp } = await fetchRecordThreadMessages(
                resourceKey,
                recordId
            );
            setRows(messages);
            setMentionProfiles(prev => ({ ...prev, ...mp }));
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Load failed');
        } finally {
            setLoading(false);
        }
    }, [recordId, resourceKey]);

    const mergeMentionProfile = React.useCallback((userId: string, p: MentionUserProfile) => {
        React.startTransition(() => {
            setMentionProfiles(prev => ({
                ...prev,
                [userId]: p,
                [String(p.id)]: p,
            }));
        });
    }, []);

    React.useEffect(() => {
        void load();
    }, [load, threadReloadKey]);

    const readFileAsPayload = (file: File): Promise<AttachmentPayload> =>
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
        const next: AttachmentPayload[] = [];
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
        if (files.length > next.length) {
            setError(`Some attachments were skipped (max ${(MAX_ATTACH_BYTES / 1_000_000).toFixed(1)}MB each).`);
        }
        e.target.value = '';
    };

    const mentionFetchTimer = React.useRef<number | null>(null);

    const scheduleMentionFetch = React.useCallback(
        (query: string) => {
            if (!recordId) return;
            if (mentionFetchTimer.current != null) window.clearTimeout(mentionFetchTimer.current);
            mentionFetchTimer.current = window.setTimeout(() => {
                fetchMentionUserSuggestions(resourceKey, query)
                    .then(opts => {
                        setMentionOptions(opts);
                        setMentionHighlight(0);
                    })
                    .catch(() => setMentionOptions([]));
            }, 180);
        },
        [recordId, resourceKey]
    );

    const handleBodyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const next = e.target.value;
        const cursor = e.target.selectionStart ?? next.length;
        setBody(next);

        const st = getMentionState(next, cursor);
        if (st) {
            setMentionOpen(true);
            scheduleMentionFetch(st.query);
        } else {
            setMentionOpen(false);
        }
    };

    const handleBodySelect = (e: React.SyntheticEvent<HTMLElement>) => {
        const ta = e.currentTarget as HTMLTextAreaElement;
        const cursor = ta.selectionStart ?? body.length;
        const st = getMentionState(body, cursor);
        if (st) {
            setMentionOpen(true);
            scheduleMentionFetch(st.query);
        } else {
            setMentionOpen(false);
        }
    };

    const insertMention = (user: MentionUserOption) => {
        const ta = inputRef.current;
        if (!ta) return;
        const current = ta.value;
        const cursor = ta.selectionStart ?? current.length;
        const st = getMentionState(current, cursor);
        if (!st) return;

        const label = (user.fullName || user.username).trim();
        const insertText = `@${label} `;
        const before = current.slice(0, st.start);
        const after = current.slice(cursor);
        const newBody = before + insertText + after;
        setBody(newBody);
        setMentionedUserIds(prev => (prev.includes(user.id) ? prev : [...prev, user.id]));
        setMentionOpen(false);

        const pos = before.length + insertText.length;
        window.requestAnimationFrame(() => {
            ta.focus();
            ta.setSelectionRange(pos, pos);
        });
    };

    const onMentionKeyDown = (e: React.KeyboardEvent) => {
        if (!mentionOpen || mentionOptions.length === 0) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setMentionHighlight(i => (i + 1) % mentionOptions.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setMentionHighlight(i => (i - 1 + mentionOptions.length) % mentionOptions.length);
        } else if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            insertMention(mentionOptions[mentionHighlight]);
        } else if (e.key === 'Escape') {
            setMentionOpen(false);
        }
    };

    const send = async () => {
        const text = body.trim();
        if (!recordId || (!text && pendingFiles.length === 0 && mentionedUserIds.length === 0)) return;
        setPosting(true);
        setError(null);
        try {
            await postRecordThreadNote(resourceKey, recordId, text, pendingFiles, mentionedUserIds);
            setBody('');
            setPendingFiles([]);
            setMentionedUserIds([]);
            setMentionOpen(false);
            await load();
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

    const timeline = React.useMemo(() => {
        return [...rows].sort(
            (a, b) =>
                (parseApiUtcInstant(b.createdAtUtc)?.getTime() ?? 0) -
                (parseApiUtcInstant(a.createdAtUtc)?.getTime() ?? 0)
        );
    }, [rows]);

    const dayGroups = React.useMemo(() => groupByDay(timeline), [timeline]);

    const renderEntry = (m: RecordThreadMessage) => {
        const when = formatRelativeTime(m.createdAtUtc);
        const whenFull = formatFullDateTime(m.createdAtUtc);

        if (Number(m.kind) === 0) {
            const imageAtt = (m.attachments ?? []).filter(
                a => a?.dataBase64 && isImageMime(a?.mime || '')
            ) as { name?: string; mime?: string; dataBase64?: string }[];
            const otherAtt = (m.attachments ?? []).filter(
                a => !a?.dataBase64 || !isImageMime(a?.mime || '')
            );
            return (
                <ListItem
                    alignItems="flex-start"
                    sx={{ px: 0.5, py: 0.6, gap: 0.75, alignItems: 'flex-start' }}
                    disableGutters
                >
                    <ListItemAvatar sx={{ minWidth: 36, mt: 0.25 }}>
                        <Avatar sx={{ ...AVA, bgcolor: 'primary.light' }}>
                            <ChatBubbleOutline sx={{ fontSize: 14 }} />
                        </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                        disableTypography
                        primary={
                            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75, flexWrap: 'wrap' }}>
                                <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, lineHeight: 1.3 }}>
                                    {m.authorDisplayName || displayName}
                                </Typography>
                                <Typography sx={{ fontSize: '0.68rem', color: 'text.disabled', lineHeight: 1.3 }}>
                                    {when}
                                </Typography>
                            </Box>
                        }
                        secondary={
                            <Box component="span" sx={{ display: 'block' }}>
                                {m.body ? (
                                    <Typography
                                        component="div"
                                        sx={{
                                            fontSize: '0.72rem',
                                            whiteSpace: 'pre-wrap',
                                            mt: 0.25,
                                            lineHeight: 1.45,
                                            color: 'text.primary',
                                        }}
                                    >
                                        <MentionNoteBody
                                            body={m.body}
                                            mentionedUserIds={m.mentionedUserIds}
                                            mentionProfiles={mentionProfiles}
                                            resourceKey={resourceKey}
                                            onProfileResolved={mergeMentionProfile}
                                        />
                                    </Typography>
                                ) : null}
                                {m.attachments?.length ? (
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.6, mt: 0.35 }}>
                                        {imageAtt.length > 0 ? (
                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                                                {imageAtt.map((a, i) => (
                                                    <ImageThumb
                                                        key={`${m.id}-img-${i}`}
                                                        name={a.name || 'image'}
                                                        mime={a.mime || 'image/*'}
                                                        dataBase64={String(a.dataBase64)}
                                                        onClick={() =>
                                                            setPreview({
                                                                name: a.name || 'image',
                                                                mime: a.mime || 'image/*',
                                                                dataBase64: String(a.dataBase64),
                                                            })
                                                        }
                                                    />
                                                ))}
                                            </Box>
                                        ) : null}
                                        {otherAtt.length > 0 ? (
                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                {otherAtt.map((a, i) => (
                                                    <FileAttachmentLink
                                                        key={`${m.id}-att-${i}`}
                                                        name={a.name || 'file'}
                                                        mime={a.mime || 'application/octet-stream'}
                                                        dataBase64={a.dataBase64}
                                                    />
                                                ))}
                                            </Box>
                                        ) : null}
                                    </Box>
                                ) : null}
                            </Box>
                        }
                    />
                </ListItem>
            );
        }

        const detail =
            m.body && m.body.trim().length > 0
                ? m.body.trim()
                : [m.systemAction, m.authorDisplayName].filter(Boolean).join(' · ') || '—';

        return (
            <ListItem
                alignItems="flex-start"
                sx={{ px: 0.5, py: 0.6, gap: 0.75 }}
                disableGutters
            >
                <ListItemAvatar sx={{ minWidth: 36, mt: 0.25 }}>
                    <Avatar sx={{ ...AVA, bgcolor: 'secondary.light' }}>
                        <History sx={{ fontSize: 14 }} />
                    </Avatar>
                </ListItemAvatar>
                <ListItemText
                    disableTypography
                    primary={
                        <Box sx={{ display: 'block' }}>
                            <Typography
                                sx={{
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    lineHeight: 1.45,
                                    color: 'text.primary',
                                }}
                            >
                                {detail}
                            </Typography>
                            <Typography
                                component="div"
                                sx={{ fontSize: '0.68rem', color: 'text.secondary', mt: 0.35, lineHeight: 1.35 }}
                            >
                                {when}
                                {whenFull ? ` · ${whenFull}` : null}
                            </Typography>
                        </Box>
                    }
                />
            </ListItem>
        );
    };

    if (!recordId) {
        return (
            <Card
                variant="outlined"
                sx={{
                    position: { md: 'sticky' },
                    top: { md: 16 },
                    bgcolor: PANEL_BG,
                    borderColor: PANEL_BORDER,
                }}
            >
                <CardContent>
                    <Typography variant="body2" color="text.secondary">
                        {translate('shell.recordThread.save_first', {
                            _: 'Save the record once to enable notes and the activity log.',
                        })}
                    </Typography>
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            <Dialog
                open={preview != null}
                onClose={() => setPreview(null)}
                maxWidth="md"
                fullWidth
            >
                <DialogContent sx={{ p: 0, bgcolor: 'black' }}>
                    {preview ? (
                        <Box
                            component="img"
                            src={`data:${preview.mime};base64,${preview.dataBase64}`}
                            alt={preview.name}
                            sx={{ width: '100%', height: 'auto', display: 'block' }}
                        />
                    ) : null}
                </DialogContent>
            </Dialog>

            <Card
                variant="outlined"
                sx={{
                    position: { md: 'sticky' },
                    top: { md: 16 },
                    maxHeight: { md: 'calc(100vh - 120px)' },
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    bgcolor: PANEL_BG,
                    borderColor: PANEL_BORDER,
                }}
            >
            <CardContent
                sx={{
                    pt: 1.25,
                    pb: 1.25,
                    px: 1.5,
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: 0,
                    overflow: 'auto',
                    '&:last-child': { pb: 1.25 },
                }}
            >
                <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, mb: 0.25 }}>
                    {translate('shell.recordThread.notes_title', { _: 'Internal notes' })}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                    {translate('shell.recordThread.notes_hint', {
                        _: 'Notes and attachments are stored with this record. Type @ to mention someone.',
                    })}
                </Typography>

                <Box ref={anchorRef} sx={{ position: 'relative' }}>
                    <Box
                        sx={{
                            p: 1,
                            borderRadius: 1,
                            bgcolor: 'rgba(255,255,255,0.92)',
                            border: '1px solid',
                            borderColor: PANEL_BORDER,
                            mb: 1.25,
                            flexShrink: 0,
                        }}
                    >
                        <TextField
                            inputRef={inputRef}
                            multiline
                            minRows={2}
                            size="small"
                            fullWidth
                            placeholder={translate('shell.recordThread.note_placeholder', {
                                _: 'Write an internal note…',
                            })}
                            value={body}
                            onChange={handleBodyChange}
                            onSelect={handleBodySelect}
                            onKeyDown={onMentionKeyDown}
                            sx={{
                                bgcolor: 'background.paper',
                                '& .MuiInputBase-input': { fontSize: '0.75rem', py: 0.75 },
                            }}
                        />
                        {pendingFiles.length > 0 && (
                            <Box sx={{ mt: 0.75, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                                    {pendingFiles
                                        .filter(f => isImageMime(f.mime) && f.dataBase64)
                                        .map((f, i) => (
                                            <ImageThumb
                                                key={`${f.name}-${i}`}
                                                name={f.name}
                                                mime={f.mime}
                                                dataBase64={f.dataBase64}
                                                onClick={() =>
                                                    setPreview({
                                                        name: f.name,
                                                        mime: f.mime,
                                                        dataBase64: f.dataBase64,
                                                    })
                                                }
                                            />
                                        ))}
                                </Box>
                                {pendingFiles.some(f => !isImageMime(f.mime)) ? (
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                        {pendingFiles
                                            .filter(f => !isImageMime(f.mime))
                                            .map((f, i) => (
                                                <Box
                                                    key={`${f.name}-${i}`}
                                                    sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}
                                                >
                                                    {attachmentFileIcon(f.mime)}
                                                    <Typography variant="caption" color="text.secondary">
                                                        {f.name}
                                                    </Typography>
                                                </Box>
                                            ))}
                                    </Box>
                                ) : null}
                            </Box>
                        )}
                        {error ? (
                            <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.4 }}>
                                {error}
                            </Typography>
                        ) : null}
                        <Box sx={{ display: 'flex', gap: 0.75, mt: 0.75 }}>
                            <Button
                                component="label"
                                variant="outlined"
                                size="small"
                                startIcon={<AttachFile sx={{ fontSize: '14px !important' }} />}
                                sx={{ fontSize: '0.68rem', py: 0.3, px: 1, minWidth: 0 }}
                            >
                                {translate('shell.recordThread.attach', { _: 'Attach' })}
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
                                color="primary"
                                size="small"
                                startIcon={<Send sx={{ fontSize: '14px !important' }} />}
                                onClick={() => void send()}
                                disabled={
                                    posting ||
                                    loading ||
                                    (!body.trim() &&
                                        pendingFiles.length === 0 &&
                                        mentionedUserIds.length === 0)
                                }
                                sx={{
                                    fontSize: '0.68rem',
                                    py: 0.3,
                                    px: 1,
                                    minWidth: 0,
                                }}
                            >
                                {translate('shell.recordThread.post', { _: 'Post' })}
                            </Button>
                        </Box>
                    </Box>

                    <Popper
                        open={mentionOpen && mentionOptions.length > 0}
                        anchorEl={anchorRef.current}
                        placement="bottom-start"
                        style={{ zIndex: 1300 }}
                    >
                        <ClickAwayListener onClickAway={() => setMentionOpen(false)}>
                            <Paper
                                elevation={4}
                                sx={{
                                    maxHeight: 220,
                                    overflow: 'auto',
                                    minWidth: 220,
                                    border: '1px solid',
                                    borderColor: PANEL_BORDER,
                                }}
                            >
                                <List dense disablePadding>
                                    {mentionOptions.map((u, idx) => (
                                        <ListItemButton
                                            key={u.id}
                                            selected={idx === mentionHighlight}
                                            onMouseDown={e => e.preventDefault()}
                                            onClick={() => insertMention(u)}
                                        >
                                            <ListItemText
                                                primary={u.fullName || u.username}
                                                secondary={u.username}
                                                primaryTypographyProps={{ fontSize: '0.8rem' }}
                                                secondaryTypographyProps={{ fontSize: '0.68rem' }}
                                            />
                                        </ListItemButton>
                                    ))}
                                </List>
                            </Paper>
                        </ClickAwayListener>
                    </Popper>
                </Box>

                <List dense disablePadding sx={{ flex: 1 }}>
                    {timeline.length === 0 && !loading ? (
                        <Typography variant="caption" color="text.secondary" sx={{ py: 1 }}>
                            {translate('shell.recordThread.timeline_empty', { _: 'No activity yet.' })}
                        </Typography>
                    ) : (
                        dayGroups.map(({ day, items }) => (
                            <Box key={day}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, my: 0.75 }}>
                                    <Divider sx={{ flex: 1, borderColor: PANEL_BORDER }} />
                                    <Typography
                                        sx={{
                                            fontSize: '0.65rem',
                                            fontWeight: 700,
                                            color: 'text.disabled',
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        {day}
                                    </Typography>
                                    <Divider sx={{ flex: 1, borderColor: PANEL_BORDER }} />
                                </Box>
                                {items.map((m, idx) => (
                                    <React.Fragment key={m.id}>
                                        {renderEntry(m)}
                                        {idx < items.length - 1 && (
                                            <Divider sx={{ borderColor: 'rgba(0,0,0,0.05)', ml: 4.5 }} />
                                        )}
                                    </React.Fragment>
                                ))}
                            </Box>
                        ))
                    )}
                </List>
            </CardContent>
            </Card>
        </>
    );
}
