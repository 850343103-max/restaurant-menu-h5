const crypto = require("crypto");

const TABLES = {
  categories: "categories",
  dishes: "dishes",
  orders: "orders"
};

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

function supabaseConfig() {
  return {
    url: requiredEnv("SUPABASE_URL").replace(/\/$/, ""),
    key: requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    bucket: process.env.SUPABASE_STORAGE_BUCKET || "dish-images"
  };
}

function sendJson(res, status, data, headers = {}) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));
  res.end(JSON.stringify(data));
}

async function readJson(req) {
  if (req.body && typeof req.body === "object") return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

async function readBuffer(req, maxBytes) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > maxBytes) throw new Error("图片不能超过 5MB");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function supabaseFetch(path, options = {}) {
  const { url, key } = supabaseConfig();
  const response = await fetch(`${url}${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const message = data?.message || data?.error_description || data?.error || "Supabase request failed";
    throw new Error(message);
  }
  return data;
}

async function getPublicData() {
  const [categories, dishes] = await Promise.all([
    supabaseFetch(`/rest/v1/${TABLES.categories}?select=*&order=sort_order.asc,name.asc`),
    supabaseFetch(`/rest/v1/${TABLES.dishes}?select=*&order=name.asc`)
  ]);
  return { categories, dishes, orders: [] };
}

async function getAdminData() {
  const [categories, dishes, orders] = await Promise.all([
    supabaseFetch(`/rest/v1/${TABLES.categories}?select=*&order=sort_order.asc,name.asc`),
    supabaseFetch(`/rest/v1/${TABLES.dishes}?select=*&order=name.asc`),
    supabaseFetch(`/rest/v1/${TABLES.orders}?select=*&order=createdAt.desc`)
  ]);
  return { categories, dishes, orders };
}

function parseCookies(req) {
  return Object.fromEntries((req.headers.cookie || "").split(";").filter(Boolean).map((item) => {
    const index = item.indexOf("=");
    return [decodeURIComponent(item.slice(0, index).trim()), decodeURIComponent(item.slice(index + 1).trim())];
  }));
}

function base64url(input) {
  return Buffer.from(input).toString("base64url");
}

function sign(value) {
  const secret = process.env.ADMIN_SECRET || requiredEnv("ADMIN_PASSWORD");
  return crypto.createHmac("sha256", secret).update(value).digest("base64url");
}

function makeToken(username) {
  const payload = JSON.stringify({ username, exp: Date.now() + 24 * 60 * 60 * 1000 });
  const encoded = base64url(payload);
  return `${encoded}.${sign(encoded)}`;
}

function verifyToken(token) {
  if (!token || !token.includes(".")) return false;
  const [encoded, sig] = token.split(".");
  if (sign(encoded) !== sig) return false;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    return payload.exp > Date.now() && payload.username === (process.env.ADMIN_USER || "admin");
  } catch {
    return false;
  }
}

function isAuthed(req) {
  return verifyToken(parseCookies(req).admin_session);
}

function requireAdmin(req, res) {
  if (isAuthed(req)) return true;
  sendJson(res, 401, { error: "请先登录后台" });
  return false;
}

function sessionCookie(token) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `admin_session=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=86400${secure}`;
}

function clearSessionCookie() {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `admin_session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${secure}`;
}

module.exports = {
  TABLES,
  clearSessionCookie,
  getAdminData,
  getPublicData,
  isAuthed,
  makeToken,
  readBuffer,
  readJson,
  requireAdmin,
  sendJson,
  sessionCookie,
  supabaseConfig,
  supabaseFetch
};
