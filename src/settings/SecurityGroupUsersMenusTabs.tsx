import * as React from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { useGetList, useGetMany } from 'react-admin';
import {
    Box,
    Button,
    Checkbox,
    Dialog,
    DialogContent,
    IconButton,
    InputAdornment,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';

import { getRegisteredAppMenus, menuLabelForKey, type RegisteredAppMenuEntry } from '../apps/appMenuRegistry';
import { FbrPillChip, userAccountStatusTone } from '../common/fbrPillChip';
import {
    excelGridDragHandleCellSx,
    excelGridDragHandleIconWrapperSx,
    sgPickerBtnCloseSx,
    sgPickerBtnNewSx,
    sgPickerBtnSelectSx,
    sgPickerDialogPaperSx,
    sgPickerDragHandleSx,
    sgPickerFooterRowSx,
    sgPickerPaginationCaptionSx,
    sgPickerSearchFieldSx,
    sgPickerTableContainerSx,
    sgPickerTableSx,
    sgPickerTitleRowSx,
    sgPickerToolbarRowSx,
} from '../common/themeSharedStyles';

const BRAND = '#017E84';

const USERS_PICKER_PAGE_SIZE = 8;
const MENUS_PICKER_PAGE_SIZE = 12;

/** Aligns list/getMany map keys with `userIds` from the API (GUID casing may differ). */
function normalizeUserId(id: string | number | undefined | null): string {
    return String(id ?? '')
        .trim()
        .toLowerCase();
}

function moveArrayItem<T>(list: T[], from: number, to: number): T[] {
    if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
    const next = [...list];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    return next;
}

type UserRow = {
    id: string;
    fullName?: string;
    username?: string;
    email?: string | null;
    preferredLanguage?: string;
    isActive?: boolean;
    defaultCompanyId?: number;
    companyId?: number;
};

type MenuGrantFormRow = { menuKey: string; visible: boolean; id?: number };

// ─── Users: add dialog ───────────────────────────────────────────────────────

type AddUsersDialogProps = {
    open: boolean;
    onClose: () => void;
    existingIds: string[];
    onAdd: (newIds: string[]) => void;
};

function AddUsersDialog({ open, onClose, existingIds, onAdd }: AddUsersDialogProps) {
    const [search, setSearch] = React.useState('');
    const [page, setPage] = React.useState(1);
    const [picked, setPicked] = React.useState<Set<string>>(() => new Set());
    const [order, setOrder] = React.useState<UserRow[]>([]);
    const dragFrom = React.useRef<number | null>(null);

    const { data: users = [], isLoading } = useGetList<UserRow>('users', {
        pagination: { page: 1, perPage: 2000 },
        sort: { field: 'fullName', order: 'ASC' },
        filter: {},
    });

    const filtered = React.useMemo(() => {
        const q = search.trim().toLowerCase();
        let rows = users.filter(u => !existingIds.includes(String(u.id)));
        if (q) {
            rows = rows.filter(u => {
                const a = [u.fullName, u.username, u.email].map(x => String(x ?? '').toLowerCase());
                return a.some(s => s.includes(q));
            });
        }
        return rows;
    }, [users, search, existingIds]);

    React.useEffect(() => {
        if (!open) {
            setSearch('');
            setPage(1);
            setPicked(() => new Set());
            setOrder([]);
            dragFrom.current = null;
            return;
        }
        setOrder(filtered);
        setPage(1);
    }, [open, filtered]);

    const total = order.length;
    const pageCount = Math.max(1, Math.ceil(total / USERS_PICKER_PAGE_SIZE));
    const safePage = Math.min(page, pageCount);
    const start = (safePage - 1) * USERS_PICKER_PAGE_SIZE;
    const pageRows = order.slice(start, start + USERS_PICKER_PAGE_SIZE);

    const togglePick = (id: string) => {
        setPicked(prev => {
            const n = new Set(prev);
            if (n.has(id)) n.delete(id);
            else n.add(id);
            return n;
        });
    };

    const toggleAllPage = () => {
        const ids = pageRows.map(r => String(r.id));
        const allOn = ids.length > 0 && ids.every(id => picked.has(id));
        setPicked(prev => {
            const n = new Set(prev);
            if (allOn) ids.forEach(id => n.delete(id));
            else ids.forEach(id => n.add(id));
            return n;
        });
    };

    const onDragStartRow = (i: number) => {
        dragFrom.current = start + i;
    };

    const onDropRow = (i: number) => {
        const from = dragFrom.current;
        dragFrom.current = null;
        if (from == null) return;
        const to = start + i;
        setOrder(prev => moveArrayItem(prev, from, to));
    };

    const handleSelect = () => {
        if (picked.size === 0) {
            onClose();
            return;
        }
        onAdd(Array.from(picked));
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: sgPickerDialogPaperSx }}>
            <Box sx={sgPickerTitleRowSx}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ fontSize: '1rem' }}>
                    Add: Users
                </Typography>
                <IconButton size="small" onClick={onClose} aria-label="Close">
                    <CloseIcon fontSize="small" />
                </IconButton>
            </Box>
            <Box sx={sgPickerToolbarRowSx}>
                <TextField
                    size="small"
                    placeholder="Search..."
                    value={search}
                    onChange={e => {
                        setSearch(e.target.value);
                        setPage(1);
                    }}
                    sx={sgPickerSearchFieldSx}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                            </InputAdornment>
                        ),
                    }}
                />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography sx={sgPickerPaginationCaptionSx}>
                        {total === 0 ? '0 / 0' : `${start + 1}-${Math.min(start + USERS_PICKER_PAGE_SIZE, total)} / ${total}`}
                    </Typography>
                    <IconButton
                        size="small"
                        disabled={safePage <= 1}
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                    >
                        <NavigateBeforeIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                        size="small"
                        disabled={safePage >= pageCount}
                        onClick={() => setPage(p => Math.min(pageCount, p + 1))}
                    >
                        <NavigateNextIcon fontSize="small" />
                    </IconButton>
                </Box>
            </Box>
            <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                <TableContainer sx={sgPickerTableContainerSx}>
                    <Table size="small" stickyHeader sx={sgPickerTableSx}>
                        <TableHead>
                            <TableRow>
                                <TableCell padding="checkbox">
                                    <Checkbox
                                        size="small"
                                        indeterminate={
                                            pageRows.some(r => picked.has(String(r.id))) &&
                                            !pageRows.every(r => picked.has(String(r.id)))
                                        }
                                        checked={pageRows.length > 0 && pageRows.every(r => picked.has(String(r.id)))}
                                        onChange={() => toggleAllPage()}
                                    />
                                </TableCell>
                                <TableCell width={36} />
                                <TableCell>Name</TableCell>
                                <TableCell>Login</TableCell>
                                <TableCell>Language</TableCell>
                                <TableCell>Latest authentication...</TableCell>
                                <TableCell>Company</TableCell>
                                <TableCell>Status</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={8}>
                                        <Typography variant="body2" color="text.secondary" sx={{ py: 2, px: 2 }}>
                                            Loading…
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                pageRows.map((row, i) => (
                                    <TableRow
                                        key={row.id}
                                        hover
                                        draggable
                                        onDragStart={() => onDragStartRow(i)}
                                        onDragOver={e => e.preventDefault()}
                                        onDrop={() => onDropRow(i)}
                                    >
                                        <TableCell padding="checkbox">
                                            <Checkbox
                                                size="small"
                                                checked={picked.has(String(row.id))}
                                                onChange={() => togglePick(String(row.id))}
                                            />
                                        </TableCell>
                                        <TableCell sx={sgPickerDragHandleSx}>
                                            <DragIndicatorIcon sx={{ fontSize: 18 }} />
                                        </TableCell>
                                        <TableCell>{row.fullName ?? '—'}</TableCell>
                                        <TableCell>{row.username ?? '—'}</TableCell>
                                        <TableCell>{row.preferredLanguage ?? '—'}</TableCell>
                                        <TableCell>—</TableCell>
                                        <TableCell>—</TableCell>
                                        <TableCell>
                                            <FbrPillChip tone={userAccountStatusTone(row.isActive !== false)} />
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </DialogContent>
            <Box sx={sgPickerFooterRowSx}>
                <Button
                    variant="contained"
                    color="primary"
                    disabled={picked.size === 0}
                    onClick={handleSelect}
                    sx={sgPickerBtnSelectSx}
                >
                    Select
                </Button>
                <Button variant="contained" color="secondary" disabled sx={sgPickerBtnNewSx}>
                    New
                </Button>
                <Button onClick={onClose} sx={sgPickerBtnCloseSx}>
                    Close
                </Button>
            </Box>
        </Dialog>
    );
}

// ─── Menus: add dialog ───────────────────────────────────────────────────────

type AddMenusDialogProps = {
    open: boolean;
    onClose: () => void;
    grantedKeys: Set<string>;
    onAdd: (entries: MenuGrantFormRow[]) => void;
};

function AddMenusDialog({ open, onClose, grantedKeys, onAdd }: AddMenusDialogProps) {
    const [search, setSearch] = React.useState('');
    const [page, setPage] = React.useState(1);
    const [picked, setPicked] = React.useState<Set<string>>(() => new Set());
    const [order, setOrder] = React.useState<RegisteredAppMenuEntry[]>([]);
    const dragFrom = React.useRef<number | null>(null);

    const catalog = React.useMemo(() => getRegisteredAppMenus().filter(m => !grantedKeys.has(m.menuKey)), [grantedKeys]);

    const filtered = React.useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return catalog;
        return catalog.filter(m => m.pathLabel.toLowerCase().includes(q) || m.menuKey.toLowerCase().includes(q));
    }, [catalog, search]);

    React.useEffect(() => {
        if (!open) {
            setSearch('');
            setPage(1);
            setPicked(() => new Set());
            setOrder([]);
            dragFrom.current = null;
            return;
        }
        setOrder(filtered);
        setPage(1);
    }, [open, filtered]);

    const total = order.length;
    const pageCount = Math.max(1, Math.ceil(total / MENUS_PICKER_PAGE_SIZE));
    const safePage = Math.min(page, pageCount);
    const start = (safePage - 1) * MENUS_PICKER_PAGE_SIZE;
    const pageRows = order.slice(start, start + MENUS_PICKER_PAGE_SIZE);

    const togglePick = (key: string) => {
        setPicked(prev => {
            const n = new Set(prev);
            if (n.has(key)) n.delete(key);
            else n.add(key);
            return n;
        });
    };

    const toggleAllPage = () => {
        const keys = pageRows.map(r => r.menuKey);
        const allOn = keys.length > 0 && keys.every(k => picked.has(k));
        setPicked(prev => {
            const n = new Set(prev);
            if (allOn) keys.forEach(k => n.delete(k));
            else keys.forEach(k => n.add(k));
            return n;
        });
    };

    const onDragStartRow = (i: number) => {
        dragFrom.current = start + i;
    };

    const onDropRow = (i: number) => {
        const from = dragFrom.current;
        dragFrom.current = null;
        if (from == null) return;
        const to = start + i;
        setOrder(prev => moveArrayItem(prev, from, to));
    };

    const handleSelect = () => {
        const rows: MenuGrantFormRow[] = Array.from(picked).map(menuKey => ({ menuKey, visible: true }));
        if (rows.length === 0) {
            onClose();
            return;
        }
        onAdd(rows);
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: sgPickerDialogPaperSx }}>
            <Box sx={sgPickerTitleRowSx}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ fontSize: '1rem' }}>
                    Add: Access Menu
                </Typography>
                <IconButton size="small" onClick={onClose} aria-label="Close">
                    <CloseIcon fontSize="small" />
                </IconButton>
            </Box>
            <Box sx={sgPickerToolbarRowSx}>
                <TextField
                    size="small"
                    placeholder="Search..."
                    value={search}
                    onChange={e => {
                        setSearch(e.target.value);
                        setPage(1);
                    }}
                    sx={sgPickerSearchFieldSx}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                            </InputAdornment>
                        ),
                    }}
                />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography sx={sgPickerPaginationCaptionSx}>
                        {total === 0 ? '0 / 0' : `${start + 1}-${Math.min(start + MENUS_PICKER_PAGE_SIZE, total)} / ${total}`}
                    </Typography>
                    <IconButton
                        size="small"
                        disabled={safePage <= 1}
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                    >
                        <NavigateBeforeIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                        size="small"
                        disabled={safePage >= pageCount}
                        onClick={() => setPage(p => Math.min(pageCount, p + 1))}
                    >
                        <NavigateNextIcon fontSize="small" />
                    </IconButton>
                </Box>
            </Box>
            <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                <TableContainer sx={sgPickerTableContainerSx}>
                    <Table size="small" stickyHeader sx={sgPickerTableSx}>
                        <TableHead>
                            <TableRow>
                                <TableCell padding="checkbox">
                                    <Checkbox
                                        size="small"
                                        indeterminate={
                                            pageRows.some(r => picked.has(r.menuKey)) &&
                                            !pageRows.every(r => picked.has(r.menuKey))
                                        }
                                        checked={pageRows.length > 0 && pageRows.every(r => picked.has(r.menuKey))}
                                        onChange={() => toggleAllPage()}
                                    />
                                </TableCell>
                                <TableCell width={36} />
                                <TableCell>Menu</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {pageRows.map((row, i) => (
                                <TableRow
                                    key={row.menuKey}
                                    hover
                                    draggable
                                    onDragStart={() => onDragStartRow(i)}
                                    onDragOver={e => e.preventDefault()}
                                    onDrop={() => onDropRow(i)}
                                >
                                    <TableCell padding="checkbox">
                                        <Checkbox
                                            size="small"
                                            checked={picked.has(row.menuKey)}
                                            onChange={() => togglePick(row.menuKey)}
                                        />
                                    </TableCell>
                                    <TableCell sx={sgPickerDragHandleSx}>
                                        <DragIndicatorIcon sx={{ fontSize: 18 }} />
                                    </TableCell>
                                    <TableCell>{row.pathLabel}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </DialogContent>
            <Box sx={sgPickerFooterRowSx}>
                <Button
                    variant="contained"
                    color="primary"
                    disabled={picked.size === 0}
                    onClick={handleSelect}
                    sx={sgPickerBtnSelectSx}
                >
                    Select
                </Button>
                <Button variant="contained" color="secondary" disabled sx={sgPickerBtnNewSx}>
                    New
                </Button>
                <Button onClick={onClose} sx={sgPickerBtnCloseSx}>
                    Close
                </Button>
            </Box>
        </Dialog>
    );
}

// ─── Users tab (main) ────────────────────────────────────────────────────────

export function SecurityGroupUsersTabPanel() {
    const { setValue } = useFormContext();
    const userIds = (useWatch({ name: 'userIds' }) as string[] | undefined) ?? [];
    const [pickerOpen, setPickerOpen] = React.useState(false);

    const { data: linkedUsers = [], isPending: linkedUsersPending } = useGetMany<UserRow>(
        'users',
        { ids: userIds },
        { enabled: userIds.length > 0 }
    );

    const byId = React.useMemo(() => {
        const m = new Map<string, UserRow>();
        linkedUsers.forEach(u => m.set(normalizeUserId(u.id), u));
        return m;
    }, [linkedUsers]);

    const dragFrom = React.useRef<number | null>(null);

    const removeUser = (id: string) => {
        setValue(
            'userIds',
            userIds.filter(x => x !== id),
            { shouldDirty: true, shouldTouch: true }
        );
    };

    const onAddUsers = (newIds: string[]) => {
        setValue('userIds', Array.from(new Set([...userIds, ...newIds])), { shouldDirty: true, shouldTouch: true });
    };

    const onDragStartRow = (i: number) => {
        dragFrom.current = i;
    };

    const onDropRow = (i: number) => {
        const from = dragFrom.current;
        dragFrom.current = null;
        if (from == null) return;
        setValue('userIds', moveArrayItem(userIds, from, i), { shouldDirty: true, shouldTouch: true });
    };

    return (
        <Box sx={{ width: '100%' }}>
            <TableContainer sx={{ borderBottom: '1px solid #e5e5e5', background: '#fff' }}>
                <Table size="small" sx={{ ...sgPickerTableSx, '& .MuiTableCell-root': { borderBottom: 'none' } }}>
                    <TableHead>
                        <TableRow>
                            <TableCell width={28} sx={{ fontWeight: 600, width: 28, maxWidth: 28 }} />
                            <TableCell sx={{ fontWeight: 600, width: '22%' }}>Name</TableCell>
                            <TableCell sx={{ fontWeight: 600, width: '18%' }}>Login</TableCell>
                            <TableCell sx={{ fontWeight: 600, width: '18%' }}>Language</TableCell>
                            <TableCell sx={{ fontWeight: 600, width: '20%' }}>Latest authenticati...</TableCell>
                            <TableCell sx={{ fontWeight: 600, width: '12%' }}>Company</TableCell>
                            <TableCell sx={{ fontWeight: 600, width: '10%' }}>Status</TableCell>
                            <TableCell width={40} />
                        </TableRow>
                    </TableHead>
                </Table>
            </TableContainer>
            <Box
                role="button"
                tabIndex={0}
                onClick={() => setPickerOpen(true)}
                onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setPickerOpen(true);
                    }
                }}
                sx={{
                    px: 1.5,
                    py: '7px',
                    borderBottom: '1px solid #f0f0f0',
                    fontSize: 13,
                    color: '#999',
                    cursor: 'pointer',
                    '&:hover': { color: BRAND },
                }}
            >
                Add a line
            </Box>
            <TableContainer component={Paper} variant="outlined" sx={{ boxShadow: 'none', border: 'none' }}>
                <Table size="small" sx={sgPickerTableSx}>
                    <TableBody>
                        {userIds.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} sx={{ color: 'text.secondary', fontSize: 13 }}>
                                    No users linked. Use Add a line.
                                </TableCell>
                            </TableRow>
                        ) : (
                            userIds.map((id, i) => {
                                const key = normalizeUserId(id);
                                const u = byId.get(key);
                                const nameDisplay =
                                    u?.fullName?.trim() ||
                                    u?.username?.trim() ||
                                    (linkedUsersPending ? '…' : id);
                                return (
                                    <TableRow
                                        key={id}
                                        hover
                                        draggable
                                        onDragStart={() => onDragStartRow(i)}
                                        onDragOver={e => e.preventDefault()}
                                        onDrop={() => onDropRow(i)}
                                    >
                                        <TableCell sx={excelGridDragHandleCellSx}>
                                            <Box sx={excelGridDragHandleIconWrapperSx}>
                                                <DragIndicatorIcon sx={{ fontSize: 15 }} />
                                            </Box>
                                        </TableCell>
                                        <TableCell>{nameDisplay}</TableCell>
                                        <TableCell>{u?.username ?? '—'}</TableCell>
                                        <TableCell>{u?.preferredLanguage ?? '—'}</TableCell>
                                        <TableCell>—</TableCell>
                                        <TableCell>—</TableCell>
                                        <TableCell>
                                            {u ? (
                                                <FbrPillChip
                                                    tone={userAccountStatusTone(u.isActive !== false)}
                                                />
                                            ) : (
                                                '—'
                                            )}
                                        </TableCell>
                                        <TableCell padding="checkbox">
                                            <IconButton size="small" aria-label="Remove user" onClick={() => removeUser(id)}>
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
            <AddUsersDialog
                open={pickerOpen}
                onClose={() => setPickerOpen(false)}
                existingIds={userIds}
                onAdd={onAddUsers}
            />
        </Box>
    );
}

// ─── Menus tab (main) ────────────────────────────────────────────────────────

export function SecurityGroupMenusTabPanel() {
    const { setValue } = useFormContext();
    const menuGrants = (useWatch({ name: 'menuGrants' }) as MenuGrantFormRow[] | undefined) ?? [];
    const [pickerOpen, setPickerOpen] = React.useState(false);

    const grantedKeys = React.useMemo(() => new Set(menuGrants.map(m => m.menuKey)), [menuGrants]);

    const dragFrom = React.useRef<number | null>(null);

    const syncGrants = (grants: MenuGrantFormRow[]) => {
        setValue('menuGrants', grants, { shouldDirty: true, shouldTouch: true });
    };

    const onAddMenus = (rows: MenuGrantFormRow[]) => {
        syncGrants([...menuGrants, ...rows]);
    };

    const removeAt = (displayIndex: number) => {
        const g = menuGrants[displayIndex];
        if (!g) return;
        syncGrants(menuGrants.filter(x => x.menuKey !== g.menuKey));
    };

    const setVisibleAt = (displayIndex: number, visible: boolean) => {
        const g = menuGrants[displayIndex];
        if (!g) return;
        syncGrants(menuGrants.map(x => (x.menuKey === g.menuKey ? { ...x, visible } : x)));
    };

    const onDragStartRow = (i: number) => {
        dragFrom.current = i;
    };

    const onDropRow = (displayTo: number) => {
        const from = dragFrom.current;
        dragFrom.current = null;
        if (from == null) return;
        syncGrants(moveArrayItem(menuGrants, from, displayTo));
    };

    return (
        <Box sx={{ width: '100%', p: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12, mb: 1, lineHeight: 1.6 }}>
                Grant access to menu entries registered for each launcher app. Use Add a line to pick menus.
            </Typography>
            <Box
                role="button"
                tabIndex={0}
                onClick={() => setPickerOpen(true)}
                onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setPickerOpen(true);
                    }
                }}
                sx={{
                    px: 1.5,
                    py: '7px',
                    borderBottom: '1px solid #f0f0f0',
                    fontSize: 13,
                    color: '#999',
                    cursor: 'pointer',
                    mb: 1,
                    '&:hover': { color: BRAND },
                }}
            >
                Add a line
            </Box>
            <TableContainer component={Paper} variant="outlined" sx={{ boxShadow: 'none' }}>
                <Table size="small" sx={sgPickerTableSx}>
                    <TableHead>
                        <TableRow>
                            <TableCell width={36} />
                            <TableCell padding="checkbox" align="center">
                                <Box
                                    sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: 0.25,
                                    }}
                                >
                                    <Checkbox
                                        size="small"
                                        disabled={menuGrants.length === 0}
                                        checked={menuGrants.length > 0 && menuGrants.every(m => m.visible !== false)}
                                        indeterminate={
                                            menuGrants.length > 0 &&
                                            menuGrants.some(m => m.visible !== false) &&
                                            !menuGrants.every(m => m.visible !== false)
                                        }
                                        onChange={() => {
                                            const allOn = menuGrants.every(m => m.visible !== false);
                                            syncGrants(menuGrants.map(m => ({ ...m, visible: !allOn })));
                                        }}
                                        inputProps={{ 'aria-label': 'Toggle visible for all menus' }}
                                    />
                                    <Typography component="span" variant="caption" sx={{ fontSize: 10, lineHeight: 1 }}>
                                        Visible
                                    </Typography>
                                </Box>
                            </TableCell>
                            <TableCell>Menu</TableCell>
                            <TableCell width={48} />
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {menuGrants.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} sx={{ color: 'text.secondary', fontSize: 13 }}>
                                    No menu grants. Use Add a line.
                                </TableCell>
                            </TableRow>
                        ) : (
                            menuGrants.map((row, i) => (
                                <TableRow
                                    key={row.menuKey}
                                    hover
                                    draggable
                                    onDragStart={() => onDragStartRow(i)}
                                    onDragOver={e => e.preventDefault()}
                                    onDrop={() => onDropRow(i)}
                                >
                                    <TableCell sx={sgPickerDragHandleSx}>
                                        <DragIndicatorIcon sx={{ fontSize: 18 }} />
                                    </TableCell>
                                    <TableCell padding="checkbox">
                                        <Checkbox
                                            size="small"
                                            checked={row.visible !== false}
                                            onChange={e => setVisibleAt(i, e.target.checked)}
                                        />
                                    </TableCell>
                                    <TableCell>{menuLabelForKey(row.menuKey)}</TableCell>
                                    <TableCell>
                                        <IconButton size="small" aria-label="Remove menu" onClick={() => removeAt(i)}>
                                            <DeleteOutlineIcon fontSize="small" />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
            <AddMenusDialog
                open={pickerOpen}
                onClose={() => setPickerOpen(false)}
                grantedKeys={grantedKeys}
                onAdd={onAddMenus}
            />
        </Box>
    );
}
