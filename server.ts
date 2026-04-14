import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { initDb, getDb } from "./src/db/database";
import apiRoutes from "./src/api/routes";
import { initCronJobs } from "./src/api/cron";

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.set('trust proxy', true);
  app.use(express.json());

  // Health check endpoint for Render
  app.get("/health", async (req, res) => {
    try {
      const db = await getDb();
      await db.get('SELECT 1');
      res.json({ status: "ok", database: "connected", timestamp: new Date().toISOString() });
    } catch (err) {
      res.status(500).json({ status: "error", database: "disconnected", timestamp: new Date().toISOString() });
    }
  });

  // Initialize Database
  try {
    console.log("Initializing database...");
    await Promise.race([
      initDb(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Database initialization timed out")), 15000))
    ]);
    console.log("Database initialized.");

    // Database Keep-Alive (every 5 minutes)
    setInterval(async () => {
      try {
        const db = await getDb();
        await db.get('SELECT 1');
        console.log('[DB-KEEP-ALIVE] Ping successful');
      } catch (err) {
        console.error('[DB-KEEP-ALIVE] Ping failed:', err);
      }
    }, 5 * 60 * 1000);
  } catch (err) {
    console.error("Failed to initialize database:", err);
  }

  // Initialize Cron Jobs
  initCronJobs();

  // API routes FIRST
  app.use("/api", apiRoutes);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
