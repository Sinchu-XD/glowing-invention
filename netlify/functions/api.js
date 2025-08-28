import express from "express";
import serverless from "serverless-http";
import mongoose from "mongoose";
import cors from "cors";

// ====== CONFIG ======
const ADMIN_KEY = process.env.ADMIN_KEY;
const MONGODB_URI = process.env.MONGODB_URI;

// ====== DB ======
let conn = null;
async function connectDB() {
  if (conn) return conn;
  conn = await mongoose.connect(MONGODB_URI, {
    dbName: "jnumit_attendance",
  });
  return conn;
}

// Students collection (name-based)
const StudentSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  roll: { type: String, trim: true },
  batch: { type: String, default: "JNU MIT 1st Year" },
  email: { type: String, trim: true }
}, { timestamps: true });

// Attendance per date, records by name
const AttendanceSchema = new mongoose.Schema({
  date: { type: String, required: true }, // YYYY-MM-DD
  records: [{
    name: { type: String, required: true },
    status: { type: String, enum: ["Present", "Absent"], required: true }
  }]
}, { timestamps: true });

const Student = mongoose.models.Student || mongoose.model("Student", StudentSchema);
const Attendance = mongoose.models.Attendance || mongoose.model("Attendance", AttendanceSchema);

// ====== APP ======
const app = express();
app.use(cors());
app.use(express.json());

// Simple admin auth middleware via header
function requireAdmin(req, res, next) {
  const key = req.headers["x-admin-key"];
  if (!key || key !== ADMIN_KEY) return res.status(401).json({ message: "Unauthorized" });
  next();
}

// Health
app.get("/api/health", async (_req, res) => {
  try {
    await connectDB();
    res.json({ ok: true, time: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ===== AUTH =====
app.post("/api/login", (req, res) => {
  const { password } = req.body || {};
  if (password && password === ADMIN_KEY) return res.json({ ok: true });
  return res.status(401).json({ ok: false, message: "Invalid credentials" });
});

// ===== STUDENTS =====
app.get("/api/students", async (_req, res) => {
  await connectDB();
  const list = await Student.find({}).sort({ name: 1 });
  res.json(list);
});

app.post("/api/students", requireAdmin, async (req, res) => {
  await connectDB();
  const { name, roll, email, batch } = req.body;
  if (!name) return res.status(400).json({ message: "Name is required" });
  try {
    const doc = await Student.create({ name, roll, email, batch });
    res.json(doc);
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ message: "Student with this name already exists" });
    res.status(500).json({ message: e.message });
  }
});

app.delete("/api/students/:name", requireAdmin, async (req, res) => {
  await connectDB();
  const name = decodeURIComponent(req.params.name);
  const out = await Student.findOneAndDelete({ name });
  res.json({ deleted: !!out });
});

// ===== ATTENDANCE =====
// Mark attendance for a date (name-based)
// Body: { date: "YYYY-MM-DD", records: [{ name, status: "Present"|"Absent" }] }
app.post("/api/attendance", requireAdmin, async (req, res) => {
  await connectDB();
  const { date, records } = req.body || {};
  if (!date || !Array.isArray(records)) return res.status(400).json({ message: "date and records[] required" });

  // Upsert by date
  const doc = await Attendance.findOneAndUpdate(
    { date },
    { $set: { date, records } },
    { upsert: true, new: true }
  );
  res.json(doc);
});
// Get attendance history + percentage for a name
app.get("/api/attendance/:name", async (req, res) => {
  await connectDB();
  const name = decodeURIComponent(req.params.name);
  const days = await Attendance.find({ "records.name": name }).sort({ date: 1 });

  let present = 0, total = 0;
  const history = [];
  for (const d of days) {
    const rec = d.records.find(r => r.name === name);
    if (rec) {
      total += 1;
      if (rec.status === "Present") present += 1;
      history.push({ date: d.date, status: rec.status });
    }
  }
  const percentage = total ? Math.round((present / total) * 10000) / 100 : 0;
  res.json({ name, present, total, percentage, history });
});

// Get attendance list for a date (to show who is P/A on that date)
app.get("/api/attendance/date/:date", async (req, res) => {
  await connectDB();
  const { date } = req.params;
  const doc = await Attendance.findOne({ date });
  res.json(doc || { date, records: [] });
});

export const handler = serverless(app);
