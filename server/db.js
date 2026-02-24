
import pkg from "pg";
const { Pool } = pkg;

export const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "onlinePayment-Atom",
  password: "147253@Mbt",
  port: 5432,
});