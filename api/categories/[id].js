const { getAdminData, requireAdmin, sendJson, supabaseFetch, TABLES } = require("../_lib");

module.exports = async function handler(req, res) {
  try {
    if (!requireAdmin(req, res)) return;
    if (req.method === "DELETE") {
      const id = encodeURIComponent(req.query.id);
      const dishes = await supabaseFetch(`/rest/v1/${TABLES.dishes}?select=id&categoryId=eq.${id}&limit=1`);
      if (dishes.length) return sendJson(res, 400, { error: "该分类下还有菜品" });
      await supabaseFetch(`/rest/v1/${TABLES.categories}?id=eq.${id}`, { method: "DELETE" });
      return sendJson(res, 200, await getAdminData());
    }
    return sendJson(res, 405, { error: "Method not allowed" });
  } catch (error) {
    return sendJson(res, 500, { error: error.message });
  }
};
