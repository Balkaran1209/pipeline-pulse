import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router'
import { useCreateRun } from './useCreateRun'

interface CreateRunFormProps {
  pipelineId: string
  disabled: boolean
  onCreated: () => void
  onRefresh: () => void
}

export default function CreateRunForm({
  pipelineId,
  disabled,
  onCreated,
  onRefresh,
}: CreateRunFormProps) {
  const [triggeredBy, setTriggeredBy] = useState('')
  const [commitSha, setCommitSha] = useState('')
  const { state, create } = useCreateRun(pipelineId)

  const busy = state.status === 'submitting'
  const blocked = disabled || busy

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const run = await create({ triggeredBy, commitSha })

    if (run !== null) {
      setTriggeredBy('')
      setCommitSha('')
      onCreated()
    }
  }

  return (
    <form
      className="panel"
      aria-labelledby="create-run-title"
      aria-busy={busy}
      onSubmit={handleSubmit}
    >
      <h2 id="create-run-title">Create run</h2>

      <div className="form-grid">
        <div className="form-field">
          <label htmlFor="create-run-author">Triggered by</label>
          <input
            id="create-run-author"
            name="triggeredBy"
            value={triggeredBy}
            onChange={event => setTriggeredBy(event.target.value)}
            placeholder="e.g. engineer.name"
            required
            disabled={blocked}
          />
        </div>

        <div className="form-field">
          <label htmlFor="create-run-commit">Commit SHA</label>
          <input
            id="create-run-commit"
            name="commitSha"
            value={commitSha}
            onChange={event => setCommitSha(event.target.value)}
            spellCheck={false}
            required
            disabled={blocked}
          />
        </div>

        <button
          className="button"
          type="submit"
          data-testid="run-create"
          disabled={blocked}
        >
          {busy ? 'Creating...' : 'Create run'}
        </button>
      </div>

      {state.status === 'error' && (
        <div role="alert">
          <p className="form-error">{state.message}</p>

          {state.needsRefresh && (
            <button
              className="button button-secondary"
              type="button"
              onClick={onRefresh}
              disabled={disabled}
            >
              Refresh runs
            </button>
          )}
        </div>
      )}

      {state.status === 'success' && (
        <p className="form-success" role="status">
          Run queued.{' '}
          <Link to={`/runs/${encodeURIComponent(state.runId)}`}>
            View run
          </Link>
        </p>
      )}
    </form>
  )
}