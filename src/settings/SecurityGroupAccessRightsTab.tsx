import * as React from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import {
    Autocomplete,
    Box,
    Checkbox,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';

import {
    EXCEL_GRID_ROW_INPUT_MIN_HEIGHT,
    excelGridBodyCellSx,
    excelGridDragHandleCellSx,
    excelGridDragHandleIconWrapperSx,
    excelGridInlineFieldSx,
    excelGridTableContainerSx,
    excelGridTableSx,
} from '../common/themeSharedStyles';
import { menuKeyToAccessPair } from '../apps/appMenuRegistry';
import {
    type AccessRightFormRow,
    type CatalogModelOption,
    buildCatalogModelOptions,
    fetchPermissionCatalog,
} from './permissionCatalogApi';

const BRAND = '#017E84';

function moveArrayItem<T>(list: T[], from: number, to: number): T[] {
    if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
    const next = [...list];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    return next;
}

function emptyAccessRow(): AccessRightFormRow {
    return {
        displayName: '',
        permissionsPrefix: '',
        modelKey: '',
        canRead: false,
        canWrite: false,
        canCreate: false,
        canDelete: false,
    };
}

function rowPairKey(r: AccessRightFormRow): string {
    const p = String(r.permissionsPrefix ?? '').trim().toLowerCase();
    const m = String(r.modelKey ?? '').trim().toLowerCase();
    return `${p}::${m}`;
}

function optionForRow(
    row: AccessRightFormRow,
    options: CatalogModelOption[]
): CatalogModelOption | null {
    const p = String(row.permissionsPrefix ?? '').trim();
    const m = String(row.modelKey ?? '').trim();
    if (!p || !m) return null;
    return options.find(o => o.permissionsPrefix === p && o.modelKey === m) ?? null;
}

type MenuGrantWatch = { menuKey?: string; visible?: boolean };

/**
 * When no menus are granted, show all access rows.
 * When at least one menu is visible, restrict catalog rows to those resources; custom rows always stay visible.
 */
function useMenuFilteredRowIndices(
    rows: AccessRightFormRow[],
    menuGrants: MenuGrantWatch[] | undefined,
    catalogPairKeys: Set<string>
): { filterActive: boolean; originalIndices: number[] } {
    return React.useMemo(() => {
        const mg = menuGrants ?? [];
        if (mg.length === 0) {
            return { filterActive: false, originalIndices: rows.map((_, i) => i) };
        }
        const allowed = new Set<string>();
        for (const m of mg) {
            if (m.visible === false) continue;
            const mk = String(m.menuKey ?? '').trim();
            if (!mk) continue;
            const p = menuKeyToAccessPair(mk);
            if (p) allowed.add(`${p.permissionsPrefix}::${p.modelKey}`.toLowerCase());
        }
        if (allowed.size === 0) {
            return { filterActive: false, originalIndices: rows.map((_, i) => i) };
        }

        const originalIndices: number[] = [];
        rows.forEach((r, i) => {
            const pk = rowPairKey(r);
            if (!pk || pk === '::') {
                originalIndices.push(i);
                return;
            }
            if (!catalogPairKeys.has(pk)) {
                originalIndices.push(i);
                return;
            }
            if (allowed.has(pk)) originalIndices.push(i);
        });

        return { filterActive: true, originalIndices };
    }, [rows, menuGrants, catalogPairKeys]);
}

/** Compact inline-style grid; optional filter by Menus tab selections. */
export function SecurityGroupAccessRightsTabPanel() {
    const { setValue } = useFormContext();
    const rows = (useWatch({ name: 'accessRights' }) as AccessRightFormRow[] | undefined) ?? [];
    const menuGrants = useWatch({ name: 'menuGrants' }) as MenuGrantWatch[] | undefined;

    const [modelOptions, setModelOptions] = React.useState<CatalogModelOption[]>([]);
    const dragFromDisplayIdx = React.useRef<number | null>(null);

    React.useEffect(() => {
        let cancelled = false;
        fetchPermissionCatalog()
            .then(apps => {
                if (!cancelled) setModelOptions(buildCatalogModelOptions(apps));
            })
            .catch(() => {
                if (!cancelled) setModelOptions([]);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const catalogPairKeys = React.useMemo(
        () => new Set(modelOptions.map(o => `${o.permissionsPrefix}::${o.modelKey}`.toLowerCase())),
        [modelOptions]
    );

    const { filterActive, originalIndices } = useMenuFilteredRowIndices(rows, menuGrants, catalogPairKeys);

    const autocompleteOptions = React.useMemo(() => {
        if (!filterActive || !menuGrants?.length) return modelOptions;
        const allowed = new Set<string>();
        for (const m of menuGrants) {
            if (m.visible === false) continue;
            const mk = String(m.menuKey ?? '').trim();
            if (!mk) continue;
            const p = menuKeyToAccessPair(mk);
            if (p) allowed.add(`${p.permissionsPrefix}::${p.modelKey}`.toLowerCase());
        }
        if (allowed.size === 0) return modelOptions;
        return modelOptions.filter(o =>
            allowed.has(`${o.permissionsPrefix}::${o.modelKey}`.toLowerCase())
        );
    }, [modelOptions, filterActive, menuGrants]);

    const sync = (next: AccessRightFormRow[]) => {
        setValue('accessRights', next, { shouldDirty: true, shouldTouch: true });
    };

    const patchRow = (originalIndex: number, patch: Partial<AccessRightFormRow>) => {
        const next = rows.map((r, i) => (i === originalIndex ? { ...r, ...patch } : r));
        sync(next);
    };

    const visibleRows = React.useMemo(
        () => originalIndices.map(i => rows[i]).filter(Boolean) as AccessRightFormRow[],
        [rows, originalIndices]
    );

    const headerTriState = (field: 'canRead' | 'canWrite' | 'canCreate' | 'canDelete') => {
        if (visibleRows.length === 0) return { checked: false, indeterminate: false };
        const n = visibleRows.filter(r => Boolean(r[field])).length;
        return {
            checked: n === visibleRows.length,
            indeterminate: n > 0 && n < visibleRows.length,
        };
    };

    const onHeaderToggle = (field: 'canRead' | 'canWrite' | 'canCreate' | 'canDelete') => {
        const { checked } = headerTriState(field);
        const value = !checked;
        if (originalIndices.length === 0) return;
        const next = [...rows];
        originalIndices.forEach(i => {
            next[i] = { ...next[i], [field]: value };
        });
        sync(next);
    };

    const removeRow = (originalIndex: number) => {
        sync(rows.filter((_, j) => j !== originalIndex));
    };

    const addRow = () => {
        sync([...rows, emptyAccessRow()]);
    };

    const onDragStartRow = (displayIdx: number) => {
        dragFromDisplayIdx.current = displayIdx;
    };

    const onDropRow = (displayTo: number) => {
        const fromDisplay = dragFromDisplayIdx.current;
        dragFromDisplayIdx.current = null;
        if (fromDisplay == null) return;
        const origFrom = originalIndices[fromDisplay];
        const origTo = originalIndices[displayTo];
        if (origFrom == null || origTo == null) return;
        sync(moveArrayItem(rows, origFrom, origTo));
    };

    return (
        <Box sx={{ width: '100%', p: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12, mb: 1, lineHeight: 1.6 }}>
                {filterActive
                    ? 'Showing access rows that match menus selected on the Menus tab. Add a line for a custom resource.'
                    : 'Every resource from the permission catalog is listed here. Select menus on the Menus tab to narrow this list. Toggle Read, Write, Create, or Delete as needed.'}
            </Typography>
            <Box
                role="button"
                tabIndex={0}
                onClick={addRow}
                onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        addRow();
                    }
                }}
                sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.5,
                    px: 1.5,
                    py: '7px',
                    fontSize: 13,
                    color: '#999',
                    cursor: 'pointer',
                    mb: 1,
                    '&:hover': { color: BRAND },
                }}
            >
                <AddCircleOutlineIcon sx={{ fontSize: 18 }} />
                Add a line
            </Box>
            <TableContainer sx={excelGridTableContainerSx}>
                <Table size="small" stickyHeader sx={excelGridTableSx}>
                    <TableHead>
                        <TableRow>
                            <TableCell width={32} sx={{ ...excelGridBodyCellSx, fontWeight: 600, bgcolor: 'background.paper' }} />
                            <TableCell sx={{ ...excelGridBodyCellSx, fontWeight: 600, minWidth: 120, bgcolor: 'background.paper' }}>
                                Name
                            </TableCell>
                            <TableCell sx={{ ...excelGridBodyCellSx, fontWeight: 600, width: 88, bgcolor: 'background.paper' }}>
                                Prefix
                            </TableCell>
                            <TableCell sx={{ ...excelGridBodyCellSx, fontWeight: 600, minWidth: 220, bgcolor: 'background.paper' }}>
                                Model
                            </TableCell>
                            {(['canRead', 'canWrite', 'canCreate', 'canDelete'] as const).map(field => {
                                const label =
                                    field === 'canRead'
                                        ? 'Read'
                                        : field === 'canWrite'
                                          ? 'Write'
                                          : field === 'canCreate'
                                            ? 'Create'
                                            : 'Delete';
                                const { checked, indeterminate } = headerTriState(field);
                                return (
                                    <TableCell
                                        key={field}
                                        align="center"
                                        sx={{ ...excelGridBodyCellSx, fontWeight: 600, width: 64, bgcolor: 'background.paper' }}
                                    >
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                gap: 0,
                                            }}
                                        >
                                            <Checkbox
                                                size="small"
                                                checked={checked}
                                                indeterminate={indeterminate}
                                                onChange={() => onHeaderToggle(field)}
                                                inputProps={{ 'aria-label': `Toggle all ${label}` }}
                                            />
                                            <Typography
                                                component="span"
                                                variant="caption"
                                                sx={{ fontSize: 9, lineHeight: 1 }}
                                            >
                                                {label}
                                            </Typography>
                                        </Box>
                                    </TableCell>
                                );
                            })}
                            <TableCell width={40} sx={{ ...excelGridBodyCellSx, bgcolor: 'background.paper' }} />
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {originalIndices.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={9} sx={{ ...excelGridBodyCellSx, color: 'text.secondary', fontSize: 12 }}>
                                    {rows.length === 0
                                        ? 'No rows yet.'
                                        : 'No access rows match the menus you selected. Clear menus or pick different menus to see catalog resources.'}
                                </TableCell>
                            </TableRow>
                        ) : (
                            originalIndices.map((origIdx, displayIdx) => {
                                const row = rows[origIdx];
                                const matched = optionForRow(row, modelOptions);
                                const inputValue = matched ? matched.label : (row.modelKey ?? '');
                                return (
                                    <TableRow
                                        key={`${origIdx}-${row.permissionsPrefix}-${row.modelKey}`}
                                        hover
                                        draggable
                                        onDragStart={() => onDragStartRow(displayIdx)}
                                        onDragOver={e => e.preventDefault()}
                                        onDrop={() => onDropRow(displayIdx)}
                                    >
                                        <TableCell sx={excelGridDragHandleCellSx}>
                                            <Box sx={excelGridDragHandleIconWrapperSx}>
                                                <DragIndicatorIcon sx={{ fontSize: 15 }} />
                                            </Box>
                                        </TableCell>
                                        <TableCell sx={excelGridBodyCellSx}>
                                            <TextField
                                                variant="standard"
                                                fullWidth
                                                value={row.displayName ?? ''}
                                                onChange={e => patchRow(origIdx, { displayName: e.target.value })}
                                                sx={excelGridInlineFieldSx}
                                            />
                                        </TableCell>
                                        <TableCell sx={excelGridBodyCellSx}>
                                            <TextField
                                                variant="standard"
                                                fullWidth
                                                value={row.permissionsPrefix ?? ''}
                                                onChange={e => patchRow(origIdx, { permissionsPrefix: e.target.value })}
                                                sx={excelGridInlineFieldSx}
                                            />
                                        </TableCell>
                                        <TableCell sx={excelGridBodyCellSx}>
                                            <Autocomplete
                                                freeSolo
                                                size="small"
                                                options={autocompleteOptions}
                                                value={matched}
                                                inputValue={inputValue}
                                                onInputChange={(_, val, reason) => {
                                                    if (reason === 'clear') {
                                                        patchRow(origIdx, {
                                                            modelKey: '',
                                                            permissionsPrefix: '',
                                                            displayName: '',
                                                        });
                                                        return;
                                                    }
                                                    if (reason !== 'input') return;
                                                    const exact = autocompleteOptions.find(
                                                        o => o.modelKey === val || o.label === val
                                                    );
                                                    if (exact) {
                                                        patchRow(origIdx, {
                                                            modelKey: exact.modelKey,
                                                            permissionsPrefix: exact.permissionsPrefix,
                                                            displayName: exact.resourceLabel,
                                                        });
                                                    } else {
                                                        patchRow(origIdx, { modelKey: val });
                                                    }
                                                }}
                                                onChange={(_, opt) => {
                                                    if (opt == null) return;
                                                    if (typeof opt === 'string') {
                                                        patchRow(origIdx, { modelKey: opt });
                                                        return;
                                                    }
                                                    patchRow(origIdx, {
                                                        modelKey: opt.modelKey,
                                                        permissionsPrefix: opt.permissionsPrefix,
                                                        displayName: opt.resourceLabel,
                                                    });
                                                }}
                                                getOptionLabel={o => (typeof o === 'string' ? o : o.label)}
                                                isOptionEqualToValue={(a, b) =>
                                                    !!a && !!b && a.optionKey === b.optionKey
                                                }
                                                filterOptions={(opts, state) => {
                                                    const q = state.inputValue.trim().toLowerCase();
                                                    if (!q) return opts;
                                                    return opts.filter(
                                                        o =>
                                                            o.label.toLowerCase().includes(q) ||
                                                            o.modelKey.toLowerCase().includes(q) ||
                                                            o.permissionsPrefix.toLowerCase().includes(q) ||
                                                            o.appDisplayName.toLowerCase().includes(q)
                                                    );
                                                }}
                                                renderInput={params => (
                                                    <TextField
                                                        {...params}
                                                        variant="standard"
                                                        placeholder="Search models…"
                                                        sx={{
                                                            ...excelGridInlineFieldSx,
                                                            '& .MuiAutocomplete-inputRoot': {
                                                                flexWrap: 'nowrap',
                                                                minHeight: EXCEL_GRID_ROW_INPUT_MIN_HEIGHT,
                                                                py: 0,
                                                            },
                                                        }}
                                                    />
                                                )}
                                            />
                                        </TableCell>
                                        {(['canRead', 'canWrite', 'canCreate', 'canDelete'] as const).map(field => (
                                            <TableCell key={field} align="center" padding="checkbox" sx={excelGridBodyCellSx}>
                                                <Checkbox
                                                    size="small"
                                                    checked={Boolean(row[field])}
                                                    onChange={e => patchRow(origIdx, { [field]: e.target.checked })}
                                                />
                                            </TableCell>
                                        ))}
                                        <TableCell padding="checkbox" sx={excelGridBodyCellSx}>
                                            <IconButton
                                                size="small"
                                                aria-label="Remove row"
                                                onClick={() => removeRow(origIdx)}
                                            >
                                                <DeleteOutlineIcon fontSize="small" />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}
