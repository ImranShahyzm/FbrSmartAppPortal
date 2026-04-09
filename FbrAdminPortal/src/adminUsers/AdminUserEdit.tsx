import * as React from 'react';
import { Edit, SimpleForm, useDataProvider, useGetIdentity, useRecordContext } from 'react-admin';
import { useNavigate } from 'react-router-dom';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { Box, Divider, IconButton, Tooltip, Typography } from '@mui/material';
import { FormSaveBridge, FORM_SAVE_ADMIN_USER } from '../common/formToolbar';
import { AdminUserFormToolbar } from './AdminUserFormToolbar';
import { AdminUserMainFormBlocks, transformAdminUserUpdate } from './adminUserFormShared';

const LIST_PAGE = 10_000;

function AdminUserRecordPagination({ userId }: { userId: string | undefined }) {
    const dataProvider = useDataProvider();
    const navigate = useNavigate();
    const [ids, setIds] = React.useState<string[]>([]);
    const [total, setTotal] = React.useState(0);

    React.useEffect(() => {
        if (!userId) return;
        let cancelled = false;
        dataProvider
            .getList('admin-users', {
                pagination: { page: 1, perPage: LIST_PAGE },
                sort: { field: 'fullName', order: 'ASC' },
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
            <Tooltip title="Previous">
                <span>
                    <IconButton
                        size="small"
                        disabled={!prevId}
                        onClick={() => prevId && navigate(`/admin-users/${encodeURIComponent(prevId)}`)}
                        sx={{ p: '2px' }}
                    >
                        <NavigateBeforeIcon sx={{ fontSize: 20 }} />
                    </IconButton>
                </span>
            </Tooltip>
            <Tooltip title="Next">
                <span>
                    <IconButton
                        size="small"
                        disabled={!nextId}
                        onClick={() => nextId && navigate(`/admin-users/${encodeURIComponent(nextId)}`)}
                        sx={{ p: '2px' }}
                    >
                        <NavigateNextIcon sx={{ fontSize: 20 }} />
                    </IconButton>
                </span>
            </Tooltip>
        </Box>
    );
}

function AdminUserEditSubHeader({ selfId }: { selfId: string }) {
    const record = useRecordContext<{ id?: string; fullName?: string }>();
    const userId = record?.id != null ? String(record.id) : undefined;
    const disableDelete = Boolean(selfId && userId && selfId === userId);

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
                gap: 1,
                flexWrap: 'nowrap',
            }}
        >
            <Box sx={{ minWidth: 0, flex: '0 1 auto' }}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ fontSize: '0.85rem' }} noWrap>
                    {record?.fullName ? String(record.fullName) : userId ? `Admin user ${userId}` : 'Admin user'}
                </Typography>
            </Box>
            <Box sx={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'center' }}>
                <AdminUserRecordPagination userId={userId} />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: '0 0 auto' }}>
                <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />
                <AdminUserFormToolbar showDelete disableDelete={disableDelete} />
            </Box>
        </Box>
    );
}

export default function AdminUserEdit() {
    const { identity } = useGetIdentity();
    const selfId = identity?.id != null ? String(identity.id) : '';

    return (
        <Edit
            title="Admin user"
            mutationMode="pessimistic"
            actions={false}
            redirect={false}
            transform={transformAdminUserUpdate}
            sx={{
                width: '100%',
                maxWidth: '100%',
                '& .RaEdit-main': { maxWidth: '100%', width: '100%' },
                '& .RaEdit-card': { maxWidth: '100% !important', width: '100%', boxShadow: 'none' },
            }}
        >
            <SimpleForm
                toolbar={false}
                defaultValues={{ newPassword: '', confirmPassword: '' }}
            >
                <FormSaveBridge eventName={FORM_SAVE_ADMIN_USER} />
                <AdminUserEditSubHeader selfId={selfId} />
                <AdminUserMainFormBlocks mode="edit" />
            </SimpleForm>
        </Edit>
    );
}
