import BusinessIcon from '@mui/icons-material/Business';
import CompanyList from './CompanyList';
import CompanyEdit from './CompanyEdit';

export default {
    list: CompanyList,
    edit: CompanyEdit,
    icon: BusinessIcon,
    recordRepresentation: (record: any) =>
        record?.title ? `${record.title}` : `${record?.companyid ?? ''}`,
};

