import * as React from 'react';
import {
    AppBar as RaAppBar,
    TitlePortal,
    HideOnScroll,
    useStore,
    useSidebarState,
} from 'react-admin';
import { ToolbarUserMenu } from './ToolbarUserMenu';
import { AppBar as MuiAppBar, Toolbar, Box, useMediaQuery, type Theme } from '@mui/material';

import Logo from './Logo';
import { AppBarToolbar } from './AppBarToolbar';
import { OdooAppSwitcher } from './OdooAppSwitcher';
import { OdooTopNav } from './OdooTopNav';
import { ToolbarCompanyName } from './ToolbarCompanyName';
import type { ThemeName } from '../themes/themes';
import { isOdooShellTheme } from '../apps/activeAppStore';

/** Collapse drawer on desktop so Odoo top nav is primary (mobile still uses drawer). */
function CloseSidebarOnMount() {
    const [, setOpen] = useSidebarState();
    React.useEffect(() => {
        setOpen(false);
    }, [setOpen]);
    return null;
}

const CustomAppBar = () => {
    const isLargeEnough = useMediaQuery<Theme>(theme => theme.breakpoints.up('sm'));
    const [themeName] = useStore<ThemeName>('themeName', 'nano');
    const odoo = isOdooShellTheme(themeName);

    if (!odoo) {
        return (
            <RaAppBar color="secondary" toolbar={<AppBarToolbar />}>
                <TitlePortal />
                {isLargeEnough && <Logo />}
                {isLargeEnough && <Box component="span" sx={{ flex: 1 }} />}
            </RaAppBar>
        );
    }

    return (
        <HideOnScroll>
            <MuiAppBar
                position="fixed"
                color="secondary"
                elevation={0}
                sx={{
                    bgcolor: 'transparent',
                    boxShadow: 'none',
                    px: { xs: 0.5, sm: 1 },
                    pt: { xs: 0.5, sm: 0.75 },
                }}
            >
                <Toolbar
                    disableGutters
                    variant="dense"
                    sx={{
                        px: 1,
                        minHeight: 48,
                        gap: 0.5,
                        flexWrap: { xs: 'wrap', md: 'nowrap' },
                        alignItems: 'center',
                        bgcolor: theme => (theme.vars || theme).palette.secondary.main,
                        borderRadius: 1.25,
                        boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                        border: '1px solid rgba(0,0,0,0.08)',
                    }}
                >
                    <CloseSidebarOnMount />
                    <OdooAppSwitcher />
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            minWidth: 0,
                            flexShrink: 0,
                            maxWidth: { xs: '40%', sm: 220 },
                        }}
                    >
                        <TitlePortal />
                    </Box>
                    <OdooTopNav />
                    <Box component="span" sx={{ flex: 1, minWidth: 8 }} />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                        <AppBarToolbar />
                        <ToolbarCompanyName />
                        <ToolbarUserMenu />
                    </Box>
                </Toolbar>
            </MuiAppBar>
        </HideOnScroll>
    );
};

export default CustomAppBar;
