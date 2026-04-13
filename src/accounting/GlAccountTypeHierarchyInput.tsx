import * as React from 'react';
import { useInput, type Validator } from 'react-admin';
import { Box, InputAdornment, Menu, TextField, Typography } from '@mui/material';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { apiFetch } from '../api/httpClient';
import { UNDERLINE_FIELD_SX } from '../common/odooCompactFormFields';
import {
    type GlAccountTypeRow,
    renderHierarchicalTypeItems,
} from './glAccountTypeHierarchyMenu';

type Props = {
    source: string;
    label?: React.ReactNode;
    disabled?: boolean;
    validate?: Validator | Validator[];
};

/**
 * Hierarchical account type picker — standard underline field + solid dropdown arrow (matches Companies autocomplete).
 */
export function GlAccountTypeHierarchyInput(props: Props) {
    const { source, disabled, validate } = props;
    const {
        field: { value, onChange },
        fieldState: { invalid, error },
        isRequired,
    } = useInput({ source, validate, disabled });

    const [types, setTypes] = React.useState<GlAccountTypeRow[]>([]);
    const [anchor, setAnchor] = React.useState<null | HTMLElement>(null);

    React.useEffect(() => {
        let cancel = false;
        (async () => {
            try {
                const res = await apiFetch('/api/glAccountTypes', { method: 'GET' });
                if (!res.ok || cancel) return;
                const j: unknown = await res.json();
                if (!Array.isArray(j) || cancel) return;
                const rows: GlAccountTypeRow[] = j.map((raw: unknown) => {
                    const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
                    return {
                        id: Number(o.id) || 0,
                        title: o.title != null ? String(o.title) : null,
                        mainParent: o.mainParent != null ? Number(o.mainParent) : null,
                        orderBy: o.orderBy != null ? Number(o.orderBy) : null,
                        selectable: Boolean(o.selectable),
                    };
                });
                if (!cancel) setTypes(rows.filter(t => t.id > 0));
            } catch {
                /* ignore */
            }
        })();
        return () => {
            cancel = true;
        };
    }, []);

    const selectedId = value != null && value !== '' ? Number(value) : null;
    const display =
        selectedId != null && !Number.isNaN(selectedId)
            ? types.find(t => t.id === selectedId)?.title ?? '—'
            : '';

    const menuItems = React.useMemo(
        () =>
            renderHierarchicalTypeItems(types, null, 0, selectedId, id => {
                onChange(id);
                setAnchor(null);
            }),
        [types, selectedId, onChange]
    );

    return (
        <Box sx={{ width: '100%' }}>
            <TextField
                disabled={disabled}
                variant="standard"
                fullWidth
                size="small"
                value={display || (isRequired ? 'Select type…' : '—')}
                error={invalid}
                onClick={e => {
                    if (!disabled) setAnchor(e.currentTarget);
                }}
                slotProps={{
                    input: {
                        readOnly: true,
                        endAdornment: (
                            <InputAdornment position="end" sx={{ mr: 0 }}>
                                <ArrowDropDownIcon sx={{ color: 'action.active', fontSize: 24 }} />
                            </InputAdornment>
                        ),
                    },
                }}
                sx={{
                    ...UNDERLINE_FIELD_SX,
                    '& .MuiInputBase-root': {
                        cursor: disabled ? 'default' : 'pointer',
                    },
                    '& .MuiInputBase-input': {
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                    },
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
                            minWidth: 280,
                            maxWidth: 'min(100vw - 32px, 400px)',
                        },
                    },
                    list: {
                        sx: {
                            py: 0,
                            '& .MuiListSubheader-root': { mt: 0 },
                        },
                    },
                }}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
            >
                {menuItems.length > 0 ? menuItems : null}
            </Menu>
        </Box>
    );
}
