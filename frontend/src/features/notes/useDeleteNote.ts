import { useEffect, useRef, useState } from 'react'
import { ApiError } from '../../api/client'
import { noteApi } from '../../api/notes'

type DeleteNoteState =
  | { status: 'idle' }
  | { status: 'deleting' }
  | { status: 'error'; message: string }

export function useDeleteNote(noteId: string) {
  const [state, setState] = useState<DeleteNoteState>({
    status: 'idle',
  })
  const activeRequest = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => activeRequest.current?.abort()
  }, [])

  function reset() {
    if (activeRequest.current === null) {
      setState({ status: 'idle' })
    }
  }

  async function remove(): Promise<boolean> {
    if (activeRequest.current !== null) {
      return false
    }

    const controller = new AbortController()
    activeRequest.current = controller
    setState({ status: 'deleting' })

    try {
      await noteApi.remove(noteId, controller.signal)
      return !controller.signal.aborted
    } catch (error: unknown) {
      if (controller.signal.aborted) {
        return false
      }

      if (
        error instanceof ApiError
        && error.status === 404
        && error.code === 'NOT_FOUND'
      ) {
        return true
      }

      const message =
        error instanceof ApiError && error.status < 500
          ? error.message
          : 'Could not delete the note. Please try again.'

      setState({ status: 'error', message })
      return false
    } finally {
      if (activeRequest.current === controller) {
        activeRequest.current = null
      }
    }
  }

  return { state, remove, reset }
}