export class AppError extends Error {
  readonly status: number;

  constructor(
    message: string,
    status: number,
    options?: ErrorOptions,
  ) {
    super(message, options);

    this.name = "AppError";
    this.status = status;
  }
}