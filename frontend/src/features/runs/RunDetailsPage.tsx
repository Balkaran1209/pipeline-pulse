import { Link } from 'react-router'
import RunStatusBadge from '../../components/RunStatusBadge'
import { useRunDetails } from './useRunDetails'

interface RunDetailsPageProps {
  runId: string
}

function Timestamp({ value }: { value: string }) {
  return (
    <time dateTime={value}>
      {new Date(value).toLocaleString()}
    </time>
  )
}

export default function RunDetailsPage({
  runId,
}: RunDetailsPageProps) {
  const { state, reload } = useRunDetails(runId)

  return (
    <section>
      <div className="page-heading">
        <h1>Run details</h1>
        <p>Run: {runId}</p>

        {state.status === 'success' && (
          <Link
            to={`/pipelines/${encodeURIComponent(state.run.pipelineId)}`}
          >
            Back to pipeline runs
          </Link>
        )}
      </div>

      {state.status === 'loading' && (
        <p role="status">Loading run details...</p>
      )}

      {state.status === 'error' && (
        <div className="notice notice-error" role="alert">
          <p>{state.message}</p>
          <button
            type="button"
            className="button"
            onClick={reload}
          >
            Try again
          </button>
        </div>
      )}

      {state.status === 'success' && (
        <>
          <section
            className="panel"
            aria-labelledby="run-summary-title"
          >
            <h2 id="run-summary-title">Run information</h2>

            <dl className="run-details-grid">
              <div>
                <dt>Status</dt>
                <dd>
                  <RunStatusBadge status={state.run.status} />
                </dd>
              </div>

              <div>
                <dt>Triggered by</dt>
                <dd>{state.run.triggeredBy}</dd>
              </div>

              <div>
                <dt>Started</dt>
                <dd>
                  <Timestamp value={state.run.startedAt} />
                </dd>
              </div>

              <div>
                <dt>Finished</dt>
                <dd>
                  {state.run.finishedAt === null
                    ? 'Not recorded'
                    : <Timestamp value={state.run.finishedAt} />}
                </dd>
              </div>

              <div>
                <dt>Duration</dt>
                <dd>
                  {state.run.durationMs === null
                    ? 'Not recorded'
                    : `${(state.run.durationMs / 1000).toLocaleString(
                        undefined,
                        { maximumFractionDigits: 3 },
                      )} seconds`}
                </dd>
              </div>

              <div className="run-details-wide">
                <dt>Commit SHA</dt>
                <dd><code>{state.run.commitSha}</code></dd>
              </div>
            </dl>
          </section>

          <section
            className="panel"
            aria-labelledby="run-notes-title"
          >
            <h2 id="run-notes-title">Triage notes</h2>

            {state.run.notes.length === 0 ? (
              <p role="status">No notes yet.</p>
            ) : (
              <ol className="run-notes-list">
                {state.run.notes.map(note => (
                  <li key={note.id} data-testid="note-row">
                    <div className="run-note-meta">
                      <strong>{note.author}</strong>
                      <Timestamp value={note.createdAt} />
                    </div>
                    <p className="run-note-body">{note.body}</p>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </>
      )}
    </section>
  )
}