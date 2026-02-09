const express = require("express");
const router = express.Router();
const { encryptCCAvenue } = require("../utils/ccavenue");
const { createPayPalOrder } = require("../utils/paypal");

/**
 * =========================
 * PAYMENT INITIATE
 * =========================
 */
router.post("/initiate", async (req, res) => {
  const { region, amount, currency, course, name, email, phone } = req.body;

  if (!region || !amount || !currency) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  /**
   * =========================
   * PAYPAL (Non-India)
   * =========================
   */
  if (region !== "IN") {
    try {
      const order = await createPayPalOrder(amount, currency);

      const approvalUrl = order.links?.find(
        (link) => link.rel === "approve"
      )?.href;

      if (!approvalUrl) {
        throw new Error("PayPal approval URL not found");
      }

      return res.json({
        gateway: "PayPal",
        redirectUrl: approvalUrl,
        orderId: order.id,
      });
    } catch (err) {
      console.error("PayPal error:", err.response?.data || err.message);
      return res.status(500).json({ error: "PayPal initiation failed" });
    }
  }

  /**
   * =========================
   * CCAVENUE (India)
   * =========================
   */
  const orderId = `ORD_${Date.now()}`;

  const payload = [
    `merchant_id=${process.env.CCA_MERCHANT_ID}`,
    `order_id=${orderId}`,
    `currency=${currency}`,
    `amount=${amount}`,
    `redirect_url=${process.env.CCA_REDIRECT_URL}`,
    `cancel_url=${process.env.CCA_CANCEL_URL}`,
    `language=EN`,
    `billing_name=${name || "Customer"}`,
    `billing_email=${email || "customer@example.com"}`,
    `billing_tel=${phone || "9999999999"}`,
  ].join("&");

  const encRequest = encryptCCAvenue(payload, process.env.CCA_WORKING_KEY);

  return res.json({
    gateway: "CCAvenue",
    action: "https://secure.ccavenue.com/transaction/initTrans",
    encRequest,
    accessCode: process.env.CCA_ACCESS_CODE,
    orderId,
  });
});

module.exports = router;
