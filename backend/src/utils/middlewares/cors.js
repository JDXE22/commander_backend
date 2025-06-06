import cors from "cors";
const ACCEPTED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:5482",
  "http://localhost:8080",
  "http://localhost:1234",
  "https://commander-8xmm.onrender.com/",
  "http://localhost:5173",
  "https://commanderfront.vercel.app",
];

export const corsMiddleware = ({ acceptedOrigins = ACCEPTED_ORIGINS } = {}) =>
  cors({
    origin: (origin, callback) => {
      if (acceptedOrigins.includes(origin)) {
        return callback(null, true);
      }

      if (!origin) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
  });
