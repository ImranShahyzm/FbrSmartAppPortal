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

// ICONS
import Inventory2Icon from '@mui/icons-material/Inventory2';
import BusinessIcon from '@mui/icons-material/Business';
import GavelIcon from '@mui/icons-material/Gavel';
import PercentIcon from '@mui/icons-material/Percent';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import SecurityIcon from '@mui/icons-material/Security';
import ColorLensIcon from '@mui/icons-material/ColorLens'; // For Color Info
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar'; // For Vehicle Info
import BuildIcon from '@mui/icons-material/Build'; // For Variant Info
import CategoryIcon from '@mui/icons-material/Category'; // For Vehicle Groups
import SettingsSuggestIcon from '@mui/icons-material/SettingsSuggest'; // For Setup
import AssessmentIcon from '@mui/icons-material/Assessment'; // For Reports

import { useCanAccess } from '../auth/useCanAccess';
import { useResolvedActiveAppId } from '../apps/useResolvedActiveAppId';
import {
    ACCOUNTING_SUITE_APP_ID,
    SETTINGS_APP_ID,
    AUTO_DEALERS_APP_ID, // Ensure this is exported from your registry
} from '../apps/appsRegistry';
import { SETTINGS_SECURITY_GROUPS_LIST_PATH, SETTINGS_USERS_LIST_PATH } from '../apps/workspacePaths';

// Added menuSetup to the types
type MenuName = 'menuCatalog' | 'menuSetup';

const Menu = ({ dense = false }: MenuProps) => {
    const [state, setState] = useState({
        menuCatalog: true,
        menuSetup: true, // State to handle the Setup dropdown
    });
    const translate = useTranslate();
    const [open] = useSidebarState();
    const { identity } = useGetIdentity();
    const activeAppId = useResolvedActiveAppId();
    const companyActive =
        (identity as { companyIsActivated?: boolean } | undefined)?.companyIsActivated !== false;

    const canSecurityGroups = useCanAccess(SETTINGS_APP_ID, 'securityGroups', 'read');
    const canUsers = useCanAccess(SETTINGS_APP_ID, 'users', 'read');

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

            {!companyActive ? null : activeAppId === SETTINGS_APP_ID ? (
                // SETTINGS APP MENU
                <>
                    {canUsers && (
                        <MenuItemLink
                            to={SETTINGS_USERS_LIST_PATH}
                            primaryText="Users"
                            leftIcon={<PersonOutlineIcon />}
                            dense={dense}
                        />
                    )}
                    {canSecurityGroups && (
                        <MenuItemLink
                            to={SETTINGS_SECURITY_GROUPS_LIST_PATH}
                            primaryText="Security Groups"
                            leftIcon={<SecurityIcon />}
                            dense={dense}
                        />
                    )}
                </>
            ) : activeAppId === ACCOUNTING_SUITE_APP_ID ? (
                // ACCOUNTING APP MENU
                <MenuItemLink
                    to="/glChartAccounts"
                    primaryText="Chart of Accounts"
                    leftIcon={<AccountBalanceIcon />}
                    dense={dense}
                />
            ) : activeAppId === AUTO_DEALERS_APP_ID ? (
                 <>
                    {/* Setup SubMenu */}
                    <SubMenu
                        handleToggle={() => handleToggle('menuSetup')}
                        isOpen={state.menuSetup}
                        name="Setup"
                        icon={<SettingsSuggestIcon />}
                        dense={dense}
                    >
                        <MenuItemLink
                            to="/auto-dealers/colorInformation"
                            primaryText="Color Info"
                            leftIcon={<ColorLensIcon />}
                        />
                        <MenuItemLink
                            to="/auto-dealers/vehicleInformation"
                            primaryText="Vehicle Info"
                            leftIcon={<DirectionsCarIcon />}
                        />
                        <MenuItemLink
                            to="/auto-dealers/variantInformation"
                            primaryText="Variant Info"
                            leftIcon={<BuildIcon />}
                        />
                        <MenuItemLink
                            to="/auto-dealers/vehicleGroups"
                            primaryText="Vehicle Group"
                            leftIcon={<CategoryIcon />}
                        />
                        <MenuItemLink
                            to="/auto-dealers/salesServicesInformation"
                            primaryText="Sales Service Info"
                            leftIcon={<BusinessIcon />}
                        />
                        <MenuItemLink
                            to="/auto-dealers/bankInformation"
                            primaryText="Bank Info"
                            leftIcon={<AccountBalanceIcon />}
                        />
                    </SubMenu>

                    <MenuItemLink
                        to="/auto-dealers/autoDealerReports"
                        primaryText="Reports"
                        leftIcon={<AssessmentIcon />}
                    />
                </>
            ) : (
                // FBR SMART / DEFAULT APP MENU
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
                    primaryText="Products"
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