export const errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  console.error(err.message);
  const errorMap = {
    CastError: { status: 400, message: "malformatted id" },
    ValidationError: { status: 400, message: err.message },
    JsonWebTokenError: { status: 401, message: "invalid token" },
    NotFoundError: { status: 404, message: "resource not found" },
    ForbiddenError: { status: 403, message: "forbidden" },
  };
  if (
    err.name === "MongoServerError" &&
    err.message.includes("E11000 duplicate key error")
  ) {
    return res.status(400).json({ error: "expected `username` to be unique" });
  }

  const mappedError = errorMap[err.name];
  if (mappedError) {
    return res.status(mappedError.status).json({ error: mappedError.message });
  }
  next(err);
};
