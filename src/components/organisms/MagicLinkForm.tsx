import { useState, type FormEvent } from 'react'
import Alert from '../atoms/Alert'
import Button from '../atoms/Button'
import TextInput from '../atoms/TextInput'
import FormField from '../molecules/FormField'

interface MagicLinkFormProps {
  onSubmit: (email: string) => void
  pending?: boolean
  sent?: boolean
  error?: Error | null
}

/** Presentational: it owns the draft email, the page owns the request. */
export default function MagicLinkForm({
  onSubmit,
  pending = false,
  sent = false,
  error = null,
}: MagicLinkFormProps) {
  const [email, setEmail] = useState('')

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!email.trim()) return
    onSubmit(email.trim())
  }

  return (
    <div className="space-y-5">
      <form onSubmit={submit} className="space-y-5">
        <FormField htmlFor="email" label="Email">
          <TextInput
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </FormField>
        <Button type="submit" disabled={pending}>
          {pending ? 'Sending…' : 'Send magic link'}
        </Button>
      </form>

      {sent && (
        <p className="rounded-md border border-cloth/30 bg-cloth/8 px-4 py-3 text-sm">
          Check your email for the sign-in link.
        </p>
      )}
      {error && <Alert>{error.message}</Alert>}
    </div>
  )
}
