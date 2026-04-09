import * as React from 'react';
import { useRecordContext, useGetIdentity, useRefresh } from 'react-admin';
import AttachFile from '@mui/icons-material/AttachFile';
import ChatBubbleOutline from '@mui/icons-material/ChatBubbleOutline';
import History from '@mui/icons-material/History';
import Send from '@mui/icons-material/Send';
import Security from '@mui/icons-material/Security';
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
import { apiFetch } from '../api/httpClient';

type Attachment = { name?: string; mime?: string; dataBase64?: string };

type TimelineChatter = {
    kind: 'chatter';
    id: string;
    body: string;
    createdAt: string;
    authorDisplayName?: string;
    attachments?: Attachment[];
};

type TimelineActivity = {
    kind: 'activity';
    id: string;
    createdAt: string;
    adminEmail?: string;
    action: string;
    notes?: string | null;
};

type TimelineAudit = {
    kind: 'audit';
    id: string;
    createdAt: string;
    adminEmail?: string;
    resource: string;
    action: string;
    payloadJson?: string | null;
};

type TimelineItem = TimelineChatter | TimelineActivity | TimelineAudit;

const PANEL_BG = '#f0f4fa';
const PANEL_BORDER = '#d0d9e8';
const CHANGE_NEW_COLOR = '#0d7d78';
const MAX_ATTACH_BYTES = 400_000;

const ACTION_LABELS: Record<string, string> = {
    'company.profile.update': 'Profile saved',
    'company.chatter.post': 'Note posted',
    'payment.update': 'Payment updated',
    'company.tokens.update': 'FBR tokens updated',
    'company.activate': 'Company activated',
    'company.deactivate': 'Company deactivated',
};

function stripDataUrl(base64OrDataUrl: string): string {
    const comma = base64OrDataUrl.indexOf(',');
    if (base64OrDataUrl.startsWith('data:') && comma >= 0) return base64OrDataUrl.slice(comma + 1);
    return base64OrDataUrl;
}

async function readFileAsPayload(file: File): Promise<Attachment> {
    return new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () =>
            resolve({
                name: file.name,
                mime: file.type || 'application/octet-stream',
                dataBase64: stripDataUrl(String(r.result ?? '')),
            });
        r.onerror = () => reject(r.error);
        r.readAsDataURL(file);
    });
}

function isTimelineItem(x: unknown): x is TimelineItem {
    if (!x || typeof x !== 'object') return false;
    const k = (x as { kind?: unknown }).kind;
    return k === 'chatter' || k === 'activity' || k === 'audit';
}

function parsePayload(raw: string | null | undefined): Record<string, unknown> | null {
    if (!raw || !String(raw).trim()) return null;
    try { return JSON.parse(raw) as Record<string, unknown>; } catch { return null; }
}

function looksLikeJsonObject(s: string): boolean {
    const t = s.trim();
    return t.startsWith('{') && t.endsWith('}');
}

function activityTitle(action: string): string {
    return ACTION_LABELS[action] ?? action.replace(/\./g, ' ');
}

type ChangeRow = { label: string; before: string; after: string };

function readChanges(obj: Record<string, unknown>): ChangeRow[] {
    const c = obj.changes ?? obj.Changes;
    if (!Array.isArray(c)) return [];
    const out: ChangeRow[] = [];
    for (const row of c) {
        if (!row || typeof row !== 'object') continue;
        const r = row as Record<string, unknown>;
        const label = r.label ?? r.Label;
        const before = r.before ?? r.Before;
        const after = r.after ?? r.After;
        if (typeof label === 'string' && typeof before === 'string' && typeof after === 'string') {
            out.push({ label, before, after });
        }
    }
    return out;
}

/** Compact change list: bullet • before → after (label) */
function AuditReadableBody({ action, payloadJson }: { action: string; payloadJson?: string | null }) {
    const o = parsePayload(payloadJson ?? undefined);
    if (o) {
        const changes = readChanges(o);
        if (changes.length > 0) {
            return (
                <Box component="ul" sx={{ m: 0, pl: 1.75, listStyle: 'disc' }}>
                    {changes.map((ch, i) => (
                        <li key={i} style={{ marginBottom: 1 }}>
                            <Typography variant="caption" component="span" color="text.secondary">
                                {ch.before}
                            </Typography>
                            <Typography variant="caption" component="span" sx={{ mx: 0.4 }}>→</Typography>
                            <Typography
                                variant="caption"
                                component="span"
                                sx={{ color: CHANGE_NEW_COLOR, fontWeight: 700 }}
                            >
                                {ch.after}
                            </Typography>
                            <Typography variant="caption" color="text.disabled" component="span" sx={{ ml: 0.4 }}>
                                ({ch.label})
                            </Typography>
                        </li>
                    ))}
                </Box>
            );
        }

        const summary = o.summary ?? o.Summary;
        if (typeof summary === 'string' && summary) {
            return (
                <Typography variant="caption" color="text.secondary">{summary}</Typography>
            );
        }
    }

    return (
        <Typography variant="caption" color="text.disabled">
            {ACTION_LABELS[action] ? `${ACTION_LABELS[action]}.` : 'Record updated.'}
        </Typography>
    );
}

function formatDayKey(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
}

/** e.g. "Yesterday at 1:54 PM" or "Apr 6 at 2:00 PM" */
function formatRelativeTime(iso: string): string {
    const d = new Date(iso);
    const now = new Date();
    const todayStr = now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    if (d.toDateString() === todayStr) return `Today at ${time}`;
    if (d.toDateString() === yesterday.toDateString()) return `Yesterday at ${time}`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ` at ${time}`;
}

function groupByDay(items: TimelineItem[]): { day: string; items: TimelineItem[] }[] {
    const map = new Map<string, TimelineItem[]>();
    for (const it of items) {
        const key = formatDayKey(it.createdAt);
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(it);
    }
    const withTs = [...map.entries()].map(([day, list]) => ({
        day,
        items: list,
        ts: Math.max(...list.map(i => new Date(i.createdAt).getTime())),
    }));
    withTs.sort((a, b) => b.ts - a.ts);
    return withTs.map(({ day, items: list }) => ({ day, items: list }));
}

// ─── Shared compact avatar sizes ──────────────────────────────────────────────
const AVA = { width: 28, height: 28, fontSize: 13 };

export function AdminCompanyChatter() {
    const record = useRecordContext<any>();
    const refresh = useRefresh();
    const { identity } = useGetIdentity();

    const [body, setBody] = React.useState('');
    const [pendingFiles, setPendingFiles] = React.useState<Attachment[]>([]);
    const [posting, setPosting] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    const timeline = React.useMemo((): TimelineItem[] => {
        const raw = record?.timeline;
        if (!Array.isArray(raw)) return [];
        return raw.filter(isTimelineItem);
    }, [record?.id, record?.timeline]);

    const dayGroups = React.useMemo(() => groupByDay(timeline), [timeline]);

    const onPickFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files?.length) return;
        const next: Attachment[] = [];
        for (let i = 0; i < files.length; i++) {
            const f = files[i];
            if (f.size > MAX_ATTACH_BYTES) continue;
            try { next.push(await readFileAsPayload(f)); } catch { /* ignore */ }
        }
        setPendingFiles(p => [...p, ...next]);
        e.target.value = '';
    };

    const send = async () => {
        const id = record?.id;
        if (!id) return;
        const text = body.trim();
        if (!text && pendingFiles.length === 0) return;
        setPosting(true);
        setError(null);
        try {
            const res = await apiFetch(
                `/api/admin/companies/${id}/chatter`,
                {
                    method: 'POST',
                    body: JSON.stringify({ body: text, attachments: pendingFiles }),
                },
                { auth: true, retryOn401: true }
            );
            if (!res.ok) throw new Error('Failed to post');
            setBody('');
            setPendingFiles([]);
            refresh();
        } catch (e: any) {
            setError(e?.message ?? 'Failed to post');
        } finally {
            setPosting(false);
        }
    };

    const displayName = (identity as any)?.fullName || (identity as any)?.email || 'Admin';

    /** Compact chatter / note entry — matches Odoo message style */
    const renderEntry = (m: TimelineItem) => {
        const when = formatRelativeTime(m.createdAt);

        if (m.kind === 'chatter') {
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
                            <Typography sx={{ fontSize: '0.72rem', whiteSpace: 'pre-wrap', mt: 0.25, lineHeight: 1.45, color: 'text.primary' }}>
                                {m.body}
                            </Typography>
                        }
                    />
                </ListItem>
            );
        }

        if (m.kind === 'activity') {
            const notes = m.notes?.trim();
            const hideNotes = notes && looksLikeJsonObject(notes);
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
                            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75, flexWrap: 'wrap' }}>
                                <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, lineHeight: 1.3 }}>
                                    {activityTitle(m.action)}
                                </Typography>
                                <Typography sx={{ fontSize: '0.68rem', color: 'text.disabled', lineHeight: 1.3 }}>
                                    {when}
                                </Typography>
                                {m.adminEmail && (
                                    <Typography sx={{ fontSize: '0.68rem', color: 'text.disabled', lineHeight: 1.3 }}>
                                        · {m.adminEmail}
                                    </Typography>
                                )}
                            </Box>
                        }
                        secondary={
                            notes && !hideNotes ? (
                                <Typography sx={{ fontSize: '0.72rem', whiteSpace: 'pre-wrap', mt: 0.2, lineHeight: 1.4, color: 'text.secondary' }}>
                                    {notes}
                                </Typography>
                            ) : null
                        }
                    />
                </ListItem>
            );
        }

        // audit
        return (
            <ListItem
                alignItems="flex-start"
                sx={{ px: 0.5, py: 0.6, gap: 0.75 }}
                disableGutters
            >
                <ListItemAvatar sx={{ minWidth: 36, mt: 0.25 }}>
                    <Avatar sx={{ ...AVA, bgcolor: 'warning.light' }}>
                        <Security sx={{ fontSize: 14 }} />
                    </Avatar>
                </ListItemAvatar>
                <ListItemText
                    disableTypography
                    primary={
                        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75, flexWrap: 'wrap' }}>
                            <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, lineHeight: 1.3 }}>
                                {ACTION_LABELS[m.action] ?? m.action.replace(/\./g, ' ')}
                            </Typography>
                            <Typography sx={{ fontSize: '0.68rem', color: 'text.disabled', lineHeight: 1.3 }}>
                                {when}
                            </Typography>
                            {m.adminEmail && (
                                <Typography sx={{ fontSize: '0.68rem', color: 'text.disabled', lineHeight: 1.3 }}>
                                    · {m.adminEmail}
                                </Typography>
                            )}
                        </Box>
                    }
                    secondary={
                        <Box sx={{ mt: 0.15 }}>
                            <AuditReadableBody action={m.action} payloadJson={m.payloadJson} />
                        </Box>
                    }
                />
            </ListItem>
        );
    };

    return (
        <Card
            variant="outlined"
            sx={{
                flex: 1,
                minHeight: 0,
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
                {/* ── Compose box ─────────────────────────────────────── */}
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
                        multiline
                        minRows={2}
                        size="small"
                        fullWidth
                        placeholder="Log an internal note…"
                        value={body}
                        onChange={e => setBody(e.target.value)}
                        sx={{
                            bgcolor: 'background.paper',
                            '& .MuiInputBase-input': { fontSize: '0.75rem', py: 0.75 },
                        }}
                    />
                    {pendingFiles.length > 0 && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.4 }}>
                            {pendingFiles.map(f => f.name).filter(Boolean).join(', ')}
                        </Typography>
                    )}
                    {error && (
                        <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.4 }}>
                            {error}
                        </Typography>
                    )}
                    <Box sx={{ display: 'flex', gap: 0.75, mt: 0.75 }}>
                        <Button
                            component="label"
                            variant="outlined"
                            size="small"
                            startIcon={<AttachFile sx={{ fontSize: '14px !important' }} />}
                            sx={{ fontSize: '0.68rem', py: 0.3, px: 1, minWidth: 0 }}
                        >
                            Attach
                            <input type="file" hidden multiple accept="image/*,.pdf,.doc,.docx" onChange={onPickFiles} />
                        </Button>
                        <Button
                            variant="contained"
                            size="small"
                            startIcon={<Send sx={{ fontSize: '14px !important' }} />}
                            onClick={() => void send()}
                            disabled={posting || (!body.trim() && pendingFiles.length === 0)}
                            sx={{
                                fontSize: '0.68rem', py: 0.3, px: 1, minWidth: 0,
                                bgcolor: '#875A7B', '&:hover': { bgcolor: '#6d476a' },
                            }}
                        >
                            Post
                        </Button>
                    </Box>
                </Box>

                {/* ── Timeline ────────────────────────────────────────── */}
                <List dense disablePadding sx={{ flex: 1 }}>
                    {timeline.length === 0 ? (
                        <Typography variant="caption" color="text.secondary" sx={{ py: 1 }}>
                            No activity yet.
                        </Typography>
                    ) : (
                        dayGroups.map(({ day, items }) => (
                            <Box key={day}>
                                {/* Day separator — same as Odoo */}
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, my: 0.75 }}>
                                    <Divider sx={{ flex: 1, borderColor: PANEL_BORDER }} />
                                    <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: 'text.disabled', whiteSpace: 'nowrap' }}>
                                        {day}
                                    </Typography>
                                    <Divider sx={{ flex: 1, borderColor: PANEL_BORDER }} />
                                </Box>

                                {items.map((m, idx) => (
                                    <React.Fragment key={`${m.kind}-${m.id}`}>
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
    );
}