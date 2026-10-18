import { useState } from 'react'
import type { FormEvent } from 'react'
import type { Run, RunStatus } from '../../api/types'
import { useUpdateRunStatus } from './useUpdateRunStatus'

interface UpdateRunStatusFormProps {
  runId: string
  status: RunStatus
  onUpdated: (run: Run) => void
}

export default function UpdateRunStatusForm({
  runId,
  status,
  onUpdated,
}: UpdateRunStatusFormProps) {
  const [selectedStatus, setSelectedStatus] =
    useState<RunStatus | null>(null)

  const { state, updateStatus } = useUpdateRunStatus(runId)

  const value = selectedStatus ?? status
  const busy = state.status === 'saving'
  const unchanged = value === status

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (busy || unchanged) {
      return
    }

    const updated = await updateStatus(value)

    if (updated !== null) {
      setSelectedStatus(null)
      onUpdated(updated)
    }
  }

  return (
    <form
      className="run-status-form"
      aria-label="Update run status"
      aria-busy={busy}
      onSubmit={handleSubmit}
    >
      <div className="form-grid">
        <div className="form-field">
          <label htmlFor="run-status-select">Change status</label>
          <select
            id="run-status-select"
            value={value}
            onChange={event =>
              setSelectedStatus(event.target.value as RunStatus)
            }
            disabled={busy}
          >
            <option value="queued">Queued</option>
            <option value="running">Running</option>
            <option value="passed">Passed</option>
            <option value="failed">Failed</option>
            <option value="flaky">Flaky</option>
          </select>
        </div>

        <button
          type="submit"
          className="button"
          disabled={busy || unchanged}
        >
          {busy ? 'Updating...' : 'Update status'}
        </button>
      </div>

      {state.status === 'error' && (
        <p className="form-error" role="alert">
          {state.message}
        </p>
      )}

      {state.status === 'success' && (
        <p className="form-success" role="status">
          Status updated.
        </p>
      )}
    </form>
  )
}