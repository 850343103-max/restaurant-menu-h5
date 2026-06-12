let state = { categories: [], dishes: [], orders: [] };
let adminTab = "orders";
let originalDishImage = "";

const $ = (selector) => document.querySelector(selector);
const els = {
  loginPanel: $("#loginPanel"),
  loginForm: $("#loginForm"),
  adminView: $("#adminView"),
  logoutBtn: $("#logoutBtn"),
  ordersPanel: $("#ordersPanel"),
  dishesPanel: $("#dishesPanel"),
  categoriesPanel: $("#categoriesPanel"),
  dishForm: $("#dishForm"),
  resetDishForm: $("#resetDishForm"),
  dishManageList: $("#dishManageList"),
  dishImageFile: $("#dishImageFile"),
  dishImageDropzone: $("#dishImageDropzone"),
  dishImagePreview: $("#dishImagePreview"),
  removeDishImage: $("#removeDishImage"),
  categoryForm: $("#categoryForm"),
  categoryManageList: $("#categoryManageList"),
  toast: $("#toast")
};

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "请求失败");
  return data;
}

function money(value) {
  return `￥${Number(value || 0).toFixed(0)}`;
}

function uid(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 7)}`;
}

function formDataToObject(form) {
  const data = {};
  new FormData(form).forEach((value, key) => {
    data[key] = typeof value === "string" ? value.trim() : value;
  });
  return data;
}

function categoryName(id) {
  const category = state.categories.find((item) => item.id === id);
  return category ? category.name : "未分类";
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => els.toast.classList.remove("show"), 2400);
}

function showAdmin(loggedIn) {
  els.loginPanel.hidden = loggedIn;
  els.adminView.hidden = !loggedIn;
}

function setAdminTab(tab) {
  adminTab = tab;
  document.querySelectorAll("[data-admin-tab]").forEach((item) => {
    item.classList.toggle("active", item.dataset.adminTab === tab);
  });
  els.ordersPanel.hidden = tab !== "orders";
  els.dishesPanel.hidden = tab !== "dishes";
  els.categoriesPanel.hidden = tab !== "categories";
}

function renderOrderGroups(order) {
  const groups = {};
  order.items.forEach((item) => {
    const key = item.categoryName || "未分类";
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  });
  return Object.entries(groups).map(([name, items]) => `
    <div class="group-title">${name}</div>
    ${items.map((item) => `
      <div class="order-line">
        <span>${item.name} x ${item.qty}</span>
        <span>${money(item.price * item.qty)}</span>
      </div>
    `).join("")}
  `).join("");
}

function formatOrder(order) {
  const lines = [
    "【粤菜王府点菜单】",
    `姓名：${order.name}`,
    `桌号/包房：${order.roomNo || order.tableNo || "-"}`,
    `电话：${order.phone || "-"}`,
    `人数：${order.people || "-"}`,
    order.note ? `备注：${order.note}` : "",
    `时间：${new Date(order.createdAt).toLocaleString()}`,
    ""
  ].filter(Boolean);
  const groups = {};
  order.items.forEach((item) => {
    if (!groups[item.categoryName]) groups[item.categoryName] = [];
    groups[item.categoryName].push(item);
  });
  Object.entries(groups).forEach(([name, items]) => {
    lines.push(`【${name}】`);
    items.forEach((item) => lines.push(`${item.name} x ${item.qty} = ${money(item.price * item.qty)}`));
  });
  lines.push("", `合计：${money(order.total)}`);
  return lines.join("\n");
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast("订单内容已复制。");
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    area.remove();
    showToast("订单内容已复制。");
  }
}

function renderOrders() {
  const orders = [...state.orders].sort((a, b) => b.createdAt - a.createdAt);
  els.ordersPanel.innerHTML = orders.length ? orders.map((order) => `
    <article class="order-card">
      <div class="order-card-head">
        <h3>${order.roomNo || "-"} · ${order.name}</h3>
        <strong>${money(order.total)}</strong>
      </div>
      <p class="order-meta">${new Date(order.createdAt).toLocaleString()} · ${order.phone || "-"} · ${order.people || "-"}人${order.note ? ` · ${order.note}` : ""}</p>
      ${renderOrderGroups(order)}
      <div class="order-actions">
        <button class="primary-btn" data-copy-order="${order.id}" type="button">复制订单</button>
        <button class="ghost-btn danger-btn" data-delete-order="${order.id}" type="button">删除</button>
      </div>
    </article>
  `).join("") : `<div class="empty">暂无订单。</div>`;
}

function renderDishAdmin() {
  els.dishForm.elements.categoryId.innerHTML = state.categories.map((cat) => `<option value="${cat.id}">${cat.name}</option>`).join("");
  els.dishManageList.innerHTML = state.dishes.map((dish) => `
    <div class="manage-row">
      <div>
        <strong>${dish.name}</strong>
        <p>${categoryName(dish.categoryId)} · ${money(dish.price)}${dish.soldOut ? " · 已售罄" : ""}</p>
      </div>
      <div class="row-actions">
        <button class="ghost-btn" data-edit-dish="${dish.id}" type="button">编辑</button>
        <button class="ghost-btn" data-toggle-sold="${dish.id}" type="button">${dish.soldOut ? "上架" : "售罄"}</button>
      </div>
    </div>
  `).join("");
}

function renderCategoryAdmin() {
  els.categoryManageList.innerHTML = state.categories.map((cat) => `
    <div class="manage-row">
      <strong>${cat.name}</strong>
      <div class="row-actions">
        <button class="ghost-btn danger-btn" data-delete-category="${cat.id}" type="button">删除</button>
      </div>
    </div>
  `).join("");
}

function renderAll() {
  renderOrders();
  renderDishAdmin();
  renderCategoryAdmin();
}

async function loadAdminData() {
  state = await api("/api/data");
  renderAll();
  setAdminTab(adminTab);
}

function setDishImage(path) {
  els.dishForm.elements.image.value = path || "";
  if (path) {
    els.dishImagePreview.hidden = false;
    els.dishImagePreview.querySelector("img").src = path;
  } else {
    els.dishImagePreview.hidden = true;
    els.dishImagePreview.querySelector("img").removeAttribute("src");
  }
}

function resetDishForm() {
  els.dishForm.reset();
  originalDishImage = "";
  setDishImage("");
}

async function uploadImage(file) {
  if (!file) return "";
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) throw new Error("只支持 jpg、png、webp 图片");
  if (file.size > 5 * 1024 * 1024) throw new Error("图片不能超过 5MB");
  const formData = new FormData();
  formData.append("image", file);
  const response = await fetch("/api/uploads", { method: "POST", body: formData, credentials: "same-origin" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "图片上传失败");
  return data.path;
}

async function deleteUploadedImage(imagePath) {
  if (!imagePath || !imagePath.startsWith("/uploads/")) return;
  await api("/api/uploads", { method: "DELETE", body: JSON.stringify({ path: imagePath }) }).catch(() => null);
}

async function saveDish(dish) {
  const exists = state.dishes.some((item) => item.id === dish.id);
  const path = exists ? `/api/dishes/${dish.id}` : "/api/dishes";
  const method = exists ? "PUT" : "POST";
  state = await api(path, { method, body: JSON.stringify(dish) });
}

els.loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await api("/api/admin/login", { method: "POST", body: JSON.stringify(formDataToObject(els.loginForm)) });
    showAdmin(true);
    await loadAdminData();
  } catch (error) {
    showToast(error.message);
  }
});

els.logoutBtn.addEventListener("click", async () => {
  await api("/api/admin/logout", { method: "POST" }).catch(() => null);
  showAdmin(false);
});

document.querySelectorAll("[data-admin-tab]").forEach((button) => {
  button.addEventListener("click", () => setAdminTab(button.dataset.adminTab));
});

document.addEventListener("click", async (event) => {
  const target = event.target.closest("button");
  if (!target) return;
  try {
    if (target.dataset.copyOrder) {
      const order = state.orders.find((item) => item.id === target.dataset.copyOrder);
      if (order) await copyText(formatOrder(order));
    }
    if (target.dataset.deleteOrder) {
      state = await api(`/api/orders/${target.dataset.deleteOrder}`, { method: "DELETE" });
      renderAll();
    }
    if (target.dataset.editDish) {
      const dish = state.dishes.find((item) => item.id === target.dataset.editDish);
      if (!dish) return;
      Object.entries(dish).forEach(([key, value]) => {
        if (els.dishForm.elements[key]) {
          if (key === "soldOut") els.dishForm.elements[key].checked = Boolean(value);
          else els.dishForm.elements[key].value = value;
        }
      });
      originalDishImage = dish.image || "";
      setDishImage(dish.image || "");
      setAdminTab("dishes");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    if (target.dataset.toggleSold) {
      const dish = state.dishes.find((item) => item.id === target.dataset.toggleSold);
      if (!dish) return;
      await saveDish({ ...dish, soldOut: !dish.soldOut });
      renderAll();
    }
    if (target.dataset.deleteCategory) {
      const id = target.dataset.deleteCategory;
      if (state.dishes.some((dish) => dish.categoryId === id)) {
        showToast("该分类下还有菜品，请先移动菜品。");
        return;
      }
      state = await api(`/api/categories/${id}`, { method: "DELETE" });
      renderAll();
    }
  } catch (error) {
    if (error.message.includes("登录")) showAdmin(false);
    showToast(error.message);
  }
});

els.dishForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = formDataToObject(els.dishForm);
  const dish = {
    id: data.id || uid("dish"),
    name: data.name,
    price: Number(data.price || 0),
    categoryId: data.categoryId,
    image: data.image,
    desc: data.desc,
    soldOut: els.dishForm.elements.soldOut.checked
  };
  try {
    await saveDish(dish);
    if (originalDishImage && originalDishImage !== dish.image) await deleteUploadedImage(originalDishImage);
    resetDishForm();
    renderAll();
    showToast("菜品已保存。");
  } catch (error) {
    showToast(error.message);
  }
});

els.resetDishForm.addEventListener("click", resetDishForm);

els.categoryForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = formDataToObject(els.categoryForm);
  if (!data.name) return;
  try {
    state = await api("/api/categories", { method: "POST", body: JSON.stringify({ id: uid("cat"), name: data.name }) });
    els.categoryForm.reset();
    renderAll();
  } catch (error) {
    showToast(error.message);
  }
});

els.dishImageFile.addEventListener("change", async () => {
  try {
    const path = await uploadImage(els.dishImageFile.files[0]);
    setDishImage(path);
    showToast("图片上传成功。");
  } catch (error) {
    showToast(error.message);
  } finally {
    els.dishImageFile.value = "";
  }
});

["dragenter", "dragover"].forEach((eventName) => {
  els.dishImageDropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    els.dishImageDropzone.classList.add("dragover");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  els.dishImageDropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    els.dishImageDropzone.classList.remove("dragover");
  });
});

els.dishImageDropzone.addEventListener("drop", async (event) => {
  try {
    const path = await uploadImage(event.dataTransfer.files[0]);
    setDishImage(path);
    showToast("图片上传成功。");
  } catch (error) {
    showToast(error.message);
  }
});

els.removeDishImage.addEventListener("click", () => {
  setDishImage("");
  showToast("图片已移除，保存菜品后生效。");
});

api("/api/admin/session").then(async (session) => {
  showAdmin(session.loggedIn);
  if (session.loggedIn) await loadAdminData();
}).catch(() => showAdmin(false));
