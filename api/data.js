const { getAdminData, getPublicData, isAuthed, sendJson } = require("./_lib");

module.exports = async function handler(req, res) {
  try {
    if (req.method !== "GET") return sendJson(res, 405, { error: "Method not allowed" });
    const data = isAuthed(req) ? await getAdminData() : await getPublicData();
    return sendJson(res, 200, data);
  } catch (error) {
    return sendJson(res, 500, { error: error.message });
  }
};
