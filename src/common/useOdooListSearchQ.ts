import * as React from 'react';
import { useListContext } from 'react-admin';

/**
 * Debounced `q` filter that merges into current filters without re-running when
 * `filterValues` identity changes — avoids react-admin resetting the list page.
 * Same pattern as `FbrInvoiceList` (orders).
 */
export function useOdooListSearchQ(): readonly [string, React.Dispatch<React.SetStateAction<string>>] {
    const { filterValues, setFilters } = useListContext();
    const [q, setQ] = React.useState<string>(String((filterValues as { q?: string })?.q ?? ''));

    React.useEffect(() => {
        setQ(String((filterValues as { q?: string })?.q ?? ''));
    }, [(filterValues as { q?: string })?.q]);

    const filterValuesRef = React.useRef(filterValues);
    filterValuesRef.current = filterValues;
    const setFiltersRef = React.useRef(setFilters);
    setFiltersRef.current = setFilters;

    React.useEffect(() => {
        const t = window.setTimeout(() => {
            const next = q.trim();
            const fv = filterValuesRef.current as Record<string, unknown>;
            const cur = String(fv.q ?? '').trim();
            if (cur === next) return;
            setFiltersRef.current({ ...fv, q: next || undefined } as never, null);
        }, 250);
        return () => window.clearTimeout(t);
    }, [q]);

    return [q, setQ] as const;
}
