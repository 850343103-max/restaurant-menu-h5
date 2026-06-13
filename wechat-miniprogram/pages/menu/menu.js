const app = getApp();

function todayString() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function uid(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 7)}`;
}

function fallbackImage(name) {
  const text = encodeURIComponent((name || "菜品").slice(0, 2));
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' x2='1' y1='0' y2='1'%3E%3Cstop stop-color='%23d7eee4'/%3E%3Cstop offset='1' stop-color='%23f4d8a9'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='120' height='120' rx='12' fill='url(%23g)'/%3E%3Ccircle cx='60' cy='60' r='34' fill='rgba(255,255,255,.55)'/%3E%3Ctext x='60' y='68' text-anchor='middle' font-size='26' font-family='Microsoft YaHei, sans-serif' fill='%2308614f'%3E${text}%3C/text%3E%3C/svg%3E`;
}

Page({
  data: {
    apiBase: app.globalData.apiBase,
    restaurantName: app.globalData.restaurantName,
    restaurantEnName: app.globalData.restaurantEnName,
    logoText: app.globalData.logoText,
    categories: [],
    groupedCategories: [],
    dishes: [],
    activeCategory: "",
    scrollTarget: "",
    cart: {},
    cartItems: [],
    cartCount: 0,
    cartTotal: 0,
    loading: true,
    submitting: false,
    showOrderPanel: false,
    mealPeriods: ["中午", "晚上"],
    mealPeriodIndex: 0,
    form: {
      name: "",
      roomNo: "",
      phone: "",
      mealDate: todayString(),
      mealPeriod: "中午",
      people: "",
      note: ""
    }
  },

  onLoad() {
    this.loadMenu();
  },

  onPullDownRefresh() {
    this.loadMenu().finally(() => wx.stopPullDownRefresh());
  },

  request(path, options = {}) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${this.data.apiBase}${path}`,
        method: options.method || "GET",
        data: options.data || undefined,
        header: {
          "content-type": "application/json"
        },
        success: (res) => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(res.data);
            return;
          }
          reject(new Error((res.data && res.data.error) || "请求失败"));
        },
        fail: () => reject(new Error("网络连接失败"))
      });
    });
  },

  async loadMenu() {
    this.setData({ loading: true });
    try {
      const data = await this.request("/api/data");
      const categories = data.categories || [];
      const dishes = (data.dishes || []).map((dish) => ({
        ...dish,
        priceText: Number(dish.price || 0).toFixed(0),
        fallbackImage: fallbackImage(dish.name)
      }));
      const activeCategory = categories.some((item) => item.id === this.data.activeCategory)
        ? this.data.activeCategory
        : (categories[0] ? categories[0].id : "");
      const groupedCategories = this.buildGroups(categories, dishes);
      this.setData({ categories, groupedCategories, dishes, activeCategory, loading: false }, () => {
        this.measureCategoryOffsets();
      });
    } catch (error) {
      this.setData({ loading: false });
      wx.showToast({ title: error.message, icon: "none" });
    }
  },

  buildGroups(categories, dishes) {
    return categories.map((category) => ({
      ...category,
      sectionId: `section-${category.id}`,
      dishes: dishes.filter((dish) => dish.categoryId === category.id)
    })).filter((category) => category.dishes.length);
  },

  measureCategoryOffsets() {
    wx.createSelectorQuery()
      .in(this)
      .select(".dish-scroll")
      .boundingClientRect()
      .selectAll(".category-section")
      .boundingClientRect()
      .exec((result) => {
        const container = result && result[0];
        const sections = (result && result[1]) || [];
        if (!container || !sections.length) return;
        this.categoryOffsets = sections.map((section) => ({
          id: (section.dataset && section.dataset.id) || String(section.id || "").replace(/^section-/, ""),
          top: section.top - container.top
        })).filter((item) => item.id);
      });
  },

  onCategoryTap(event) {
    const id = event.currentTarget.dataset.id;
    this.lockActiveCategoryUntil = Date.now() + 1000;
    this.setData({ activeCategory: id, scrollTarget: `section-${id}` });
  },

  onDishScroll(event) {
    if (!this.categoryOffsets || !this.categoryOffsets.length) return;
    if (Date.now() < (this.lockActiveCategoryUntil || 0)) return;
    const scrollTop = event.detail.scrollTop || 0;
    let activeCategory = this.categoryOffsets[0].id;
    this.categoryOffsets.forEach((item) => {
      if (scrollTop + 24 >= item.top) activeCategory = item.id;
    });
    if (activeCategory && activeCategory !== this.data.activeCategory) {
      this.setData({ activeCategory });
    }
  },

  changeQty(event) {
    const id = event.currentTarget.dataset.id;
    const delta = Number(event.currentTarget.dataset.delta || 0);
    const dish = this.data.dishes.find((item) => item.id === id);
    if (!dish || dish.soldOut) return;
    const cart = { ...this.data.cart };
    const next = Number(cart[id] || 0) + delta;
    if (next <= 0) delete cart[id];
    else cart[id] = next;
    this.setData({ cart }, () => this.updateCart());
  },

  updateCart() {
    const cartItems = Object.keys(this.data.cart).map((id) => {
      const dish = this.data.dishes.find((item) => item.id === id);
      const qty = this.data.cart[id];
      if (!dish || qty <= 0) return null;
      const price = Number(dish.price || 0);
      return {
        dishId: dish.id,
        name: dish.name,
        price,
        qty,
        categoryId: dish.categoryId,
        categoryName: this.categoryName(dish.categoryId),
        lineTotal: price * qty
      };
    }).filter(Boolean);
    const totals = cartItems.reduce((acc, item) => {
      acc.count += item.qty;
      acc.total += item.lineTotal;
      return acc;
    }, { count: 0, total: 0 });
    this.setData({
      cartItems,
      cartCount: totals.count,
      cartTotal: totals.total
    });
  },

  categoryName(id) {
    const category = this.data.categories.find((item) => item.id === id);
    return category ? category.name : "未分类";
  },

  openOrderPanel() {
    if (!this.data.cartCount) {
      wx.showToast({ title: "请先选择菜品", icon: "none" });
      return;
    }
    this.setData({ showOrderPanel: true });
  },

  closeOrderPanel() {
    this.setData({ showOrderPanel: false });
  },

  onInput(event) {
    const key = event.currentTarget.dataset.key;
    this.setData({ [`form.${key}`]: event.detail.value });
  },

  onDateChange(event) {
    this.setData({ "form.mealDate": event.detail.value });
  },

  onMealPeriodChange(event) {
    const index = Number(event.detail.value);
    this.setData({
      mealPeriodIndex: index,
      "form.mealPeriod": this.data.mealPeriods[index]
    });
  },

  validateForm() {
    const form = this.data.form;
    if (!form.name.trim()) return "请填写客人姓名";
    if (!form.roomNo.trim()) return "请填写房号或桌号";
    if (!form.phone.trim()) return "请填写联系电话";
    if (!form.mealDate) return "请选择用餐日期";
    if (!form.mealPeriod) return "请选择餐段";
    if (!Number(form.people)) return "请填写用餐人数";
    if (!this.data.cartItems.length) return "请先选择菜品";
    return "";
  },

  async submitOrder() {
    const error = this.validateForm();
    if (error) {
      wx.showToast({ title: error, icon: "none" });
      return;
    }
    const form = this.data.form;
    const items = this.data.cartItems.map((item) => ({
      dishId: item.dishId,
      name: item.name,
      price: item.price,
      qty: item.qty,
      categoryId: item.categoryId,
      categoryName: item.categoryName
    }));
    const order = {
      id: uid("wx_order"),
      createdAt: Date.now(),
      name: form.name.trim(),
      roomNo: form.roomNo.trim(),
      phone: form.phone.trim(),
      mealDate: form.mealDate,
      mealPeriod: form.mealPeriod,
      people: Number(form.people || 0),
      note: form.note.trim(),
      items,
      total: this.data.cartTotal
    };
    this.setData({ submitting: true });
    try {
      await this.request("/api/orders", { method: "POST", data: order });
      wx.showToast({ title: "订单已提交", icon: "success" });
      this.setData({
        cart: {},
        cartItems: [],
        cartCount: 0,
        cartTotal: 0,
        showOrderPanel: false,
        submitting: false,
        form: {
          name: "",
          roomNo: "",
          phone: "",
          mealDate: todayString(),
          mealPeriod: "中午",
          people: "",
          note: ""
        },
        mealPeriodIndex: 0
      });
      this.measureCategoryOffsets();
    } catch (err) {
      this.setData({ submitting: false });
      wx.showToast({ title: err.message, icon: "none" });
    }
  }
});
