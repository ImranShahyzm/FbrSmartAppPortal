import * as React from 'react';
import {
    Box,
    Button,
    Fade,
    Menu,
    MenuItem,
    ListSubheader,
    Tooltip,
} from '@mui/material';
import { Link } from 'react-router-dom';
import { useTranslate, useGetIdentity } from 'react-admin';

import { useResolvedActiveAppId } from '../apps/useResolvedActiveAppId';
import {
    ACCOUNTING_SUITE_APP_ID,
    SETTINGS_APP_ID,
} from '../apps/appsRegistry';
import { SETTINGS_SECURITY_GROUPS_LIST_PATH, SETTINGS_USERS_LIST_PATH } from '../apps/workspacePaths';
import { useCanAccess } from '../auth/useCanAccess';
import { catalogDropdownMenuSlotProps } from './catalogDropdownMenuProps';
import { useAccountingAccess } from '../accounting/useAccountingAccess';
import { pathInWorkspace, workspaceRootPath } from './odooNavUtils';

const topNavRowSx = {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexWrap: 'nowrap',
    alignItems: 'center',
    gap: 0.25,
    overflowX: 'auto',
    scrollbarGutter: 'stable',
    py: 0.5,
    '& > *': { flexShrink: 0 },
    '&::-webkit-scrollbar': { height: 4 },
} as const;

/**
 * Horizontal module bar for the active app (top bar only; no drawer sidebar).
 */
export function OdooTopNav() {
    const translate = useTranslate();
    const activeAppId = useResolvedActiveAppId();
    const { identity } = useGetIdentity();
    const companyActive =
        (identity as { companyIsActivated?: boolean } | undefined)?.companyIsActivated !== false;

    const root = workspaceRootPath(activeAppId);

    if (!companyActive) {
        return (
            <Box sx={{ flex: 1, minWidth: 0, display: { xs: 'none', lg: 'flex' }, alignItems: 'center' }}>
                <Button color="inherit" component={Link} to={root} size="small">
                    {translate('ra.page.dashboard', { _: 'Dashboard' })}
                </Button>
            </Box>
        );
    }

    if (activeAppId === ACCOUNTING_SUITE_APP_ID) {
        return <AccountingShellTopNav workspaceRoot={root} />;
    }

    if (activeAppId === SETTINGS_APP_ID) {
        return <SettingsShellTopNav workspaceRoot={root} />;
    }

    if (activeAppId !== 'fbr-smart') {
        return (
            <Box sx={{ ...topNavRowSx, display: { xs: 'none', lg: 'flex' } }}>
                <Button color="inherit" component={Link} to={root} size="small">
                    {translate('ra.page.dashboard', { _: 'Dashboard' })}
                </Button>
            </Box>
        );
    }

    return <FbrSmartTopNav workspaceRoot={root} />;
}

function FbrSmartTopNav(props: { workspaceRoot: string }) {
    const translate = useTranslate();
    const { workspaceRoot: root } = props;
    const p = (path: string) => pathInWorkspace(root, path);

    return (
        <Box sx={{ ...topNavRowSx, display: { xs: 'none', lg: 'flex' } }}>
            <Button color="inherit" component={Link} to={root} size="small">
                {translate('ra.page.dashboard', { _: 'Dashboard' })}
            </Button>
            <NavDropdown
                label={translate('pos.menu.sales', { _: 'Sales' })}
                items={[
                    {
                        to: p('/fbrInvoices'),
                        label: translate('resources.fbrInvoices.name', {
                            smart_count: 2,
                            _: 'FBR Invoices',
                        }),
                    },
                ]}
            />
            <Button color="inherit" component={Link} to={p('/customers')} size="small">
                {translate('resources.customers.name', {
                    smart_count: 2,
                    _: 'Customers',
                })}
            </Button>
            <NavDropdown
                label={translate('pos.menu.catalog', { _: 'Catalog' })}
                items={[
                    { to: p('/productProfiles'), label: 'Products' },
                    {
                        to: p('/fbrSalesTaxRates'),
                        label: translate('resources.fbrSalesTaxRates.name', {
                            smart_count: 2,
                            _: 'Taxes',
                        }),
                    },
                    {
                        to: p('/companies'),
                        label: translate('resources.companies.name', {
                            smart_count: 1,
                            _: 'Company',
                        }),
                    },
                    { to: p('/fbrScenarios'), label: 'FBR Scenarios' },
                ]}
            />
        </Box>
    );
}

function SettingsShellTopNav(props: { workspaceRoot: string }) {
    const translate = useTranslate();
    const root = props.workspaceRoot;
    const canSg = useCanAccess(SETTINGS_APP_ID, 'securityGroups', 'read');
    const canUsers = useCanAccess(SETTINGS_APP_ID, 'users', 'read');

    return (
        <Box sx={{ ...topNavRowSx, display: { xs: 'none', lg: 'flex' } }}>
            <Button color="inherit" component={Link} to={root} size="small">
                {translate('ra.page.dashboard', { _: 'Dashboard' })}
            </Button>
            {canUsers ? (
                <Button color="inherit" component={Link} to={SETTINGS_USERS_LIST_PATH} size="small">
                    {translate('resources.users.name', {
                        smart_count: 2,
                        _: 'Users',
                    })}
                </Button>
            ) : null}
            {canSg ? (
                <Button color="inherit" component={Link} to={SETTINGS_SECURITY_GROUPS_LIST_PATH} size="small">
                    {translate('shell.settings.security_groups', { _: 'Security groups' })}
                </Button>
            ) : null}
        </Box>
    );
}

function TransactionAccountingDropdown(props: { workspaceRoot: string }) {
    const translate = useTranslate();
    const canJv = useAccountingAccess('glJournalVouchers', 'read');
    const [anchor, setAnchor] = React.useState<null | HTMLElement>(null);
    const open = Boolean(anchor);
    const root = props.workspaceRoot;
    const bp = pathInWorkspace(root, '/bankPayments/create');
    const cp = pathInWorkspace(root, '/cashPayments/create');
    const br = pathInWorkspace(root, '/bankReceipts/create');
    const cr = pathInWorkspace(root, '/cashReceipts/create');

    if (!canJv) {
        return (
            <Tooltip title={translate('shell.accounting.no_access_transactions')}>
                <span>
                    <Button color="inherit" size="small" disabled sx={{ whiteSpace: 'nowrap', opacity: 0.65 }}>
                        {translate('shell.accounting.transaction')}
                    </Button>
                </span>
            </Tooltip>
        );
    }

    return (
        <>
            <Button
                color="inherit"
                size="small"
                onClick={e => setAnchor(e.currentTarget)}
                sx={{ whiteSpace: 'nowrap' }}
            >
                {translate('shell.accounting.transaction')}
            </Button>
            <Menu
                anchorEl={anchor}
                open={open}
                onClose={() => setAnchor(null)}
                slots={{ transition: Fade }}
                transitionDuration={180}
                slotProps={catalogDropdownMenuSlotProps(open)}
            >
                <ListSubheader
                    disableSticky
                    sx={{
                        fontWeight: 700,
                        fontSize: 13,
                        color: 'primary.main',
                        lineHeight: 1.3,
                        py: 0.75,
                        pl: 1.25,
                        pr: 2,
                    }}
                >
                    {translate('shell.accounting.transaction_payments')}
                </ListSubheader>
                <MenuItem
                    component={Link}
                    to={bp}
                    onClick={() => setAnchor(null)}
                    sx={{ pl: 3.5, py: 1, fontSize: 13 }}
                >
                    {translate('shell.accounting.bank_payments')}
                </MenuItem>
                <MenuItem
                    component={Link}
                    to={cp}
                    onClick={() => setAnchor(null)}
                    sx={{ pl: 3.5, py: 1, fontSize: 13 }}
                >
                    {translate('shell.accounting.cash_payments')}
                </MenuItem>
                <ListSubheader
                    disableSticky
                    sx={{
                        fontWeight: 700,
                        fontSize: 13,
                        color: 'primary.main',
                        lineHeight: 1.3,
                        py: 0.75,
                        pl: 1.25,
                        pr: 2,
                    }}
                >
                    {translate('shell.accounting.transaction_receipts')}
                </ListSubheader>
                <MenuItem
                    component={Link}
                    to={br}
                    onClick={() => setAnchor(null)}
                    sx={{ pl: 3.5, py: 1, fontSize: 13 }}
                >
                    {translate('shell.accounting.bank_receipts')}
                </MenuItem>
                <MenuItem
                    component={Link}
                    to={cr}
                    onClick={() => setAnchor(null)}
                    sx={{ pl: 3.5, py: 1, fontSize: 13 }}
                >
                    {translate('shell.accounting.cash_receipts')}
                </MenuItem>
            </Menu>
        </>
    );
}

function AccountingShellTopNav(props: { workspaceRoot: string }) {
    const translate = useTranslate();
    const { workspaceRoot: root } = props;

    const stubNav = (label: string) => (
        <Tooltip title={translate('shell.accounting.coming_soon')}>
            <span>
                <Button
                    color="inherit"
                    size="small"
                    disabled
                    sx={{ whiteSpace: 'nowrap', opacity: 0.65, color: 'inherit' }}
                >
                    {label}
                </Button>
            </span>
        </Tooltip>
    );

    return (
        <Box sx={{ ...topNavRowSx, display: { xs: 'none', lg: 'flex' } }}>
            <Button color="inherit" component={Link} to={root} size="small">
                {translate('shell.accounting.dashboard')}
            </Button>
            <Button color="inherit" component={Link} to={pathInWorkspace(root, '/customers')} size="small">
                {translate('shell.accounting.customers')}
            </Button>
            <TransactionAccountingDropdown workspaceRoot={root} />
            <NavDropdown
                label={translate('shell.accounting.accounting')}
                items={[
                    {
                        to: pathInWorkspace(root, '/glJournalVouchers/create'),
                        label: translate('shell.accounting.journal_vouchers'),
                    },
                    {
                        to: pathInWorkspace(root, '/glJournalVouchers'),
                        label: translate('shell.accounting.vouchers_log_book'),
                    },
                ]}
            />
            <ReportingAccountingDropdown workspaceRoot={root} />
            <ConfigurationAccountingDropdown workspaceRoot={root} />
        </Box>
    );
}

function ReportingAccountingDropdown(props: { workspaceRoot: string }) {
    const translate = useTranslate();
    const canReports = useCanAccess(ACCOUNTING_SUITE_APP_ID, 'accountingReports', 'read');
    const [anchor, setAnchor] = React.useState<null | HTMLElement>(null);
    const open = Boolean(anchor);
    const trialPath = pathInWorkspace(props.workspaceRoot, '/reports/trial-balance');
    const glPath = pathInWorkspace(props.workspaceRoot, '/reports/general-ledger');

    if (!canReports) return null;

    return (
        <>
            <Button color="inherit" size="small" onClick={e => setAnchor(e.currentTarget)} sx={{ whiteSpace: 'nowrap' }}>
                {translate('shell.accounting.reporting')}
            </Button>
            <Menu
                anchorEl={anchor}
                open={open}
                onClose={() => setAnchor(null)}
                slots={{ transition: Fade }}
                transitionDuration={180}
                slotProps={catalogDropdownMenuSlotProps(open)}
            >
                <ListSubheader
                    disableSticky
                    sx={{
                        fontWeight: 700,
                        fontSize: 13,
                        color: 'primary.main',
                        lineHeight: 1.3,
                        py: 0.75,
                        pl: 1.25,
                        pr: 2,
                    }}
                >
                    {translate('shell.accounting.ledgers_section')}
                </ListSubheader>
                <MenuItem
                    component={Link}
                    to={trialPath}
                    onClick={() => setAnchor(null)}
                    sx={{ pl: 3.5, py: 1, fontSize: 13 }}
                >
                    {translate('shell.accounting.trial_balance')}
                </MenuItem>
                <MenuItem
                    component={Link}
                    to={glPath}
                    onClick={() => setAnchor(null)}
                    sx={{ pl: 3.5, py: 1, fontSize: 13 }}
                >
                    {translate('shell.accounting.general_ledger')}
                </MenuItem>
            </Menu>
        </>
    );
}

function ConfigurationAccountingDropdown(props: { workspaceRoot: string }) {
    const translate = useTranslate();
    const canReadCoa = useAccountingAccess('glChartAccounts', 'read');
    const canReadVouchers = useAccountingAccess('glVoucherTypes', 'read');
    const canReadAccountGroups = useAccountingAccess('glAccountGroups', 'read');
    const canReadBankInfo = useAccountingAccess('genBankInformation', 'read');
    const canReadCashInfo = useAccountingAccess('genCashInformation', 'read');
    const [anchor, setAnchor] = React.useState<null | HTMLElement>(null);
    const open = Boolean(anchor);
    const coaPath = pathInWorkspace(props.workspaceRoot, '/glChartAccounts');
    const voucherTypesPath = pathInWorkspace(props.workspaceRoot, '/glVoucherTypes');
    const accountGroupsPath = pathInWorkspace(props.workspaceRoot, '/glAccountGroups');
    const bankInfoPath = pathInWorkspace(props.workspaceRoot, '/genBankInformation');
    const cashInfoPath = pathInWorkspace(props.workspaceRoot, '/genCashInformation');

    return (
        <>
            <Button color="inherit" size="small" onClick={e => setAnchor(e.currentTarget)} sx={{ whiteSpace: 'nowrap' }}>
                {translate('shell.accounting.configuration')}
            </Button>
            <Menu
                anchorEl={anchor}
                open={open}
                onClose={() => setAnchor(null)}
                slots={{ transition: Fade }}
                transitionDuration={180}
                slotProps={catalogDropdownMenuSlotProps(open)}
            >
                <ListSubheader
                    disableSticky
                    sx={{
                        fontWeight: 700,
                        fontSize: 13,
                        color: 'primary.main',
                        lineHeight: 1.3,
                        py: 0.75,
                        pl: 1.25,
                        pr: 2,
                    }}
                >
                    {translate('shell.accounting.accounting_section')}
                </ListSubheader>
                {canReadCoa ? (
                    <MenuItem
                        component={Link}
                        to={coaPath}
                        onClick={() => setAnchor(null)}
                        sx={{ pl: 3.5, py: 1, fontSize: 13 }}
                    >
                        {translate('shell.accounting.chart_of_accounts')}
                    </MenuItem>
                ) : (
                    <Tooltip title={translate('shell.accounting.no_access_chart')}>
                        <span>
                            <MenuItem disabled sx={{ pl: 3.5 }}>
                                {translate('shell.accounting.chart_of_accounts')}
                            </MenuItem>
                        </span>
                    </Tooltip>
                )}
                {canReadVouchers ? (
                    <MenuItem
                        component={Link}
                        to={voucherTypesPath}
                        onClick={() => setAnchor(null)}
                        sx={{ pl: 3.5, py: 1, fontSize: 13 }}
                    >
                        {translate('shell.accounting.voucher_types')}
                    </MenuItem>
                ) : (
                    <Tooltip title={translate('shell.accounting.no_access_voucher_types')}>
                        <span>
                            <MenuItem disabled sx={{ pl: 3.5 }}>
                                {translate('shell.accounting.voucher_types')}
                            </MenuItem>
                        </span>
                    </Tooltip>
                )}
                {canReadAccountGroups ? (
                    <MenuItem
                        component={Link}
                        to={accountGroupsPath}
                        onClick={() => setAnchor(null)}
                        sx={{ pl: 3.5, py: 1, fontSize: 13 }}
                    >
                        {translate('shell.accounting.account_groups', { _: 'Account groups' })}
                    </MenuItem>
                ) : null}
                {canReadBankInfo ? (
                    <MenuItem
                        component={Link}
                        to={bankInfoPath}
                        onClick={() => setAnchor(null)}
                        sx={{ pl: 3.5, py: 1, fontSize: 13 }}
                    >
                        {translate('shell.accounting.bank_information')}
                    </MenuItem>
                ) : null}
                {canReadCashInfo ? (
                    <MenuItem
                        component={Link}
                        to={cashInfoPath}
                        onClick={() => setAnchor(null)}
                        sx={{ pl: 3.5, py: 1, fontSize: 13 }}
                    >
                        {translate('shell.accounting.cash_information')}
                    </MenuItem>
                ) : null}
            </Menu>
        </>
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
                    <MenuItem key={it.to} component={Link} to={it.to} onClick={() => setAnchor(null)}>
                        {it.label}
                    </MenuItem>
                ))}
            </Menu>
        </>
    );
}

export default OdooTopNav;
