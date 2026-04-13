import { apiFetch } from '../api/httpClient';

export type PermissionCatalogResource = { key: string; label: string };

export type PermissionCatalogApp = {
    appId: string;
    permissionsPrefix: string;
    displayName: string;
    resources: PermissionCatalogResource[];
};

export type AccessRightFormRow = {
    id?: number;
    displayName?: string;
    permissionsPrefix?: string;
    modelKey?: string;
    canRead?: boolean;
    canWrite?: boolean;
    canCreate?: boolean;
    canDelete?: boolean;
};

export type RecordRuleFormRow = {
    id?: number;
    name?: string;
    permissionsPrefix?: string;
    modelKey?: string;
    domain?: string;
    fieldName?: string;
    ruleOperator?: string;
    rightOperandJson?: string;
    applyRead?: boolean;
    applyWrite?: boolean;
    applyCreate?: boolean;
    applyDelete?: boolean;
};

function normalizeCatalogPayload(raw: unknown): PermissionCatalogApp[] {
    if (!Array.isArray(raw)) return [];
    return raw.map((a: Record<string, unknown>) => ({
        appId: String(a.appId ?? a.AppId ?? ''),
        permissionsPrefix: String(a.permissionsPrefix ?? a.PermissionsPrefix ?? ''),
        displayName: String(a.displayName ?? a.DisplayName ?? ''),
        resources: Array.isArray(a.resources ?? a.Resources)
            ? (a.resources as Record<string, unknown>[]).map(r => ({
                  key: String(r.key ?? r.Key ?? ''),
                  label: String(r.label ?? r.Label ?? r.key ?? r.Key ?? ''),
              }))
            : [],
    }));
}

export async function fetchPermissionCatalog(): Promise<PermissionCatalogApp[]> {
    const res = await apiFetch('/api/security/permission-catalog', { method: 'GET' });
    if (!res.ok) throw new Error(`Permission catalog failed: ${res.status}`);
    const data = await res.json();
    return normalizeCatalogPayload(data);
}

/** Options for Model autocomplete: human-readable label + technical keys for the form row. */
export type CatalogModelOption = {
    /** Stable value for Autocomplete `value` matching */
    optionKey: string;
    /** Shown in dropdown — app name + resource label + technical key */
    label: string;
    permissionsPrefix: string;
    modelKey: string;
    /** Default display name for the access row */
    resourceLabel: string;
    appDisplayName: string;
};

export function buildCatalogModelOptions(apps: PermissionCatalogApp[]): CatalogModelOption[] {
    const out: CatalogModelOption[] = [];
    for (const app of apps) {
        const prefix = app.permissionsPrefix?.trim();
        if (!prefix) continue;
        for (const r of app.resources) {
            const key = r.key?.trim();
            if (!key) continue;
            const resourceLabel = r.label?.trim() || key;
            out.push({
                optionKey: `${prefix}::${key}`,
                label: `${app.displayName} — ${resourceLabel} (${key})`,
                permissionsPrefix: prefix,
                modelKey: key,
                resourceLabel,
                appDisplayName: app.displayName,
            });
        }
    }
    return out.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
}

export function catalogToAccessRights(apps: PermissionCatalogApp[]): AccessRightFormRow[] {
    const rows: AccessRightFormRow[] = [];
    for (const app of apps) {
        const prefix = app.permissionsPrefix?.trim();
        if (!prefix) continue;
        for (const r of app.resources) {
            const key = r.key?.trim();
            if (!key) continue;
            rows.push({
                displayName: r.label?.trim() || key,
                permissionsPrefix: prefix,
                modelKey: key,
                canRead: false,
                canWrite: false,
                canCreate: false,
                canDelete: false,
            });
        }
    }
    return rows;
}

function rowKey(prefix: string, modelKey: string): string {
    return `${String(prefix).toLowerCase()}.${String(modelKey).toLowerCase()}`;
}

/** Full catalog rows; booleans (and optional display name) taken from saved when keys match. Saved-only rows appended. */
export function mergeCatalogWithSaved(
    catalogRows: AccessRightFormRow[],
    saved: AccessRightFormRow[] | undefined
): AccessRightFormRow[] {
    const savedMap = new Map<string, AccessRightFormRow>();
    for (const s of saved ?? []) {
        const p = String(s.permissionsPrefix ?? '').trim();
        const m = String(s.modelKey ?? '').trim();
        if (!p || !m) continue;
        savedMap.set(rowKey(p, m), s);
    }

    const merged = catalogRows.map(row => {
        const p = String(row.permissionsPrefix ?? '').trim();
        const m = String(row.modelKey ?? '').trim();
        const prev = savedMap.get(rowKey(p, m));
        if (!prev) return row;
        return {
            ...row,
            id: prev.id,
            displayName: prev.displayName?.trim() ? prev.displayName : row.displayName,
            canRead: Boolean(prev.canRead),
            canWrite: Boolean(prev.canWrite),
            canCreate: Boolean(prev.canCreate),
            canDelete: Boolean(prev.canDelete),
        };
    });

    const catalogKeys = new Set(
        catalogRows.map(r => rowKey(String(r.permissionsPrefix ?? ''), String(r.modelKey ?? '')))
    );
    for (const s of saved ?? []) {
        const p = String(s.permissionsPrefix ?? '').trim();
        const m = String(s.modelKey ?? '').trim();
        if (!p || !m) continue;
        const k = rowKey(p, m);
        if (!catalogKeys.has(k)) merged.push({ ...s });
    }

    return merged;
}
