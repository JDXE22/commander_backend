/**
 * Middleware that routes GET requests with a `?trigger=` query param
 * to the getByCommand handler instead of getAll.
 *
 * @param {import('express').RequestHandler} getByCommandHandler
 * @returns {import('express').RequestHandler}
 */
export const byTrigger = (getByCommandHandler) => (req, res, next) => {
  if (req.query.trigger) return getByCommandHandler(req, res, next);
  next();
};
