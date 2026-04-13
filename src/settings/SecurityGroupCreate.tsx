import { Create, SimpleForm, useDefaultTitle, useTranslate } from 'react-admin';

import { SecurityGroupForm, securityGroupSimpleFormFieldSx } from './SecurityGroupForm';

function transformSave(record: Record<string, unknown>) {
    const copy = { ...record };
    const u = copy.userIds;
    if (Array.isArray(u)) copy.userIds = u.map(x => String(x));
    const mg = copy.menuGrants;
    if (Array.isArray(mg)) {
        copy.menuGrants = (mg as Record<string, unknown>[]).map(row => ({
            menuKey: String(row.menuKey ?? ''),
            visible: row.visible !== false,
        }));
    }
    const rr = copy.recordRules;
    if (Array.isArray(rr)) {
        copy.recordRules = (rr as Record<string, unknown>[]).map(row => ({
            name: String(row.name ?? ''),
            permissionsPrefix: String(row.permissionsPrefix ?? ''),
            modelKey: String(row.modelKey ?? ''),
            domain: row.domain == null || row.domain === '' ? null : String(row.domain),
            fieldName: row.fieldName == null || row.fieldName === '' ? null : String(row.fieldName),
            ruleOperator: row.ruleOperator == null || row.ruleOperator === '' ? null : String(row.ruleOperator),
            rightOperandJson:
                row.rightOperandJson == null || row.rightOperandJson === ''
                    ? null
                    : String(row.rightOperandJson),
            applyRead: row.applyRead !== false,
            applyWrite: row.applyWrite === true,
            applyCreate: row.applyCreate === true,
            applyDelete: row.applyDelete === true,
        }));
    }
    return copy;
}

const SecurityGroupCreateTitle = () => {
    const appTitle = useDefaultTitle();
    const translate = useTranslate();
    const title = translate('shell.settings.security_group_create_title', { _: 'New security group' });
    return (
        <>
            <title>{`${appTitle} - ${title}`}</title>
            <span>{title}</span>
        </>
    );
};

export function SecurityGroupCreate() {
    return (
        <Create
            resource="securityGroups"
            title={<SecurityGroupCreateTitle />}
            actions={false}
            redirect="edit"
            transform={transformSave}
            sx={{
                width: '100%',
                maxWidth: '100%',
                '& .RaCreate-main': { maxWidth: '100%', width: '100%' },
                '& .RaCreate-card': {
                    maxWidth: '100% !important',
                    width: '100%',
                    boxShadow: 'none',
                },
            }}
        >
            <SimpleForm
                defaultValues={{ userIds: [], menuGrants: [], recordRules: [] }}
                sx={{ maxWidth: 'none', width: '100%', ...securityGroupSimpleFormFieldSx }}
                toolbar={false}
            >
                <SecurityGroupForm variant="create" />
            </SimpleForm>
        </Create>
    );
}

export default SecurityGroupCreate;
