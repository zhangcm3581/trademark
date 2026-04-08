# 全国商标库 - 服务器自部署文档

## 架构概览

```
浏览器 → Caddy (自动HTTPS)
           ├── biaoxiaosheng.com       ─┐
           └── app.biaoxiaosheng.com   ─┤
                                        ├── Next.js :3000 (PM2)
                                        │      └── MySQL :3306 (本机)
                                        │            └── tenant 字段区分数据
```

**多租户说明：**
- `biaoxiaosheng.com` 面向优质客户（数据库 `tenant='vip'`）
- `app.biaoxiaosheng.com` 面向普通客户（数据库 `tenant='app'`）
- 同一份代码、同一个 Next.js 进程、同一个 MySQL 库，根据请求 Host 自动隔离数据
- 管理后台 `/backstage` 在两个域名上都可访问；登录后的所有操作只针对当前访问的域名所属租户
- 登录 cookie 各域独立，必须在各自域名上分别登录一次

所有服务部署在同一台服务器上，MySQL 直接安装在服务器本机。

### 版本要求

| 组件     | 要求版本              | 说明                  |
| -------- | --------------------- | --------------------- |
| Node.js  | >= 18.18（推荐 20.x） | Next.js 16 要求最低 18.18 |
| npm      | >= 9                  | 随 Node.js 附带       |
| MySQL    | >= 8.0                | 推荐 8.0+             |
| Caddy    | >= 2.0（推荐 2.7+）   | 自动 HTTPS 需 2.x     |
| PM2      | >= 5.0                | Node.js 进程管理      |

### 服务器最低配置

- CPU: 1 核
- 内存: 2 GB
- 硬盘: 20 GB
- 系统: Ubuntu 22.04 / 24.04

---

## 一、安装基础环境

> 以 Ubuntu 为例，以 root 用户执行（或在命令前加 sudo）。

### 1.1 系统更新 & 基础工具

```bash
apt update && apt upgrade -y
apt install -y curl wget git nano unzip
```

### 1.2 安装 MySQL 8

```bash
apt install -y mysql-server

# 开机自启
systemctl enable mysql --now

# 验证
mysql --version   # mysql  Ver 8.0.x
```

### 1.3 安装 Node.js 20

```bash
# 方式一：使用 NodeSource（需外网）
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# 方式二：使用淘宝镜像（国内服务器推荐）
wget https://npmmirror.com/mirrors/node/v20.18.0/node-v20.18.0-linux-x64.tar.xz
tar -xJf node-v20.18.0-linux-x64.tar.xz -C /usr/local --strip-components=1

# 验证
node -v   # v20.x.x
npm -v    # 10.x.x

# 设置 npm 镜像（国内服务器推荐）
npm config set registry https://registry.npmmirror.com
```

### 1.4 安装 PM2

```bash
npm install -g pm2
```

### 1.5 安装 Caddy

```bash
apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update
apt install -y caddy
```

如果 Caddy 源无法访问，可直接下载二进制：

```bash
wget https://github.com/caddyserver/caddy/releases/download/v2.9.1/caddy_2.9.1_linux_amd64.tar.gz
tar xzf caddy_2.9.1_linux_amd64.tar.gz
mv caddy /usr/bin/
mkdir -p /etc/caddy
```

---

## 二、初始化 MySQL 数据库

### 2.1 创建数据库和用户

```bash
mysql -u root -p
```

在 MySQL 命令行中执行：

```sql
CREATE DATABASE trademark DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'trademark'@'localhost' IDENTIFIED BY '你的数据库密码';
GRANT ALL PRIVILEGES ON trademark.* TO 'trademark'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 2.2 导入建表脚本

先把项目代码拉到服务器（见第三步），然后执行：

```bash
mysql -u trademark -p trademark < /opt/trademark/init.sql
```

> 建表脚本会自动创建默认管理员账号：`admin` / `admin123`
> **部署后请立即修改密码！**

### 2.3 多租户迁移（已运行过 init.sql 的旧库）

> 如果数据库已经存在并有商标数据，**不要**重新运行 init.sql。
> 改为执行 `migrations/001_add_tenant.sql`，给现有表添加 `tenant` 字段。

```bash
mysql -u trademark -p trademark < /opt/trademark/migrations/001_add_tenant.sql
```

迁移脚本特点：
- **幂等可重放**：脚本通过存储过程判断列/索引是否已存在，反复执行不会出错
- **零停机**：使用 `ALGORITHM=INSTANT`，加列不重写表，秒级完成
- **数据保留**：所有现有商标自动归属 `tenant='vip'`（即 `biaoxiaosheng.com` 主站）

迁移后数据库会有：
| 表名 | 新增字段 | 新增索引 |
|---|---|---|
| `trademarks` | `tenant VARCHAR(32) NOT NULL DEFAULT 'vip'` | `(tenant, category)`、`(tenant, price)`、`(tenant, created_at)` |
| `international_trademarks` | 同上 | `(tenant, category)`、`(tenant, country)`、`(tenant, created_at)` |
| `settings` | `tenant VARCHAR(32) NOT NULL DEFAULT 'vip'`，主键改为 `(tenant, key)` | — |

迁移完成后会自动为 `app` 租户复制一份默认设置（与 `vip` 相同），后续可在两个域名的后台分别独立修改。

**强烈建议在生产执行前备份：**

```bash
mkdir -p /opt/backup
mysqldump -u trademark -p trademark > /opt/backup/before_tenant_$(date +%Y%m%d_%H%M%S).sql
```

**验证迁移结果：**

```bash
mysql -u trademark -p trademark -e "
  SELECT tenant, COUNT(*) AS rows FROM trademarks GROUP BY tenant;
  SELECT tenant, COUNT(*) AS rows FROM international_trademarks GROUP BY tenant;
  SELECT tenant, \\\`key\\\`, \\\`value\\\` FROM settings ORDER BY tenant, \\\`key\\\`;
"
```

应看到：所有商标归属 `vip`，settings 表中 `vip` 和 `app` 各 3 行（默认设置）。

---

## 三、拉取并部署应用代码

### 3.1 配置 Git

```bash
apt install -y git
```

如果是私有仓库，先配置 SSH key：

```bash
ssh-keygen -t ed25519 -C "deploy"
cat ~/.ssh/id_ed25519.pub
# 将输出的公钥添加到 Git 仓库的 Settings → Deploy Keys
```

### 3.2 克隆代码

```bash
cd /opt
git clone <你的Git仓库地址> trademark

# 国内服务器如果 GitHub 访问慢，可使用代理：
# git clone https://ghfast.top/https://github.com/用户名/trademark.git
```

### 3.3 配置环境变量

```bash
cd /opt/trademark/app
cp .env.example .env.local
nano .env.local
```

修改为实际值：

```env
# MySQL 数据库配置
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=trademark
DB_PASSWORD=你的数据库密码
DB_NAME=trademark

# JWT 密钥（请使用随机字符串）
JWT_SECRET=用openssl生成: openssl rand -hex 32
```

### 3.4 安装依赖 & 构建

```bash
cd /opt/trademark/app
npm install
npm run build
```

### 3.5 PM2 启动应用

```bash
cd /opt/trademark/app
pm2 start npm --name "trademark" -- start

# 设置开机自启
pm2 startup
pm2 save
```

验证：

```bash
curl http://127.0.0.1:3000
# 应返回 HTML 内容
```

---

## 四、配置 Caddy（自动 HTTPS + 反向代理）

### 4.1 域名解析

在你的域名服务商处添加 **两条** A 记录，全部指向同一台服务器公网 IP：

| 记录类型 | 主机记录 | 记录值       | 用途                       |
| -------- | -------- | ------------ | -------------------------- |
| A        | @        | 服务器公网IP | `biaoxiaosheng.com`（vip） |
| A        | app      | 服务器公网IP | `app.biaoxiaosheng.com`    |

> 两条记录必须**指向同一台服务器**。Next.js 进程根据请求 Host 自动区分租户，物理上是同一份代码同一个进程。

### 4.2 配置 Caddyfile

```bash
nano /etc/caddy/Caddyfile
```

写入：

```caddyfile
biaoxiaosheng.com, app.biaoxiaosheng.com {
    reverse_proxy 127.0.0.1:3000
}
```

> 这里 Caddy 会用同一个站点配置匹配两个域名，统一反向代理到 Next.js。Next.js 看到的 `Host` 头会保留原始请求的域名，从而能区分租户。
>
> 如果未来要给两个站点配不同的限速、缓存或 IP 白名单，可以拆成两个站点块：
>
> ```caddyfile
> biaoxiaosheng.com {
>     reverse_proxy 127.0.0.1:3000
> }
>
> app.biaoxiaosheng.com {
>     reverse_proxy 127.0.0.1:3000
>     # 例如这里可以加 rate_limit 等
> }
> ```
>
> Caddy 会**自动为两个域名各申请一张 Let's Encrypt 证书**，并自动续期。

### 4.3 启动 Caddy

```bash
# 验证配置
caddy validate --config /etc/caddy/Caddyfile

# 重载生效
systemctl reload caddy

# 查看状态
systemctl status caddy
```

首次启动后查看证书申请日志，确认两个域名都拿到了证书：

```bash
journalctl -u caddy -n 100 --no-pager | grep -E '(certificate obtained|biaoxiaosheng)'
```

应看到 `biaoxiaosheng.com` 和 `app.biaoxiaosheng.com` 各一条 `certificate obtained successfully` 日志。

### 4.4 防火墙

```bash
ufw allow 80
ufw allow 443
ufw reload
```

> **不要**对外暴露 3306 端口，MySQL 仅本机访问。

---

## 五、验证部署

### 5.1 基础联通性

按顺序访问：

| 步骤 | 地址                                                  | 预期结果       |
| ---- | ----------------------------------------------------- | -------------- |
| 1    | `https://biaoxiaosheng.com`                           | 精品商标首页（VIP 数据） |
| 2    | `https://app.biaoxiaosheng.com`                       | 精品商标首页（APP 数据，初次部署应该是空列表）|
| 3    | `https://biaoxiaosheng.com/backstage/login`           | 管理员登录页 |
| 4    | 用 admin / 你的密码 登录                              | 进入管理后台，**右上角看到琥珀色"优质客户"徽章** |
| 5    | `https://app.biaoxiaosheng.com/backstage/login`       | 同样的登录页（独立 cookie，需要再登录一次）|
| 6    | 用 admin / 你的密码 登录                              | 进入管理后台，**右上角看到天蓝色"普通客户"徽章** |

### 5.2 多租户隔离联调（重要）

完成基础联通后，按以下脚本演练一次端到端隔离，确认两个域名的数据完全独立：

#### A. 在 vip 后台导入测试数据

1. 浏览器打开 `https://biaoxiaosheng.com/backstage/login`，登录
2. 进入 `/backstage/import`，确认顶部警告条**琥珀色**显示"当前正在导入到：优质客户"
3. 选一个测试 Excel（3-5 条记录即可），点"导入"
4. 弹出二次确认 modal，确认目标租户是"优质客户"，点确认
5. 进入 `/backstage` 商标列表，确认这 3-5 条记录已出现

#### B. 在 vip 前台验证可见

1. 打开 `https://biaoxiaosheng.com/`，进入精品/特惠分类
2. 找到刚导入的商标 ✅

#### C. 切换到 app 后台验证不可见

1. 浏览器打开 `https://app.biaoxiaosheng.com/backstage/login`，登录
2. 顶部徽章应是**天蓝色"普通客户"**
3. 进入 `/backstage` 商标列表，**不应看到** A 步骤导入的商标 ✅

#### D. 在 app 前台验证不可见

1. 打开 `https://app.biaoxiaosheng.com/`
2. 商标列表为空（或只有你后续给 app 导入的数据）✅

#### E. 反向验证 — 在 app 后台导入数据

1. 在 app 后台导入 2-3 条不同的测试商标
2. 顶部警告条应是**天蓝色**，弹窗确认目标是"普通客户"
3. 导入后访问 `https://app.biaoxiaosheng.com/`，应看到这些数据
4. 访问 `https://biaoxiaosheng.com/`，**不应看到** ✅

#### F. settings 隔离

1. 在 vip 后台 `/backstage/settings` 把"特惠商标"开关关掉
2. 访问 `https://biaoxiaosheng.com/`，底部导航**没有**"特惠商标"
3. 访问 `https://app.biaoxiaosheng.com/`，底部导航**仍然**显示"特惠商标"（app 的设置未受影响）✅
4. 验证完成后记得把 vip 的开关恢复回去

#### G. 测试数据清理

演练结束后，在两个后台分别批量删除测试商标。

### 5.3 验证清单（一键检查）

| 检查项 | 通过 |
|---|---|
| `biaoxiaosheng.com` HTTPS 证书有效 | ☐ |
| `app.biaoxiaosheng.com` HTTPS 证书有效 | ☐ |
| vip 后台徽章显示"优质客户" | ☐ |
| app 后台徽章显示"普通客户" | ☐ |
| vip 域导入的商标只在 vip 前台可见 | ☐ |
| app 域导入的商标只在 app 前台可见 | ☐ |
| 跨租户访问对方商标 ID（比如复制 vip 商标 URL 到 app 域）→ 404 | ☐ |
| vip / app 的 settings 互相独立 | ☐ |
| 两个域名各自的登录 cookie 互不干扰 | ☐ |

---

## 六、修改管理员密码

部署后立即修改默认密码：

```bash
node -e "const bcrypt = require('/opt/trademark/app/node_modules/bcryptjs'); const hash = bcrypt.hashSync('你的新密码', 10); console.log(hash);"
```

然后更新数据库：

```bash
mysql -u trademark -p trademark -e "UPDATE admin_users SET password_hash='上面生成的hash' WHERE username='admin';"
```

---

## 七、日常维护

### 更新代码

```bash
cd /opt/trademark/app
git pull
npm install
npm run build
pm2 restart trademark
```

### 数据库备份

```bash
# 手动备份
mkdir -p /opt/backup
mysqldump -u trademark -p trademark > /opt/backup/trademark_$(date +%Y%m%d).sql

# 恢复
mysql -u trademark -p trademark < /opt/backup/trademark_20260315.sql
```

定时自动备份（每天凌晨 3 点）：

```bash
crontab -e
```

添加一行：

```
0 3 * * * mysqldump -u trademark -p'你的密码' trademark > /opt/backup/trademark_$(date +\%Y\%m\%d).sql
```

### 常用命令速查

```bash
# ─── 应用 ───
pm2 status                    # 查看状态
pm2 logs trademark            # 查看日志
pm2 restart trademark         # 重启

# ─── 数据库 ───
mysql -u trademark -p trademark  # 进入数据库命令行
mysqldump -u trademark -p trademark > backup.sql  # 备份

# ─── Caddy ───
systemctl status caddy        # 状态
systemctl reload caddy        # 重载配置

# ─── 系统 ───
df -h                         # 磁盘
free -h                       # 内存
```

---

## 八、页面入口汇总

每个地址在 **两个域名** 下都可以访问，看到的数据由域名决定：

| 地址              | 说明                              |
| ----------------- | --------------------------------- |
| `/`               | 首页（跳转到精品商标）            |
| `/premium`        | 精品商标                          |
| `/discount`       | 特惠商标                          |
| `/international`  | 国际商标                          |
| `/search`         | 商标搜索                          |
| `/favorites`      | 我的收藏                          |
| `/backstage/login`    | 管理后台登录（用户名/密码）       |
| `/backstage`          | 商标管理                          |
| `/backstage/import`   | Excel 导入                        |
| `/backstage/settings` | 系统设置（特惠商标开关、价格阈值）|

---

## 九、多租户故障排查

### 9.1 访问 app 子域看到的是 vip 数据

**症状**：`app.biaoxiaosheng.com` 显示了 vip 的商标。

**排查顺序**：

1. **DNS 是否正确解析到本机？**
   ```bash
   dig +short app.biaoxiaosheng.com
   ```
   应返回服务器公网 IP。如果不对，回到 4.1 检查 DNS 配置。

2. **Caddy 是否把 Host 头透传给 Next.js？**（Caddy 默认会，无需特殊配置）
   ```bash
   curl -s -o /dev/null -w "%{http_code}\n" -H "Host: app.biaoxiaosheng.com" http://127.0.0.1:3000/
   ```

3. **服务端 tenantFromHost 逻辑是否生效？**
   ```bash
   curl -s "https://app.biaoxiaosheng.com/api/trademarks?page=1&pageSize=2"
   ```
   应返回 app 租户的数据。如果返回 vip 数据，检查 `app/src/lib/tenant.ts` 是否被构建包含。

4. **是不是浏览器缓存？** 强制刷新（Cmd+Shift+R / Ctrl+Shift+F5）。

### 9.2 后台徽章颜色不对

后台右上角徽章颜色由 `window.location.hostname` 决定，**前端运行时计算**。如果颜色不对，多半是浏览器访问的 hostname 不是 `app.` 开头但你期望显示"普通客户"。

```js
// 在浏览器 DevTools Console 里执行：
window.location.hostname
```

只要 hostname 以 `app.` 开头，徽章就显示"普通客户"。

### 9.3 导入到错的租户

如果发现误把 vip 数据导入到 app（或反之）：

1. **不要直接删除全部**。先查清楚哪些是误导入的：
   ```sql
   SELECT id, name, created_at FROM trademarks
     WHERE tenant = 'app' AND created_at > '2026-04-08 14:00:00'
     ORDER BY created_at DESC;
   ```
2. 确认范围后，可以**直接 UPDATE 改 tenant** 而不是删除重导：
   ```sql
   UPDATE trademarks
     SET tenant = 'vip'
     WHERE tenant = 'app' AND created_at > '2026-04-08 14:00:00';
   ```

### 9.4 Caddy 证书申请失败

通常是 DNS 还没生效或 80/443 端口未开放。

```bash
journalctl -u caddy -n 200 --no-pager | tail -50
```

常见错误：
- `dns: NXDOMAIN` → DNS 未生效，等 1-10 分钟或检查记录
- `connection refused` → 80 端口被防火墙拦截
- `rate limited by ACME server` → Let's Encrypt 限速，等几小时再试或先用 HTTP 测试

---

## 十、未来扩展：增加第三个租户

现在的 tenant 字段是 `VARCHAR(32)`，理论上可以承载任意数量的租户。增加第三个（比如 `enterprise.biaoxiaosheng.com`）只需：

1. **代码层**：修改 [app/src/lib/tenant.ts](app/src/lib/tenant.ts) 的 `tenantFromHost`：
   ```ts
   if (clean.startsWith('enterprise.')) return 'enterprise';
   ```
   同时把 `Tenant` 类型加上 `'enterprise'`，以及 [app/src/components/backstage/TenantBadge.tsx](app/src/components/backstage/TenantBadge.tsx) 的 `DESCRIBE` 表加一项。

2. **数据库**：为新租户初始化默认设置：
   ```sql
   INSERT INTO settings (tenant, `key`, `value`)
     SELECT 'enterprise', `key`, `value` FROM settings WHERE tenant = 'vip';
   ```

3. **DNS / Caddy**：加一条 A 记录 + Caddyfile 加一个域名。

4. **重启 Next.js**：`pm2 restart trademark`。

零数据迁移、零停机。
