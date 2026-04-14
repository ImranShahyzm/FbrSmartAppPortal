import { Document, Page, StyleSheet, Text, View, type ViewProps } from '@react-pdf/renderer';

export type AccountLedgerPdfLine = {
    type: string;
    vNo: string;
    date: string;
    narration: string;
    partner?: string;
    scheme?: string;
    debit: string;
    credit: string;
    balance: string;
};

export type AccountLedgerPdfProps = {
    title: string;
    accountLine: string;
    dateRangeLine: string;
    postedLine: string;
    showPartner?: boolean;
    showScheme?: boolean;
    columnLabels: {
        type: string;
        vNo: string;
        date: string;
        narration: string;
        partner: string;
        scheme: string;
        debit: string;
        credit: string;
        balance: string;
    };
    openingLabel: string;
    openingBalance: string;
    lines: AccountLedgerPdfLine[];
};

const styles = StyleSheet.create({
    page: { padding: 28, fontSize: 7.5, fontFamily: 'Helvetica', color: '#111' },
    title: { fontSize: 12, fontFamily: 'Helvetica-Bold', textAlign: 'center', marginBottom: 3 },
    /** Slightly softer than the main title */
    account: { fontSize: 10, fontFamily: 'Helvetica-Bold', textAlign: 'center', marginBottom: 2, opacity: 0.88 },
    meta: { fontSize: 8, color: '#444', textAlign: 'center', marginBottom: 2 },
    metaLast: { fontSize: 8, color: '#444', textAlign: 'center', marginBottom: 10 },
    table: { borderWidth: 1, borderColor: '#333' },
    th: {
        flexDirection: 'row',
        backgroundColor: '#f0f0f0',
        borderBottomWidth: 1,
        borderColor: '#333',
        paddingVertical: 3,
        paddingHorizontal: 2,
        fontSize: 7,
    },
    tr: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderColor: '#ddd',
        paddingVertical: 2,
        paddingHorizontal: 2,
        fontSize: 7,
    },
    openRow: {
        flexDirection: 'row',
        backgroundColor: '#f8f8f8',
        paddingVertical: 3,
        paddingHorizontal: 2,
        borderBottomWidth: 1,
        borderColor: '#333',
    },
    cNum: { width: '12%', flexShrink: 0, paddingRight: 2 },
});

const textBody = { fontSize: 7, fontFamily: 'Helvetica' as const };
const textHead = { fontSize: 7, fontFamily: 'Helvetica-Bold' as const };

type ColStyle = NonNullable<ViewProps['style']>;

/** Keeps each column clipped so long voucher numbers do not overlap the next column */
function PdfCol({
    w,
    children,
    align = 'left',
    bold = false,
}: {
    w: ColStyle;
    children: string;
    align?: 'left' | 'right';
    bold?: boolean;
}) {
    const t = bold ? textHead : textBody;
    return (
        <View style={w}>
            <Text style={{ ...t, textAlign: align }} wrap>
                {children}
            </Text>
        </View>
    );
}

function colWidths(showPartner: boolean, showScheme: boolean) {
    const left = { textAlign: 'left' as const };
    const base = { flexShrink: 0 as const, paddingRight: 2 };
    const unused: ColStyle = { width: 0, minWidth: 0, padding: 0, overflow: 'hidden' };
    if (showPartner && showScheme) {
        return {
            cType: { width: '6%', ...base },
            cVno: { width: '11%', ...base },
            cDate: { width: '7%', ...base },
            cNarr: { width: '25%', ...base, ...left },
            cPartner: { width: '8%', ...base, ...left },
            cScheme: { width: '7%', ...base, ...left },
            cNum: styles.cNum,
        };
    }
    if (showPartner || showScheme) {
        return {
            cType: { width: '7%', ...base },
            cVno: { width: '12%', ...base },
            cDate: { width: '8%', ...base },
            cNarr: { width: '27%', ...base, ...left },
            cPartner: { width: '10%', ...base, ...left },
            cScheme: { width: '10%', ...base, ...left },
            cNum: styles.cNum,
        };
    }
    return {
        cType: { width: '7%', ...base },
        cVno: { width: '13%', ...base },
        cDate: { width: '9%', ...base },
        cNarr: { width: '35%', ...base, ...left },
        cPartner: unused,
        cScheme: unused,
        cNum: styles.cNum,
    };
}

const ROWS_PER_PAGE = 36;

function chunk<T>(items: T[], size: number): T[][] {
    if (items.length === 0) return [];
    const out: T[][] = [];
    for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
    return out;
}

export function AccountLedgerPdfDocument(props: AccountLedgerPdfProps) {
    const {
        title,
        accountLine,
        dateRangeLine,
        postedLine,
        columnLabels,
        openingLabel,
        openingBalance,
        lines,
        showPartner = false,
        showScheme = false,
    } = props;
    const cw = colWidths(showPartner, showScheme);

    const bodyRows = [
        {
            type: '',
            vNo: '',
            date: '',
            narration: openingLabel,
            partner: showPartner ? '' : undefined,
            scheme: showScheme ? '' : undefined,
            debit: '—',
            credit: '—',
            balance: openingBalance,
        },
        ...lines,
    ];
    const pages = chunk(bodyRows, ROWS_PER_PAGE);

    return (
        <Document>
            {pages.map((pageRows, pi) => (
                <Page key={pi} size="A4" style={styles.page}>
                    {pi === 0 ? (
                        <>
                            <Text style={styles.title}>{title}</Text>
                            <Text style={styles.account}>{accountLine}</Text>
                            <Text style={styles.meta}>{dateRangeLine}</Text>
                            <Text style={styles.metaLast}>{postedLine}</Text>
                        </>
                    ) : (
                        <Text style={styles.metaLast}>
                            {title} — {accountLine} ({pi + 1}/{pages.length})
                        </Text>
                    )}
                    <View style={styles.table}>
                        <View style={styles.th}>
                            <PdfCol w={cw.cType} bold>
                                {columnLabels.type}
                            </PdfCol>
                            <PdfCol w={cw.cVno} bold>
                                {columnLabels.vNo}
                            </PdfCol>
                            <PdfCol w={cw.cDate} bold>
                                {columnLabels.date}
                            </PdfCol>
                            <PdfCol w={cw.cNarr} bold>
                                {columnLabels.narration}
                            </PdfCol>
                            {showPartner ? (
                                <PdfCol w={cw.cPartner} bold>
                                    {columnLabels.partner}
                                </PdfCol>
                            ) : null}
                            {showScheme ? (
                                <PdfCol w={cw.cScheme} bold>
                                    {columnLabels.scheme}
                                </PdfCol>
                            ) : null}
                            <PdfCol w={cw.cNum} align="right" bold>
                                {columnLabels.debit}
                            </PdfCol>
                            <PdfCol w={cw.cNum} align="right" bold>
                                {columnLabels.credit}
                            </PdfCol>
                            <PdfCol w={cw.cNum} align="right" bold>
                                {columnLabels.balance}
                            </PdfCol>
                        </View>
                        {pageRows.map((r, i) => (
                            <View key={i} style={pi === 0 && i === 0 ? styles.openRow : styles.tr} wrap={false}>
                                <PdfCol w={cw.cType}>{r.type}</PdfCol>
                                <PdfCol w={cw.cVno}>{r.vNo}</PdfCol>
                                <PdfCol w={cw.cDate}>{r.date}</PdfCol>
                                <PdfCol w={cw.cNarr}>{r.narration}</PdfCol>
                                {showPartner ? <PdfCol w={cw.cPartner}>{r.partner ?? '—'}</PdfCol> : null}
                                {showScheme ? <PdfCol w={cw.cScheme}>{r.scheme ?? '—'}</PdfCol> : null}
                                <PdfCol w={cw.cNum} align="right">
                                    {r.debit}
                                </PdfCol>
                                <PdfCol w={cw.cNum} align="right">
                                    {r.credit}
                                </PdfCol>
                                <PdfCol w={cw.cNum} align="right">
                                    {r.balance}
                                </PdfCol>
                            </View>
                        ))}
                    </View>
                </Page>
            ))}
        </Document>
    );
}
