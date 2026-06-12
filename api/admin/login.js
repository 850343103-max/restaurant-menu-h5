const { makeToken, readJson, sendJson, sessionCookie } = require("../_lib");

module.exports = async function handler(req, res) {
  try {
    if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed" });
    const body = await readJson(req);
    const username = process.env.ADMIN_USER || "admin";
    const password = process.env.ADMIN_PASSWORD;
    if (!password) return sendJson(res, 500, { error: "后台密码未配置" });
    if (body.username !== username || body.password !== password) {
      return sendJson(res, 401, { error: "账号或密码错误" });
    }
    res.setHeader("Set-Cookie", sessionCookie(makeToken(username)));
    return sendJson(res, 200, { ok: true, user: username });
  } catch (error) {
    return sendJson(res, 500, { error: error.message });
  }
};
