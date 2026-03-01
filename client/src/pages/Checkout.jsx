import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import jsQR from "jsqr";
import QrScanner from "qr-scanner";
import qrScannerWorkerPath from "qr-scanner/qr-scanner-worker.min.js?url";

QrScanner.WORKER_PATH = qrScannerWorkerPath;

function Checkout() {
  const { courseId } = useParams();
  const navigate = useNavigate();

  const [reference, setReference] = useState("");
  const [amount, setAmount] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState([]);
  const [courseError, setCourseError] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [teacherAccNumber, setTeacherAccNumber] = useState("N/A");
  const [teacherError, setTeacherError] = useState(null);
  const [transactionId, setTransactionId] = useState("");
  const [decodeError, setDecodeError] = useState("");
  const [verificationError, setVerificationError] = useState("");
  const [currentUser, setCurrentUser] = useState(() =>
    JSON.parse(localStorage.getItem("user") || "{}")
  );

  useEffect(() => {
    setCurrentUser(JSON.parse(localStorage.getItem("user") || "{}"));
  }, []);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const res = await axios.get("http://localhost:5000/courses");
        setCourses(res.data);
        setCourseError(null);
      } catch (error) {
        console.error("Error fetching courses:", error);
        setCourseError("Failed to load course details");
      }
    };
    fetchCourses();
  }, []);

  const selectedCourse = courses.find((c) => String(c.id) === String(courseId));

  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        const res = await axios.get("http://localhost:5000/teachers");
        setTeachers(res.data);
        setTeacherError(null);
      } catch (error) {
        console.error("Error fetching teachers:", error);
        setTeacherError("Failed to load teacher details");
      }
    };
    fetchTeachers();
  }, []);

  useEffect(() => {
    if (!teachers.length || !selectedCourse) {
      setTeacherAccNumber("N/A");
      return;
    }
    const teacher = teachers.find(
      (t) => String(t.id) === String(selectedCourse.teacher_id)
    );
    setTeacherAccNumber(teacher?.acc_number || "N/A");
  }, [teachers, selectedCourse]);

  useEffect(() => {
    if (!currentUser?.id) return;

    const createPayment = async () => {
      try {
        const res = await axios.post("http://localhost:5000/create-payment", {
          studentId: currentUser.id,
          courseId,
        });
        setReference(res.data.reference);
        setAmount(res.data.amount);
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 409) {
          const data = error.response.data || {};
          if (data.reference) setReference(data.reference);
          if (data.amount) setAmount(data.amount);
          navigate(`/course/${courseId}`);
          return;
        }
        console.error("Error creating payment:", error);
        setVerificationError("Unable to start payment session");
      }
    };
    createPayment();
  }, [courseId, currentUser?.id, navigate]);

  // --------- QR Decoding Utilities ---------
  const loadImageFromFile = (uploadedFile) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject("Failed to load image");
        img.src = reader.result;
      };
      reader.onerror = () => reject("Failed to read file");
      reader.readAsDataURL(uploadedFile);
    });

  const normalizeCanvasFromImage = (img) => {
    const MAX_DIMENSION = 1200;
    const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
    const width = Math.max(1, Math.floor(img.width * scale));
    const height = Math.max(1, Math.floor(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.filter = "contrast(1.2) brightness(1.1)";
    ctx.drawImage(img, 0, 0, width, height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
      data[i] = avg;
      data[i + 1] = avg;
      data[i + 2] = avg;
    }
    ctx.putImageData(imageData, 0, 0);
    return { canvas, ctx };
  };

  const decodeWithJsQR = (img) => {
    const { canvas, ctx } = normalizeCanvasFromImage(img);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "attemptBoth",
    });
    return code?.data || null;
  };

  const decodeWithQrScanner = async (img) => {
    try {
      const result = await QrScanner.scanImage(img, {
        returnDetailedScanResult: true,
        inversionAttempts: "attemptBoth",
      });
      if (!result) return null;
      return typeof result === "string" ? result : result.data;
    } catch (err) {
      return null;
    }
  };

  const decodeQRFromFile = async (uploadedFile) => {
    const img = await loadImageFromFile(uploadedFile);
    const advancedDecoded = await decodeWithQrScanner(img);
    if (advancedDecoded) return advancedDecoded;
    const fallbackDecoded = decodeWithJsQR(img);
    if (fallbackDecoded) return fallbackDecoded;
    throw new Error("QR code not detected");
  };

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const handleVerify = async () => {
    if (!file) {
      setVerificationError("Upload a payment QR image first");
      return;
    }
    if (!currentUser?.id) {
      setVerificationError("Missing student information. Please log in again.");
      return;
    }

    setLoading(true);
    setVerificationError("");

    try {
      const decodedId = await decodeQRFromFile(file);
      setTransactionId(decodedId);
      setDecodeError("");

      const formData = new FormData();
      formData.append("qrImage", file);
      formData.append("transactionId", decodedId);
      formData.append("courseId", courseId);
      formData.append("studentId", currentUser.id);
      formData.append("referenceCode", reference);
      formData.append("accountSuffix", teacherAccNumber.slice(-8));

      const res = await axios.post(
        "http://localhost:5000/verify-payment",
        formData
      );

      if (res.data.success) {
        setLoading(false);
        await delay(6000);
        navigate(`/course/${courseId}`);
        return;
      }

      alert("Payment failed");
      setLoading(false);
    } catch (error) {
      let message = "Verification error";
      if (axios.isAxiosError(error)) {
        message =
          error.response?.data?.error ||
          error.response?.data?.message ||
          error.message;
      } else if (error instanceof Error) message = error.message;
      else if (typeof error === "string") message = error;

      setDecodeError(message.includes("QR") ? message : "");
      setVerificationError(message);
      setLoading(false);
    }
  };

  // --------- Clipboard Copy ---------
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  };

  // --------- Drag & Drop File Upload ---------
  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };
  const handleDragOver = (e) => e.preventDefault();

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "#242f3a",
        display: "flex",
        justifyContent: "center",
        padding: "60px 20px",
        
      }}
    >
      <div style={{ width: "100%", maxWidth: "900px" }}>
        <h1
          style={{
            textAlign: "center",
            marginBottom: "40px",
            fontSize: "45px",
            color: "#ffffff",
          }}
        >
          Secure Checkout
        </h1>

        {/* ORDER SUMMARY */}
        <div
          style={{
            backgroundColor: "#ffffff",
            color: "#111827",
            fontFamily: "monospace",
            fontSize: "20px",
            padding: "30px",
            borderRadius: "16px",
            border: "1px solid #e5e7eb",
            marginBottom: "30px",
          }}
        >
          <h2 style={{ marginBottom: "20px" }}>Order Summary</h2>
          <p>
            <strong>Image title:</strong> {selectedCourse?.title || "Unknown"}
          </p>
          <p>
            <strong>Creator:</strong> {selectedCourse?.teacher_name || "Unknown"}
          </p>
          <p>
            <strong>Total Amount:</strong>{" "}
            <span style={{ color: "#2563eb", fontWeight: "600" }}>
              {amount || selectedCourse?.price} ETB
            </span>
          </p>
        </div>

        {/* PAYMENT INSTRUCTIONS */}
        <div
          style={{
            fontFamily: "monospace",
            color: "#111827",
            fontSize: "18px",
            backgroundColor: "#ffffff",
            padding: "30px",
            borderRadius: "16px",
            border: "1px solid #e5e7eb",
            marginBottom: "30px",
          }}
        >
          <h2 style={{ marginBottom: "25px" }}>How to Complete Payment</h2>
          <ol style={{ lineHeight: "2", paddingLeft: "20px", color: "#374151" }}>
            {/* Amount */}
            <li>
              Transfer the exact amount:
              <div
                style={{
                  backgroundColor: "#f3f4f6",
                  padding: "15px",
                  borderRadius: "10px",
                  marginTop: "10px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ fontWeight: "600", color: "#2563eb" }}>
                  {amount} ETB
                </span>
                <button
                  onClick={() => copyToClipboard(amount)}
                  style={{
                    padding: "5px 12px",
                    borderRadius: "8px",
                    border: "none",
                    cursor: "pointer",
                    backgroundColor: "#2563eb",
                    color: "#fff",
                    fontWeight: "500",
                  }}
                >
                  Copy
                </button>
              </div>
            </li>

            {/* Account Number */}
            <li style={{ marginTop: "15px" }}>
              Send to the account number:
              <div
                style={{
                  backgroundColor: "#f3f4f6",
                  padding: "15px",
                  borderRadius: "10px",
                  marginTop: "10px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>
                  <strong>Account Number:</strong>{" "}
                  <span style={{ color: "#2563eb" }}>{teacherAccNumber}</span>
                </span>
                <button
                  onClick={() => copyToClipboard(teacherAccNumber)}
                  style={{
                    padding: "5px 12px",
                    borderRadius: "8px",
                    border: "none",
                    cursor: "pointer",
                    backgroundColor: "#2563eb",
                    color: "#fff",
                    fontWeight: "500",
                  }}
                >
                  Copy
                </button>
              </div>
            </li>

            {/* Reference Code */}
            <li style={{ marginTop: "15px" }}>
              Enter this reference code when paying:
              <div
                style={{
                  backgroundColor: "#f3f4f6",
                  padding: "15px",
                  borderRadius: "10px",
                  marginTop: "10px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ color: "green", fontWeight: "600" }}>{reference}</span>
                <button
                  onClick={() => copyToClipboard(reference)}
                  style={{
                    padding: "5px 12px",
                    borderRadius: "8px",
                    border: "none",
                    cursor: "pointer",
                    backgroundColor: "green",
                    color: "#fff",
                    fontWeight: "500",
                  }}
                >
                  Copy
                </button>
              </div>
            </li>

            <li style={{ marginTop: "15px" }}>
              After payment, upload the QR confirmation image below.
            </li>
          </ol>
        </div>

        {/* UPLOAD & VERIFY */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          style={{
            color: "#111827",
            fontFamily: "monospace",
            fontSize: "18px",
            backgroundColor: "#ffffff",
            padding: "30px",
            borderRadius: "16px",
            border: "1px solid #e5e7eb",
            textAlign: "center",
            marginBottom: "60px",
            cursor: "pointer",
          }}
        >
          <h2 style={{ marginBottom: "20px" }}>Upload Payment Confirmation</h2>
          <p style={{ color: "#6b7280", marginBottom: "15px" }}>
            Drag & drop your QR image here or click to select a file
          </p>

          <div style={{ 
  marginBottom: "20px",
  textAlign: "center"
}}>
  {/* Hidden file input */}
  <input
    type="file"
    accept="image/*"
    onChange={(e) => setFile(e.target.files[0])}
    id="file-upload"
    style={{ display: "none" }}
  />
  
  {/* Drag and drop area */}
  <div
    style={{
      border: "2px dashed #2563eb",
      borderRadius: "16px",
      padding: "30px 20px",
      backgroundColor: dragActive ? "#f0f9ff" : "white",
      transition: "all 0.2s ease",
      cursor: "pointer",
      marginBottom: "10px",
    }}
    onDragEnter={(e) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(true);
    }}
    onDragLeave={(e) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
    }}
    onDragOver={(e) => {
      e.preventDefault();
      e.stopPropagation();
    }}
    onDrop={(e) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        setFile(e.dataTransfer.files[0]);
      }
    }}
    onClick={() => document.getElementById("file-upload").click()}
  >
    {!file ? (
      <>
        {/* Upload icon */}
        <svg 
          width="48" 
          height="48" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="#2563eb" 
          strokeWidth="1.5"
          style={{ marginBottom: "15px" }}
        >
          <path 
            d="M12 16V4M8 8L12 4L16 8" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
          <path 
            d="M20 16V20H4V16" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
        </svg>
        
        <div style={{ 
          fontSize: "18px", 
          fontWeight: "500", 
          color: "#1f2937",
          marginBottom: "8px"
        }}>
          Drag & drop your image here
        </div>
        
        <div style={{ 
          fontSize: "14px", 
          color: "#6b7280",
          marginBottom: "15px"
        }}>
          or click to browse
        </div>
        
        {/* File requirements */}
        <div style={{
          display: "flex",
          gap: "15px",
          justifyContent: "center",
          fontSize: "12px",
          color: "#9ca3af"
        }}>
          <span>📷 JPG, PNG, GIF</span>
          <span>📦 Max 10MB</span>
        </div>
      </>
    ) : (
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "12px"
      }}>
        {/* File preview */}
        {file.type.startsWith("image/") && (
          <img
            src={URL.createObjectURL(file)}
            alt="Preview"
            style={{
              width: "80px",
              height: "80px",
              objectFit: "cover",
              borderRadius: "12px",
              border: "3px solid #2563eb"
            }}
          />
        )}
        
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          backgroundColor: "#f3f4f6",
          padding: "8px 16px",
          borderRadius: "50px",
          maxWidth: "300px"
        }}>
          <svg width="16" height="16" viewBox="0 0 20 20" fill="#10b981">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          <span style={{
            fontSize: "14px",
            color: "#374151",
            fontWeight: "500",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap"
          }}>
            {file.name}
          </span>
          <span style={{
            fontSize: "12px",
            color: "#6b7280",
            marginLeft: "4px"
          }}>
            ({(file.size / 1024 / 1024).toFixed(2)} MB)
          </span>
        </div>
        
        {/* Change file button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setFile(null);
          }}
          style={{
            background: "none",
            border: "1px solid #d1d5db",
            borderRadius: "20px",
            padding: "6px 15px",
            fontSize: "12px",
            color: "#6b7280",
            cursor: "pointer",
            transition: "all 0.2s ease"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#f3f4f6";
            e.currentTarget.style.color = "#374151";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.color = "#6b7280";
          }}
        >
          Choose different file
        </button>
      </div>
    )}
  </div>
  
  {/* Drag active hint */}
  {dragActive && (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(37, 99, 235, 0.1)",
      backdropFilter: "blur(4px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "24px",
      fontWeight: "bold",
      color: "#2563eb",
      pointerEvents: "none",
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: "white",
        padding: "20px 40px",
        borderRadius: "50px",
        boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)"
      }}>
        📸 Drop it like it's hot!
      </div>
    </div>
  )}
</div>

          <button
            onClick={handleVerify}
            disabled={loading}
            style={{
              padding: "14px 40px",
              borderRadius: "10px",
              border: "none",
              backgroundColor: "#111827",
              color: "#ffffff",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            {loading ? "Verifying Payment..." : "Verify & Complete Purchase"}
          </button>

          {transactionId && (
            <p style={{ marginTop: "20px", color: "#2563eb" }}>
              Transaction ID: <strong>{transactionId}</strong>
            </p>
          )}

          {decodeError && (
            <p style={{ color: "red", marginTop: "10px" }}>{decodeError}</p>
          )}

          {verificationError && !decodeError && (
            <p style={{ color: "red", marginTop: "10px" }}>{verificationError}</p>
          )}
        </div>
      </div>
    </main>
  );
}

export default Checkout;