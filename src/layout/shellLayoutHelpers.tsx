import * as React from 'react';

/** Drop-in replacement for RA `<Sidebar>` when navigation is only in the top bar. */
export function NoSidebar(_props: { children?: React.ReactNode; appBarAlwaysOn?: boolean }): null {
    return null;
}

/** No drawer menu: all navigation lives in `AppBar` / top bar. */
export function NoMenu(): null {
    return null;
}

const shellLayoutHelpers = { NoSidebar, NoMenu };
export default shellLayoutHelpers;
