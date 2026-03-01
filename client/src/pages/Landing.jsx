import React from "react";
import { useNavigate } from "react-router-dom";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "linear-gradient(to right, #f8f9fa, #e9ecef)",
        padding: "20px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "600px",
          backgroundColor: "#ffffff",
          padding: "40px 30px",
          borderRadius: "15px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            fontSize: "clamp(24px, 4vw, 36px)",
            marginBottom: "20px",
            color: "#111",
          }}
        >
          This is testing integration of online payment using <span style={{color: "#4CAF50"}}>CBE</span> please login and buy image collectoions at amazing discounts.
        </h1>

        <p
          style={{
            fontSize: "clamp(14px, 2.5vw, 18px)",
            color: "#555",
            lineHeight: "1.6",
            marginBottom: "35px",
          }}
        >

          Login to access premium picture collections at amazing discounts.
          Images under 20 birr are selling fast. Secure payments and instant
          access in less than 2 seconds.
        </p>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "15px",
          }}
        >
          <button
            style={{
              padding: "12px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: "#4CAF50",
              color: "white",
              fontSize: "16px",
              cursor: "pointer",
              transition: "0.3s",
            }}
            onClick={() => navigate("/login")}
            onMouseOver={(e) => (e.target.style.opacity = "0.85")}
            onMouseOut={(e) => (e.target.style.opacity = "1")}
          >
            Login
          </button>

          <button
            style={{
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid #4CAF50",
              backgroundColor: "white",
              color: "#4CAF50",
              fontSize: "16px",
              cursor: "pointer",
              transition: "0.3s",
            }}
            onClick={() => navigate("/register")}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = "#4CAF50";
              e.target.style.color = "white";
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = "white";
              e.target.style.color = "#4CAF50";
            }}
          >
            Register
          </button>
        </div>
      </div>
    </div>
  );
};

export default Landing;