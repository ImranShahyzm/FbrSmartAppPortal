import * as React from 'react';
import { Autocomplete, TextField, createFilterOptions } from '@mui/material';
import { useGetList, useInput, required } from 'react-admin';
import { fetchFbrPdiHsUom } from '../api/fbrPdiApi';
import { FieldRow, UNDERLINE_FIELD_WITH_HELPER_SX } from './productProfileCompactForm';

/** If the value is "8432.1010 — long text", keep only the HS code segment for API/storage. */
function normalizeHsStored(raw: string): string {
    const s = raw.trim();
    const sep = ' — ';
    const i = s.indexOf(sep);
    if (i > 0) return s.slice(0, i).trim();
    return s;
}

function useDebouncedValue<T>(value: T, ms: number): T {
    const [debounced, setDebounced] = React.useState(value);
    React.useEffect(() => {
        const t = window.setTimeout(() => setDebounced(value), ms);
        return () => window.clearTimeout(t);
    }, [value, ms]);
    return debounced;
}

export function FbrHsCodeInput(props: { onAllowedUomIdsChange: (ids: number[] | null) => void }) {
    const { onAllowedUomIdsChange } = props;
    const { field, fieldState } = useInput({ source: 'hsCode', validate: required() });
    const [inputValue, setInputValue] = React.useState(String(field.value ?? ''));
    const debouncedQ = useDebouncedValue(inputValue, 300);
    const { data, isPending, isError, error } = useGetList('fbrPdiItemDescCodes', {
        filter: { q: debouncedQ },
        pagination: { page: 1, perPage: 50 },
    });
    const list = data ?? [];
    const options = React.useMemo(() => {
        return (list as Array<{ hsCode?: string; description?: string; id?: string }>)
            .map(r => {
                const code = String(r.hsCode ?? r.id ?? '').trim();
                const desc = String(r.description ?? '').trim();
                if (code && desc) return `${code} — ${desc}`;
                return code || desc;
            })
            .filter(Boolean);
    }, [list]);
    const hsHelper =
        fieldState.error?.message ??
        (isError
            ? `Could not load HS list: ${error?.message ?? 'request failed'}. If this is 401, sign in again. Data: dbo.FbrPdiItemDescCodes (HS from FBR itemdesccode; run Company → Sync FBR reference data).`
            : options.length === 0 && !isPending
              ? 'No synced rows yet, or no match — run Company → Sync FBR reference data (populates FbrPdiItemDescCodes).'
              : undefined);

    React.useEffect(() => {
        setInputValue(String(field.value ?? ''));
    }, [field.value]);

    const runHsUom = React.useCallback(async () => {
        const v = String(field.value ?? '').trim();
        if (!v) {
            onAllowedUomIdsChange(null);
            return;
        }
        try {
            const r = await fetchFbrPdiHsUom(v, 3);
            onAllowedUomIdsChange(r.uomIds.length > 0 ? r.uomIds : null);
        } catch {
            onAllowedUomIdsChange(null);
        }
    }, [field.value, onAllowedUomIdsChange]);

    return (
        <Autocomplete
            freeSolo
            options={options}
            value={field.value ?? ''}
            onChange={(_, v) => {
                const s = typeof v === 'string' ? normalizeHsStored(v) : '';
                field.onChange(s);
                onAllowedUomIdsChange(null);
            }}
            inputValue={inputValue}
            onInputChange={(_, v) => setInputValue(v)}
            onBlur={() => {
                field.onBlur();
                void runHsUom();
            }}
            loading={isPending}
            renderInput={params => (
                <TextField
                    {...params}
                    variant="standard"
                    size="small"
                    label=""
                    placeholder="HS code or search…"
                    error={!!fieldState.error || isError}
                    helperText={hsHelper}
                    required
                    fullWidth
                    sx={UNDERLINE_FIELD_WITH_HELPER_SX}
                />
            )}
        />
    );
}

type UomRow = { id: number; label: string };

const filterUomOptions = createFilterOptions<UomRow>();

export function FbrUomIdInput(props: { allowedUomIds: number[] | null }) {
    const { allowedUomIds } = props;
    const { field, fieldState } = useInput({ source: 'fbrUomId' });
    /** Stable fetch: no per-keystroke server search (avoids list thrash / broken selection). */
    const { data, isPending, isError, error } = useGetList('fbrPdiUoms', {
        filter: { q: '' },
        pagination: { page: 1, perPage: 200 },
    });

    const rows = (data ?? []) as Array<{ id?: number; uomId?: number; description?: string }>;
    const toRow = (r: (typeof rows)[number]): UomRow => {
        const id = Number(r.id ?? r.uomId ?? 0);
        return { id, label: `${r.id ?? r.uomId ?? ''} — ${r.description ?? ''}` };
    };

    const baseRows = React.useMemo(() => rows.map(toRow).filter(x => x.id > 0), [rows]);

    const filtered = React.useMemo(() => {
        if (allowedUomIds != null && allowedUomIds.length > 0) {
            const set = new Set(allowedUomIds);
            return baseRows.filter(x => set.has(x.id));
        }
        return baseRows;
    }, [baseRows, allowedUomIds]);

    const selectedId = field.value != null && field.value !== '' ? Number(field.value) : null;
    const selectedRow =
        (selectedId != null && baseRows.find(x => x.id === selectedId)) ||
        (selectedId != null && filtered.find(x => x.id === selectedId)) ||
        null;

    const uomHelper =
        fieldState.error?.message ??
        (isError
            ? `Could not load UOMs: ${error?.message ?? 'request failed'}. (401: sign in again.)`
            : allowedUomIds != null && allowedUomIds.length > 0
              ? 'Choices limited to UOMs allowed for this HS code (when FBR HS_UOM returns data).'
              : undefined);

    return (
        <Autocomplete
            options={filtered}
            getOptionLabel={o => o.label}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            value={selectedRow}
            onChange={(_, v) => field.onChange(v?.id ?? null)}
            onBlur={field.onBlur}
            loading={isPending}
            filterOptions={filterUomOptions}
            renderInput={params => (
                <TextField
                    {...params}
                    variant="standard"
                    size="small"
                    label=""
                    placeholder="Select UOM…"
                    error={!!fieldState.error || isError}
                    helperText={uomHelper}
                    fullWidth
                    sx={UNDERLINE_FIELD_WITH_HELPER_SX}
                />
            )}
        />
    );
}

export function ProductProfileFbrHsUomFields(props: { allowedUomIds: number[] | null }) {
    return (
        <FieldRow label="FBR UOM (PDI)">
            <FbrUomIdInput allowedUomIds={props.allowedUomIds} />
        </FieldRow>
    );
}
