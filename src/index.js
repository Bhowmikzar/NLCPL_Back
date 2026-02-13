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
app.use(
  cors({
    origin: [
      "http://localhost:8080", // Local development
      "https://nextled.netlify.app", // Production frontend
    ],
    methods: ["GET", "POST"],
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
