import { useEffect, useRef, useState } from 'react'
import { ApiError } from '../../api/client'
import { pipelineApi } from '../../api/pipelines'
import { runApi } from '../../api/runs'
import type { Pipeline, RunPage, RunStatus } from '../../api/types'

type MoreState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }

type PipelineRunsState =
  | { status: 'loading' }
  | {
      status: 'success'
      pipeline: Pipeline
      page: RunPage
      more: MoreState
    }
  | { status: 'error'; message: string }

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError && error.status < 500
    ? error.message
    : fallback
}

export function usePipelineRuns(pipelineId: string) {
  const [state, setState] = useState<PipelineRunsState>({
    status: 'loading',
  })
  const [statusFilter, setStatusFilter] = useState<RunStatus | ''>('')
  const [reloadKey, setReloadKey] = useState(0)
  const activeRequest = useRef<AbortController | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    activeRequest.current = controller

    Promise.all([
      pipelineApi.get(pipelineId, controller.signal),
      runApi.list(pipelineId, {
        status: statusFilter || undefined,
        signal: controller.signal,
      }),
    ])
      .then(([pipeline, page]) => {
        if (!controller.signal.aborted) {
          setState({
            status: 'success',
            pipeline,
            page,
            more: { status: 'idle' },
          })
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return
        }

        controller.abort()

        setState({
          status: 'error',
          message: errorMessage(
            error,
            'Could not load pipeline runs. Please try again.',
          ),
        })
      })
      .finally(() => {
        if (activeRequest.current === controller) {
          activeRequest.current = null
        }
      })

    return () => {
      controller.abort()
      activeRequest.current?.abort()
    }
  }, [pipelineId, statusFilter, reloadKey])

  function reload() {
    activeRequest.current?.abort()
    activeRequest.current = null
    setState({ status: 'loading' })
    setReloadKey(current => current + 1)
  }

  function changeStatus(next: RunStatus | '') {
    if (next === statusFilter) {
      return
    }

    activeRequest.current?.abort()
    activeRequest.current = null
    setState({ status: 'loading' })
    setStatusFilter(next)
  }

  async function loadMore() {
    if (
      state.status !== 'success' ||
      state.page.nextCursor === null ||
      activeRequest.current !== null
    ) {
      return
    }

    const cursor = state.page.nextCursor
    const controller = new AbortController()
    activeRequest.current = controller

    setState(current =>
      current.status === 'success'
        ? { ...current, more: { status: 'loading' } }
        : current,
    )

    try {
      const page = await runApi.list(pipelineId, {
        status: statusFilter || undefined,
        cursor,
        signal: controller.signal,
      })

      if (controller.signal.aborted) {
        return
      }

      setState(current => {
        if (
          current.status !== 'success' ||
          current.page.nextCursor !== cursor
        ) {
          return current
        }

        const existingIds = new Set(
          current.page.items.map(run => run.id),
        )

        return {
          ...current,
          page: {
            items: [
              ...current.page.items,
              ...page.items.filter(run => !existingIds.has(run.id)),
            ],
            nextCursor: page.nextCursor,
          },
          more: { status: 'idle' },
        }
      })
    } catch (error: unknown) {
      if (controller.signal.aborted) {
        return
      }

      const message = errorMessage(
        error,
        'Could not load more runs. Please try again.',
      )

      setState(current =>
        current.status === 'success'
          ? { ...current, more: { status: 'error', message } }
          : current,
      )
    } finally {
      if (activeRequest.current === controller) {
        activeRequest.current = null
      }
    }
  }
  function showLatestRuns() {
    setStatusFilter('')
    reload()
  }

  return { state, statusFilter, changeStatus, reload, loadMore, showLatestRuns }
}