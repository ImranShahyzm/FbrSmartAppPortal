import {
    FormHeaderToolbar,
    FORM_SAVE_CUSTOMER,
} from '../../common/formToolbar';

type Props = {
    showDelete?: boolean;
};

export function ColorInformationFormToolbar({ showDelete }: Props) {
    return (
        <FormHeaderToolbar
            saveEventName={FORM_SAVE_CUSTOMER}
            resource="colorInformation"
            listPath="/colorInformation"
            showDelete={showDelete}
            deleteConfirmMessage="Delete this color information?"
            deleteSuccessMessage="Color information deleted"
        />
    );
}
