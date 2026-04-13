import * as React from 'react';
import { ListSubheader, MenuItem } from '@mui/material';

export type GlAccountTypeRow = {
    id: number;
    title: string | null;
    mainParent: number | null;
    orderBy: number | null;
    selectable: boolean;
};

/** Odoo-style nested menu: non-selectable rows become section headers; leaf rows are clickable. */
export function renderHierarchicalTypeItems(
    types: GlAccountTypeRow[],
    parentId: number | null,
    depth: number,
    selectedId: number | null,
    onPick: (id: number) => void
): React.ReactNode[] {
    const children = types
        .filter(t => (t.mainParent ?? null) === parentId)
        .sort((a, b) => (Number(a.orderBy) || 0) - (Number(b.orderBy) || 0));
    const nodes: React.ReactNode[] = [];
    for (const t of children) {
        const pad = 1.5 + depth * 2;
        if (t.selectable) {
            nodes.push(
                <MenuItem
                    key={t.id}
                    selected={t.id === selectedId}
                    onClick={() => onPick(t.id)}
                    dense
                    sx={{
                        pl: pad,
                        fontSize: 13,
                        minHeight: 32,
                        bgcolor: t.id === selectedId ? 'action.selected' : 'transparent',
                    }}
                >
                    {t.title ?? '—'}
                </MenuItem>
            );
        } else {
            nodes.push(
                <ListSubheader
                    key={`sub-${t.id}`}
                    disableSticky
                    sx={{
                        fontWeight: 700,
                        fontSize: 12,
                        lineHeight: '28px',
                        py: 0,
                        pl: pad,
                        pr: 1,
                        bgcolor: 'action.hover',
                        color: 'text.primary',
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                    }}
                >
                    {t.title ?? '—'}
                </ListSubheader>
            );
            nodes.push(...renderHierarchicalTypeItems(types, t.id, depth + 1, selectedId, onPick));
        }
    }
    return nodes;
}
