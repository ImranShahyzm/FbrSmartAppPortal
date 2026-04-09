import * as React from 'react';
import { AppBar, Layout, LayoutProps, LoadingIndicator, SidebarProps, TitlePortal, ToggleThemeButton } from 'react-admin';
import { Box, Button } from '@mui/material';
import { Link, useLocation } from 'react-router-dom';
import { AdminToolbarUserMenu } from './AdminToolbarUserMenu';

/** Teal chrome aligned with main app Odoo / User list (`UserList.tsx`). */
const NAV_TEAL = '#3d7a7a';

/** Sidebar drawer hidden; module links live in the app bar (Odoo-style top nav). */
function HiddenSidebar(props: SidebarProps) {
    return (
        <Box
            component="aside"
            sx={{
                width: 0,
                minWidth: 0,
                overflow: 'hidden',
                flexShrink: 0,
                visibility: 'hidden',
                pointerEvents: 'none',
                '& .RaMenu-root': { display: 'none' },
            }}
            aria-hidden
        >
            {props.children}
        </Box>
    );
}

const navBtnSx = {
    textTransform: 'none' as const,
    fontWeight: 600,
    fontSize: 13,
    minWidth: 'auto',
    px: 1,
    whiteSpace: 'nowrap' as const,
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    color: '#111',
};

function AdminAppBar() {
    const location = useLocation();
    const path = location.pathname;
    const isDashboard = path === '/' || path === '';
    const isCompanies = path.startsWith('/companies');
    const isAdminUsers = path.startsWith('/admin-users');

    return (
        <AppBar
            color="inherit"
            elevation={0}
            toolbar={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, flexShrink: 0 }}>
                    <ToggleThemeButton />
                    <LoadingIndicator />
                    <AdminToolbarUserMenu />
                </Box>
            }
            sx={{
                bgcolor: NAV_TEAL,
                color: '#111',
                boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                borderBottom: '1px solid rgba(0,0,0,0.06)',
                '& .RaAppBar-menuButton': { display: 'none !important' },
                '& .MuiIconButton-root': { color: '#111' },
            }}
        >
            <TitlePortal />
            <Box
                sx={{
                    flex: 1,
                    minWidth: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.25,
                    ml: { xs: 0.5, sm: 1 },
                    overflowX: 'auto',
                    py: 0.25,
                    '&::-webkit-scrollbar': { height: 4 },
                }}
            >
                <Button
                    component={Link}
                    to="/"
                    color="inherit"
                    size="small"
                    sx={{
                        ...navBtnSx,
                        fontWeight: isDashboard ? 800 : 600,
                        borderBottom: isDashboard ? '2px solid' : '2px solid transparent',
                        borderColor: isDashboard ? '#111' : 'transparent',
                        borderRadius: 0,
                    }}
                >
                    Dashboard
                </Button>
                <Button
                    component={Link}
                    to="/companies"
                    color="inherit"
                    size="small"
                    sx={{
                        ...navBtnSx,
                        fontWeight: isCompanies ? 800 : 600,
                        borderBottom: isCompanies ? '2px solid' : '2px solid transparent',
                        borderColor: isCompanies ? '#111' : 'transparent',
                        borderRadius: 0,
                    }}
                >
                    Companies
                </Button>
                <Button
                    component={Link}
                    to="/admin-users"
                    color="inherit"
                    size="small"
                    sx={{
                        ...navBtnSx,
                        fontWeight: isAdminUsers ? 800 : 600,
                        borderBottom: isAdminUsers ? '2px solid' : '2px solid transparent',
                        borderColor: isAdminUsers ? '#111' : 'transparent',
                        borderRadius: 0,
                    }}
                >
                    Admin users
                </Button>
            </Box>
        </AppBar>
    );
}

export function AdminTopNavLayout(props: LayoutProps) {
    return <Layout {...props} appBar={AdminAppBar} sidebar={HiddenSidebar} />;
}
