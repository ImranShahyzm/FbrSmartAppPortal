import * as React from 'react';
import { useState } from 'react';
import { Box } from '@mui/material';
import {
    useTranslate,
    useGetIdentity,
    DashboardMenuItem,
    MenuItemLink,
    MenuProps,
    useSidebarState,
} from 'react-admin';
import clsx from 'clsx';

import visitors from '../visitors';
import fbrInvoices from '../orders';
import SubMenu from './SubMenu';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import BusinessIcon from '@mui/icons-material/Business';
import GavelIcon from '@mui/icons-material/Gavel';
import PercentIcon from '@mui/icons-material/Percent';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';

type MenuName = 'menuCatalog';

const Menu = ({ dense = false }: MenuProps) => {
    const [state, setState] = useState({
        menuCatalog: true,
    });
    const translate = useTranslate();
    const [open] = useSidebarState();
    const { identity } = useGetIdentity();
    const companyActive =
        (identity as { companyIsActivated?: boolean } | undefined)?.companyIsActivated !== false;

    const handleToggle = (menu: MenuName) => {
        setState(s => ({ ...s, [menu]: !s[menu] }));
    };

    return (
        <Box
            sx={{
                width: open ? 200 : 50,
                marginTop: 1,
                marginBottom: 1,
                transition: theme =>
                    theme.transitions.create('width', {
                        easing: theme.transitions.easing.sharp,
                        duration: theme.transitions.duration.leavingScreen,
                    }),
            }}
            className={clsx({
                'RaMenu-open': open,
                'RaMenu-closed': !open,
            })}
        >
            <DashboardMenuItem />
            {!companyActive ? null : (
                <>
            <MenuItemLink
                to="/fbrInvoices"
                state={{ _scrollToTop: true }}
                primaryText={translate(`resources.fbrInvoices.name`, {
                    smart_count: 2,
                })}
                leftIcon={<fbrInvoices.icon />}
                dense={dense}
            />
            <MenuItemLink
                to="/customers"
                state={{ _scrollToTop: true }}
                primaryText={translate(`resources.customers.name`, {
                    smart_count: 2,
                })}
                leftIcon={<visitors.icon />}
                dense={dense}
            />
            <SubMenu
                handleToggle={() => handleToggle('menuCatalog')}
                isOpen={state.menuCatalog}
                name="pos.menu.catalog"
                icon={<Inventory2Icon />}
                dense={dense}
            >
                <MenuItemLink
                    to="/productProfiles"
                    state={{ _scrollToTop: true }}
                    primaryText="Product Registration"
                    leftIcon={<Inventory2Icon />}
                    dense={dense}
                />
                <MenuItemLink
                    to="/fbrSalesTaxRates"
                    state={{ _scrollToTop: true }}
                    primaryText={translate(`resources.fbrSalesTaxRates.name`, {
                        smart_count: 2,
                    })}
                    leftIcon={<PercentIcon />}
                    dense={dense}
                />
                <MenuItemLink
                    to="/companies"
                    state={{ _scrollToTop: true }}
                    primaryText={translate(`resources.companies.name`, {
                        smart_count: 1,
                    })}
                    leftIcon={<BusinessIcon />}
                    dense={dense}
                />
                <MenuItemLink
                    to="/users"
                    state={{ _scrollToTop: true }}
                    primaryText={translate(`resources.users.name`, {
                        smart_count: 2,
                        _: 'Users',
                    })}
                    leftIcon={<PersonOutlineIcon />}
                    dense={dense}
                />
                <MenuItemLink
                    to="/fbrScenarios"
                    state={{ _scrollToTop: true }}
                    primaryText="FBR Scenarios"
                    leftIcon={<GavelIcon />}
                    dense={dense}
                />
            </SubMenu>
                </>
            )}
        </Box>
    );
};

export default Menu;
