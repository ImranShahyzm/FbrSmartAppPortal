import * as React from 'react';
import {
    List,
    DataTable,
    TopToolbar,
    useListContext,
    FunctionField,
    ReferenceField,
    TextField,
    useStore,
    useUpdate,
    useNotify,
    ColumnsButton,
    useCreatePath,
} from 'react-admin';
import { useNavigate } from 'react-router-dom';
import { useOdooListSearchQ } from '../common/useOdooListSearchQ';
import {
    Box,
    Button,
    Chip,
    IconButton,
    InputBase,
    Paper,
    Tooltip,
    Typography,
    Divider,
    Avatar,
} from '@mui/material';
import ViewListIcon          from '@mui/icons-material/ViewList';
import ViewKanbanOutlinedIcon from '@mui/icons-material/ViewKanbanOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import ShowChartOutlinedIcon from '@mui/icons-material/ShowChartOutlined';
import AccessTimeIcon        from '@mui/icons-material/AccessTime';
import SearchIcon            from '@mui/icons-material/Search';
import FilterListIcon        from '@mui/icons-material/FilterList';
import CloseIcon             from '@mui/icons-material/Close';
import ArrowDropDownIcon     from '@mui/icons-material/ArrowDropDown';
import SettingsOutlinedIcon  from '@mui/icons-material/SettingsOutlined';
import NavigateBeforeIcon    from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon      from '@mui/icons-material/NavigateNext';
import StarBorderIcon        from '@mui/icons-material/StarBorder';
import StarIcon              from '@mui/icons-material/Star';
import InventoryOutlinedIcon from '@mui/icons-material/InventoryOutlined';
import { API_BASE_URL } from '../api/apiBaseUrl';

// ── Theme color — match your nav ─────────────────────────────────────────────
const NAV_TEAL      = '#3d7a7a';
const NAV_TEAL_DARK = '#2e6262';

const PRODUCT_COLUMNS_STORE_KEY = 'productProfiles.columns';
const PRODUCT_COLUMNS_BUTTON_ID = 'productProfiles.columnsButton';

// ── Helpers ──────────────────────────────────────────────────────────────────
function imgSrc(path?: string) {
    if (!path) return null;
    return `${API_BASE_URL}/${String(path).replace(/^\/+/, '')}`;
}

function SaleTypeDescription(props: { record: any }) {
    const id = props.record?.fbrPdiTransTypeId ?? props.record?.saleTypeId ?? null;
    if (id == null || id === '') return null;
    return (
        <ReferenceField
            record={{ ...props.record, __saleTypeId: id }}
            source="__saleTypeId"
            reference="fbrPdiTransTypes"
            link={false}
            emptyText=""
        >
            <TextField source="description" />
        </ReferenceField>
    );
}

function UomDescription(props: { record: any }) {
    const id = props.record?.fbrUomId ?? null;
    if (id == null || id === '') return null;
    return (
        <ReferenceField
            record={{ ...props.record, __uomId: id }}
            source="__uomId"
            reference="fbrPdiUoms"
            link={false}
            emptyText=""
        >
            <TextField source="description" />
        </ReferenceField>
    );
}

// ── Star (favourite) button ───────────────────────────────────────────────────
function StarButton({ record }: { record: any }) {
    const [update] = useUpdate();
    const notify   = useNotify();
    const starred  = Boolean(record?.isFavourite);

    const toggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        update(
            'productProfiles',
            { id: record.id, data: { isFavourite: !starred }, previousData: record },
            {
                onError: () => notify('Could not update favourite', { type: 'error' }),
            }
        );
    };

    return (
        <IconButton size="small" onClick={toggle} sx={{ p: '2px', color: starred ? '#f5a623' : '#ccc' }}>
            {starred ? <StarIcon sx={{ fontSize: 16 }} /> : <StarBorderIcon sx={{ fontSize: 16 }} />}
        </IconButton>
    );
}

// ── Toolbar ───────────────────────────────────────────────────────────────────
function ProductListActions() {
    const { page, perPage, total, setPage } = useListContext();
    const [q, setQ] = useOdooListSearchQ();
    const [view, setView] = useStore<'list' | 'kanban'>('productProfiles.listView', 'list');
    const createPath = useCreatePath();
    const navigate = useNavigate();

    const pageStart = total ? (page - 1) * perPage + 1 : 0;
    const pageEnd   = total ? Math.min(page * perPage, total) : 0;

    const viewButtons = [
        { key: 'list',     icon: <ViewListIcon fontSize="small" />,              label: 'List' },
        { key: 'kanban',   icon: <ViewKanbanOutlinedIcon fontSize="small" />,    label: 'Kanban' },
        { key: 'calendar', icon: <CalendarMonthOutlinedIcon fontSize="small" />, label: 'Calendar', disabled: true },
        { key: 'pivot',    icon: <TableChartOutlinedIcon fontSize="small" />,    label: 'Pivot',    disabled: true },
        { key: 'graph',    icon: <ShowChartOutlinedIcon fontSize="small" />,     label: 'Graph',    disabled: true },
        { key: 'activity', icon: <AccessTimeIcon fontSize="small" />,            label: 'Activity', disabled: true },
    ];

    return (
        <TopToolbar sx={{ width: '100%', p: 0, minHeight: 'unset', flexDirection: 'column', pt: 0 }}>
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
                {/* Left */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', flex: '0 0 auto' }}>
                    <Button
                        variant="contained"
                        size="small"
                        onClick={() =>
                            navigate(
                                createPath({
                                    type: 'create',
                                    resource: 'productProfiles',
                                })
                            )
                        }
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
                    >
                        New
                    </Button>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 0.5, position: 'relative' }}>
                        <Typography variant="body1" sx={{ fontWeight: 700, fontSize: 15 }}>
                            Products
                        </Typography>
                        <IconButton
                            size="small"
                            sx={{ color: 'text.secondary', p: '2px' }}
                            onClick={() => {
                                const el = document.getElementById(PRODUCT_COLUMNS_BUTTON_ID) as HTMLButtonElement | null;
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
                                id={PRODUCT_COLUMNS_BUTTON_ID}
                                storeKey={PRODUCT_COLUMNS_STORE_KEY}
                                sx={{ minWidth: 0, px: '6px' }}
                            />
                        </Box>
                    </Box>
                </Box>

                {/* Center search */}
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
                                display: 'flex', alignItems: 'center',
                                px: 1, py: '5px',
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
                                display: 'flex', alignItems: 'center',
                                borderLeft: '1px solid #e0e0e0', pl: 0.25,
                                cursor: 'pointer',
                            }}
                        >
                            <ArrowDropDownIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                        </Box>
                    </Paper>
                </Box>

                {/* Right: pagination + views */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: '0 0 auto' }}>
                    {total != null && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                                {pageStart}–{pageEnd} / {total}
                            </Typography>
                            <IconButton size="small" disabled={page <= 1} onClick={() => setPage(page - 1)} sx={{ p: '2px' }}>
                                <NavigateBeforeIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                            <IconButton size="small" disabled={pageEnd >= (total ?? 0)} onClick={() => setPage(page + 1)} sx={{ p: '2px' }}>
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
                                    disabled={disabled}
                                    onClick={() => !disabled && setView(key as any)}
                                    sx={{
                                        p: '5px',
                                        borderRadius: '4px',
                                        bgcolor: view === key ? '#e0f2f1' : 'transparent',
                                        color:   view === key ? NAV_TEAL  : 'text.secondary',
                                        border:  view === key ? `1px solid ${NAV_TEAL}55` : '1px solid transparent',
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

// ── Variant-tag chips (like "Legs: Custom", "Color: White") ──────────────────
function VariantChips({ value }: { value?: string | string[] }) {
    if (!value) return null;
    const tags = Array.isArray(value) ? value : String(value).split(',').map(s => s.trim()).filter(Boolean);
    if (!tags.length) return null;
    return (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {tags.map(tag => (
                <Chip
                    key={tag}
                    label={tag}
                    size="small"
                    sx={{
                        height: 20,
                        borderRadius: '4px',
                        bgcolor: '#f0f0f0',
                        color: 'text.primary',
                        fontSize: 11,
                        fontWeight: 500,
                        border: '1px solid #e0e0e0',
                        '& .MuiChip-label': { px: '6px', py: 0 },
                    }}
                />
            ))}
        </Box>
    );
}

// ── Kanban card ───────────────────────────────────────────────────────────────
function ProductKanban() {
    const { data, isLoading } = useListContext();
    const createPath = useCreatePath();
    const navigate = useNavigate();
    if (isLoading) return null;
    const rows = data ? Object.values(data) : [];

    return (
        <Box sx={{ p: 1.5 }}>
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: 1.5,
                }}
            >
                {rows.map((r: any) => {
                    const src   = imgSrc(r?.productImage);
                    const name  = r?.productName ?? r?.productNo ?? 'Product';
                    const price = r?.rateValue ?? r?.salePrice ?? r?.rate ?? r?.rateId ?? null;

                    return (
                        <Paper
                            key={r.id}
                            variant="outlined"
                            sx={{
                                cursor: 'pointer',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                transition: 'box-shadow .15s',
                                '&:hover': { boxShadow: 3 },
                            }}
                            onClick={() =>
                                navigate(
                                    createPath({
                                        type: 'edit',
                                        resource: 'productProfiles',
                                        id: r.id,
                                    })
                                )
                            }
                        >
                            {/* Product image / placeholder */}
                            <Box
                                sx={{
                                    width: '100%',
                                    height: 160,
                                    bgcolor: '#f9f9f9',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderBottom: '1px solid #f0f0f0',
                                    overflow: 'hidden',
                                }}
                            >
                                {src ? (
                                    <Box
                                        component="img"
                                        src={src}
                                        alt={name}
                                        sx={{ width: '100%', height: '100%', objectFit: 'contain', p: 1 }}
                                    />
                                ) : (
                                    <InventoryOutlinedIcon sx={{ fontSize: 56, color: '#ddd' }} />
                                )}
                            </Box>

                            {/* Card body */}
                            <Box sx={{ p: 1.25 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <Typography variant="body2" fontWeight={700} noWrap sx={{ flex: 1, mr: 0.5 }}>
                                        {name}
                                    </Typography>
                                    <StarButton record={r} />
                                </Box>

                                {r?.hsCode && (
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                                        HS: {r.hsCode}
                                    </Typography>
                                )}

                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                    <SaleTypeDescription record={r} />
                                </Typography>

                                {price != null && (
                                    <Typography variant="body2" fontWeight={700} sx={{ mt: 0.75, color: NAV_TEAL }}>
                                        {Number(price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </Typography>
                                )}
                            </Box>
                        </Paper>
                    );
                })}
            </Box>
        </Box>
    );
}

const Column = DataTable.Col;

// ── Main list ─────────────────────────────────────────────────────────────────
export default function ProductProfileList() {
    const [view] = useStore<'list' | 'kanban'>('productProfiles.listView', 'list');

    return (
        <List
            resource="productProfiles"
            sort={{ field: 'productName', order: 'ASC' }}
            perPage={25}
            actions={<ProductListActions />}
        >
            {view === 'kanban' ? (
                <ProductKanban />
            ) : (
                <DataTable
                    rowClick="edit"
                    bulkActionButtons={false}
                    storeKey={PRODUCT_COLUMNS_STORE_KEY}
                    hiddenColumns={['variantValues', 'fixedNotifiedApplicable']}
                    sx={{
                        '& .column-isFavourite': { width: 40, maxWidth: 40 },
                        '& .column-productImage': { width: 64 },
                        '& .MuiTableCell-head': { fontWeight: 700 },
                    }}
                >
                    <Column source="isFavourite" label="" disableSort>
                        <FunctionField
                            label=""
                            source="isFavourite"
                            render={(record: { id?: string; isFavourite?: boolean }) => <StarButton record={record} />}
                        />
                    </Column>
                    <Column source="productImage" label="Image" disableSort>
                        <FunctionField
                            label=""
                            source="productImage"
                            render={(record: { productImage?: string }) => {
                                const src = imgSrc(record?.productImage);
                                return src ? (
                                    <Box
                                        component="img"
                                        src={src}
                                        alt=""
                                        sx={{
                                            width: 40,
                                            height: 40,
                                            objectFit: 'contain',
                                            borderRadius: 1,
                                            border: '1px solid #eee',
                                            display: 'block',
                                        }}
                                    />
                                ) : (
                                    <Box
                                        sx={{
                                            width: 40,
                                            height: 40,
                                            borderRadius: 1,
                                            border: '1px solid #eee',
                                            bgcolor: '#f5f5f5',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <InventoryOutlinedIcon sx={{ fontSize: 20, color: '#ccc' }} />
                                    </Box>
                                );
                            }}
                        />
                    </Column>
                    <Column source="productName" label="Product Name" />
                    <Column source="variantValues" label="Variant Values" disableSort>
                        <FunctionField
                            label=""
                            source="variantValues"
                            render={(record: { variantValues?: string | string[] }) => (
                                <VariantChips value={record?.variantValues} />
                            )}
                        />
                    </Column>
                    <Column source="hsCode" label="HS Code" />
                    <Column source="saleTypeId" label="Sale Type" disableSort>
                        <FunctionField label="" render={(record: any) => <SaleTypeDescription record={record} />} />
                    </Column>
                    <Column source="fbrProductType" label="Product Type" />
                    <Column source="fbrUomId" label="FBR UOM (PDI)" disableSort>
                        <FunctionField label="" render={(record: any) => <UomDescription record={record} />} />
                    </Column>
                    <Column source="rateValue" label="Sale Price">
                        <FunctionField
                            label=""
                            source="rateValue"
                            render={(record: { rateValue?: unknown; rateId?: unknown; salePrice?: unknown }) => {
                                const raw = record?.rateValue ?? record?.salePrice ?? record?.rateId;
                                const v = Number(raw);
                                if (Number.isNaN(v)) {
                                    const r = raw;
                                    return r == null || r === '' ? '' : String(r);
                                }
                                return v.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                });
                            }}
                        />
                    </Column>
                    <Column source="purchasePrice" label="Purchase Price">
                        <FunctionField
                            label=""
                            source="purchasePrice"
                            render={(record: { purchasePrice?: unknown }) => {
                                const v = Number(record?.purchasePrice);
                                if (Number.isNaN(v)) {
                                    const r = record?.purchasePrice;
                                    return r == null || r === '' ? '' : String(r);
                                }
                                return v.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                });
                            }}
                        />
                    </Column>
                    <Column source="mrpRateValue" label="MRP Rate">
                        <FunctionField
                            label=""
                            source="mrpRateValue"
                            render={(record: { mrpRateValue?: unknown }) => {
                                const v = Number(record?.mrpRateValue);
                                if (Number.isNaN(v)) {
                                    const r = record?.mrpRateValue;
                                    return r == null || r === '' ? '' : String(r);
                                }
                                return v.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                });
                            }}
                        />
                    </Column>
                    <Column source="sroScheduleNoText" label="SRO Schedule Number" />
                    <Column source="sroItemRefText" label="SRO Item" />
                    <Column source="fixedNotifiedApplicable" label="Fixed Notified Applicable">
                        <FunctionField
                            label=""
                            source="fixedNotifiedApplicable"
                            render={(record: { fixedNotifiedApplicable?: unknown }) =>
                                record?.fixedNotifiedApplicable ? 'Yes' : record?.fixedNotifiedApplicable === false ? 'No' : ''
                            }
                        />
                    </Column>
                    <Column source="productNo" label="Product No" />
                </DataTable>
            )}
        </List>
    );
}
