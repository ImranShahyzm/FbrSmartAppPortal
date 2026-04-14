import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';

export type TrialBalancePdfRow = {
    account: string;
    opening: string;
    debit: string;
    credit: string;
    end: string;
};

export type TrialBalancePdfProps = {
    title: string;
    periodLine: string;
    dateRangeLine: string;
    postedLine: string;
    columnLabels: {
        account: string;
        opening: string;
        debit: string;
        credit: string;
        end: string;
    };
    rows: TrialBalancePdfRow[];
};

const styles = StyleSheet.create({
    page: { padding: 32, fontSize: 8.5, fontFamily: 'Helvetica', color: '#111' },
    title: { fontSize: 14, fontWeight: 700, textAlign: 'center', marginBottom: 4 },
    meta: { fontSize: 9, color: '#444', textAlign: 'center', marginBottom: 2 },
    metaLast: { fontSize: 9, color: '#444', textAlign: 'center', marginBottom: 12 },
    table: { borderWidth: 1, borderColor: '#333' },
    th: {
        flexDirection: 'row',
        backgroundColor: '#f8f9fa',
        borderBottomWidth: 1,
        borderColor: '#333',
        paddingVertical: 5,
        paddingHorizontal: 4,
        fontWeight: 700,
        fontSize: 8,
    },
    tr: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderColor: '#ddd',
        paddingVertical: 3,
        paddingHorizontal: 4,
        fontSize: 7.5,
    },
    cAcc: { width: '34%', textAlign: 'left', paddingRight: 4 },
    cNum: { width: '16.5%', textAlign: 'right', paddingLeft: 2 },
});

const ROWS_PER_PAGE = 42;

function chunkRows<T>(items: T[], size: number): T[][] {
    if (items.length === 0) return [];
    const out: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
        out.push(items.slice(i, i + size));
    }
    return out;
}

export function TrialBalancePdfDocument(props: TrialBalancePdfProps) {
    const { title, periodLine, dateRangeLine, postedLine, columnLabels, rows } = props;
    const pages = chunkRows(rows, ROWS_PER_PAGE);

    return (
        <Document>
            {pages.map((pageRows, pi) => (
                <Page key={pi} size="A4" style={styles.page}>
                    {pi === 0 ? (
                        <>
                            <Text style={styles.title}>{title}</Text>
                            <Text style={styles.meta}>{periodLine}</Text>
                            <Text style={styles.meta}>{dateRangeLine}</Text>
                            <Text style={styles.metaLast}>{postedLine}</Text>
                        </>
                    ) : (
                        <Text style={styles.metaLast}>
                            {title} ({pi + 1}/{pages.length})
                        </Text>
                    )}

                    <View style={styles.table}>
                        <View style={styles.th}>
                            <Text style={styles.cAcc}>{columnLabels.account}</Text>
                            <Text style={styles.cNum}>{columnLabels.opening}</Text>
                            <Text style={styles.cNum}>{columnLabels.debit}</Text>
                            <Text style={styles.cNum}>{columnLabels.credit}</Text>
                            <Text style={styles.cNum}>{columnLabels.end}</Text>
                        </View>
                        {pageRows.map((r, i) => {
                            const last = i === pageRows.length - 1 && pi === pages.length - 1;
                            return (
                                <View key={i} style={last ? { ...styles.tr, borderBottomWidth: 0 } : styles.tr} wrap={false}>
                                    <Text style={styles.cAcc}>{r.account}</Text>
                                    <Text style={styles.cNum}>{r.opening}</Text>
                                    <Text style={styles.cNum}>{r.debit}</Text>
                                    <Text style={styles.cNum}>{r.credit}</Text>
                                    <Text style={styles.cNum}>{r.end}</Text>
                                </View>
                            );
                        })}
                    </View>
                </Page>
            ))}
        </Document>
    );
}
