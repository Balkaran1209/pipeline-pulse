import { useEffect, useState } from 'react'
import { ApiError } from '../../api/client'
import { pipelineApi } from '../../api/pipelines'
import type { Pipeline } from '../../api/types'

type PipelinesState =
  | { status: 'loading' }
  | { status: 'success'; items: Pipeline[] }
  | { status: 'error'; message: string }

export function usePipelines() {
  const [state, setState] = useState<PipelinesState>({
    status: 'loading',
  })
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    pipelineApi
      .list(controller.signal)
      .then(items => {
        if (!controller.signal.aborted) {
          setState({ status: 'success', items })
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return
        }

        const message =
          error instanceof ApiError && error.status < 500
            ? error.message
            : 'Could not load pipelines. Please try again.'

        setState({ status: 'error', message })
      })

    return () => controller.abort()
  }, [reloadKey])

  function reload() {
    setState({ status: 'loading' })
    setReloadKey(current => current + 1)
  }

  return { state, reload }
}