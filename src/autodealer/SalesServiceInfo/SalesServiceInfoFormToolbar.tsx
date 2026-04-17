import { 
    FormHeaderToolbar, 
    FORM_SAVE_CUSTOMER, 
} from '../../common/formToolbar';

type Props = {
    showDelete?: boolean;
};

export function SalesServiceInformationFormToolbar({ showDelete }: Props) {
    return (
        <FormHeaderToolbar
            saveEventName={FORM_SAVE_CUSTOMER}
            resource="salesServiceInfo"           // Updated resource name
            listPath="/salesServiceInfo"          // Updated list path
            showDelete={showDelete}
            deleteConfirmMessage="Delete this sales service information?"
            deleteSuccessMessage="Sales service information deleted"
        />
    );
}