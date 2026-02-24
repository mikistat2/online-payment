import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function Home() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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

  if (loading) return <h2 style={{ padding: 40 }}>Loading courses...</h2>;

  return (
    <div style={{ padding: 40 }}>
      <h1>Available Courses</h1>

      {courses.length === 0 && <p>No courses found.</p>}

      {courses.map((course) => (
        <div
          key={course.id}
          style={{
            border: "1px solid #ccc",
            padding: 20,
            marginBottom: 20,
            borderRadius: 8,
          }}
        >
          <h2>{course.title}</h2>
          <p><strong>Teacher:</strong> {course.teacher_name}</p>
          <p><strong>Price:</strong> {course.price} ETB</p>
          <p>{course.description}</p>

          <button
            onClick={async () => {
              try {
                const res = await axios.get("http://localhost:5000/payments/access", {
                  params: {
                    studentId: 1,
                    courseId: course.id,
                  },
                });

                if (res.data?.accessGranted) {
                  navigate(`/course/${course.id}`);
                  return;
                }
              } catch (error) {
                console.error("Error checking access:", error);
              }

              navigate(`/checkout/${course.id}`);
            }}
          >
            Enroll Now
          </button>
        </div>
      ))}
    </div>
  );
}

export default Home;