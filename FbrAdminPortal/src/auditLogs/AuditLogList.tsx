import * as React from 'react';
import { Datagrid, DateField, List, TextField, FunctionField } from 'react-admin';

export default function AuditLogList() {
    return (
        <List perPage={100} sort={{ field: 'createdAtUtc', order: 'DESC' }} title="Audit logs">
            <Datagrid bulkActionButtons={false}>
                <DateField source="createdAtUtc" label="When" showTime />
                <TextField source="adminEmail" label="Admin" />
                <TextField source="resource" label="Resource" />
                <TextField source="action" label="Action" />
                <TextField source="companyId" label="CompanyId" />
                <FunctionField
                    label="Payload"
                    render={r => {
                        const raw = (r as any)?.payloadJson;
                        if (!raw) return '';
                        const s = String(raw);
                        return s.length > 120 ? `${s.slice(0, 120)}…` : s;
                    }}
                />
            </Datagrid>
        </List>
    );
}

