export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = "No autorizado.") {
    super(401, message);
  }
}

export class NotFoundError extends HttpError {
  constructor(message = "Recurso no encontrado.") {
    super(404, message);
  }
}

export class ConflictError extends HttpError {
  constructor(message = "Conflicto con el estado actual del recurso.") {
    super(409, message);
  }
}
