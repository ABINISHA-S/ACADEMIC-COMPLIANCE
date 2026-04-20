import express from "express";
import cors from "cors";
import apiRoutes from "./routes.js";
import { connectDB } from "./db.js";

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  await connectDB();

  // Middleware
  app.use(cors()); // Allow frontend to fetch data cleanly
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // API routes
  app.use("/api", apiRoutes);

  // Health check route
  app.get('/', (req, res) => {
    res.send('Academic Backend Server is running');
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Backend Server running on http://localhost:${PORT}`);
  });
}

startServer();
