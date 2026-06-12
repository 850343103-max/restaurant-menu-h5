let state = { categories: [], dishes: [], orders: [] };
let activeCategory = "";
let cart = {};

const $ = (selector) => document.querySelector(selector);
const els = {
  categoryTabs: $("#categoryTabs"),
  dishList: $("#dishList"),
  cartToggle: $("#cartToggle"),
  cartDrawer: $("#cartDrawer"),
  cartCount: $("#cartCount"),
  cartTotal: $("#cartTotal"),
  cartItems: $("#cartItems"),
  orderForm: $("#orderForm"),
  clearCart: $("#clearCart"),
  toast: $("#toast")
};

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
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

function categoryName(id) {
  const category = state.categories.find((item) => item.id === id);
  return category ? category.name : "未分类";
}

function fallbackImage(name) {
  const short = encodeURIComponent(name.slice(0, 2));
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' x2='1' y1='0' y2='1'%3E%3Cstop stop-color='%23d7eee4'/%3E%3Cstop offset='1' stop-color='%23f4d8a9'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='120' height='120' rx='12' fill='url(%23g)'/%3E%3Ccircle cx='60' cy='60' r='34' fill='rgba(255,255,255,.55)'/%3E%3Ctext x='60' y='68' text-anchor='middle' font-size='26' font-family='Microsoft YaHei, sans-serif' fill='%2308614f'%3E${short}%3C/text%3E%3C/svg%3E`;
}

function formDataToObject(form) {
  const data = {};
  new FormData(form).forEach((value, key) => {
    data[key] = typeof value === "string" ? value.trim() : value;
  });
  return data;
}

function selectedItems() {
  return Object.entries(cart)
    .map(([id, qty]) => ({ dish: state.dishes.find((item) => item.id === id), qty }))
    .filter((item) => item.dish && item.qty > 0);
}

function cartTotals() {
  return selectedItems().reduce((acc, item) => {
    acc.count += item.qty;
    acc.total += Number(item.dish.price || 0) * item.qty;
    return acc;
  }, { count: 0, total: 0 });
}

function renderMenu() {
  if (!state.categories.length) {
    els.categoryTabs.innerHTML = "";
    els.dishList.innerHTML = `<div class="empty">暂无菜单，请联系工作人员。</div>`;
    return;
  }
  if (!state.categories.some((item) => item.id === activeCategory)) {
    activeCategory = state.categories[0].id;
  }
  els.categoryTabs.innerHTML = state.categories.map((cat) => `
    <button class="${cat.id === activeCategory ? "active" : ""}" data-category="${cat.id}" type="button">${cat.name}</button>
  `).join("");

  const dishes = state.dishes.filter((dish) => dish.categoryId === activeCategory);
  els.dishList.innerHTML = dishes.length ? dishes.map((dish) => {
    const qty = cart[dish.id] || 0;
    return `
      <article class="dish-card ${dish.soldOut ? "sold" : ""}">
        <img class="dish-img" src="${dish.image || fallbackImage(dish.name)}" alt="${dish.name}">
        <div class="dish-info">
          <h3>${dish.name}</h3>
          <p>${dish.desc || "暂无描述"}</p>
          <div class="price-line">
            <span class="price">${money(dish.price)}</span>
            ${dish.soldOut ? `<span class="sold-tag">已售罄</span>` : `
              <div class="qty-control" aria-label="${dish.name} 数量">
                <button data-minus="${dish.id}" type="button">-</button>
                <span>${qty}</span>
                <button data-plus="${dish.id}" type="button">+</button>
              </div>
            `}
          </div>
        </div>
      </article>
    `;
  }).join("") : `<div class="empty">该分类暂无菜品。</div>`;
}

function renderCart() {
  const totals = cartTotals();
  const hasItems = totals.count > 0;
  els.cartCount.textContent = totals.count;
  els.cartTotal.textContent = money(totals.total);
  els.cartToggle.classList.toggle("disabled", !hasItems);
  $("#cartActionText").textContent = hasItems ? "提交订单" : "先选菜";

  const items = selectedItems();
  els.cartItems.innerHTML = items.length ? items.map(({ dish, qty }) => `
    <div class="cart-row">
      <div>
        <strong>${dish.name}</strong>
        <small>${money(dish.price)} x ${qty}</small>
      </div>
      <strong>${money(Number(dish.price || 0) * qty)}</strong>
    </div>
  `).join("") : `<div class="empty">还没有选择菜品。</div>`;
}

function renderAll() {
  renderMenu();
  renderCart();
}

function setQty(id, qty) {
  const dish = state.dishes.find((item) => item.id === id);
  if (!dish || dish.soldOut) return;
  if (qty <= 0) delete cart[id];
  else cart[id] = qty;
  renderAll();
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => els.toast.classList.remove("show"), 2400);
}

document.addEventListener("click", (event) => {
  const target = event.target.closest("button");
  if (!target) return;
  if (target.dataset.category) {
    activeCategory = target.dataset.category;
    renderMenu();
  }
  if (target.dataset.plus) setQty(target.dataset.plus, (cart[target.dataset.plus] || 0) + 1);
  if (target.dataset.minus) setQty(target.dataset.minus, (cart[target.dataset.minus] || 0) - 1);
});

els.cartToggle.addEventListener("click", () => {
  if (!selectedItems().length) {
    showToast("请先选择菜品。");
    return;
  }
  els.cartDrawer.hidden = false;
  setTimeout(() => els.orderForm.elements.roomNo.focus(), 50);
});

els.clearCart.addEventListener("click", () => {
  cart = {};
  els.cartDrawer.hidden = true;
  renderAll();
});

els.orderForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const items = selectedItems();
  if (!items.length) {
    showToast("请先选择菜品。");
    return;
  }
  const data = formDataToObject(els.orderForm);
  const orderItems = items.map(({ dish, qty }) => ({
    dishId: dish.id,
    name: dish.name,
    price: Number(dish.price || 0),
    qty,
    categoryId: dish.categoryId,
    categoryName: categoryName(dish.categoryId)
  }));
  const order = {
    id: uid("order"),
    createdAt: Date.now(),
    name: data.name,
    roomNo: data.roomNo,
    phone: data.phone,
    people: Number(data.people || 0),
    note: data.note,
    items: orderItems,
    total: orderItems.reduce((sum, item) => sum + item.price * item.qty, 0)
  };
  try {
    state = await api("/api/orders", { method: "POST", body: JSON.stringify(order) });
    cart = {};
    els.orderForm.reset();
    els.cartDrawer.hidden = true;
    renderAll();
    showToast("订单已提交，后台已生成。");
  } catch (error) {
    showToast(error.message);
  }
});

api("/api/data").then((data) => {
  state = data;
  activeCategory = state.categories[0] ? state.categories[0].id : "";
  renderAll();
}).catch((error) => showToast(error.message));
