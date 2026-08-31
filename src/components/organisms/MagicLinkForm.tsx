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
    <div className="space-y-6">
      <form onSubmit={submit} className="space-y-6">
        <FormField htmlFor="email" label="Email">
          <TextInput
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </FormField>
        <Button type="submit" disabled={pending}>
          {pending ? 'Sending…' : 'Send magic link'}
        </Button>
      </form>

      {sent && <p className="text-mute">Check your email for the sign-in link.</p>}
      {error && <Alert>{error.message}</Alert>}
    </div>
  )
}
