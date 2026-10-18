import { useEffect, useRef, useState } from 'react'
import { ApiError } from '../../api/client'
import { runApi } from '../../api/runs'
import type { CreateRunInput, Run } from '../../api/types'

type CreateRunState =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'success'; runId: string }
  | {
      status: 'error'
      message: string
      needsRefresh: boolean
    }

export function useCreateRun(pipelineId: string) {
  const [state, setState] = useState<CreateRunState>({
    status: 'idle',
  })
  const activeRequest = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => {
      activeRequest.current?.abort()
    }
  }, [])

  async function create(input: CreateRunInput): Promise<Run | null> {
    if (activeRequest.current !== null) {
      return null
    }

    const triggeredBy = input.triggeredBy.trim()
    const commitSha = input.commitSha.trim()

    if (triggeredBy === '' || commitSha === '') {
      setState({
        status: 'error',
        message: 'Triggered by and commit SHA are required.',
        needsRefresh: false,
      })
      return null
    }

    const controller = new AbortController()
    activeRequest.current = controller
    setState({ status: 'submitting' })

    try {
      const run = await runApi.create(
        pipelineId,
        { triggeredBy, commitSha },
        controller.signal,
      )

      if (controller.signal.aborted) {
        return null
      }

      setState({ status: 'success', runId: run.id })
      return run
    } catch (error: unknown) {
      if (controller.signal.aborted) {
        return null
      }

      const knownFailure =
        error instanceof ApiError && error.status < 500

      setState({
        status: 'error',
        message: knownFailure
          ? error.message
          : 'Creation could not be confirmed. Refresh runs to check the result before submitting again.',
        needsRefresh: !knownFailure,
      })

      return null
    } finally {
      if (activeRequest.current === controller) {
        activeRequest.current = null
      }
    }
  }

  return { state, create }
}