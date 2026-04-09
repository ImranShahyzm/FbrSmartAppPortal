import * as React from 'react';
import {
    Box,
    Button,
    Fade,
    Menu,
    MenuItem,
    IconButton,
    useMediaQuery,
    type Theme,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { Link } from 'react-router-dom';
import { useTranslate, useStore, useSidebarState, useGetIdentity } from 'react-admin';

import { STORE_KEY_ACTIVE_APP } from '../apps/activeAppStore';
import { DEFAULT_ACTIVE_APP_ID } from '../apps/appsRegistry';
import { catalogDropdownMenuSlotProps } from './catalogDropdownMenuProps';

/**
 * Horizontal module bar (Odoo-style) for the active app. Mobile: opens classic drawer menu.
 */
export function OdooTopNav() {
    const translate = useTranslate();
    const isMdUp = useMediaQuery<Theme>(theme => theme.breakpoints.up('md'));
    const [activeAppId] = useStore<string>(STORE_KEY_ACTIVE_APP, DEFAULT_ACTIVE_APP_ID);
    const [, setSidebarOpen] = useSidebarState();
    const { identity } = useGetIdentity();
    const companyActive =
        (identity as { companyIsActivated?: boolean } | undefined)?.companyIsActivated !== false;

    if (!companyActive) {
        return (
            <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center' }}>
                <Button color="inherit" component={Link} to="/" size="small">
                    {translate('ra.page.dashboard', { _: 'Dashboard' })}
                </Button>
            </Box>
        );
    }

    if (activeAppId !== 'fbr-smart') {
        return (
            <Box sx={{ flex: 1, minWidth: 0, display: { xs: 'none', md: 'flex' }, alignItems: 'center' }}>
                <Button color="inherit" component={Link} to="/" size="small">
                    {translate('ra.page.dashboard', { _: 'Dashboard' })}
                </Button>
            </Box>
        );
    }

    if (!isMdUp) {
        return (
            <IconButton color="inherit" edge="start" onClick={() => setSidebarOpen(true)} sx={{ ml: 0.5 }}>
                <MenuIcon />
            </IconButton>
        );
    }

    return (
        <Box
            sx={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 0.25,
                overflowX: 'auto',
                py: 0.5,
                '&::-webkit-scrollbar': { height: 4 },
            }}
        >
            <Button color="inherit" component={Link} to="/" size="small">
                {translate('ra.page.dashboard', { _: 'Dashboard' })}
            </Button>
            <NavDropdown
                label={translate('pos.menu.sales', { _: 'Sales' })}
                items={[
                    {
                        to: '/fbrInvoices',
                        label: translate('resources.fbrInvoices.name', {
                            smart_count: 2,
                            _: 'FBR Invoices',
                        }),
                    },
                ]}
            />
            <Button color="inherit" component={Link} to="/customers" size="small">
                {translate('resources.customers.name', {
                    smart_count: 2,
                    _: 'Customers',
                })}
            </Button>
            <NavDropdown
                label={translate('pos.menu.catalog', { _: 'Catalog' })}
                items={[
                    { to: '/productProfiles', label: 'Product Registration' },
                    {
                        to: '/fbrSalesTaxRates',
                        label: translate('resources.fbrSalesTaxRates.name', {
                            smart_count: 2,
                            _: 'Taxes',
                        }),
                    },
                    {
                        to: '/companies',
                        label: translate('resources.companies.name', {
                            smart_count: 1,
                            _: 'Company',
                        }),
                    },
                    {
                        to: '/users',
                        label: translate('resources.users.name', {
                            smart_count: 2,
                            _: 'Users',
                        }),
                    },
                    { to: '/fbrScenarios', label: 'FBR Scenarios' },
                ]}
            />
        </Box>
    );
}

function NavDropdown(props: {
    label: string;
    items: { to: string; label: string }[];
}) {
    const [anchor, setAnchor] = React.useState<null | HTMLElement>(null);
    const open = Boolean(anchor);

    return (
        <>
            <Button color="inherit" size="small" onClick={e => setAnchor(e.currentTarget)} sx={{ whiteSpace: 'nowrap' }}>
                {props.label}
            </Button>
            <Menu
                anchorEl={anchor}
                open={open}
                onClose={() => setAnchor(null)}
                slots={{ transition: Fade }}
                transitionDuration={180}
                slotProps={catalogDropdownMenuSlotProps(open)}
            >
                {props.items.map(it => (
                    <MenuItem
                        key={it.to}
                        component={Link}
                        to={it.to}
                        onClick={() => setAnchor(null)}
                    >
                        {it.label}
                    </MenuItem>
                ))}
            </Menu>
        </>
    );
}
