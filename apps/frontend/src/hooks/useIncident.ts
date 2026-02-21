import { useState, useEffect, useRef } from "react";
import { incidentApi } from "../services/api";
import type { Incident } from "../types/incident.types";

export function useIncident(id: string) {
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCountRef = useRef(0);

  const fetch = async () => {
    try {
      const data = await incidentApi.get(id);
      setIncident(data);
      pollCountRef.current += 1;

      // Stop polling on terminal state OR after 30 polls (~60 seconds)
      if (
        data.status === "completed" ||
        data.status === "failed" ||
        pollCountRef.current > 30
      ) {
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
    } catch (err) {
      console.error("Failed to fetch incident", err);
      if (intervalRef.current) clearInterval(intervalRef.current);
    } finally {
      setLoading(false);
    }
  };

  // Poll every 2 sec
  useEffect(() => {
    fetch();
    intervalRef.current = setInterval(fetch, 2000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [id]);

  return { incident, loading, refetch: fetch };
}

export function useIncidentList() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    try {
      const data = await incidentApi.list();
      setIncidents(data);
    } catch (err) {
      console.error("Failed to fetch incidents", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  return { incidents, loading, refetch: fetch };
}