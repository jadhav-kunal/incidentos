import dotenv from "dotenv";
dotenv.config({ path: "../../.env" });
dotenv.config({ path: "../../.env.local" });

export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  DEMO_MODE: process.env.DEMO_MODE === "true",
  PORT: parseInt(process.env.PORT || "3001"),

  CONVEX_URL: process.env.VITE_CONVEX_URL || "",

  MINIMAX_API_KEY: process.env.MINIMAX_API_KEY || "",
  MINIMAX_GROUP_ID: process.env.MINIMAX_GROUP_ID || "",
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
  ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY || "",
  SPEECHMATICS_API_KEY: process.env.SPEECHMATICS_API_KEY || "",
  VAPI_API_KEY: process.env.VAPI_API_KEY || "",
};

export const isDemoMode = () => env.DEMO_MODE;