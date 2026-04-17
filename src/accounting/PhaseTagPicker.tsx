import * as React from 'react';
import { useWatch, useFormContext } from 'react-hook-form';
import {
    Autocomplete,
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    TextField,
    Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import { useNotify } from 'react-admin';

import { apiFetch } from '../api/httpClient';

export type PhaseTagOption = { id: number; tagName: string; tagColor?: string | null };

function safeColor(c: string | null | undefined): string | null {
    if (!c) return null;
    const t = String(c).trim();
    if (!t) return null;
    return t;
}

export function PhaseTagPicker(props: { disabled?: boolean }) {
    const disabled = Boolean(props.disabled);
    const notify = useNotify();
    const { setValue } = useFormContext();
    const tagIds = (useWatch({ name: 'tagIds' }) as unknown[] | undefined) ?? [];
    const selectedIds = React.useMemo(
        () => tagIds.map(x => Number(x)).filter(n => Number.isFinite(n) && n > 0),
        [tagIds]
    );

    const [options, setOptions] = React.useState<PhaseTagOption[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [createOpen, setCreateOpen] = React.useState(false);
    const [newName, setNewName] = React.useState('');
    const [newColor, setNewColor] = React.useState('#714b67');

    const load = React.useCallback(async () => {
        setLoading(true);
        try {
            const res = await apiFetch('/api/phaseTags', { method: 'GET' });
            if (!res.ok) throw new Error(res.statusText);
            const rows = (await res.json()) as Array<{ id: number; tagName: string; tagColor?: string | null }>;
            setOptions(Array.isArray(rows) ? rows : []);
        } catch (e) {
            notify(e instanceof Error ? e.message : 'Failed to load tags', { type: 'warning' });
        } finally {
            setLoading(false);
        }
    }, [notify]);

    React.useEffect(() => {
        void load();
    }, [load]);

    const selectedOptions = React.useMemo(
        () => options.filter(o => selectedIds.includes(o.id)),
        [options, selectedIds]
    );

    const onChange = (_: unknown, value: PhaseTagOption[]) => {
        setValue('tagIds', value.map(v => v.id), { shouldDirty: true });
    };

    const createTag = React.useCallback(async () => {
        const name = newName.trim();
        if (!name) {
            notify('Tag name is required.', { type: 'warning' });
            return;
        }
        try {
            const res = await apiFetch('/api/phaseTags', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tagName: name, tagColor: safeColor(newColor) }),
            });
            const payload = (await res.json().catch(() => ({}))) as { message?: string } & Partial<PhaseTagOption>;
            if (!res.ok) {
                notify(payload.message ?? res.statusText, { type: 'warning' });
                return;
            }
            const created: PhaseTagOption = {
                id: Number(payload.id) || 0,
                tagName: String(payload.tagName ?? name),
                tagColor: payload.tagColor ?? safeColor(newColor),
            };
            if (created.id <= 0) {
                notify('Tag created but could not read id.', { type: 'warning' });
            }
            setOptions(prev => {
                const next = [...prev, created].sort((a, b) => a.tagName.localeCompare(b.tagName));
                return next;
            });
            setValue('tagIds', Array.from(new Set([...selectedIds, created.id].filter(x => x > 0))), { shouldDirty: true });
            setCreateOpen(false);
            setNewName('');
        } catch (e) {
            notify(e instanceof Error ? e.message : 'Failed to create tag', { type: 'warning' });
        }
    }, [newName, newColor, notify, selectedIds, setValue]);

    return (
        <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Autocomplete
                    multiple
                    size="small"
                    loading={loading}
                    disabled={disabled}
                    options={options}
                    value={selectedOptions}
                    onChange={onChange}
                    getOptionLabel={o => o.tagName}
                    isOptionEqualToValue={(a, b) => a.id === b.id}
                    renderTags={(value, getTagProps) =>
                        value.map((option, index) => {
                            const color = safeColor(option.tagColor);
                            return (
                                <Chip
                                    {...getTagProps({ index })}
                                    key={option.id}
                                    label={option.tagName}
                                    size="small"
                                    sx={{
                                        height: 22,
                                        fontSize: 12,
                                        ...(color
                                            ? { bgcolor: color, color: '#fff' }
                                            : { bgcolor: 'action.hover', color: 'text.primary' }),
                                    }}
                                />
                            );
                        })
                    }
                    renderInput={params => (
                        <TextField {...params} variant="standard" placeholder="Select tags…" />
                    )}
                    sx={{
                        flex: 1,
                        minWidth: 0,
                        '& .MuiAutocomplete-inputRoot': { minHeight: 36, py: '2px' },
                        '& .MuiAutocomplete-input': { py: '5px !important' },
                    }}
                />
                <IconButton
                    size="small"
                    disabled={disabled}
                    onClick={() => setCreateOpen(true)}
                    aria-label="Create tag"
                >
                    <AddIcon fontSize="small" />
                </IconButton>
            </Box>

            <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography fontWeight={700}>Create tag</Typography>
                    <IconButton size="small" onClick={() => setCreateOpen(false)}>
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ pt: 1.5, display: 'grid', gap: 2 }}>
                    <TextField
                        label="Name"
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        size="small"
                        autoFocus
                        fullWidth
                    />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <TextField
                            label="Color"
                            type="color"
                            value={newColor}
                            onChange={e => setNewColor(e.target.value)}
                            size="small"
                            sx={{ width: 140 }}
                            InputLabelProps={{ shrink: true }}
                        />
                        <Chip
                            label={newName.trim() || 'Preview'}
                            size="small"
                            sx={{ bgcolor: safeColor(newColor) ?? 'action.hover', color: '#fff', fontSize: 12, height: 22 }}
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setCreateOpen(false)} sx={{ textTransform: 'none' }}>
                        Cancel
                    </Button>
                    <Button variant="contained" onClick={() => void createTag()} sx={{ textTransform: 'none', fontWeight: 700 }}>
                        Save
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}

