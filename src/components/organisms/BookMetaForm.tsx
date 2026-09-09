import { VOICES } from '../../constants/voices'
import Select from '../atoms/Select'
import TextInput from '../atoms/TextInput'
import FormField from '../molecules/FormField'

interface BookMetaFormProps {
  title: string
  author: string
  voice: string
  onTitleChange: (value: string) => void
  onAuthorChange: (value: string) => void
  onVoiceChange: (value: string) => void
}

export default function BookMetaForm({
  title,
  author,
  voice,
  onTitleChange,
  onAuthorChange,
  onVoiceChange,
}: BookMetaFormProps) {
  return (
    <div className="grid gap-5 rounded-md border border-rule bg-card p-6 sm:grid-cols-2">
      <FormField htmlFor="title" label="Title">
        <TextInput
          id="title"
          value={title}
          placeholder="Moby-Dick"
          onChange={(event) => onTitleChange(event.target.value)}
        />
      </FormField>

      <FormField htmlFor="author" label="Author">
        <TextInput
          id="author"
          value={author}
          placeholder="Herman Melville"
          onChange={(event) => onAuthorChange(event.target.value)}
        />
      </FormField>

      <div className="sm:col-span-2">
        <FormField htmlFor="voice" label="Narrator">
          <Select
            id="voice"
            options={VOICES}
            value={voice}
            onChange={(event) => onVoiceChange(event.target.value)}
          />
        </FormField>
      </div>
    </div>
  )
}
