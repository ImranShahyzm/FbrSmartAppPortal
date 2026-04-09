import * as React from 'react';
import { useSaveContext } from 'react-admin';
import { useFormContext } from 'react-hook-form';

/**
 * Place inside react-admin SimpleForm / TabbedForm. Header Save icon dispatches a window event;
 * this bridge calls the form save handler (toolbar can be false).
 */
export function FormSaveBridge(props: { eventName: string }) {
    const { handleSubmit } = useFormContext();
    const { save } = useSaveContext();

    React.useEffect(() => {
        const onSave = () => {
            if (!save) return;
            // Do not pass onSuccess here: it replaces react-admin create/update success handlers
            // and blocks redirect after create. Cache invalidation is handled by the dataProvider mutation.
            handleSubmit(values => save(values))();
        };
        window.addEventListener(props.eventName, onSave);
        return () => window.removeEventListener(props.eventName, onSave);
    }, [handleSubmit, save, props.eventName]);

    return null;
}
