import PeopleIcon from '@mui/icons-material/People';
import CustomerList from './CustomerList';
import CustomerCreate from './CustomerCreate';
import CustomerEdit from './CustomerEdit';

const resource = {
    list: CustomerList,
    create: CustomerCreate,
    edit: CustomerEdit,
    icon: PeopleIcon,
    recordRepresentation: (record: any) => record?.partyName ?? record?.partyBusinessName ?? record?.id,
};

export default resource;

