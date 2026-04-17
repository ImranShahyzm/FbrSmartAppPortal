import * as React from 'react';
import { useTranslate } from 'react-admin';
import { useWatch } from 'react-hook-form';
import { Box, Table, TableBody, TableCell, TableRow, Typography } from '@mui/material';
import { toDataURL as qrToDataUrl } from 'qrcode';

import { TableCellRight } from './TableCellRight';

type Line = {
    unitPrice?: number;
    quantity?: number;
    taxRate?: number;
    fixedNotifiedApplicable?: boolean;
    mrpRateValue?: number;
    discountRate?: number;
};

export function InvoiceTotalsForm() {
    const translate = useTranslate();
    const lines = (useWatch({ name: 'lines' }) as Line[] | undefined) ?? [];
    const delivery_fees = Number(useWatch({ name: 'deliveryFees' })) || 0;
    const fbrInvoiceNumber = useWatch({ name: 'fbrInvoiceNumber' }) as string | undefined;
    const [fbrQrUrl, setFbrQrUrl] = React.useState<string | null>(null);

    React.useEffect(() => {
        let cancelled = false;
        const t = String(fbrInvoiceNumber ?? '').trim();
        if (!t) {
            setFbrQrUrl(null);
            return;
        }
        qrToDataUrl(t, { margin: 1, width: 128 })
            .then(url => {
                if (!cancelled) setFbrQrUrl(url);
            })
            .catch(() => {
                if (!cancelled) setFbrQrUrl(null);
            });
        return () => {
            cancelled = true;
        };
    }, [fbrInvoiceNumber]);

    const { total_ex_taxes, taxes } = React.useMemo(() => {
        let ex = 0;
        let tx = 0;
        for (const line of lines) {
            const qty = Number(line?.quantity) || 0;
            const unitPrice = Number(line?.unitPrice) || 0;
            const disc = Math.max(0, Math.min(100, Number(line?.discountRate) || 0));
            const net = qty * unitPrice * (1 - disc / 100);
            ex += net;
            const taxRate = Number(line?.taxRate) || 0;
            const fixed = Boolean(line?.fixedNotifiedApplicable);
            const mrp = Number(line?.mrpRateValue) || 0;
            // Must match invoice line grid + backend totals:
            // if FN applies: tax base = (MRP * Qty); else tax base = net
            const taxBase = fixed && mrp > 0 ? qty * mrp : net;
            tx += taxBase * taxRate;
        }
        return { total_ex_taxes: ex, taxes: tx };
    }, [lines]);

    const blendedTaxRate = total_ex_taxes > 0 ? taxes / total_ex_taxes : 0;
    const total = total_ex_taxes + taxes + delivery_fees;
    const num = (n: number) =>
        (Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                flexWrap: 'wrap',
                alignItems: { xs: 'stretch', sm: 'flex-start' },
                justifyContent: fbrQrUrl ? 'space-between' : 'flex-end',
                gap: 2,
                width: '100%',
            }}
        >
            {fbrQrUrl ? (
                <Box
                    sx={{
                        flexShrink: 0,
                        textAlign: 'left',
                        alignSelf: { xs: 'flex-start', sm: 'flex-start' },
                    }}
                >
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                        {translate('resources.fbrInvoices.fbr_number', { _: '' })}
                    </Typography>
                    <Box
                        component="img"
                        src={fbrQrUrl}
                        alt=""
                        sx={{ width: 128, height: 128, display: 'block' }}
                    />
                </Box>
            ) : null}
            <Table
                size="small"
                sx={{
                    minWidth: '20em',
                    maxWidth: '28em',
                    ml: { xs: 'auto', sm: fbrQrUrl ? 0 : 'auto' },
                    alignSelf: { xs: 'flex-end', sm: 'flex-start' },
                    '& .MuiTableCell-root': { fontSize: '0.8rem', py: '4px', borderColor: 'divider' },
                }}
            >
                <TableBody>
                    <TableRow>
                        <TableCell>
                            {translate('resources.orders.fields.basket.sum', { _: 'Sum' })}
                        </TableCell>
                        <TableCellRight>
                            {num(total_ex_taxes)}
                        </TableCellRight>
                    </TableRow>
                    <TableRow>
                        <TableCell>
                            {translate('resources.orders.fields.basket.taxes', { _: 'Tax' })} (
                            {blendedTaxRate.toLocaleString(undefined, {
                                style: 'percent',
                                maximumFractionDigits: 2,
                            })}
                            )
                        </TableCell>
                        <TableCellRight>
                            {num(taxes)}
                        </TableCellRight>
                    </TableRow>
                    <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>
                            {translate('resources.orders.fields.basket.total', { _: 'Total' })}
                        </TableCell>
                        <TableCellRight sx={{ fontWeight: 'bold' }}>
                            {num(total)}
                        </TableCellRight>
                    </TableRow>
                </TableBody>
            </Table>
        </Box>
    );
}
