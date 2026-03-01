import { useState, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";

const Login = () => {

  const location = useLocation();
  const navigate = useNavigate();
  const prefillEmail = location.state?.email || "";
  const redirectPath = location.state?.from?.pathname || "/home";
  const [email, setEmail] = useState(prefillEmail);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (prefillEmail) {
      setEmail(prefillEmail);
    }
  }, [prefillEmail]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("http://localhost:5000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (res.ok) {
        setMessage("Login successful");
        setError("");
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        navigate(redirectPath, { replace: true });
      } else {
        setError(data.error || data.message || "Login failed");
      }
    } catch (err) {
      console.error("Login failed:", err);
      setError("Server error. Try again.");
    }
  };

  return (
  <div
    style={{
      height: "100vh",
      width: "100vw",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      background: "linear-gradient(to right, #f8f9fa, #e9ecef)",
    }}
  >
    <div
      style={{
        width: "100%",
        maxWidth: "400px",
        backgroundColor: "white",
        padding: "40px 30px",
        borderRadius: "15px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
      }}
    >
      <h2 style={{ textAlign: "center", marginBottom: "10px", color: "#111", fontSize: "34px" }}>
        Welcome Back 
      </h2>

      <p style={{ textAlign: "center", marginBottom: "30px", color: "#666" }}>
        Please login to continue
      </p>

      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "15px"
        }}
      >
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{
            padding: "12px",
            borderRadius: "8px",
            border: "1px solid #ddd",
          }}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{
            padding: "12px",
            borderRadius: "8px",
            border: "1px solid #ddd",
          }}
        />

        <button
          type="submit"
          style={{
            padding: "12px",
            borderRadius: "8px",
            border: "none",
            backgroundColor: "#4CAF50",
            color: "white",
            cursor: "pointer",
          }}
        >
          Login
        </button>

        <p style={{ textAlign: "center", fontSize: "14px" ,color: "#666" }}>
          Don't have an account?{" "}
          <Link to="/register" style={{ color: "#4CAF50", textDecoration: "none" }}>
            Sign up
          </Link>
        </p>
      </form>

      {message && (
        <p style={{ color: "green", textAlign: "center", marginTop: "15px" }}>
          {message}
        </p>
      )}

      {error && (
        <p style={{ color: "red", textAlign: "center", marginTop: "15px" }}>
          {error}
        </p>
      )}
    </div>
  </div>
);
};

export default Login;