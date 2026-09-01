import Alert from '../atoms/Alert'

interface DevSignInPanelProps {
  onSignIn: () => void
  pending?: boolean
  error?: Error | null
}

/**
 * A way past the magic link while developing.
 *
 * Presentational on purpose: the page owns the sign-in, so this renders in a
 * test without touching the network. Its caller gates it on
 * `import.meta.env.DEV`, which is what keeps it out of production builds.
 */
export default function DevSignInPanel({
  onSignIn,
  pending = false,
  error = null,
}: DevSignInPanelProps) {
  return (
    <div className="space-y-3 rounded-md border border-dashed border-rule bg-linen/40 p-4">
      <p className="font-data text-[0.62rem] tracking-[0.12em] text-muted uppercase">
        Developer
      </p>
      <p className="text-sm text-muted">
        Sign in to the local dev account without waiting for an email. It is a real session,
        so your books load and row-level security applies as normal.
      </p>
      <button
        type="button"
        onClick={onSignIn}
        disabled={pending}
        className="cursor-pointer rounded-md border border-rule bg-card px-4 py-2 text-sm
          font-medium text-ink transition-colors hover:bg-linen/70
          disabled:cursor-not-allowed disabled:opacity-40"
      >
        {pending ? 'Signing in…' : 'Sign in as developer'}
      </button>
      {error && <Alert>{error.message}</Alert>}
    </div>
  )
}
