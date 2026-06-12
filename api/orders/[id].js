const { getAdminData, requireAdmin, sendJson, supabaseFetch, TABLES } = require("../_lib");

module.exports = async function handler(req, res) {
  try {
    if (!requireAdmin(req, res)) return;
    const id = encodeURIComponent(req.query.id);
    if (req.method === "DELETE") {
      await supabaseFetch(`/rest/v1/${TABLES.orders}?id=eq.${id}`, { method: "DELETE" });
      return sendJson(res, 200, await getAdminData());
    }
    return sendJson(res, 405, { error: "Method not allowed" });
  } catch (error) {
    return sendJson(res, 500, { error: error.message });
  }
};
