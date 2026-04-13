import * as React from 'react';
import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';

import { rupeesAmountToWords } from './glJournalVoucherAmountWords';

export type GlJournalVoucherPdfLine = {
    sno: number;
    code: string;
    accountTitle: string;
    narration: string;
    debit: string;
    credit: string;
};

export type GlJournalVoucherPdfSignature = {
    label: string;
};

export type GlJournalVoucherPdfProps = {
    companyName: string;
    voucherTitle: string;
    financialYear: string;
    userName: string;
    printDateText: string;
    postDateText: string;
    voucherNo: string;
    voucherDateText: string;
    statusLabel: string;
    lines: GlJournalVoucherPdfLine[];
    totalDr: number;
    totalCr: number;
    /** Printed above the first signature line (e.g. preparer). */
    preparedByName: string;
    signatures: GlJournalVoucherPdfSignature[];
};

const styles = StyleSheet.create({
    page: {
        padding: 28,
        fontSize: 9.5,
        color: '#111',
        fontFamily: 'Helvetica',
    },
    company: {
        fontSize: 14,
        fontWeight: 700,
        textAlign: 'center',
        marginBottom: 4,
    },
    docTitle: {
        fontSize: 11,
        fontWeight: 700,
        textAlign: 'center',
        marginBottom: 14,
    },
    metaGrid: {
        flexDirection: 'row',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#333',
    },
    metaCol: {
        flex: 1,
        padding: 8,
        borderRightWidth: 1,
        borderColor: '#333',
    },
    metaColLast: {
        flex: 1,
        padding: 8,
    },
    metaRow: { marginBottom: 4 },
    metaLabel: { fontSize: 8, color: '#444', marginBottom: 1 },
    metaValue: { fontSize: 9.5, fontWeight: 700 },
    table: {
        borderWidth: 1,
        borderColor: '#333',
    },
    th: {
        flexDirection: 'row',
        backgroundColor: '#f0f0f0',
        borderBottomWidth: 1,
        borderColor: '#333',
        paddingVertical: 5,
        paddingHorizontal: 4,
        fontWeight: 700,
        fontSize: 8.5,
    },
    tr: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderColor: '#ccc',
        paddingVertical: 5,
        paddingHorizontal: 4,
    },
    trLast: {
        flexDirection: 'row',
        paddingVertical: 5,
        paddingHorizontal: 4,
    },
    cSno: { width: '5%', textAlign: 'center', paddingRight: 2 },
    /** Long GL codes need a dedicated width + padding so they do not overlap the title column. */
    cCode: {
        width: '24%',
        paddingRight: 6,
        paddingLeft: 2,
        textAlign: 'left',
    },
    codeText: { fontSize: 7.5, lineHeight: 1.25 },
    cDesc: {
        width: '33%',
        paddingLeft: 4,
        paddingRight: 4,
        flexGrow: 0,
        flexShrink: 0,
    },
    cDr: { width: '19%', textAlign: 'right', paddingLeft: 4 },
    cCr: { width: '19%', textAlign: 'right', paddingLeft: 4 },
    accBold: { fontWeight: 700, fontSize: 9.5 },
    narr: { fontSize: 8, color: '#333', marginTop: 2 },
    totalRow: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderColor: '#333',
        paddingVertical: 6,
        paddingHorizontal: 4,
        fontWeight: 700,
        alignItems: 'center',
    },
    /** Align with S.No + Code + Description (5% + 24% + 33% = 62%). */
    totalLabel: { width: '62%', textAlign: 'center', fontSize: 9.5 },
    wordsRow: {
        borderTopWidth: 1,
        borderColor: '#333',
        padding: 6,
        fontSize: 8.5,
        fontWeight: 700,
    },
    sigRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 28,
        gap: 8,
    },
    sigCell: {
        flex: 1,
        alignItems: 'center',
    },
    preparedName: {
        fontSize: 9,
        fontWeight: 700,
        marginBottom: 4,
        textAlign: 'center',
    },
    sigLine: {
        borderTopWidth: 1,
        borderColor: '#000',
        width: '100%',
        marginBottom: 4,
    },
    sigLabel: {
        fontSize: 8,
        fontWeight: 700,
        textAlign: 'center',
    },
});

export function GlJournalVoucherPdfDocument(props: GlJournalVoucherPdfProps) {
    const {
        companyName,
        voucherTitle,
        financialYear,
        userName,
        printDateText,
        postDateText,
        voucherNo,
        voucherDateText,
        statusLabel,
        lines,
        totalDr,
        totalCr,
        preparedByName,
        signatures,
    } = props;

    const amountWords = rupeesAmountToWords(Math.max(totalDr, totalCr));

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <Text style={styles.company}>{companyName}</Text>
                <Text style={styles.docTitle}>{voucherTitle}</Text>

                <View style={styles.metaGrid}>
                    <View style={styles.metaCol}>
                        <View style={styles.metaRow}>
                            <Text style={styles.metaLabel}>Financial Year</Text>
                            <Text style={styles.metaValue}>{financialYear}</Text>
                        </View>
                        <View style={styles.metaRow}>
                            <Text style={styles.metaLabel}>User Name</Text>
                            <Text style={styles.metaValue}>{userName}</Text>
                        </View>
                        <View style={styles.metaRow}>
                            <Text style={styles.metaLabel}>Print Date</Text>
                            <Text style={styles.metaValue}>{printDateText}</Text>
                        </View>
                        <View style={styles.metaRow}>
                            <Text style={styles.metaLabel}>Post Date</Text>
                            <Text style={styles.metaValue}>{postDateText}</Text>
                        </View>
                    </View>
                    <View style={styles.metaColLast}>
                        <View style={styles.metaRow}>
                            <Text style={styles.metaLabel}>Voucher No</Text>
                            <Text style={styles.metaValue}>{voucherNo}</Text>
                        </View>
                        <View style={styles.metaRow}>
                            <Text style={styles.metaLabel}>Date</Text>
                            <Text style={styles.metaValue}>{voucherDateText}</Text>
                        </View>
                        <View style={styles.metaRow}>
                            <Text style={styles.metaLabel}>Status</Text>
                            <Text style={styles.metaValue}>{statusLabel}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.table}>
                    <View style={styles.th}>
                        <Text style={styles.cSno}>S.No</Text>
                        <Text style={[styles.cCode, { fontSize: 8.5 }]}>Code</Text>
                        <Text style={styles.cDesc}>Account Name / Description</Text>
                        <Text style={styles.cDr}>Debit</Text>
                        <Text style={styles.cCr}>Credit</Text>
                    </View>
                    {lines.map((ln, i) => (
                        <View key={i} style={i === lines.length - 1 ? styles.trLast : styles.tr} wrap={false}>
                            <Text style={styles.cSno}>{ln.sno}</Text>
                            <View style={styles.cCode}>
                                <Text style={styles.codeText}>{ln.code}</Text>
                            </View>
                            <View style={styles.cDesc}>
                                <Text style={styles.accBold}>{ln.accountTitle}</Text>
                                {ln.narration ? <Text style={styles.narr}>{ln.narration}</Text> : null}
                            </View>
                            <Text style={styles.cDr}>{ln.debit}</Text>
                            <Text style={styles.cCr}>{ln.credit}</Text>
                        </View>
                    ))}
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Total</Text>
                        <Text style={[styles.cDr, { fontSize: 9.5 }]}>{totalDr.toFixed(2)}</Text>
                        <Text style={[styles.cCr, { fontSize: 9.5 }]}>{totalCr.toFixed(2)}</Text>
                    </View>
                    <View style={styles.wordsRow}>
                        <Text>{amountWords}</Text>
                    </View>
                </View>

                <View style={styles.sigRow}>
                    {signatures.map((sig, idx) => (
                        <View key={idx} style={styles.sigCell}>
                            {idx === 0 && preparedByName ? (
                                <Text style={styles.preparedName}>{preparedByName}</Text>
                            ) : (
                                <Text style={styles.preparedName}> </Text>
                            )}
                            <View style={styles.sigLine} />
                            <Text style={styles.sigLabel}>{sig.label}</Text>
                        </View>
                    ))}
                </View>
            </Page>
        </Document>
    );
}
