import type { Pipeline } from '../../api/types'
import { useDeletePipeline } from './useDeletePipeline'

interface DeletePipelineActionProps {
  pipeline: Pipeline
  onDeleted: (id: string) => void
  onCancel: () => void
}

export default function DeletePipelineAction({
  pipeline,
  onDeleted,
  onCancel,
}: DeletePipelineActionProps) {
  const { state, remove } = useDeletePipeline()
  const busy = state.status === 'deleting'

  async function handleDelete() {
    const deleted = await remove(pipeline.id)

    if (deleted) {
      onDeleted(pipeline.id)
    }
  }

  return (
    <div
      className="delete-confirmation"
      role="group"
      aria-label={`Delete ${pipeline.name}`}
      aria-busy={busy}
    >
      <p>
        Delete "{pipeline.name}"? Its runs and notes will also be deleted.
      </p>

      <div className="row-actions">
        <button
          className="button button-danger"
          type="button"
          onClick={handleDelete}
          disabled={busy}
        >
          {busy ? 'Deleting...' : 'Confirm delete'}
        </button>

        <button
          className="button button-secondary"
          type="button"
          onClick={onCancel}
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
  )
}