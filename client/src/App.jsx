import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Checkout from "./pages/Checkout";
import Course from "./pages/Course";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/checkout/:courseId" element={<Checkout />} />
        <Route path="/course/:courseId" element={<Course />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;