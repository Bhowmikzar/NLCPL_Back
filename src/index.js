const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

const healthRoute = require("./routes/health");
const paymentRoute = require("./routes/payment");

dotenv.config();

const app = express();

// =========================
// Middlewares
// =========================
const allowedOrigins = [
  "http://localhost:8080",
  "http://localhost:8081",
  "http://localhost:5173",
  process.env.FRONTEND_URL, // Vercel URL will be set on Render
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true); // Postman/no-origin
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS: " + origin));
    },
    methods: ["GET", "POST", "OPTIONS"],
    credentials: true,
  })
);


app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =========================
// Routes
// =========================
app.use("/api/health", healthRoute);
app.use("/api/payment", paymentRoute);

// Root check
app.get("/", (req, res) => {
  res.send("NLCPL backend running");
});

// =========================
// Server
// =========================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
