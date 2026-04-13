import { workspaceRootPath as workspaceRootPathFromRegistry } from '../apps/appsRegistry';

export function workspaceRootPath(activeAppId: string): string {
    return workspaceRootPathFromRegistry(activeAppId);
}

export function pathInWorkspace(workspaceRoot: string, resourcePath: string): string {
    const p = resourcePath.startsWith('/') ? resourcePath : `/${resourcePath}`;
    return `${workspaceRoot}${p}`;
}
