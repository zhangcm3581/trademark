# 标小生 - 服务器自部署文档

## 架构概览

```
浏览器 → Caddy (自动HTTPS)
           └── your-domain.com → Next.js :3000 (PM2)
                                     └── MySQL :3306 (本机)
```

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

在你的域名服务商处添加一条 A 记录，指向服务器公网 IP：

| 记录类型 | 主机记录 | 记录值       |
| -------- | -------- | ------------ |
| A        | @        | 服务器公网IP |

### 4.2 配置 Caddyfile

```bash
nano /etc/caddy/Caddyfile
```

写入：

```caddyfile
你的域名.com {
    reverse_proxy 127.0.0.1:3000
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

Caddy 会自动向 Let's Encrypt 申请 HTTPS 证书并自动续期。

### 4.4 防火墙

```bash
ufw allow 80
ufw allow 443
ufw reload
```

> **不要**对外暴露 3306 端口，MySQL 仅本机访问。

---

## 五、验证部署

按顺序访问：

| 步骤 | 地址                                | 预期结果       |
| ---- | ----------------------------------- | -------------- |
| 1    | `https://你的域名.com`              | 精品商标首页   |
| 2    | `https://你的域名.com/backstage/login`  | 管理员登录页   |
| 3    | 用 admin / admin123 登录            | 进入管理后台   |
| 4    | `https://你的域名.com/backstage/settings` | 系统设置页   |
| 5    | `https://你的域名.com/backstage/import` | Excel 导入页   |

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
