import * as React from 'react';
import {
    List,
    ColumnsButton,
    DataTable,
    TopToolbar,
    useListContext,
    useRefresh,
    useTranslate,
    useCreatePath,
    Link as RaLink,
    useStore,
} from 'react-admin';
import type { Identifier } from 'react-admin';
import {
    Box,
    Button,
    Chip,
    CircularProgress,
    Divider,
    IconButton,
    InputBase,
    List as MuiList,
    ListItemButton,
    ListItemText,
    ListItemIcon,
    Menu,
    MenuItem,
    Paper,
    Popover,
    Switch,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tooltip,
    Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import FilterListIcon from '@mui/icons-material/FilterList';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import ViewListIcon from '@mui/icons-material/ViewList';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import StarBorderOutlinedIcon from '@mui/icons-material/StarBorderOutlined';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import TuneIcon from '@mui/icons-material/Tune';
import Swal from 'sweetalert2';
import { Link } from 'react-router-dom';

import { apiFetch } from '../api/httpClient';
import { useAccountingAccess } from './useAccountingAccess';
import { renderHierarchicalTypeItems } from './glAccountTypeHierarchyMenu';

const GL_CHART_COLUMNS_STORE_KEY = 'glChartAccounts.columns';
const GL_CHART_COLUMNS_BUTTON_ID = 'glChartAccounts.columnsButton';
const GL_CHART_GROUP_BY_STORE_KEY = 'glChartAccounts.groupBy';

export type GlChartGroupByMode = 'none' | 'accountType';

const GL_CHART_GROUP_BY_OPTIONS: { value: GlChartGroupByMode; label: string }[] = [
    { value: 'none', label: 'None' },
    { value: 'accountType', label: 'Account Type' },
];

const NAV_SECONDARY = '#714b67';

export type GlAccountTypeRow = {
    id: number;
    title: string | null;
    mainParent: number | null;
    reportingHead: string | null;
    orderBy: number | null;
    selectable: boolean;
};

const GlAccountTypesContext = React.createContext<GlAccountTypeRow[]>([]);
function useGlAccountTypesLoaded(): GlAccountTypeRow[] {
    return React.useContext(GlAccountTypesContext);
}

function useSelectableAccountTypesOrdered(): GlAccountTypeRow[] {
    const types = useGlAccountTypesLoaded();
    return React.useMemo(
        () =>
            [...types]
                .filter(t => t.selectable)
                .sort((a, b) => (Number(a.orderBy) || 0) - (Number(b.orderBy) || 0)),
        [types]
    );
}

// ─── "All" quick-filter pill ──────────────────────────────────────────────────
function QuickFilterPill({ label, active, onClick }: { label: string; active?: boolean; onClick?: () => void }) {
    return (
        <Box
            component="button"
            onClick={onClick}
            sx={{
                display: 'inline-flex',
                alignItems: 'center',
                px: '10px',
                py: '2px',
                height: 24,
                fontSize: 12,
                fontWeight: active ? 600 : 400,
                color: active ? '#fff' : 'text.secondary',
                bgcolor: active ? 'secondary.main' : 'transparent',
                border: '1px solid',
                borderColor: active ? 'secondary.main' : 'divider',
                borderRadius: '12px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                '&:hover': { borderColor: 'secondary.main', color: active ? '#fff' : 'secondary.main' },
            }}
        >
            {label}
        </Box>
    );
}

// ─── Toolbar ──────────────────────────────────────────────────────────────────
function ChartListToolbar() {
    const translate = useTranslate();
    const refresh = useRefresh();
    const createPath = useCreatePath();
    const { filterValues, setFilters, page, perPage, total, setPage } = useListContext();
    const canRead = useAccountingAccess('glChartAccounts', 'read');
    const canWrite = useAccountingAccess('glChartAccounts', 'write');
    const allAccountTypes = useGlAccountTypesLoaded();
    const accountTypesOrdered = useSelectableAccountTypesOrdered();
    const [groupBy, setGroupBy] = useStore<GlChartGroupByMode>(GL_CHART_GROUP_BY_STORE_KEY, 'none');

    const [q, setQ] = React.useState<string>(String((filterValues as Record<string, unknown>)?.q ?? ''));
    const [searchPanelOpen, setSearchPanelOpen] = React.useState(false);
    const [activeFilters, setActiveFilters] = React.useState<Set<string>>(new Set());
    const [settingsMenuAnchor, setSettingsMenuAnchor] = React.useState<null | HTMLElement>(null);
    const [importBusy, setImportBusy] = React.useState(false);
    const searchBarRef = React.useRef<HTMLDivElement>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const closeSearchPanel = React.useCallback(() => setSearchPanelOpen(false), []);
    const toggleSearchPanel = React.useCallback(() => setSearchPanelOpen(o => !o), []);

    React.useEffect(() => {
        setQ(String((filterValues as Record<string, unknown>)?.q ?? ''));
    }, [(filterValues as Record<string, unknown>)?.q]);

    const filterValuesRef = React.useRef(filterValues);
    filterValuesRef.current = filterValues;
    const setFiltersRef = React.useRef(setFilters);
    setFiltersRef.current = setFilters;
    const setPageRef = React.useRef(setPage);
    setPageRef.current = setPage;

    const glTypeIdsSerialized = React.useMemo(() => {
        const v = (filterValues as Record<string, unknown>)?.glTypeIds;
        if (!Array.isArray(v)) return '';
        return v
            .map(x => String(Number(x)))
            .filter(s => s !== 'NaN')
            .sort()
            .join(',');
    }, [filterValues]);

    React.useEffect(() => {
        const v = (filterValues as Record<string, unknown>)?.glTypeIds;
        if (!Array.isArray(v) || v.length === 0) {
            setActiveFilters(new Set());
            return;
        }
        setActiveFilters(new Set(v.map(x => String(Number(x))).filter(s => s !== 'NaN')));
    }, [glTypeIdsSerialized]);

    React.useEffect(() => {
        const t = window.setTimeout(() => {
            const next = q.trim();
            const fv = filterValuesRef.current as Record<string, unknown>;
            const cur = String(fv.q ?? '').trim();
            if (cur === next) return;
            setFiltersRef.current({ ...fv, q: next || undefined } as Record<string, unknown>, null);
        }, 250);
        return () => window.clearTimeout(t);
    }, [q]);

    const applyTypeIdFilterSet = React.useCallback((next: Set<string>) => {
        const fv = { ...(filterValuesRef.current as Record<string, unknown>) };
        const ids = Array.from(next).map(s => Number(s)).filter(x => !Number.isNaN(x));
        if (ids.length > 0) fv.glTypeIds = ids;
        else delete fv.glTypeIds;
        setFiltersRef.current(fv as Record<string, unknown>, null);
        setPageRef.current(1);
    }, []);

    const toggleTypeFilter = React.useCallback((typeIdStr: string) => {
        setActiveFilters(prev => {
            const n = new Set(prev);
            if (n.has(typeIdStr)) n.delete(typeIdStr);
            else n.add(typeIdStr);
            applyTypeIdFilterSet(n);
            return n;
        });
    }, [applyTypeIdFilterSet]);

    const selectableDescendantsOf = React.useMemo(() => {
        const byParent = new Map<number | null, GlAccountTypeRow[]>();
        const byId = new Map<number, GlAccountTypeRow>();
        for (const t of allAccountTypes) {
            byId.set(t.id, t);
            const key = (t.mainParent ?? null) as number | null;
            const arr = byParent.get(key);
            if (arr) arr.push(t);
            else byParent.set(key, [t]);
        }

        const cache = new Map<number, number[]>();
        const collect = (rootId: number): number[] => {
            const cached = cache.get(rootId);
            if (cached) return cached;
            const out: number[] = [];
            const stack: number[] = [rootId];
            const seen = new Set<number>();
            while (stack.length) {
                const cur = stack.pop()!;
                if (seen.has(cur)) continue;
                seen.add(cur);
                const node = byId.get(cur);
                if (node?.selectable) out.push(cur);
                const kids = byParent.get(cur) ?? [];
                for (const k of kids) stack.push(k.id);
            }
            cache.set(rootId, out);
            return out;
        };

        return collect;
    }, [allAccountTypes]);

    const mainAccountTypes = React.useMemo(
        () =>
            [...allAccountTypes]
                .filter(t => (t.mainParent ?? null) === null)
                .sort((a, b) => (Number(a.orderBy) || 0) - (Number(b.orderBy) || 0)),
        [allAccountTypes]
    );

    const toggleMainTypeFilter = React.useCallback((mainTypeId: number) => {
        const leafIds = selectableDescendantsOf(mainTypeId);
        setActiveFilters(prev => {
            const anySelected = leafIds.some(id => prev.has(String(id)));
            const next = new Set(prev);
            if (anySelected) {
                for (const id of leafIds) next.delete(String(id));
            } else {
                for (const id of leafIds) next.add(String(id));
            }
            applyTypeIdFilterSet(next);
            return next;
        });
    }, [applyTypeIdFilterSet, selectableDescendantsOf]);

    const clearAllTypeFilters = React.useCallback(() => {
        setActiveFilters(new Set());
        const fv = { ...(filterValuesRef.current as Record<string, unknown>) };
        delete fv.glTypeIds;
        setFiltersRef.current(fv as Record<string, unknown>, null);
        setPageRef.current(1);
    }, []);

    const pageStart = total ? (page - 1) * perPage + 1 : 0;
    const pageEnd = total ? Math.min(page * perPage, total) : 0;

    const downloadCsv = React.useCallback(async (path: string, fallbackName: string) => {
        try {
            const res = await apiFetch(path, { method: 'GET', headers: { Accept: 'text/csv,*/*' } });
            if (!res.ok) {
                let msg = res.statusText;
                try {
                    const j = await res.json();
                    if (j && typeof j === 'object' && 'message' in j)
                        msg = String((j as { message?: unknown }).message ?? msg);
                } catch { /* ignore */ }
                await Swal.fire({ icon: 'error', title: 'Download failed', text: msg });
                return;
            }
            const cd = res.headers.get('Content-Disposition');
            let name = fallbackName;
            if (cd) {
                const m = /filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i.exec(cd);
                if (m?.[1]) name = decodeURIComponent(m[1].trim());
            }
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = name;
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            await Swal.fire({ icon: 'error', title: 'Download failed', text: e instanceof Error ? e.message : String(e) });
        }
    }, []);

    const onImportFile = React.useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        setImportBusy(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            const res = await apiFetch('/api/glChartAccounts/import', { method: 'POST', body: fd });
            const text = await res.text();
            let parsed: unknown;
            try { parsed = text ? JSON.parse(text) : {}; } catch { parsed = null; }
            if (!res.ok) {
                const msg = parsed && typeof parsed === 'object' && parsed !== null && 'message' in parsed
                    ? String((parsed as { message?: unknown }).message ?? res.statusText) : res.statusText;
                await Swal.fire({ icon: 'error', title: 'Import failed', text: msg });
                return;
            }
            const data = parsed as { created?: number; updated?: number; skipped?: number; errors?: string[] };
            const created = Number(data?.created) || 0;
            const updated = Number(data?.updated) || 0;
            const skipped = Number(data?.skipped) || 0;
            const errLines = (data?.errors ?? []).join('\n') || '';
            refresh();
            await Swal.fire({
                icon: skipped > 0 || errLines ? 'warning' : 'success',
                title: translate('shell.accounting.chart_import_done'),
                html: `<p>${translate('shell.accounting.chart_import_summary', { created, updated, skipped })}</p>` +
                    (errLines ? `<pre style="text-align:left;font-size:12px;max-height:220px;overflow:auto;margin-top:8px">${errLines.replace(/</g, '&lt;')}</pre>` : ''),
            });
        } catch (err) {
            await Swal.fire({ icon: 'error', title: 'Import failed', text: err instanceof Error ? err.message : String(err) });
        } finally {
            setImportBusy(false);
        }
    }, [refresh, translate]);

    return (
        <TopToolbar
            sx={{
                width: '100%',
                p: 0,
                minHeight: 'unset',
                flexDirection: 'column',
                pt: { xs: '0px', md: '0px' },
                alignItems: 'stretch',
            }}
        >
            {/* ── Top bar ── */}
            <Box
                sx={{
                    width: '100%',
                    bgcolor: '#fff',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    px: 1.5,
                    py: '5px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    minHeight: 44,
                }}
            >
                {/* Left: New + title */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', flex: '0 0 auto' }}>
                    <Tooltip title={!canWrite ? 'No write access' : ''}>
                        <span>
                            <Button
                                component={Link}
                                to={createPath({ resource: 'glChartAccounts', type: 'create' })}
                                variant="contained"
                                size="small"
                                disabled={!canWrite}
                                sx={{
                                    bgcolor: 'secondary.main',
                                    color: '#fff',
                                    textTransform: 'none',
                                    fontWeight: 700,
                                    fontSize: 13,
                                    borderRadius: '4px',
                                    px: '14px',
                                    py: '4px',
                                    minHeight: 30,
                                    boxShadow: 'none',
                                    '&:hover': { bgcolor: 'secondary.dark', boxShadow: 'none' },
                                }}
                            >
                                New
                            </Button>
                        </span>
                    </Tooltip>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <Typography sx={{ fontWeight: 700, fontSize: 15, color: 'text.primary', lineHeight: 1 }}>
                            {translate('resources.glChartAccounts.name', { smart_count: 2 })}
                        </Typography>
                        <IconButton
                            size="small"
                            sx={{ color: 'text.secondary', p: '2px' }}
                            onClick={ev => setSettingsMenuAnchor(ev.currentTarget)}
                        >
                            <SettingsOutlinedIcon sx={{ fontSize: 15 }} />
                        </IconButton>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv,.xlsx,.xlsm,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                            hidden
                            onChange={e => void onImportFile(e)}
                        />
                        <Menu
                            anchorEl={settingsMenuAnchor}
                            open={Boolean(settingsMenuAnchor)}
                            onClose={() => setSettingsMenuAnchor(null)}
                            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                            slotProps={{ paper: { sx: { minWidth: 220, mt: '4px' } } }}
                        >
                            <MenuItem
                                dense
                                disabled={!canWrite || importBusy}
                                onClick={() => { setSettingsMenuAnchor(null); fileInputRef.current?.click(); }}
                                sx={{ fontSize: 13 }}
                            >
                                <ListItemIcon><UploadFileOutlinedIcon fontSize="small" /></ListItemIcon>
                                {translate('shell.accounting.import_records')}
                            </MenuItem>
                            <MenuItem
                                dense
                                disabled={!canRead}
                                onClick={() => {
                                    setSettingsMenuAnchor(null);
                                    void downloadCsv('/api/glChartAccounts/import/template', 'ChartOfAccounts_Import_Template.csv');
                                }}
                                sx={{ fontSize: 13 }}
                            >
                                <ListItemIcon><FileDownloadOutlinedIcon fontSize="small" /></ListItemIcon>
                                {translate('shell.accounting.download_import_template')}
                            </MenuItem>
                            <MenuItem
                                dense
                                disabled={!canRead}
                                onClick={() => {
                                    setSettingsMenuAnchor(null);
                                    void downloadCsv('/api/glChartAccounts/export', 'ChartOfAccounts.csv');
                                }}
                                sx={{ fontSize: 13 }}
                            >
                                <ListItemIcon><FileDownloadOutlinedIcon fontSize="small" /></ListItemIcon>
                                {translate('shell.accounting.export_all')}
                            </MenuItem>
                        </Menu>
                    </Box>
                </Box>

                {/* Center: Search bar + popover (filters & group by) */}
                <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                    <Paper
                        ref={searchBarRef}
                        variant="outlined"
                        sx={{
                            width: 'min(560px, 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            borderRadius: '4px',
                            borderColor: searchPanelOpen ? 'secondary.main' : '#ccc',
                            overflow: 'hidden',
                            bgcolor: '#fff',
                        }}
                    >
                        <Tooltip title="Filters & grouping">
                            <Box
                                component="button"
                                type="button"
                                onClick={() => setSearchPanelOpen(true)}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    px: '8px',
                                    py: '5px',
                                    bgcolor: 'rgba(0,0,0,0.03)',
                                    borderRight: '1px solid #e0e0e0',
                                    cursor: 'pointer',
                                    border: 'none',
                                    borderRadius: 0,
                                    '&:hover': { bgcolor: 'rgba(113,75,103,0.08)' },
                                }}
                            >
                                <FilterListIcon sx={{ fontSize: 17, color: 'secondary.main' }} />
                            </Box>
                        </Tooltip>

                        {groupBy !== 'none' ? (
                            <Chip
                                label={`Group: ${GL_CHART_GROUP_BY_OPTIONS.find(g => g.value === groupBy)?.label ?? groupBy}`}
                                size="small"
                                onDelete={() => setGroupBy('none')}
                                sx={{
                                    ml: 0.75,
                                    height: 22,
                                    borderRadius: '999px',
                                    fontSize: 11,
                                    maxWidth: 200,
                                    '& .MuiChip-label': { px: '8px', overflow: 'hidden', textOverflow: 'ellipsis' },
                                }}
                            />
                        ) : null}

                        <InputBase
                            value={q}
                            onChange={e => setQ(e.target.value)}
                            placeholder="Search..."
                            sx={{ flex: 1, fontSize: 13, px: 1, py: '4px', minWidth: 0 }}
                            endAdornment={
                                q ? (
                                    <IconButton size="small" onClick={() => setQ('')} sx={{ p: '2px' }}>
                                        <CloseIcon sx={{ fontSize: 13 }} />
                                    </IconButton>
                                ) : null
                            }
                        />
                        <IconButton size="small" sx={{ p: '5px', color: 'text.secondary', borderLeft: '1px solid #eee' }}>
                            <SearchIcon sx={{ fontSize: 17 }} />
                        </IconButton>
                        <Tooltip title={searchPanelOpen ? 'Close' : 'Filters, group by…'}>
                            <IconButton
                                size="small"
                                onClick={toggleSearchPanel}
                                sx={{
                                    p: '4px',
                                    borderRadius: 0,
                                    borderLeft: '1px solid #e0e0e0',
                                    color: searchPanelOpen ? 'secondary.main' : 'text.secondary',
                                    bgcolor: searchPanelOpen ? 'rgba(113,75,103,0.08)' : 'transparent',
                                    '&:hover': { color: 'secondary.main', bgcolor: 'rgba(113,75,103,0.08)' },
                                }}
                            >
                                {searchPanelOpen ? (
                                    <KeyboardArrowUpIcon sx={{ fontSize: 22 }} />
                                ) : (
                                    <ArrowDropDownIcon sx={{ fontSize: 22 }} />
                                )}
                            </IconButton>
                        </Tooltip>
                    </Paper>

                    <Popover
                        open={searchPanelOpen}
                        anchorEl={searchBarRef.current}
                        onClose={closeSearchPanel}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
                        slotProps={{
                            paper: {
                                elevation: 6,
                                sx: {
                                    mt: 0.5,
                                    width: { xs: 'min(100vw - 24px, 520px)', sm: 560 },
                                    maxWidth: 'calc(100vw - 24px)',
                                    overflow: 'hidden',
                                },
                            },
                        }}
                    >
                        <Box sx={{ display: 'flex', minHeight: 220 }}>
                            <Box
                                sx={{
                                    flex: 1,
                                    minWidth: 0,
                                    borderRight: '1px solid',
                                    borderColor: 'divider',
                                    py: 1,
                                    px: 0.5,
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 1, pb: 1 }}>
                                    <FilterListIcon sx={{ fontSize: 20, color: 'secondary.main' }} />
                                    <Typography variant="subtitle2" fontWeight={700}>
                                        Filters
                                    </Typography>
                                </Box>
                                <Typography variant="caption" color="text.secondary" sx={{ px: 1.5, display: 'block', mb: 0.5 }}>
                                    Account type
                                </Typography>
                                <MuiList disablePadding sx={{ py: 0, maxHeight: 280, overflow: 'auto' }}>
                                    {accountTypesOrdered.map(t => {
                                        const idStr = String(t.id);
                                        const active = activeFilters.has(idStr);
                                        return (
                                            <ListItemButton
                                                key={t.id}
                                                selected={active}
                                                dense
                                                onClick={() => toggleTypeFilter(idStr)}
                                                sx={{
                                                    py: 0.5,
                                                    px: 1.5,
                                                    '&.Mui-selected': { bgcolor: 'action.selected' },
                                                }}
                                            >
                                                <ListItemText
                                                    primary={t.title ?? '—'}
                                                    primaryTypographyProps={{ variant: 'body2' }}
                                                />
                                            </ListItemButton>
                                        );
                                    })}
                                </MuiList>
                                <ListItemButton dense disabled sx={{ opacity: 0.55, py: 0.5 }}>
                                    <ListItemText
                                        primary="Add custom filter"
                                        primaryTypographyProps={{ variant: 'caption' }}
                                    />
                                </ListItemButton>
                            </Box>

                            <Box
                                sx={{
                                    flex: 1,
                                    minWidth: 0,
                                    borderRight: '1px solid',
                                    borderColor: 'divider',
                                    py: 1,
                                    px: 0.5,
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 1, pb: 1 }}>
                                    <AccountTreeOutlinedIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                                    <Typography variant="subtitle2" fontWeight={700}>
                                        Group By
                                    </Typography>
                                </Box>
                                <MuiList disablePadding sx={{ py: 0 }}>
                                    {GL_CHART_GROUP_BY_OPTIONS.map(opt => (
                                        <ListItemButton
                                            key={opt.value}
                                            selected={groupBy === opt.value}
                                            dense
                                            onClick={() => setGroupBy(opt.value)}
                                            sx={{
                                                py: 0.5,
                                                px: 1.5,
                                                '&.Mui-selected': { bgcolor: 'action.selected' },
                                            }}
                                        >
                                            <ListItemText
                                                primary={opt.label}
                                                primaryTypographyProps={{ variant: 'body2' }}
                                            />
                                        </ListItemButton>
                                    ))}
                                </MuiList>
                                <ListItemButton dense disabled sx={{ opacity: 0.55, py: 0.5 }}>
                                    <ListItemText
                                        primary="Add custom group"
                                        primaryTypographyProps={{ variant: 'caption' }}
                                    />
                                </ListItemButton>
                            </Box>

                            <Box sx={{ flex: 1, minWidth: 0, py: 1, px: 0.5 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 1, pb: 1 }}>
                                    <StarBorderOutlinedIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                                    <Typography variant="subtitle2" fontWeight={700}>
                                        Favorites
                                    </Typography>
                                </Box>
                                <ListItemButton dense disabled sx={{ opacity: 0.55, py: 0.5 }}>
                                    <ListItemText
                                        primary="Save current search"
                                        secondary="Coming soon"
                                        primaryTypographyProps={{ variant: 'body2' }}
                                        secondaryTypographyProps={{ variant: 'caption' }}
                                    />
                                </ListItemButton>
                            </Box>
                        </Box>
                    </Popover>
                </Box>

                {/* Right: pagination + list + columns */}
                <Box sx={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: '2px', ml: 'auto' }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12, mr: '4px', whiteSpace: 'nowrap' }}>
                        {pageStart}-{pageEnd} / {total ?? 0}
                    </Typography>
                    <IconButton size="small" disabled={page <= 1} onClick={() => setPage(page - 1)} sx={{ p: '3px' }}>
                        <NavigateBeforeIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                    <IconButton
                        size="small"
                        disabled={total != null ? page * perPage >= total : true}
                        onClick={() => setPage(page + 1)}
                        sx={{ p: '3px' }}
                    >
                        <NavigateNextIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                    <Divider orientation="vertical" flexItem sx={{ mx: '4px', height: 20, alignSelf: 'center' }} />
                    <Tooltip title="List">
                        <span>
                            <IconButton
                                size="small"
                                sx={{
                                    p: '4px',
                                    borderRadius: '4px',
                                    color: 'secondary.main',
                                    bgcolor: 'rgba(113,75,103,0.10)',
                                    '&:hover': { bgcolor: 'rgba(0,0,0,0.05)' },
                                }}
                            >
                                <ViewListIcon sx={{ fontSize: 17 }} />
                            </IconButton>
                        </span>
                    </Tooltip>
                    <Tooltip title={translate('shell.accounting.choose_columns')}>
                        <Box
                            sx={{
                                position: 'relative',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 30,
                                height: 30,
                            }}
                        >
                            <ColumnsButton
                                id={GL_CHART_COLUMNS_BUTTON_ID}
                                storeKey={GL_CHART_COLUMNS_STORE_KEY}
                                sx={{
                                    position: 'absolute',
                                    right: 0,
                                    top: 0,
                                    minWidth: 30,
                                    width: 30,
                                    height: 30,
                                    p: '4px',
                                    borderRadius: '4px',
                                    opacity: 0,
                                    zIndex: 1,
                                }}
                            />
                            <TuneIcon sx={{ fontSize: 17, color: 'text.secondary', pointerEvents: 'none' }} />
                        </Box>
                    </Tooltip>
                </Box>
            </Box>

            {/* ── Quick-filter pill row (All / account types) ── */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    px: 1.5,
                    py: '5px',
                    bgcolor: '#fff',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    flexWrap: 'wrap',
                }}
            >
                <QuickFilterPill label="All" active={activeFilters.size === 0} onClick={clearAllTypeFilters} />
                {mainAccountTypes.map(t => {
                    const leafIds = selectableDescendantsOf(t.id);
                    const active = leafIds.some(id => activeFilters.has(String(id)));
                    return (
                        <QuickFilterPill
                            key={t.id}
                            label={t.title ?? '—'}
                            active={active}
                            onClick={() => toggleMainTypeFilter(t.id)}
                        />
                    );
                })}
            </Box>
        </TopToolbar>
    );
}

// ─── Row / cell types ─────────────────────────────────────────────────────────
type ChartRow = {
    id?: number;
    glCode?: string | null;
    glTitle?: string | null;
    glType?: number | null;
    typeLabel?: string | null;
    allowReconciliation?: boolean;
    accountCurrency?: string | null;
    readOnly?: boolean;
    companyTitle?: string | null;
};

async function patchChartAccount(id: number, body: Record<string, unknown>): Promise<Response> {
    return apiFetch(`/api/glChartAccounts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
}

async function showApiError(res: Response, fallback: string) {
    let msg = fallback;
    try {
        const j = await res.json();
        if (j && typeof j === 'object' && 'message' in j) msg = String((j as { message?: unknown }).message ?? msg);
    } catch { /* ignore */ }
    await Swal.fire({ icon: 'error', title: 'Update failed', text: msg });
}

// ─── Inline text cell ─────────────────────────────────────────────────────────
function InlineTextCell({ record, field }: { record: ChartRow; field: 'glCode' | 'glTitle' }) {
    const refresh = useRefresh();
    const canWrite = useAccountingAccess('glChartAccounts', 'write');
    const [value, setValue] = React.useState(String(record[field] ?? ''));
    const [busy, setBusy] = React.useState(false);
    const [focused, setFocused] = React.useState(false);

    React.useEffect(() => {
        setValue(String(record[field] ?? ''));
    }, [record.id, record[field], field]);

    const id = record.id;
    const readOnlyRow = Boolean(record.readOnly);
    const disabled = !canWrite || busy || id == null || readOnlyRow;

    const onBlur = React.useCallback(async () => {
        setFocused(false);
        if (id == null || disabled) return;
        const next = value.trim();
        const prev = String(record[field] ?? '').trim();
        if (next === prev) return;
        setBusy(true);
        try {
            const res = await patchChartAccount(id, { [field]: next });
            if (!res.ok) {
                await showApiError(res, res.statusText);
                setValue(String(record[field] ?? ''));
                return;
            }
            refresh();
        } catch (e) {
            await Swal.fire({ icon: 'error', title: 'Update failed', text: e instanceof Error ? e.message : String(e) });
            setValue(String(record[field] ?? ''));
        } finally {
            setBusy(false);
        }
    }, [disabled, field, id, record, refresh, value]);

    return (
        <InputBase
            value={value}
            onChange={e => setValue(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => void onBlur()}
            disabled={disabled}
            fullWidth
            sx={{
                fontSize: 13,
                '& .MuiInputBase-input': {
                    py: '3px',
                    px: '4px',
                    borderRadius: '3px',
                    '&:hover': !disabled ? { bgcolor: 'rgba(0,0,0,0.04)' } : {},
                },
                border: focused ? '1px solid' : '1px solid transparent',
                borderColor: focused ? 'secondary.main' : 'transparent',
                borderRadius: '3px',
                bgcolor: focused ? '#fff' : 'transparent',
                transition: 'border-color 0.15s, background 0.15s',
            }}
        />
    );
}

// ─── Account type picker ──────────────────────────────────────────────────────
function AccountTypePicker({ record }: { record: ChartRow }) {
    const types = useGlAccountTypesLoaded();
    const refresh = useRefresh();
    const canWrite = useAccountingAccess('glChartAccounts', 'write');
    const [anchor, setAnchor] = React.useState<null | HTMLElement>(null);
    const [busy, setBusy] = React.useState(false);
    const id = record.id;
    const readOnlyRow = Boolean(record.readOnly);
    const disabled = !canWrite || busy || id == null || readOnlyRow;
    const selectedId = record.glType ?? null;
    const label = (selectedId != null && types.find(t => t.id === selectedId)?.title) || record.typeLabel || '';

    const onPick = React.useCallback(async (typeId: number) => {
        setAnchor(null);
        if (id == null || disabled || typeId === selectedId) return;
        setBusy(true);
        try {
            const res = await patchChartAccount(id, { glType: typeId });
            if (!res.ok) { await showApiError(res, res.statusText); return; }
            refresh();
        } catch (e) {
            await Swal.fire({ icon: 'error', title: 'Update failed', text: e instanceof Error ? e.message : String(e) });
        } finally {
            setBusy(false);
        }
    }, [disabled, id, refresh, selectedId]);

    const menuItems = React.useMemo(
        () => renderHierarchicalTypeItems(types, null, 0, selectedId, onPick),
        [types, selectedId, onPick]
    );

    return (
        <>
            <Button
                size="small"
                disabled={disabled}
                onClick={e => setAnchor(e.currentTarget)}
                endIcon={<KeyboardArrowDownIcon sx={{ fontSize: 15 }} />}
                sx={{
                    justifyContent: 'space-between',
                    textTransform: 'none',
                    fontWeight: 400,
                    fontSize: 13,
                    color: 'text.primary',
                    minWidth: 120,
                    maxWidth: 200,
                    px: '6px',
                    py: '2px',
                    height: 26,
                    border: '1px solid transparent',
                    borderRadius: '3px',
                    '&:hover': { border: '1px solid', borderColor: 'secondary.main', bgcolor: 'transparent' },
                    '&.Mui-disabled': { border: '1px solid transparent' },
                }}
            >
                <Typography noWrap sx={{ flex: 1, textAlign: 'left', fontSize: 13 }}>
                    {label || '—'}
                </Typography>
            </Button>
            <Menu
                anchorEl={anchor}
                open={Boolean(anchor)}
                onClose={() => setAnchor(null)}
                slotProps={{ paper: { sx: { maxHeight: 360, minWidth: 240 } } }}
            >
                {menuItems.length > 0 ? menuItems : <MenuItem disabled dense>No types loaded</MenuItem>}
            </Menu>
        </>
    );
}

// ─── Inline currency cell ─────────────────────────────────────────────────────
function InlineCurrencyCell({ record }: { record: ChartRow }) {
    const refresh = useRefresh();
    const canWrite = useAccountingAccess('glChartAccounts', 'write');
    const [value, setValue] = React.useState(String(record.accountCurrency ?? ''));
    const [busy, setBusy] = React.useState(false);
    const [focused, setFocused] = React.useState(false);
    const id = record.id;
    const readOnlyRow = Boolean(record.readOnly);

    React.useEffect(() => {
        setValue(String(record.accountCurrency ?? ''));
    }, [record.id, record.accountCurrency]);

    const disabled = !canWrite || busy || id == null || readOnlyRow;

    const onBlur = React.useCallback(async () => {
        setFocused(false);
        if (id == null || disabled) return;
        const next = value.trim().toUpperCase();
        const prev = String(record.accountCurrency ?? '').trim().toUpperCase();
        if (next === prev) return;
        setBusy(true);
        try {
            const res = await patchChartAccount(id, { accountCurrency: next || null });
            if (!res.ok) { await showApiError(res, res.statusText); setValue(String(record.accountCurrency ?? '')); return; }
            refresh();
        } catch (e) {
            await Swal.fire({ icon: 'error', title: 'Update failed', text: e instanceof Error ? e.message : String(e) });
            setValue(String(record.accountCurrency ?? ''));
        } finally {
            setBusy(false);
        }
    }, [disabled, id, record.accountCurrency, refresh, value]);

    return (
        <InputBase
            value={value}
            onChange={e => setValue(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => void onBlur()}
            disabled={disabled}
            placeholder="—"
            inputProps={{ maxLength: 10 }}
            sx={{
                fontSize: 13,
                width: 72,
                '& .MuiInputBase-input': { py: '3px', px: '4px', borderRadius: '3px' },
                border: focused ? '1px solid' : '1px solid transparent',
                borderColor: focused ? 'secondary.main' : 'transparent',
                borderRadius: '3px',
                bgcolor: focused ? '#fff' : 'transparent',
                transition: 'border-color 0.15s',
            }}
        />
    );
}

// ─── Reconciliation toggle ────────────────────────────────────────────────────
function ReconciliationToggle({ record }: { record: ChartRow }) {
    const refresh = useRefresh();
    const canWrite = useAccountingAccess('glChartAccounts', 'write');
    const [busy, setBusy] = React.useState(false);
    const checked = Boolean(record?.allowReconciliation);
    const id = record?.id;
    const readOnlyRow = Boolean(record.readOnly);

    const onChange = React.useCallback(async (_: React.ChangeEvent<HTMLInputElement>, v: boolean) => {
        if (id == null || !canWrite || readOnlyRow) return;
        setBusy(true);
        try {
            const res = await patchChartAccount(id, { allowReconciliation: v });
            if (!res.ok) { await showApiError(res, res.statusText); return; }
            refresh();
        } catch (e) {
            await Swal.fire({ icon: 'error', title: 'Update failed', text: e instanceof Error ? e.message : String(e) });
        } finally {
            setBusy(false);
        }
    }, [canWrite, id, readOnlyRow, refresh]);

    return (
        <Switch
            size="small"
            checked={checked}
            disabled={!canWrite || busy || id == null || readOnlyRow}
            onChange={onChange}
            sx={{
                '& .MuiSwitch-switchBase.Mui-checked': { color: 'secondary.main' },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: 'secondary.light' },
            }}
        />
    );
}

// ─── View link ────────────────────────────────────────────────────────────────
function ChartAccountViewLink({ id }: { id: number }) {
    const createPath = useCreatePath();
    return (
        <RaLink
            to={createPath({ resource: 'glChartAccounts', id, type: 'edit' })}
            sx={{
                fontSize: 13,
                fontWeight: 500,
                color: 'secondary.main',
                textDecoration: 'none',
                '&:hover': { textDecoration: 'underline' },
            }}
        >
            View
        </RaLink>
    );
}

// ─── Bulk action toolbar ──────────────────────────────────────────────────────
function ChartBulkSelectionToolbar() {
    const { selectedIds = [] } = useListContext();
    const n = (selectedIds as Identifier[]).length;
    if (n === 0) return null;
    return (
        <Typography variant="body2" color="text.secondary" component="span" sx={{ mr: 1, alignSelf: 'center', fontSize: 13 }}>
            {n} selected
        </Typography>
    );
}

function ChartBulkActionButtons() {
    return <ChartBulkSelectionToolbar />;
}

const GL_GROUP_HEADER_LABEL_COLSPAN = 5;
const GL_GROUP_HEADER_TAIL_COLSPAN = 2;

function GlGroupedDataTable() {
    const translate = useTranslate();
    const { data, isLoading } = useListContext();
    const [groupBy] = useStore<GlChartGroupByMode>(GL_CHART_GROUP_BY_STORE_KEY, 'none');
    const types = useGlAccountTypesLoaded();
    const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(() => new Set());

    const groups = React.useMemo(() => {
        if (groupBy !== 'accountType') return [];
        const arr = data ? (Object.values(data) as ChartRow[]) : [];
        const map = new Map<string, { displayLabel: string; rows: ChartRow[] }>();
        for (const r of arr) {
            const tid = r.glType ?? null;
            const key = tid != null ? `t:${tid}` : 't:null';
            const fromTypes = tid != null ? types.find(t => t.id === tid)?.title : null;
            const displayLabel =
                (fromTypes && String(fromTypes).trim()) ||
                String(r.typeLabel ?? '').trim() ||
                (tid != null ? `Type #${tid}` : '—');
            const prev = map.get(key);
            if (prev) prev.rows.push(r);
            else map.set(key, { displayLabel, rows: [r] });
        }
        map.forEach(v => {
            v.rows.sort((a, b) => String(a.glCode ?? '').localeCompare(String(b.glCode ?? ''), undefined, { numeric: true }));
        });
        return Array.from(map.entries())
            .map(([key, v]) => ({ key, displayLabel: v.displayLabel, rows: v.rows }))
            .sort((a, b) => a.displayLabel.localeCompare(b.displayLabel));
    }, [data, groupBy, types]);

    const groupKeysSig = React.useMemo(() => groups.map(g => g.key).join('\u0001'), [groups]);
    React.useEffect(() => {
        setExpandedGroups(new Set());
    }, [groupBy, groupKeysSig]);

    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={32} />
            </Box>
        );
    }

    return (
        <TableContainer>
            <Table size="small">
                <TableHead>
                    <TableRow>
                        <TableCell sx={{ width: 40, fontWeight: 700 }} aria-label="Expand" />
                        <TableCell sx={{ fontWeight: 700 }}>{translate('resources.glChartAccounts.fields.gl_code')}</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{translate('resources.glChartAccounts.fields.gl_title')}</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{translate('resources.glChartAccounts.fields.type_label')}</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{translate('resources.glChartAccounts.fields.allow_reconciliation')}</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{translate('resources.glChartAccounts.fields.account_currency')}</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{translate('resources.glChartAccounts.fields.companies')}</TableCell>
                        <TableCell sx={{ fontWeight: 700 }} />
                    </TableRow>
                </TableHead>
                <TableBody>
                    {groups.map(({ key: groupKey, displayLabel, rows: groupRows }) => {
                        const isExpanded = expandedGroups.has(groupKey);
                        const count = groupRows.length;
                        const toggleGroup = (e: React.MouseEvent) => {
                            e.stopPropagation();
                            setExpandedGroups(prev => {
                                const next = new Set(prev);
                                if (next.has(groupKey)) next.delete(groupKey);
                                else next.add(groupKey);
                                return next;
                            });
                        };
                        return (
                            <React.Fragment key={groupKey}>
                                <TableRow
                                    hover
                                    onClick={toggleGroup}
                                    sx={{
                                        cursor: 'pointer',
                                        bgcolor: 'rgba(113,75,103,0.06)',
                                        '&:hover': { bgcolor: 'rgba(113,75,103,0.10)' },
                                    }}
                                >
                                    <TableCell
                                        sx={{
                                            width: 40,
                                            py: 1,
                                            verticalAlign: 'middle',
                                            borderBottom: `1px solid ${NAV_SECONDARY}33`,
                                        }}
                                    >
                                        {isExpanded ? (
                                            <KeyboardArrowDownIcon sx={{ fontSize: 20, color: NAV_SECONDARY }} />
                                        ) : (
                                            <KeyboardArrowRightIcon sx={{ fontSize: 20, color: NAV_SECONDARY }} />
                                        )}
                                    </TableCell>
                                    <TableCell
                                        colSpan={GL_GROUP_HEADER_LABEL_COLSPAN}
                                        sx={{
                                            color: NAV_SECONDARY,
                                            fontWeight: 700,
                                            fontSize: 13,
                                            py: 1,
                                            borderBottom: `1px solid ${NAV_SECONDARY}33`,
                                        }}
                                    >
                                        Account type: {displayLabel}
                                        <Typography
                                            component="span"
                                            variant="body2"
                                            sx={{ ml: 0.75, fontWeight: 600, color: 'text.secondary' }}
                                        >
                                            ({count})
                                        </Typography>
                                    </TableCell>
                                    <TableCell
                                        colSpan={GL_GROUP_HEADER_TAIL_COLSPAN}
                                        sx={{ borderBottom: `1px solid ${NAV_SECONDARY}33` }}
                                    />
                                </TableRow>
                                {isExpanded
                                    ? groupRows.map(r => (
                                          <TableRow key={r.id} hover sx={{ '&:hover': { bgcolor: 'rgba(113,75,103,0.04)' } }}>
                                              <TableCell />
                                              <TableCell>
                                                  <InlineTextCell record={r} field="glCode" />
                                              </TableCell>
                                              <TableCell>
                                                  <InlineTextCell record={r} field="glTitle" />
                                              </TableCell>
                                              <TableCell>
                                                  <AccountTypePicker record={r} />
                                              </TableCell>
                                              <TableCell>
                                                  <ReconciliationToggle record={r} />
                                              </TableCell>
                                              <TableCell>
                                                  <InlineCurrencyCell record={r} />
                                              </TableCell>
                                              <TableCell>
                                                  {r.companyTitle ? (
                                                      <Chip
                                                          size="small"
                                                          label={r.companyTitle}
                                                          sx={{
                                                              fontSize: 11,
                                                              height: 20,
                                                              maxWidth: 220,
                                                              bgcolor: 'rgba(0,0,0,0.06)',
                                                              color: 'text.secondary',
                                                              fontWeight: 500,
                                                              '& .MuiChip-label': { px: '8px' },
                                                          }}
                                                      />
                                                  ) : (
                                                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13 }}>
                                                          —
                                                      </Typography>
                                                  )}
                                              </TableCell>
                                              <TableCell>{r.id != null ? <ChartAccountViewLink id={r.id} /> : null}</TableCell>
                                          </TableRow>
                                      ))
                                    : null}
                            </React.Fragment>
                        );
                    })}
                </TableBody>
            </Table>
        </TableContainer>
    );
}

// ─── Inner list ───────────────────────────────────────────────────────────────
function ChartAccountsListInner() {
    const translate = useTranslate();
    const [groupBy] = useStore<GlChartGroupByMode>(GL_CHART_GROUP_BY_STORE_KEY, 'none');

    return (
        <List
            resource="glChartAccounts"
            actions={<ChartListToolbar />}
            sort={{ field: 'glCode', order: 'ASC' }}
            perPage={25}
            title={translate('resources.glChartAccounts.name', { smart_count: 2 })}
            sx={{
                '& .RaList-main': { mt: 0 },
                '& .MuiCard-root': { boxShadow: 'none', border: 'none' },
            }}
        >
            {groupBy !== 'none' ? (
                <GlGroupedDataTable />
            ) : (
            <DataTable
                rowClick={false}
                bulkActionButtons={<ChartBulkActionButtons />}
                storeKey={GL_CHART_COLUMNS_STORE_KEY}
                hiddenColumns={['glType', 'glNature', 'id', 'readOnly']}
                sx={{
                    // Compact rows
                    '& .MuiTableCell-root': {
                        borderColor: 'divider',
                        fontSize: 13,
                        py: '4px',
                        px: '10px',
                        lineHeight: 1.4,
                    },
                    '& .MuiTableRow-root': {
                        height: 36,
                    },
                    '& .MuiTableRow-root:hover': {
                        bgcolor: 'rgba(113,75,103,0.04)',
                    },
                    '& .MuiTableCell-head': {
                        fontWeight: 600,
                        fontSize: 12,
                        bgcolor: '#f8f8f8',
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        py: '6px',
                        color: 'text.secondary',
                        textTransform: 'uppercase',
                        letterSpacing: '0.03em',
                    },
                    // Selected row
                    '& .MuiTableRow-root.Mui-selected': {
                        bgcolor: 'rgba(113,75,103,0.08)',
                    },
                    '& .MuiTableRow-root.Mui-selected:hover': {
                        bgcolor: 'rgba(113,75,103,0.12)',
                    },
                    // Checkbox column narrow
                    '& .MuiTableCell-paddingCheckbox': {
                        px: '6px',
                        width: 36,
                    },
                }}
            >
                <DataTable.Col
                    source="glCode"
                    label={translate('resources.glChartAccounts.fields.gl_code')}
                    render={(row: ChartRow) => <InlineTextCell record={row} field="glCode" />}
                />
                <DataTable.Col
                    source="glTitle"
                    label={translate('resources.glChartAccounts.fields.gl_title')}
                    render={(row: ChartRow) => <InlineTextCell record={row} field="glTitle" />}
                />
                <DataTable.Col
                    source="typeLabel"
                    label={translate('resources.glChartAccounts.fields.type_label')}
                    render={(row: ChartRow) => <AccountTypePicker record={row} />}
                />
                <DataTable.Col
                    label={translate('resources.glChartAccounts.fields.allow_reconciliation')}
                    render={(row: ChartRow) => <ReconciliationToggle record={row} />}
                />
                <DataTable.Col
                    label={translate('resources.glChartAccounts.fields.account_currency')}
                    render={(row: ChartRow) => <InlineCurrencyCell record={row} />}
                />
                <DataTable.Col
                    label={translate('resources.glChartAccounts.fields.companies')}
                    render={(row: ChartRow) =>
                        row.companyTitle ? (
                            <Chip
                                size="small"
                                label={row.companyTitle}
                                sx={{
                                    fontSize: 11,
                                    height: 20,
                                    maxWidth: 220,
                                    bgcolor: 'rgba(0,0,0,0.06)',
                                    color: 'text.secondary',
                                    fontWeight: 500,
                                    '& .MuiChip-label': { px: '8px' },
                                }}
                            />
                        ) : (
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13 }}>—</Typography>
                        )
                    }
                />
                <DataTable.Col
                    label=""
                    disableSort
                    render={(row: ChartRow) => row.id != null ? <ChartAccountViewLink id={row.id} /> : null}
                />
            </DataTable>
            )}
        </List>
    );
}

// ─── Root export ─────────────────────────────────────────────────────────────
export function ChartOfAccountsList() {
    const translate = useTranslate();
    const canRead = useAccountingAccess('glChartAccounts', 'read');
    const [accountTypes, setAccountTypes] = React.useState<GlAccountTypeRow[]>([]);

    React.useEffect(() => {
        if (!canRead) return;
        let cancel = false;
        (async () => {
            try {
                const res = await apiFetch('/api/glAccountTypes', { method: 'GET' });
                if (!res.ok || cancel) return;
                const j: unknown = await res.json();
                if (!Array.isArray(j) || cancel) return;
                const parsed: GlAccountTypeRow[] = j.map((raw: unknown) => {
                    const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
                    return {
                        id: Number(o.id) || 0,
                        title: o.title != null ? String(o.title) : null,
                        mainParent: o.mainParent != null ? Number(o.mainParent) : null,
                        reportingHead: o.reportingHead != null ? String(o.reportingHead) : null,
                        orderBy: o.orderBy != null ? Number(o.orderBy) : null,
                        selectable: Boolean(o.selectable),
                    };
                });
                setAccountTypes(parsed.filter(t => t.id > 0));
            } catch { /* ignore */ }
        })();
        return () => { cancel = true; };
    }, [canRead]);

    if (!canRead) {
        return (
            <Box sx={{ p: 3 }}>
                <Typography color="text.secondary">
                    You do not have access to the chart of accounts.
                </Typography>
            </Box>
        );
    }

    return (
        <GlAccountTypesContext.Provider value={accountTypes}>
            <ChartAccountsListInner />
        </GlAccountTypesContext.Provider>
    );
}

export default ChartOfAccountsList;