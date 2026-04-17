import * as React from 'react';
import { AppBar as RaAppBar, TitlePortal, HideOnScroll, useStore, useTranslate } from 'react-admin';
import { Link } from 'react-router-dom';
import { HiOutlineWrenchScrewdriver } from 'react-icons/hi2';
import { ToolbarUserMenu } from './ToolbarUserMenu';
import {
    AppBar as MuiAppBar,
    Toolbar,
    Box,
    IconButton,
    Tooltip,
    Typography,
    useMediaQuery,
    type Theme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';

import Logo from './Logo';
import { AppBarToolbar } from './AppBarToolbar';
import { OdooAppSwitcher } from './OdooAppSwitcher';
import { OdooTopNav } from './OdooTopNav';
import { OdooShellMobileNav } from './OdooShellMobileNav';
import { ToolbarCompanyName } from './ToolbarCompanyName';
import type { ThemeName } from '../themes/themes';
import { isOdooShellTheme } from '../apps/activeAppStore';
import { useResolvedActiveAppId } from '../apps/useResolvedActiveAppId';
import {
    ACCOUNTING_SUITE_APP_ID,
    APPS_REGISTRY,
    AUTO_DEALERS_APP_ID,
    SETTINGS_APP_ID,
} from '../apps/appsRegistry';
import { SETTINGS_RECORD_RULE_FIELD_SETTINGS_PATH } from '../apps/workspacePaths';
import { useCanAccess } from '../auth/useCanAccess';

const CustomAppBar = () => {
    const isLargeEnough = useMediaQuery<Theme>(theme => theme.breakpoints.up('sm'));
    const [themeName, setThemeName] = useStore<ThemeName>('themeName', 'nano');
    React.useEffect(() => {
        if (themeName !== 'nano') setThemeName('nano');
    }, [themeName, setThemeName]);
    const odoo = isOdooShellTheme(themeName);
    const activeAppId = useResolvedActiveAppId();
    const canRecordRuleFieldSetup = useCanAccess(SETTINGS_APP_ID, 'securityGroups', 'write');
    const translate = useTranslate();
    const inAccountingWorkspace = activeAppId === ACCOUNTING_SUITE_APP_ID;
    const hideTitlePortal =
        inAccountingWorkspace || activeAppId === SETTINGS_APP_ID || activeAppId === AUTO_DEALERS_APP_ID;
    const workspaceAppLabel = React.useMemo(() => {
        const entry = APPS_REGISTRY.find(a => a.id === activeAppId);
        return entry?.name ?? null;
    }, [activeAppId]);

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
                position="sticky"
                color="secondary"
                elevation={0}
                sx={{
                    bgcolor: 'transparent',
                    boxShadow: 'none',
                    px: { xs: 0.5, sm: 1 },
                    pt: 0,
                    pb: 0,
                    mb: 0,
                }}
            >
                <Toolbar
                    disableGutters
                    variant="dense"
                    sx={{
                        px: 1,
                        minHeight: 48,
                        minWidth: 0,
                        gap: 0.5,
                        flexWrap: { xs: 'wrap', lg: 'nowrap' },
                        alignItems: 'center',
                        bgcolor: theme => (theme.vars || theme).palette.secondary.main,
                        borderRadius: 1.25,
                        boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                        border: '1px solid rgba(0,0,0,0.08)',
                    }}
                >
                    <OdooShellMobileNav />
                    <OdooAppSwitcher />
                    {workspaceAppLabel ? (
                        <Typography
                            component="span"
                            variant="body2"
                            sx={{
                                flexShrink: 0,
                                mr: 0.75,
                                pl: 0.25,
                                fontSize: '0.9375rem',
                                fontWeight: 600,
                                lineHeight: 1.2,
                                letterSpacing: '0.01em',
                                color: '#FFFFF0',
                                display: { xs: 'none', sm: 'inline' },
                            }}
                        >
                            {workspaceAppLabel}
                        </Typography>
                    ) : null}
                    <Box
                        sx={{
                            display: hideTitlePortal ? 'none' : 'flex',
                            alignItems: 'center',
                            minWidth: 0,
                            flexShrink: 0,
                            maxWidth: { xs: '40%', sm: 220 },
                        }}
                    >
                        <TitlePortal />
                    </Box>
                    <OdooTopNav />
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            flexShrink: 0,
                            marginInlineStart: 'auto',
                        }}
                    >
                        {activeAppId === SETTINGS_APP_ID && canRecordRuleFieldSetup ? (
                            <Tooltip title="Record rule fields (developer)">
                                <IconButton
                                    component={Link}
                                    to={SETTINGS_RECORD_RULE_FIELD_SETTINGS_PATH}
                                    size="small"
                                    color="inherit"
                                    aria-label="Record rule fields"
                                >
                                    <HiOutlineWrenchScrewdriver size={22} />
                                </IconButton>
                            </Tooltip>
                        ) : null}
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
