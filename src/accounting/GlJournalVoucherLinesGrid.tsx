import * as React from 'react';
import { useFormContext, useFieldArray, Controller, useWatch, useController, type Control } from 'react-hook-form';
import { useTranslate, useGetList } from 'react-admin';
import { IoOptions } from 'react-icons/io5';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import {
    Autocomplete,
    Box,
    Checkbox,
    Chip,
    FormControlLabel,
    FormGroup,
    IconButton,
    Menu,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';

import {
    excelGridTableContainerSx,
    excelGridTableSx,
    excelGridBodyCellSx,
    excelGridDragHandleCellSx,
    excelGridDragHandleIconWrapperSx,
    excelGridInlineFieldSx,
} from '../common/themeSharedStyles';
import { formatMoneyInput, formatMoneyTotals, parseMoney } from './glJournalVoucherMoney';
import type { LineEntryMode } from './glJournalVoucherTransform';
import { GlJournalLineAccountAutocomplete } from './GlJournalLineAccountAutocomplete';

const COLUMN_STORAGE_KEY = 'gl-journal-voucher-line-columns-v4';

export type GlJournalLineRow = {
    glAccountId: number | null;
    narration: string;
    dr: string;
    cr: string;
    fbrSalesTaxRateIds: number[];
    partyId: number | null;
    /** Present when loaded from API; used for PDF / display. */
    glAccountLabel?: string | null;
};

type ColumnKey = 'taxes' | 'partner_ref' | 'line_tax_amount';

const defaultColumns: Record<ColumnKey, boolean> = {
    taxes: true,
    partner_ref: true,
    line_tax_amount: true,
};

function loadColumnPrefs(): Record<ColumnKey, boolean> {
    try {
        const raw = localStorage.getItem(COLUMN_STORAGE_KEY);
        if (!raw) return { ...defaultColumns };
        const parsed = JSON.parse(raw) as Record<string, boolean>;
        if ('tax_amount' in parsed && !('taxes' in parsed)) {
            (parsed as Record<string, boolean>).taxes = Boolean((parsed as { tax_amount?: boolean }).tax_amount);
        }
        return { ...defaultColumns, ...parsed };
    } catch {
        return { ...defaultColumns };
    }
}

function saveColumnPrefs(prefs: Record<ColumnKey, boolean>) {
    localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(prefs));
}

export function emptyGlJournalLine(): GlJournalLineRow {
    return {
        glAccountId: null,
        narration: '',
        dr: '',
        cr: '',
        fbrSalesTaxRateIds: [],
        partyId: null,
    };
}

function computeLineTax(l: GlJournalLineRow | undefined, taxPctById: Map<number, number>): number {
    if (!l) return 0;
    const base = Math.max(parseMoney(l.dr), parseMoney(l.cr));
    const ids = l.fbrSalesTaxRateIds ?? [];
    let sum = 0;
    for (const id of ids) {
        const pct = taxPctById.get(id);
        if (pct != null) sum += base * pct;
    }
    return sum;
}

/** Minimum column widths (px) — must stay in sync with header `TableCell` widths; drives horizontal scroll on narrow viewports. */
const GRID_COL_MIN = {
    drag: 32,
    account: 180,
    narration: 140,
    taxes: 160,
    partner: 160,
    debit: 110,
    credit: 110,
    lineTax: 110,
    actions: 40,
} as const;

function journalLinesTableMinWidth(
    columns: Record<ColumnKey, boolean>,
    hideDebit: boolean,
    hideCredit: boolean
): number {
    return (
        GRID_COL_MIN.drag +
        GRID_COL_MIN.account +
        GRID_COL_MIN.narration +
        (columns.taxes ? GRID_COL_MIN.taxes : 0) +
        (columns.partner_ref ? GRID_COL_MIN.partner : 0) +
        (hideDebit ? 0 : GRID_COL_MIN.debit) +
        (hideCredit ? 0 : GRID_COL_MIN.credit) +
        (columns.line_tax_amount ? GRID_COL_MIN.lineTax : 0) +
        GRID_COL_MIN.actions
    );
}

const journalGridThSx = {
    ...excelGridBodyCellSx,
    fontWeight: 700,
    fontSize: 13,
    color: 'text.secondary',
    bgcolor: 'action.hover',
    whiteSpace: 'nowrap' as const,
    py: '10px',
    minHeight: 40,
    verticalAlign: 'middle' as const,
};

const narrationReadOnlyTooltipSx = {
    tooltip: {
        sx: {
            bgcolor: 'common.black',
            color: 'common.white',
            maxWidth: 440,
            whiteSpace: 'pre-wrap',
            fontSize: 13,
            lineHeight: 1.45,
            px: 1.75,
            py: 1.25,
            borderRadius: 1,
            boxShadow: 4,
        },
    },
    arrow: {
        sx: { color: 'common.black' },
    },
};

const narrationEditMultilineSx = {
    ...excelGridInlineFieldSx,
    '& .MuiInputBase-root': {
        alignItems: 'flex-start',
        minHeight: 'auto',
    },
    '& .MuiInputBase-input': {
        py: '4px',
        lineHeight: 1.35,
        whiteSpace: 'pre-wrap',
        overflow: 'hidden',
    },
};

/**
 * Draft: multiline editor while focused (or when empty). After blur with content, compact single-line
 * + tooltip on hover. Uses `focused || !hasText` so the first typed character does not collapse the field.
 */
function JournalLineNarrationCell(props: { name: string; control: Control<Record<string, unknown>>; readOnly: boolean }) {
    const { name, control, readOnly } = props;
    const { field } = useController({ name, control });
    const [focused, setFocused] = React.useState(false);
    const inputRef = React.useRef<HTMLTextAreaElement | null>(null);
    const pendingOpenFocusRef = React.useRef(false);

    const text = field.value != null ? String(field.value) : '';
    const hasText = text.trim().length > 0;
    const showEditor = readOnly ? false : focused || !hasText;

    const openEditorFromCollapsed = React.useCallback(() => {
        pendingOpenFocusRef.current = true;
        setFocused(true);
    }, []);

    React.useLayoutEffect(() => {
        if (!pendingOpenFocusRef.current || readOnly || !showEditor) return;
        pendingOpenFocusRef.current = false;
        const id = requestAnimationFrame(() => {
            inputRef.current?.focus();
        });
        return () => cancelAnimationFrame(id);
    }, [showEditor, readOnly]);

    const truncated = (
        <Box
            sx={{
                width: '100%',
                minWidth: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontSize: 12,
                lineHeight: 1.2,
                color: 'text.primary',
            }}
        >
            {hasText ? text : '—'}
        </Box>
    );

    const withTip = hasText ? (
        <Tooltip
            title={text}
            placement="bottom"
            arrow
            enterDelay={200}
            slotProps={narrationReadOnlyTooltipSx}
        >
            {truncated}
        </Tooltip>
    ) : (
        truncated
    );

    if (readOnly) {
        return hasText ? withTip : <Box sx={{ fontSize: 12, color: 'text.secondary' }}>—</Box>;
    }

    if (!showEditor) {
        return (
            <Box
                role="button"
                tabIndex={0}
                onClick={() => openEditorFromCollapsed()}
                onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openEditorFromCollapsed();
                    }
                }}
                onFocus={() => openEditorFromCollapsed()}
                sx={{
                    width: '100%',
                    minWidth: 0,
                    cursor: 'text',
                    outline: 'none',
                    '&:focus-visible': {
                        outline: '2px solid',
                        outlineColor: 'primary.main',
                        outlineOffset: 2,
                        borderRadius: 0.5,
                    },
                }}
            >
                {hasText ? withTip : <Box sx={{ fontSize: 12, color: 'text.secondary' }}>—</Box>}
            </Box>
        );
    }

    return (
        <TextField
            name={field.name}
            value={text}
            onChange={field.onChange}
            onFocus={() => setFocused(true)}
            onBlur={e => {
                field.onBlur();
                setFocused(false);
            }}
            inputRef={el => {
                field.ref(el);
                inputRef.current = el;
            }}
            variant="standard"
            fullWidth
            multiline
            minRows={1}
            maxRows={16}
            sx={narrationEditMultilineSx}
        />
    );
}

const taxAutocompleteSx = {
    '& .MuiAutocomplete-inputRoot': {
        alignItems: 'center',
        flexWrap: 'wrap',
        py: 0.5,
        minHeight: 36,
    },
    '& .MuiAutocomplete-tag': {
        margin: '2px',
        maxWidth: '100%',
    },
};

export function GlJournalVoucherLinesGrid(props: {
    readOnly: boolean;
    lineEntryMode?: LineEntryMode;
}) {
    const { readOnly, lineEntryMode = 'standard' } = props;
    const hideCredit =
        lineEntryMode === 'bank_payment_debit_only' || lineEntryMode === 'cash_payment_debit_only';
    const hideDebit =
        lineEntryMode === 'bank_receipt_credit_only' || lineEntryMode === 'cash_receipt_credit_only';
    const translate = useTranslate();
    const { control, setValue, getValues } = useFormContext();
    const { fields, append, remove, move } = useFieldArray({ control, name: 'lines' });
    const dragFrom = React.useRef<number | null>(null);

    const [columns, setColumns] = React.useState(loadColumnPrefs);
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
    const menuOpen = Boolean(anchorEl);

    const toggleCol = (key: ColumnKey) => {
        setColumns(prev => {
            const next = { ...prev, [key]: !prev[key] };
            saveColumnPrefs(next);
            return next;
        });
    };

    const { data: taxList } = useGetList('fbrSalesTaxRates', {
        pagination: { page: 1, perPage: 2000 },
        sort: { field: 'label', order: 'ASC' },
    });

    const { data: partyList } = useGetList('customers', {
        pagination: { page: 1, perPage: 2000 },
        sort: { field: 'partyName', order: 'ASC' },
    });

    const taxOptions = React.useMemo(() => {
        const rows = taxList ?? [];
        return rows.map((r: Record<string, unknown>) => {
            const id = Number(r.id);
            const label = String(r.label ?? '').trim();
            const pct = Number(r.percentage ?? 0);
            return {
                id,
                label: label || `#${id}`,
                pct: Number.isFinite(pct) ? pct : 0,
            };
        });
    }, [taxList]);

    const taxPctById = React.useMemo(() => {
        const m = new Map<number, number>();
        for (const o of taxOptions) m.set(o.id, o.pct);
        return m;
    }, [taxOptions]);

    const partyOptions = React.useMemo(() => {
        const rows = partyList ?? [];
        return rows.map((r: Record<string, unknown>) => {
            const id = Number(r.id);
            const name = String(r.partyName ?? r.partyBusinessName ?? '').trim();
            return { id, label: name || `#${id}` };
        });
    }, [partyList]);

    const linesWatch = useWatch({ control, name: 'lines' }) as GlJournalLineRow[] | undefined;

    const totalDr = React.useMemo(() => {
        if (!linesWatch?.length) return 0;
        return linesWatch.reduce((s, l) => s + parseMoney(l?.dr), 0);
    }, [linesWatch]);

    const totalCr = React.useMemo(() => {
        if (!linesWatch?.length) return 0;
        return linesWatch.reduce((s, l) => s + parseMoney(l?.cr), 0);
    }, [linesWatch]);

    const totalTax = React.useMemo(() => {
        if (!linesWatch?.length) return 0;
        return linesWatch.reduce((sum, l) => sum + computeLineTax(l, taxPctById), 0);
    }, [linesWatch, taxPctById]);

    const optCount =
        (columns.taxes ? 1 : 0) + (columns.partner_ref ? 1 : 0) + (columns.line_tax_amount ? 1 : 0);
    const baseCols = hideCredit || hideDebit ? 5 : 6;
    const colSpanFull = baseCols + optCount;
    const totalsLabelColSpan = hideCredit || hideDebit ? 2 : 3;

    const addLine = () => {
        const lines = (getValues('lines') as GlJournalLineRow[] | undefined) ?? [];
        const prev = lines[lines.length - 1];
        const next = emptyGlJournalLine();
        if (prev) {
            next.narration = String(prev.narration ?? '');
            next.fbrSalesTaxRateIds = [...(prev.fbrSalesTaxRateIds ?? [])];
            const pd = parseMoney(prev.dr);
            const pc = parseMoney(prev.cr);
            if (hideCredit || hideDebit) {
                if (pd > 0) {
                    next.dr = hideDebit ? '' : formatMoneyInput(pd);
                    next.cr = hideCredit ? '' : '';
                } else if (pc > 0) {
                    // Receipt mode is credit-only; carry forward previous credit to credit field.
                    if (hideDebit) {
                        next.cr = formatMoneyInput(pc);
                        next.dr = '';
                    } else {
                        next.dr = formatMoneyInput(pc);
                        next.cr = '';
                    }
                }
            } else if (pd > 0) {
                next.cr = formatMoneyInput(pd);
                next.dr = '';
            } else if (pc > 0) {
                next.dr = formatMoneyInput(pc);
                next.cr = '';
            }
        }
        append(next);
    };

    const onDragStartRow = (index: number) => {
        dragFrom.current = index;
    };

    const onDropRow = (to: number) => {
        const from = dragFrom.current;
        dragFrom.current = null;
        if (from == null || from === to) return;
        move(from, to);
    };

    const renderDataRow = (field: { id: string }, index: number) => (
        <TableRow
            key={field.id}
            hover
            onDragOver={e => e.preventDefault()}
            onDrop={() => onDropRow(index)}
        >
            <TableCell sx={excelGridDragHandleCellSx}>
                <Box
                    draggable={!readOnly}
                    onDragStart={() => onDragStartRow(index)}
                    sx={{
                        ...excelGridDragHandleIconWrapperSx,
                        cursor: readOnly ? 'default' : 'grab',
                    }}
                >
                    <DragIndicatorIcon sx={{ fontSize: 15, color: 'text.disabled' }} />
                </Box>
            </TableCell>
            <TableCell sx={excelGridBodyCellSx}>
                <Controller
                    name={`lines.${index}.glAccountId`}
                    control={control}
                    render={({ field: f }) => (
                        <GlJournalLineAccountAutocomplete
                            value={(() => {
                                const v = f.value;
                                const n =
                                    typeof v === 'number'
                                        ? v
                                        : v != null && v !== ''
                                          ? Number(v)
                                          : NaN;
                                return Number.isFinite(n) && n > 0 ? n : null;
                            })()}
                            onChange={id => f.onChange(id)}
                            disabled={readOnly}
                        />
                    )}
                />
            </TableCell>
            <TableCell sx={{ ...excelGridBodyCellSx, verticalAlign: 'top' }}>
                <JournalLineNarrationCell
                    name={`lines.${index}.narration`}
                    control={control as Control<Record<string, unknown>>}
                    readOnly={readOnly}
                />
            </TableCell>
            {columns.taxes ? (
                <TableCell
                    sx={{
                        ...excelGridBodyCellSx,
                        verticalAlign: 'middle',
                    }}
                >
                    <Controller
                        name={`lines.${index}.fbrSalesTaxRateIds`}
                        control={control}
                        render={({ field: f }) => {
                            const ids = Array.isArray(f.value) ? (f.value as number[]) : [];
                            const selected = taxOptions.filter(o => ids.includes(o.id));
                            return (
                                <Autocomplete
                                    multiple
                                    size="small"
                                    disableCloseOnSelect
                                    options={taxOptions}
                                    getOptionLabel={o => o.label}
                                    isOptionEqualToValue={(a, b) => a.id === b.id}
                                    value={selected}
                                    onChange={(_, v) => f.onChange(v.map(x => x.id))}
                                    disabled={readOnly}
                                    renderTags={(tagValue, getTagProps) =>
                                        tagValue.map((option, i) => (
                                            <Chip
                                                variant="outlined"
                                                size="small"
                                                label={option.label}
                                                {...getTagProps({ index: i })}
                                                key={option.id}
                                            />
                                        ))
                                    }
                                    sx={taxAutocompleteSx}
                                    renderInput={params => (
                                        <TextField {...params} variant="standard" sx={excelGridInlineFieldSx} />
                                    )}
                                />
                            );
                        }}
                    />
                </TableCell>
            ) : null}
            {columns.partner_ref ? (
                <TableCell sx={{ ...excelGridBodyCellSx, verticalAlign: 'middle' }}>
                    <Controller
                        name={`lines.${index}.partyId`}
                        control={control}
                        render={({ field: f }) => (
                            <Autocomplete
                                size="small"
                                options={partyOptions}
                                getOptionLabel={o => o.label}
                                isOptionEqualToValue={(a, b) => a.id === b.id}
                                value={partyOptions.find(o => o.id === f.value) ?? null}
                                onChange={(_, v) => f.onChange(v?.id ?? null)}
                                disabled={readOnly}
                                renderInput={params => (
                                    <TextField {...params} variant="standard" sx={excelGridInlineFieldSx} />
                                )}
                            />
                        )}
                    />
                </TableCell>
            ) : null}
            {hideDebit ? null : (
                <TableCell sx={excelGridBodyCellSx} align="right">
                    <Controller
                        name={`lines.${index}.dr`}
                        control={control}
                        render={({ field: f }) => (
                            <TextField
                                value={f.value ?? ''}
                                variant="standard"
                                disabled={readOnly}
                                sx={excelGridInlineFieldSx}
                                inputProps={{
                                    inputMode: 'decimal',
                                    style: { textAlign: 'right' },
                                }}
                                onChange={e => {
                                    const raw = e.target.value;
                                    f.onChange(raw);
                                    const n = parseMoney(raw);
                                    if (n !== 0 && !hideCredit) setValue(`lines.${index}.cr`, '');
                                    if (hideCredit) setValue(`lines.${index}.cr`, '');
                                    if (hideDebit) setValue(`lines.${index}.dr`, '');
                                }}
                                onBlur={() => {
                                    const n = parseMoney(f.value);
                                    f.onChange(n === 0 ? '' : formatMoneyInput(n));
                                }}
                            />
                        )}
                    />
                </TableCell>
            )}
            {hideCredit ? null : (
                <TableCell sx={excelGridBodyCellSx} align="right">
                    <Controller
                        name={`lines.${index}.cr`}
                        control={control}
                        render={({ field: f }) => (
                            <TextField
                                value={f.value ?? ''}
                                variant="standard"
                                disabled={readOnly}
                                sx={excelGridInlineFieldSx}
                                inputProps={{
                                    inputMode: 'decimal',
                                    style: { textAlign: 'right' },
                                }}
                                onChange={e => {
                                    const raw = e.target.value;
                                    f.onChange(raw);
                                    const n = parseMoney(raw);
                                    if (n !== 0) setValue(`lines.${index}.dr`, '');
                                }}
                                onBlur={() => {
                                    const n = parseMoney(f.value);
                                    f.onChange(n === 0 ? '' : formatMoneyInput(n));
                                }}
                            />
                        )}
                    />
                </TableCell>
            )}
            {columns.line_tax_amount ? (
                <TableCell sx={{ ...excelGridBodyCellSx, verticalAlign: 'middle' }} align="right">
                    <Typography variant="body2" sx={{ fontSize: 12, lineHeight: 1.2 }}>
                        {formatMoneyTotals(computeLineTax(linesWatch?.[index], taxPctById))}
                    </Typography>
                </TableCell>
            ) : null}
            <TableCell sx={excelGridBodyCellSx}>
                {!readOnly ? (
                    <IconButton size="small" onClick={() => remove(index)} aria-label="Delete line">
                        <DeleteOutlineIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                ) : null}
            </TableCell>
        </TableRow>
    );

    return (
        <Box sx={{ width: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5, gap: 1 }}>
                <Typography variant="subtitle2" fontWeight={700}>
                    {translate('resources.glJournalVouchers.lines_title')}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <IconButton
                        size="small"
                        aria-label={translate('resources.glJournalVouchers.columns_menu', { _: 'Columns' })}
                        onClick={e => setAnchorEl(e.currentTarget)}
                        sx={{ p: '4px' }}
                    >
                        <IoOptions size={18} style={{ display: 'block' }} />
                    </IconButton>
                    <Menu anchorEl={anchorEl} open={menuOpen} onClose={() => setAnchorEl(null)}>
                        <Box sx={{ px: 2, py: 1, minWidth: 240 }}>
                            <Typography variant="caption" color="text.secondary">
                                {translate('resources.glJournalVouchers.optional_columns', { _: 'Optional columns' })}
                            </Typography>
                            <FormGroup>
                                {(
                                    [
                                        ['taxes', 'resources.glJournalVouchers.fields.taxes'],
                                        ['partner_ref', 'resources.glJournalVouchers.fields.partner'],
                                        ['line_tax_amount', 'resources.glJournalVouchers.fields.line_tax_amount'],
                                    ] as [ColumnKey, string][]
                                ).map(([key, trKey]) => (
                                    <FormControlLabel
                                        key={key}
                                        control={
                                            <Checkbox
                                                checked={columns[key]}
                                                onChange={() => toggleCol(key)}
                                                size="small"
                                            />
                                        }
                                        label={translate(trKey)}
                                    />
                                ))}
                            </FormGroup>
                        </Box>
                    </Menu>
                </Box>
            </Box>

            <TableContainer
                sx={{
                    ...excelGridTableContainerSx,
                    maxWidth: '100%',
                    minWidth: 0,
                    overflowX: 'auto',
                    WebkitOverflowScrolling: 'touch',
                    scrollbarGutter: 'stable',
                    '&::-webkit-scrollbar': { height: 6 },
                }}
            >
                <Table
                    size="small"
                    stickyHeader
                    sx={{
                        ...excelGridTableSx,
                        minWidth: journalLinesTableMinWidth(columns, hideDebit, hideCredit),
                        width: '100%',
                        '& .MuiTableHead-root .MuiTableCell-root': {
                            py: '10px',
                            minHeight: 40,
                            fontSize: 13,
                        },
                    }}
                >
                    <TableHead>
                        <TableRow>
                            <TableCell
                                width={GRID_COL_MIN.drag}
                                sx={{ ...journalGridThSx, fontWeight: 600, bgcolor: 'background.paper' }}
                            />
                            <TableCell sx={{ ...journalGridThSx, minWidth: GRID_COL_MIN.account }}>
                                {translate('resources.glJournalVouchers.fields.account')}
                            </TableCell>
                            <TableCell sx={{ ...journalGridThSx, minWidth: GRID_COL_MIN.narration }}>
                                {translate('resources.glJournalVouchers.fields.narration')}
                            </TableCell>
                            {columns.taxes ? (
                                <TableCell sx={{ ...journalGridThSx, minWidth: GRID_COL_MIN.taxes }}>
                                    {translate('resources.glJournalVouchers.fields.taxes')}
                                </TableCell>
                            ) : null}
                            {columns.partner_ref ? (
                                <TableCell sx={{ ...journalGridThSx, minWidth: GRID_COL_MIN.partner }}>
                                    {translate('resources.glJournalVouchers.fields.partner')}
                                </TableCell>
                            ) : null}
                            {hideDebit ? null : (
                                <TableCell sx={{ ...journalGridThSx, minWidth: GRID_COL_MIN.debit }} align="right">
                                    {translate('resources.glJournalVouchers.fields.debit')}
                                </TableCell>
                            )}
                            {hideCredit ? null : (
                                <TableCell sx={{ ...journalGridThSx, minWidth: GRID_COL_MIN.credit }} align="right">
                                    {translate('resources.glJournalVouchers.fields.credit')}
                                </TableCell>
                            )}
                            {columns.line_tax_amount ? (
                                <TableCell sx={{ ...journalGridThSx, minWidth: GRID_COL_MIN.lineTax }} align="right">
                                    {translate('resources.glJournalVouchers.fields.line_tax_amount')}
                                </TableCell>
                            ) : null}
                            <TableCell sx={{ ...journalGridThSx, width: GRID_COL_MIN.actions, minWidth: GRID_COL_MIN.actions }} />
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {fields.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={colSpanFull}
                                    sx={{ ...excelGridBodyCellSx, color: 'text.secondary' }}
                                >
                                    {translate('resources.glJournalVouchers.no_lines')}
                                </TableCell>
                            </TableRow>
                        ) : (
                            fields.map((field, index) => renderDataRow(field, index))
                        )}
                        {!readOnly ? (
                            <TableRow>
                                <TableCell
                                    colSpan={colSpanFull}
                                    sx={{
                                        ...excelGridBodyCellSx,
                                        borderTop: '1px solid',
                                        borderColor: 'divider',
                                        py: 0.75,
                                    }}
                                >
                                    <Box
                                        component="button"
                                        type="button"
                                        onClick={addLine}
                                        sx={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 0.5,
                                            px: 0,
                                            py: 0.5,
                                            fontSize: 13,
                                            color: 'text.secondary',
                                            cursor: 'pointer',
                                            border: 'none',
                                            background: 'none',
                                            font: 'inherit',
                                            '&:hover': { color: 'primary.main' },
                                        }}
                                    >
                                        <AddCircleOutlineIcon sx={{ fontSize: 18 }} />
                                        {translate('resources.glJournalVouchers.add_line')}
                                    </Box>
                                </TableCell>
                            </TableRow>
                        ) : null}
                        <TableRow>
                            <TableCell
                                colSpan={totalsLabelColSpan}
                                sx={{ ...excelGridBodyCellSx, fontWeight: 700 }}
                            >
                                {translate('resources.glJournalVouchers.totals')}
                            </TableCell>
                            {columns.taxes ? <TableCell sx={excelGridBodyCellSx} /> : null}
                            {columns.partner_ref ? <TableCell sx={excelGridBodyCellSx} /> : null}
                            {hideDebit ? null : (
                                <TableCell sx={{ ...excelGridBodyCellSx, fontWeight: 700 }} align="right">
                                    {formatMoneyTotals(totalDr)}
                                </TableCell>
                            )}
                            {hideCredit ? null : (
                                <TableCell sx={{ ...excelGridBodyCellSx, fontWeight: 700 }} align="right">
                                    {formatMoneyTotals(totalCr)}
                                </TableCell>
                            )}
                            {columns.line_tax_amount ? (
                                <TableCell sx={{ ...excelGridBodyCellSx, fontWeight: 700 }} align="right">
                                    {formatMoneyTotals(totalTax)}
                                </TableCell>
                            ) : null}
                            <TableCell sx={excelGridBodyCellSx} />
                        </TableRow>
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}
