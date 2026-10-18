import { useEffect, useState } from 'react'

interface RunLiveUpdatesProps {
  runId: string
  onRefresh: () => void
}

type ConnectionState = 'connecting' | 'live' | 'reconnecting'

function isStatusMessage(value: unknown): boolean {
  if (
    typeof value !== 'object'
    || value === null
    || !('status' in value)
  ) {
    return false
  }

  return (
    value.status === 'queued'
    || value.status === 'running'
    || value.status === 'passed'
    || value.status === 'failed'
    || value.status === 'flaky'
  )
}

export default function RunLiveUpdates({
  runId,
  onRefresh,
}: RunLiveUpdatesProps) {
  const [connection, setConnection] =
    useState<ConnectionState>('connecting')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let disposed = false
    let source: EventSource | null = null
    let retryTimer: ReturnType<typeof setTimeout> | null = null

    function closeSource() {
      if (source !== null) {
        source.onopen = null
        source.onmessage = null
        source.onerror = null
        source.close()
        source = null
      }
    }

    function connect() {
      if (disposed) {
        return
      }

      closeSource()

      const current = new EventSource(
        `/api/v1/runs/${encodeURIComponent(runId)}/events`,
      )
      source = current

      current.onopen = () => {
        if (!disposed && source === current) {
          setConnection('live')
        }
      }

      current.onmessage = event => {
        if (disposed || source !== current) {
          return
        }

        let payload: unknown

        try {
          payload = JSON.parse(event.data)
        } catch {
          return
        }

        if (isStatusMessage(payload)) {
          onRefresh()
        }
      }

      current.onerror = () => {
        if (disposed || source !== current) {
          return
        }

        closeSource()
        setConnection('reconnecting')

        // Also checks whether the run has been deleted.
        onRefresh()

        retryTimer = setTimeout(() => {
          retryTimer = null
          connect()
        }, 3000)
      }
    }

    connect()

    return () => {
      disposed = true
      closeSource()

      if (retryTimer !== null) {
        clearTimeout(retryTimer)
      }
    }
  }, [runId, onRefresh, attempt])

  function reconnect() {
    setConnection('connecting')
    setAttempt(value => value + 1)
  }

  const message =
    connection === 'live'
      ? 'Live updates connected.'
      : connection === 'connecting'
        ? 'Connecting to live updates...'
        : 'Live updates disconnected. Reconnecting...'

  return (
    <div className="run-live-updates">
      <p role="status">{message}</p>

      <button
        type="button"
        className="button button-secondary"
        onClick={reconnect}
      >
        Reconnect
      </button>
    </div>
  )
}