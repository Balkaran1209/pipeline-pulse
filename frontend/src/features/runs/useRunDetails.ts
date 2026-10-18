import { useEffect, useRef, useState } from 'react'
import { ApiError } from '../../api/client'
import { runApi } from '../../api/runs'
import type { Run, RunDetails } from '../../api/types'

type RunDetailsState =
  | { status: 'loading' }
  | { status: 'success'; run: RunDetails }
  | { status: 'error'; message: string }

export function useRunDetails(runId: string) {
  const [state, setState] = useState<RunDetailsState>({
    status: 'loading',
  })
  const [reloadKey, setReloadKey] = useState(0)
  const activeRequest = useRef<AbortController | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    activeRequest.current = controller

    runApi.get(runId, controller.signal)
      .then(run => {
        if (!controller.signal.aborted) {
          setState({ status: 'success', run })
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return
        }

        const message =
          error instanceof ApiError && error.status < 500
            ? error.message
            : 'Could not load run details. Please try again.'

        setState({ status: 'error', message })
      })
      .finally(() => {
        if (activeRequest.current === controller) {
          activeRequest.current = null
        }
      })

    return () => controller.abort()
  }, [runId, reloadKey])

  function reload() {
    activeRequest.current?.abort()
    setState({ status: 'loading' })
    setReloadKey(value => value + 1)
  }
  function replaceRun(updated: Run) {
    setState(current => {
      if (
        current.status !== 'success'
        || current.run.id !== updated.id
      ) {
        return current
      }

      return {
        status: 'success',
        run: {
          ...current.run,
          ...updated,
        },
      }
    })
  }
  return { state, reload, replaceRun }
}