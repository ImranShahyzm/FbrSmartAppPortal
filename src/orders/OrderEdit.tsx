import { Edit, useDefaultTitle, useTranslate } from 'react-admin';

import { FbrInvoiceForm } from './FbrInvoiceForm';
import { mapFbrInvoiceToUpsertBody } from './fbrInvoiceDataProvider';

const OrderTitle = () => {
    const appTitle = useDefaultTitle();
    const translate = useTranslate();
    const title = translate('resources.fbrInvoices.name', { smart_count: 1, _: 'FBR Invoice' });
    return (
        <>
            <title>{`${appTitle} - ${title}`}</title>
            <span>{title}</span>
        </>
    );
};

const OrderEdit = () => (
    <Edit
        resource="fbrInvoices"
        title={<OrderTitle />}
        component="div"
        sx={{ '& .RaEdit-main': { maxWidth: '100%', height: 'calc(100vh - 64px)', overflow: 'hidden' } }}
        mutationMode="pessimistic"
        redirect={false}
        actions={false}
        transform={data => mapFbrInvoiceToUpsertBody(data as Record<string, unknown>)}
    >
        <FbrInvoiceForm mode="edit" />
    </Edit>
);

export default OrderEdit;
