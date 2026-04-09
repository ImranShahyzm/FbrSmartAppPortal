/**
 * API / .NET often sends UTC instants without a "Z" suffix. JavaScript then treats them as local time.
 * For *Utc fields, normalize to UTC before formatting so toLocaleString() shows the user's timezone.
 */
export function parseApiUtcInstant(value: unknown): Date | undefined {
    if (value == null || value === '') return undefined;
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? undefined : value;
    }
    if (typeof value === 'number') {
        const d = new Date(value);
        return Number.isNaN(d.getTime()) ? undefined : d;
    }
    if (typeof value !== 'string') return undefined;

    let s = value.trim();
    if (!s) return undefined;

    if (/[zZ]$/.test(s) || /[+-]\d{2}:?\d{2}$/.test(s)) {
        const d = new Date(s);
        return Number.isNaN(d.getTime()) ? undefined : d;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        s = `${s}T00:00:00Z`;
    } else {
        s = s.replace(' ', 'T');
        if (!/[zZ]$/.test(s) && !/[+-]\d{2}:?\d{2}$/.test(s)) {
            s = `${s}Z`;
        }
    }

    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? undefined : d;
}

/** For react-admin DateField `transform` — show stored UTC instants in the browser's local timezone. */
export function utcInstantToLocalDateTransform(value: unknown): Date | undefined {
    return parseApiUtcInstant(value);
}
