import { useEffect, useRef, useState } from 'react'
import { ApiError } from '../../api/client'
import { pipelineApi } from '../../api/pipelines'

type DeleteState =
  | { status: 'idle' }
  | { status: 'deleting' }
  | { status: 'error'; message: string }

export function useDeletePipeline() {
  const [state, setState] = useState<DeleteState>({
    status: 'idle',
  })
  const activeRequest = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => {
      activeRequest.current?.abort()
    }
  }, [])

  async function remove(id: string): Promise<boolean> {
    if (activeRequest.current !== null) {
      return false
    }

    const controller = new AbortController()
    activeRequest.current = controller
    setState({ status: 'deleting' })

    try {
      await pipelineApi.remove(id, controller.signal)

      if (controller.signal.aborted) {
        return false
      }

      setState({ status: 'idle' })
      return true
    } catch (error: unknown) {
      if (controller.signal.aborted) {
        return false
      }

      // Another request may already have deleted this pipeline.
      if (
        error instanceof ApiError &&
        error.status === 404 &&
        error.code === 'NOT_FOUND'
      ) {
        setState({ status: 'idle' })
        return true
      }

      const message =
        error instanceof ApiError && error.status < 500
          ? error.message
          : 'Could not confirm deletion. Please try again.'

      setState({ status: 'error', message })
      return false
    } finally {
      if (activeRequest.current === controller) {
        activeRequest.current = null
      }
    }
  }

  return { state, remove }
}