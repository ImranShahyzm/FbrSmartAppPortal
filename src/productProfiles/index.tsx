import Inventory2Icon from '@mui/icons-material/Inventory2';
import ProductProfileList from './ProductProfileList';
import ProductProfileCreate from './ProductProfileCreate';
import ProductProfileEdit from './ProductProfileEdit';

export default {
    list: ProductProfileList,
    create: ProductProfileCreate,
    edit: ProductProfileEdit,
    icon: Inventory2Icon,
    options: { label: 'Products' },
    recordRepresentation: (record: any) =>
        record?.productName ? `${record.productName}` : `${record?.id ?? ''}`,
};

