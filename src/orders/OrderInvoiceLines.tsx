import * as React from 'react';
import {
    AutocompleteInput,
    NumberInput,
    ReferenceInput,
    TextInput,
    useTranslate,
    useDataProvider,
} from 'react-admin';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
import { IoOptions } from 'react-icons/io5';
import {
    Box,
    Checkbox,
    FormControlLabel,
    FormGroup,
    IconButton,
    Link,
    Menu,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material';

import type { FbrInvoiceLineForm } from './fbrInvoiceDataProvider';

const COLUMN_STORAGE_KEY = 'order-invoice-line-columns-v2';

type ColumnKey =
    | 'hs_code'
    | 'sro_schedule_no'
    | 'sro_item'
    | 'fbr_sale_type'
    | 'remarks'
    | 'discount_pct'
    | 'tax_amount'
    | 'gross_amount';

const defaultColumns: Record<ColumnKey, boolean> = {
    hs_code: true,
    sro_schedule_no: true,
    sro_item: true,
    fbr_sale_type: true,
    remarks: true,
    discount_pct: false,
    tax_amount: false,
    gross_amount: false,
};

function loadColumnPrefs(): Record<ColumnKey, boolean> {
    try {
        const raw = localStorage.getItem(COLUMN_STORAGE_KEY);
        if (!raw) return { ...defaultColumns };
        return { ...defaultColumns, ...JSON.parse(raw) };
    } catch {
        return { ...defaultColumns };
    }
}

function saveColumnPrefs(prefs: Record<ColumnKey, boolean>) {
    localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(prefs));
}

/** Strip underlines and remove all vertical padding from MUI standard inputs */
const inputBaseSx = {
    '& .MuiInput-underline:before': { borderBottom: 'none !important' },
    '& .MuiInput-underline:after': { borderBottom: 'none !important' },
    '& .MuiInputBase-root:before': { borderBottom: 'none !important' },
    '& .MuiInputBase-root:after': { borderBottom: 'none !important' },
    '& .MuiInputBase-root': { minHeight: 26 },
    '& .MuiInputBase-input': { py: '2px', fontSize: 13, lineHeight: '22px' },
    '& .MuiFormHelperText-root': { display: 'none' },
};

/** Cell: horizontal border only, tight vertical padding — mirrors Odoo list rows */
const cellBorder = {
    borderLeft: 'none',
    borderRight: 'none',
    borderTop: 'none',
    borderBottom: '1px solid',
    borderColor: 'divider',
};

const cellSx = {
    verticalAlign: 'middle' as const,
    py: '3px',
    px: 1,
    ...cellBorder,
};

const thSx = {
    fontWeight: 700,
    fontSize: 12,
    color: 'text.secondary',
    textTransform: 'none' as const,
    letterSpacing: 0,
    py: '4px',
    px: 1,
    ...cellBorder,
    bgcolor: 'action.hover',
    whiteSpace: 'nowrap' as const,
};

type ProductProfileRecord = {
    id: string;
    productNo?: string;
    productName?: string;
    hsCode?: string;
    rateValue?: number | null;
    sroScheduleNoText?: string | null;
    sroItemRefText?: string | null;
    fbrPdiTransTypeId?: number | null;
};

function formatVariant(line: Partial<FbrInvoiceLineForm> | undefined) {
    const no = (line as any)?.productNo ? String((line as any).productNo) : '';
    const name = (line as any)?.productName ? String((line as any).productName) : '';
    if (no && name) return `[${no}] ${name}`;
    return name || no || '';
}

export function emptyInvoiceLine(): FbrInvoiceLineForm {
    return {
        quantity: 1,
        unitPrice: 0,
        taxRate: 0,
        fbrSalesTaxRateId: null,
        fbrSalesTaxRateIds: [],
        discountRate: 0,
        hsCode: '',
        sroItemText: '',
        sroScheduleNoText: '',
        sroItemRefText: '',
        fbrSaleTypeText: '',
        remarks: '',
    };
}

function InvoiceLineRow({
    index,
    columns,
    onRemove,
}: {
    index: number;
    columns: Record<ColumnKey, boolean>;
    onRemove: () => void;
}) {
    const { setValue, getValues } = useFormContext();
    const dataProvider = useDataProvider();
    const base = `lines.${index}` as const;

    const invoiceDate = useWatch({ name: 'invoiceDate' }) as Date | string | undefined;
    const asOfStr = React.useMemo(() => {
        if (invoiceDate instanceof Date && !Number.isNaN(invoiceDate.getTime()))
            return invoiceDate.toISOString().slice(0, 10);
        if (typeof invoiceDate === 'string' && invoiceDate.length >= 10) return invoiceDate.slice(0, 10);
        return new Date().toISOString().slice(0, 10);
    }, [invoiceDate]);

    const fbrSalesTaxRateIds = useWatch({ name: `${base}.fbrSalesTaxRateIds` }) as
        | number[]
        | string[]
        | undefined
        | null;

    const normalizedTaxIdsKey = JSON.stringify(
        (Array.isArray(fbrSalesTaxRateIds) ? fbrSalesTaxRateIds : [])
            .map(x => (typeof x === 'string' ? Number(x) : x))
            .filter((x): x is number => Number.isFinite(x) && x > 0)
            .sort((a, b) => a - b)
    );

    const dataProviderRef = React.useRef(dataProvider);
    dataProviderRef.current = dataProvider;

    React.useEffect(() => {
        let ids: number[] = [];
        try {
            ids = JSON.parse(normalizedTaxIdsKey) as number[];
            if (!Array.isArray(ids)) ids = [];
        } catch {
            ids = [];
        }
        if (ids.length === 0) {
            setValue(`${base}.taxRate`, 0, { shouldDirty: false, shouldValidate: false });
            setValue(`${base}.fbrSalesTaxRateId`, null, { shouldDirty: false, shouldValidate: false });
            return;
        }
        let alive = true;
        void dataProviderRef.current
            .getMany('fbrSalesTaxRates', { ids })
            .then(res => {
                if (!alive) return;
                let sum = 0;
                for (const row of res.data as Array<{ percentage?: number }>)
                    sum += Number(row.percentage) || 0;
                setValue(`${base}.taxRate`, sum, { shouldDirty: false, shouldValidate: false });
                setValue(`${base}.fbrSalesTaxRateId`, ids[0], {
                    shouldDirty: false,
                    shouldValidate: false,
                });
            })
            .catch(() => {
                if (alive) {
                    setValue(`${base}.taxRate`, 0, { shouldDirty: false, shouldValidate: false });
                }
            });
        return () => {
            alive = false;
        };
    }, [normalizedTaxIdsKey, base, setValue]);

    const productProfileId = useWatch({ name: `${base}.productProfileId` }) as string | undefined;
    const productNo = useWatch({ name: `${base}.productNo` }) as string | undefined;
    const productName = useWatch({ name: `${base}.productName` }) as string | undefined;
    const [editingVariant, setEditingVariant] = React.useState(false);

    React.useEffect(() => {
        const pid = productProfileId;
        if (!pid) return;

        const hsPath = `${base}.hsCode`;
        const pricePath = `${base}.unitPrice`;
        const currentHs = getValues(hsPath);
        const currentPrice = getValues(pricePath);

        const needHs = currentHs == null || String(currentHs).trim() === '';
        const needPrice = currentPrice == null || currentPrice === '' || Number(currentPrice) === 0;

        let alive = true;
        void (async () => {
            try {
                const res = await dataProvider.getOne('productProfiles', { id: pid });
                const profile = res?.data as ProductProfileRecord | undefined;
                if (!alive || !profile) return;
                if (needHs) setValue(hsPath, profile.hsCode ?? '', { shouldDirty: true });
                if (needPrice && profile.rateValue != null)
                    setValue(pricePath, Number(profile.rateValue), { shouldDirty: true });
                const noPath = `${base}.productNo`;
                const namePath = `${base}.productName`;
                if (getValues(noPath) == null || getValues(noPath) === '')
                    setValue(noPath, profile.productNo ?? '', { shouldDirty: false });
                if (getValues(namePath) == null || getValues(namePath) === '')
                    setValue(namePath, profile.productName ?? '', { shouldDirty: false });

                setValue(`${base}.sroScheduleNoText`, profile.sroScheduleNoText ?? '', {
                    shouldDirty: false,
                    shouldValidate: false,
                });
                setValue(`${base}.sroItemRefText`, profile.sroItemRefText ?? '', {
                    shouldDirty: false,
                    shouldValidate: false,
                });
                const ttId = profile.fbrPdiTransTypeId;
                if (ttId != null && Number(ttId) > 0) {
                    const many = await dataProvider.getMany('fbrPdiTransTypes', { ids: [Number(ttId)] });
                    if (!alive) return;
                    const row = (many.data as Array<{ description?: string }> | undefined)?.[0];
                    setValue(
                        `${base}.fbrSaleTypeText`,
                        row?.description != null ? String(row.description) : '',
                        { shouldDirty: false, shouldValidate: false }
                    );
                } else {
                    setValue(`${base}.fbrSaleTypeText`, '', { shouldDirty: false, shouldValidate: false });
                }
            } catch {
                /* ignore */
            }
        })();

        return () => {
            alive = false;
        };
    }, [productProfileId, base, setValue, getValues, dataProvider]);

    const qty = Number(useWatch({ name: `${base}.quantity` })) || 0;
    const price = Number(useWatch({ name: `${base}.unitPrice` })) || 0;
    const discountRate = Math.max(
        0,
        Math.min(1, (Number(useWatch({ name: `${base}.discountRate` })) || 0) / 100)
    );
    const net = qty * price;
    const netAfterDiscount = net * (1 - discountRate);
    const taxRate = Number(useWatch({ name: `${base}.taxRate` })) || 0;
    const taxAmount = netAfterDiscount * taxRate;
    const gross = netAfterDiscount + taxAmount;
    const num = (n: number) =>
        (Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return (
        <TableRow
            hover
            sx={{
                '&:hover': { bgcolor: 'action.hover' },
                '& .MuiTableCell-root': cellSx,
            }}
        >
            {/* ── Product Variant ── */}
            <TableCell sx={{ width: '36%', minWidth: 260 }}>
                {!editingVariant && productProfileId ? (
                    <Box
                        onClick={() => setEditingVariant(true)}
                        title="Click to change"
                        sx={{
                            cursor: 'text',
                            height: 26,
                            display: 'flex',
                            alignItems: 'center',
                            fontSize: 13,
                            color: 'text.primary',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {formatVariant({ productNo, productName } as any) || String(productProfileId)}
                    </Box>
                ) : (
                    <ReferenceInput
                        source={`${base}.productProfileId`}
                        reference="productProfiles"
                        label={false}
                    >
                        <AutocompleteInput
                            label={false}
                            optionText={(r: ProductProfileRecord) =>
                                r?.id ? `[${r.productNo ?? ''}] ${r.productName ?? ''}` : ''
                            }
                            filterToQuery={(q: string) => ({ q })}
                            size="small"
                            variant="standard"
                            margin="none"
                            fullWidth
                            noOptionsText="Type to search products"
                            helperText={false}
                            onChange={() => setEditingVariant(false)}
                            sx={{
                                ...inputBaseSx,
                                '& .MuiFormLabel-root': { display: 'none' },
                                '& input': { '::placeholder': { opacity: 0.6 } },
                            }}
                        />
                    </ReferenceInput>
                )}
            </TableCell>

            {/* ── Sale Rate ── */}
            <TableCell align="right" sx={{ width: '9%' }}>
                <NumberInput
                    source={`${base}.unitPrice`}
                    label={false}
                    size="small"
                    variant="standard"
                    margin="none"
                    sx={{
                        width: '100%',
                        maxWidth: 108,
                        ml: 'auto',
                        display: 'block',
                        ...inputBaseSx,
                        '& .MuiInputBase-input': {
                            ...((inputBaseSx['& .MuiInputBase-input'] as object) ?? {}),
                            textAlign: 'right',
                        },
                    }}
                />
            </TableCell>

            {/* ── Qty ── */}
            <TableCell align="right" sx={{ width: '6%' }}>
                <NumberInput
                    source={`${base}.quantity`}
                    label={false}
                    size="small"
                    variant="standard"
                    margin="none"
                    sx={{
                        width: '100%',
                        maxWidth: 72,
                        ml: 'auto',
                        display: 'block',
                        ...inputBaseSx,
                        '& .MuiInputBase-input': {
                            ...((inputBaseSx['& .MuiInputBase-input'] as object) ?? {}),
                            textAlign: 'right',
                        },
                    }}
                />
            </TableCell>

            {/* ── Net Amount ── */}
            <TableCell align="right" sx={{ width: '10%' }}>
                <Typography
                    variant="body2"
                    sx={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums', lineHeight: '26px' }}
                >
                    {num(netAfterDiscount)}
                </Typography>
            </TableCell>

            {/* ── Tax: server search, label only, multi-select chips (additive %) ── */}
            <TableCell
                align="left"
                sx={{
                    width: '16%',
                    minWidth: 168,
                    maxWidth: 280,
                    overflow: 'hidden',
                    verticalAlign: 'middle',
                }}
            >
                <ReferenceInput
                    source={`${base}.fbrSalesTaxRateIds`}
                    reference="fbrSalesTaxRates"
                    filter={{ asOf: asOfStr }}
                >
                    <AutocompleteInput
                        multiple
                        label={false}
                        optionText={(r: { label?: string }) => (r?.label ? String(r.label) : '')}
                        filterToQuery={(q: string) => ({ q: q.trim() })}
                        size="small"
                        variant="standard"
                        margin="none"
                        fullWidth
                        helperText={false}
                        noOptionsText="Type to search taxes"
                        forcePopupIcon={false}
                        disableClearable
                        sx={{
                            ...inputBaseSx,
                            '& .MuiFormLabel-root': { display: 'none' },
                            '& .MuiInputBase-root': { flexWrap: 'wrap', alignItems: 'flex-start', py: '2px' },
                            '& .MuiAutocomplete-inputRoot': { gap: 0.25, pr: '6px !important' },
                            '& .MuiAutocomplete-endAdornment': { display: 'none' },
                            '& .MuiChip-root': {
                                height: 22,
                                maxWidth: 'calc(100% - 4px)',
                                fontSize: 11,
                                '& .MuiChip-label': { px: 0.75 },
                            },
                        }}
                    />
                </ReferenceInput>
            </TableCell>

            {/* ── Optional: Discount % ── */}
            {columns.discount_pct && (
                <TableCell align="right" sx={{ width: '7%' }}>
                    <NumberInput
                        source={`${base}.discountRate`}
                        label={false}
                        size="small"
                        variant="standard"
                        margin="none"
                        sx={{
                            width: '100%',
                            maxWidth: 72,
                            ml: 'auto',
                            display: 'block',
                            ...inputBaseSx,
                            '& .MuiInputBase-input': {
                                ...((inputBaseSx['& .MuiInputBase-input'] as object) ?? {}),
                                textAlign: 'right',
                            },
                        }}
                    />
                </TableCell>
            )}

            {/* ── Optional: Tax Amount ── */}
            {columns.tax_amount && (
                <TableCell align="right" sx={{ width: '9%' }}>
                    <Typography
                        variant="body2"
                        sx={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums', lineHeight: '26px' }}
                    >
                        {num(taxAmount)}
                    </Typography>
                </TableCell>
            )}

            {/* ── Optional: Gross Amount ── */}
            {columns.gross_amount && (
                <TableCell align="right" sx={{ width: '10%' }}>
                    <Typography
                        variant="body2"
                        sx={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums', lineHeight: '26px' }}
                    >
                        {num(gross)}
                    </Typography>
                </TableCell>
            )}

            {/* ── Optional: HS Code ── */}
            {columns.hs_code && (
                <TableCell sx={{ width: '9%' }}>
                    <TextInput
                        source={`${base}.hsCode`}
                        label={false}
                        size="small"
                        variant="standard"
                        margin="none"
                        fullWidth
                        InputProps={{ readOnly: true }}
                        sx={{ ...inputBaseSx }}
                    />
                </TableCell>
            )}

            {/* ── Optional: Sro Schedule No (product profile) ── */}
            {columns.sro_schedule_no && (
                <TableCell sx={{ width: '10%' }}>
                    <TextInput
                        source={`${base}.sroScheduleNoText`}
                        label={false}
                        size="small"
                        variant="standard"
                        margin="none"
                        fullWidth
                        InputProps={{ readOnly: true }}
                        sx={{ ...inputBaseSx }}
                    />
                </TableCell>
            )}

            {/* ── Optional: Sro Item (product profile free text) ── */}
            {columns.sro_item && (
                <TableCell sx={{ width: '9%' }}>
                    <TextInput
                        source={`${base}.sroItemRefText`}
                        label={false}
                        size="small"
                        variant="standard"
                        margin="none"
                        fullWidth
                        InputProps={{ readOnly: true }}
                        sx={{ ...inputBaseSx }}
                    />
                </TableCell>
            )}

            {/* ── Optional: FBR Sale type (PDI transaction type description) ── */}
            {columns.fbr_sale_type && (
                <TableCell sx={{ width: '12%' }}>
                    <TextInput
                        source={`${base}.fbrSaleTypeText`}
                        label={false}
                        size="small"
                        variant="standard"
                        margin="none"
                        fullWidth
                        InputProps={{ readOnly: true }}
                        sx={{ ...inputBaseSx }}
                    />
                </TableCell>
            )}

            {/* ── Optional: Remarks ── */}
            {columns.remarks && (
                <TableCell sx={{ width: '14%' }}>
                    <TextInput
                        source={`${base}.remarks`}
                        label={false}
                        size="small"
                        variant="standard"
                        margin="none"
                        fullWidth
                        sx={{ ...inputBaseSx }}
                    />
                </TableCell>
            )}

            {/* ── Delete ── */}
            <TableCell align="center" sx={{ width: 36, px: '4px !important' }}>
                <IconButton
                    size="small"
                    onClick={onRemove}
                    aria-label="Remove line"
                    color="warning"
                    sx={{ p: '2px' }}
                >
                    <DeleteOutline sx={{ fontSize: 16 }} />
                </IconButton>
            </TableCell>
        </TableRow>
    );
}

export function OrderInvoiceLines() {
    const translate = useTranslate();
    const { control } = useFormContext();
    const { fields, append, remove } = useFieldArray({ control, name: 'lines' });

    const [columns, setColumns] = React.useState(loadColumnPrefs);
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);

    const toggle = (key: ColumnKey) => {
        setColumns(prev => {
            const next = { ...prev, [key]: !prev[key] };
            saveColumnPrefs(next);
            return next;
        });
    };

    const addLine = () => append(emptyInvoiceLine(), { shouldFocus: false });

    const removeLine = (index: number) => {
        if (fields.length <= 1) {
            remove(0);
            append(emptyInvoiceLine(), { shouldFocus: false });
            return;
        }
        remove(index);
    };

    return (
        <Box sx={{ width: '100%' }}>
            {/* ── Column visibility toggle ── */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 0.5 }}>
                <IconButton
                    size="small"
                    aria-label={translate('resources.orders.invoice.columns', { _: 'Columns' })}
                    onClick={e => setAnchorEl(e.currentTarget)}
                    sx={{ p: '4px' }}
                >
                    <IoOptions size={18} style={{ display: 'block' }} />
                </IconButton>
                <Menu anchorEl={anchorEl} open={open} onClose={() => setAnchorEl(null)}>
                    <Box sx={{ px: 2, py: 1, minWidth: 200 }}>
                        <Typography variant="caption" color="text.secondary">
                            {translate('resources.orders.invoice.optional_columns', { _: 'Optional columns' })}
                        </Typography>
                        <FormGroup>
                            {(
                                [
                                    ['hs_code', 'HS Code'],
                                    ['sro_schedule_no', 'Sro Schedule No'],
                                    ['sro_item', 'Sro Item'],
                                    ['fbr_sale_type', 'FBR Sale type'],
                                    ['remarks', 'Remarks'],
                                    ['discount_pct', 'Discount %'],
                                    ['tax_amount', 'Tax amount'],
                                    ['gross_amount', 'Gross amount'],
                                ] as [ColumnKey, string][]
                            ).map(([key, label]) => (
                                <FormControlLabel
                                    key={key}
                                    control={
                                        <Checkbox
                                            checked={columns[key]}
                                            onChange={() => toggle(key)}
                                            size="small"
                                        />
                                    }
                                    label={translate(`resources.orders.invoice.${key}`, { _: label })}
                                />
                            ))}
                        </FormGroup>
                    </Box>
                </Menu>
            </Box>

            {/* ── Table ── */}
            <TableContainer
                sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    bgcolor: 'background.paper',
                }}
            >
                <Table
                    size="small"
                    sx={{
                        borderCollapse: 'collapse',
                        tableLayout: 'fixed',
                        width: '100%',
                        minWidth: 880,
                        '& .MuiTableCell-root': { boxSizing: 'border-box' },
                    }}
                >
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ ...thSx, width: '36%', minWidth: 260 }}>
                                {translate('resources.orders.invoice.product_variant', { _: 'Product Variant' })}
                            </TableCell>
                            <TableCell align="right" sx={{ ...thSx, width: '9%' }}>
                                {translate('resources.orders.invoice.sale_rate', { _: 'Sale rate' })}
                            </TableCell>
                            <TableCell align="right" sx={{ ...thSx, width: '6%' }}>
                                {translate('resources.orders.fields.basket.quantity', { _: 'Qty' })}
                            </TableCell>
                            <TableCell align="right" sx={{ ...thSx, width: '10%' }}>
                                {translate('resources.orders.invoice.net_amount', { _: 'Net amount' })}
                            </TableCell>
                            <TableCell align="right" sx={{ ...thSx, width: '8%' }}>
                                {translate('resources.orders.fields.basket.taxes', { _: 'Tax' })}
                            </TableCell>
                            {columns.discount_pct && (
                                <TableCell align="right" sx={{ ...thSx, width: '7%' }}>
                                    {translate('resources.orders.invoice.discount_pct', { _: 'Disc. %' })}
                                </TableCell>
                            )}
                            {columns.tax_amount && (
                                <TableCell align="right" sx={{ ...thSx, width: '9%' }}>
                                    {translate('resources.orders.invoice.tax_amount', { _: 'Tax amount' })}
                                </TableCell>
                            )}
                            {columns.gross_amount && (
                                <TableCell align="right" sx={{ ...thSx, width: '10%' }}>
                                    {translate('resources.orders.invoice.gross_amount', { _: 'Gross' })}
                                </TableCell>
                            )}
                            {columns.hs_code && (
                                <TableCell sx={{ ...thSx, width: '9%' }}>
                                    {translate('resources.orders.invoice.hs_code', { _: 'HS Code' })}
                                </TableCell>
                            )}
                            {columns.sro_schedule_no && (
                                <TableCell sx={{ ...thSx, width: '10%' }}>
                                    {translate('resources.orders.invoice.sro_schedule_no', {
                                        _: 'Sro Schedule No',
                                    })}
                                </TableCell>
                            )}
                            {columns.sro_item && (
                                <TableCell sx={{ ...thSx, width: '9%' }}>
                                    {translate('resources.orders.invoice.sro_item', { _: 'Sro Item' })}
                                </TableCell>
                            )}
                            {columns.fbr_sale_type && (
                                <TableCell sx={{ ...thSx, width: '12%' }}>
                                    {translate('resources.orders.invoice.fbr_sale_type', {
                                        _: 'FBR Sale type',
                                    })}
                                </TableCell>
                            )}
                            {columns.remarks && (
                                <TableCell sx={{ ...thSx, width: '14%' }}>
                                    {translate('resources.orders.invoice.remarks', { _: 'Remarks' })}
                                </TableCell>
                            )}
                            <TableCell sx={{ ...thSx, width: 36, px: '4px' }} />
                        </TableRow>
                    </TableHead>

                    <TableBody>
                        {fields.map((line, index) => (
                            <InvoiceLineRow
                                key={(line as any).id ?? (line as any)._id ?? `tmp-${index}`}
                                index={index}
                                columns={columns}
                                onRemove={() => removeLine(index)}
                            />
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* ── Add a line ── */}
            <Box sx={{ mt: 1, pl: 0.5 }}>
                <Link
                    component="button"
                    type="button"
                    onClick={addLine}
                    sx={{
                        cursor: 'pointer',
                        fontSize: 13,
                        fontWeight: 500,
                        textDecoration: 'none',
                        border: 'none',
                        background: 'none',
                        p: 0,
                        font: 'inherit',
                        '&:hover': { textDecoration: 'underline' },
                    }}
                >
                    {translate('resources.orders.invoice.add_a_line', { _: 'Add a line' })}
                </Link>
            </Box>
        </Box>
    );
}