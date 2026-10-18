import { useState } from 'react'
import { useDeleteNote } from './useDeleteNote'

interface DeleteNoteActionProps {
  noteId: string
  onDeleted: (noteId: string) => void
}

export default function DeleteNoteAction({
  noteId,
  onDeleted,
}: DeleteNoteActionProps) {
  const [confirming, setConfirming] = useState(false)
  const { state, remove, reset } = useDeleteNote(noteId)

  const busy = state.status === 'deleting'

  function cancel() {
    reset()
    setConfirming(false)
  }

  async function handleDelete() {
    const deleted = await remove()

    if (deleted) {
      onDeleted(noteId)
    }
  }

  return (
    <div className="note-delete-action">
      {!confirming ? (
        <button
          type="button"
          className="button button-secondary"
          onClick={() => setConfirming(true)}
        >
          Delete note
        </button>
      ) : (
        <div role="group" aria-label="Confirm note deletion">
          <p>Delete this note permanently?</p>

          <div className="row-actions">
            <button
              type="button"
              className="button button-danger"
              onClick={handleDelete}
              disabled={busy}
            >
              {busy ? 'Deleting...' : 'Confirm delete'}
            </button>

            <button
              type="button"
              className="button button-secondary"
              onClick={cancel}
              disabled={busy}
            >
              Cancel
            </button>
          </div>

          {state.status === 'error' && (
            <p className="form-error" role="alert">
              {state.message}
            </p>
          )}
        </div>
      )}
    </div>
  )
}