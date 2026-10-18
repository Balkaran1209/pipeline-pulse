export type Product = 'flasharray' | 'flashblade' | 'hyperscale'

export type RunStatus =
  | 'queued'
  | 'running'
  | 'passed'
  | 'failed'
  | 'flaky'

export interface Pipeline {
  id: string
  name: string
  product: Product
  createdAt: string
}

export interface Run {
  id: string
  pipelineId: string
  status: RunStatus
  startedAt: string
  finishedAt: string | null
  durationMs: number | null
  triggeredBy: string
  commitSha: string
}

export interface Note {
  id: string
  runId: string
  author: string
  body: string
  createdAt: string
}

export interface RunDetails extends Run {
  notes: Note[]
}

export interface RunPage {
  items: Run[]
  nextCursor: string | null
}

export interface CreatePipelineInput {
  name: string
  product: Product
}

export type UpdatePipelineInput = Partial<CreatePipelineInput>

export interface CreateRunInput {
  triggeredBy: string
  commitSha: string
}

export interface CreateNoteInput {
  author: string
  body: string
}