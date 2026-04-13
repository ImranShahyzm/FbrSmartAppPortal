import {
    FormHeaderToolbar,
    FORM_SAVE_GL_CHART_ACCOUNT,
} from '../common/formToolbar';

export function GlChartAccountFormToolbar() {
    return (
        <FormHeaderToolbar
            saveEventName={FORM_SAVE_GL_CHART_ACCOUNT}
            resource="glChartAccounts"
            listPath="/glChartAccounts"
            showDelete={false}
        />
    );
}
