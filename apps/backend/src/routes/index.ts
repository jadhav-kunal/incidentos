import { Router } from "express";
import { incidentController } from "../modules/incident/incident.controller";

export const incidentRoutes = Router();

// Incident CRUD
incidentRoutes.post("/incidents", incidentController.create);
incidentRoutes.get("/incidents", incidentController.list);
incidentRoutes.get("/incidents/:id", incidentController.getById);

// Input ingestion
incidentRoutes.post("/incidents/:id/input", incidentController.addInput);

// Trigger full analysis pipeline
incidentRoutes.post("/incidents/:id/analyze", incidentController.analyze);

// Demo shortcut — loads prebuilt dataset and runs pipeline
incidentRoutes.post("/incidents/:id/simulate", incidentController.simulate);