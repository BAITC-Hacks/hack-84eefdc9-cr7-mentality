/** Synthetic fixtures are available only when explicitly enabled in development. */
export const demoAvailable =
  process.env.NODE_ENV !== "production" &&
  process.env.NEXT_PUBLIC_ENABLE_DEMO === "true";

export const workspacePreviewHref = demoAvailable
  ? "/workspace?demo=1"
  : "/workspace";
