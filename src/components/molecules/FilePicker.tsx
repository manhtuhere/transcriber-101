import { ACCEPTED_UPLOAD_TYPES } from '../../constants/upload'
import FormField from './FormField'

interface FilePickerProps {
  id?: string
  label: string
  onSelect: (file: File) => void
}

export default function FilePicker({ id = 'file', label, onSelect }: FilePickerProps) {
  return (
    <FormField htmlFor={id} label={label}>
      <input
        id={id}
        type="file"
        accept={ACCEPTED_UPLOAD_TYPES}
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) onSelect(file)
        }}
        className="text-sm text-mute file:mr-4 file:cursor-pointer file:rounded-full
          file:border file:border-vellum/20 file:bg-transparent file:px-4 file:py-2
          file:text-sm file:font-medium file:text-vellum"
      />
    </FormField>
  )
}
