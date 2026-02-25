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
  const [teacherAccNumber, setTeacherAccNumber] = useState("N/A");
  const [teacherError, setTeacherError] = useState(null);
  const [transactionId, setTransactionId] = useState("");
  const [decodeError, setDecodeError] = useState("");
  const [verificationError, setVerificationError] = useState("");
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
    const createPayment = async () => {
      try {
        const res = await axios.post("http://localhost:5000/create-payment", {
          studentId: 1,
          courseId,
        });

        setReference(res.data.reference);
        setAmount(res.data.amount);
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 409) {
          const data = error.response.data || {};
          if (data.reference) {
            setReference(data.reference);
          }
          if (data.amount) {
            setAmount(data.amount);
          }
          navigate(`/course/${courseId}`);
          return;
        }

        console.error("Error creating payment:", error);
        setVerificationError("Unable to start payment session");
      }
    };

    createPayment();
  }, [courseId, navigate]);

  const loadImageFromFile = (uploadedFile) => {
    return new Promise((resolve, reject) => {
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
  };

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
    if (advancedDecoded) {
      return advancedDecoded;
    }

    const fallbackDecoded = decodeWithJsQR(img);
    if (fallbackDecoded) {
      return fallbackDecoded;
    }

    throw new Error("QR code not detected");
  };

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const handleVerify = async () => {
    if (!file) {
      setVerificationError("Upload a payment QR image first");
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
      formData.append("studentId", 1);
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
          error.response?.data?.error || error.response?.data?.message || error.message;
      } else if (error instanceof Error) {
        message = error.message;
      } else if (typeof error === "string") {
        message = error;
      }

      setDecodeError(message.includes("QR") ? message : "");
      setVerificationError(message);
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>Checkout</h1>

      <h1>Course: {selectedCourse?.title || "Unknown Course"}</h1>
      <p>Price: {selectedCourse?.price || "N/A"} ETB</p>
      {courseError && <p style={{ color: "red" }}>{courseError}</p>}
      <p> Tought by: {selectedCourse?.teacher_name || "Unknown Teacher"}</p>

      <div style={{ background: "#2b1d1d", padding: 20, borderRadius: 8, marginTop: 20, border: "2px solid #992323" }}>
        <h2 style={{ color: "#992323" }}>Payment Instructions</h2>
        <ul>
          <li>Send the exact amount of {amount} ETB to the </li>

          <ul>
            <li> account number: {teacherAccNumber}</li>
          </ul>
          <li>Use the reference number below when sending money</li>
            <ul>
                <li style={{ color: "green" }}>Reference: {reference}</li>
            </ul>
          <li>Upload the QR image of your payment confirmation</li>
        </ul>

        <div style={{ background: "#2b1d1d", padding: 20, borderRadius: 8, alignItems: "right", width: "60%", marginLeft: "30%", marginTop: 20, border: "2px solid #992323" }}>
        <h3 style={{ color: "#992323" }}>Reference Number: <span style={{ color: "green" }}>{reference}</span></h3>
        <h3 style={{ color: "#992323" }}>account number: <span style={{ color: "green" }}>{teacherAccNumber}</span></h3>
        

        </div>

      </div>
      
      {teacherError && <p style={{ color: "red" }}>{teacherError}</p>}

        
      <h2 >{reference}</h2>

      <hr />

      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files[0])}
      />

      <br /><br />

      <button onClick={handleVerify} disabled={loading}>
        {loading ? "Verifying..." : "Verify Payment"}
      </button>

      {transactionId && (
        <p style={{ marginTop: 20 }}>
          Decoded Transaction ID: <strong>{transactionId}</strong>
        </p>
      )}
      {decodeError && <p style={{ color: "red" }}>{decodeError}</p>}
      {verificationError && !decodeError && (
        <p style={{ color: "red" }}>{verificationError}</p>
      )}
    </div>
  );
}

export default Checkout;