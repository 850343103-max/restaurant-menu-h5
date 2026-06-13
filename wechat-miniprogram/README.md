# 粤菜王府微信小程序点菜端

这是 `restaurant-menu-h5` 的微信原生小程序客人端，不替代现有网页后台。

## 架构

- 网页后台继续使用：`https://menu.780982.xyz/admin.html`
- 小程序客人端调用现有 Vercel API：
  - `GET https://menu.780982.xyz/api/data` 读取分类和菜品
  - `POST https://menu.780982.xyz/api/orders` 提交订单
- 数据库仍然使用 Supabase：
  - `categories` 分类
  - `dishes` 菜品
  - `orders` 订单
- 图片仍然使用 Supabase Storage。
- 小程序前端不保存 Supabase Secret Key，Secret Key 只在 Vercel 后端环境变量里。

## 当前订单字段

小程序提交订单时会写入：

- `id`
- `createdAt`
- `name`
- `roomNo`
- `phone`
- `mealDate`
- `mealPeriod`
- `people`
- `note`
- `items`
- `total`

网页后台会直接看到这些订单。

## 导入微信开发者工具

1. 打开微信开发者工具。
2. 选择 `小程序`。
3. 点击 `导入项目`。
4. 项目目录选择：

   ```text
   C:\Users\w\Documents\菜单小程序\wechat-miniprogram
   ```

5. AppID：
   - 如果还没有正式小程序 AppID，可以先选测试号或填微信公众平台的小程序 AppID。
   - 正式上线必须使用酒店自己的小程序 AppID。

6. 导入后点击 `编译`。

## 配置正式 AppID

导入后，在微信开发者工具右上角或 `project.config.json` 中替换：

```json
"appid": "你的微信小程序AppID"
```

不要使用 `touristappid` 提交审核。

## 配置服务器合法域名

登录微信公众平台：

```text
https://mp.weixin.qq.com/
```

进入：

```text
开发管理 → 开发设置 → 服务器域名
```

配置：

### request 合法域名

```text
https://menu.780982.xyz
```

### downloadFile 合法域名

如果菜品图片使用 Supabase Storage 公网地址，还需要添加 Supabase 项目域名：

```text
https://czujkimarwefwosxjsyc.supabase.co
```

如果后续把所有图片代理到 `menu.780982.xyz`，则只保留 `https://menu.780982.xyz` 也可以。

## 本地调试

如果合法域名还没配置，可以在微信开发者工具里临时勾选：

```text
详情 → 本地设置 → 不校验合法域名、web-view、TLS 版本以及 HTTPS 证书
```

这只适合开发调试，上传体验版和正式审核前必须配置合法域名。

## 上传体验版

1. 微信开发者工具右上角点击 `上传`。
2. 版本号示例：

   ```text
   1.0.0
   ```

3. 项目备注示例：

   ```text
   原生小程序点菜客人端，复用网页后台和 Supabase 数据。
   ```

4. 上传成功后，去微信公众平台：

   ```text
   版本管理 → 开发版本
   ```

5. 设置为体验版，添加体验人员微信号。

## 提交审核

1. 微信公众平台进入：

   ```text
   版本管理 → 开发版本 → 提交审核
   ```

2. 服务类目建议选择餐饮相关类目，按酒店营业主体资料填写。
3. 审核说明可写：

   ```text
   本小程序用于酒店住客/到店客人扫码浏览菜单并提交点菜订单，不含在线支付、会员、优惠券功能。订单提交后由酒店后台人工处理。
   ```

4. 审核通过后点击 `发布`。

## 后续修改

- 改菜品、价格、图片、售罄：只需要在网页后台操作，不需要重新上传小程序。
- 改小程序页面、字段、样式：需要重新上传体验版并提交审核。
- 改数据库字段：需要同步修改 Vercel API 和 Supabase SQL。
