import { 
    FormHeaderToolbar, 
    FORM_SAVE_CUSTOMER, 
} from '../../common/formToolbar';

type Props = {
    showDelete?: boolean;
};

export function VehicleGroupInformationFormToolbar({ showDelete }: Props) {
    return (
        <FormHeaderToolbar
            saveEventName={FORM_SAVE_CUSTOMER}
            resource="vehicleGroupInfo"           // Updated resource name
            listPath="/vehicleGroupInfo"          // Updated list path
            showDelete={showDelete}
            deleteConfirmMessage="Delete this vehicle group information?"
            deleteSuccessMessage="Vehicle group information deleted"
        />
    );
}