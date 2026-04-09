import * as React from 'react';
import { TopToolbar, useDataProvider, useNotify, useRedirect } from 'react-admin';
import { Box, IconButton, ListItemText, Menu, MenuItem, Tooltip, Typography } from '@mui/material';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import { useNavigate, useParams } from 'react-router-dom';

export type FormHeaderToolbarSettingsItem = {
    key: string;
    label: string;
    onClick: () => void | Promise<void>;
    disabled?: boolean;
};

export type FormHeaderToolbarProps = {
    /** Must match {@link FormSaveBridge} `eventName` on the same form */
    saveEventName: string;
    /** react-admin resource name, e.g. `customers`, `productProfiles` */
    resource: string;
    /** Router path for list view (Close button), e.g. `/customers` */
    listPath: string;
    showDelete?: boolean;
    deleteConfirmMessage?: string;
    deleteSuccessMessage?: string;
    disableSave?: boolean;
    disableDelete?: boolean;
    showSave?: boolean;
    settingsItems?: FormHeaderToolbarSettingsItem[];
};

/**
 * Odoo-style header actions: Save (cloud), optional Delete, Settings (placeholder), Close.
 * Reuse on any Create/Edit with `toolbar={false}` on the form and {@link FormSaveBridge} inside the form.
 */
export function FormHeaderToolbar({
    saveEventName,
    resource,
    listPath,
    showDelete,
    deleteConfirmMessage = 'Delete this record?',
    deleteSuccessMessage = 'Deleted',
    disableSave,
    disableDelete,
    showSave = true,
    settingsItems,
}: FormHeaderToolbarProps) {
    const navigate = useNavigate();
    const { id } = useParams();
    const dataProvider = useDataProvider();
    const notify = useNotify();
    const redirect = useRedirect();
    const [settingsAnchor, setSettingsAnchor] = React.useState<HTMLElement | null>(null);

    const onDelete = async () => {
        if (!id || !window.confirm(deleteConfirmMessage)) return;
        try {
            await dataProvider.delete(resource, {
                id,
                previousData: { id },
            });
            notify(deleteSuccessMessage, { type: 'success' });
            redirect('list', resource);
        } catch {
            notify('ra.notification.http_error', { type: 'error' });
        }
    };

    const fireSave = () => window.dispatchEvent(new Event(saveEventName));

    const hasSettings = Boolean(settingsItems && settingsItems.length > 0);
    const openSettings = (e: React.MouseEvent<HTMLElement>) => setSettingsAnchor(e.currentTarget);
    const closeSettings = () => setSettingsAnchor(null);

    return (
        <TopToolbar>
            {showSave ? (
                <Tooltip title={disableSave ? 'Posted to FBR — read only' : 'Save'}>
                    <span>
                        <IconButton
                            size="small"
                            onClick={fireSave}
                            disabled={disableSave}
                            sx={{ color: 'text.primary' }}
                        >
                            <CloudUploadOutlinedIcon sx={{ fontSize: 22 }} />
                        </IconButton>
                    </span>
                </Tooltip>
            ) : null}
            {showDelete ? (
                <Tooltip title={disableDelete ? 'Cannot delete posted invoice' : 'Delete'}>
                    <span>
                        <IconButton
                            size="small"
                            onClick={onDelete}
                            disabled={disableDelete}
                            sx={{ color: 'error.main' }}
                        >
                            <DeleteOutlineOutlinedIcon sx={{ fontSize: 22 }} />
                        </IconButton>
                    </span>
                </Tooltip>
            ) : null}
            <Tooltip title="Settings">
                <span>
                    <IconButton
                        size="small"
                        sx={{ color: 'text.primary' }}
                        onClick={hasSettings ? openSettings : undefined}
                        disabled={!hasSettings}
                    >
                        <SettingsOutlinedIcon sx={{ fontSize: 22 }} />
                    </IconButton>
                </span>
            </Tooltip>
            <Menu
                anchorEl={settingsAnchor}
                open={Boolean(settingsAnchor)}
                onClose={closeSettings}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                MenuListProps={{ dense: true, sx: { py: 0 } }}
                PaperProps={{
                    sx: {
                        mt: 0.5,
                        minWidth: 220,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        boxShadow: '0 10px 24px rgba(0,0,0,0.12)',
                    },
                }}
            >
                <Box sx={{ px: 2, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="caption" color="text.secondary">
                        Settings
                    </Typography>
                </Box>
                {(settingsItems ?? []).map(it => (
                    <MenuItem
                        key={it.key}
                        onClick={async () => {
                            closeSettings();
                            await it.onClick();
                        }}
                        disabled={it.disabled}
                        sx={{ py: 1, px: 2 }}
                    >
                        <ListItemText
                            primary={it.label}
                            primaryTypographyProps={{ fontSize: 14, fontWeight: 600 }}
                        />
                    </MenuItem>
                ))}
            </Menu>
            <Tooltip title="Close">
                <IconButton
                    size="small"
                    onClick={() => navigate(listPath)}
                    sx={{ color: 'text.primary' }}
                >
                    <CloseOutlinedIcon sx={{ fontSize: 22 }} />
                </IconButton>
            </Tooltip>
        </TopToolbar>
    );
}
