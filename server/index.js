import express from "express";
import cors from "cors";
import multer from "multer";
import axios from "axios";
import courseRoutes from "./routes/courses.js";
import { pool } from "./db.js";
import { verifyCbePayment } from "./cbeAuth.js";

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const PAYMENT_WINDOW_MINUTES = 120;

const randomRef = () => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let reference = "";
  for (let i = 0; i < 8; i += 1) {
    reference += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return reference;
};


class VerificationError extends Error {
  constructor(statusCode, message, failureReason, paymentStatus = "FAILED") {
    super(message);
    this.name = "VerificationError";
    this.statusCode = statusCode;
    this.failureReason = failureReason;
    this.paymentStatus = paymentStatus;
  }
}

const ensurePaymentsTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY,
      student_id INTEGER NOT NULL,
      course_id INTEGER NOT NULL,
      transaction_id TEXT,
      phone_number TEXT,
      suffix TEXT,
      status TEXT DEFAULT 'PENDING',
      verified_at TIMESTAMP WITH TIME ZONE,
      failure_reason TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      reference_code VARCHAR(64) NOT NULL,
      expected_amount NUMERIC(12, 2) NOT NULL,
      amount NUMERIC(12, 2),
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW() + INTERVAL '${PAYMENT_WINDOW_MINUTES} minutes'
    );
  `);

  try {
    await pool.query(
      `ALTER TABLE payments ALTER COLUMN expires_at SET DEFAULT NOW() + INTERVAL '${PAYMENT_WINDOW_MINUTES} minutes'`
    );
  } catch (error) {
    if (error.code !== "42703") {
      throw error;
    }
  }

  await pool.query(
    `UPDATE payments SET expires_at = NOW() + INTERVAL '${PAYMENT_WINDOW_MINUTES} minutes' WHERE expires_at IS NULL`
  );

  await pool.query(
    `UPDATE payments
     SET expires_at = NOW() + INTERVAL '${PAYMENT_WINDOW_MINUTES} minutes'
     WHERE status = 'PENDING' AND expires_at < NOW()`
  );

  try {
    await pool.query(
      "ALTER TABLE payments ADD COLUMN failure_reason TEXT"
    );
  } catch (error) {
    if (error.code !== "42701") {
      throw error;
    }
  }

  try {
    await pool.query(
      "ALTER TABLE payments ADD COLUMN access_granted BOOLEAN DEFAULT false"
    );
  } catch (error) {
    if (error.code !== "42701") {
      throw error;
    }
  }
};

app.use(cors());
app.use(express.json());

app.use(courseRoutes);

app.post("/api/verify-cbe", async (req, res) => {
  const { reference, accountSuffix } = req.body || {};

  if (!reference || accountSuffix === undefined || accountSuffix === null) {
    return res
      .status(400)
      .json({ success: false, message: "reference and accountSuffix are required" });
  }

  const key = process.env.VERIFY_API_KEY || process.env.VERIFIER_API_KEY;

  if (!key) {
    return res
      .status(500)
      .json({ success: false, message: "Server VERIFY_API_KEY not configured" });
  }

  try {
    const upstream = await axios.post(
      "https://verifyapi.leulzenebe.pro/verify-cbe",
      { reference, accountSuffix },
      { headers: { "Content-Type": "application/json", "x-api-key": key } }
    );

    return res.status(upstream.status).json(upstream.data);
  } catch (err) {
    const status = err?.response?.status || 500;
    const data = err?.response?.data || {
      success: false,
      message: err.message || "Upstream error",
    };

    return res.status(status).json(data);
  }
});

app.post("/create-payment", async (req, res) => {
  const { studentId, courseId } = req.body;

  if (!studentId || !courseId) {
    return res
      .status(400)
      .json({ error: "studentId and courseId are required" });
  }

  try {
    const successful = await pool.query(
      `SELECT reference_code, expected_amount, status, verified_at
       FROM payments
       WHERE student_id = $1 AND course_id = $2 AND status = 'VERIFIED'
       ORDER BY verified_at DESC NULLS LAST, created_at DESC
       LIMIT 1`,
      [studentId, courseId]
    );

    if (successful.rows.length) {
      return res.status(409).json({
        error: "Payment already verified for this student and course",
        reference: successful.rows[0].reference_code,
        amount: successful.rows[0].expected_amount,
        status: successful.rows[0].status,
      });
    }

    const existing = await pool.query(
      `SELECT reference_code, expected_amount
       FROM payments
       WHERE student_id = $1 AND course_id = $2 AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1`,
      [studentId, courseId]
    );

    if (existing.rows.length) {
      return res.json({
        reference: existing.rows[0].reference_code,
        amount: existing.rows[0].expected_amount,
        reused: true,
      });
    }

    const { rows } = await pool.query(
      "SELECT price FROM courses WHERE id = $1",
      [courseId]
    );

    if (!rows.length) {
      return res.status(404).json({ error: "Course not found" });
    }

    const reference = randomRef();

    try {
      await pool.query(
        `INSERT INTO payments (
          student_id,
          course_id,
          reference_code,
          expected_amount,
          amount
        ) VALUES ($1, $2, $3, $4, $5)`,
        [studentId, courseId, reference, rows[0].price, rows[0].price]
      );
    } catch (error) {
      console.error("Error inserting payment:", error);
      throw error;
    }
    
    res.json({ reference, amount: rows[0].price });
  } catch (error) {
    console.error("Error creating payment:", error);
    res.status(500).json({ error: "Failed to create payment" });
  }
});

app.get("/payments/latest-reference", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT reference_code
       FROM payments
       WHERE student_id = $1 AND course_id = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [req.query.studentId || 1, req.query.courseId || 1]
    );

    if (!rows.length) {
      return res.status(404).json({ error: "No recent reference found" });
    }

    res.json({ reference: rows[0].reference_code });
  } catch (error) {
    console.error("Error fetching latest reference:", error);
    res.status(500).json({ error: "Failed to fetch reference" });
  }
});

app.get("/payments/access", async (req, res) => {
  const studentId = Number(req.query.studentId);
  const courseId = Number(req.query.courseId);

  if (!Number.isInteger(studentId) || !Number.isInteger(courseId)) {
    return res.status(400).json({ error: "studentId and courseId are required" });
  }

  try {
    const { rows } = await pool.query(
      `SELECT access_granted, status
       FROM payments
       WHERE student_id = $1 AND course_id = $2
       ORDER BY
         CASE
           WHEN status = 'VERIFIED' THEN 0
           WHEN status = 'PENDING' THEN 1
           ELSE 2
         END,
         COALESCE(verified_at, created_at) DESC,
         created_at DESC
       LIMIT 1`,
      [studentId, courseId]
    );

    if (!rows.length) {
      return res.status(404).json({ error: "No payments found" });
    }

    return res.json({
      accessGranted: Boolean(rows[0].access_granted),
      status: rows[0].status,
    });
  } catch (error) {
    console.error("Error fetching payment access:", error);
    return res.status(500).json({ error: "Failed to fetch payment access" });
  }
});

app.post("/verify-payment", upload.single("qrImage"), async (req, res) => {
  const {
    studentId,
    courseId,
    transactionId,
    referenceCode,
    accountSuffix,
  } = req.body;

  if (!studentId || !courseId) {
    return res
      .status(400)
      .json({ error: "studentId and courseId are required" });
  }

  if (!transactionId) {
    return res.status(400).json({ error: "transactionId is required" });
  }

  if (!accountSuffix) {
    return res.status(400).json({ error: "accountSuffix is required" });
  }

  let payment;

  try {
    const { rows: paymentRows } = await pool.query(
      `SELECT id, expected_amount, reference_code, expires_at
       FROM payments
       WHERE student_id = $1 AND course_id = $2 AND reference_code = $3
       ORDER BY created_at DESC
       LIMIT 1`,
      [studentId, courseId, referenceCode]
    );

    if (!paymentRows.length) {
      return res.status(404).json({ error: "Payment session not found" });
    }
    payment = paymentRows[0];

    if (payment.expires_at && new Date(payment.expires_at) < new Date()) {
      throw new VerificationError(
        410,
        "Payment window expired",
        "Payment window expired",
        "EXPIRED"
      );
    }

    let verification;
    try {
      verification = await verifyCbePayment({
        reference: transactionId,
        accountSuffix,
      });

      console.log("transaction id"+ transactionId, "account number: " + accountSuffix);

      console.log("Verifier API response:", verification);
    } catch (providerError) {
      console.error("Verifier API error:", providerError);
      throw new VerificationError(
        503,
        "Unable to reach payment provider. Please try again.",
        providerError.message || "Provider timeout"
      );
    }

    if (verification?.success === false) {
      throw new VerificationError(
        503,
        "Payment provider failed to verify the transaction. Please retry shortly.",
        verification.error || "Provider verification failure"
      );
    }

    const normalize = (value = "") =>
      value
        .toString()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
    const parsedAmount = (() => {
      const rawAmount = verification.amount;

      if (rawAmount === undefined || rawAmount === null || rawAmount === "") {
        return NaN;
      }

      if (typeof rawAmount === "number") {
        return Number.isFinite(rawAmount) ? rawAmount : NaN;
      }

      if (typeof rawAmount === "string") {
        const sanitized = rawAmount.replace(/[^0-9.]/g, "");
        return sanitized ? Number(sanitized) : NaN;
      }

      return NaN;
    })();
    const expectedAmount = Number(payment.expected_amount);
    const normalizedReason = normalize(verification.reason);
    const referenceCandidates = [referenceCode, payment.reference_code]
      .map(normalize)
      .filter(Boolean);
    const referenceMatches =
      normalizedReason.length > 0 &&
      referenceCandidates.some((candidate) => normalizedReason.includes(candidate));

    if (!referenceMatches) {
      throw new VerificationError(
        400,
        "Reference not found in transaction details",
        "Reference mismatch"
      );
    }

    if (!Number.isFinite(parsedAmount) || Math.abs(parsedAmount - expectedAmount) > 0.009) {
      throw new VerificationError(
        400,
        "Transferred amount mismatched",
        "Amount mismatch"
      );
    }

    const digits = (verification.receiverAccount || "").replace(/\D/g, "");
    const expectedSuffixDigits = (accountSuffix || "").replace(/\D/g, "");
    const receiverLast4 = digits.slice(-4);
    const expectedLast4 = expectedSuffixDigits.slice(-4);

    console.log(
      "receiver account last4 match",
      receiverLast4 === expectedLast4,
      "expected last4",
      expectedLast4,
      "receiver last4",
      receiverLast4
    );

    if (receiverLast4 && expectedLast4 && receiverLast4 !== expectedLast4) {
      throw new VerificationError(
        400,
        "Receiver account mismatched",
        "Account mismatch"
      );
    }

    await pool.query(
      `UPDATE payments
       SET status = $1,
           verified_at = NOW(),
           transaction_id = $2,
           amount = $3,
           failure_reason = NULL,
           access_granted = true
       WHERE id = $4`,
      ["VERIFIED", transactionId, parsedAmount, payment.id]
    );

    return res.json({
      success: true,
      message: "Payment verified",
      providerResponse: verification,
    });
  } catch (error) {
    if (error instanceof VerificationError) {
      if (payment?.id) {
        await pool.query(
          "UPDATE payments SET status = $1, failure_reason = $2 WHERE id = $3",
          [error.paymentStatus, error.failureReason || error.message, payment.id]
        );
      }

      return res.status(error.statusCode).json({ error: error.message });
    }

    console.error("Error verifying payment:", error);
    res.status(500).json({ error: "Failed to verify payment" });
  }
});

const startServer = async () => {
  try {
    await ensurePaymentsTable();
    app.listen(5000, () => {
      console.log("Server running on port 5000");
    });
  } catch (error) {
    console.error("Failed to initialize server:", error);
    process.exit(1);
  }
};

startServer();