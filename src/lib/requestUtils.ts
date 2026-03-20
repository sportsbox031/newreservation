export class RequestTimeoutError extends Error {
  code: string

  constructor(message: string) {
    super(message)
    this.name = 'RequestTimeoutError'
    this.code = 'REQUEST_TIMEOUT'
  }
}

export async function withTimeout<T>(
  promise: PromiseLike<T>,
  ms: number,
  message: string
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new RequestTimeoutError(message))
        }, ms)
      })
    ])
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
  }
}

export function isTimeoutError(error: unknown): error is RequestTimeoutError {
  return error instanceof RequestTimeoutError ||
    (typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === 'REQUEST_TIMEOUT')
}

export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) {
      return message
    }
  }

  return fallback
}
