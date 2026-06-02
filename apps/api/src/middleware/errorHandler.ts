import type { NextFunction, Request, Response } from "express";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      type: "about:blank",
      title: err.message,
      status: err.statusCode,
      code: err.code,
    });
    return;
  }

  console.error(err);
  res.status(500).json({
    type: "about:blank",
    title: "Internal server error",
    status: 500,
  });
}
