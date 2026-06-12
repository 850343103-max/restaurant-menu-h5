const { getAdminData, getPublicData, readJson, requireAdmin, sendJson, supabaseFetch, TABLES } = require("../_lib");

function validateOrder(order) {
  if (!order.name) return "请填写姓名";
  if (!order.roomNo) return "请填写桌号/包房";
  if (!order.mealDate) return "请选择日期";
  if (!order.mealPeriod) return "请选择中午或晚上";
  if (!Number(order.people)) return "请填写人数";
  if (!Array.isArray(order.items) || !order.items.length) return "请选择菜品";
  return "";
}

module.exports = async function handler(req, res) {
  try {
    if (req.method === "GET") {
      if (!requireAdmin(req, res)) return;
      const data = await getAdminData();
      return sendJson(res, 200, data.orders);
    }
    if (req.method === "POST") {
      const order = await readJson(req);
      const error = validateOrder(order);
      if (error) return sendJson(res, 400, { error });
      await supabaseFetch(`/rest/v1/${TABLES.orders}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({
          ...order,
          id: order.id || `order_${Date.now()}`,
          createdAt: order.createdAt || Date.now()
        })
      });
      return sendJson(res, 201, await getPublicData());
    }
    return sendJson(res, 405, { error: "Method not allowed" });
  } catch (error) {
    return sendJson(res, 500, { error: error.message });
  }
};
