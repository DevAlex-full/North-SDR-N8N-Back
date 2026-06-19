export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
  error?: string
  meta?: Record<string, unknown>
}

export function success<T>(data: T, message?: string, meta?: Record<string, unknown>): ApiResponse<T> {
  return {
    success: true,
    data,
    ...(message !== undefined && { message }),
    ...(meta !== undefined && { meta }),
  }
}

export function error(message: string, errorCode?: string): ApiResponse {
  return {
    success: false,
    message,
    ...(errorCode !== undefined && { error: errorCode }),
  }
}
