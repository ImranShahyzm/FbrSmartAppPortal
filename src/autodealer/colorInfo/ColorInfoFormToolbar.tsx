import {
    FormHeaderToolbar,
    FORM_SAVE_COLOR_INFORMATION,
} from '../../common/formToolbar';

type Props = {
    showDelete?: boolean;
};

export function ColorInformationFormToolbar({ showDelete }: Props) {
    return (
        <FormHeaderToolbar
            saveEventName={FORM_SAVE_COLOR_INFORMATION}
            resource="colorInformation"
            listPath="/colorInformation"
            showDelete={showDelete}
            deleteConfirmMessage="Delete this color information?"
            deleteSuccessMessage="Color information deleted"
        />
    );
}
