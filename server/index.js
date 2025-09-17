const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { nanoid } = require("nanoid");

const app = express();
const PORT = process.env.PORT || 4000;
const ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

app.use(cookieParser());
app.use(express.json());
const allowedOrigins = [
  ORIGIN,
  "http://localhost:5173",
  "http://localhost:4028",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://localhost:3000",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      if (/^http:\/\/localhost:\d+$/.test(origin)) return callback(null, true);
      return callback(null, false);
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
app.options("*", cors());

// In-memory store for mock sessions
const sessions = new Map();

// Simulate LinkedIn start - in real flow this redirects to LinkedIn. Here we just redirect back with a mock code.
app.get("/auth/linkedin/start", (req, res) => {
  const redirectUri = req.query.redirect_uri;
  if (!redirectUri) return res.status(400).send("Missing redirect_uri");
  const mockCode = nanoid(12);
  const state = nanoid(10);
  const url = new URL(redirectUri);
  url.searchParams.set("code", mockCode);
  url.searchParams.set("state", state);
  return res.redirect(url.toString());
});

// Exchange code for session
app.post("/auth/linkedin/callback", (req, res) => {
  const { code } = req.body || {};
  if (!code) {
    return res.status(400).json({ error: "Missing code" });
  }
  const accessToken = "mock_access_" + nanoid(10);
  const user = {
    id: "user_" + nanoid(6),
    name: "Sarah Johnson",
    avatarUrl: "https://randomuser.me/api/portraits/women/1.jpg",
    linkedinUrl: "https://www.linkedin.com/in/mock-user",
  };
  const session = { user, accessToken };
  const sid = nanoid(16);
  sessions.set(sid, session);
  res.cookie("sid", sid, { httpOnly: false, sameSite: "lax" });
  return res.json(session);
});

app.post("/auth/logout", (req, res) => {
  const sid = req.cookies?.sid;
  if (sid) sessions.delete(sid);
  res.clearCookie("sid");
  return res.json({ ok: true });
});

// Simple me endpoint (optional helper)
app.get("/me", (req, res) => {
  const sid = req.cookies?.sid;
  const session = sid ? sessions.get(sid) : null;
  if (!session) return res.status(401).json({ error: "Not authenticated" });
  return res.json(session);
});

app.get("/", (_req, res) => res.send("ProRate mock backend running"));

app.listen(PORT, () => {
  console.log(
    `Mock backend running on http://localhost:${PORT} (CORS: ${ORIGIN})`
  );
});
