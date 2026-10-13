import type { Request, Response } from "express";
import { HttpError } from "../middleware/errorHandler";

export function getOverview(_req: Request, _res: Response): void {
  throw new HttpError(501, "GET /api/metrics/overview is not implemented yet");
}
