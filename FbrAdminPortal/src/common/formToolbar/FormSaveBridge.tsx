import * as React from 'react';
import { useSaveContext } from 'react-admin';
import { useFormContext } from 'react-hook-form';

/** Company edit: logo is a large data URL; merge with getValues so it is never dropped on header Save. */
const LOGO_FIELD = 'logoBase64';

function isDataUrlLogo(v: unknown): v is string {
    return typeof v === 'string' && /^\s*data:/i.test(v);
}

/**
 * Header Save icon dispatches a window event; this bridge calls the form save handler.
 */
export function FormSaveBridge(props: { eventName: string }) {
    const { handleSubmit, getValues } = useFormContext();
    const { save } = useSaveContext();

    React.useEffect(() => {
        const onSave = () => {
            if (!save) return;
            handleSubmit(submitted => {
                const all = getValues();
                const payload = { ...all, ...submitted } as Record<string, unknown>;
                const liveLogo = all[LOGO_FIELD as keyof typeof all];
                if (isDataUrlLogo(liveLogo)) {
                    payload[LOGO_FIELD] = liveLogo;
                }
                save(payload);
            })();
        };
        window.addEventListener(props.eventName, onSave);
        return () => window.removeEventListener(props.eventName, onSave);
    }, [handleSubmit, getValues, save, props.eventName]);

    return null;
}
