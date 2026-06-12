const { getAdminData, readJson, requireAdmin, sendJson, supabaseFetch, TABLES } = require("../_lib");

module.exports = async function handler(req, res) {
  try {
    if (!requireAdmin(req, res)) return;
    if (req.method === "POST") {
      const dish = await readJson(req);
      if (!dish.name || !dish.categoryId) return sendJson(res, 400, { error: "菜名和分类必填" });
      await supabaseFetch(`/rest/v1/${TABLES.dishes}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({ ...dish, id: dish.id || `dish_${Date.now()}` })
      });
      return sendJson(res, 201, await getAdminData());
    }
    return sendJson(res, 405, { error: "Method not allowed" });
  } catch (error) {
    return sendJson(res, 500, { error: error.message });
  }
};
