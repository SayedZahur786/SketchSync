
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import ConnectionDB from "./db/db.js";
import mainRoute from "./routes/main.routes.js";
import authRoute from "./routes/auth.routes.js";
import {socketHandlers} from "./socket/socketHandlers.js";

dotenv.config();
ConnectionDB();

const app = express();
const server = http.createServer(app);

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST'],
  credentials: true
};

const io = new Server(server, {
  cors: corsOptions
});

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// API Routes
app.use("/api/v1", mainRoute);
app.use("/api/v1/auth", authRoute);

// Default Route
app.get("/", (req, res) => {
  res.json({ message: "server is ready" });
});

// Socket.IO setup
socketHandlers(io);

// Start server
server.listen(process.env.PORT, () => {
  console.log(`server is running at ${process.env.PORT}`);
});