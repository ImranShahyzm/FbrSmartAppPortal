import * as React from 'react';
import {
    List,
    useCreatePath,
    useListContext,
    useTranslate,
} from 'react-admin';
import { Link } from 'react-router-dom';
import {
    Box,
    Button,
    Collapse,
    IconButton,
    InputAdornment,
    InputBase,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';

import { useAccountingAccess } from '../useAccountingAccess';
import { apiFetch } from '../../api/httpClient';
import { excelGridTableContainerSx, excelGridTableSx } from '../../common/themeSharedStyles';

const NAV_TEAL = '#3d7a7a';
const NAV_TEAL_DARK = '#2e6262';

type GroupRow = {
    id: number;
    groupName: string;
    fromCode: number;
    toCode: number;
    parentGroupId: number | null;
    colorHex: string;
};

type ChartRow = {
    id: number;
    glCode?: string | null;
    glTitle?: string | null;
    glType?: number | null;
    glNature?: number | null;
};

function Title() {
    const { defaultTitle } = useListContext();
    return <span>{defaultTitle}</span>;
}

function buildTree(rows: GroupRow[]) {
    const byParent = new Map<number | null, GroupRow[]>();
    for (const r of rows) {
        const key = r.parentGroupId ?? null;
        const list = byParent.get(key) ?? [];
        list.push(r);
        byParent.set(key, list);
    }
    Array.from(byParent.values()).forEach((list: GroupRow[]) => {
        list.sort(
            (a: GroupRow, b: GroupRow) =>
                a.fromCode - b.fromCode || a.groupName.localeCompare(b.groupName) || a.id - b.id
        );
    });
    return byParent;
}

function ListToolbar() {
    const translate = useTranslate();
    const createPath = useCreatePath();
    const { filterValues, setFilters } = useListContext();
    const canCreate = useAccountingAccess('glAccountGroups', 'create');

    const [q, setQ] = React.useState(() => String((filterValues as any)?.q ?? ''));
    React.useEffect(() => {
        setQ(String((filterValues as any)?.q ?? ''));
    }, [(filterValues as any)?.q]);

    const filterValuesRef = React.useRef(filterValues);
    filterValuesRef.current = filterValues;
    const setFiltersRef = React.useRef(setFilters);
    setFiltersRef.current = setFilters;

    React.useEffect(() => {
        const t = window.setTimeout(() => {
            const next = q.trim();
            const fv = filterValuesRef.current as Record<string, unknown>;
            const cur = String(fv.q ?? '').trim();
            if (cur === next) return;
            setFiltersRef.current({ ...fv, q: next || undefined } as any, null);
        }, 250);
        return () => window.clearTimeout(t);
    }, [q]);

    return (
        <Box
            sx={{
                width: '100%',
                bgcolor: 'common.white',
                borderBottom: '1px solid',
                borderColor: 'divider',
                px: { xs: 1, sm: 2 },
                py: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                flexWrap: 'wrap',
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', flex: '0 0 auto' }}>
                {canCreate ? (
                    <Button
                        component={Link}
                        to={createPath({ resource: 'glAccountGroups', type: 'create' })}
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
                    >
                        New
                    </Button>
                ) : null}

                <Typography variant="subtitle2" fontWeight={700} sx={{ fontSize: '0.85rem', color: 'text.primary' }}>
                    {translate('resources.glAccountGroups.name', { smart_count: 2, _: 'Account Groups' })}
                </Typography>
            </Box>

            <Box sx={{ flex: 1 }} />

            <Paper
                variant="outlined"
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    px: 0.5,
                    py: '2px',
                    borderRadius: 1,
                    minWidth: { xs: 0, sm: 260 },
                    maxWidth: 520,
                    width: { xs: '100%', sm: '50%', md: '40%' },
                }}
            >
                <InputBase
                    value={q}
                    onChange={e => setQ(e.target.value)}
                    placeholder="Search..."
                    sx={{ flex: 1, fontSize: 13, px: 1, py: '4px', minWidth: 0 }}
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
            </Paper>
        </Box>
    );
}

function TreeContent() {
    const translate = useTranslate();
    const { data, isLoading } = useListContext<GroupRow>();
    const createPath = useCreatePath();
    const canCreate = useAccountingAccess('glAccountGroups', 'create');
    const theme = useTheme();
    const isSmDown = useMediaQuery(theme.breakpoints.down('sm'));

    const rows = React.useMemo(() => {
        const arr = data ? (Object.values(data) as GroupRow[]) : [];
        return arr
            .filter(x => x && Number(x.id) > 0)
            .map(x => ({
                ...x,
                parentGroupId: x.parentGroupId ?? null,
                colorHex: x.colorHex || '#000000',
            }));
    }, [data]);

    const tree = React.useMemo(() => buildTree(rows), [rows]);
    const [expanded, setExpanded] = React.useState<Set<number>>(() => new Set());
    const [accountsByGroup, setAccountsByGroup] = React.useState<Record<number, { loading: boolean; rows: ChartRow[] }>>(
        {}
    );

    React.useEffect(() => {
        // Reset expansion when dataset changes significantly.
        setExpanded(new Set());
        setAccountsByGroup({});
    }, [rows.length]);

    const ensureAccountsLoaded = React.useCallback(async (groupId: number) => {
        setAccountsByGroup(prev => {
            if (prev[groupId]?.loading || prev[groupId]?.rows) return prev;
            return { ...prev, [groupId]: { loading: true, rows: [] } };
        });
        try {
            const res = await apiFetch(`/api/glAccountGroups/${encodeURIComponent(String(groupId))}/accounts`, {
                method: 'GET',
            });
            const text = await res.text();
            let parsed: unknown;
            try {
                parsed = text ? JSON.parse(text) : [];
            } catch {
                parsed = [];
            }
            if (!res.ok) {
                setAccountsByGroup(prev => ({ ...prev, [groupId]: { loading: false, rows: [] } }));
                return;
            }
            const arr = Array.isArray(parsed) ? parsed : [];
            const mapped: ChartRow[] = arr.map((raw: any) => ({
                id: Number(raw?.id) || 0,
                glCode: raw?.glCode ?? null,
                glTitle: raw?.glTitle ?? null,
                glType: raw?.glType ?? null,
                glNature: raw?.glNature ?? null,
            })).filter(r => r.id > 0);
            setAccountsByGroup(prev => ({ ...prev, [groupId]: { loading: false, rows: mapped } }));
        } catch {
            setAccountsByGroup(prev => ({ ...prev, [groupId]: { loading: false, rows: [] } }));
        }
    }, []);

    const renderAccountsGrid = (groupId: number) => {
        const state = accountsByGroup[groupId];
        const loading = state?.loading;
        const list = state?.rows ?? [];
        return (
            <Box sx={{ px: { xs: 1, sm: 2 }, pb: 1.5, pt: 0.75, bgcolor: 'background.default' }}>
                <TableContainer sx={{ ...excelGridTableContainerSx, overflowX: 'auto' }}>
                    <Table
                        size="small"
                        stickyHeader
                        sx={{
                            ...excelGridTableSx,
                            tableLayout: 'fixed',
                            minWidth: 520,
                        }}
                    >
                        <TableHead>
                            <TableRow>
                                <TableCell
                                    width={isSmDown ? 180 : 240}
                                    sx={{ pr: 2, whiteSpace: 'nowrap' }}
                                >
                                    <Typography variant="subtitle2" fontWeight={700} sx={{ fontSize: '0.85rem' }}>
                                        Code
                                    </Typography>
                                </TableCell>
                                <TableCell sx={{ pl: 2 }}>
                                    <Typography variant="subtitle2" fontWeight={700} sx={{ fontSize: '0.85rem' }}>
                                        Account name
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={2}>
                                        <Typography variant="body2" color="text.secondary" sx={{ py: 1, px: 1 }}>
                                            Loading…
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : list.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={2}>
                                        <Typography variant="body2" color="text.secondary" sx={{ py: 1, px: 1 }}>
                                            No chart accounts found in this range.
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                list.map(r => (
                                    <TableRow key={r.id} hover>
                                        <TableCell
                                            sx={{
                                                pr: 2,
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                            }}
                                        >
                                            <Typography
                                                variant="subtitle2"
                                                fontWeight={700}
                                                noWrap
                                                sx={{ fontSize: '0.85rem' }}
                                            >
                                                {String(r.glCode ?? '—')}
                                            </Typography>
                                        </TableCell>
                                        <TableCell sx={{ pl: 2, minWidth: 260 }}>
                                            <Typography variant="subtitle2" sx={{ fontSize: '0.85rem', wordBreak: 'break-word' }}>
                                                {String(r.glTitle ?? '—')}
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Box>
        );
    };

    if (isLoading) return null;
    if (rows.length === 0) {
        return (
            <Box sx={{ py: 4, px: 2, textAlign: 'center', maxWidth: 520, mx: 'auto' }}>
                <Typography variant="body1" color="text.secondary" paragraph>
                    {translate('shell.accounting.account_groups_empty', {
                        _: 'No account groups yet. Create one to group accounts by code range.',
                    })}
                </Typography>
                {canCreate ? (
                    <Button
                        component={Link}
                        to={createPath({ resource: 'glAccountGroups', type: 'create' })}
                        variant="contained"
                        size="small"
                        sx={{ textTransform: 'none', fontWeight: 700, boxShadow: 'none' }}
                    >
                        New account group
                    </Button>
                ) : null}
            </Box>
        );
    }

    const renderNode = (node: GroupRow, depth: number) => {
        const children = tree.get(node.id) ?? [];
        const isOpen = expanded.has(node.id);
        const hasChildren = children.length > 0;
        const indent = (isSmDown ? 8 : 12) + depth * (isSmDown ? 18 : 26);

        return (
            <Box key={node.id}>
                <TableContainer sx={{ ...excelGridTableContainerSx, overflowX: 'auto' }}>
                    <Table size="small" sx={excelGridTableSx}>
                        <TableBody>
                            <TableRow hover>
                                <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, pl: `${indent}px` }}>
                                        <IconButton
                                            size="small"
                                            onClick={() => {
                                                setExpanded(prev => {
                                                    const next = new Set(prev);
                                                    const willOpen = !next.has(node.id);
                                                    if (willOpen) next.add(node.id);
                                                    else next.delete(node.id);
                                                    if (willOpen && !hasChildren) {
                                                        void ensureAccountsLoaded(node.id);
                                                    }
                                                    return next;
                                                });
                                            }}
                                            sx={{ p: '2px' }}
                                        >
                                            {isOpen ? (
                                                <ExpandMoreIcon fontSize="small" />
                                            ) : (
                                                <ChevronRightIcon fontSize="small" />
                                            )}
                                        </IconButton>
                                        <Box
                                            sx={{
                                                width: 10,
                                                height: 10,
                                                borderRadius: '3px',
                                                bgcolor: node.colorHex,
                                                border: '1px solid',
                                                borderColor: 'divider',
                                                flex: '0 0 auto',
                                            }}
                                        />
                                        <Box sx={{ minWidth: 0 }}>
                                            <Typography
                                                component={Link}
                                                to={createPath({ resource: 'glAccountGroups', type: 'edit', id: node.id })}
                                                sx={{
                                                    color: node.colorHex,
                                                    textDecoration: 'none',
                                                    fontWeight: 700,
                                                    fontSize: '0.85rem',
                                                    '&:hover': { textDecoration: 'underline' },
                                                    display: 'inline-block',
                                                    maxWidth: '100%',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                }}
                                            >
                                                {node.groupName}
                                            </Typography>
                                            <Typography
                                                variant="caption"
                                                color="text.secondary"
                                                sx={{ display: 'block', fontSize: '0.72rem' }}
                                            >
                                                {node.fromCode}–{node.toCode}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell sx={{ p: 0, borderBottom: 0 }}>
                                    <Collapse in={isOpen} timeout="auto" unmountOnExit>
                                        {hasChildren ? (
                                            <Box
                                                sx={{
                                                    pt: 0.5,
                                                    ml: `${indent + (isSmDown ? 8 : 14)}px`,
                                                    borderLeft: '1px dashed',
                                                    borderColor: 'divider',
                                                }}
                                            >
                                                {children.map(c => renderNode(c, depth + 1))}
                                            </Box>
                                        ) : (
                                            <Box sx={{ ml: `${indent + (isSmDown ? 8 : 14)}px` }}>
                                                {renderAccountsGrid(node.id)}
                                            </Box>
                                        )}
                                    </Collapse>
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </TableContainer>
            </Box>
        );
    };

    const roots = tree.get(null) ?? [];
    return <Box sx={{ p: { xs: 0.75, sm: 1.5 }, pt: { xs: 0.5, sm: 1 } }}>{roots.map(r => renderNode(r, 0))}</Box>;
}

export default function GlAccountGroupList() {
    return (
        <List
            resource="glAccountGroups"
            title={<Title />}
            actions={<ListToolbar />}
            perPage={1000}
            pagination={false}
            exporter={false}
            sort={{ field: 'fromCode', order: 'ASC' }}
        >
            <TreeContent />
        </List>
    );
}

