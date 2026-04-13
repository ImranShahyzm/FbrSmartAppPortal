import * as React from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import {
    Autocomplete,
    Box,
    Checkbox,
    CircularProgress,
    IconButton,
    MenuItem,
    Select,
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
    excelGridBodyCellSx,
    excelGridDragHandleCellSx,
    excelGridDragHandleIconWrapperSx,
    excelGridInlineFieldSx,
    excelGridTableContainerSx,
    excelGridTableSx,
} from '../common/themeSharedStyles';
import { type CatalogModelOption, type RecordRuleFormRow } from './permissionCatalogApi';
import {
    fetchRecordRuleFieldValues,
    fetchRecordRuleFields,
    fetchRecordRuleTableModels,
    mapTableModelsToCatalogOptions,
    type RecordRuleFieldMeta,
} from './recordRuleMetadataApi';
import { RECORD_RULE_CONTEXT_REFS, RECORD_RULE_OPERATORS } from './recordRuleModelFields';
import {
    buildRightOperandJson,
    parseRightOperandJson,
    type OperandKind,
} from './recordRuleOperands';

const BRAND = '#017E84';

function moveArrayItem<T>(list: T[], from: number, to: number): T[] {
    if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
    const next = [...list];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    return next;
}

function emptyRecordRuleRow(): RecordRuleFormRow {
    return {
        name: '',
        permissionsPrefix: '',
        modelKey: '',
        fieldName: '',
        ruleOperator: 'eq',
        rightOperandJson: JSON.stringify({ kind: 'context', ref: 'currentUser.companyId' }),
        applyRead: true,
        applyWrite: false,
        applyCreate: false,
        applyDelete: false,
    };
}

function optionForRow(row: RecordRuleFormRow, options: CatalogModelOption[]): CatalogModelOption | null {
    const p = String(row.permissionsPrefix ?? '').trim();
    const m = String(row.modelKey ?? '').trim();
    if (!p || !m) return null;
    return options.find(o => o.permissionsPrefix === p && o.modelKey === m) ?? null;
}

function useRecordRuleFields(permissionsPrefix: string | undefined, modelKey: string | undefined) {
    const key =
        permissionsPrefix && modelKey ? `${permissionsPrefix.trim()}::${modelKey.trim()}` : '';
    const [fields, setFields] = React.useState<RecordRuleFieldMeta[]>([]);
    const [loading, setLoading] = React.useState(false);
    React.useEffect(() => {
        if (!key || !permissionsPrefix || !modelKey) {
            setFields([]);
            return;
        }
        let cancelled = false;
        setLoading(true);
        fetchRecordRuleFields(permissionsPrefix, modelKey)
            .then(rows => {
                if (!cancelled) setFields(rows);
            })
            .catch(() => {
                if (!cancelled) setFields([]);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [key, permissionsPrefix, modelKey]);
    return { fields, loading };
}

export function SecurityGroupRecordRulesTabPanel() {
    const { setValue } = useFormContext();
    const rows = (useWatch({ name: 'recordRules' }) as RecordRuleFormRow[] | undefined) ?? [];

    const [modelOptions, setModelOptions] = React.useState<CatalogModelOption[]>([]);
    const dragFromDisplayIdx = React.useRef<number | null>(null);

    React.useEffect(() => {
        let cancelled = false;
        fetchRecordRuleTableModels()
            .then(rows => {
                if (!cancelled) setModelOptions(mapTableModelsToCatalogOptions(rows));
            })
            .catch(() => {
                if (!cancelled) setModelOptions([]);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const sync = (next: RecordRuleFormRow[]) => {
        setValue('recordRules', next, { shouldDirty: true, shouldTouch: true });
    };

    const patchRow = (index: number, patch: Partial<RecordRuleFormRow>) => {
        const next = rows.map((r, i) => (i === index ? { ...r, ...patch } : r));
        sync(next);
    };

    const removeRow = (index: number) => {
        sync(rows.filter((_, j) => j !== index));
    };

    const addRow = () => {
        sync([...rows, emptyRecordRuleRow()]);
    };

    const onDragStartRow = (displayIdx: number) => {
        dragFromDisplayIdx.current = displayIdx;
    };

    const onDropRow = (displayTo: number) => {
        const fromDisplay = dragFromDisplayIdx.current;
        dragFromDisplayIdx.current = null;
        if (fromDisplay == null) return;
        sync(moveArrayItem(rows, fromDisplay, displayTo));
    };

    return (
        <Box sx={{ width: '100%', p: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12, mb: 1, lineHeight: 1.6 }}>
                Pick a catalog model: fields come from the entity automatically. Value suggestions load from your
                database for the current company (distinct values). Combine rules with AND inside a group; groups combine
                with OR.
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
                            <TableCell
                                width={32}
                                sx={{ ...excelGridBodyCellSx, fontWeight: 600, bgcolor: 'background.paper' }}
                            />
                            <TableCell sx={{ ...excelGridBodyCellSx, fontWeight: 600, minWidth: 100, bgcolor: 'background.paper' }}>
                                Name
                            </TableCell>
                            <TableCell sx={{ ...excelGridBodyCellSx, fontWeight: 600, minWidth: 200, bgcolor: 'background.paper' }}>
                                Model
                            </TableCell>
                            <TableCell sx={{ ...excelGridBodyCellSx, fontWeight: 600, minWidth: 90, bgcolor: 'background.paper' }}>
                                Field
                            </TableCell>
                            <TableCell sx={{ ...excelGridBodyCellSx, fontWeight: 600, width: 72, bgcolor: 'background.paper' }}>
                                Op
                            </TableCell>
                            <TableCell sx={{ ...excelGridBodyCellSx, fontWeight: 600, minWidth: 240, bgcolor: 'background.paper' }}>
                                Value
                            </TableCell>
                            {(['applyRead', 'applyWrite', 'applyCreate', 'applyDelete'] as const).map(field => {
                                const label =
                                    field === 'applyRead'
                                        ? 'Read'
                                        : field === 'applyWrite'
                                          ? 'Write'
                                          : field === 'applyCreate'
                                            ? 'Create'
                                            : 'Delete';
                                return (
                                    <TableCell
                                        key={field}
                                        align="center"
                                        sx={{ ...excelGridBodyCellSx, fontWeight: 600, width: 56, bgcolor: 'background.paper' }}
                                    >
                                        <Typography variant="caption" sx={{ fontSize: 9, lineHeight: 1 }}>
                                            {label}
                                        </Typography>
                                    </TableCell>
                                );
                            })}
                            <TableCell width={40} sx={{ ...excelGridBodyCellSx, bgcolor: 'background.paper' }} />
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={12} sx={{ ...excelGridBodyCellSx, color: 'text.secondary', fontSize: 12 }}>
                                    No record rules yet. Add a line to restrict rows by field conditions.
                                </TableCell>
                            </TableRow>
                        ) : (
                            rows.map((row, displayIdx) => (
                                <RecordRuleTableRow
                                    key={`rr-${displayIdx}`}
                                    row={row}
                                    displayIdx={displayIdx}
                                    modelOptions={modelOptions}
                                    patchRow={patchRow}
                                    removeRow={removeRow}
                                    onDragStartRow={onDragStartRow}
                                    onDropRow={onDropRow}
                                />
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}

function RecordRuleTableRow({
    row,
    displayIdx,
    modelOptions,
    patchRow,
    removeRow,
    onDragStartRow,
    onDropRow,
}: {
    row: RecordRuleFormRow;
    displayIdx: number;
    modelOptions: CatalogModelOption[];
    patchRow: (index: number, patch: Partial<RecordRuleFormRow>) => void;
    removeRow: (index: number) => void;
    onDragStartRow: (displayIdx: number) => void;
    onDropRow: (displayTo: number) => void;
}) {
    const matched = optionForRow(row, modelOptions);
    const inputValue = matched ? matched.label : `${row.permissionsPrefix ?? ''} ${row.modelKey ?? ''}`.trim();
    const { fields: fieldMeta, loading: fieldsLoading } = useRecordRuleFields(
        row.permissionsPrefix,
        row.modelKey
    );

    return (
        <TableRow
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
                    value={row.name ?? ''}
                    onChange={e => patchRow(displayIdx, { name: e.target.value })}
                    sx={excelGridInlineFieldSx}
                />
            </TableCell>
            <TableCell sx={excelGridBodyCellSx}>
                <Autocomplete
                    freeSolo
                    size="small"
                    options={modelOptions}
                    value={matched}
                    inputValue={inputValue}
                    onInputChange={(_, val, reason) => {
                        if (reason === 'clear') {
                            patchRow(displayIdx, {
                                modelKey: '',
                                permissionsPrefix: '',
                                fieldName: '',
                            });
                            return;
                        }
                        if (reason !== 'input') return;
                        const exact = modelOptions.find(o => o.modelKey === val || o.label === val);
                        if (exact) {
                            patchRow(displayIdx, {
                                modelKey: exact.modelKey,
                                permissionsPrefix: exact.permissionsPrefix,
                                fieldName: '',
                            });
                        } else {
                            patchRow(displayIdx, { modelKey: val });
                        }
                    }}
                    onChange={(_, opt) => {
                        if (opt == null) return;
                        if (typeof opt === 'string') {
                            patchRow(displayIdx, { modelKey: opt });
                            return;
                        }
                        patchRow(displayIdx, {
                            modelKey: opt.modelKey,
                            permissionsPrefix: opt.permissionsPrefix,
                            fieldName: '',
                        });
                    }}
                    getOptionLabel={o => (typeof o === 'string' ? o : o.label)}
                    isOptionEqualToValue={(a, b) => !!a && !!b && a.optionKey === b.optionKey}
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
                            sx={excelGridInlineFieldSx}
                        />
                    )}
                />
            </TableCell>
            <TableCell sx={excelGridBodyCellSx}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 88 }}>
                    {fieldsLoading ? <CircularProgress size={14} /> : null}
                    <Select
                        size="small"
                        variant="standard"
                        displayEmpty
                        value={row.fieldName ?? ''}
                        onChange={e => patchRow(displayIdx, { fieldName: String(e.target.value) })}
                        sx={{ ...excelGridInlineFieldSx, minWidth: 88, flex: 1 }}
                    >
                        <MenuItem value="">
                            <em>Field</em>
                        </MenuItem>
                        {fieldMeta.map(f => (
                            <MenuItem key={f.name} value={f.name}>
                                {f.name}
                            </MenuItem>
                        ))}
                    </Select>
                </Box>
            </TableCell>
            <TableCell sx={excelGridBodyCellSx}>
                <Select
                    size="small"
                    variant="standard"
                    value={row.ruleOperator ?? 'eq'}
                    onChange={e => patchRow(displayIdx, { ruleOperator: String(e.target.value) })}
                    sx={{ ...excelGridInlineFieldSx, minWidth: 72 }}
                >
                    {RECORD_RULE_OPERATORS.map(op => (
                        <MenuItem key={op.value} value={op.value}>
                            {op.label}
                        </MenuItem>
                    ))}
                </Select>
            </TableCell>
            <TableCell sx={excelGridBodyCellSx}>
                <OperandValueCell
                    row={row}
                    onChange={json => patchRow(displayIdx, { rightOperandJson: json })}
                />
            </TableCell>
            {(['applyRead', 'applyWrite', 'applyCreate', 'applyDelete'] as const).map(field => (
                <TableCell key={field} align="center" sx={excelGridBodyCellSx}>
                    <Checkbox
                        size="small"
                        checked={Boolean(row[field])}
                        onChange={e => patchRow(displayIdx, { [field]: e.target.checked })}
                    />
                </TableCell>
            ))}
            <TableCell sx={excelGridBodyCellSx}>
                <IconButton size="small" onClick={() => removeRow(displayIdx)} aria-label="Delete row">
                    <DeleteOutlineIcon sx={{ fontSize: 18 }} />
                </IconButton>
            </TableCell>
        </TableRow>
    );
}

function OperandValueCell({
    row,
    onChange,
}: {
    row: RecordRuleFormRow;
    onChange: (json: string) => void;
}) {
    const prefix = String(row.permissionsPrefix ?? '').trim();
    const modelKey = String(row.modelKey ?? '').trim();
    const fieldName = String(row.fieldName ?? '').trim();
    const op = row.ruleOperator ?? 'eq';

    const parsed = React.useMemo(() => parseRightOperandJson(row.rightOperandJson), [row.rightOperandJson]);
    const kind: OperandKind = parsed.kind;
    const ctxRef = parsed.contextRef ?? 'currentUser.companyId';
    const lit =
        parsed.kind === 'literal'
            ? parsed.literal === undefined || parsed.literal === null
                ? ''
                : String(parsed.literal)
            : '';
    const litList =
        parsed.kind === 'literalList' && Array.isArray(parsed.literalList)
            ? parsed.literalList.map(v => String(v))
            : [];

    const [litDraft, setLitDraft] = React.useState(lit);
    React.useEffect(() => {
        setLitDraft(lit);
    }, [lit]);

    const [samples, setSamples] = React.useState<string[]>([]);
    const [loadingSamples, setLoadingSamples] = React.useState(false);

    React.useEffect(() => {
        if (!prefix || !modelKey || !fieldName) {
            setSamples([]);
            return;
        }
        let cancelled = false;
        setLoadingSamples(true);
        fetchRecordRuleFieldValues(prefix, modelKey, fieldName)
            .then(v => {
                if (!cancelled) setSamples(v);
            })
            .catch(() => {
                if (!cancelled) setSamples([]);
            })
            .finally(() => {
                if (!cancelled) setLoadingSamples(false);
            });
        return () => {
            cancelled = true;
        };
    }, [prefix, modelKey, fieldName]);

    const listMode = op === 'in' || op === 'notin';

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, minWidth: 0 }}>
            <Select
                size="small"
                variant="standard"
                value={kind}
                onChange={e => {
                    const k = e.target.value as OperandKind;
                    if (k === 'context') onChange(buildRightOperandJson('context', ctxRef, '', ''));
                    else if (k === 'literal') onChange(buildRightOperandJson('literal', '', lit || '', ''));
                    else onChange(buildRightOperandJson('literalList', '', '', litList.join(',')));
                }}
                sx={{ fontSize: 12 }}
            >
                <MenuItem value="context">Context (user)</MenuItem>
                <MenuItem value="literal">Value from data</MenuItem>
                <MenuItem value="literalList">List of values</MenuItem>
            </Select>
            {kind === 'context' && (
                <Select
                    size="small"
                    variant="standard"
                    value={ctxRef}
                    onChange={e =>
                        onChange(buildRightOperandJson('context', String(e.target.value), '', ''))
                    }
                    sx={{ fontSize: 12 }}
                >
                    {RECORD_RULE_CONTEXT_REFS.map(r => (
                        <MenuItem key={r.value} value={r.value}>
                            {r.label}
                        </MenuItem>
                    ))}
                </Select>
            )}
            {kind === 'literal' && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {loadingSamples ? <CircularProgress size={14} /> : null}
                    <Autocomplete
                        freeSolo
                        size="small"
                        options={samples}
                        value={litDraft}
                        inputValue={litDraft}
                        onChange={(_, v) => {
                            const s = typeof v === 'string' ? v : '';
                            setLitDraft(s);
                            onChange(buildRightOperandJson('literal', '', s, ''));
                        }}
                        onInputChange={(_, v) => {
                            setLitDraft(v);
                            onChange(buildRightOperandJson('literal', '', v, ''));
                        }}
                        renderInput={params => (
                            <TextField
                                {...params}
                                variant="standard"
                                placeholder={samples.length ? 'Pick or type' : 'Type a value'}
                                sx={excelGridInlineFieldSx}
                            />
                        )}
                    />
                </Box>
            )}
            {kind === 'literalList' && (
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                    {loadingSamples ? <CircularProgress size={14} sx={{ mt: 0.5 }} /> : null}
                    <Autocomplete
                        multiple
                        freeSolo
                        size="small"
                        options={samples}
                        value={litList}
                        onChange={(_, v) =>
                            onChange(
                                buildRightOperandJson(
                                    'literalList',
                                    '',
                                    '',
                                    v.map(x => String(x)).join(',')
                                )
                            )
                        }
                        renderInput={params => (
                            <TextField
                                {...params}
                                variant="standard"
                                placeholder={listMode ? 'Pick from data or add' : 'Comma-separated'}
                                sx={excelGridInlineFieldSx}
                            />
                        )}
                    />
                </Box>
            )}
        </Box>
    );
}
