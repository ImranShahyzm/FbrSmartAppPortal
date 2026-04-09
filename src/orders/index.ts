import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';

import FbrInvoiceList from './FbrInvoiceList';
import FbrInvoiceCreate from './FbrInvoiceCreate';
import OrderEdit from './OrderEdit';

export default {
    list: FbrInvoiceList,
    create: FbrInvoiceCreate,
    edit: OrderEdit,
    icon: ReceiptLongIcon,
    recordRepresentation: (record: {
        id?: string | number;
        invoiceNumber?: string;
        reference?: string;
    }) =>
        (record?.invoiceNumber || record?.reference || '').trim() || String(record?.id ?? ''),
};
