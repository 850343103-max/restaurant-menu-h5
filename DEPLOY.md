# H5 点菜系统上线步骤：GitHub + Vercel + Supabase + Cloudflare

## 1. 当前项目结构

- 前端：`index.html` 是客人点菜页，`admin.html` 是后台管理页。
- 后端接口：`api/` 目录是 Vercel Serverless Functions。
- 数据库：Supabase PostgreSQL，保存分类、菜品、订单。
- 图片：Supabase Storage，bucket 名称建议 `dish-images`。
- 本地旧文件：`server.js`、`db.json`、`uploads/` 只用于之前本地版本，Vercel 正式部署不依赖它们。

## 2. Supabase 设置

1. 打开 Supabase 项目。
2. 进入 SQL Editor。
3. 复制 `supabase-schema.sql` 全部内容并执行。
4. 进入 Storage。
5. 新建 bucket：`dish-images`。
6. 勾选 Public bucket。

## 3. Vercel 环境变量

在 Vercel 项目 Settings -> Environment Variables 添加：

```text
SUPABASE_URL=你的 Supabase Project URL
SUPABASE_SERVICE_ROLE_KEY=你的 Supabase service_role key
SUPABASE_STORAGE_BUCKET=dish-images
ADMIN_USER=admin
ADMIN_PASSWORD=请设置一个强密码
ADMIN_SECRET=任意一串长随机字符
```

注意：`SUPABASE_SERVICE_ROLE_KEY` 只能放在 Vercel 环境变量里，不要写进前端代码，不要提交到 GitHub。

## 4. 推送到 GitHub

在项目目录运行：

```bash
git init
git add .
git commit -m "Deploy restaurant ordering H5 to Vercel"
git branch -M main
git remote add origin https://github.com/你的用户名/你的仓库名.git
git push -u origin main
```

如果仓库已经存在，只需要：

```bash
git add .
git commit -m "Prepare Vercel Supabase deployment"
git push
```

## 5. Vercel 连接 GitHub 自动部署

1. 打开 Vercel Dashboard。
2. 点击 Add New -> Project。
3. 选择 GitHub 里的这个仓库。
4. Framework Preset 选择 Other。
5. Build Command 留空或填 `echo no build needed`。
6. Output Directory 留空。
7. 添加上面的环境变量。
8. 点击 Deploy。

部署完成后：

- 客人点菜链接：`https://你的项目.vercel.app/`
- 后台管理链接：`https://你的项目.vercel.app/admin.html`

## 6. Cloudflare 绑定域名

假设你的域名是 `example.com`，想使用 `menu.example.com`：

1. 在 Vercel 项目 Settings -> Domains 添加 `menu.example.com`。
2. Vercel 会提示你配置 CNAME。
3. 打开 Cloudflare -> DNS。
4. 新增记录：

```text
Type: CNAME
Name: menu
Target: cname.vercel-dns.com
Proxy status: DNS only
TTL: Auto
```

5. 回到 Vercel 等待验证通过。
6. Vercel 会自动签发 HTTPS 证书。

如果要根域名 `example.com`，按 Vercel 给出的 A 记录或 CNAME 提示配置即可。

## 7. 生成扫码链接

正式链接就是：

```text
https://menu.example.com/
```

把这个链接生成二维码，贴到桌上即可。后台不要给客人：

```text
https://menu.example.com/admin.html
```

## 8. 日常使用

- 客人打开 `/` 点菜并提交订单。
- 管理员打开 `/admin.html` 登录。
- 后台可以新增、编辑、删除菜品，设置售罄。
- 后台菜品图片上传会保存到 Supabase Storage。
- 订单会保存到 Supabase `orders` 表。
