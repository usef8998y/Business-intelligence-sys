import { Router } from "express";
import { analysisRouter } from "./analysis.routes";
import { healthRouter } from "./health.routes";
import { importRouter } from "./import.routes";
import { metricsRouter } from "./metrics.routes";
import { recommendationRouter } from "./recommendation.routes";

export const apiRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/imports", importRouter);
apiRouter.use("/metrics", metricsRouter);
apiRouter.use("/analysis", analysisRouter);
apiRouter.use("/recommendations", recommendationRouter);
