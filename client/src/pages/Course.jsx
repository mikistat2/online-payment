import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";

function Course() {
  const { courseId } = useParams();
  const [courses, setCourses] = useState([]);
  const [imageUrl, setImageUrl] = useState([]);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const res = await axios.get("http://localhost:5000/courses");
        setCourses(res.data);
        console.log("Fetched courses:", res.data);
        setImageUrl(res.data.find((c) => String(c.id) === String(courseId))?.sec_img || "");
      } catch (error) {
        console.error("Error fetching courses:", error);

      }
    };

    fetchCourses();
    console.log("Course image:", imageUrl);
  }, [courseId]);

  return (
    <div style={{ padding: 40 }}>
      <h1>Course #{courseId}</h1>
      <p>Welcome to the course 🎉</p>

      <h3>Lesson 1: Introduction</h3>
      <p>This is protected content.</p>
      {imageUrl.map((url, index) => (
        <img key={index} src={url} alt={`Course ${courseId} Image ${index}`} style={{ width: "200px", margin: "10px", height: "200px", border: "1px solid #ccc" }} />
      ))}
    </div>
  );
}

export default Course;