import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '../../api/client'
import { runApi } from '../../api/runs'
import type { Note, Run, RunDetails } from '../../api/types'

type RunDetailsState =
  | { status: 'loading' }
  | { status: 'success'; run: RunDetails }
  | { status: 'error'; message: string }

export function useRunDetails(runId: string) {
  const [state, setState] = useState<RunDetailsState>({
    status: 'loading',
  })
  const [reloadKey, setReloadKey] = useState(0)
  const [liveError, setLiveError] = useState<string | null>(null)
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

    return () => {
      controller.abort()
      activeRequest.current?.abort()
    }
  }, [runId, reloadKey])

  const refreshStatus = useCallback(() => {
    activeRequest.current?.abort()

    const controller = new AbortController()
    activeRequest.current = controller

    runApi.get(runId, controller.signal)
      .then(run => {
        if (controller.signal.aborted) {
          return
        }

        setLiveError(null)

        setState(current => {
          if (
            current.status !== 'success'
            || current.run.id !== run.id
          ) {
            return current
          }

          return {
            status: 'success',
            run: {
              ...run,
              notes: current.run.notes,
            },
          }
        })
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return
        }

        if (error instanceof ApiError && error.status === 404) {
          setState({
            status: 'error',
            message: error.message,
          })
          return
        }

        setLiveError(
          'Could not refresh the run status. Use Reconnect to try again.',
        )
      })
      .finally(() => {
        if (activeRequest.current === controller) {
          activeRequest.current = null
        }
      })
  }, [runId])

  function reload() {
    activeRequest.current?.abort()
    setLiveError(null)
    setState({ status: 'loading' })
    setReloadKey(value => value + 1)
  }
  function replaceRun(updated: Run) {
    activeRequest.current?.abort()
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
  function addNote(note: Note) {
    setState(current => {
      if (
        current.status !== 'success'
        || current.run.id !== note.runId
        || current.run.notes.some(existing => existing.id === note.id)
      ) {
        return current
      }

      return {
        status: 'success',
        run: {
          ...current.run,
          notes: [...current.run.notes, note],
        },
      }
    })
  }
  function removeNote(noteId: string) {
    setState(current => {
      if (current.status !== 'success') {
        return current
      }

      return {
        status: 'success',
        run: {
          ...current.run,
          notes: current.run.notes.filter(note => note.id !== noteId),
        },
      }
    })
  }
  return {
    state,
    reload,
    replaceRun,
    addNote,
    removeNote,
    liveError,
    refreshStatus,
  }
}