import * as React from 'react';
import { useTranslate } from 'react-admin';
import Email from '@mui/icons-material/Email';
import Person from '@mui/icons-material/Person';
import {
    Avatar,
    Box,
    CircularProgress,
    Popover,
    Typography,
} from '@mui/material';

import {
    fetchMentionUserProfile,
    type MentionUserProfile,
} from '../../api/recordThreadApi';

type BodyPart =
    | { type: 'text'; text: string }
    | { type: 'mention'; userId: string; label: string };

function profileForId(
    profiles: Record<string, MentionUserProfile>,
    id: string
): MentionUserProfile | undefined {
    const t = id.trim();
    return profiles[t] ?? profiles[t.toLowerCase()] ?? profiles[t.toUpperCase()];
}

/** Build mention tags from stored ids and by matching @text in the body to profile names (handles id/key quirks). */
function collectMentionTags(
    body: string,
    mentionedUserIds: string[] | null | undefined,
    profiles: Record<string, MentionUserProfile>
): { id: string; label: string }[] {
    const map = new Map<string, { id: string; label: string }>();

    for (const rawId of mentionedUserIds ?? []) {
        const id = String(rawId).trim();
        if (!id) continue;
        const p = profileForId(profiles, id);
        const label = (p?.fullName || p?.username || '').trim();
        if (label) map.set(id, { id, label });
    }

    const re = /@([^@\n]+?)(?=\s|$|[.,;:!?])/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(body)) !== null) {
        const label = m[1].trim();
        if (!label) continue;
        for (const p of Object.values(profiles)) {
            const fn = p.fullName?.trim();
            const un = p.username?.trim();
            if (fn === label || un === label) {
                const id = String(p.id);
                if (!map.has(id)) map.set(id, { id, label });
                break;
            }
        }
    }

    return Array.from(map.values()).sort((a, b) => b.label.length - a.label.length);
}

/** Split note body into plain text and @mention segments using stored ids + profile labels. */
export function parseMentionParts(
    body: string,
    mentionedUserIds: string[] | null | undefined,
    profiles: Record<string, MentionUserProfile>
): BodyPart[] {
    const tags = collectMentionTags(body, mentionedUserIds, profiles);

    const parts: BodyPart[] = [];
    let i = 0;
    while (i < body.length) {
        if (body[i] !== '@') {
            const start = i;
            while (i < body.length && body[i] !== '@') i++;
            if (start < i) parts.push({ type: 'text', text: body.slice(start, i) });
            continue;
        }
        const afterAt = body.slice(i + 1);
        let hit: { id: string; label: string } | null = null;
        for (const t of tags) {
            if (afterAt.startsWith(t.label)) {
                const boundary = afterAt[t.label.length];
                if (boundary === undefined || /[\s.,;:!?]/.test(boundary)) {
                    hit = t;
                    break;
                }
            }
        }
        if (hit) {
            parts.push({ type: 'mention', userId: hit.id, label: hit.label });
            i += 1 + hit.label.length;
        } else {
            parts.push({ type: 'text', text: '@' });
            i += 1;
        }
    }
    return parts;
}

type MentionSpanProps = {
    userId: string;
    label: string;
    profile: MentionUserProfile | undefined;
    resourceKey: string;
    onProfileResolved: (userId: string, profile: MentionUserProfile) => void;
};

const CLOSE_DELAY_MS = 450;

function MentionSpan({
    userId,
    label,
    profile,
    resourceKey,
    onProfileResolved,
}: MentionSpanProps) {
    const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
    const [fetching, setFetching] = React.useState(false);
    const closeTimer = React.useRef<number | null>(null);

    const open = Boolean(anchorEl);
    const display = profile;

    const clearClose = () => {
        if (closeTimer.current != null) {
            window.clearTimeout(closeTimer.current);
            closeTimer.current = null;
        }
    };

    const scheduleClose = () => {
        clearClose();
        closeTimer.current = window.setTimeout(() => setAnchorEl(null), CLOSE_DELAY_MS);
    };

    const onRootEnter = (e: React.MouseEvent<HTMLElement>) => {
        clearClose();
        setAnchorEl(e.currentTarget);
        if (!display && !fetching) {
            setFetching(true);
            fetchMentionUserProfile(resourceKey, userId)
                .then(p => {
                    if (p) onProfileResolved(userId, p);
                })
                .finally(() => setFetching(false));
        }
    };

    return (
        <Box
            component="div"
            onMouseEnter={onRootEnter}
            onMouseLeave={scheduleClose}
            sx={{
                position: 'relative',
                display: 'inline-block',
                color: 'primary.main',
                fontWeight: 600,
                cursor: 'default',
                borderBottom: '1px dotted',
                borderColor: 'primary.light',
                verticalAlign: 'baseline',
                '&::after': {
                    content: '""',
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: '100%',
                    height: 12,
                    zIndex: 1,
                },
            }}
        >
            @{label}
            <Popover
                open={open}
                anchorEl={anchorEl}
                onClose={() => {
                    clearClose();
                    setAnchorEl(null);
                }}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                disableRestoreFocus
                disableAutoFocus
                disableEnforceFocus
                disableScrollLock
                disablePortal
                slotProps={{
                    paper: {
                        onMouseEnter: clearClose,
                        sx: {
                            mt: '-8px',
                            p: 1.5,
                            maxWidth: 300,
                            boxShadow: 3,
                        },
                    },
                }}
            >
                <MentionProfileContent
                    profile={display}
                    loading={fetching && !display}
                    labelFallback={label}
                />
            </Popover>
        </Box>
    );
}

function MentionProfileContent({
    profile,
    loading,
    labelFallback,
}: {
    profile: MentionUserProfile | undefined;
    loading: boolean;
    labelFallback: string;
}) {
    const translate = useTranslate();
    if (loading) {
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 200 }}>
                <CircularProgress size={18} />
                <Typography variant="caption" color="text.secondary">
                    {translate('shell.recordThread.profile_loading', { _: 'Loading…' })}
                </Typography>
            </Box>
        );
    }
    if (!profile) {
        return (
            <Typography variant="caption" color="text.secondary">
                {translate('shell.recordThread.profile_unavailable', { _: 'Profile unavailable.' })}
            </Typography>
        );
    }

    const initial = (profile.fullName || profile.username || '?').charAt(0).toUpperCase();

    return (
        <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start' }}>
            <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.light', fontSize: '1rem' }}>
                {initial}
            </Avatar>
            <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom sx={{ lineHeight: 1.3 }}>
                    {profile.fullName || labelFallback}
                </Typography>
                {profile.email ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                        <Email sx={{ fontSize: 14, color: 'text.secondary', flexShrink: 0 }} />
                        <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
                            {profile.email}
                        </Typography>
                    </Box>
                ) : null}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.35 }}>
                    <Person sx={{ fontSize: 14, color: 'text.secondary', flexShrink: 0 }} />
                    <Typography variant="caption" color="text.secondary">
                        {profile.username}
                    </Typography>
                </Box>
                <Typography variant="caption" color="text.disabled" sx={{ mt: 0.75, display: 'block' }}>
                    {translate('shell.recordThread.profile_phone', { _: 'Phone' })}:{' '}
                    {profile.phone?.trim() ? profile.phone : '—'}
                </Typography>
            </Box>
        </Box>
    );
}

type MentionNoteBodyProps = {
    body: string;
    mentionedUserIds?: string[] | null;
    mentionProfiles: Record<string, MentionUserProfile>;
    resourceKey: string;
    onProfileResolved: (userId: string, profile: MentionUserProfile) => void;
};

/**
 * Renders note text with hover cards for @mentions (uses mentionedUserIds + mentionProfiles to locate names).
 */
export function MentionNoteBody({
    body,
    mentionedUserIds,
    mentionProfiles,
    resourceKey,
    onProfileResolved,
}: MentionNoteBodyProps) {
    const parts = React.useMemo(
        () => parseMentionParts(body, mentionedUserIds, mentionProfiles),
        [body, mentionedUserIds, mentionProfiles]
    );

    return (
        <>
            {parts.map((part, idx) =>
                part.type === 'text' ? (
                    <React.Fragment key={idx}>{part.text}</React.Fragment>
                ) : (
                    <MentionSpan
                        key={`${part.userId}-${idx}`}
                        userId={part.userId}
                        label={part.label}
                        profile={profileForId(mentionProfiles, part.userId)}
                        resourceKey={resourceKey}
                        onProfileResolved={onProfileResolved}
                    />
                )
            )}
        </>
    );
}
