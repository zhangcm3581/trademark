# 标小生 - 服务器自部署文档

## 架构概览

```
浏览器 → Caddy (自动HTTPS)
           ├── your-domain.com      → Next.js :3000 (PM2)
           └── api.your-domain.com  → Supabase :8000 (Docker)
                                         └── PostgreSQL :5432 (Docker 内部)
```

所有服务部署在同一台服务器上，数据库通过 Docker 运行在本机。

### 版本要求


| 组件                   | 要求版本                     | 说明                                     |
| -------------------- | ------------------------ | -------------------------------------- |
| Node.js              | >= 18.18.0（推荐 20.x）      | Next.js 16 要求最低 18.18                  |
| npm                  | >= 9                     | 随 Node.js 附带                           |
| Docker               | >= 20.10                 | 需支持 Compose V2                         |
| Docker Compose       | >= 2.0                   | 即 `docker compose`（非 `docker-compose`） |
| Supabase Self-hosted | 最新版（跟随 Git 仓库）           | `git clone` 即为最新                       |
| Caddy                | >= 2.0（推荐 2.7+）          | 自动 HTTPS 需 2.x                         |
| PostgreSQL           | 15.x（Supabase Docker 内置） | 无需单独安装                                 |


### 服务器最低配置

- CPU: 2 核
- 内存: 4 GB（Supabase 自托管较吃内存）
- 硬盘: 40 GB
- 系统: Ubuntu 22.04 / 24.04

---

## 一、安装基础环境

> 以 Ubuntu 为例。以 root 用户执行（或在命令前加 sudo）。

### 1.1 系统更新 & 基础工具

```bash
apt update && apt upgrade -y
apt install -y curl wget git nano unzip
```

### 1.2 安装 Docker & Docker Compose

```bash
# 一键安装 Docker
curl -fsSL https://get.docker.com | sh

# 开机自启
systemctl enable docker --now

# 安装 Docker Compose 插件
apt install -y docker-compose-plugin

# 验证（Docker >= 20.10，Compose >= 2.0）
docker --version          # Docker version 27.x.x
docker compose version    # Docker Compose version v2.x.x
```

### 1.3 安装 Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# 验证（Node >= 18.18，npm >= 9）
node -v   # v20.x.x
npm -v    # 10.x.x
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

---

## 二、部署 Supabase（Docker 本地数据库）

Supabase 自托管包含 PostgreSQL + Auth + REST API 全套服务，通过 Docker Compose 一键启动，数据库运行在服务器本机。

### 2.1 拉取 Supabase Docker 配置

```bash
cd /opt
git clone --depth 1 https://github.com/supabase/supabase
cd /opt/supabase/docker
cp .env.example .env
```

### 2.2 生成密钥

```bash
# 生成 JWT 密钥（记录下来，后面要用）
openssl rand -base64 32
```

### 2.3 修改配置文件

```bash
nano /opt/supabase/docker/.env
```

找到以下项并修改：

```env
############
# 必须修改 #
############

# 数据库密码
POSTGRES_PASSWORD=这里改成你的强密码

# JWT 密钥（粘贴上面生成的）
JWT_SECRET=这里粘贴上面生成的密钥

# Dashboard 登录密码
DASHBOARD_PASSWORD=这里改成你的Dashboard密码

# 站点地址（改成你的域名）
SITE_URL=https://你的域名.com
API_EXTERNAL_URL=https://api.你的域名.com
```

> **关于 ANON_KEY**：如果你修改了 JWT_SECRET，需要重新生成 ANON_KEY 和 SERVICE_ROLE_KEY。
> 生成方法见：[https://supabase.com/docs/guides/self-hosting/docker#generate-api-keys](https://supabase.com/docs/guides/self-hosting/docker#generate-api-keys)
>
> 如果保持默认的 JWT_SECRET 不改（仅测试用），则 ANON_KEY 也保持默认即可。

### 2.4 启动 Supabase

```bash
cd /opt/supabase/docker
docker compose up -d
```

等待约 1-2 分钟，验证所有容器运行正常：

```bash
docker compose ps
```

应看到所有服务状态为 `running`。

本机端口说明（无需对外暴露）：


| 服务                         | 端口   | 说明                 |
| -------------------------- | ---- | ------------------ |
| Supabase Studio + Kong API | 8000 | 管理面板 + REST API 入口 |
| PostgreSQL                 | 5432 | 数据库（Docker 内部通信）   |


### 2.5 初始化数据库

先把项目代码拉到服务器（见第三步），然后执行 SQL：

```bash
cd /opt/supabase/docker
docker compose exec -T db psql -U postgres -d postgres < /opt/trademark/app/supabase/init.sql
```

或者打开 Supabase Studio（`http://服务器IP:8000`）→ SQL Editor → 粘贴 `init.sql` 全部内容执行。

### 2.6 创建管理员账号

打开 Supabase Studio `http://服务器IP:8000`：

1. 用步骤 2.3 中设置的 `DASHBOARD_PASSWORD` 登录
2. 进入 Authentication → Users → Add user
3. 输入管理员邮箱和密码（这是应用 `/admin` 后台的登录账号）

---

## 三、拉取并部署应用代码

### 3.1 安装 Git（如果没有）

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
cd /opt/trademark/app
```

### 3.3 配置环境变量

```bash
nano /opt/trademark/app/.env.local
```

写入：

```env
NEXT_PUBLIC_SUPABASE_URL=https://api.你的域名.com
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的ANON_KEY
```

> **重要**：这里必须填外部可访问的 `https://api.你的域名.com`，不能填 `127.0.0.1`。
> 因为管理员登录页面从浏览器端直连 Supabase Auth，浏览器无法访问服务器的 127.0.0.1。
>
> `ANON_KEY` 的值从 `/opt/supabase/docker/.env` 中复制。

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

在你的域名服务商处添加两条 A 记录，都指向服务器公网 IP：


| 记录类型 | 主机记录 | 记录值     |
| ---- | ---- | ------- |
| A    | @    | 服务器公网IP |
| A    | api  | 服务器公网IP |


### 4.2 配置 Caddyfile

```bash
nano /etc/caddy/Caddyfile
```

写入：

```caddyfile
# 主站 - Next.js 应用
你的域名.com {
    reverse_proxy 127.0.0.1:3000
}

# Supabase API - 管理员登录需要浏览器直连
api.你的域名.com {
    reverse_proxy 127.0.0.1:8000
}
```

### 4.3 启动 Caddy

```bash
# 验证配置
caddy validate --config /etc/caddy/Caddyfile

# 重载生效
systemctl reload caddy

# 查看状态
systemctl status caddy
```

Caddy 会自动向 Let's Encrypt 申请 HTTPS 证书并自动续期，无需手动配置。

### 4.4 防火墙

```bash
ufw allow 80
ufw allow 443
ufw reload
```

> **不要**对外暴露 8000 和 5432 端口，通过 Caddy 反代访问即可。

---

## 五、验证部署

按顺序访问：


| 步骤  | 地址                                | 预期结果      |
| --- | --------------------------------- | --------- |
| 1   | `https://你的域名.com`                | 精品商标首页    |
| 2   | `https://你的域名.com/admin/login`    | 管理员登录页    |
| 3   | 用步骤 2.6 的账号登录                     | 进入管理后台    |
| 4   | `https://你的域名.com/admin/settings` | 系统设置页     |
| 5   | `https://你的域名.com/admin/import`   | Excel 导入页 |


---

## 六、日常维护

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
cd /opt/supabase/docker
docker compose exec -T db pg_dump -U postgres -d postgres > /opt/backup/trademark_$(date +%Y%m%d).sql

# 恢复
docker compose exec -T db psql -U postgres -d postgres < /opt/backup/trademark_20260313.sql
```

定时自动备份（每天凌晨 3 点）：

```bash
crontab -e
```

添加一行：

```
0 3 * * * cd /opt/supabase/docker && docker compose exec -T db pg_dump -U postgres -d postgres > /opt/backup/trademark_$(date +\%Y\%m\%d).sql
```

### 常用命令速查

```bash
# ─── 应用 ───
pm2 status                    # 查看状态
pm2 logs trademark            # 查看日志
pm2 restart trademark         # 重启

# ─── 数据库 ───
cd /opt/supabase/docker
docker compose ps             # 查看服务状态
docker compose logs -f db     # 查看数据库日志
docker compose restart        # 重启 Supabase 全部服务
docker compose exec db psql -U postgres -d postgres  # 进入数据库命令行

# ─── Caddy ───
systemctl status caddy        # 状态
systemctl reload caddy        # 重载配置

# ─── 系统 ───
df -h                         # 磁盘
free -h                       # 内存
docker system prune -f        # 清理无用镜像
```

---

## 七、页面入口汇总


| 地址                | 说明                |
| ----------------- | ----------------- |
| `/`               | 首页（跳转到精品商标）       |
| `/premium`        | 精品商标              |
| `/discount`       | 特惠商标              |
| `/international`  | 国际商标              |
| `/search`         | 商标搜索              |
| `/favorites`      | 我的收藏              |
| `/admin/login`    | 管理后台登录            |
| `/admin`          | 商标管理              |
| `/admin/import`   | Excel 导入          |
| `/admin/settings` | 系统设置（特惠商标开关、价格阈值） |


