import * as React from 'react';
import {
    Create,
    CreateButton,
    DataTable,
    Edit,
    List,
    ColumnsButton,
    TopToolbar,
    NumberInput,
    required,
    SimpleForm,
    TextInput,
    useTranslate,
    useListContext,
    useStore,
    useDefaultTitle,
    PrevNextButtons,
    FunctionField,
} from 'react-admin';
import { useWatch } from 'react-hook-form';
import {
    Box,
    Card,
    CardContent,
    Divider,
    Grid,
    IconButton,
    InputBase,
    Paper,
    Tooltip,
    Typography,
} from '@mui/material';
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewKanbanOutlinedIcon from '@mui/icons-material/ViewKanbanOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import ShowChartOutlinedIcon from '@mui/icons-material/ShowChartOutlined';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import CloseIcon from '@mui/icons-material/Close';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';

import {
    FormHeaderToolbar,
    FormSaveBridge,
    FORM_SAVE_FBR_SCENARIO,
} from '../common/formToolbar';
import { useOdooListSearchQ } from '../common/useOdooListSearchQ';

const NAV_TEAL = '#3d7a7a';
const NAV_TEAL_DARK = '#2e6262';

const SCENARIO_COLUMNS_STORE_KEY = 'fbrScenarios.columns';
const SCENARIO_COLUMNS_BUTTON_ID = 'fbrScenarios.columnsButton';

const FIELD_LABEL_SX = {
    fontWeight: 700,
    fontSize: '0.8rem',
    color: '#212529',
    minWidth: 140,
    lineHeight: '30px',
};

const FIELD_VALUE_SX = {
    fontSize: '0.8rem',
    color: '#212529',
    lineHeight: '30px',
};

const UNDERLINE_FIELD_SX = {
    mb: 0,
    '& .MuiFormHelperText-root': { display: 'none' },
    '& .MuiInputBase-root': { fontSize: '0.8rem', minHeight: 30 },
    '& .MuiInputBase-input': { py: '5px' },
    '& .MuiInputLabel-root': { display: 'none' },
};

const MULTILINE_COMPACT_SX = {
    '& .MuiInputBase-root': { minHeight: 'auto', alignItems: 'flex-start' },
    '& .MuiInputBase-input': { py: '6px' },
};

const CompactTextInput = (props: React.ComponentProps<typeof TextInput>) => (
    <TextInput
        {...props}
        variant="standard"
        margin="none"
        size="small"
        sx={{
            ...UNDERLINE_FIELD_SX,
            ...(props.sx as object),
        }}
    />
);

const CompactNumberInput = (props: React.ComponentProps<typeof NumberInput>) => (
    <NumberInput
        {...props}
        variant="standard"
        margin="none"
        size="small"
        sx={{
            ...UNDERLINE_FIELD_SX,
            ...(props.sx as object),
        }}
    />
);

function ScenarioListActions() {
    const { page, perPage, total, setPage } = useListContext();
    const [q, setQ] = useOdooListSearchQ();
    const [view, setView] = useStore<'list' | 'kanban' | 'calendar' | 'pivot' | 'graph' | 'activity'>(
        'fbrScenarios.listView',
        'list'
    );

    const pageStart = total ? (page - 1) * perPage + 1 : 0;
    const pageEnd = total ? Math.min(page * perPage, total) : 0;

    const viewButtons: {
        key: 'list' | 'kanban' | 'calendar' | 'pivot' | 'graph' | 'activity';
        icon: React.ReactNode;
        label: string;
        disabled?: boolean;
    }[] = [
        { key: 'list', icon: <ViewListIcon fontSize="small" />, label: 'List' },
        { key: 'kanban', icon: <ViewKanbanOutlinedIcon fontSize="small" />, label: 'Kanban', disabled: true },
        { key: 'calendar', icon: <CalendarMonthOutlinedIcon fontSize="small" />, label: 'Calendar', disabled: true },
        { key: 'pivot', icon: <TableChartOutlinedIcon fontSize="small" />, label: 'Pivot', disabled: true },
        { key: 'graph', icon: <ShowChartOutlinedIcon fontSize="small" />, label: 'Graph', disabled: true },
        { key: 'activity', icon: <AccessTimeIcon fontSize="small" />, label: 'Activity', disabled: true },
    ];

    return (
        <TopToolbar
            sx={{
                width: '100%',
                p: 0,
                minHeight: 'unset',
                flexDirection: 'column',
                pt: 0,
            }}
        >
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
                    <CreateButton
                        label="New"
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
                    />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 0.5, position: 'relative' }}>
                        <Typography variant="body1" sx={{ fontWeight: 700, fontSize: 15, color: 'text.primary' }}>
                            FBR Scenarios
                        </Typography>
                        <IconButton
                            size="small"
                            sx={{ color: 'text.secondary', p: '2px' }}
                            onClick={() => {
                                const el = document.getElementById(SCENARIO_COLUMNS_BUTTON_ID) as HTMLButtonElement | null;
                                el?.click();
                            }}
                        >
                            <SettingsOutlinedIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                        <Box
                            sx={{
                                position: 'absolute',
                                width: 1,
                                height: 1,
                                overflow: 'hidden',
                                clip: 'rect(0 0 0 0)',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            <ColumnsButton
                                id={SCENARIO_COLUMNS_BUTTON_ID}
                                storeKey={SCENARIO_COLUMNS_STORE_KEY}
                                sx={{ minWidth: 0, px: '6px' }}
                            />
                        </Box>
                    </Box>
                </Box>

                <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                    <Paper
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
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                px: 1,
                                py: '5px',
                                bgcolor: '#eef6f6',
                                borderRight: '1px solid #e0e0e0',
                                cursor: 'pointer',
                                '&:hover': { bgcolor: '#d9eeee' },
                            }}
                        >
                            <FilterListIcon sx={{ fontSize: 18, color: NAV_TEAL }} />
                        </Box>
                        <InputBase
                            value={q}
                            onChange={e => setQ(e.target.value)}
                            placeholder="Search..."
                            sx={{ flex: 1, fontSize: 13, px: 1, py: '4px' }}
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
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                borderLeft: '1px solid #e0e0e0',
                                pl: 0.25,
                                cursor: 'pointer',
                                '&:hover': { color: NAV_TEAL },
                            }}
                        >
                            <ArrowDropDownIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                        </Box>
                    </Paper>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: '0 0 auto' }}>
                    {total != null && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                                {pageStart}–{pageEnd} / {total}
                            </Typography>
                            <IconButton size="small" disabled={page <= 1} onClick={() => setPage(page - 1)} sx={{ p: '2px' }}>
                                <NavigateBeforeIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                            <IconButton
                                size="small"
                                disabled={pageEnd >= (total ?? 0)}
                                onClick={() => setPage(page + 1)}
                                sx={{ p: '2px' }}
                            >
                                <NavigateNextIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                        </Box>
                    )}
                    <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 0.5 }} />
                    {viewButtons.map(({ key, icon, label, disabled }) => (
                        <Tooltip key={key} title={label}>
                            <span>
                                <IconButton
                                    size="small"
                                    disabled={Boolean(disabled)}
                                    onClick={() => !disabled && setView(key)}
                                    sx={{
                                        p: '5px',
                                        borderRadius: '4px',
                                        bgcolor: view === key ? '#e0f2f1' : 'transparent',
                                        color: view === key ? NAV_TEAL : 'text.secondary',
                                        border: view === key ? `1px solid ${NAV_TEAL}55` : '1px solid transparent',
                                        '&:hover': { bgcolor: disabled ? undefined : '#eef6f6' },
                                    }}
                                >
                                    {icon}
                                </IconButton>
                            </span>
                        </Tooltip>
                    ))}
                </Box>
            </Box>
        </TopToolbar>
    );
}

const ScenarioListTitle = () => {
    const title = useDefaultTitle();
    const { defaultTitle } = useListContext();
    return (
        <>
            <title>{`${title} - ${defaultTitle}`}</title>
            <span>{defaultTitle}</span>
        </>
    );
};

function mergeScenarioPatch(
    base: Record<string, unknown>,
    patch: Record<string, unknown>
): Record<string, unknown> {
    const out = { ...base };
    for (const [k, v] of Object.entries(patch)) {
        if (v !== undefined) out[k] = v;
    }
    return out;
}

const scenarioFormTransform = (
    data: Record<string, unknown>,
    options?: { previousData?: Record<string, unknown> }
) => {
    const prev = options?.previousData as Record<string, unknown> | undefined;
    const merged = mergeScenarioPatch({ ...prev }, data);

    delete merged.id;
    delete merged.companyId;

    const pdi = merged.fbrPdiTransTypeId;
    if (pdi === '' || pdi === null || pdi === undefined) merged.fbrPdiTransTypeId = null;
    else merged.fbrPdiTransTypeId = Number(pdi);

    return {
        scenarioCode: String(merged.scenarioCode ?? '').trim(),
        description: String(merged.description ?? '').trim(),
        fbrPdiTransTypeId: merged.fbrPdiTransTypeId as number | null,
    };
};

function ScenarioDocHeading({ isCreate }: { isCreate: boolean }) {
    const translate = useTranslate();
    const code = useWatch({ name: 'scenarioCode' }) as string | undefined;
    return (
        <Box sx={{ mb: 2 }}>
            <Typography variant="overline" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                {translate('resources.fbrScenarios.document', { _: 'Scenario' })}
            </Typography>
            <Typography variant="h5" fontWeight={700} sx={{ lineHeight: 1.2, fontSize: '1.25rem' }}>
                {isCreate
                    ? translate('resources.fbrScenarios.new_title', { _: 'New scenario' })
                    : code?.trim() || '—'}
            </Typography>
        </Box>
    );
}

function ScenarioSubHeader({ isCreate }: { isCreate: boolean }) {
    const translate = useTranslate();
    const code = useWatch({ name: 'scenarioCode' }) as string | undefined;

    return (
        <Box
            sx={{
                position: { md: 'sticky' },
                top: { md: 0 },
                zIndex: 5,
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                px: 2,
                py: '6px',
                mb: 1.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 2,
                flexWrap: 'wrap',
            }}
        >
            <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle2" fontWeight={700} noWrap sx={{ fontSize: '0.85rem' }}>
                    {isCreate
                        ? translate('resources.fbrScenarios.header_create', { _: 'Scenario' })
                        : `${translate('resources.fbrScenarios.document', { _: 'Scenario' })} ${code?.trim() || ''}`}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: '0.72rem' }}>
                    {translate('resources.fbrScenarios.subheader_hint', {
                        _: 'All changes are saved on the server.',
                    })}
                </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                {!isCreate ? (
                    <PrevNextButtons
                        resource="fbrScenarios"
                        filterDefaultValues={{}}
                        sort={{ field: 'scenarioCode', order: 'ASC' }}
                    />
                ) : null}
                <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />
                <FormHeaderToolbar
                    saveEventName={FORM_SAVE_FBR_SCENARIO}
                    resource="fbrScenarios"
                    listPath="/fbrScenarios"
                    showDelete={!isCreate}
                    deleteConfirmMessage="Delete this scenario?"
                    deleteSuccessMessage="Scenario deleted"
                />
            </Box>
        </Box>
    );
}

function ScenarioFormMainFields({ isCreate }: { isCreate: boolean }) {
    const translate = useTranslate();

    return (
        <Card
            variant="outlined"
            sx={{
                mt: isCreate ? 0 : 1,
                borderColor: '#dee2e6',
                borderRadius: '4px',
                boxShadow: 'none',
            }}
        >
            <CardContent sx={{ p: '16px 20px !important' }}>
                <ScenarioDocHeading isCreate={isCreate} />

                <Grid container columnSpacing={4} rowSpacing={0}>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                minHeight: 34,
                                mb: '4px',
                            }}
                        >
                            <Typography sx={{ ...FIELD_LABEL_SX }}>
                                {translate('resources.fbrScenarios.fields.scenario_code', {
                                    _: 'Scenario code',
                                })}
                            </Typography>
                            <Box sx={{ flex: 1 }}>
                                <CompactTextInput
                                    source="scenarioCode"
                                    label={false}
                                    validate={required()}
                                    fullWidth
                                />
                            </Box>
                        </Box>
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                minHeight: 34,
                                mb: '4px',
                            }}
                        >
                            <Typography sx={{ ...FIELD_LABEL_SX, pt: '4px' }}>
                                {translate('resources.fbrScenarios.fields.description', {
                                    _: 'Description',
                                })}
                            </Typography>
                            <Box sx={{ flex: 1 }}>
                                <CompactTextInput
                                    source="description"
                                    label={false}
                                    validate={required()}
                                    fullWidth
                                    multiline
                                    minRows={2}
                                    sx={MULTILINE_COMPACT_SX}
                                />
                            </Box>
                        </Box>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                minHeight: 34,
                                mb: '4px',
                            }}
                        >
                            <Typography sx={{ ...FIELD_LABEL_SX }}>
                                {translate('resources.fbrScenarios.fields.pdi_trans_type_id', {
                                    _: 'PDI transaction type id',
                                })}
                            </Typography>
                            <Box sx={{ flex: 1 }}>
                                <CompactNumberInput
                                    source="fbrPdiTransTypeId"
                                    label={false}
                                    fullWidth
                                    format={v =>
                                        v === '' || v === null || v === undefined ? '' : Number(v)
                                    }
                                    parse={v => {
                                        if (v === '' || v === null || v === undefined) return null;
                                        const n = Number(v);
                                        return Number.isFinite(n) ? n : null;
                                    }}
                                />
                            </Box>
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem', display: 'block' }}>
                            Optional. Links this scenario to an FBR PDI transaction type when set.
                        </Typography>
                    </Grid>
                </Grid>
            </CardContent>
        </Card>
    );
}

function ScenarioFormLayout({ isCreate }: { isCreate: boolean }) {
    return (
        <Box sx={{ width: '100%', maxWidth: '100%' }}>
            <ScenarioSubHeader isCreate={isCreate} />
            <ScenarioFormMainFields isCreate={isCreate} />
        </Box>
    );
}

const Column = DataTable.Col;

export function FbrScenarioList() {
    const [view] = useStore<'list' | 'kanban'>('fbrScenarios.listView', 'list');

    return (
        <List
            resource="fbrScenarios"
            perPage={25}
            sort={{ field: 'scenarioCode', order: 'ASC' }}
            actions={<ScenarioListActions />}
            title={<ScenarioListTitle />}
            exporter={false}
        >
            {view === 'kanban' ? (
                <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                    Kanban is not available for scenarios.
                </Typography>
            ) : (
                <DataTable rowClick="edit" storeKey={SCENARIO_COLUMNS_STORE_KEY}>
                    <Column source="scenarioCode" label="Scenario" />
                    <Column source="description" label="Description" />
                    <Column source="fbrPdiTransTypeId" label="PDI type id" disableSort>
                        <FunctionField
                            label=""
                            render={(r: { fbrPdiTransTypeId?: number | null }) =>
                                r?.fbrPdiTransTypeId != null ? String(r.fbrPdiTransTypeId) : '—'
                            }
                        />
                    </Column>
                </DataTable>
            )}
        </List>
    );
}

const createPageSx = {
    width: '100%',
    maxWidth: '100%',
    '& .RaCreate-main': { maxWidth: '100%', width: '100%' },
    '& .RaCreate-card': {
        maxWidth: '100% !important',
        width: '100%',
        boxShadow: 'none',
    },
};

const editPageSx = {
    width: '100%',
    maxWidth: '100%',
    '& .RaEdit-main': { maxWidth: '100%', width: '100%' },
    '& .RaEdit-card': {
        maxWidth: '100% !important',
        width: '100%',
        boxShadow: 'none',
    },
};

export function FbrScenarioEdit() {
    return (
        <Edit
            resource="fbrScenarios"
            actions={false}
            mutationMode="pessimistic"
            title="Scenario"
            transform={scenarioFormTransform}
            sx={editPageSx}
        >
            <SimpleForm sx={{ maxWidth: 'none', width: '100%' }} toolbar={false}>
                <FormSaveBridge eventName={FORM_SAVE_FBR_SCENARIO} />
                <ScenarioFormLayout isCreate={false} />
            </SimpleForm>
        </Edit>
    );
}

export function FbrScenarioCreate() {
    return (
        <Create
            resource="fbrScenarios"
            title="Scenario"
            transform={scenarioFormTransform}
            redirect="edit"
            actions={false}
            sx={createPageSx}
        >
            <SimpleForm sx={{ maxWidth: 'none', width: '100%' }} toolbar={false} defaultValues={{ description: '' }}>
                <FormSaveBridge eventName={FORM_SAVE_FBR_SCENARIO} />
                <ScenarioFormLayout isCreate />
            </SimpleForm>
        </Create>
    );
}
