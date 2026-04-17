import PeopleIcon from '@mui/icons-material/People';
import SalesServiceInformationList from './SalesServiceInfoList';
import SalesServiceInformationEdit from './SalesServiceInfoEdit';
import SalesServiceInformationCreate from './SalesServiceInfoCreate';

const resource = {
    list: SalesServiceInformationList,
    create: SalesServiceInformationCreate,
    edit: SalesServiceInformationEdit,

    icon: PeopleIcon,
    recordRepresentation: (record: any) => 
        record?.saleServiceName ?? 
        record?.saleServiceAccountNumber ?? 
        record?.id ?? 
        'Sales Service',
};

export default resource;