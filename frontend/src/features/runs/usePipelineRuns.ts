import { useEffect, useRef, useState } from 'react'
import { ApiError } from '../../api/client'
import { pipelineApi } from '../../api/pipelines'
import { runApi } from '../../api/runs'
import type { Pipeline, RunPage } from '../../api/types'

type PipelineRunsState =
  | { status: 'loading' }
  | { status: 'success'; pipeline: Pipeline; page: RunPage }
  | { status: 'error'; message: string }

export function usePipelineRuns(pipelineId: string) {
  const [state, setState] = useState<PipelineRunsState>({
    status: 'loading',
  })
  const [reloadKey, setReloadKey] = useState(0)
  const activeRequest = useRef<AbortController | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    activeRequest.current = controller

    Promise.all([
      pipelineApi.get(pipelineId, controller.signal),
      runApi.list(pipelineId, { signal: controller.signal }),
    ])
      .then(([pipeline, page]) => {
        if (!controller.signal.aborted) {
          setState({ status: 'success', pipeline, page })
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return
        }

        // Stop the other request if one of the pair failed.
        controller.abort()

        const message =
          error instanceof ApiError && error.status < 500
            ? error.message
            : 'Could not load pipeline runs. Please try again.'

        setState({ status: 'error', message })
      })

    return () => controller.abort()
  }, [pipelineId, reloadKey])

  function reload() {
    activeRequest.current?.abort()
    setState({ status: 'loading' })
    setReloadKey(current => current + 1)
  }

  return { state, reload }
}