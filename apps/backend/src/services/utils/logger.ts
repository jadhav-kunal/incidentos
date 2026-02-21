const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

export const logger = {
  info: (msg: string, meta?: any) => {
    console.log(`${colors.cyan}[INFO]${colors.reset} ${msg}`, meta || "");
  },
  success: (msg: string, meta?: any) => {
    console.log(`${colors.green}[OK]${colors.reset} ${msg}`, meta || "");
  },
  warn: (msg: string, meta?: any) => {
    console.warn(`${colors.yellow}[WARN]${colors.reset} ${msg}`, meta || "");
  },
  error: (msg: string, meta?: any) => {
    console.error(`${colors.red}[ERROR]${colors.reset} ${msg}`, meta || "");
  },
  demo: (msg: string) => {
    console.log(`${colors.yellow}[DEMO]${colors.reset} ${msg}`);
  },
};