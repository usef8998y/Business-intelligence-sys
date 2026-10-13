import type { Request, Response } from "express";
import { HttpError } from "../middleware/errorHandler";

export function listRecommendations(_req: Request, _res: Response): void {
  throw new HttpError(501, "GET /api/recommendations is not implemented yet");
}

export function reviewRecommendation(_req: Request, _res: Response): void {
  throw new HttpError(501, "POST /api/recommendations/:id/review is not implemented yet");
}
