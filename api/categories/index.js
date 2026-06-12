const { getAdminData, readJson, requireAdmin, sendJson, supabaseFetch, TABLES } = require("../_lib");

module.exports = async function handler(req, res) {
  try {
    if (!requireAdmin(req, res)) return;
    if (req.method === "POST") {
      const category = await readJson(req);
      if (!category.name) return sendJson(res, 400, { error: "分类名称必填" });
      await supabaseFetch(`/rest/v1/${TABLES.categories}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({ ...category, id: category.id || `cat_${Date.now()}` })
      });
      return sendJson(res, 201, await getAdminData());
    }
    return sendJson(res, 405, { error: "Method not allowed" });
  } catch (error) {
    return sendJson(res, 500, { error: error.message });
  }
};
