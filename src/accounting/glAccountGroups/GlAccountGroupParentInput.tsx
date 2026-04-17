import * as React from 'react';
import { useInput, type Validator } from 'react-admin';
import { Box, InputAdornment, Menu, MenuItem, TextField, Typography } from '@mui/material';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';

import { apiFetch } from '../../api/httpClient';
import { UNDERLINE_FIELD_SX } from '../../common/odooCompactFormFields';

export type GlAccountGroupParentOption = {
    id: number;
    groupName: string;
    fromCode: number;
    toCode: number;
    parentGroupId: number | null;
    depth: number;
    colorHex: string;
};

type Props = {
    source: string;
    label?: React.ReactNode;
    disabled?: boolean;
    validate?: Validator | Validator[];
    excludeId?: number | null;
};

export function GlAccountGroupParentInput(props: Props) {
    const { source, disabled, validate, excludeId } = props;
    const {
        field: { value, onChange },
        fieldState: { invalid, error },
        isRequired,
    } = useInput({ source, validate, disabled });

    const [options, setOptions] = React.useState<GlAccountGroupParentOption[]>([]);
    const [anchor, setAnchor] = React.useState<null | HTMLElement>(null);

    React.useEffect(() => {
        let cancel = false;
        (async () => {
            try {
                const qs = excludeId ? `?excludeId=${encodeURIComponent(String(excludeId))}` : '';
                const res = await apiFetch(`/api/glAccountGroups/parentOptions${qs}`, { method: 'GET' });
                if (!res.ok || cancel) return;
                const j: unknown = await res.json();
                if (!Array.isArray(j) || cancel) return;
                const rows: GlAccountGroupParentOption[] = j
                    .map((raw: unknown) => {
                        const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
                        return {
                            id: Number(o.id) || 0,
                            groupName: String(o.groupName ?? ''),
                            fromCode: Number(o.fromCode) || 0,
                            toCode: Number(o.toCode) || 0,
                            parentGroupId: o.parentGroupId != null ? Number(o.parentGroupId) : null,
                            depth: Number(o.depth) || 0,
                            colorHex: String(o.colorHex ?? '#000000'),
                        };
                    })
                    .filter(x => x.id > 0 && x.groupName.trim().length > 0);
                if (!cancel) setOptions(rows);
            } catch {
                /* ignore */
            }
        })();
        return () => {
            cancel = true;
        };
    }, [excludeId]);

    const selectedId = value != null && value !== '' ? Number(value) : null;
    const selected = selectedId != null ? options.find(o => o.id === selectedId) : null;
    const display = selected ? `${selected.groupName} (${selected.fromCode}–${selected.toCode})` : '';

    return (
        <Box sx={{ width: '100%' }}>
            <TextField
                disabled={disabled}
                variant="standard"
                fullWidth
                size="small"
                value={display || (isRequired ? 'Select parent…' : '—')}
                error={invalid}
                onClick={e => {
                    if (!disabled) setAnchor(e.currentTarget);
                }}
                slotProps={{
                    input: {
                        readOnly: true,
                        startAdornment: selected ? (
                            <InputAdornment position="start" sx={{ mr: 0.75 }}>
                                <Box
                                    sx={{
                                        width: 12,
                                        height: 12,
                                        borderRadius: '3px',
                                        bgcolor: selected.colorHex,
                                        border: '1px solid',
                                        borderColor: 'divider',
                                    }}
                                />
                            </InputAdornment>
                        ) : undefined,
                        endAdornment: (
                            <InputAdornment position="end" sx={{ mr: 0 }}>
                                <ArrowDropDownIcon sx={{ color: 'action.active', fontSize: 24 }} />
                            </InputAdornment>
                        ),
                    },
                }}
                sx={{
                    ...UNDERLINE_FIELD_SX,
                    '& .MuiInputBase-root': { cursor: disabled ? 'default' : 'pointer' },
                    '& .MuiInputBase-input': { overflow: 'hidden', textOverflow: 'ellipsis' },
                    '& .MuiInputBase-root.Mui-error:before': {
                        borderBottomColor: theme => theme.palette.error.main,
                    },
                }}
            />
            {invalid && error?.message ? (
                <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                    {String(error.message)}
                </Typography>
            ) : null}

            <Menu
                anchorEl={anchor}
                open={Boolean(anchor)}
                onClose={() => setAnchor(null)}
                slotProps={{
                    paper: {
                        sx: {
                            maxHeight: 420,
                            minWidth: 320,
                            maxWidth: 'min(100vw - 32px, 520px)',
                        },
                    },
                    list: {
                        sx: {
                            py: 0,
                        },
                    },
                }}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
            >
                <MenuItem
                    dense
                    selected={selectedId == null}
                    onClick={() => {
                        onChange(null);
                        setAnchor(null);
                    }}
                    sx={{ fontSize: 13, minHeight: 32 }}
                >
                    — No parent —
                </MenuItem>
                {options.map(o => {
                    const pad = 1.5 + o.depth * 2;
                    return (
                        <MenuItem
                            key={o.id}
                            dense
                            selected={o.id === selectedId}
                            onClick={() => {
                                onChange(o.id);
                                setAnchor(null);
                            }}
                            sx={{ pl: pad, fontSize: 13, minHeight: 32 }}
                        >
                            <Box
                                sx={{
                                    width: 10,
                                    height: 10,
                                    borderRadius: '3px',
                                    bgcolor: o.colorHex,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    mr: 1,
                                    flex: '0 0 auto',
                                }}
                            />
                            <Box sx={{ minWidth: 0 }}>
                                <Box sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {o.groupName}
                                </Box>
                                <Box sx={{ fontSize: 12, color: 'text.secondary' }}>
                                    {o.fromCode}–{o.toCode}
                                </Box>
                            </Box>
                        </MenuItem>
                    );
                })}
            </Menu>
        </Box>
    );
}

