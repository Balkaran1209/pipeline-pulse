import { requestJson, requestNoContent } from './client'
import type { CreateNoteInput, Note } from './types'

export const noteApi = {
  create(
    runId: string,
    input: CreateNoteInput,
    signal?: AbortSignal,
  ): Promise<Note> {
    return requestJson<Note>(
      `/runs/${encodeURIComponent(runId)}/notes`,
      {
        method: 'POST',
        body: input,
        signal,
      },
    )
  },

  remove(id: string, signal?: AbortSignal): Promise<void> {
    return requestNoContent(
      `/notes/${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
        signal,
      },
    )
  },
}