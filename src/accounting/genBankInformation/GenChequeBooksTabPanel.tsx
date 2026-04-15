import * as React from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { useRecordContext, useRedirect, useTranslate } from 'react-admin';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import {
    Box,
    Checkbox,
    Chip,
    CircularProgress,
    Dialog,
    DialogContent,
    DialogTitle,
    IconButton,
    InputAdornment,
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

import { apiFetch } from '../../api/httpClient';
import { FBR_PILL_CHIP_SX } from '../../common/fbrPillChip';
import {
    excelGridBodyCellSx,
    excelGridDragHandleCellSx,
    excelGridDragHandleIconWrapperSx,
    excelGridInlineFieldSx,
    excelGridTableContainerSx,
    excelGridTableSx,
    sgPickerDialogPaperSx,
    sgPickerPaginationCaptionSx,
    sgPickerSearchFieldSx,
    sgPickerTableContainerSx,
    sgPickerTableSx,
    sgPickerTitleRowSx,
    sgPickerToolbarRowSx,
} from '../../common/themeSharedStyles';

const BRAND = '#017E84';

function chequeSerialStatusTone(status: string) {
    const s = String(status ?? '').toLowerCase();
    if (s === 'used') return { label: 'Used', bg: '#2e7d32', color: '#ffffff', border: '#2e7d32' };
    if (s === 'cancelled') return { label: 'Cancelled', bg: '#616161', color: '#ffffff', border: '#616161' };
    return { label: 'Available', bg: '#e6f4f4', color: '#015f63', border: '#b2d8da' };
}

export type CheckBookFormRow = {
    id?: number;
    serialNoStart?: string | number | null;
    serialNoEnd?: string | number | null;
    isActive?: boolean;
    branchId?: number | null;
};

function emptyRow(): CheckBookFormRow {
    return { serialNoStart: '', serialNoEnd: '', isActive: false, branchId: null };
}

function moveArrayItem<T>(list: T[], from: number, to: number): T[] {
    if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
    const next = [...list];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    return next;
}

function toStr(v: unknown): string {
    if (v == null || v === '') return '';
    return String(v);
}

export function GenChequeBooksTabPanel({ variant }: { variant: 'create' | 'edit' }) {
    const translate = useTranslate();
    const redirect = useRedirect();
    const record = useRecordContext<{ id?: number }>();
    const { setValue } = useFormContext();
    const rows = (useWatch({ name: 'checkBooks' }) as CheckBookFormRow[] | undefined) ?? [];
    const dragFromDisplayIdx = React.useRef<number | null>(null);

    const [serialsOpen, setSerialsOpen] = React.useState(false);
    const [serialsBook, setSerialsBook] = React.useState<CheckBookFormRow | null>(null);
    const [serialsLoading, setSerialsLoading] = React.useState(false);
    const [serialsItems, setSerialsItems] = React.useState<
        { serialNo: string; status: string; voucherId?: number | null }[]
    >([]);
    const [serialsTotal, setSerialsTotal] = React.useState(0);
    const [serialsSearch, setSerialsSearch] = React.useState('');
    const [serialsPage, setSerialsPage] = React.useState(1);
    const SERIALS_PAGE_SIZE = 20;

    const bankId = variant === 'edit' ? record?.id : undefined;

    const loadSerials = React.useCallback(
        async (book: CheckBookFormRow, page: number, q: string) => {
            if (bankId == null || book.id == null || book.id <= 0) return;
            setSerialsLoading(true);
            try {
                const safePage = Math.max(1, page);
                const qs = q.trim();
                const res = await apiFetch(
                    `/api/genBankInformation/${bankId}/check-books/${book.id}/serials?page=${safePage}&perPage=${SERIALS_PAGE_SIZE}&q=${encodeURIComponent(qs)}`,
                    { method: 'GET' },
                    { auth: true, retryOn401: true }
                );
                const j = (await res.json().catch(() => ({}))) as {
                    items?: { serialNo: string; status: string; voucherId?: number | null }[];
                    total?: number;
                    skip?: number;
                    perPage?: number;
                };
                if (!res.ok) throw new Error('Failed to load serials');
                setSerialsItems(j.items ?? []);
                setSerialsTotal(typeof j.total === 'number' ? j.total : 0);
            } catch {
                setSerialsItems([]);
                setSerialsTotal(0);
            } finally {
                setSerialsLoading(false);
            }
        },
        [bankId]
    );

    const openSerialDialog = (book: CheckBookFormRow) => {
        setSerialsBook(book);
        setSerialsOpen(true);
        setSerialsSearch('');
        setSerialsPage(1);
        void loadSerials(book, 1, '');
    };

    const setRows = (next: CheckBookFormRow[]) => {
        setValue('checkBooks', next, { shouldDirty: true, shouldTouch: true });
    };

    const setActiveExclusive = (idx: number, checked: boolean) => {
        const next = rows.map((r, i) => ({
            ...r,
            isActive: i === idx ? checked : checked ? false : r.isActive,
        }));
        if (checked) {
            for (let i = 0; i < next.length; i++) {
                if (i !== idx) next[i] = { ...next[i], isActive: false };
            }
        }
        setRows(next);
    };

    return (
        <Box sx={{ pt: 1 }}>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                {translate('resources.genBankInformation.cheque_books_hint', {
                    _: 'Only one cheque book can be active per bank. Used status comes from posted bank payments with this GL account.',
                })}
            </Typography>
            <TableContainer sx={excelGridTableContainerSx}>
                <Table size="small" sx={excelGridTableSx}>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ ...excelGridBodyCellSx, width: 36 }} aria-label="Reorder" />
                            <TableCell sx={excelGridBodyCellSx}>
                                {translate('resources.genBankInformation.fields.serial_start', { _: 'Start serial' })}
                            </TableCell>
                            <TableCell sx={excelGridBodyCellSx}>
                                {translate('resources.genBankInformation.fields.serial_end', { _: 'End serial' })}
                            </TableCell>
                            <TableCell sx={{ ...excelGridBodyCellSx, width: 100 }}>
                                {translate('resources.genBankInformation.fields.active', { _: 'Active' })}
                            </TableCell>
                            <TableCell sx={{ ...excelGridBodyCellSx, width: 52 }} aria-label="Details" />
                            <TableCell sx={{ ...excelGridBodyCellSx, width: 52 }} aria-label="Delete" />
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.map((row, displayIdx) => (
                            <TableRow key={displayIdx} hover>
                                <TableCell sx={excelGridDragHandleCellSx}>
                                    <Box
                                        component="span"
                                        draggable
                                        onDragStart={() => {
                                            dragFromDisplayIdx.current = displayIdx;
                                        }}
                                        onDragOver={e => e.preventDefault()}
                                        onDrop={() => {
                                            const from = dragFromDisplayIdx.current;
                                            dragFromDisplayIdx.current = null;
                                            if (from == null) return;
                                            setRows(moveArrayItem(rows, from, displayIdx));
                                        }}
                                        sx={excelGridDragHandleIconWrapperSx}
                                    >
                                        <DragIndicatorIcon fontSize="small" />
                                    </Box>
                                </TableCell>
                                <TableCell sx={excelGridBodyCellSx}>
                                    <TextField
                                        size="small"
                                        value={toStr(row.serialNoStart)}
                                        onChange={e => {
                                            const v = e.target.value;
                                            const next = [...rows];
                                            next[displayIdx] = { ...next[displayIdx], serialNoStart: v };
                                            setRows(next);
                                        }}
                                        placeholder="0"
                                        fullWidth
                                        sx={excelGridInlineFieldSx}
                                    />
                                </TableCell>
                                <TableCell sx={excelGridBodyCellSx}>
                                    <TextField
                                        size="small"
                                        value={toStr(row.serialNoEnd)}
                                        onChange={e => {
                                            const v = e.target.value;
                                            const next = [...rows];
                                            next[displayIdx] = { ...next[displayIdx], serialNoEnd: v };
                                            setRows(next);
                                        }}
                                        placeholder="0"
                                        fullWidth
                                        sx={excelGridInlineFieldSx}
                                    />
                                </TableCell>
                                <TableCell sx={excelGridBodyCellSx}>
                                    <Checkbox
                                        size="small"
                                        checked={Boolean(row.isActive)}
                                        onChange={(_, c) => setActiveExclusive(displayIdx, c)}
                                        sx={{ color: '#bbb', '&.Mui-checked': { color: BRAND } }}
                                    />
                                </TableCell>
                                <TableCell sx={excelGridBodyCellSx}>
                                    <Tooltip
                                        title={
                                            bankId && row.id
                                                ? translate('resources.genBankInformation.view_serials', {
                                                      _: 'View cheque numbers',
                                                  })
                                                : translate('resources.genBankInformation.save_bank_first_serials', {
                                                      _: 'Save the bank once to view serial status.',
                                                  })
                                        }
                                    >
                                        <span>
                                            <IconButton
                                                size="small"
                                                disabled={!bankId || !row.id}
                                                onClick={() => openSerialDialog(row)}
                                                sx={{ color: BRAND }}
                                            >
                                                <ArrowForwardIosIcon sx={{ fontSize: 14 }} />
                                            </IconButton>
                                        </span>
                                    </Tooltip>
                                </TableCell>
                                <TableCell sx={excelGridBodyCellSx}>
                                    <IconButton
                                        size="small"
                                        onClick={() => {
                                            const next = rows.filter((_, i) => i !== displayIdx);
                                            setRows(next.length > 0 ? next : [emptyRow()]);
                                        }}
                                        aria-label="delete"
                                    >
                                        <DeleteOutlineIcon fontSize="small" />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
            <Box sx={{ mt: 1 }}>
                <IconButton
                    size="small"
                    onClick={() => setRows([...rows, emptyRow()])}
                    sx={{ color: BRAND }}
                    aria-label="add"
                >
                    <AddCircleOutlineIcon fontSize="small" sx={{ mr: 0.5 }} />
                    <Typography component="span" variant="body2" sx={{ fontSize: 13 }}>
                        {translate('resources.genBankInformation.add_cheque_book', { _: 'Add cheque book' })}
                    </Typography>
                </IconButton>
            </Box>

            <Dialog open={serialsOpen} onClose={() => setSerialsOpen(false)} maxWidth="sm" fullWidth>
                <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                    <Box sx={sgPickerTitleRowSx}>
                        <Typography variant="subtitle1" fontWeight={700} sx={{ fontSize: '1rem' }}>
                            {translate('resources.genBankInformation.serial_dialog_title', { _: 'Cheque numbers in this book' })}
                        </Typography>
                        <IconButton size="small" onClick={() => setSerialsOpen(false)} aria-label="Close">
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </Box>

                    <Box sx={sgPickerToolbarRowSx}>
                        <TextField
                            size="small"
                            placeholder={translate('ra.action.search', { _: 'Search…' })}
                            value={serialsSearch}
                            onChange={e => {
                                const v = e.target.value;
                                setSerialsSearch(v);
                                setSerialsPage(1);
                                if (serialsBook) void loadSerials(serialsBook, 1, v);
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
                                {serialsTotal === 0
                                    ? '0 / 0'
                                    : `${(serialsPage - 1) * SERIALS_PAGE_SIZE + 1}-${Math.min(
                                          serialsPage * SERIALS_PAGE_SIZE,
                                          serialsTotal
                                      )} / ${serialsTotal}`}
                            </Typography>
                            <IconButton
                                size="small"
                                disabled={serialsPage <= 1}
                                onClick={() => {
                                    const next = Math.max(1, serialsPage - 1);
                                    setSerialsPage(next);
                                    if (serialsBook) void loadSerials(serialsBook, next, serialsSearch);
                                }}
                            >
                                <NavigateBeforeIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                                size="small"
                                disabled={serialsPage * SERIALS_PAGE_SIZE >= serialsTotal}
                                onClick={() => {
                                    const next = serialsPage + 1;
                                    setSerialsPage(next);
                                    if (serialsBook) void loadSerials(serialsBook, next, serialsSearch);
                                }}
                            >
                                <NavigateNextIcon fontSize="small" />
                            </IconButton>
                        </Box>
                    </Box>

                    <TableContainer sx={sgPickerTableContainerSx}>
                        <Table size="small" stickyHeader sx={sgPickerTableSx}>
                            <TableHead>
                                <TableRow>
                                    <TableCell>
                                        {translate('resources.genBankInformation.fields.cheque_no', { _: 'Cheque no.' })}
                                    </TableCell>
                                    <TableCell>
                                        {translate('resources.genBankInformation.fields.status', { _: 'Status' })}
                                    </TableCell>
                                    <TableCell align="right" width={140} />
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {serialsLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={3}>
                                            <Typography variant="body2" color="text.secondary" sx={{ py: 2, px: 2 }}>
                                                Loading…
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    serialsItems.map(s => (
                                        <TableRow key={s.serialNo} hover>
                                            <TableCell>{s.serialNo}</TableCell>
                                            <TableCell>
                                                {(() => {
                                                    const tone = chequeSerialStatusTone(s.status);
                                                    return (
                                                        <Chip
                                                            size="small"
                                                            label={tone.label}
                                                            sx={{
                                                                ...FBR_PILL_CHIP_SX,
                                                                bgcolor: tone.bg,
                                                                color: tone.color,
                                                                border: `1px solid ${tone.border}`,
                                                            }}
                                                        />
                                                    );
                                                })()}
                                            </TableCell>
                                            <TableCell align="right">
                                                {s.status === 'used' && s.voucherId ? (
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => {
                                                            setSerialsOpen(false);
                                                            redirect('edit', 'glJournalVouchers', s.voucherId as number);
                                                        }}
                                                        aria-label={translate('ra.action.show', { _: 'Open' })}
                                                        sx={{ color: BRAND, mr: 0.5 }}
                                                    >
                                                        <ArrowForwardIosIcon sx={{ fontSize: 14 }} />
                                                    </IconButton>
                                                ) : null}
                                                {s.status === 'available' && bankId && serialsBook?.id ? (
                                                    <IconButton
                                                        size="small"
                                                        onClick={async () => {
                                                            const res = await apiFetch(
                                                                `/api/genBankInformation/${bankId}/check-books/${serialsBook.id}/cancel-serial`,
                                                                {
                                                                    method: 'POST',
                                                                    headers: { 'Content-Type': 'application/json' },
                                                                    body: JSON.stringify({ serialNo: s.serialNo }),
                                                                },
                                                                { auth: true, retryOn401: true }
                                                            );
                                                            if (res.ok) void loadSerials(serialsBook, serialsPage, serialsSearch);
                                                        }}
                                                        aria-label={translate(
                                                            'resources.genBankInformation.actions.mark_cancelled',
                                                            { _: 'Mark cancelled' }
                                                        )}
                                                    >
                                                        <Typography variant="caption" sx={{ color: BRAND }}>
                                                            {translate('resources.genBankInformation.actions.mark_cancelled', {
                                                                _: 'Mark cancelled',
                                                            })}
                                                        </Typography>
                                                    </IconButton>
                                                ) : null}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </DialogContent>
            </Dialog>
        </Box>
    );
}
