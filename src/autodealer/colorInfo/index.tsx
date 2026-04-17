import PeopleIcon from '@mui/icons-material/People';
import ColorInformationList from './ColorInfoList';
import ColorInformationEdit from './ColorInfoEdit';
import ColorInformation from './ColorInfoCreate';
const resource = {
    list: ColorInformationList,
    create: ColorInformation,
    edit: ColorInformationEdit,

    icon: PeopleIcon,
    recordRepresentation: (record: any) => record?.partyName ?? record?.partyBusinessName ?? record?.id,
};

export default resource;

