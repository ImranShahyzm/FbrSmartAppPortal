import * as React from 'react';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import { useTranslate } from 'react-admin';

import CardWithIcon from './CardWithIcon';

export default function PendingValidations({ value }: { value?: number }) {
    const translate = useTranslate();
    return (
        <CardWithIcon
            to="/fbrInvoices"
            icon={FactCheckIcon}
            title={translate('pos.dashboard.pending_reviews', { _: 'Pending validations' })}
            subtitle={value ?? '—'}
        />
    );
}

