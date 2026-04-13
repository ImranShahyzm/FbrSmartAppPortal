/**
 * Legacy default export for older tooling. The real shell is {@link Root} (registry-driven workspaces).
 * Adding an app: register it in `apps/appsRegistry.ts` and add a workspace component — no changes here.
 */
export { Root as default } from './Root';
