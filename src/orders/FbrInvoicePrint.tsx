import * as React from 'react';
import { useParams } from 'react-router-dom';
import { useDataProvider } from 'react-admin';
import { Alert, Box, Button, Card, CardContent, Divider, Grid, Typography } from '@mui/material';
import { toDataURL as qrToDataUrl } from 'qrcode';

type Line = {
    productName?: string;
    quantity?: number;
    unitPrice?: number;
    taxRate?: number;
};

export default function FbrInvoicePrint() {
    const { id } = useParams();
    const dataProvider = useDataProvider();
    const [record, setRecord] = React.useState<any | null>(null);
    const [qr, setQr] = React.useState<string | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<{ message: string; status?: number } | null>(null);

    const load = React.useCallback(async () => {
        if (!id) return;
        setLoading(true);
        setError(null);
        try {
            const res = await dataProvider.getOne('fbrInvoices', { id });
            setRecord(res.data);
        } catch (e: any) {
            const status = typeof e?.status === 'number' ? e.status : undefined;
            const msg =
                status === 401
                    ? 'Unauthorized. Please login again, then retry printing.'
                    : e?.message
                      ? String(e.message)
                      : 'Failed to load invoice for printing.';
            setRecord(null);
            setError({ message: msg, status });
        } finally {
            setLoading(false);
        }
    }, [dataProvider, id]);

    React.useEffect(() => {
        void load();
    }, [load]);

    React.useEffect(() => {
        let alive = true;
        if (!record) return;
        const qrText = String(
            record.fbrInvoiceNumber || record.invoiceNumber || record.reference || record.id || ''
        );
        void qrToDataUrl(qrText, { margin: 1, width: 240 })
            .then(url => {
                if (alive) setQr(url);
            })
            .catch(() => {
                if (alive) setQr(null);
            });
        return () => {
            alive = false;
        };
    }, [record]);

    React.useEffect(() => {
        if (!record) return;
        const t = window.setTimeout(() => window.print(), 350);
        return () => window.clearTimeout(t);
    }, [record]);

    if (loading) {
        return (
            <Box sx={{ p: 3 }}>
                <Typography variant="body2" color="text.secondary">
                    Loading…
                </Typography>
            </Box>
        );
    }

    if (error) {
        return (
            <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
                <Box sx={{ width: '100%', maxWidth: 640 }}>
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error.message}
                    </Alert>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Button variant="contained" onClick={() => void load()}>
                            Retry
                        </Button>
                        <Button variant="outlined" onClick={() => window.close()}>
                            Close
                        </Button>
                    </Box>
                </Box>
            </Box>
        );
    }

    if (!record) {
        return (
            <Box sx={{ p: 3 }}>
                <Typography variant="body2" color="text.secondary">
                    Invoice not found.
                </Typography>
            </Box>
        );
    }

    const currency = 'USD';
    const money = (n: any) =>
        (Number(n) || 0).toLocaleString(undefined, { style: 'currency', currency });
    const lines = (record.lines ?? []) as Line[];
    const invoiceDate = new Date(record.invoiceDate ?? record.invoiceDateUtc ?? Date.now());

    return (
        <Box
            sx={{
                p: 2,
                '@media print': {
                    p: 0,
                },
            }}
        >
            <style>
                {`
                @media print {
                    .no-print { display: none !important; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
                `}
            </style>

            <Card sx={{ maxWidth: 900, mx: 'auto', borderRadius: 2 }}>
                <CardContent sx={{ p: 3 }}>
                    <Grid container spacing={2} alignItems="flex-start">
                        <Grid size={{ xs: 8 }}>
                            <Typography variant="overline" color="text.secondary">
                                Invoice
                            </Typography>
                            <Typography variant="h4" fontWeight={800} sx={{ lineHeight: 1.1 }}>
                                {String(record.invoiceNumber ?? '').trim() || record.reference || '—'}
                            </Typography>
                            {record.reference?.trim() &&
                            String(record.invoiceNumber ?? '').trim() !== record.reference.trim() ? (
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                                    Reference: {record.reference}
                                </Typography>
                            ) : null}
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                Date: {invoiceDate.toLocaleDateString()}
                            </Typography>
                            {record.fbrInvoiceNumber ? (
                                <Typography variant="body2" color="text.secondary">
                                    FBR Invoice No: {String(record.fbrInvoiceNumber)}
                                </Typography>
                            ) : null}
                        </Grid>
                        <Grid size={{ xs: 4 }} sx={{ textAlign: 'right' }}>
                            {qr ? (
                                <Box
                                    component="img"
                                    src={qr}
                                    alt="QR"
                                    sx={{ width: 180, height: 180, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
                                />
                            ) : null}
                        </Grid>
                    </Grid>

                    <Divider sx={{ my: 2 }} />

                    <Box sx={{ mt: 1 }}>
                        <Box
                            component="table"
                            sx={{
                                width: '100%',
                                borderCollapse: 'collapse',
                                '& th, & td': {
                                    borderBottom: '1px solid',
                                    borderColor: 'divider',
                                    py: 1,
                                    px: 0.5,
                                    fontSize: 13,
                                },
                                '& th': {
                                    textAlign: 'left',
                                    bgcolor: 'action.hover',
                                    fontWeight: 800,
                                },
                            }}
                        >
                            <thead>
                                <tr>
                                    <th>Description</th>
                                    <th style={{ textAlign: 'right' }}>Qty</th>
                                    <th style={{ textAlign: 'right' }}>Unit Price</th>
                                    <th style={{ textAlign: 'right' }}>Tax</th>
                                    <th style={{ textAlign: 'right' }}>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {lines.map((l, i) => {
                                    const qty = Number(l.quantity) || 0;
                                    const unit = Number(l.unitPrice) || 0;
                                    const rate = Number(l.taxRate) || 0;
                                    const net = qty * unit;
                                    const tax = net * rate;
                                    const gross = net + tax;
                                    return (
                                        <tr key={i}>
                                            <td>{String(l.productName ?? '')}</td>
                                            <td style={{ textAlign: 'right' }}>{qty.toLocaleString(undefined, { maximumFractionDigits: 4 })}</td>
                                            <td style={{ textAlign: 'right' }}>{money(unit)}</td>
                                            <td style={{ textAlign: 'right' }}>{(rate * 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}%</td>
                                            <td style={{ textAlign: 'right' }}>{money(gross)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </Box>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                        <Box sx={{ minWidth: 320 }}>
                            <Row label="Sum" value={money(record.totalExTaxes)} />
                            <Row label="Tax" value={money(record.taxes)} />
                            <Row label="Delivery" value={money(record.deliveryFees)} />
                            <Divider sx={{ my: 1 }} />
                            <Row label="Total" value={money(record.total)} strong />
                        </Box>
                    </Box>

                    <Box className="no-print" sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ cursor: 'pointer', userSelect: 'none' }}
                            onClick={() => window.print()}
                        >
                            Print
                        </Typography>
                    </Box>
                </CardContent>
            </Card>
        </Box>
    );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
    return (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
            <Typography variant="body2" color={strong ? 'text.primary' : 'text.secondary'} fontWeight={strong ? 800 : 600}>
                {label}
            </Typography>
            <Typography variant="body2" fontWeight={strong ? 800 : 700}>
                {value}
            </Typography>
        </Box>
    );
}

