import * as React from 'react';
import {
    FormHeaderToolbar,
    FormHeaderToolbarSettingsItem,
    FORM_SAVE_USER,
} from '../common/formToolbar';

type Props = {
    settingsItems?: FormHeaderToolbarSettingsItem[];
    showDelete?: boolean;
};

export function UserFormToolbar({ settingsItems, showDelete }: Props) {
    return (
        <FormHeaderToolbar
            saveEventName={FORM_SAVE_USER}
            resource="users"
            listPath="/users"
            showDelete={showDelete}
            deleteConfirmMessage="Delete this user?"
            deleteSuccessMessage="User deleted"
            settingsItems={settingsItems}
        />
    );
}
