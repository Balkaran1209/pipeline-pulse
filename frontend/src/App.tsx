import { Link, Route, Routes, useParams } from 'react-router'
import PipelinesPage from './features/pipelines/PipelinesPage'
import './App.css'


function PipelineRunsPage() {
  const { id } = useParams()

  return (
    <section>
      <h1>Pipeline runs</h1>
      <p>Pipeline: {id}</p>
    </section>
  )
}

function RunDetailsPage() {
  const { id } = useParams()

  return (
    <section>
      <h1>Run details</h1>
      <p>Run: {id}</p>
    </section>
  )
}

function NotFoundPage() {
  return (
    <section>
      <h1>Page not found</h1>
      <p>The requested page does not exist.</p>
      <Link to="/">Return to pipelines</Link>
    </section>
  )
}

export default function App() {
  return (
    <>
      <header className="app-header">
        <div className="app-header-inner">
          <span className="app-brand">Pipeline Pulse</span>

          <nav aria-label="Main navigation">
            <Link to="/" data-testid="nav-home">
              Pipelines
            </Link>
          </nav>
        </div>
      </header>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<PipelinesPage />} />
          <Route
            path="/pipelines/:id"
            element={<PipelineRunsPage />}
          />
          <Route path="/runs/:id" element={<RunDetailsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </>
  )
}