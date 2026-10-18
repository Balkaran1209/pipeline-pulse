import { useEffect, useRef, useState } from 'react'
import { ApiError } from '../../api/client'
import { runApi } from '../../api/runs'
import type { Run, RunStatus } from '../../api/types'

type UpdateStatusState =
  | { status: 'idle' }
  | { status: 'saving' }
  | { status: 'success' }
  | { status: 'error'; message: string }

export function useUpdateRunStatus(runId: string) {
  const [state, setState] = useState<UpdateStatusState>({
    status: 'idle',
  })
  const activeRequest = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => activeRequest.current?.abort()
  }, [])

  async function updateStatus(
    status: RunStatus,
  ): Promise<Run | null> {
    if (activeRequest.current !== null) {
      return null
    }

    const controller = new AbortController()
    activeRequest.current = controller
    setState({ status: 'saving' })

    try {
      const updated = await runApi.updateStatus(
        runId,
        status,
        controller.signal,
      )

      if (controller.signal.aborted) {
        return null
      }

      setState({ status: 'success' })
      return updated
    } catch (error: unknown) {
      if (controller.signal.aborted) {
        return null
      }

      const message =
        error instanceof ApiError && error.status < 500
          ? error.message
          : 'The status update could not be confirmed. Please try again.'

      setState({ status: 'error', message })
      return null
    } finally {
      if (activeRequest.current === controller) {
        activeRequest.current = null
      }
    }
  }

  return { state, updateStatus }
}