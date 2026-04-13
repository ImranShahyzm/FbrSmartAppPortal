import { apiFetch } from '../api/httpClient';
import type { CatalogModelOption } from './permissionCatalogApi';

export type RecordRuleFieldMeta = {
    name: string;
    valueKind: string;
};

/** Ruleable CLR fields mapped in EF (reflection + model). */
export async function fetchRecordRuleFields(
    permissionsPrefix: string,
    modelKey: string
): Promise<RecordRuleFieldMeta[]> {
    const q = new URLSearchParams({
        permissionsPrefix: permissionsPrefix.trim(),
        modelKey: modelKey.trim(),
    });
    const res = await apiFetch(`/api/record-rules/fields?${q.toString()}`, { method: 'GET' });
    if (res.status === 404) return [];
    if (!res.ok) throw new Error(`Record rule fields failed: ${res.status}`);
    const data = (await res.json()) as RecordRuleFieldMeta[];
    return Array.isArray(data) ? data : [];
}

/** Entities marked for record rules that map to a real database table (server-driven list). */
export type RecordRuleTableModel = {
    appId: string;
    permissionsPrefix: string;
    modelKey: string;
    appDisplayName: string;
    resourceLabel: string;
    label: string;
    optionKey: string;
};

export async function fetchRecordRuleTableModels(): Promise<RecordRuleTableModel[]> {
    const res = await apiFetch('/api/record-rules/table-models', { method: 'GET' });
    if (!res.ok) throw new Error(`Table models failed: ${res.status}`);
    const data = (await res.json()) as unknown;
    return Array.isArray(data) ? (data as RecordRuleTableModel[]) : [];
}

export function mapTableModelsToCatalogOptions(rows: RecordRuleTableModel[]): CatalogModelOption[] {
    return rows.map(r => ({
        optionKey: r.optionKey,
        label: r.label,
        permissionsPrefix: r.permissionsPrefix,
        modelKey: r.modelKey,
        resourceLabel: r.resourceLabel,
        appDisplayName: r.appDisplayName,
    }));
}

/** Distinct non-null values for the current company (requires CompanyId on the table). */
export async function fetchRecordRuleFieldValues(
    permissionsPrefix: string,
    modelKey: string,
    fieldName: string,
    take = 200
): Promise<string[]> {
    const q = new URLSearchParams({
        permissionsPrefix: permissionsPrefix.trim(),
        modelKey: modelKey.trim(),
        fieldName: fieldName.trim(),
        take: String(take),
    });
    const res = await apiFetch(`/api/record-rules/field-values?${q.toString()}`, { method: 'GET' });
    if (res.status === 404) return [];
    if (!res.ok) throw new Error(`Record rule values failed: ${res.status}`);
    const data = (await res.json()) as { values?: string[] };
    return Array.isArray(data?.values) ? data.values : [];
}

export type RecordRuleModelFieldSettingRow = {
    name: string;
    valueKind: string;
    enabled: boolean;
    suggestedDefault: boolean;
};

export type RecordRuleModelFieldSettingsPayload = {
    permissionsPrefix: string;
    modelKey: string;
    fields: RecordRuleModelFieldSettingRow[];
};

/** Developer UI: all ruleable fields with enable flags (requires security group write permission). */
export async function fetchRecordRuleModelFieldSettings(
    permissionsPrefix: string,
    modelKey: string
): Promise<RecordRuleModelFieldSettingsPayload> {
    const q = new URLSearchParams({
        permissionsPrefix: permissionsPrefix.trim(),
        modelKey: modelKey.trim(),
    });
    const res = await apiFetch(`/api/record-rules/model-field-settings?${q.toString()}`, { method: 'GET' });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = typeof err?.message === 'string' ? err.message : `Field settings failed: ${res.status}`;
        throw new Error(msg);
    }
    return (await res.json()) as RecordRuleModelFieldSettingsPayload;
}

export async function saveRecordRuleModelFieldSettings(
    permissionsPrefix: string,
    modelKey: string,
    fields: RecordRuleModelFieldSettingRow[]
): Promise<RecordRuleModelFieldSettingsPayload> {
    const res = await apiFetch('/api/record-rules/model-field-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            permissionsPrefix: permissionsPrefix.trim(),
            modelKey: modelKey.trim(),
            fields: fields.map(f => ({ fieldName: f.name, enabled: f.enabled })),
        }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = typeof err?.message === 'string' ? err.message : `Save failed: ${res.status}`;
        throw new Error(msg);
    }
    return (await res.json()) as RecordRuleModelFieldSettingsPayload;
}

/** Remove saved toggles; model uses heuristic defaults again. */
export async function deleteRecordRuleModelFieldSettings(
    permissionsPrefix: string,
    modelKey: string
): Promise<void> {
    const q = new URLSearchParams({
        permissionsPrefix: permissionsPrefix.trim(),
        modelKey: modelKey.trim(),
    });
    const res = await apiFetch(`/api/record-rules/model-field-settings?${q.toString()}`, { method: 'DELETE' });
    if (!res.ok && res.status !== 204) {
        const err = await res.json().catch(() => ({}));
        const msg = typeof err?.message === 'string' ? err.message : `Reset failed: ${res.status}`;
        throw new Error(msg);
    }
}
