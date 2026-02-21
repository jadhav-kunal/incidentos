import { Request, Response } from "express";
import { incidentService } from "./incident.service";
import { logger } from "../../services/utils/logger";

export const incidentController = {
  async create(req: Request, res: Response) {
    try {
      const { title } = req.body;
      if (!title) return res.status(400).json({ error: "title is required" });

      const incident = await incidentService.createIncident(title);
      return res.status(201).json(incident);
    } catch (err) {
      logger.error("Failed to create incident", err);
      return res.status(500).json({ error: "Failed to create incident" });
    }
  },

  async list(_req: Request, res: Response) {
    try {
      const incidents = await incidentService.listIncidents();
      return res.json(incidents);
    } catch (err) {
      logger.error("Failed to list incidents", err);
      return res.status(500).json({ error: "Failed to list incidents" });
    }
  },

  async getById(req: Request, res: Response) {
    try {
      const incident = await incidentService.getIncident(req.params.id);
      if (!incident) return res.status(404).json({ error: "Incident not found" });
      return res.json(incident);
    } catch (err) {
      logger.error("Failed to get incident", err);
      return res.status(500).json({ error: "Failed to get incident" });
    }
  },

  async addInput(req: Request, res: Response) {
    try {
      const { type, data } = req.body;
      if (!type || !data)
        return res.status(400).json({ error: "type and data are required" });

      await incidentService.addInput(req.params.id, type, data);
      return res.json({ success: true });
    } catch (err) {
      logger.error("Failed to add input", err);
      return res.status(500).json({ error: "Failed to add input" });
    }
  },

  async analyze(req: Request, res: Response) {
    try {
      const incident = await incidentService.getIncident(req.params.id);
      if (!incident)
        return res.status(404).json({ error: "Incident not found" });

      // Fire pipeline async — return immediately
      res.json({ status: "processing", incidentId: req.params.id });

      // Run in background
      incidentService.runAnalysisPipeline(req.params.id).catch((err) => {
        logger.error("Pipeline failed", err);
      });
    } catch (err) {
      logger.error("Failed to trigger analysis", err);
      return res.status(500).json({ error: "Failed to trigger analysis" });
    }
  },

  async simulate(req: Request, res: Response) {
    try {
      res.json({ status: "processing", incidentId: req.params.id });

      incidentService.runSimulation(req.params.id).catch((err) => {
        logger.error("Simulation failed", err);
      });
    } catch (err) {
      logger.error("Failed to run simulation", err);
      return res.status(500).json({ error: "Failed to run simulation" });
    }
  },
};