import * as React from 'react';
import { Fade, Menu, MenuItem, Button, Avatar, Typography, Box } from '@mui/material';
import { useGetIdentity, useLogout } from 'react-admin';
import { useNavigate } from 'react-router-dom';
import { getInitials } from '../users/UserProfileAvatarInput';
import { SETTINGS_USERS_LIST_PATH } from '../apps/workspacePaths';
import { catalogDropdownMenuSlotProps } from './catalogDropdownMenuProps';

/**
 * Top bar: avatar + name opens the same menu style as Catalog; Update profile → Settings `/users/:id`, Logout.
 */
export function ToolbarUserMenu() {
    const [anchor, setAnchor] = React.useState<null | HTMLElement>(null);
    const menuOpen = Boolean(anchor);
    const { identity, isPending } = useGetIdentity();
    const logout = useLogout();
    const navigate = useNavigate();
    const name = identity?.fullName?.trim() || 'User';
    const avatarUrl = typeof identity?.avatar === 'string' && identity.avatar ? identity.avatar : undefined;
    const initials = getInitials(identity?.fullName);

    const goProfile = () => {
        setAnchor(null);
        const id = identity?.id;
        if (id) navigate(`${SETTINGS_USERS_LIST_PATH}/${encodeURIComponent(String(id))}`);
    };

    const doLogout = () => {
        setAnchor(null);
        void logout();
    };

    if (isPending && !identity) {
        return (
            <Box sx={{ width: 120, height: 32, flexShrink: 0 }} aria-hidden>
                {/* reserve space */}
            </Box>
        );
    }

    return (
        <>
            <Button
                color="inherit"
                onClick={e => setAnchor(e.currentTarget)}
                sx={{
                    textTransform: 'none',
                    minWidth: 0,
                    maxWidth: { xs: 140, sm: 220 },
                    px: 0.75,
                    py: 0.25,
                    borderRadius: 1,
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
                }}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
            >
                <Avatar
                    src={avatarUrl}
                    alt=""
                    sx={{
                        width: 32,
                        height: 32,
                        mr: 1,
                        flexShrink: 0,
                        fontSize: 14,
                        fontWeight: 700,
                        bgcolor: '#2a9d8f',
                    }}
                >
                    {initials}
                </Avatar>
                <Typography
                    variant="body2"
                    sx={{
                        fontWeight: 600,
                        color: 'inherit',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        textAlign: 'left',
                    }}
                >
                    {name}
                </Typography>
            </Button>
            <Menu
                anchorEl={anchor}
                open={menuOpen}
                onClose={() => setAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                slots={{ transition: Fade }}
                transitionDuration={180}
                slotProps={catalogDropdownMenuSlotProps(menuOpen)}
            >
                <MenuItem onClick={goProfile} disabled={!identity?.id}>
                    Update profile
                </MenuItem>
                <MenuItem onClick={doLogout}>Logout</MenuItem>
            </Menu>
        </>
    );
}
