import { Link } from 'react-router'
import { usePipelines } from './usePipelines'

const productLabels = {
  flasharray: 'FlashArray',
  flashblade: 'FlashBlade',
  hyperscale: 'Hyperscale',
}

export default function PipelinesPage() {
  const { state, reload } = usePipelines()

  return (
    <section aria-labelledby="pipelines-title">
      <div className="page-heading">
        <h1 id="pipelines-title">Pipelines</h1>
        <p>View your CI pipelines and explore their runs.</p>
      </div>

      {state.status === 'loading' && (
        <p className="notice" role="status">
          Loading pipelines...
        </p>
      )}

      {state.status === 'error' && (
        <div className="notice notice-error" role="alert">
          <p>{state.message}</p>
          <button className="button" type="button" onClick={reload}>
            Try again
          </button>
        </div>
      )}

      {state.status === 'success' && state.items.length === 0 && (
        <p className="notice">No pipelines found.</p>
      )}

      {state.status === 'success' && state.items.length > 0 && (
        <div
          className="table-scroll"
          role="region"
          aria-label="Pipelines table"
          tabIndex={0}
        >
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Product</th>
                <th scope="col">Created</th>
              </tr>
            </thead>

            <tbody>
              {state.items.map(pipeline => (
                <tr key={pipeline.id} data-testid="pipeline-row">
                  <td>
                    <Link
                      to={`/pipelines/${encodeURIComponent(pipeline.id)}`}
                    >
                      {pipeline.name}
                    </Link>
                  </td>
                  <td>{productLabels[pipeline.product]}</td>
                  <td>
                    <time dateTime={pipeline.createdAt}>
                      {new Date(pipeline.createdAt).toLocaleString()}
                    </time>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}