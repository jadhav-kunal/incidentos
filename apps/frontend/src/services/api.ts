import axios from "axios";
import type { Incident } from "../types/incident.types";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3001/api",
});

export const incidentApi = {
  async create(title: string): Promise<{ id: string }> {
    const res = await api.post("/incidents", { title });
    return res.data;
  },

  async addInput(id: string, type: string, data: any): Promise<void> {
  await api.post(`/incidents/${id}/input`, { type, data });
  },

  async list(): Promise<Incident[]> {
    const res = await api.get("/incidents");
    return res.data;
  },

  async get(id: string): Promise<Incident> {
    const res = await api.get(`/incidents/${id}`);
    return res.data;
  },

  async simulate(id: string): Promise<void> {
    await api.post(`/incidents/${id}/simulate`);
  },

  async analyze(id: string): Promise<void> {
    await api.post(`/incidents/${id}/analyze`);
  },
};