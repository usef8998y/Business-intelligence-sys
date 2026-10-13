import { Router } from "express";
import { getOverview } from "../controllers/metrics.controller";

export const metricsRouter = Router();

metricsRouter.get("/overview", getOverview);
