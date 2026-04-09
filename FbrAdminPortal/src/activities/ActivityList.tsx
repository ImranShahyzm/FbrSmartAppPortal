import * as React from 'react';
import { Datagrid, DateField, List, TextField } from 'react-admin';

export default function ActivityList() {
    return (
        <List perPage={100} sort={{ field: 'createdAtUtc', order: 'DESC' }}>
            <Datagrid bulkActionButtons={false}>
                <DateField source="createdAtUtc" label="When" showTime />
                <TextField source="adminEmail" label="Admin" />
                <TextField source="companyId" label="CompanyId" />
                <TextField source="action" label="Action" />
                <TextField source="notes" label="Notes" />
            </Datagrid>
        </List>
    );
}

