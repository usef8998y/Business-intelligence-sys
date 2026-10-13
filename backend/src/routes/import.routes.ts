import { Router } from "express";
import { createImport, getImport } from "../controllers/import.controller";

export const importRouter = Router();

importRouter.post("/", createImport);
importRouter.get("/:id", getImport);
