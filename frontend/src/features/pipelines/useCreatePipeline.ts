import { useEffect, useRef, useState } from 'react'
import { ApiError } from '../../api/client'
import { pipelineApi } from '../../api/pipelines'
import type { CreatePipelineInput, Pipeline } from '../../api/types'

type CreationState =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'success'; name: string }
  | { status: 'error'; message: string }

interface CreationAttempt {
  input: CreatePipelineInput
  key: string
}

export function useCreatePipeline() {
  const [state, setState] = useState<CreationState>({
    status: 'idle',
  })

  const activeRequest = useRef<AbortController | null>(null)
  const lastAttempt = useRef<CreationAttempt | null>(null)

  useEffect(() => {
    return () => {
      activeRequest.current?.abort()
    }
  }, [])

  async function create(
    input: CreatePipelineInput,
  ): Promise<Pipeline | null> {
    // This synchronous guard also protects against rapid double-clicks.
    if (activeRequest.current !== null) {
      return null
    }

    if (input.name.trim() === '') {
      setState({
        status: 'error',
        message: 'Pipeline name is required.',
      })
      return null
    }

    let attempt = lastAttempt.current

    if (
      attempt === null ||
      attempt.input.name !== input.name ||
      attempt.input.product !== input.product
    ) {
      attempt = {
        input: { ...input },
        key: crypto.randomUUID(),
      }
      lastAttempt.current = attempt
    }

    const controller = new AbortController()
    activeRequest.current = controller
    setState({ status: 'submitting' })

    try {
      const pipeline = await pipelineApi.create(
        attempt.input,
        attempt.key,
        controller.signal,
      )

      if (controller.signal.aborted) {
        return null
      }

      lastAttempt.current = null
      setState({ status: 'success', name: pipeline.name })

      return pipeline
    } catch (error: unknown) {
      if (controller.signal.aborted) {
        return null
      }

      const message =
        error instanceof ApiError && error.status < 500
          ? error.message
          : 'Creation could not be confirmed. Retry with the same details.'

      setState({ status: 'error', message })
      return null
    } finally {
      if (activeRequest.current === controller) {
        activeRequest.current = null
      }
    }
  }

  return { state, create }
}