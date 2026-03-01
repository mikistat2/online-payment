import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function Home() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
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
      } catch (error) {
        console.error("Error fetching courses:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "#ffffff",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          
        }}
      >
        <h2 style={{ color: "#111" }}>Loading courses...</h2>
      </div>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "#ffffff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "60px 20px",
        
      }}
    >
      <div style={{ textAlign: "center", marginBottom: "50px" }}>
        <h1 style={{ fontSize: "32px", color: "#111" }}>
          Available Image Collections
        </h1>

        <h2 style={{ color: "#666", marginTop: "10px" }}>
          {currentUser?.name ? `Hi, ${currentUser.name}!` : "Welcome!"}
        </h2>
      </div>

      {courses.length === 0 && (
        <p style={{ color: "#777" }}>No image collections found.</p>
      )}

      {/* CENTERED GRID */}
      <div
        style={{
          width: "100%",
          maxWidth: "1000px",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center", // THIS centers cards properly
          gap: "30px",
        }}
      >
        {courses.map((course) => (
          <div
            key={course.id}
            style={{
              width: "320px", // fixed width so they don't stretch
              borderRadius: "16px",
              padding: "25px",
              backgroundColor: "#f3f4f6",
              border: "2px solid #e5e7eb",
              boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              transition: "0.3s ease",
              textAlign: "center",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.transform = "translateY(-6px)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.transform = "translateY(0)")
            }
          >
            <div>
              <h3 style={{ color: "#1f2937", marginBottom: "15px" }}>
                {course.title}
              </h3>

              <p style={{ color: "#4b5563" }}>
                <strong style={{ color: "#111827" }}>
                  Image holder:
                </strong>{" "}
                {course.teacher_name}
              </p>

              <p
                style={{
                  color: "#2563eb",
                  fontWeight: "600",
                  fontSize: "18px",
                  marginTop: "10px",
                }}
              >
                {course.price} ETB
              </p>

              <p
                style={{
                  color: "#6b7280",
                  marginTop: "15px",
                  fontSize: "14px",
                }}
              >
                {course.description}
              </p>
            </div>

            <button
              onClick={async () => {
                try {
                  if (!currentUser?.id) return;

                  const res = await axios.get(
                    "http://localhost:5000/payments/access",
                    {
                      params: {
                        studentId: currentUser.id,
                        courseId: course.id,
                      },
                    }
                  );

                  if (res.data?.accessGranted) {
                    navigate(`/course/${course.id}`);
                    return;
                  }
                } catch (error) {
                  console.error(error);
                }

                navigate(`/checkout/${course.id}`);
              }}
              style={{
                marginTop: "25px",
                padding: "14px",
                borderRadius: "10px",
                border: "none",
                backgroundColor: "#111827",
                color: "#ffffff",
                fontWeight: "500",
                cursor: "pointer",
              }}
            >
              Buy Collection
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={() => navigate("/")}
        style={{
          marginTop: "60px",
          padding: "14px 28px",
          borderRadius: "10px",
          border: "2px solid #111827",
          backgroundColor: "transparent",
          color: "#111827",
          cursor: "pointer",
        }}
      >
        Go Back Home
      </button>
    </main>
  );
}

export default Home;