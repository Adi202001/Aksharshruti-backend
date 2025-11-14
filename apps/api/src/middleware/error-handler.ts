import { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';

export function errorHandler(err: Error, c: Context) {
  console.error('Error:', err);

  // Handle HTTP exceptions
  if (err instanceof HTTPException) {
    return c.json({
      success: false,
      error: {
        code: err.message,
        message: err.message,
      },
    }, err.status);
  }

  // Handle validation errors
  if (err.name === 'ZodError') {
    return c.json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input data',
        details: (err as any).errors,
      },
    }, 400);
  }

  // Generic server error
  return c.json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    },
  }, 500);
}
