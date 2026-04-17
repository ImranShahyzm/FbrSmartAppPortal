import PeopleIcon from '@mui/icons-material/People';
import SalesServiceInformationList from './VehicleGroupInfoList';
import SalesServiceInformationEdit from './VehicleGroupInfoEdit';
import SalesServiceInformationCreate from './VehicleGroupInfoCreate';

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