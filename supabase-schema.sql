-- Supabase SQL Editor 里执行本文件。
-- 数据表使用和前端一致的字段名，方便 Vercel API 直接读写。

create table if not exists public.categories (
  id text primary key,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.dishes (
  id text primary key,
  "categoryId" text not null references public.categories(id) on delete restrict,
  name text not null,
  price numeric not null default 0,
  image text not null default '',
  "desc" text not null default '',
  "soldOut" boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id text primary key,
  "createdAt" bigint not null,
  name text not null,
  "roomNo" text not null,
  phone text not null default '',
  "mealDate" text not null default '',
  "mealPeriod" text not null default '',
  people integer not null,
  note text not null default '',
  items jsonb not null,
  total numeric not null default 0,
  created_at timestamptz not null default now()
);

alter table public.orders
  alter column phone drop not null,
  alter column phone set default '';

alter table public.orders
  add column if not exists "mealDate" text not null default '',
  add column if not exists "mealPeriod" text not null default '';

notify pgrst, 'reload schema';

alter table public.categories enable row level security;
alter table public.dishes enable row level security;
alter table public.orders enable row level security;

-- 前端公开读取菜单；写入、后台读取订单通过 Vercel API 使用 service role key 完成。
drop policy if exists "public read categories" on public.categories;
create policy "public read categories" on public.categories
for select using (true);

drop policy if exists "public read dishes" on public.dishes;
create policy "public read dishes" on public.dishes
for select using (true);

-- 初始化分类，可重复执行。
insert into public.categories (id, name, sort_order) values
  ('appetizer', '前菜', 10),
  ('platter', '头盘', 20),
  ('soup', '汤', 30),
  ('seafood', '海鲜', 40),
  ('fish', '鱼', 50),
  ('fusion', '融合菜', 60),
  ('roast', '烧腊', 70),
  ('vegetable', '时蔬', 80),
  ('staple', '主食', 90),
  ('dim-sum', '点心', 100),
  ('dessert', '甜品', 110),
  ('fruit', '水果', 120)
on conflict (id) do update set
  name = excluded.name,
  sort_order = excluded.sort_order;

-- 初始化部分菜品，可在后台继续增删改。
insert into public.dishes (id, "categoryId", name, price, image, "desc", "soldOut") values
  ('a01', 'appetizer', '川府一品泡菜', 35, '', '￥35/碟', false),
  ('a02', 'appetizer', '爽脆萝衣柳', 32, '', '￥32/碟', false),
  ('a03', 'appetizer', '青士酱鲜核桃', 48, '', '￥48/碟', false),
  ('a04', 'appetizer', '烧椒溏心皮蛋', 38, '', '￥38/碟', false),
  ('a05', 'appetizer', '椒盐鸡脆骨', 38, '', '￥38/碟', false),
  ('a06', 'appetizer', '葱油淋云南水果芹菜', 58, '', '￥58/碟', false),
  ('a07', 'appetizer', '琥珀核桃', 48, '', '￥48/碟', false),
  ('a08', 'appetizer', '椒盐多春鱼', 48, '', '￥48/碟', false),
  ('a09', 'appetizer', '农家盐香花生', 32, '', '￥32/碟', false),
  ('a10', 'appetizer', '老醋爽脆海蜇头', 48, '', '￥48/碟', false),
  ('p01', 'platter', '大连活赤贝拼慕斯鹅肝', 198, '', '￥198/份，各4件', false),
  ('p02', 'platter', '挪威三文鱼拼樱桃鹅肝', 248, '', '￥248/份，三文鱼8件、鹅肝4件', false),
  ('p03', 'platter', '冰镇2头墨西哥鲍鱼', 149, '', '￥149/只', false),
  ('p04', 'platter', '9年宫廷卡露伽鱼子酱', 149, '', '￥149/盒，10g', false),
  ('p05', 'platter', '三文鱼刺身', 228, '', '￥228/份，10件', false)
on conflict (id) do update set
  "categoryId" = excluded."categoryId",
  name = excluded.name,
  price = excluded.price,
  "desc" = excluded."desc",
  "soldOut" = excluded."soldOut";

insert into storage.buckets (id, name, public)
values ('dish-images', 'dish-images', true)
on conflict (id) do update set public = true;

drop policy if exists "public read dish images" on storage.objects;
create policy "public read dish images" on storage.objects
for select using (bucket_id = 'dish-images');
