export type AppDefinition = {
    id: string;
    name: string;
    description?: string;
    /** Shown in launcher tile */
    accentColor?: string;
    /** If true, tile is visible but not selectable yet */
    disabled?: boolean;
};

/**
 * Registered applications. Replace or extend with API-driven data later.
 * Only enabled apps can be activated; FBR Smart is the primary workspace.
 */
export const APPS_REGISTRY: AppDefinition[] = [
    {
        id: 'fbr-smart',
        name: 'FBR Smart',
        description: 'Invoicing, catalog & company setup',
        accentColor: '#00585C',
    },
    {
        id: 'education-mgmt',
        name: 'Accounting',
        description: 'Coming soon',
        accentColor: '#6B4FBB',
        disabled: true,
    },
];

export const DEFAULT_ACTIVE_APP_ID = 'fbr-smart';
