import { ZodError } from 'zod';

function formatZodError(error) {
  return error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));
}

export function validateBody(schema) {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body ?? {});
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: 'Invalid request body',
          details: formatZodError(error),
        });
      }
      return next(error);
    }
  };
}

export function validateQuery(schema) {
  return (req, res, next) => {
    try {
      req.query = schema.parse(req.query ?? {});
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: 'Invalid query params',
          details: formatZodError(error),
        });
      }
      return next(error);
    }
  };
}
