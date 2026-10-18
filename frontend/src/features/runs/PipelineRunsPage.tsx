import { Link } from 'react-router'
import RunStatusBadge from '../../components/RunStatusBadge'
import { usePipelineRuns } from './usePipelineRuns'

interface PipelineRunsPageProps {
  pipelineId: string
}

export default function PipelineRunsPage({
  pipelineId,
}: PipelineRunsPageProps) {
  const { state, reload } = usePipelineRuns(pipelineId)

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
        <p className="notice">No runs yet.</p>
      )}

      {state.status === 'success' && state.page.items.length > 0 && (
        <div
          className="table-scroll"
          role="region"
          aria-label="Pipeline runs table"
          tabIndex={0}
        >
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Run</th>
                <th scope="col">Status</th>
                <th scope="col">Started</th>
                <th scope="col">Triggered by</th>
                <th scope="col">Commit</th>
              </tr>
            </thead>

            <tbody>
              {state.page.items.map(run => (
                <tr key={run.id} data-testid="run-row">
                  <td>
                    <Link to={`/runs/${encodeURIComponent(run.id)}`}>
                      {run.id}
                    </Link>
                  </td>
                  <td>
                    <RunStatusBadge status={run.status} />
                  </td>
                  <td>
                    <time dateTime={run.startedAt}>
                      {new Date(run.startedAt).toLocaleString()}
                    </time>
                  </td>
                  <td>{run.triggeredBy}</td>
                  <td>
                    <code title={run.commitSha}>
                      {run.commitSha.slice(0, 7)}
                    </code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}