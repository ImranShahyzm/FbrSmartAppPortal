import * as React from 'react';
import {
    Autocomplete,
    Box,
    Button,
    Checkbox,
    Chip,
    CircularProgress,
    Divider,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from '@mui/material';
import { Title, useNotify } from 'react-admin';
import { Link } from 'react-router-dom';

import type { CatalogModelOption } from './permissionCatalogApi';
import {
    deleteRecordRuleModelFieldSettings,
    fetchRecordRuleModelFieldSettings,
    fetchRecordRuleTableModels,
    mapTableModelsToCatalogOptions,
    saveRecordRuleModelFieldSettings,
    type RecordRuleModelFieldSettingRow,
} from './recordRuleMetadataApi';
import { SETTINGS_SECURITY_GROUPS_LIST_PATH } from '../apps/workspacePaths';

const ACCENT = '#6B4F67';
const BRAND = '#017E84';

function sectionHeaderBarSx() {
    return {
        bgcolor: 'rgba(107, 79, 103, 0.1)',
        borderLeft: '4px solid',
        borderColor: ACCENT,
        px: 2,
        py: 1.25,
    } as const;
}

/**
 * Configure which table columns appear when building security group record rules.
 * Model list is limited to entities that map to a real database table (server-side).
 */
export function RecordRuleFieldSettings() {
    const notify = useNotify();
    const [modelOptions, setModelOptions] = React.useState<CatalogModelOption[]>([]);
    const [selectedModel, setSelectedModel] = React.useState<CatalogModelOption | null>(null);
    const [rows, setRows] = React.useState<RecordRuleModelFieldSettingRow[]>([]);
    const [loadingCatalog, setLoadingCatalog] = React.useState(true);
    const [loadingFields, setLoadingFields] = React.useState(false);
    const [saving, setSaving] = React.useState(false);

    React.useEffect(() => {
        let cancelled = false;
        fetchRecordRuleTableModels()
            .then(tableModels => {
                if (!cancelled) setModelOptions(mapTableModelsToCatalogOptions(tableModels));
            })
            .catch(() => {
                if (!cancelled) setModelOptions([]);
            })
            .finally(() => {
                if (!cancelled) setLoadingCatalog(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const loadFields = React.useCallback(
        async (opt: CatalogModelOption) => {
            setLoadingFields(true);
            try {
                const data = await fetchRecordRuleModelFieldSettings(opt.permissionsPrefix, opt.modelKey);
                setRows(data.fields);
            } catch (e) {
                setRows([]);
                notify(e instanceof Error ? e.message : 'Could not load field settings', { type: 'error' });
            } finally {
                setLoadingFields(false);
            }
        },
        [notify]
    );

    React.useEffect(() => {
        if (!selectedModel) {
            setRows([]);
            return;
        }
        void loadFields(selectedModel);
    }, [selectedModel, loadFields]);

    const patchEnabled = (name: string, enabled: boolean) => {
        setRows(prev => prev.map(r => (r.name === name ? { ...r, enabled } : r)));
    };

    const enableSuggestedOnly = () => {
        setRows(prev => prev.map(r => ({ ...r, enabled: r.suggestedDefault })));
    };

    const clearAll = () => {
        setRows(prev => prev.map(r => ({ ...r, enabled: false })));
    };

    const onSave = async () => {
        if (!selectedModel) return;
        setSaving(true);
        try {
            await saveRecordRuleModelFieldSettings(selectedModel.permissionsPrefix, selectedModel.modelKey, rows);
            notify('Record rule fields saved', { type: 'success' });
            await loadFields(selectedModel);
        } catch (e) {
            notify(e instanceof Error ? e.message : 'Save failed', { type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const onClearCustomConfig = async () => {
        if (!selectedModel) return;
        setSaving(true);
        try {
            await deleteRecordRuleModelFieldSettings(selectedModel.permissionsPrefix, selectedModel.modelKey);
            notify('Cleared custom field list. Default suggestions apply until you save again.', { type: 'info' });
            await loadFields(selectedModel);
        } catch (e) {
            notify(e instanceof Error ? e.message : 'Reset failed', { type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Box
            sx={{
                minHeight: '100%',
                bgcolor: theme => (theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50'),
                pb: 4,
            }}
        >
            <Box sx={{ maxWidth: 1100, mx: 'auto', px: { xs: 1.5, sm: 3 }, pt: 2.5 }}>
                <Title title="Record rule fields" />
                <Typography
                    variant="h5"
                    component="h1"
                    sx={{ fontWeight: 700, color: 'text.primary', letterSpacing: '-0.02em', mb: 0.5 }}
                >
                    Record rule fields
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, maxWidth: 720, lineHeight: 1.65 }}>
                    Pick a database-backed model, then choose which columns appear in{' '}
                    <Link to={SETTINGS_SECURITY_GROUPS_LIST_PATH}>security group record rules</Link>. Until you save for a
                    model, a short default list is used (company, status, foreign keys). After saving, only checked columns
                    are offered.
                </Typography>

                <Paper
                    elevation={0}
                    sx={{
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        overflow: 'hidden',
                        mb: 2,
                    }}
                >
                    <Box sx={sectionHeaderBarSx()}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: ACCENT, letterSpacing: '0.02em' }}>
                            Model
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25 }}>
                            Only models with a real table and record-rule support are listed (configured on the server).
                        </Typography>
                    </Box>
                    <Divider />
                    <Stack spacing={2} sx={{ p: 2 }}>
                        <Autocomplete
                            fullWidth
                            loading={loadingCatalog}
                            options={modelOptions}
                            value={selectedModel}
                            onChange={(_, v) => setSelectedModel(v)}
                            getOptionLabel={o => o.label}
                            isOptionEqualToValue={(a, b) => a.optionKey === b.optionKey}
                            renderInput={params => (
                                <TextField
                                    {...params}
                                    label="Database model"
                                    placeholder="Search…"
                                    variant="outlined"
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: 1.5,
                                            bgcolor: 'background.paper',
                                        },
                                    }}
                                />
                            )}
                        />
                        <Stack direction="row" flexWrap="wrap" gap={1} alignItems="center">
                            <Button
                                size="medium"
                                variant="outlined"
                                color="inherit"
                                disabled={!rows.length || loadingFields}
                                onClick={enableSuggestedOnly}
                                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                            >
                                Use suggested defaults
                            </Button>
                            <Button
                                size="medium"
                                variant="outlined"
                                color="inherit"
                                disabled={!rows.length || loadingFields}
                                onClick={clearAll}
                                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                            >
                                Clear all
                            </Button>
                            <Button
                                size="medium"
                                variant="outlined"
                                color="warning"
                                disabled={!selectedModel || saving || loadingFields}
                                onClick={() => void onClearCustomConfig()}
                                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                            >
                                Clear custom config
                            </Button>
                            <Box sx={{ flex: 1, minWidth: 8 }} />
                            <Button
                                size="medium"
                                variant="contained"
                                disabled={!selectedModel || saving || loadingFields}
                                onClick={() => void onSave()}
                                sx={{
                                    borderRadius: 2,
                                    textTransform: 'none',
                                    fontWeight: 700,
                                    px: 3,
                                    bgcolor: BRAND,
                                    '&:hover': { bgcolor: '#016a6f' },
                                }}
                            >
                                {saving ? 'Saving…' : 'Save'}
                            </Button>
                        </Stack>
                    </Stack>
                </Paper>

                <Paper
                    elevation={0}
                    sx={{
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        overflow: 'hidden',
                    }}
                >
                    <Box sx={sectionHeaderBarSx()}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: ACCENT, letterSpacing: '0.02em' }}>
                            Field visibility
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25 }}>
                            Toggle which columns appear in the record rule field dropdown.
                        </Typography>
                    </Box>
                    <Divider />
                    <Box sx={{ p: 2 }}>
                        {!selectedModel ? (
                            <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                                Select a model above to load its fields.
                            </Typography>
                        ) : loadingFields ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 4, justifyContent: 'center' }}>
                                <CircularProgress size={24} sx={{ color: ACCENT }} />
                                <Typography variant="body2" color="text.secondary">
                                    Loading fields…
                                </Typography>
                            </Box>
                        ) : rows.length === 0 ? (
                            <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                                No ruleable fields for this model.
                            </Typography>
                        ) : (
                            <TableContainer sx={{ borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                                <Table size="small" stickyHeader>
                                    <TableHead>
                                        <TableRow sx={{ '& th': { bgcolor: 'grey.100', fontWeight: 700 } }}>
                                            <TableCell padding="checkbox" sx={{ width: 52 }}>
                                                Use
                                            </TableCell>
                                            <TableCell>Field</TableCell>
                                            <TableCell width={100}>Kind</TableCell>
                                            <TableCell width={160}>Hint</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {rows.map(r => (
                                            <TableRow key={r.name} hover sx={{ '&:nth-of-type(even)': { bgcolor: 'action.hover' } }}>
                                                <TableCell padding="checkbox">
                                                    <Checkbox
                                                        checked={r.enabled}
                                                        onChange={e => patchEnabled(r.name, e.target.checked)}
                                                        size="small"
                                                        sx={{ color: ACCENT, '&.Mui-checked': { color: BRAND } }}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Typography
                                                        variant="body2"
                                                        sx={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}
                                                    >
                                                        {r.name}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip size="small" label={r.valueKind} variant="outlined" sx={{ fontWeight: 500 }} />
                                                </TableCell>
                                                <TableCell>
                                                    {r.suggestedDefault ? (
                                                        <Chip
                                                            size="small"
                                                            label="Suggested default"
                                                            sx={{ bgcolor: 'rgba(107, 79, 103, 0.12)', color: ACCENT, fontWeight: 600 }}
                                                        />
                                                    ) : (
                                                        <Typography variant="caption" color="text.secondary">
                                                            —
                                                        </Typography>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </Box>
                </Paper>

                <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 2, display: 'block', px: 0.5 }}>
                    Suggested defaults include company, status, “Returned”, and columns ending in <code>Id</code> (foreign
                    keys). Add <code>[RecordRuleEntity]</code> on new entities to expose them here automatically.
                </Typography>
            </Box>
        </Box>
    );
}

export default RecordRuleFieldSettings;
