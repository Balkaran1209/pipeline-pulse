import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router'
import type { Pipeline } from '../../api/types'
import { useRenamePipeline } from './useRenamePipeline'

interface PipelineRowProps {
  pipeline: Pipeline
  onRenamed: (pipeline: Pipeline) => void
}

const productLabels = {
  flasharray: 'FlashArray',
  flashblade: 'FlashBlade',
  hyperscale: 'Hyperscale',
}

export default function PipelineRow({
  pipeline,
  onRenamed,
}: PipelineRowProps) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(pipeline.name)
  const { state, rename, reset } = useRenamePipeline()

  const busy = state.status === 'saving'

  function beginEditing() {
    reset()
    setName(pipeline.name)
    setEditing(true)
  }

  function cancelEditing() {
    reset()
    setEditing(false)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const updated = await rename(pipeline.id, name)

    if (updated !== null) {
      onRenamed(updated)
      setEditing(false)
    }
  }

  return (
    <tr data-testid="pipeline-row">
      <td>
        {editing ? (
          <form
            className="inline-edit"
            aria-label={`Rename ${pipeline.name}`}
            aria-busy={busy}
            onSubmit={handleSubmit}
          >
            <input
              aria-label="New pipeline name"
              name="name"
              value={name}
              onChange={event => setName(event.target.value)}
              required
              disabled={busy}
              autoFocus
            />

            <div className="row-actions">
              <button
                className="button"
                type="submit"
                disabled={busy}
              >
                {busy ? 'Saving...' : 'Save'}
              </button>

              <button
                className="button button-secondary"
                type="button"
                onClick={cancelEditing}
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
          </form>
        ) : (
          <Link to={`/pipelines/${encodeURIComponent(pipeline.id)}`}>
            {pipeline.name}
          </Link>
        )}
      </td>

      <td>{productLabels[pipeline.product]}</td>

      <td>
        <time dateTime={pipeline.createdAt}>
          {new Date(pipeline.createdAt).toLocaleString()}
        </time>
      </td>

      <td>
        <button
          className="button button-secondary"
          type="button"
          onClick={beginEditing}
          disabled={editing}
        >
          Rename
        </button>
      </td>
    </tr>
  )
}