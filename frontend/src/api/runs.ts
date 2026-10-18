import { requestJson } from './client'
import type { RunPage, RunStatus } from './types'

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
}