import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
    Edit,
    SimpleForm,
    useRecordContext,
    useNotify,
    useRefresh,
    useRedirect,
    useDataProvider,
    useGetIdentity,
} from 'react-admin';
import { useFormContext } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    IconButton,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { FormSaveBridge, FORM_SAVE_USER } from '../common/formToolbar';
import { UserFormToolbar } from './UserFormToolbar';
import { apiFetch } from '../api/httpClient';
import {
    UserMainFormBlocks,
    stripEphemeralUserFields,
} from './userFormShared';

const LIST_SORT = { field: 'fullName' as const, order: 'ASC' as const };
const LIST_PAGE_SIZE = 2000;

function UserRecordPagination({ userId }: { userId: string | undefined }) {
    const dataProvider = useDataProvider();
    const navigate = useNavigate();
    const [ids, setIds] = React.useState<string[]>([]);
    const [total, setTotal] = React.useState(0);

    React.useEffect(() => {
        if (!userId) return;
        let cancelled = false;
        dataProvider
            .getList('users', {
                pagination: { page: 1, perPage: LIST_PAGE_SIZE },
                sort: LIST_SORT,
                filter: {},
            })
            .then(res => {
                if (cancelled) return;
                const rows = res.data as { id?: string }[];
                setIds(rows.map(r => String(r.id ?? '')).filter(Boolean));
                setTotal(typeof res.total === 'number' ? res.total : rows.length);
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, [dataProvider, userId]);

    if (!userId) return null;

    const idx = ids.indexOf(userId);
    const pos = idx >= 0 ? idx + 1 : '—';
    const prevId = idx > 0 ? ids[idx - 1] : null;
    const nextId = idx >= 0 && idx < ids.length - 1 ? ids[idx + 1] : null;

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, justifyContent: 'center' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12, whiteSpace: 'nowrap', mr: 0.5 }}>
                {pos} / {total || ids.length}
            </Typography>
            <Tooltip title="Previous user">
                <span>
                    <IconButton
                        size="small"
                        disabled={!prevId}
                        onClick={() => prevId && navigate(`/users/${encodeURIComponent(prevId)}`)}
                        sx={{ p: '2px' }}
                    >
                        <NavigateBeforeIcon sx={{ fontSize: 20 }} />
                    </IconButton>
                </span>
            </Tooltip>
            <Tooltip title="Next user">
                <span>
                    <IconButton
                        size="small"
                        disabled={!nextId}
                        onClick={() => nextId && navigate(`/users/${encodeURIComponent(nextId)}`)}
                        sx={{ p: '2px' }}
                    >
                        <NavigateNextIcon sx={{ fontSize: 20 }} />
                    </IconButton>
                </span>
            </Tooltip>
        </Box>
    );
}

function UserEditToolbar(props: {
    onChangePassword: () => void;
    isSelf: boolean;
}) {
    const { getValues } = useFormContext();
    const record = useRecordContext<{
        id?: string;
        username?: string;
        fullName?: string;
        email?: string | null;
        role?: string;
        isActive?: boolean;
        preferredLanguage?: string;
        timeZoneId?: string;
        onboardingEnabled?: boolean;
        emailSignature?: string | null;
        calendarDefaultPrivacy?: string;
        notificationChannel?: string;
        allowedCompanyIds?: number[];
        defaultCompanyId?: number;
        companyId?: number;
    }>();
    const notify = useNotify();
    const refresh = useRefresh();
    const redirect = useRedirect();
    const dataProvider = useDataProvider();

    const settingsItems = React.useMemo(() => {
        const rid = record?.id;
        if (!rid || !record) return undefined;

        return [
            {
                key: 'archive',
                label: 'Archive',
                disabled: props.isSelf,
                onClick: async () => {
                    if (props.isSelf) return;
                    try {
                        await dataProvider.update('users', {
                            id: rid,
                            data: { ...stripEphemeralUserFields(getValues() as Record<string, unknown>), isActive: false },
                            previousData: record as any,
                        });
                        notify('User archived', { type: 'success' });
                        refresh();
                    } catch {
                        notify('ra.notification.http_error', { type: 'error' });
                    }
                },
            },
            {
                key: 'duplicate',
                label: 'Duplicate',
                onClick: async () => {
                    try {
                        const res = await apiFetch(
                            `/api/users/${encodeURIComponent(rid)}/duplicate`,
                            {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: '{}',
                            },
                            { auth: true, retryOn401: true }
                        );
                        const j = (await res.json().catch(() => null)) as {
                            user?: { id: string };
                            initialPassword?: string;
                            message?: string;
                        };
                        if (!res.ok) {
                            notify(j?.message ?? 'Duplicate failed', { type: 'error' });
                            return;
                        }
                        const newId = j?.user?.id;
                        if (j?.initialPassword) {
                            notify(`User duplicated. Initial password: ${j.initialPassword}`, {
                                type: 'success',
                                autoHideDuration: 20000,
                            });
                        } else {
                            notify('User duplicated', { type: 'success' });
                        }
                        if (newId) redirect('edit', 'users', newId);
                        else refresh();
                    } catch {
                        notify('ra.notification.http_error', { type: 'error' });
                    }
                },
            },
            {
                key: 'delete',
                label: 'Delete',
                disabled: props.isSelf,
                onClick: async () => {
                    if (props.isSelf) return;
                    if (!window.confirm('Delete this user permanently?')) return;
                    try {
                        await dataProvider.delete('users', { id: rid, previousData: record as any });
                        notify('User deleted', { type: 'success' });
                        redirect('list', 'users');
                    } catch {
                        notify('ra.notification.http_error', { type: 'error' });
                    }
                },
            },
            {
                key: 'password',
                label: 'Change password',
                onClick: () => props.onChangePassword(),
            },
        ];
    }, [dataProvider, getValues, notify, props.isSelf, props.onChangePassword, record, redirect, refresh]);

    return <UserFormToolbar settingsItems={settingsItems} />;
}

function UserTitle() {
    const record = useRecordContext<{ fullName?: string }>();
    return <span>{record?.fullName?.trim() || 'User'}</span>;
}

function PasswordDialog(props: {
    open: boolean;
    userId: string | undefined;
    onClose: () => void;
}) {
    const [pw, setPw] = React.useState('');
    const [pw2, setPw2] = React.useState('');
    const [busy, setBusy] = React.useState(false);
    const notify = useNotify();
    const refresh = useRefresh();

    React.useEffect(() => {
        if (!props.open) {
            setPw('');
            setPw2('');
        }
    }, [props.open]);

    const submit = async () => {
        if (!props.userId) return;
        if (pw.length < 6) {
            notify('Password must be at least 6 characters.', { type: 'warning' });
            return;
        }
        if (pw !== pw2) {
            notify('Passwords do not match.', { type: 'warning' });
            return;
        }
        setBusy(true);
        try {
            const res = await apiFetch(
                `/api/users/${encodeURIComponent(props.userId)}/password`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ newPassword: pw }),
                },
                { auth: true, retryOn401: true }
            );
            if (!res.ok) {
                const j = (await res.json().catch(() => null)) as { message?: string };
                notify(j?.message ?? 'Failed to change password', { type: 'error' });
                return;
            }
            notify('Password updated', { type: 'success' });
            props.onClose();
            refresh();
        } catch {
            notify('ra.notification.http_error', { type: 'error' });
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog open={props.open} onClose={props.onClose} fullWidth maxWidth="xs">
            <DialogTitle sx={{ fontSize: '1rem', fontWeight: 700 }}>Change password</DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 1 }}>
                <TextField
                    label="New password"
                    type="password"
                    value={pw}
                    onChange={e => setPw(e.target.value)}
                    variant="standard"
                    fullWidth
                    size="small"
                    autoComplete="new-password"
                />
                <TextField
                    label="Confirm password"
                    type="password"
                    value={pw2}
                    onChange={e => setPw2(e.target.value)}
                    variant="standard"
                    fullWidth
                    size="small"
                    autoComplete="new-password"
                />
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={props.onClose} size="small" sx={{ textTransform: 'none' }}>
                    Cancel
                </Button>
                <Button variant="contained" size="small" disabled={busy} onClick={() => void submit()} sx={{ textTransform: 'none' }}>
                    Save
                </Button>
            </DialogActions>
        </Dialog>
    );
}

function UserEditFormBody() {
    const [pwOpen, setPwOpen] = React.useState(false);
    const record = useRecordContext<{ id?: string }>();
    const { identity } = useGetIdentity();
    const isSelf = Boolean(record?.id && identity?.id && String(identity.id) === String(record.id));

    return (
        <>
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
                    gap: 1,
                    flexWrap: 'nowrap',
                }}
            >
                <Box sx={{ minWidth: 0, flex: '0 1 auto' }}>
                    <Typography variant="subtitle2" fontWeight={700} noWrap sx={{ fontSize: '0.85rem' }}>
                        User
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: '0.72rem' }}>
                        All changes are saved on the server.
                    </Typography>
                </Box>

                <Box sx={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'center' }}>
                    <UserRecordPagination userId={record?.id} />
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: '0 0 auto' }}>
                    <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />
                    <UserEditToolbar onChangePassword={() => setPwOpen(true)} isSelf={isSelf} />
                </Box>
            </Box>

            <UserMainFormBlocks mode="edit" />
            <PasswordDialog open={pwOpen} userId={record?.id} onClose={() => setPwOpen(false)} />
        </>
    );
}

export default function UserEdit() {
    const queryClient = useQueryClient();
    return (
        <Edit
            title={<UserTitle />}
            actions={false}
            mutationMode="pessimistic"
            transform={(data: Record<string, unknown>) => stripEphemeralUserFields(data)}
            mutationOptions={{
                onSuccess: () => {
                    void queryClient.invalidateQueries({ queryKey: ['auth', 'getIdentity'] });
                },
            }}
            sx={{
                width: '100%',
                maxWidth: '100%',
                '& .RaEdit-main': { maxWidth: '100%', width: '100%' },
                '& .RaEdit-card': {
                    maxWidth: '100% !important',
                    width: '100%',
                    boxShadow: 'none',
                },
            }}
        >
            <SimpleForm sx={{ maxWidth: 'none', width: '100%' }} toolbar={false}>
                <FormSaveBridge eventName={FORM_SAVE_USER} />
                <UserEditFormBody />
            </SimpleForm>
        </Edit>
    );
}
