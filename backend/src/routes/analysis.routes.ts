import { Router } from "express";
import { askQuestion } from "../controllers/analysis.controller";

export const analysisRouter = Router();

analysisRouter.post("/questions", askQuestion);
