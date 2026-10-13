import type { Request, Response } from "express";
import { HttpError } from "../middleware/errorHandler";

export function askQuestion(_req: Request, _res: Response): void {
  throw new HttpError(501, "POST /api/analysis/questions is not implemented yet");
}
