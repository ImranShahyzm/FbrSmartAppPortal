/** Mirrors backend `RecordRuleRightOperandJson` discriminated JSON. */
export type OperandKind = 'context' | 'literal' | 'literalList';

export const RecordRuleOperand = {
    context(ref: string): string {
        return JSON.stringify({ kind: 'context', ref: ref.trim() });
    },
    literal(value: unknown): string {
        return JSON.stringify({ kind: 'literal', value });
    },
    literalList(values: unknown[]): string {
        return JSON.stringify({ kind: 'literalList', values });
    },
};

export function parseRightOperandJson(json: string | undefined): {
    kind: OperandKind;
    contextRef?: string;
    literal?: unknown;
    literalList?: unknown[];
} {
    if (!json?.trim()) {
        return { kind: 'context', contextRef: 'currentUser.companyId' };
    }
    try {
        const o = JSON.parse(json) as { kind?: string; ref?: string; value?: unknown; values?: unknown[] };
        if (o.kind === 'context' && typeof o.ref === 'string')
            return { kind: 'context', contextRef: o.ref };
        if (o.kind === 'literal') return { kind: 'literal', literal: o.value };
        if (o.kind === 'literalList' && Array.isArray(o.values))
            return { kind: 'literalList', literalList: o.values };
    } catch {
        // ignore
    }
    return { kind: 'context', contextRef: 'currentUser.companyId' };
}

export function buildRightOperandJson(
    kind: OperandKind,
    contextRef: string,
    literalText: string,
    literalListText: string
): string {
    if (kind === 'context') return RecordRuleOperand.context(contextRef || 'currentUser.companyId');
    if (kind === 'literalList') {
        const parts = literalListText
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);
        const values = parts.map(p => {
            const n = Number(p);
            return Number.isFinite(n) && p !== '' && String(n) === p ? n : p;
        });
        return RecordRuleOperand.literalList(values);
    }
    const t = literalText.trim();
    if (t === 'true') return RecordRuleOperand.literal(true);
    if (t === 'false') return RecordRuleOperand.literal(false);
    const n = Number(t);
    if (t !== '' && !Number.isNaN(n) && String(n) === t) return RecordRuleOperand.literal(n);
    return RecordRuleOperand.literal(t);
}
