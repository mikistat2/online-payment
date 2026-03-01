import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";

const Register = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("http://localhost:5000/auth/register", {
        name,
        age,
        email,
        password,
      });
      console.log(res.data);
      setMessage("Registration successful");
      setError("");
      navigate(`/login`, { state: { email } });
    } catch (err) {
      console.error(err);
      setError("Error registering user");
      setMessage("");
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
        <h2 style={{ textAlign: "center", marginBottom: "10px" , color: "#111", fontSize: "34px"}}>
          Hello there 
        </h2>

        <p style={{ textAlign: "center", marginBottom: "30px", color: "#666" }}>
          Please register to continue
        </p>

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "15px" }}
        >
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={{
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid #ddd",
            }}
          />

          <input
            type="number"
            placeholder="Age"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            required
            style={{
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid #ddd",
            }}
          />

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
            Register
          </button>

          <p style={{ textAlign: "center", fontSize: "14px", color: "#666" }}>
            Already have an account?{" "}
            <Link to="/login" style={{ color: "#4CAF50", textDecoration: "none" }}>
              Sign in
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

export default Register;