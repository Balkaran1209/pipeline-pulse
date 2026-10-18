import type { RunStatus } from '../../api/types'
import RunsTable from './RunsTable'
import { usePipelineRuns } from './usePipelineRuns'
import CreateRunForm from './CreateRunForm'

interface PipelineRunsPageProps {
  pipelineId: string
}

export default function PipelineRunsPage({
  pipelineId,
}: PipelineRunsPageProps) {
  const {
    state,
    statusFilter,
    changeStatus,
    reload,
    loadMore,
    showLatestRuns,
  } = usePipelineRuns(pipelineId)

  return (
    <section aria-labelledby="pipeline-runs-title">
      <div className="page-heading">
        <h1 id="pipeline-runs-title">
          {state.status === 'success'
            ? state.pipeline.name
            : 'Pipeline runs'}
        </h1>
        <p>Recent pipeline runs, newest first.</p>
      </div>
      <CreateRunForm
        pipelineId={pipelineId}
        disabled={state.status !== 'success'}
        onCreated={showLatestRuns}
        onRefresh={showLatestRuns}
      />
      <div className="run-controls">
        <div className="form-field">
          <label htmlFor="run-status-filter">Status</label>
          <select
            id="run-status-filter"
            value={statusFilter}
            onChange={event =>
              changeStatus(event.target.value as RunStatus | '')
            }
          >
            <option value="">All statuses</option>
            <option value="queued">Queued</option>
            <option value="running">Running</option>
            <option value="passed">Passed</option>
            <option value="failed">Failed</option>
            <option value="flaky">Flaky</option>
          </select>
        </div>
      </div>

      {state.status === 'loading' && (
        <p className="notice" role="status">
          Loading pipeline runs...
        </p>
      )}

      {state.status === 'error' && (
        <div className="notice notice-error" role="alert">
          <p>{state.message}</p>
          <button className="button" type="button" onClick={reload}>
            Try again
          </button>
        </div>
      )}

      {state.status === 'success' && state.page.items.length === 0 && (
        <p className="notice" role="status">
          {statusFilter
            ? 'No runs match this status.'
            : 'No runs yet.'}
        </p>
      )}

      {state.status === 'success' && state.page.items.length > 0 && (
        <>
          <RunsTable runs={state.page.items} />

          <div
            className="pagination-controls"
            aria-busy={state.more.status === 'loading'}
          >
            <p role="status">
              {state.page.items.length}{' '}
              {state.page.items.length === 1 ? 'run' : 'runs'} loaded.
              {state.page.nextCursor === null
                ? ' All runs loaded.'
                : ''}
            </p>

            {state.more.status === 'error' && (
              <p className="form-error" role="alert">
                {state.more.message}
              </p>
            )}

            {state.page.nextCursor !== null && (
              <button
                className="button"
                type="button"
                data-testid="run-load-more"
                onClick={loadMore}
                disabled={state.more.status === 'loading'}
              >
                {state.more.status === 'loading'
                  ? 'Loading...'
                  : state.more.status === 'error'
                    ? 'Retry loading more'
                    : 'Load more'}
              </button>
            )}
          </div>
        </>
      )}
    </section>
  )
}