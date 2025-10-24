
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

// CORS configuration - Support multiple frontend URLs
const allowedOrigins = process.env.FRONTEND_URL 
  ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
  : ['*'];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if the origin is in the allowed origins list
    if (allowedOrigins.includes('*') || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
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