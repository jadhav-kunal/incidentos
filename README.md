# IncidentOS – Autonomous Incident Commander

> An autonomous AI reasoning system that ingests logs, metrics, Slack threads,
> and voice transcripts to generate ranked root-cause hypotheses, mitigation
> plans, and spoken executive summaries.

## Architecture
```
Event Ingestion → Normalization → Context Graph Builder
→ Hypothesis Engine (Multi-Agent) → Mitigation Planner
→ Summary Generator → Audio Service
```

## Stack

- **Backend**: Node.js + Express + TypeScript + Prisma
- **Queue**: Redis + BullMQ  
- **Database**: PostgreSQL
- **AI**: MiniMax (reasoning), ElevenLabs (audio), Speechmatics (voice)
- **Frontend**: React + Vite + TailwindCSS

## Quick Start
```bash
# Start infrastructure
docker-compose up -d

# Backend
cd apps/backend && npm install && npm run dev

# Frontend  
cd apps/frontend && npm install && npm run dev
```

## Demo Mode

Set `DEMO_MODE=true` in `.env` to run fully without external API dependencies.
Built at Afore Capital Hackathon — Episode III, February 2026.
```
