import { SETTINGS_APP_ID, workspaceRootPath } from './appsRegistry';

/** List route for security groups; must match `<Resource name="securityGroups" />` (camelCase). */
export const SETTINGS_SECURITY_GROUPS_LIST_PATH = `${workspaceRootPath(SETTINGS_APP_ID)}/securityGroups`;

/** List route for users (Settings app). */
export const SETTINGS_USERS_LIST_PATH = `${workspaceRootPath(SETTINGS_APP_ID)}/users`;

/** Developer tool: which columns appear in security group record rules. */
export const SETTINGS_RECORD_RULE_FIELD_SETTINGS_PATH = `${workspaceRootPath(SETTINGS_APP_ID)}/recordRuleFieldSettings`;
