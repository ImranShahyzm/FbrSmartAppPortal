import * as React from 'react';
import {
    Document,
    Image,
    Page,
    StyleSheet,
    Text,
    View,
} from '@react-pdf/renderer';

import { FbrWelcomeLogoPdf } from './FbrWelcomeLogoPdf';

// Keep it simple + close to InvoiceShow.tsx layout.
// Note: @react-pdf uses its own layout engine; styles differ from MUI.

type Line = {
    productNo?: string;
    productName?: string;
    hsCode?: string;
    sroItemText?: string;
    sroScheduleNoText?: string;
    sroItemRefText?: string;
    fbrSaleTypeText?: string;
    remarks?: string;
    quantity?: number;
    unitPrice?: number;
    taxRate?: number;
    discountRate?: number;
};

export type FbrInvoicePdfProps = {
    sellerName?: string;
    sellerAddress?: string;
    sellerNtn?: string;
    sellerPhone?: string;
    /** System number e.g. INV00001 */
    invoiceNumber?: string;
    /** User / external reference */
    reference?: string;
    invoiceDate?: string;
    paymentTerms?: string;
    statusLabel?: string;
    returned?: boolean;
    deliveryFees?: number;
    fbrInvoiceNumber?: string;
    scenarioText?: string;
    customerName?: string;
    customerAddress?: string;
    customerNtn?: string;
    customerPhone?: string;
    fbrError?: string | null;
    lines: Line[];
    totalExTaxes?: number;
    taxes?: number;
    total?: number;
    qrDataUrl?: string | null;
};

const styles = StyleSheet.create({
    page: {
        padding: 24,
        fontSize: 10.5,
        color: '#111',
        fontFamily: 'Helvetica',
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 12,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        flexShrink: 0,
        gap: 8,
    },
    title: { fontSize: 20, fontWeight: 700 },
    subtitle: { fontSize: 11, color: '#666' },
    section: { marginTop: 12 },
    card: {
        borderWidth: 1,
        borderColor: '#E5E5E5',
        borderRadius: 8,
        padding: 12,
    },
    row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
    col: { flexGrow: 1 },
    label: { color: '#666', marginBottom: 2 },
    value: { fontSize: 11.5, fontWeight: 700 },
    hr: { marginVertical: 10, borderBottomWidth: 1, borderBottomColor: '#EEE' },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#F5F5F5',
        borderTopLeftRadius: 6,
        borderTopRightRadius: 6,
        borderWidth: 1,
        borderColor: '#EEE',
        paddingVertical: 6,
        paddingHorizontal: 6,
        fontWeight: 700,
    },
    tableRow: {
        flexDirection: 'row',
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderBottomWidth: 1,
        borderColor: '#EEE',
        paddingVertical: 6,
        paddingHorizontal: 6,
    },
    cellDesc: { width: '42%' },
    cell: { width: '14%', textAlign: 'right' },
    small: { fontSize: 9.5, color: '#666' },
    totalsBox: { width: 220, marginLeft: 'auto', marginTop: 10 },
    totalsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
    errorBox: { marginTop: 10, borderWidth: 1, borderColor: '#F2B8B5', backgroundColor: '#FDECEA', borderRadius: 8, padding: 10 },
    /** Compact for print — aligned in height with logo cluster */
    qr: { width: 96, height: 96, borderWidth: 1, borderColor: '#EEE', borderRadius: 6 },
});

function money(n: any) {
    const v = Number(n) || 0;
    return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function percent(rate: any) {
    const v = Number(rate) || 0;
    return `${(v * 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}%`;
}

export function FbrInvoicePdf(props: FbrInvoicePdfProps) {
    const {
        sellerName,
        sellerAddress,
        sellerNtn,
        sellerPhone,
        invoiceNumber,
        reference,
        invoiceDate,
        paymentTerms,
        statusLabel,
        returned,
        deliveryFees,
        fbrInvoiceNumber,
        scenarioText,
        customerName,
        customerAddress,
        customerNtn,
        customerPhone,
        fbrError,
        lines,
        totalExTaxes,
        taxes,
        total,
        qrDataUrl,
    } = props;

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <View style={styles.headerRow}>
                    <View style={{ flexGrow: 1 }}>
                        <Text style={styles.subtitle}>Invoice</Text>
                        <Text style={styles.title}>{invoiceNumber?.trim() || reference || '—'}</Text>
                        {reference?.trim() && reference.trim() !== invoiceNumber?.trim() ? (
                            <Text style={styles.subtitle}>Reference: {reference.trim()}</Text>
                        ) : null}
                        <Text style={styles.subtitle}>Date: {invoiceDate || '—'}</Text>
                        {fbrInvoiceNumber ? (
                            <Text style={styles.subtitle}>FBR Invoice No: {fbrInvoiceNumber}</Text>
                        ) : null}
                    </View>
                    <View style={styles.headerRight}>
                        <FbrWelcomeLogoPdf width={100} height={50} />
                        {qrDataUrl ? <Image src={qrDataUrl} style={styles.qr} /> : null}
                    </View>
                </View>

                <View style={[styles.section, styles.card]}>
                    {/* Seller (left) / Customer (right) — Odoo-like invoice header blocks */}
                    <View style={styles.row}>
                        <View style={[styles.col, { flexBasis: 0 }]}>
                            <Text style={styles.label}>Seller</Text>
                            <Text style={styles.value}>{sellerName || '—'}</Text>
                            {sellerAddress ? <Text style={styles.small}>{sellerAddress}</Text> : null}
                            <Text style={styles.small}>
                                {sellerNtn ? `NTN: ${sellerNtn}  ` : ''}
                                {sellerPhone ? `Phone: ${sellerPhone}` : ''}
                            </Text>
                        </View>
                        <View style={[styles.col, { flexBasis: 0 }]}>
                            <Text style={styles.label}>Customer</Text>
                            <Text style={styles.value}>{customerName || '—'}</Text>
                            {customerAddress ? <Text style={styles.small}>{customerAddress}</Text> : null}
                            <Text style={styles.small}>
                                {customerNtn ? `NTN: ${customerNtn}  ` : ''}
                                {customerPhone ? `Phone: ${customerPhone}` : ''}
                            </Text>
                        </View>
                    </View>

                    <View style={[styles.row, { marginTop: 10 }]}>
                        <View style={styles.col}>
                            <Text style={styles.label}>Payment terms</Text>
                            <Text style={styles.value}>{paymentTerms || '—'}</Text>
                        </View>
                        <View style={styles.col}>
                            <Text style={styles.label}>Scenario</Text>
                            <Text style={styles.value}>{scenarioText || '—'}</Text>
                        </View>
                    </View>

                    <View style={[styles.row, { marginTop: 10 }]}>
                        <View style={styles.col}>
                            <Text style={styles.label}>Status</Text>
                            <Text style={styles.value}>{statusLabel || '—'}</Text>
                        </View>
                        <View style={styles.col}>
                            <Text style={styles.label}>Returned</Text>
                            <Text style={styles.value}>{returned ? 'Yes' : 'No'}</Text>
                        </View>
                        <View style={styles.col}>
                            <Text style={styles.label}>Delivery</Text>
                            <Text style={styles.value}>{money(deliveryFees)}</Text>
                        </View>
                    </View>
                </View>

                {fbrError ? (
                    <View style={styles.errorBox}>
                        <Text style={{ fontWeight: 700 }}>FBR Error</Text>
                        <Text>{fbrError}</Text>
                    </View>
                ) : null}

                <View style={styles.section}>
                    <View style={styles.tableHeader}>
                        <Text style={styles.cellDesc}>Description</Text>
                        <Text style={styles.cell}>Qty</Text>
                        <Text style={styles.cell}>Unit</Text>
                        <Text style={styles.cell}>Disc%</Text>
                        <Text style={styles.cell}>Tax</Text>
                        <Text style={styles.cell}>Total</Text>
                    </View>
                    {lines.map((l, i) => {
                        const qty = Number(l.quantity) || 0;
                        const unit = Number(l.unitPrice) || 0;
                        const discPct = Math.max(0, Math.min(100, Number(l.discountRate) || 0));
                        const net = qty * unit * (1 - discPct / 100);
                        const tax = net * (Number(l.taxRate) || 0);
                        const gross = net + tax;
                        const desc = l.productNo && l.productName ? `[${l.productNo}] ${l.productName}` : l.productName || l.productNo || '';
                        return (
                            <View key={i} style={styles.tableRow}>
                                <View style={styles.cellDesc}>
                                    <Text>{desc}</Text>
                                    {(
                                        l.hsCode ||
                                        l.sroScheduleNoText ||
                                        l.sroItemRefText ||
                                        l.fbrSaleTypeText ||
                                        l.sroItemText ||
                                        l.remarks
                                    ) ? (
                                        <Text style={styles.small}>
                                            {l.hsCode ? `HS: ${l.hsCode}  ` : ''}
                                            {l.sroScheduleNoText
                                                ? `Sro Sched: ${l.sroScheduleNoText}  `
                                                : ''}
                                            {l.sroItemRefText ? `Sro Item: ${l.sroItemRefText}  ` : ''}
                                            {l.fbrSaleTypeText ? `FBR Sale type: ${l.fbrSaleTypeText}  ` : ''}
                                            {!l.sroScheduleNoText && !l.sroItemRefText && l.sroItemText
                                                ? `SRO: ${l.sroItemText}  `
                                                : ''}
                                            {l.remarks ? `Remarks: ${l.remarks}` : ''}
                                        </Text>
                                    ) : null}
                                </View>
                                <Text style={styles.cell}>{qty.toLocaleString(undefined, { maximumFractionDigits: 4 })}</Text>
                                <Text style={styles.cell}>{money(unit)}</Text>
                                <Text style={styles.cell}>{discPct ? discPct.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '0'}</Text>
                                <Text style={styles.cell}>{percent(l.taxRate)}</Text>
                                <Text style={styles.cell}>{money(gross)}</Text>
                            </View>
                        );
                    })}
                </View>

                <View style={styles.totalsBox}>
                    <View style={styles.totalsRow}>
                        <Text style={styles.label}>Sum</Text>
                        <Text style={{ fontWeight: 700 }}>{money(totalExTaxes)}</Text>
                    </View>
                    <View style={styles.totalsRow}>
                        <Text style={styles.label}>Tax</Text>
                        <Text style={{ fontWeight: 700 }}>{money(taxes)}</Text>
                    </View>
                    <View style={styles.totalsRow}>
                        <Text style={styles.label}>Delivery</Text>
                        <Text style={{ fontWeight: 700 }}>{money(deliveryFees)}</Text>
                    </View>
                    <View style={styles.hr} />
                    <View style={styles.totalsRow}>
                        <Text style={{ fontWeight: 800 }}>Total</Text>
                        <Text style={{ fontWeight: 800 }}>{money(total)}</Text>
                    </View>
                </View>
            </Page>
        </Document>
    );
}

