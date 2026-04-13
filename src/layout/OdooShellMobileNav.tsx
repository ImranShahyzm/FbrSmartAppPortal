import * as React from 'react';
import {
    Box,
    Divider,
    Drawer,
    IconButton,
    List,
    ListItemButton,
    ListItemText,
    ListSubheader,
    Tooltip,
    Typography,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { Link, useLocation } from 'react-router-dom';
import { useTranslate, useGetIdentity } from 'react-admin';

import { useResolvedActiveAppId } from '../apps/useResolvedActiveAppId';
import {
    ACCOUNTING_SUITE_APP_ID,
    SETTINGS_APP_ID,
} from '../apps/appsRegistry';
import { SETTINGS_SECURITY_GROUPS_LIST_PATH, SETTINGS_USERS_LIST_PATH } from '../apps/workspacePaths';
import { useAccountingAccess } from '../accounting/useAccountingAccess';
import { useCanAccess } from '../auth/useCanAccess';
import { pathInWorkspace, workspaceRootPath } from './odooNavUtils';

const DRAWER_WIDTH = 288;

/**
 * Below `md`, the horizontal Odoo module bar is hidden; a hamburger opens this drawer
 * (same destinations as the desktop top nav).
 */
export function OdooShellMobileNav() {
    const [open, setOpen] = React.useState(false);
    const close = () => setOpen(false);
    const location = useLocation();
    const translate = useTranslate();
    const activeAppId = useResolvedActiveAppId();
    const { identity } = useGetIdentity();
    const companyActive =
        (identity as { companyIsActivated?: boolean } | undefined)?.companyIsActivated !== false;
    const root = workspaceRootPath(activeAppId);
    const p = (path: string) => pathInWorkspace(root, path);
    const canReadCoa = useAccountingAccess('glChartAccounts', 'read');
    const canReports = useCanAccess(ACCOUNTING_SUITE_APP_ID, 'accountingReports', 'read');
    const canSecurityGroups = useCanAccess(SETTINGS_APP_ID, 'securityGroups', 'read');
    const canUsers = useCanAccess(SETTINGS_APP_ID, 'users', 'read');

    React.useEffect(() => {
        setOpen(false);
    }, [location.pathname, location.search]);

    const itemSx = { borderRadius: 1, mx: 0.5 } as const;

    let body: React.ReactNode;
    if (!companyActive) {
        body = (
            <List dense disablePadding sx={{ py: 1 }}>
                <ListItemButton component={Link} to={root} onClick={close} sx={itemSx}>
                    <ListItemText primary={translate('ra.page.dashboard', { _: 'Dashboard' })} />
                </ListItemButton>
            </List>
        );
    } else if (activeAppId === ACCOUNTING_SUITE_APP_ID) {
        body = (
            <List dense disablePadding sx={{ py: 1 }}>
                <ListItemButton component={Link} to={root} onClick={close} sx={itemSx}>
                    <ListItemText primary={translate('shell.accounting.dashboard')} />
                </ListItemButton>
                <ListItemButton component={Link} to={p('/customers')} onClick={close} sx={itemSx}>
                    <ListItemText primary={translate('shell.accounting.customers')} />
                </ListItemButton>
                <ListSubheader disableSticky sx={{ fontWeight: 700, fontSize: 12, lineHeight: '32px' }}>
                    {translate('shell.accounting.accounting')}
                </ListSubheader>
                <ListItemButton component={Link} to={p('/glJournalVouchers/create')} onClick={close} sx={itemSx}>
                    <ListItemText primary={translate('shell.accounting.journal_vouchers')} />
                </ListItemButton>
                <ListItemButton component={Link} to={p('/glJournalVouchers')} onClick={close} sx={itemSx}>
                    <ListItemText primary={translate('shell.accounting.vouchers_log_book')} />
                </ListItemButton>
                {canReports ? (
                    <>
                        <Divider sx={{ my: 1 }} />
                        <ListSubheader
                            disableSticky
                            sx={{ fontWeight: 700, fontSize: 12, lineHeight: '32px', color: 'primary.main' }}
                        >
                            {translate('shell.accounting.reporting')}
                        </ListSubheader>
                        <ListSubheader disableSticky sx={{ fontWeight: 600, fontSize: 11, pl: 2, lineHeight: '28px' }}>
                            {translate('shell.accounting.ledgers_section')}
                        </ListSubheader>
                        <ListItemButton component={Link} to={p('/reports/trial-balance')} onClick={close} sx={itemSx}>
                            <ListItemText primary={translate('shell.accounting.trial_balance')} />
                        </ListItemButton>
                        <ListItemButton component={Link} to={p('/reports/general-ledger')} onClick={close} sx={itemSx}>
                            <ListItemText primary={translate('shell.accounting.general_ledger')} />
                        </ListItemButton>
                    </>
                ) : null}
                <Divider sx={{ my: 1 }} />
                <ListSubheader disableSticky sx={{ fontWeight: 700, fontSize: 12, lineHeight: '32px' }}>
                    {translate('shell.accounting.configuration')}
                </ListSubheader>
                {canReadCoa ? (
                    <ListItemButton component={Link} to={p('/glChartAccounts')} onClick={close} sx={itemSx}>
                        <ListItemText primary={translate('shell.accounting.chart_of_accounts')} />
                    </ListItemButton>
                ) : (
                    <Tooltip title={translate('shell.accounting.no_access_chart')}>
                        <span>
                            <ListItemButton disabled sx={itemSx}>
                                <ListItemText primary={translate('shell.accounting.chart_of_accounts')} />
                            </ListItemButton>
                        </span>
                    </Tooltip>
                )}
            </List>
        );
    } else if (activeAppId === SETTINGS_APP_ID) {
        body = (
            <List dense disablePadding sx={{ py: 1 }}>
                <ListItemButton component={Link} to={root} onClick={close} sx={itemSx}>
                    <ListItemText primary={translate('ra.page.dashboard', { _: 'Dashboard' })} />
                </ListItemButton>
                {canUsers ? (
                    <ListItemButton component={Link} to={SETTINGS_USERS_LIST_PATH} onClick={close} sx={itemSx}>
                        <ListItemText
                            primary={translate('resources.users.name', {
                                smart_count: 2,
                                _: 'Users',
                            })}
                        />
                    </ListItemButton>
                ) : null}
                {canSecurityGroups ? (
                    <ListItemButton
                        component={Link}
                        to={SETTINGS_SECURITY_GROUPS_LIST_PATH}
                        onClick={close}
                        sx={itemSx}
                    >
                        <ListItemText
                            primary={translate('shell.settings.security_groups', { _: 'Security groups' })}
                        />
                    </ListItemButton>
                ) : null}
            </List>
        );
    } else if (activeAppId !== 'fbr-smart') {
        body = (
            <List dense disablePadding sx={{ py: 1 }}>
                <ListItemButton component={Link} to={root} onClick={close} sx={itemSx}>
                    <ListItemText primary={translate('ra.page.dashboard', { _: 'Dashboard' })} />
                </ListItemButton>
            </List>
        );
    } else {
        body = (
            <List dense disablePadding sx={{ py: 1 }}>
                <ListItemButton component={Link} to={root} onClick={close} sx={itemSx}>
                    <ListItemText primary={translate('ra.page.dashboard', { _: 'Dashboard' })} />
                </ListItemButton>
                <ListSubheader disableSticky sx={{ fontWeight: 700, fontSize: 12, lineHeight: '32px' }}>
                    {translate('pos.menu.sales', { _: 'Sales' })}
                </ListSubheader>
                <ListItemButton component={Link} to={p('/fbrInvoices')} onClick={close} sx={itemSx}>
                    <ListItemText
                        primary={translate('resources.fbrInvoices.name', {
                            smart_count: 2,
                            _: 'FBR Invoices',
                        })}
                    />
                </ListItemButton>
                <ListItemButton component={Link} to={p('/customers')} onClick={close} sx={itemSx}>
                    <ListItemText
                        primary={translate('resources.customers.name', {
                            smart_count: 2,
                            _: 'Customers',
                        })}
                    />
                </ListItemButton>
                <ListSubheader disableSticky sx={{ fontWeight: 700, fontSize: 12, lineHeight: '32px' }}>
                    {translate('pos.menu.catalog', { _: 'Catalog' })}
                </ListSubheader>
                <ListItemButton component={Link} to={p('/productProfiles')} onClick={close} sx={itemSx}>
                    <ListItemText primary="Product Registration" />
                </ListItemButton>
                <ListItemButton component={Link} to={p('/fbrSalesTaxRates')} onClick={close} sx={itemSx}>
                    <ListItemText
                        primary={translate('resources.fbrSalesTaxRates.name', {
                            smart_count: 2,
                            _: 'Taxes',
                        })}
                    />
                </ListItemButton>
                <ListItemButton component={Link} to={p('/companies')} onClick={close} sx={itemSx}>
                    <ListItemText
                        primary={translate('resources.companies.name', {
                            smart_count: 1,
                            _: 'Company',
                        })}
                    />
                </ListItemButton>
                <ListItemButton component={Link} to={p('/fbrScenarios')} onClick={close} sx={itemSx}>
                    <ListItemText primary="FBR Scenarios" />
                </ListItemButton>
            </List>
        );
    }

    return (
        <>
            <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center' }}>
                <IconButton
                    color="inherit"
                    edge="start"
                    aria-label={translate('ra.action.open_navigation', { _: 'Open menu' })}
                    onClick={() => setOpen(true)}
                    size="small"
                >
                    <MenuIcon />
                </IconButton>
            </Box>
            <Drawer
                anchor="left"
                open={open}
                onClose={close}
                ModalProps={{ keepMounted: true }}
                PaperProps={{
                    sx: {
                        width: DRAWER_WIDTH,
                        boxSizing: 'border-box',
                    },
                }}
            >
                <Box sx={{ px: 2, py: 1.5, bgcolor: 'secondary.main', color: 'secondary.contrastText' }}>
                    <Typography variant="subtitle1" fontWeight={700}>
                        {translate('pos.odoo.menu', { _: 'Menu' })}
                    </Typography>
                </Box>
                <Box role="navigation">
                    {body}
                </Box>
            </Drawer>
        </>
    );
}

export default OdooShellMobileNav;
