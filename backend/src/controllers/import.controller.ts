import type { Request, Response } from "express";
import { HttpError } from "../middleware/errorHandler";

export function createImport(_req: Request, _res: Response): void {
  throw new HttpError(501, "POST /api/imports is not implemented yet");
}

export function getImport(_req: Request, _res: Response): void {
  throw new HttpError(501, "GET /api/imports/:id is not implemented yet");
}
