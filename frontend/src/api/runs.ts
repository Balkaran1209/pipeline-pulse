import { requestJson } from './client'
import type {
  CreateRunInput,
  Run,
  RunDetails,
  RunPage,
  RunStatus,
} from './types'

interface RunListOptions {
  status?: RunStatus
  limit?: number
  cursor?: string
  signal?: AbortSignal
}

export const runApi = {
  list(
    pipelineId: string,
    options: RunListOptions = {},
  ): Promise<RunPage> {
    const params = new URLSearchParams({
      limit: String(options.limit ?? 10),
    })

    if (options.status) {
      params.set('status', options.status)
    }

    if (options.cursor) {
      params.set('cursor', options.cursor)
    }

    return requestJson<RunPage>(
      `/pipelines/${encodeURIComponent(pipelineId)}/runs?${params}`,
      { signal: options.signal },
    )
  },

  get(id: string, signal?: AbortSignal): Promise<RunDetails> {
    return requestJson<RunDetails>(
      `/runs/${encodeURIComponent(id)}`,
      { signal },
    )
  },
  create(
    pipelineId: string,
    input: CreateRunInput,
    signal?: AbortSignal,
  ): Promise<Run> {
    return requestJson<Run>(
      `/pipelines/${encodeURIComponent(pipelineId)}/runs`,
      {
        method: 'POST',
        body: input,
        signal,
      },
    )
  },
}