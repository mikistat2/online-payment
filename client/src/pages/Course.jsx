import { useParams } from "react-router-dom";

function Course() {
  const { courseId } = useParams();

  return (
    <div style={{ padding: 40 }}>
      <h1>Course #{courseId}</h1>
      <p>Welcome to the course 🎉</p>

      <h3>Lesson 1: Introduction</h3>
      <p>This is protected content.</p>
    </div>
  );
}

export default Course;