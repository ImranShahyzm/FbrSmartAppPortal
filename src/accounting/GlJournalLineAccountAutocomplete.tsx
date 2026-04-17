import * as React from 'react';
import { Autocomplete, CircularProgress, TextField } from '@mui/material';
import type { DataProvider } from 'react-admin';
import { useDataProvider } from 'react-admin';

import { excelGridInlineFieldSx } from '../common/themeSharedStyles';

const PAGE_SIZE = 10;
const DEBOUNCE_MS = 300;

export type AccountOption = { id: number; label: string };

function rowToOption(r: Record<string, unknown>): AccountOption {
    const id = Number(r.id);
    const code = String(r.glCode ?? '').trim();
    const title = String(r.glTitle ?? '').trim();
    return { id, label: [code, title].filter(Boolean).join(' — ') || `#${id}` };
}

function mergeById(a: AccountOption[], b: AccountOption[]): AccountOption[] {
    const m = new Map<number, AccountOption>();
    for (const o of a) m.set(o.id, o);
    for (const o of b) m.set(o.id, o);
    return Array.from(m.values());
}

function cacheKey(q: string, page: number): string {
    return `${q.trim()}|${page}`;
}

const inflightFetches = new Map<string, Promise<{ options: AccountOption[]; total: number }>>();
const resultCache = new Map<string, { options: AccountOption[]; total: number; at: number }>();
const RESULT_TTL_MS = 60_000;

async function fetchAccountsPage(
    dataProvider: DataProvider,
    q: string,
    page: number
): Promise<{ options: AccountOption[]; total: number }> {
    const key = cacheKey(q, page);
    const cached = resultCache.get(key);
    if (cached && Date.now() - cached.at < RESULT_TTL_MS) {
        return { options: cached.options, total: cached.total };
    }
    const pending = inflightFetches.get(key);
    if (pending) return pending;

    const promise = (async () => {
        const res = await dataProvider.getList('glChartAccounts', {
            pagination: { page, perPage: PAGE_SIZE },
            sort: { field: 'glCode', order: 'ASC' },
            filter: { postingOnly: true, ...(q.trim() ? { q: q.trim() } : {}) },
        });
        const raw = res.data as Record<string, unknown>[];
        const total = typeof res.total === 'number' && !Number.isNaN(res.total) ? res.total : raw.length;
        const options = raw.map(rowToOption);
        resultCache.set(key, { options, total, at: Date.now() });
        return { options, total };
    })();

    inflightFetches.set(key, promise);
    try {
        return await promise;
    } finally {
        inflightFetches.delete(key);
    }
}

export type GlJournalLineAccountAutocompleteProps = {
    value: number | null;
    onChange: (id: number | null) => void;
    disabled?: boolean;
};

/**
 * Server-paged chart account picker: loads 10 rows per request, searches via API `filter.q`,
 * appends more when the listbox is scrolled to the end.
 */
export function GlJournalLineAccountAutocomplete(props: GlJournalLineAccountAutocompleteProps) {
    const { value, onChange, disabled } = props;
    const dataProvider = useDataProvider();

    const [searchInput, setSearchInput] = React.useState('');
    const [debouncedQ, setDebouncedQ] = React.useState('');
    const [options, setOptions] = React.useState<AccountOption[]>([]);
    const [total, setTotal] = React.useState(0);
    const [page, setPage] = React.useState(1);
    const [loading, setLoading] = React.useState(false);
    const [loadingMore, setLoadingMore] = React.useState(false);
    const [extraOption, setExtraOption] = React.useState<AccountOption | null>(null);

    const searchSeq = React.useRef(0);
    const loadMoreSeq = React.useRef(0);

    React.useEffect(() => {
        const t = window.setTimeout(() => setDebouncedQ(searchInput), DEBOUNCE_MS);
        return () => window.clearTimeout(t);
    }, [searchInput]);

    const runSearch = React.useCallback(
        async (q: string) => {
            const seq = ++searchSeq.current;
            setLoading(true);
            setLoadingMore(false);
            try {
                const { options: next, total: t } = await fetchAccountsPage(dataProvider, q, 1);
                if (seq !== searchSeq.current) return;
                setOptions(next);
                setTotal(t);
                setPage(1);
            } finally {
                if (seq === searchSeq.current) setLoading(false);
            }
        },
        [dataProvider]
    );

    React.useEffect(() => {
        void runSearch(debouncedQ);
    }, [debouncedQ, runSearch]);

    React.useEffect(() => {
        if (value == null || value <= 0) {
            setExtraOption(null);
            return;
        }
        if (options.some(o => o.id === value)) {
            setExtraOption(null);
            return;
        }
        let cancelled = false;
        void dataProvider
            .getOne('glChartAccounts', { id: value })
            .then(({ data }) => {
                if (cancelled) return;
                const row = data as Record<string, unknown>;
                setExtraOption(rowToOption(row));
            })
            .catch(() => {
                if (!cancelled) setExtraOption(null);
            });
        return () => {
            cancelled = true;
        };
    }, [value, options, dataProvider]);

    const valueOption = React.useMemo(() => {
        if (value == null || value <= 0) return null;
        const fromList = options.find(o => o.id === value);
        if (fromList) return fromList;
        return extraOption?.id === value ? extraOption : null;
    }, [value, options, extraOption]);

    /** MUI Autocomplete needs the current value to exist in `options`. */
    const optionsWithValue = React.useMemo(() => {
        if (extraOption && !options.some(o => o.id === extraOption.id)) {
            return [extraOption, ...options];
        }
        return options;
    }, [options, extraOption]);

    const hasMore = options.length < total;

    const loadMore = React.useCallback(async () => {
        if (loading || loadingMore || !hasMore) return;
        const seq = ++loadMoreSeq.current;
        const nextPage = page + 1;
        setLoadingMore(true);
        try {
            const { options: more, total: t } = await fetchAccountsPage(
                dataProvider,
                debouncedQ,
                nextPage
            );
            if (seq !== loadMoreSeq.current) return;
            setOptions(prev => mergeById(prev, more));
            setTotal(t);
            setPage(nextPage);
        } finally {
            if (seq === loadMoreSeq.current) setLoadingMore(false);
        }
    }, [dataProvider, debouncedQ, hasMore, loading, loadingMore, page]);

    const onListboxScroll = React.useCallback(
        (e: React.UIEvent<HTMLUListElement>) => {
            const el = e.currentTarget;
            if (el.scrollTop + el.clientHeight < el.scrollHeight - 48) return;
            void loadMore();
        },
        [loadMore]
    );

    return (
        <Autocomplete<AccountOption, false, false, false>
            size="small"
            disabled={disabled}
            options={optionsWithValue}
            value={valueOption}
            onChange={(_, v) => onChange(v?.id ?? null)}
            onInputChange={(_, v, reason) => {
                if (reason === 'input' || reason === 'clear') setSearchInput(v);
            }}
            onOpen={() => {
                if (options.length === 0 && !loading) void runSearch(debouncedQ);
            }}
            filterOptions={x => x}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            getOptionLabel={o => o.label}
            loading={loading && options.length === 0}
            noOptionsText={loading ? 'Loading…' : 'No accounts'}
            ListboxProps={{
                onScroll: onListboxScroll,
                sx: { maxHeight: 280 },
            }}
            renderInput={params => (
                <TextField
                    {...params}
                    variant="standard"
                    sx={excelGridInlineFieldSx}
                    InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                            <>
                                {loading || loadingMore ? (
                                    <CircularProgress color="inherit" size={14} sx={{ mr: 0.5 }} />
                                ) : null}
                                {params.InputProps.endAdornment}
                            </>
                        ),
                    }}
                />
            )}
        />
    );
}
