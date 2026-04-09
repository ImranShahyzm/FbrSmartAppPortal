import { Create, useTranslate, useDefaultTitle } from 'react-admin';

import { FbrInvoiceForm } from './FbrInvoiceForm';
import { mapFbrInvoiceToUpsertBody } from './fbrInvoiceDataProvider';

const transformCreate = (data: Record<string, unknown>) =>
    mapFbrInvoiceToUpsertBody({
        ...data,
        paymentTerms: (data.paymentTerms as string) ?? 'immediate',
        status: (data.status as string) ?? 'ordered',
        returned: false,
        deliveryFees: Number(data.deliveryFees) || 0,
    });

const CreateTitle = () => {
    const appTitle = useDefaultTitle();
    const translate = useTranslate();
    const title = translate('resources.fbrInvoices.create_title', { _: 'Create invoice' });
    return (
        <>
            <title>{`${appTitle} - ${title}`}</title>
            <span>{title}</span>
        </>
    );
};

export default function FbrInvoiceCreate() {
    return (
        <Create
            resource="fbrInvoices"
            redirect="edit"
            transform={transformCreate}
            title={<CreateTitle />}
            actions={false}
        >
            <FbrInvoiceForm mode="create" />
        </Create>
    );
}
