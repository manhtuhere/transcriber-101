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
    <div className="space-y-6">
      <FormField htmlFor="title" label="Title">
        <TextInput
          id="title"
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
        />
      </FormField>

      <FormField htmlFor="author" label="Author">
        <TextInput
          id="author"
          value={author}
          onChange={(event) => onAuthorChange(event.target.value)}
        />
      </FormField>

      <FormField htmlFor="voice" label="Voice">
        <Select
          id="voice"
          options={VOICES}
          value={voice}
          onChange={(event) => onVoiceChange(event.target.value)}
        />
      </FormField>
    </div>
  )
}
