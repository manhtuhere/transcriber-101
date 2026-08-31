import DevSignInPanel from '../components/organisms/DevSignInPanel'
import MagicLinkForm from '../components/organisms/MagicLinkForm'
import PageShell from '../components/templates/PageShell'
import { useDevSignIn } from '../hooks/useDevSignIn'
import { useSignIn } from '../hooks/useSignIn'

export default function Login() {
  const send = useSignIn()
  const dev = useDevSignIn()

  return (
    <PageShell title="Sign in" narrow>
      <MagicLinkForm
        onSubmit={(email) => send.mutate(email)}
        pending={send.isPending}
        sent={send.isSuccess}
        error={send.error}
      />

      {/*
        The literal `import.meta.env.DEV` is load-bearing: Vite replaces it with
        `false` when building, so this whole branch — and the panel it imports —
        folds out of the production bundle.
      */}
      {import.meta.env.DEV && (
        <DevSignInPanel
          onSignIn={() => dev.mutate()}
          pending={dev.isPending}
          error={dev.error}
        />
      )}
    </PageShell>
  )
}
