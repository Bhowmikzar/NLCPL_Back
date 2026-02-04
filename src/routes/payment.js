const express = require("express");
const axios = require("axios");
const router = express.Router();
const { encryptCCAvenue } = require("../utils/ccavenue");

/**
 * Helper: Get PayPal access token
 */
const getPayPalAccessToken = async () => {
  const auth = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET}`
  ).toString("base64");

  const response = await axios.post(
    "https://api-m.sandbox.paypal.com/v1/oauth2/token",
    "grant_type=client_credentials",
    {
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  return response.data.access_token;
};

router.post("/initiate", async (req, res) => {
  const { region, amount, currency, course } = req.body;

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
      const accessToken = await getPayPalAccessToken();

      const orderRes = await axios.post(
        "https://api-m.sandbox.paypal.com/v2/checkout/orders",
        {
          intent: "CAPTURE",
          purchase_units: [
            {
              amount: {
                currency_code: currency,
                value: amount.toString(),
              },
              description: course || "Course Purchase",
            },
          ],
          application_context: {
            return_url: process.env.PAYPAL_RETURN_URL,
            cancel_url: process.env.PAYPAL_CANCEL_URL,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      const approvalUrl = orderRes.data.links.find(
        (link) => link.rel === "approve"
      )?.href;

      return res.json({
        gateway: "PayPal",
        redirectUrl: approvalUrl,
        orderId: orderRes.data.id,
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
