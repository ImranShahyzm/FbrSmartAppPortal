import * as React from 'react';
import {
    Button,
    Box,
    Chip,
    Divider,
    IconButton,
    InputBase,
    List as MuiList,
    ListItemButton,
    ListItemText,
    Paper,
    Popover,
    Tooltip,
    Typography,
} from '@mui/material';
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewKanbanOutlinedIcon from '@mui/icons-material/ViewKanbanOutlined';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import CloseIcon from '@mui/icons-material/Close';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import StarBorderOutlinedIcon from '@mui/icons-material/StarBorderOutlined';
import { ColumnsButton, TopToolbar, useListContext, useResourceContext, useStore } from 'react-admin';
import type { SortPayload } from 'react-admin';

import { useOdooListSearchQ } from '../useOdooListSearchQ';

const NAV_TEAL = '#3d7a7a';
const NAV_TEAL_DARK = '#2e6262';

export type AutodealerGroupPreset = {
    value: string;
    label: string;
    sort: SortPayload;
};

export type AutodealerListToolbarProps = {
    newLabel: string;
    onNew: () => void;
    title: string;
    columnsButtonId: string;
    columnsStoreKey: string;
    searchPlaceholder: string;
    listViewStoreKey: string;
    groupByPresets: AutodealerGroupPreset[];
    groupByStoreKey: string;
};

/**
 * Odoo-like list toolbar: New, title + gear (Choose columns), search bar with filter popover
 * (Filters | Group by | Favorites), pagination text, list/kanban toggles.
 */
export function AutodealerListToolbar(props: AutodealerListToolbarProps) {
    const {
        newLabel,
        onNew,
        title,
        columnsButtonId,
        columnsStoreKey,
        searchPlaceholder,
        listViewStoreKey,
        groupByPresets,
        groupByStoreKey,
    } = props;

    const { page, perPage, total, setFilters, setSort, setPage } = useListContext();
    const resource = useResourceContext();
    const [q, setQ] = useOdooListSearchQ();
    const [view, setView] = useStore<'list' | 'kanban'>(listViewStoreKey, 'list');
    const [groupBy, setGroupBy] = useStore<string>(groupByStoreKey, 'none');

    const searchBarRef = React.useRef<HTMLDivElement | null>(null);
    const [searchPanelOpen, setSearchPanelOpen] = React.useState(false);
    const toggleSearchPanel = React.useCallback(() => setSearchPanelOpen(o => !o), []);
    const closeSearchPanel = React.useCallback(() => setSearchPanelOpen(false), []);

    const pageStart = total ? (page - 1) * perPage + 1 : 0;
    const pageEnd = total ? Math.min(page * perPage, total) : 0;

    const activePreset = groupByPresets.find(p => p.value === groupBy) ?? groupByPresets[0];

    const onChooseColumns = React.useCallback(() => {
        document.getElementById(columnsButtonId)?.click();
    }, [columnsButtonId]);

    const clearAllFilters = React.useCallback(() => {
        setFilters({}, []);
        setQ('');
        setPage(1);
    }, [setFilters, setQ, setPage]);

    const applyGroupPreset = React.useCallback(
        (value: string) => {
            setGroupBy(value);
            const preset = groupByPresets.find(p => p.value === value);
            if (preset) setSort(preset.sort);
            setPage(1);
        },
        [groupByPresets, setGroupBy, setPage, setSort]
    );

    const viewButtons = [
        { key: 'list' as const, icon: <ViewListIcon fontSize="small" /> },
        { key: 'kanban' as const, icon: <ViewKanbanOutlinedIcon fontSize="small" /> },
    ];

    return (
        <TopToolbar sx={{ width: '100%', p: 0, minHeight: 'unset', flexDirection: 'column', pt: { xs: '4px', md: '12px' } }}>
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
                    <Button
                        variant="contained"
                        size="small"
                        onClick={onNew}
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
                        {newLabel}
                    </Button>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 0.5, position: 'relative' }}>
                        <Typography variant="body1" sx={{ fontWeight: 700, fontSize: 15 }}>
                            {title}
                        </Typography>
                        <Tooltip title="Choose columns">
                            <IconButton size="small" sx={{ color: 'text.secondary', p: '2px' }} onClick={onChooseColumns}>
                                <SettingsOutlinedIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                        </Tooltip>
                        <Box
                            sx={{
                                position: 'absolute',
                                width: 1,
                                height: 1,
                                overflow: 'hidden',
                                clip: 'rect(0 0 0 0)',
                                whiteSpace: 'nowrap',
                            }}
                            aria-hidden
                        >
                            <ColumnsButton
                                id={columnsButtonId}
                                resource={resource}
                                storeKey={columnsStoreKey}
                                sx={{ minWidth: 0, px: '6px' }}
                            />
                        </Box>
                    </Box>
                </Box>

                <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                    <Paper
                        ref={searchBarRef}
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
                        <Tooltip title="Filters & grouping">
                            <Box
                                component="button"
                                type="button"
                                onClick={() => setSearchPanelOpen(true)}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    px: 1,
                                    py: '5px',
                                    bgcolor: '#eef6f6',
                                    borderRight: '1px solid #e0e0e0',
                                    cursor: 'pointer',
                                    border: 'none',
                                    '&:hover': { bgcolor: '#d9eeee' },
                                }}
                            >
                                <FilterListIcon sx={{ fontSize: 18, color: NAV_TEAL }} />
                            </Box>
                        </Tooltip>

                        {String(q).trim() ? (
                            <Chip
                                label={`Search: "${String(q).trim().slice(0, 24)}${String(q).trim().length > 24 ? '…' : ''}"`}
                                size="small"
                                onDelete={() => setQ('')}
                                sx={{
                                    ml: 0.75,
                                    height: 22,
                                    maxWidth: 200,
                                    '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' },
                                }}
                            />
                        ) : null}

                        {activePreset && activePreset.value !== 'none' ? (
                            <Chip
                                label={`Group: ${activePreset.label}`}
                                size="small"
                                onDelete={() => applyGroupPreset('none')}
                                sx={{ ml: 0.5, height: 22, maxWidth: 180 }}
                            />
                        ) : null}

                        <InputBase
                            value={q}
                            onChange={e => setQ(e.target.value)}
                            placeholder={searchPlaceholder}
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

                        <Tooltip title={searchPanelOpen ? 'Close' : 'Filters, group by…'}>
                            <IconButton
                                size="small"
                                onClick={toggleSearchPanel}
                                sx={{
                                    p: '4px',
                                    borderRadius: 0,
                                    borderLeft: '1px solid #e0e0e0',
                                    color: searchPanelOpen ? NAV_TEAL : 'text.secondary',
                                    bgcolor: searchPanelOpen ? '#eef6f6' : 'transparent',
                                    '&:hover': { color: NAV_TEAL, bgcolor: '#eef6f6' },
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
                                    <FilterListIcon sx={{ fontSize: 20, color: NAV_TEAL }} />
                                    <Typography variant="subtitle2" fontWeight={700}>
                                        Filters
                                    </Typography>
                                </Box>
                                <MuiList disablePadding sx={{ py: 0 }}>
                                    <ListItemButton dense onClick={clearAllFilters} sx={{ py: 0.75, px: 1.5 }}>
                                        <ListItemText primary="Clear all filters & search" primaryTypographyProps={{ variant: 'body2' }} />
                                    </ListItemButton>
                                </MuiList>
                                <ListItemButton dense disabled sx={{ opacity: 0.55, py: 0.5 }}>
                                    <ListItemText primary="Add custom filter" primaryTypographyProps={{ variant: 'caption' }} />
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
                                    {groupByPresets.map(opt => (
                                        <ListItemButton
                                            key={opt.value}
                                            selected={groupBy === opt.value}
                                            dense
                                            onClick={() => {
                                                applyGroupPreset(opt.value);
                                                closeSearchPanel();
                                            }}
                                            sx={{
                                                py: 0.5,
                                                px: 1.5,
                                                '&.Mui-selected': { bgcolor: 'action.selected' },
                                            }}
                                        >
                                            <ListItemText primary={opt.label} primaryTypographyProps={{ variant: 'body2' }} />
                                        </ListItemButton>
                                    ))}
                                </MuiList>
                                <ListItemButton dense disabled sx={{ opacity: 0.55, py: 0.5 }}>
                                    <ListItemText primary="Add custom group" primaryTypographyProps={{ variant: 'caption' }} />
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

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: '0 0 auto' }}>
                    {total != null && (
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12 }}>
                            {pageStart}–{pageEnd} / {total}
                        </Typography>
                    )}
                    <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                    {viewButtons.map(({ key, icon }) => (
                        <IconButton
                            key={key}
                            size="small"
                            onClick={() => setView(key)}
                            sx={{
                                bgcolor: view === key ? '#e0f2f1' : 'transparent',
                                color: view === key ? NAV_TEAL : 'text.secondary',
                            }}
                        >
                            {icon}
                        </IconButton>
                    ))}
                </Box>
            </Box>
        </TopToolbar>
    );
}
