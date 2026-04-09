import * as React from 'react';
import { Fade, Menu, MenuItem, Button, Avatar, Typography, Box } from '@mui/material';
import { useGetIdentity, useLogout } from 'react-admin';
import { useNavigate } from 'react-router-dom';
import { catalogDropdownMenuSlotProps } from './catalogDropdownMenuProps';

function getInitials(name?: string) {
    const s = String(name ?? '').trim();
    if (!s) return '?';
    const parts = s.split(/\s+/).filter(Boolean);
    const a = parts[0]?.[0] ?? '';
    const b = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
    return (a + b).toUpperCase() || '?';
}

/**
 * Same interaction as main app {@link ToolbarUserMenu}: profile, create admin, logout.
 */
export function AdminToolbarUserMenu() {
    const [anchor, setAnchor] = React.useState<null | HTMLElement>(null);
    const menuOpen = Boolean(anchor);
    const { identity, isPending } = useGetIdentity();
    const logout = useLogout();
    const navigate = useNavigate();

    const name = identity?.fullName?.trim() || 'Administrator';
    const initials = getInitials(identity?.fullName);

    const goProfile = () => {
        setAnchor(null);
        const id = identity?.id;
        if (id) navigate(`/admin-users/${encodeURIComponent(String(id))}`);
    };

    const goNewAdmin = () => {
        setAnchor(null);
        navigate('/admin-users/create');
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
                    maxWidth: { xs: 160, sm: 240 },
                    px: 0.75,
                    py: 0.25,
                    borderRadius: 1,
                    '&:hover': { bgcolor: 'rgba(0,0,0,0.06)' },
                }}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
            >
                <Avatar
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
                        fontWeight: 700,
                        color: '#111',
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
                <MenuItem onClick={goNewAdmin}>New admin user</MenuItem>
                <MenuItem onClick={doLogout}>Logout</MenuItem>
            </Menu>
        </>
    );
}
