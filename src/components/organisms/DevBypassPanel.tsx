interface DevBypassPanelProps {
  onEnable: () => void
}

/**
 * A way past sign-in while working on the client-side pages.
 *
 * Presentational on purpose: the page owns the toggle, so this renders in a
 * test without touching storage. Its caller gates it on `import.meta.env.DEV`,
 * which is what keeps it out of production builds.
 */
export default function DevBypassPanel({ onEnable }: DevBypassPanelProps) {
  return (
    <div className="rounded-[10px] border border-dashed border-amber/40 p-4">
      <p className="font-data text-xs tracking-[0.14em] text-amber uppercase">Developer</p>
      <p className="mt-2 text-sm text-mute">
        Skip sign-in to work on the upload and player screens. Supabase still applies RLS, so
        no books will load.
      </p>
      <button
        type="button"
        onClick={onEnable}
        className="mt-4 cursor-pointer rounded-full border border-amber/50 bg-transparent
          px-4 py-2 text-sm font-medium text-amber transition-colors hover:bg-amber/10"
      >
        Continue without signing in
      </button>
    </div>
  )
}
