import type { RunStatus } from '../api/types'

interface RunStatusBadgeProps {
  status: RunStatus
}

const statusLabels = {
  queued: 'Queued',
  running: 'Running',
  passed: 'Passed',
  failed: 'Failed',
  flaky: 'Flaky',
}

export default function RunStatusBadge({
  status,
}: RunStatusBadgeProps) {
  return (
    <span
      className={`status-badge status-${status}`}
      data-testid="run-status-badge"
    >
      {statusLabels[status]}
    </span>
  )
}