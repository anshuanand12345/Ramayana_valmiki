import { AppError } from '../utils/errors.js';

export const validate = (schema) => (req, _res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return next(new AppError(400, 'VALIDATION_ERROR', result.error.issues.map((i) => i.message).join(' ')));
  }
  req.body = result.data;
  next();
};
