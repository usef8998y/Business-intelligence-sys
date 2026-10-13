import { Router } from "express";
import {
  listRecommendations,
  reviewRecommendation,
} from "../controllers/recommendation.controller";

export const recommendationRouter = Router();

recommendationRouter.get("/", listRecommendations);
recommendationRouter.post("/:id/review", reviewRecommendation);
