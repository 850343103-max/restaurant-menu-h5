const { isAuthed, sendJson } = require("../_lib");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return sendJson(res, 405, { error: "Method not allowed" });
  return sendJson(res, 200, { loggedIn: isAuthed(req), user: isAuthed(req) ? (process.env.ADMIN_USER || "admin") : "" });
};
