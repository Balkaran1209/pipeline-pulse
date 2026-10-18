import { ApiError } from '../../api/client'
import { pipelineApi } from '../../api/pipelines'
import type { Pipeline } from '../../api/types'
import { useEffect, useRef, useState } from 'react'

type PipelinesState =
  | { status: 'loading' }
  | { status: 'success'; items: Pipeline[] }
  | { status: 'error'; message: string }

export function usePipelines() {
  const [state, setState] = useState<PipelinesState>({
    status: 'loading',
  })
  const [reloadKey, setReloadKey] = useState(0)
  const activeRequest = useRef<AbortController | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    activeRequest.current = controller

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
    activeRequest.current?.abort()
    setState({ status: 'loading' })
    setReloadKey(current => current + 1)
  }
  function replacePipeline(updated: Pipeline) {
    setState(current => {
        if (current.status !== 'success') {
        return current
        }

        return {
        ...current,
        items: current.items.map(pipeline =>
            pipeline.id === updated.id ? updated : pipeline,
        ),
        }
    })
  }
  function removePipeline(id: string) {
    setState(current => {
        if (current.status !== 'success') {
        return current
        }

        return {
        ...current,
        items: current.items.filter(pipeline => pipeline.id !== id),
        }
    })
  }
  return { state, reload, replacePipeline, removePipeline }
}