import * as React from 'react';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { useTranslate } from 'react-admin';

import CardWithIcon from './CardWithIcon';

export default function PendingPostings({ value }: { value?: number }) {
    const translate = useTranslate();
    return (
        <CardWithIcon
            to="/fbrInvoices"
            icon={CloudUploadIcon}
            title={translate('pos.dashboard.new_customers', { _: 'Pending FBR postings' })}
            subtitle={value ?? '—'}
        />
    );
}

