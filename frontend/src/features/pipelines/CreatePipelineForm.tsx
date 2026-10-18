import { useState } from 'react'
import type { FormEvent } from 'react'
import type { Product } from '../../api/types'
import { useCreatePipeline } from './useCreatePipeline'

interface CreatePipelineFormProps {
  onCreated: () => void
}

export default function CreatePipelineForm({
  onCreated,
}: CreatePipelineFormProps) {
  const [name, setName] = useState('')
  const [product, setProduct] = useState<Product>('flasharray')
  const { state, create } = useCreatePipeline()

  const busy = state.status === 'submitting'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const pipeline = await create({
      name: name.trim(),
      product,
    })

    if (pipeline !== null) {
      setName('')
      onCreated()
    }
  }

  return (
    <form
      className="panel"
      aria-labelledby="create-pipeline-title"
      aria-busy={busy}
      onSubmit={handleSubmit}
    >
      <h2 id="create-pipeline-title">Create pipeline</h2>

      <div className="form-grid">
        <div className="form-field">
          <label htmlFor="create-pipeline-name">Pipeline name</label>
          <input
            id="create-pipeline-name"
            name="name"
            value={name}
            onChange={event => setName(event.target.value)}
            placeholder="e.g. Release Smoke Tests"
            required
            disabled={busy}
          />
        </div>

        <div className="form-field">
          <label htmlFor="create-pipeline-product">Product</label>
          <select
            id="create-pipeline-product"
            name="product"
            value={product}
            onChange={event =>
              setProduct(event.target.value as Product)
            }
            disabled={busy}
          >
            <option value="flasharray">FlashArray</option>
            <option value="flashblade">FlashBlade</option>
            <option value="hyperscale">Hyperscale</option>
          </select>
        </div>

        <button
          className="button"
          type="submit"
          data-testid="pipeline-create"
          disabled={busy}
        >
          {busy
            ? 'Creating...'
            : state.status === 'error'
              ? 'Retry creation'
              : 'Create pipeline'}
        </button>
      </div>

      {state.status === 'error' && (
        <p className="form-error" role="alert">
          {state.message}
        </p>
      )}

      {state.status === 'success' && (
        <p className="form-success" role="status">
          Pipeline "{state.name}" created.
        </p>
      )}
    </form>
  )
}