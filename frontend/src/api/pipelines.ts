import { requestJson, requestNoContent } from './client'
import type {
  CreatePipelineInput,
  Pipeline,
  UpdatePipelineInput,
} from './types'

function pipelinePath(id: string): string {
  return `/pipelines/${encodeURIComponent(id)}`
}

export const pipelineApi = {
  list(signal?: AbortSignal): Promise<Pipeline[]> {
    return requestJson<Pipeline[]>('/pipelines', { signal })
  },

  get(id: string, signal?: AbortSignal): Promise<Pipeline> {
    return requestJson<Pipeline>(pipelinePath(id), { signal })
  },

  create(
    input: CreatePipelineInput,
    idempotencyKey: string,
    signal?: AbortSignal,
  ): Promise<Pipeline> {
    return requestJson<Pipeline>('/pipelines', {
      method: 'POST',
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
      body: input,
      signal,
    })
  },

  update(
    id: string,
    input: UpdatePipelineInput,
    signal?: AbortSignal,
  ): Promise<Pipeline> {
    return requestJson<Pipeline>(pipelinePath(id), {
      method: 'PATCH',
      body: input,
      signal,
    })
  },

  remove(id: string, signal?: AbortSignal): Promise<void> {
    return requestNoContent(pipelinePath(id), {
      method: 'DELETE',
      signal,
    })
  },
}