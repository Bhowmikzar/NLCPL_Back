const express = require("express");
const crypto = require("crypto");
const router = express.Router();

const { getRazorpayClient } = require("../utils/razorpay");
const { createPayPalOrder, capturePayPalOrder } = require("../utils/paypal");


router.get("/ping", (req, res) => {
  res.json({ ok: true, route: "payment" });
});

/**
 * =========================
 * RAZORPAY (India)
 * =========================
 */
router.post("/razorpay/create-order", async (req, res) => {

  const razorpay = getRazorpayClient();

  if (!razorpay) {
    return res.status(500).json({
      error: "Razorpay keys missing in .env (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET)",
    });
  }

  try {
    const { amount, currency = "INR" } = req.body;

    const order = await razorpay.orders.create({
      amount: Math.round(Number(amount) * 100),
      currency,
      receipt: `rcpt_${Date.now()}`
    });

    return res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID
    });

  } catch (err) {
    console.error("Razorpay create order error:", err);
    return res.status(500).json({
  error: "Razorpay order creation failed",
  details: err?.error?.description || err?.message || String(err),
});

  }
});


router.post("/razorpay/verify", (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, error: "Missing fields" });
    }

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    const isValid = expectedSignature === razorpay_signature;

    if (!isValid) {
      return res.status(400).json({ success: false, error: "Invalid signature" });
    }

    // TODO: Store success in DB if needed
    return res.json({ success: true });
  } catch (err) {
    console.error("Razorpay verify error:", err);
    return res.status(500).json({ success: false, error: "Verify failed" });
  }
});

/**
 * =========================
 * PAYPAL (Non-India)
 * =========================
 * Keeping your current "redirectUrl" approval flow.
 */
router.post("/paypal/create-order", async (req, res) => {
  const { amount, currency } = req.body;

  if (!amount || !currency) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const order = await createPayPalOrder(amount, currency);

    const approvalUrl = order.links?.find((link) => link.rel === "approve")?.href;
    if (!approvalUrl) throw new Error("PayPal approval URL not found");

    return res.json({
      gateway: "PayPal",
      redirectUrl: approvalUrl,
      orderId: order.id,
    });
  } catch (err) {
    console.error("PayPal error:", err.response?.data || err.message);
    return res.status(500).json({
      error: "PayPal initiation failed",
      details: err.response?.data || err.message,
    });
  }
});



router.post("/paypal/capture-order", async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ error: "Missing orderId" });

    const capture = await capturePayPalOrder(orderId);
    return res.json({ success: true, capture });
  } catch (err) {
    console.error("PayPal capture error:", err.response?.data || err.message);
    return res.status(500).json({ error: "PayPal capture failed" });
  }
});


module.exports = router;
