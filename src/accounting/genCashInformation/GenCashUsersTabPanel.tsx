import * as React from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { useGetList, useGetMany, useTranslate } from 'react-admin';
import {
    Box,
    Button,
    Checkbox,
    Dialog,
    DialogContent,
    IconButton,
    InputAdornment,
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
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';

import { FbrPillChip, userAccountStatusTone } from '../../common/fbrPillChip';
import {
    sgPickerBtnCloseSx,
    sgPickerBtnSelectSx,
    sgPickerDialogPaperSx,
    sgPickerPaginationCaptionSx,
    sgPickerSearchFieldSx,
    sgPickerTableContainerSx,
    sgPickerTableSx,
    sgPickerTitleRowSx,
    sgPickerToolbarRowSx,
} from '../../common/themeSharedStyles';

type UserRow = {
    id: string;
    fullName?: string;
    username?: string;
    preferredLanguage?: string;
    isActive?: boolean;
};

const USERS_PICKER_PAGE_SIZE = 12;

function normalizeUserId(id: string | number | undefined | null): string {
    return String(id ?? '').trim().toLowerCase();
}

function AddUsersDialog(props: {
    open: boolean;
    onClose: () => void;
    existingIds: string[];
    onAdd: (newIds: string[]) => void;
}) {
    const translate = useTranslate();
    const [search, setSearch] = React.useState('');
    const [page, setPage] = React.useState(1);
    const [picked, setPicked] = React.useState<Set<string>>(() => new Set());

    const { data: users = [], isLoading } = useGetList<UserRow>('users', {
        pagination: { page: 1, perPage: 2000 },
        sort: { field: 'fullName', order: 'ASC' },
        filter: {},
    });

    const filtered = React.useMemo(() => {
        const q = search.trim().toLowerCase();
        let rows = users.filter(u => !props.existingIds.includes(normalizeUserId(u.id)));
        if (q) {
            rows = rows.filter(u => {
                const a = [u.fullName, u.username].map(x => String(x ?? '').toLowerCase());
                return a.some(s => s.includes(q));
            });
        }
        return rows;
    }, [users, search, props.existingIds]);

    React.useEffect(() => {
        if (!props.open) {
            setSearch('');
            setPage(1);
            setPicked(() => new Set());
        }
    }, [props.open]);

    const safePage = Math.max(1, Math.min(page, Math.max(1, Math.ceil(filtered.length / USERS_PICKER_PAGE_SIZE))));
    const start = (safePage - 1) * USERS_PICKER_PAGE_SIZE;
    const pageRows = filtered.slice(start, start + USERS_PICKER_PAGE_SIZE);
    const pageCount = Math.max(1, Math.ceil(filtered.length / USERS_PICKER_PAGE_SIZE));

    const toggle = (id: string) => {
        const key = normalizeUserId(id);
        setPicked(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const toggleAllPage = () => {
        setPicked(prev => {
            const next = new Set(prev);
            const all = pageRows.every(r => next.has(normalizeUserId(r.id)));
            for (const r of pageRows) {
                const k = normalizeUserId(r.id);
                if (all) next.delete(k);
                else next.add(k);
            }
            return next;
        });
    };

    const handleSelect = () => {
        if (picked.size === 0) {
            props.onClose();
            return;
        }
        props.onAdd(Array.from(picked));
        props.onClose();
    };

    return (
        <Dialog open={props.open} onClose={props.onClose} maxWidth="md" fullWidth PaperProps={{ sx: sgPickerDialogPaperSx }}>
            <Box sx={sgPickerTitleRowSx}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ fontSize: '1rem' }}>
                    Add: Users
                </Typography>
                <IconButton size="small" onClick={props.onClose} aria-label="Close">
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
                        {filtered.length === 0
                            ? '0 / 0'
                            : `${start + 1}-${Math.min(start + USERS_PICKER_PAGE_SIZE, filtered.length)} / ${filtered.length}`}
                    </Typography>
                    <IconButton size="small" disabled={safePage <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
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
                                            pageRows.some(r => picked.has(normalizeUserId(r.id))) &&
                                            !pageRows.every(r => picked.has(normalizeUserId(r.id)))
                                        }
                                        checked={pageRows.length > 0 && pageRows.every(r => picked.has(normalizeUserId(r.id)))}
                                        onChange={() => toggleAllPage()}
                                    />
                                </TableCell>
                                <TableCell>Name</TableCell>
                                <TableCell>Login</TableCell>
                                <TableCell>Language</TableCell>
                                <TableCell>Status</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5}>
                                        <Typography variant="body2" color="text.secondary" sx={{ py: 2, px: 2 }}>
                                            Loading…
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                pageRows.map(row => (
                                    <TableRow key={row.id} hover onClick={() => toggle(row.id)} sx={{ cursor: 'pointer' }}>
                                        <TableCell padding="checkbox">
                                            <Checkbox size="small" checked={picked.has(normalizeUserId(row.id))} />
                                        </TableCell>
                                        <TableCell>{row.fullName ?? '—'}</TableCell>
                                        <TableCell>{row.username ?? '—'}</TableCell>
                                        <TableCell>{row.preferredLanguage ?? '—'}</TableCell>
                                        <TableCell>
                                            <FbrPillChip tone={userAccountStatusTone(row.isActive !== false)} />
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.25, borderTop: '1px solid', borderColor: 'divider' }}>
                    <Button variant="contained" onClick={handleSelect} disabled={picked.size === 0} sx={sgPickerBtnSelectSx}>
                        Select
                    </Button>
                    <Button onClick={props.onClose} sx={sgPickerBtnCloseSx}>
                        Close
                    </Button>
                </Box>
            </DialogContent>
        </Dialog>
    );
}

export function GenCashUsersTabPanel() {
    const { setValue } = useFormContext();
    const userIds = ((useWatch({ name: 'userIds' }) as unknown[]) ?? []).map(x => normalizeUserId(String(x)));
    const [open, setOpen] = React.useState(false);

    const { data: selectedUsers = [], isLoading: selectedLoading } = useGetMany<UserRow>('users', {
        ids: userIds,
    });

    const selectedById = React.useMemo(() => {
        const m = new Map<string, UserRow>();
        for (const u of selectedUsers ?? []) m.set(normalizeUserId(u.id), u);
        return m;
    }, [selectedUsers]);

    const remove = (id: string) => {
        const k = normalizeUserId(id);
        setValue(
            'userIds',
            userIds.filter(x => x !== k),
            { shouldDirty: true, shouldTouch: true }
        );
    };

    return (
        <Box sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                <Button variant="outlined" size="small" onClick={() => setOpen(true)} sx={{ textTransform: 'none' }}>
                    Add users
                </Button>
            </Box>
            {userIds.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                    No users assigned. This cash account will be visible to everyone.
                </Typography>
            ) : (
                <Table size="small" sx={sgPickerTableSx}>
                    <TableHead>
                        <TableRow>
                            <TableCell>Name</TableCell>
                            <TableCell>Login</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell align="right" width={90} />
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {selectedLoading ? (
                            <TableRow>
                                <TableCell colSpan={4}>
                                    <Typography variant="body2" color="text.secondary" sx={{ py: 2, px: 2 }}>
                                        Loading…
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            userIds.map(id => {
                                const u = selectedById.get(id);
                                return (
                                    <TableRow key={id} hover>
                                        <TableCell>{u?.fullName ?? '—'}</TableCell>
                                        <TableCell>{u?.username ?? '—'}</TableCell>
                                        <TableCell>
                                            <FbrPillChip tone={userAccountStatusTone(u?.isActive !== false)} />
                                        </TableCell>
                                <TableCell align="right">
                                    <Button size="small" onClick={() => remove(id)} sx={{ textTransform: 'none' }}>
                                        Remove
                                    </Button>
                                </TableCell>
                            </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            )}

            <AddUsersDialog
                open={open}
                onClose={() => setOpen(false)}
                existingIds={userIds}
                onAdd={newIds => {
                    const merged = Array.from(new Set([...userIds, ...newIds.map(normalizeUserId)]));
                    setValue('userIds', merged, { shouldDirty: true, shouldTouch: true });
                }}
            />
        </Box>
    );
}

