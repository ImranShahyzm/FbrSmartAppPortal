import * as React from 'react';
import { FormHeaderToolbar, FORM_SAVE_ADMIN_USER } from '../common/formToolbar';

export function AdminUserFormToolbar(props: { showDelete?: boolean; disableDelete?: boolean }) {
    return (
        <FormHeaderToolbar
            saveEventName={FORM_SAVE_ADMIN_USER}
            resource="admin-users"
            listPath="/admin-users"
            showDelete={props.showDelete}
            disableDelete={props.disableDelete}
            deleteConfirmMessage="Delete this admin user?"
            deleteSuccessMessage="Admin user deleted"
        />
    );
}
