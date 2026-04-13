import { apiFetch } from './httpClient';

export type RecordThreadAttachment = {
    name?: string;
    mime?: string;
    dataBase64?: string;
};

export type RecordThreadMessage = {
    id: string;
    kind: number;
    systemAction?: string | null;
    body: string;
    authorUserId?: string | null;
    authorDisplayName?: string | null;
    createdAtUtc: string;
    attachments?: RecordThreadAttachment[] | null;
    mentionedUserIds?: string[] | null;
};

export type MentionUserOption = {
    id: string;
    fullName: string;
    username: string;
};

/** Enriched profiles for @mention hover (keyed by user id string). */
export type MentionUserProfile = {
    id: string;
    fullName: string;
    username: string;
    email?: string | null;
    phone?: string | null;
};

export type RecordThreadLoadResult = {
    messages: RecordThreadMessage[];
    mentionProfiles: Record<string, MentionUserProfile>;
};

export async function fetchRecordThreadMessages(
    resourceKey: string,
    recordId: string
): Promise<RecordThreadLoadResult> {
    const q = new URLSearchParams({
        resourceKey: resourceKey.trim(),
        recordId: recordId.trim(),
    });
    const res = await apiFetch(`/api/appRecordMessages?${q.toString()}`, { method: 'GET' });
    if (!res.ok) throw new Error(`Messages failed: ${res.status}`);
    const data = (await res.json()) as unknown;
    if (Array.isArray(data)) {
        return { messages: data as RecordThreadMessage[], mentionProfiles: {} };
    }
    if (data && typeof data === 'object' && 'messages' in data) {
        const o = data as { messages?: unknown; mentionProfiles?: unknown };
        const messages = Array.isArray(o.messages) ? (o.messages as RecordThreadMessage[]) : [];
        const mentionProfiles =
            o.mentionProfiles &&
            typeof o.mentionProfiles === 'object' &&
            !Array.isArray(o.mentionProfiles)
                ? (o.mentionProfiles as Record<string, MentionUserProfile>)
                : {};
        return { messages, mentionProfiles };
    }
    return { messages: [], mentionProfiles: {} };
}

export async function postRecordThreadNote(
    resourceKey: string,
    recordId: string,
    body: string,
    attachments: { name: string; mime: string; dataBase64: string }[],
    mentionedUserIds: string[]
): Promise<void> {
    const res = await apiFetch('/api/appRecordMessages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            resourceKey: resourceKey.trim(),
            recordId: recordId.trim(),
            body,
            attachments,
            mentionedUserIds,
        }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = typeof err?.message === 'string' ? err.message : `Post failed: ${res.status}`;
        throw new Error(msg);
    }
}

export async function fetchMentionUserProfile(
    resourceKey: string,
    userId: string
): Promise<MentionUserProfile | null> {
    const params = new URLSearchParams({
        resourceKey: resourceKey.trim(),
        userId: userId.trim(),
    });
    const res = await apiFetch(`/api/appRecordMessages/user-profile?${params.toString()}`, {
        method: 'GET',
    });
    if (!res.ok) return null;
    const row = (await res.json()) as {
        id?: unknown;
        fullName?: unknown;
        username?: unknown;
        email?: unknown;
        phone?: unknown;
    };
    return {
        id: String(row.id ?? userId),
        fullName: String(row.fullName ?? ''),
        username: String(row.username ?? ''),
        email: row.email != null ? String(row.email) : null,
        phone: row.phone != null ? String(row.phone) : null,
    };
}

export async function fetchMentionUserSuggestions(
    resourceKey: string,
    q: string
): Promise<MentionUserOption[]> {
    const params = new URLSearchParams({
        resourceKey: resourceKey.trim(),
        q: q.trim(),
    });
    const res = await apiFetch(`/api/appRecordMessages/user-suggestions?${params.toString()}`, {
        method: 'GET',
    });
    if (!res.ok) return [];
    const data = (await res.json()) as unknown;
    if (!Array.isArray(data)) return [];
    return data.map((row: { id?: unknown; fullName?: unknown; username?: unknown }) => ({
        id: String(row.id ?? ''),
        fullName: String(row.fullName ?? ''),
        username: String(row.username ?? ''),
    }));
}
