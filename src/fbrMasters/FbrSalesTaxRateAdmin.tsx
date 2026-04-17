import * as React from 'react';
import {
    Create,
    CreateButton,
    DataTable,
    Edit,
    List,
    ColumnsButton,
    TopToolbar,
    NumberInput,
    required,
    SimpleForm,
    TextInput,
    DateInput,
    BooleanInput,
    SelectInput,
    useTranslate,
    FunctionField,
    DateField,
    useListContext,
    useStore,
    useDefaultTitle,
    useRecordContext,
    useGetIdentity,
    PrevNextButtons,
} from 'react-admin';
import { useWatch } from 'react-hook-form';
import {
    Box,
    Button,
    Card,
    CardContent,
    Divider,
    Grid,
    IconButton,
    InputBase,
    Paper,
    Tab,
    Tabs,
    Tooltip,
    Typography,
} from '@mui/material';
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewKanbanOutlinedIcon from '@mui/icons-material/ViewKanbanOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import ShowChartOutlinedIcon from '@mui/icons-material/ShowChartOutlined';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import CloseIcon from '@mui/icons-material/Close';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';

import {
    FormHeaderToolbar,
    FormSaveBridge,
    FORM_SAVE_FBR_SALES_TAX_RATE,
} from '../common/formToolbar';
import { FbrSalesTaxRateChatter } from './FbrSalesTaxRateChatter';

const NAV_TEAL = '#3d7a7a';
const NAV_TEAL_DARK = '#2e6262';

const TAX_COLUMNS_STORE_KEY = 'fbrSalesTaxRates.columns';
const TAX_COLUMNS_BUTTON_ID = 'fbrSalesTaxRates.columnsButton';

// ── Shared label style matching Odoo's bold compact labels ──────────────────
const FIELD_LABEL_SX = {
    fontWeight: 700,
    fontSize: '0.8rem',
    color: '#212529',
    minWidth: 140,
    lineHeight: '30px',
};

const FIELD_VALUE_SX = {
    fontSize: '0.8rem',
    color: '#212529',
    lineHeight: '30px',
};

/** Bottom border only — same spirit as invoice line `variant="standard"` inputs in OrderInvoiceLines */
const TAX_UNDERLINE_FIELD_SX = {
    mb: 0,
    '& .MuiFormHelperText-root': { display: 'none' },
    '& .MuiInputBase-root': { fontSize: '0.8rem', minHeight: 30 },
    '& .MuiInputBase-input': { py: '5px' },
    '& .MuiInputLabel-root': { display: 'none' },
};

// ── Inline read-only label/value row ────────────────────────────────────────
function FieldRow({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                minHeight: 30,
                mb: '2px',
            }}
        >
            <Typography sx={{ ...FIELD_LABEL_SX }}>{label}</Typography>
            <Box sx={{ flex: 1, ...FIELD_VALUE_SX }}>{children}</Box>
        </Box>
    );
}

// ── Compact TextInput wrapper that removes extra margin ──────────────────────
const CompactTextInput = (props: React.ComponentProps<typeof TextInput>) => (
    <TextInput
        {...props}
        variant="standard"
        margin="none"
        size="small"
        sx={{
            ...TAX_UNDERLINE_FIELD_SX,
            ...(props.sx as object),
        }}
    />
);

const CompactNumberInput = (props: React.ComponentProps<typeof NumberInput>) => (
    <NumberInput
        {...props}
        variant="standard"
        margin="none"
        size="small"
        sx={{
            ...TAX_UNDERLINE_FIELD_SX,
            ...(props.sx as object),
        }}
    />
);

const CompactSelectInput = (props: React.ComponentProps<typeof SelectInput>) => (
    <SelectInput
        {...props}
        variant="standard"
        margin="none"
        size="small"
        sx={{
            ...TAX_UNDERLINE_FIELD_SX,
            '& .MuiSelect-select': { py: '5px' },
            '& .MuiSelect-icon': { top: 'calc(50% - 12px)' },
            ...(props.sx as object),
        }}
    />
);

const CompactDateInput = (props: React.ComponentProps<typeof DateInput>) => (
    <DateInput
        {...props}
        variant="standard"
        margin="none"
        size="small"
        sx={{
            ...TAX_UNDERLINE_FIELD_SX,
            ...(props.sx as object),
        }}
    />
);

function TaxListActions() {
    const { filterValues, setFilters, page, perPage, total, setPage } = useListContext();
    const [view, setView] = useStore<'list' | 'kanban' | 'calendar' | 'pivot' | 'graph' | 'activity'>(
        'fbrSalesTaxRates.listView',
        'list'
    );
    const [q, setQ] = React.useState<string>(String((filterValues as { q?: string })?.q ?? ''));

    React.useEffect(() => {
        setQ(String((filterValues as { q?: string })?.q ?? ''));
    }, [(filterValues as { q?: string })?.q]);

    React.useEffect(() => {
        const t = window.setTimeout(() => {
            const next = q.trim();
            setFilters({ ...(filterValues as object), q: next || undefined } as never, null);
        }, 250);
        return () => window.clearTimeout(t);
    }, [q, setFilters, filterValues]);

    const pageStart = total ? (page - 1) * perPage + 1 : 0;
    const pageEnd = total ? Math.min(page * perPage, total) : 0;

    const viewButtons: {
        key: 'list' | 'kanban' | 'calendar' | 'pivot' | 'graph' | 'activity';
        icon: React.ReactNode;
        label: string;
        disabled?: boolean;
    }[] = [
        { key: 'list', icon: <ViewListIcon fontSize="small" />, label: 'List' },
        { key: 'kanban', icon: <ViewKanbanOutlinedIcon fontSize="small" />, label: 'Kanban', disabled: true },
        { key: 'calendar', icon: <CalendarMonthOutlinedIcon fontSize="small" />, label: 'Calendar', disabled: true },
        { key: 'pivot', icon: <TableChartOutlinedIcon fontSize="small" />, label: 'Pivot', disabled: true },
        { key: 'graph', icon: <ShowChartOutlinedIcon fontSize="small" />, label: 'Graph', disabled: true },
        { key: 'activity', icon: <AccessTimeIcon fontSize="small" />, label: 'Activity', disabled: true },
    ];

    return (
        <TopToolbar
            sx={{
                width: '100%',
                p: 0,
                minHeight: 'unset',
                flexDirection: 'column',
                pt: 0,
            }}
        >
            <Box
                sx={{
                    width: '100%',
                    bgcolor: 'common.white',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    px: 2,
                    py: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', flex: '0 0 auto' }}>
                    <CreateButton
                        label="New"
                        variant="contained"
                        size="small"
                        sx={{
                            bgcolor: NAV_TEAL,
                            color: '#fff',
                            textTransform: 'none',
                            fontWeight: 700,
                            fontSize: 13,
                            borderRadius: '4px',
                            px: 2,
                            py: '4px',
                            minHeight: 30,
                            boxShadow: 'none',
                            '&:hover': { bgcolor: NAV_TEAL_DARK, boxShadow: 'none' },
                        }}
                    />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 0.5 }}>
                        <Typography variant="body1" sx={{ fontWeight: 700, fontSize: 15, color: 'text.primary' }}>
                            Taxes
                        </Typography>
                        <IconButton
                            size="small"
                            sx={{ color: 'text.secondary', p: '2px' }}
                            onClick={() => {
                                const el = document.getElementById(TAX_COLUMNS_BUTTON_ID) as HTMLButtonElement | null;
                                el?.click();
                            }}
                        >
                            <SettingsOutlinedIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                        <Box
                            sx={{
                                position: 'absolute',
                                width: 1,
                                height: 1,
                                overflow: 'hidden',
                                clip: 'rect(0 0 0 0)',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            <ColumnsButton
                                id={TAX_COLUMNS_BUTTON_ID}
                                storeKey={TAX_COLUMNS_STORE_KEY}
                                sx={{ minWidth: 0, px: '6px' }}
                            />
                        </Box>
                    </Box>
                </Box>

                <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                    <Paper
                        variant="outlined"
                        sx={{
                            width: 'min(560px, 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            borderRadius: '4px',
                            borderColor: '#c9c9c9',
                            overflow: 'hidden',
                        }}
                    >
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                px: 1,
                                py: '5px',
                                bgcolor: '#eef6f6',
                                borderRight: '1px solid #e0e0e0',
                                cursor: 'pointer',
                                '&:hover': { bgcolor: '#d9eeee' },
                            }}
                        >
                            <FilterListIcon sx={{ fontSize: 18, color: NAV_TEAL }} />
                        </Box>
                        <InputBase
                            value={q}
                            onChange={e => setQ(e.target.value)}
                            placeholder="Search..."
                            sx={{ flex: 1, fontSize: 13, px: 1, py: '4px' }}
                            endAdornment={
                                q ? (
                                    <IconButton size="small" onClick={() => setQ('')} sx={{ p: '2px' }}>
                                        <CloseIcon sx={{ fontSize: 14 }} />
                                    </IconButton>
                                ) : null
                            }
                        />
                        <IconButton size="small" sx={{ p: '4px', color: 'text.secondary' }}>
                            <SearchIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                borderLeft: '1px solid #e0e0e0',
                                pl: 0.25,
                                cursor: 'pointer',
                                '&:hover': { color: NAV_TEAL },
                            }}
                        >
                            <ArrowDropDownIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                        </Box>
                    </Paper>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: '0 0 auto' }}>
                    {total != null && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                                {pageStart}–{pageEnd} / {total}
                            </Typography>
                            <IconButton size="small" disabled={page <= 1} onClick={() => setPage(page - 1)} sx={{ p: '2px' }}>
                                <NavigateBeforeIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                            <IconButton
                                size="small"
                                disabled={pageEnd >= (total ?? 0)}
                                onClick={() => setPage(page + 1)}
                                sx={{ p: '2px' }}
                            >
                                <NavigateNextIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                        </Box>
                    )}
                    <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 0.5 }} />
                    {viewButtons.map(({ key, icon, label, disabled }) => (
                        <Tooltip key={key} title={label}>
                            <span>
                                <IconButton
                                    size="small"
                                    disabled={Boolean(disabled)}
                                    onClick={() => !disabled && setView(key)}
                                    sx={{
                                        p: '5px',
                                        borderRadius: '4px',
                                        bgcolor: view === key ? '#e0f2f1' : 'transparent',
                                        color: view === key ? NAV_TEAL : 'text.secondary',
                                        border: view === key ? `1px solid ${NAV_TEAL}55` : '1px solid transparent',
                                        '&:hover': { bgcolor: disabled ? undefined : '#eef6f6' },
                                    }}
                                >
                                    {icon}
                                </IconButton>
                            </span>
                        </Tooltip>
                    ))}
                </Box>
            </Box>
        </TopToolbar>
    );
}

const TaxListTitle = () => {
    const title = useDefaultTitle();
    const { defaultTitle } = useListContext();
    return (
        <>
            <title>{`${title} - ${defaultTitle}`}</title>
            <span>{defaultTitle}</span>
        </>
    );
};

function toYyyyMmDd(v: unknown): string | undefined {
    if (v === null || v === undefined || v === '') return undefined;
    if (v instanceof Date && !Number.isNaN(v.getTime())) {
        const y = v.getFullYear();
        const m = String(v.getMonth() + 1).padStart(2, '0');
        const d = String(v.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }
    if (typeof v === 'string') return v.trim().slice(0, 10);
    return undefined;
}

function mergeTaxFormPatch(
    base: Record<string, unknown>,
    patch: Record<string, unknown>
): Record<string, unknown> {
    const out = { ...base };
    for (const [k, v] of Object.entries(patch)) {
        if (v !== undefined) out[k] = v;
    }
    return out;
}

/**
 * Merge with previousData so fields absent from JSON (undefined → dropped by JSON.stringify)
 * do not clear DB columns. Strip display-only / server-owned keys before PUT/POST.
 */
const taxFormTransform = (
    data: Record<string, unknown>,
    options?: { previousData?: Record<string, unknown> }
) => {
    const prev = options?.previousData as Record<string, unknown> | undefined;
    const { chatterMessages: _pcm, ...prevRest } = prev ?? {};
    const { chatterMessages: _cm, ...submitted } = data;
    const merged = mergeTaxFormPatch({ ...prevRest }, submitted);

    delete merged.chatterMessages;
    delete merged.companyName;
    delete merged.companyId;

    const out: Record<string, unknown> = { ...merged };
    const from = toYyyyMmDd(out.effectiveFrom);
    if (from) out.effectiveFrom = from;
    const to = toYyyyMmDd(out.effectiveTo);
    if (to) out.effectiveTo = to;
    else delete out.effectiveTo;
    const ts = out.taxScope;
    if (ts === '' || ts === null || ts === undefined) delete out.taxScope;
    if (out.taxType === 'purchases') out.taxType = 'purchase';
    const ip = out.includedInPrice;
    if (ip === '' || ip === null || ip === undefined) out.includedInPrice = 'default';

    const strOrNull = (v: unknown) => {
        if (v === undefined || v === null) return null;
        const s = String(v).trim();
        return s === '' ? null : s;
    };
    out.labelOnInvoices = strOrNull(out.labelOnInvoices);
    out.description = strOrNull(out.description);
    out.legalNotes = strOrNull(out.legalNotes);

    return out;
};

const TAX_COMPUTATION_CHOICES = [
    { id: 'group_of_taxes', name: 'Group of Taxes' },
    { id: 'fixed', name: 'Fixed' },
    { id: 'percentage', name: 'Percentage' },
    { id: 'percentage_tax_included', name: 'Percentage Tax Included' },
];
const TAX_TYPE_CHOICES = [
    { id: 'sales', name: 'Sales' },
    { id: 'purchase', name: 'Purchase' },
    { id: 'none', name: 'None' },
];
const TAX_SCOPE_CHOICES = [
    { id: '', name: '—' },
    { id: 'services', name: 'Services' },
    { id: 'goods', name: 'Goods' },
];
const INCLUDED_IN_PRICE_CHOICES = [
    { id: 'default', name: 'Default' },
    { id: 'yes', name: 'Yes' },
    { id: 'no', name: 'No' },
];

function TaxDocHeading({ isCreate }: { isCreate: boolean }) {
    const translate = useTranslate();
    const label = useWatch({ name: 'label' }) as string | undefined;
    return (
        <Box sx={{ mb: 2 }}>
            <Typography variant="overline" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                {translate('resources.fbrSalesTaxRates.document', { _: 'Tax' })}
            </Typography>
            <Typography variant="h5" fontWeight={700} sx={{ lineHeight: 1.2, fontSize: '1.25rem' }}>
                {isCreate
                    ? translate('resources.fbrSalesTaxRates.new_title', { _: 'New tax' })
                    : label?.trim() || '—'}
            </Typography>
        </Box>
    );
}

function TaxSubHeader({ isCreate }: { isCreate: boolean }) {
    const translate = useTranslate();
    const label = useWatch({ name: 'label' }) as string | undefined;

    return (
        <Box
            sx={{
                position: { md: 'sticky' },
                top: { md: 0 },
                zIndex: 5,
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                px: 2,
                py: '6px',
                mb: 1.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 2,
                flexWrap: 'wrap',
            }}
        >
            <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle2" fontWeight={700} noWrap sx={{ fontSize: '0.85rem' }}>
                    {isCreate ? translate('resources.fbrSalesTaxRates.header_create', { _: 'Tax' }) : `Tax ${label?.trim() || ''}`}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: '0.72rem' }}>
                    {translate('resources.fbrSalesTaxRates.subheader_hint', {
                        _: 'All changes are saved on the server.',
                    })}
                </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                {!isCreate ? (
                    <PrevNextButtons
                        resource="fbrSalesTaxRates"
                        filterDefaultValues={{}}
                        sort={{ field: 'label', order: 'ASC' }}
                    />
                ) : null}
                <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />
                <FormHeaderToolbar
                    saveEventName={FORM_SAVE_FBR_SALES_TAX_RATE}
                    resource="fbrSalesTaxRates"
                    listPath="/fbrSalesTaxRates"
                    showDelete={!isCreate}
                    deleteConfirmMessage="Delete this tax rate?"
                    deleteSuccessMessage="Tax rate deleted"
                />
            </Box>
        </Box>
    );
}

function TaxCompanyReadOnly() {
    const translate = useTranslate();
    const { identity } = useGetIdentity();
    const record = useRecordContext<{ companyName?: string }>();
    const name =
        record?.companyName?.trim() ||
        (identity && 'companyName' in identity
            ? String((identity as { companyName?: string }).companyName ?? '').trim()
            : '');
    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                minHeight: 34,
                mb: '4px',
            }}
        >
            <Typography sx={{ ...FIELD_LABEL_SX }}>
                {translate('resources.fbrSalesTaxRates.fields.company', { _: 'Company' })}
            </Typography>
            <Typography
                sx={{
                    ...FIELD_VALUE_SX,
                    color: name ? '#0d6efd' : '#6c757d',
                    fontWeight: name ? 600 : 400,
                }}
            >
                {name || '—'}
            </Typography>
        </Box>
    );
}

function TaxAdvancedBoolean(props: React.ComponentProps<typeof BooleanInput>) {
    return (
        <BooleanInput
            {...props}
            sx={{
                m: 0,
                '& .MuiFormControlLabel-root': { ml: 0 },
                '& .MuiSwitch-root': { ml: 0 },
                ...(props.sx as object),
            }}
        />
    );
}

// ── Main form fields — 2-column label:field layout like Odoo ─────────────────
function TaxFormMainFields({ isCreate }: { isCreate: boolean }) {
    const translate = useTranslate();

    return (
        <Card
            variant="outlined"
            sx={{
                mt: isCreate ? 0 : 1,
                borderColor: '#dee2e6',
                borderRadius: '4px',
                boxShadow: 'none',
            }}
        >
            <CardContent sx={{ p: '16px 20px !important' }}>
                <TaxDocHeading isCreate={isCreate} />

                {/* Two-column form grid: left column and right column */}
                <Grid container columnSpacing={4} rowSpacing={0}>
                    {/* ── Left column ── */}
                    <Grid size={{ xs: 12, md: 6 }}>
                        {/* Tax Name */}
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                minHeight: 34,
                                mb: '4px',
                            }}
                        >
                            <Typography sx={{ ...FIELD_LABEL_SX }}>
                                {translate('resources.fbrSalesTaxRates.fields.tax_name', { _: 'Tax Name' })}
                            </Typography>
                            <Box sx={{ flex: 1 }}>
                                <CompactTextInput
                                    source="label"
                                    label={false}
                                    validate={required()}
                                    fullWidth
                                />
                            </Box>
                        </Box>

                        {/* Tax Computation */}
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                minHeight: 34,
                                mb: '4px',
                            }}
                        >
                            <Typography sx={{ ...FIELD_LABEL_SX }}>
                                {translate('resources.fbrSalesTaxRates.fields.tax_computation', { _: 'Tax Computation' })}
                            </Typography>
                            <Box sx={{ flex: 1 }}>
                                <CompactSelectInput
                                    source="taxComputation"
                                    label={false}
                                    choices={TAX_COMPUTATION_CHOICES}
                                    defaultValue="percentage"
                                    fullWidth
                                />
                            </Box>
                        </Box>

                        {/* Active toggle */}
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                minHeight: 34,
                                mb: '4px',
                            }}
                        >
                            <Typography sx={{ ...FIELD_LABEL_SX }}>
                                {translate('resources.fbrSalesTaxRates.fields.active', { _: 'Active' })}
                            </Typography>
                            <BooleanInput
                                source="active"
                                label={false}
                                sx={{
                                    m: 0,
                                    '& .MuiFormControlLabel-root': { ml: 0 },
                                    '& .MuiSwitch-root': { ml: 0 },
                                }}
                            />
                        </Box>
                    </Grid>

                    {/* ── Right column ── */}
                    <Grid size={{ xs: 12, md: 6 }}>
                        {/* Tax Type */}
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                minHeight: 34,
                                mb: '4px',
                            }}
                        >
                            <Typography sx={{ ...FIELD_LABEL_SX }}>
                                {translate('resources.fbrSalesTaxRates.fields.tax_type', { _: 'Tax Type' })}
                            </Typography>
                            <Box sx={{ flex: 1 }}>
                                <CompactSelectInput
                                    source="taxType"
                                    label={false}
                                    choices={TAX_TYPE_CHOICES}
                                    defaultValue="sales"
                                    fullWidth
                                />
                            </Box>
                        </Box>

                        {/* Tax Scope */}
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                minHeight: 34,
                                mb: '4px',
                            }}
                        >
                            <Typography sx={{ ...FIELD_LABEL_SX }}>
                                {translate('resources.fbrSalesTaxRates.fields.tax_scope', { _: 'Tax Scope' })}
                            </Typography>
                            <Box sx={{ flex: 1 }}>
                                <CompactSelectInput
                                    source="taxScope"
                                    label={false}
                                    choices={TAX_SCOPE_CHOICES}
                                    emptyValue=""
                                    fullWidth
                                    format={v => (v == null || v === '' ? '' : v)}
                                />
                            </Box>
                        </Box>

                        {/* Amount (%) */}
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                minHeight: 34,
                                mb: '4px',
                            }}
                        >
                            <Typography sx={{ ...FIELD_LABEL_SX }}>
                                {translate('resources.fbrSalesTaxRates.fields.amount_percent', { _: 'Amount' })}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <CompactNumberInput
                                    source="percentage"
                                    label={false}
                                    validate={required()}
                                    min={0}
                                    step={0.0001}
                                    sx={{ width: 120 }}
                                    format={v =>
                                        v === '' || v === null || v === undefined ? '' : Number(v) * 100
                                    }
                                    parse={v => {
                                        if (v === '' || v === null || v === undefined) return null;
                                        const n = Number(v);
                                        return Number.isFinite(n) ? n / 100 : null;
                                    }}
                                />
                                <Typography sx={{ fontSize: '0.8rem', color: '#555', fontWeight: 700 }}>%</Typography>
                            </Box>
                        </Box>
                    </Grid>
                </Grid>

                {/* ── Tabs ── */}
                <Box
                    sx={{
                        borderBottom: '1px solid #dee2e6',
                        mt: 2,
                    }}
                >
                    <Tabs
                        value={0}
                        onChange={() => {}}
                        textColor="primary"
                        indicatorColor="primary"
                        sx={{
                            minHeight: 36,
                            '& .MuiTab-root': {
                                textTransform: 'none',
                                minHeight: 36,
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                py: 0,
                                px: 2,
                                color: '#555',
                            },
                            '& .Mui-selected': { color: '#714B67 !important' },
                            '& .MuiTabs-indicator': { bgcolor: '#714B67' },
                        }}
                    >
                        <Tab
                            label={translate('resources.fbrSalesTaxRates.tab.advanced', { _: 'Advanced Options' })}
                        />
                    </Tabs>
                </Box>

                <Box sx={{ mt: 2 }}>
                        <Grid container columnSpacing={4} rowSpacing={0}>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', minHeight: 34, mb: '4px' }}>
                                    <Typography sx={{ ...FIELD_LABEL_SX }}>
                                        {translate('resources.fbrSalesTaxRates.fields.effective_from', {
                                            _: 'Effective From',
                                        })}
                                    </Typography>
                                    <Box sx={{ flex: 1 }}>
                                        <CompactDateInput
                                            source="effectiveFrom"
                                            label={false}
                                            validate={required()}
                                            fullWidth
                                        />
                                    </Box>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', minHeight: 34, mb: '4px' }}>
                                    <Typography sx={{ ...FIELD_LABEL_SX }}>
                                        {translate('resources.fbrSalesTaxRates.fields.effective_to', {
                                            _: 'Effective To',
                                        })}
                                    </Typography>
                                    <Box sx={{ flex: 1 }}>
                                        <CompactDateInput source="effectiveTo" label={false} fullWidth />
                                    </Box>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', minHeight: 34, mb: '4px' }}>
                                    <Typography sx={{ ...FIELD_LABEL_SX }}>
                                        {translate('resources.fbrSalesTaxRates.fields.label_on_invoices', {
                                            _: 'Label on Invoices',
                                        })}
                                    </Typography>
                                    <Box sx={{ flex: 1 }}>
                                        <CompactTextInput source="labelOnInvoices" label={false} fullWidth />
                                    </Box>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', minHeight: 34, mb: '4px' }}>
                                    <Typography sx={{ ...FIELD_LABEL_SX }}>
                                        {translate('resources.fbrSalesTaxRates.fields.description', {
                                            _: 'Description',
                                        })}
                                    </Typography>
                                    <Box sx={{ flex: 1 }}>
                                        <CompactTextInput source="description" label={false} fullWidth />
                                    </Box>
                                </Box>
                                <TaxCompanyReadOnly />
                                <Box sx={{ display: 'flex', alignItems: 'flex-start', minHeight: 34, mb: '4px' }}>
                                    <Typography sx={{ ...FIELD_LABEL_SX, pt: '4px' }}>
                                        {translate('resources.fbrSalesTaxRates.fields.legal_notes', {
                                            _: 'Legal Notes',
                                        })}
                                    </Typography>
                                    <Box sx={{ flex: 1 }}>
                                        <CompactTextInput source="legalNotes" label={false} fullWidth multiline minRows={2} />
                                    </Box>
                                </Box>
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', minHeight: 34, mb: '4px' }}>
                                    <Typography sx={{ ...FIELD_LABEL_SX }}>
                                        {translate('resources.fbrSalesTaxRates.fields.included_in_price', {
                                            _: 'Included in Price?',
                                        })}
                                    </Typography>
                                    <Box sx={{ flex: 1 }}>
                                        <CompactSelectInput
                                            source="includedInPrice"
                                            label={false}
                                            choices={INCLUDED_IN_PRICE_CHOICES}
                                            emptyValue="default"
                                            fullWidth
                                            format={v =>
                                                v == null || v === '' ? 'default' : v
                                            }
                                        />
                                    </Box>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', minHeight: 34, mb: '4px' }}>
                                    <Typography sx={{ ...FIELD_LABEL_SX }}>
                                        {translate('resources.fbrSalesTaxRates.fields.affect_base_subsequent', {
                                            _: 'Affect Base of Subsequent Taxes?',
                                        })}
                                    </Typography>
                                    <TaxAdvancedBoolean source="affectBaseOfSubsequentTaxes" label={false} />
                                </Box>
                            </Grid>
                        </Grid>
                    </Box>
            </CardContent>
        </Card>
    );
}

function TaxChatterColumn() {
    const record = useRecordContext<{ id?: number }>();
    const translate = useTranslate();
    const hasId = record?.id != null && typeof record.id === 'number';

    if (!hasId) {
        return (
            <Box
                sx={{
                    flex: { md: '0 0 30%' },
                    maxWidth: { md: 360 },
                    width: { xs: '100%', md: 'auto' },
                    p: 2,
                    border: '1px dashed #dee2e6',
                    borderRadius: 1,
                    alignSelf: 'flex-start',
                }}
            >
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                    {translate('resources.fbrSalesTaxRates.chatter_after_save', {
                        _: 'Save the tax rate once to enable chatter and attachments.',
                    })}
                </Typography>
            </Box>
        );
    }

    return (
        <Box
            sx={{
                flex: { md: '0 0 30%' },
                width: { xs: '100%', md: 'auto' },
                maxWidth: { md: 420 },
                minWidth: { md: 320 },
                overflow: { md: 'auto' },
                minHeight: 0,
                height: { md: '100%' },
                pr: { md: 0.5 },
            }}
        >
            <FbrSalesTaxRateChatter />
        </Box>
    );
}

function TaxFormWithChatterLayout({ isCreate }: { isCreate: boolean }) {
    return (
        <Box
            sx={{
                height: { xs: 'auto', md: 'calc(100vh - 64px)' },
                overflow: { xs: 'visible', md: 'hidden' },
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                gap: 2,
                width: '100%',
                maxWidth: '100%',
                alignItems: { xs: 'flex-start', md: 'stretch' },
            }}
        >
            <Box
                sx={{
                    flex: '1 1 68%',
                    minWidth: 0,
                    minHeight: 0,
                    height: { md: '100%' },
                    width: '100%',
                    overflow: { md: 'auto' },
                    pr: { md: 1 },
                }}
            >
                <TaxSubHeader isCreate={isCreate} />
                <TaxFormMainFields isCreate={isCreate} />
            </Box>
            <TaxChatterColumn />
        </Box>
    );
}

function formatPctCell(record: { percentage?: number | string | null }) {
    const p = record?.percentage;
    if (p === null || p === undefined || p === '') return '—';
    const n = typeof p === 'number' ? p : Number(p);
    if (!Number.isFinite(n)) return '—';
    return `${(n * 100).toLocaleString(undefined, { maximumFractionDigits: 6 })}%`;
}

const Column = DataTable.Col;

export function FbrSalesTaxRateList() {
    const [view] = useStore<'list' | 'kanban'>('fbrSalesTaxRates.listView', 'list');

    return (
        <List
            resource="fbrSalesTaxRates"
            perPage={25}
            actions={<TaxListActions />}
            title={<TaxListTitle />}
            exporter={false}
        >
            {view === 'kanban' ? (
                <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                    Kanban is not available for taxes.
                </Typography>
            ) : (
                <DataTable rowClick="edit" storeKey={TAX_COLUMNS_STORE_KEY}>
                    <Column source="label" label="Tax Name" />
                    <Column source="percentage" label="Amount %" disableSort>
                        <FunctionField label="" render={(r: { percentage?: number }) => formatPctCell(r)} />
                    </Column>
                    <Column source="effectiveFrom" label="Effective from" field={DateField} />
                    <Column source="effectiveTo" label="Effective to" disableSort>
                        <FunctionField
                            label=""
                            render={(r: { effectiveTo?: string | null }) =>
                                r?.effectiveTo
                                    ? new Date(r.effectiveTo).toLocaleDateString()
                                    : '—'
                            }
                        />
                    </Column>
                </DataTable>
            )}
        </List>
    );
}

export function FbrSalesTaxRateEdit() {
    return (
        <Edit actions={false} mutationMode="pessimistic" title="Tax" transform={taxFormTransform}>
            <SimpleForm sx={{ maxWidth: 'none' }} toolbar={false}>
                <FormSaveBridge eventName={FORM_SAVE_FBR_SALES_TAX_RATE} />
                <TaxFormWithChatterLayout isCreate={false} />
            </SimpleForm>
        </Edit>
    );
}

export function FbrSalesTaxRateCreate() {
    return (
        <Create title="Tax" transform={taxFormTransform} redirect="edit" actions={false}>
            <SimpleForm
                sx={{ maxWidth: 'none' }}
                toolbar={false}
                defaultValues={{
                    active: true,
                    taxComputation: 'percentage',
                    taxType: 'sales',
                    taxScope: '',
                    percentage: 0.18,
                    effectiveFrom: new Date(),
                    labelOnInvoices: '',
                    description: '',
                    legalNotes: '',
                    includedInPrice: 'default',
                    affectBaseOfSubsequentTaxes: false,
                }}
            >
                <FormSaveBridge eventName={FORM_SAVE_FBR_SALES_TAX_RATE} />
                <TaxFormWithChatterLayout isCreate={true} />
            </SimpleForm>
        </Create>
    );
}