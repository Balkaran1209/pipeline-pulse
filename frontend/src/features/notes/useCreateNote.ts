import { useEffect, useRef, useState } from 'react'
import { ApiError } from '../../api/client'
import { noteApi } from '../../api/notes'
import type { CreateNoteInput, Note } from '../../api/types'

type CreateNoteState =
  | { status: 'idle' }
  | { status: 'saving' }
  | { status: 'success' }
  | { status: 'error'; message: string }

export function useCreateNote(runId: string) {
  const [state, setState] = useState<CreateNoteState>({
    status: 'idle',
  })
  const activeRequest = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => activeRequest.current?.abort()
  }, [])

  async function create(
    input: CreateNoteInput,
  ): Promise<Note | null> {
    if (activeRequest.current !== null) {
      return null
    }

    const author = input.author.trim()

    if (!author || !input.body.trim()) {
      setState({
        status: 'error',
        message: 'Author and note body are required.',
      })
      return null
    }

    const controller = new AbortController()
    activeRequest.current = controller
    setState({ status: 'saving' })

    try {
      const note = await noteApi.create(
        runId,
        { author, body: input.body },
        controller.signal,
      )

      if (controller.signal.aborted) {
        return null
      }

      setState({ status: 'success' })
      return note
    } catch (error: unknown) {
      if (controller.signal.aborted) {
        return null
      }

      const message =
        error instanceof ApiError && error.status < 500
          ? error.message
          : 'Note creation could not be confirmed. Refresh this page to check the notes before submitting again.'

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