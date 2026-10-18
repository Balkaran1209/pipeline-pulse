import CreatePipelineForm from './CreatePipelineForm'
import PipelineRow from './PipelineRow'
import { usePipelines } from './usePipelines'

export default function PipelinesPage() {
  const { state, reload, replacePipeline, removePipeline } = usePipelines()

  return (
    <section aria-labelledby="pipelines-title">
      <div className="page-heading">
        <h1 id="pipelines-title">Pipelines</h1>
        <p>View your CI pipelines and explore their runs.</p>
      </div>

      <CreatePipelineForm onCreated={reload} />

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
                <th scope="col">Actions</th>
              </tr>
            </thead>

            <tbody>
              {state.items.map(pipeline => (
                <PipelineRow
                  key={pipeline.id}
                  pipeline={pipeline}
                  onRenamed={replacePipeline}
                  onDeleted={removePipeline}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}