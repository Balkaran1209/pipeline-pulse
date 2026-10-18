type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
}

interface ApiErrorBody {
  error: {
    code: string
    message: string
  }
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('error' in value)
  ) {
    return false
  }

  const error = value.error

  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string' &&
    'message' in error &&
    typeof error.message === 'string'
  )
}

async function sendRequest(
  path: string,
  options: RequestOptions = {},
): Promise<Response> {
  const { body, ...requestOptions } = options
  const headers = new Headers(requestOptions.headers)

  headers.set('Accept', 'application/json')

  if (body !== undefined) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`/api/v1${path}`, {
    ...requestOptions,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (!response.ok) {
    let payload: unknown

    try {
      payload = await response.json()
    } catch (error) {
      if (requestOptions.signal?.aborted) {
        throw error
      }

      payload = null
    }

    if (isApiErrorBody(payload)) {
      throw new ApiError(
        response.status,
        payload.error.code,
        payload.error.message,
      )
    }

    throw new ApiError(
      response.status,
      'HTTP_ERROR',
      `Request failed (${response.status}). Please try again.`,
    )
  }

  return response
}

export async function requestJson<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const response = await sendRequest(path, options)
  return response.json() as Promise<T>
}

export async function requestNoContent(
  path: string,
  options: RequestOptions = {},
): Promise<void> {
  await sendRequest(path, options)
}