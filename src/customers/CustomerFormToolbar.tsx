import {
    FormHeaderToolbar,
    FORM_SAVE_CUSTOMER,
} from '../common/formToolbar';

type Props = {
    showDelete?: boolean;
};

export function CustomerFormToolbar({ showDelete }: Props) {
    return (
        <FormHeaderToolbar
            saveEventName={FORM_SAVE_CUSTOMER}
            resource="customers"
            listPath="/customers"
            showDelete={showDelete}
            deleteConfirmMessage="Delete this customer?"
            deleteSuccessMessage="Customer deleted"
        />
    );
}
