/** Strip `/fbr` or `/accounting` prefix so react-admin routes match resource paths. */
export function stripWorkspacePathPrefix(pathname: string, prefix: string): string | null {
    const p = prefix.replace(/\/$/, '');
    if (pathname === p || pathname === `${p}/`) return '/';
    if (!pathname.startsWith(`${p}/`)) return null;
    const rest = pathname.slice(p.length);
    return rest.startsWith('/') ? rest : `/${rest}`;
}
