export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
    public code?: string
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export function notFound(message: string): AppError {
  return new AppError(message, 404, 'NOT_FOUND')
}

export function badRequest(message: string): AppError {
  return new AppError(message, 400, 'BAD_REQUEST')
}
