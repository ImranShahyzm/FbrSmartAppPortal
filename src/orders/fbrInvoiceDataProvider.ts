/** Map react-admin form record ↔ .NET UpsertFbrInvoiceRequest. */

export type FbrInvoiceLineForm = {
    id?: string;
    productProfileId?: string;
    productNo?: string;
    productName?: string;
    quantity?: number;
    unitPrice?: number;
    taxRate?: number;
    fbrSalesTaxRateId?: number | null;
    /** Multiple FBR sales taxes (additive); chips in UI */
    fbrSalesTaxRateIds?: number[];
    /** Discount percent (0-100) */
    discountRate?: number;
    hsCode?: string;
    /** Legacy DB snapshot; not shown in invoice line grid */
    sroItemText?: string;
    /** Product profile free-text (display / optional column) */
    sroScheduleNoText?: string;
    sroItemRefText?: string;
    /** PDI transaction type description (FBR sale type) */
    fbrSaleTypeText?: string;
    remarks?: string;
};

function toIsoUtc(value: unknown): string | undefined {
    if (value == null || value === '') return undefined;
    if (typeof value === 'string') return value;
    if (value instanceof Date) return value.toISOString();
    return undefined;
}

function lineHasProduct(l: FbrInvoiceLineForm | undefined): boolean {
    const id = l?.productProfileId;
    if (id == null || id === '') return false;
    return String(id).replace(/-/g, '').length > 0;
}

/** Normalize API record so nested lines register correctly in react-hook-form (Guids, decimals). */
export function normalizeFbrInvoiceRecord(data: Record<string, unknown> | null | undefined) {
    if (!data || typeof data !== 'object') return data;
    const raw = (data.lines as FbrInvoiceLineForm[] | undefined) ?? [];
    const lines = raw.map(l => {
        const apiIds = (l as any).fbrSalesTaxRateIds as unknown;
        let fbrSalesTaxRateIds: number[] = [];
        if (Array.isArray(apiIds) && apiIds.length > 0) {
            fbrSalesTaxRateIds = apiIds.map(x => Number(x)).filter(x => Number.isFinite(x) && x > 0);
        } else if (
            (l as any).fbrSalesTaxRateId != null &&
            (l as any).fbrSalesTaxRateId !== ''
        ) {
            const one = Number((l as any).fbrSalesTaxRateId);
            if (Number.isFinite(one) && one > 0) fbrSalesTaxRateIds = [one];
        }
        return {
            id: l.id != null ? String(l.id) : undefined,
            productProfileId:
                l.productProfileId != null && l.productProfileId !== ''
                    ? String(l.productProfileId)
                    : '',
            productNo: l.productNo,
            productName: l.productName,
            quantity: Number(l.quantity) || 0,
            unitPrice: Number(l.unitPrice) || 0,
            taxRate: Number(l.taxRate) || 0,
            fbrSalesTaxRateId:
                (l as any).fbrSalesTaxRateId == null || (l as any).fbrSalesTaxRateId === ''
                    ? null
                    : Number((l as any).fbrSalesTaxRateId),
            fbrSalesTaxRateIds,
            discountRate: Number((l as any).discountRate) || 0,
            hsCode: l.hsCode ?? '',
            sroItemText: l.sroItemText ?? '',
            sroScheduleNoText: String((l as any).sroScheduleNoText ?? ''),
            sroItemRefText: String((l as any).sroItemRefText ?? ''),
            fbrSaleTypeText: String((l as any).fbrSaleTypeText ?? ''),
            remarks: l.remarks ?? '',
        };
    });
    const topId = (data as any).id ?? (data as any).Id;
    return {
        ...data,
        ...(topId != null && topId !== '' ? { id: String(topId) } : {}),
        lines,
        invoiceNumber: (data as any).invoiceNumber != null ? String((data as any).invoiceNumber) : '',
        reference:
            (data as any).reference == null || (data as any).reference === ''
                ? ''
                : String((data as any).reference),
        isLocked: Boolean((data as any).isLocked),
        fbrInvoiceNumber: (data as any).fbrInvoiceNumber ?? undefined,
        validatedAtUtc: (data as any).validatedAtUtc,
        postedAtUtc: (data as any).postedAtUtc,
        fbrLastError: (data as any).fbrLastError ?? null,
        fbrLastResponseJson: (data as any).fbrLastResponseJson ?? null,
        fbrScenarioId: (data as any).fbrScenarioId ?? null,
    };
}

export function mapFbrInvoiceToUpsertBody(data: Record<string, unknown>) {
    const linesRaw = (data.lines as FbrInvoiceLineForm[] | undefined) ?? [];
    const lines = linesRaw
        .filter(lineHasProduct)
        .map(l => {
            const fromArr =
                Array.isArray(l.fbrSalesTaxRateIds) && l.fbrSalesTaxRateIds.length > 0
                    ? l.fbrSalesTaxRateIds.map(x => Number(x)).filter(x => Number.isFinite(x) && x > 0)
                    : l.fbrSalesTaxRateId != null && Number(l.fbrSalesTaxRateId) > 0
                      ? [Number(l.fbrSalesTaxRateId)]
                      : [];
            return {
                productProfileId: String(l.productProfileId),
                quantity: Number(l.quantity) || 0,
                unitPrice: Number(l.unitPrice) || 0,
                taxRate: Number(l.taxRate) || 0,
                fbrSalesTaxRateId:
                    fromArr.length > 0 ? fromArr[0] : l.fbrSalesTaxRateId == null ? null : Number(l.fbrSalesTaxRateId),
                fbrSalesTaxRateIds: fromArr.length > 0 ? fromArr : undefined,
                discountRate: Number((l as any).discountRate) || 0,
                remarks: String(l.remarks ?? ''),
            };
        });

    const fbrScn = (data as any).fbrScenarioId;

    return {
        reference: data.reference as string | undefined,
        customerPartyId: Number(data.customerPartyId) || 0,
        invoiceDateUtc: toIsoUtc(data.invoiceDate),
        paymentTerms: (data.paymentTerms as string) ?? 'immediate',
        status: (data.status as string) ?? 'ordered',
        returned: false,
        deliveryFees: Number(data.deliveryFees) || 0,
        fbrScenarioId:
            fbrScn === '' || fbrScn === undefined || fbrScn === null ? null : Number(fbrScn),
        lines,
    };
}
