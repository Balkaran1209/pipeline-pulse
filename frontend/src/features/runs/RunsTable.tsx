import { Link } from 'react-router'
import type { Run } from '../../api/types'
import RunStatusBadge from '../../components/RunStatusBadge'

interface RunsTableProps {
  runs: Run[]
}

export default function RunsTable({ runs }: RunsTableProps) {
  return (
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
          {runs.map(run => (
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
  )
}