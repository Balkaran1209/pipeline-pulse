import { useState } from 'react'
import type { FormEvent } from 'react'
import type { Note } from '../../api/types'
import { useCreateNote } from './useCreateNote'

interface CreateNoteFormProps {
  runId: string
  onCreated: (note: Note) => void
}

export default function CreateNoteForm({
  runId,
  onCreated,
}: CreateNoteFormProps) {
  const [author, setAuthor] = useState('')
  const [body, setBody] = useState('')
  const { state, create } = useCreateNote(runId)

  const busy = state.status === 'saving'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const note = await create({ author, body })

    if (note !== null) {
      setBody('')
      onCreated(note)
    }
  }

  return (
    <form
      className="create-note-form"
      aria-label="Add triage note"
      aria-busy={busy}
      onSubmit={handleSubmit}
    >
      <div className="form-field">
        <label htmlFor="note-author">Author</label>
        <input
          id="note-author"
          name="author"
          value={author}
          onChange={event => setAuthor(event.target.value)}
          required
          disabled={busy}
        />
      </div>

      <div className="form-field">
        <label htmlFor="note-body">Note</label>
        <textarea
          id="note-body"
          name="body"
          rows={4}
          value={body}
          onChange={event => setBody(event.target.value)}
          required
          disabled={busy}
        />
      </div>

      <div>
        <button
          type="submit"
          className="button"
          data-testid="note-add"
          disabled={busy}
        >
          {busy ? 'Adding...' : 'Add note'}
        </button>
      </div>

      {state.status === 'error' && (
        <p className="form-error" role="alert">
          {state.message}
        </p>
      )}

      {state.status === 'success' && (
        <p className="form-success" role="status">
          Note added.
        </p>
      )}
    </form>
  )
}