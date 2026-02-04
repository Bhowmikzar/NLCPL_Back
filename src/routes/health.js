const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.json({ status: "ok", service: "NLCPL payments backend" });
});

module.exports = router;
