import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import UserList from './UserList';
import UserCreate from './UserCreate';
import UserEdit from './UserEdit';

export default {
    list: UserList,
    create: UserCreate,
    edit: UserEdit,
    icon: PersonOutlineIcon,
    recordRepresentation: (record: { fullName?: string; username?: string }) =>
        record?.fullName?.trim() || record?.username || '',
};
