import * as React from 'react';
import { AutocompleteInput, ReferenceInput, SelectInput } from 'react-admin';
import { useFormContext, useWatch } from 'react-hook-form';
import { fetchFbrPdiSaleTypeRates } from '../api/fbrPdiApi';

export function FbrInvoiceTransTypeInput() {
    return (
        <ReferenceInput
            source="fbrPdiTransTypeId"
            reference="fbrPdiTransTypes"
            allowEmpty
            perPage={500}
        >
            <AutocompleteInput
                optionText="description"
                label="FBR transaction type (PDI)"
                filterToQuery={() => ({ q: '' })}
                fullWidth
                size="small"
            />
        </ReferenceInput>
    );
}

export function FbrInvoicePdiRateSelect() {
    const { control, setValue, getValues } = useFormContext();
    const transTypeId = useWatch({ control, name: 'fbrPdiTransTypeId' });
    const invoiceDate = useWatch({ control, name: 'invoiceDate' });
    const rateId = useWatch({ control, name: 'fbrPdiRateId' });
    const [choices, setChoices] = React.useState<Array<{ id: number; name: string }>>([]);
    const [valuesById, setValuesById] = React.useState<Record<number, number>>({});
    const lastAppliedRate = React.useRef<number | undefined>(undefined);
    const didMountRates = React.useRef(false);

    React.useEffect(() => {
        if (!transTypeId) {
            setChoices([]);
            setValuesById({});
            setValue('fbrPdiRateId', null);
            return;
        }
        let dateStr: string | undefined;
        if (invoiceDate instanceof Date && !Number.isNaN(invoiceDate.getTime())) {
            const y = invoiceDate.getFullYear();
            const m = String(invoiceDate.getMonth() + 1).padStart(2, '0');
            const d = String(invoiceDate.getDate()).padStart(2, '0');
            dateStr = `${y}-${m}-${d}`;
        } else if (typeof invoiceDate === 'string' && invoiceDate.length >= 10) {
            dateStr = invoiceDate.slice(0, 10);
        }
        if (didMountRates.current) {
            setValue('fbrPdiRateId', null);
        }
        didMountRates.current = true;

        let cancelled = false;
        void fetchFbrPdiSaleTypeRates(Number(transTypeId), dateStr)
            .then(rows => {
                if (cancelled) return;
                setChoices(
                    rows.map(r => ({
                        id: r.rateId,
                        name: `${r.rateDesc} (${r.rateValue})`,
                    }))
                );
                const m: Record<number, number> = {};
                rows.forEach(r => {
                    m[r.rateId] = r.rateValue;
                });
                setValuesById(m);
            })
            .catch(() => {
                if (!cancelled) {
                    setChoices([]);
                    setValuesById({});
                }
            });
        return () => {
            cancelled = true;
        };
    }, [transTypeId, invoiceDate, setValue]);

    React.useEffect(() => {
        if (rateId == null || rateId === '') {
            lastAppliedRate.current = undefined;
            return;
        }
        const id = Number(rateId);
        if (lastAppliedRate.current === id) return;
        const raw = valuesById[id];
        if (raw === undefined) return;
        lastAppliedRate.current = id;
        const mult = raw > 1 ? raw / 100 : raw;
        const lines = getValues('lines');
        if (!Array.isArray(lines) || lines.length === 0) return;
        setValue(
            'lines',
            lines.map((l: Record<string, unknown>) => ({ ...l, taxRate: mult })),
            { shouldDirty: true }
        );
    }, [rateId, valuesById, getValues, setValue]);

    return (
        <SelectInput
            source="fbrPdiRateId"
            label="FBR sale rate (PDI)"
            choices={choices}
            emptyText="Select rate"
            fullWidth
            size="small"
            disabled={!transTypeId}
        />
    );
}
