// routes/course.js
import express from "express";
import { pool } from "../db.js";

const router = express.Router();

router.get("/courses", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        courses.id,
        courses.teacher_id,
        courses.title,
        courses.sec_img,
        courses.description,
        courses.price,
        teachers.name AS teacher_name
      FROM courses
      JOIN teachers
      ON courses.teacher_id = teachers.id
    `);

    res.json(result.rows);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch courses" });
  }
});

router.get("/teachers", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, acc_number FROM teachers"
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch teachers" });
  }
});

export default router;