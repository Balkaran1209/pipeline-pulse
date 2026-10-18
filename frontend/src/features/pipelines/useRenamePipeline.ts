import { useEffect, useRef, useState } from 'react'
import { ApiError } from '../../api/client'
import { pipelineApi } from '../../api/pipelines'
import type { Pipeline } from '../../api/types'

type RenameState =
  | { status: 'idle' }
  | { status: 'saving' }
  | { status: 'error'; message: string }

export function useRenamePipeline() {
  const [state, setState] = useState<RenameState>({
    status: 'idle',
  })
  const activeRequest = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => {
      activeRequest.current?.abort()
    }
  }, [])

  function reset() {
    setState({ status: 'idle' })
  }

  async function rename(
    id: string,
    name: string,
  ): Promise<Pipeline | null> {
    if (activeRequest.current !== null) {
      return null
    }

    const trimmedName = name.trim()

    if (trimmedName === '') {
      setState({
        status: 'error',
        message: 'Pipeline name is required.',
      })
      return null
    }

    const controller = new AbortController()
    activeRequest.current = controller
    setState({ status: 'saving' })

    try {
      const pipeline = await pipelineApi.update(
        id,
        { name: trimmedName },
        controller.signal,
      )

      if (controller.signal.aborted) {
        return null
      }

      setState({ status: 'idle' })
      return pipeline
    } catch (error: unknown) {
      if (controller.signal.aborted) {
        return null
      }

      const message =
        error instanceof ApiError && error.status < 500
          ? error.message
          : 'Could not rename the pipeline. Please try again.'

      setState({ status: 'error', message })
      return null
    } finally {
      if (activeRequest.current === controller) {
        activeRequest.current = null
      }
    }
  }

  return { state, rename, reset }
}