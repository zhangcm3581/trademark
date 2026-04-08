#!/bin/bash
# 本地多租户烟雾测试
# 用法：bash test-tenant.sh
#
# 前提：
#   1. 数据库已跑过 migrations/001_add_tenant.sql
#   2. dev server 在 localhost:3000 上运行

set -e

VIP_HOST="biaoxiaosheng.lvh.me"
APP_HOST="app.biaoxiaosheng.lvh.me"
BASE="http://localhost:3000"

pass() { echo "  ✅ $1"; }
fail() { echo "  ❌ $1"; exit 1; }
info() { echo "  ℹ️  $1"; }

# ---------- 1. 基础健康 ----------
echo "[1] 基础健康检查"
curl -s -o /dev/null -w "%{http_code}" "$BASE/" | grep -q "200\|307" \
  && pass "dev server 响应正常" || fail "dev server 未响应"

# ---------- 2. 公开 API 租户隔离 ----------
echo "[2] 公开 API 租户隔离"

VIP_TOTAL=$(curl -s -H "Host: $VIP_HOST" "$BASE/api/trademarks?page=1&pageSize=1" | grep -oE '"total":[0-9]+' | cut -d: -f2)
APP_TOTAL=$(curl -s -H "Host: $APP_HOST" "$BASE/api/trademarks?page=1&pageSize=1" | grep -oE '"total":[0-9]+' | cut -d: -f2)

info "vip 商标总数: $VIP_TOTAL"
info "app 商标总数: $APP_TOTAL"

[ -n "$VIP_TOTAL" ] && [ "$VIP_TOTAL" -gt 0 ] && pass "vip 有数据" || fail "vip 没有数据"
[ "$APP_TOTAL" != "$VIP_TOTAL" ] && pass "vip 和 app 行数不同，隔离生效" || fail "vip 和 app 行数相同，疑似未隔离"

# ---------- 3. settings 按租户读取 ----------
echo "[3] settings 按租户读取"
VIP_SET=$(curl -s -H "Host: $VIP_HOST" "$BASE/api/settings")
APP_SET=$(curl -s -H "Host: $APP_HOST" "$BASE/api/settings")
info "vip settings: $VIP_SET"
info "app settings: $APP_SET"
echo "$VIP_SET" | grep -q '"discount_price_threshold"' && pass "vip settings 字段齐全" || fail "vip settings 缺字段"
echo "$APP_SET" | grep -q '"discount_price_threshold"' && pass "app settings 字段齐全" || fail "app settings 缺字段"

# ---------- 4. 跨租户访问 id 应 404 ----------
echo "[4] 跨租户访问 id 应 404"
VIP_ID=$(curl -s -H "Host: $VIP_HOST" "$BASE/api/trademarks?page=1&pageSize=1" | grep -oE '"id":"[^"]+"' | head -1 | cut -d'"' -f4)
info "vip 第一个 id: $VIP_ID"

VIP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "Host: $VIP_HOST" "$BASE/api/trademarks/$VIP_ID")
APP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "Host: $APP_HOST" "$BASE/api/trademarks/$VIP_ID")
VIP_IMG=$(curl -s -o /dev/null -w "%{http_code}" -H "Host: $VIP_HOST" "$BASE/api/trademarks/$VIP_ID/image")
APP_IMG=$(curl -s -o /dev/null -w "%{http_code}" -H "Host: $APP_HOST" "$BASE/api/trademarks/$VIP_ID/image")

info "vip 访问自己的 detail: HTTP $VIP_STATUS"
info "app 访问 vip 的 detail: HTTP $APP_STATUS"
info "vip 访问自己的 image:  HTTP $VIP_IMG"
info "app 访问 vip 的 image:  HTTP $APP_IMG"

[ "$VIP_STATUS" = "200" ] && pass "vip 自己 detail 200" || fail "vip detail 应 200"
[ "$APP_STATUS" = "404" ] && pass "app 访问 vip id detail 404" || fail "跨租户 detail 应 404，实际 $APP_STATUS"
[ "$VIP_IMG"    = "200" ] && pass "vip 自己 image 200" || fail "vip image 应 200"
[ "$APP_IMG"    = "404" ] && pass "app 访问 vip id image 404" || fail "跨租户 image 应 404，实际 $APP_IMG"

# ---------- 5. categories 隔离 ----------
echo "[5] 分类统计隔离"
VIP_CATS=$(curl -s -H "Host: $VIP_HOST" "$BASE/api/trademarks/categories?type=premium")
APP_CATS=$(curl -s -H "Host: $APP_HOST" "$BASE/api/trademarks/categories?type=premium")
info "vip premium categories: $(echo $VIP_CATS | head -c 100)"
info "app premium categories: $APP_CATS"
[ "$APP_CATS" = "[]" ] && pass "app premium 分类为空" || info "app 有分类数据（如果之前导过 app 测试数据就是正常）"

# ---------- 6. BottomNav 受 settings 影响 ----------
echo "[6] 页面渲染受 settings 影响（间接验证 Phase 4）"
VIP_HOME=$(curl -s -H "Host: $VIP_HOST" "$BASE/list?type=premium&category=25")
APP_HOME=$(curl -s -H "Host: $APP_HOST" "$BASE/list?type=premium&category=25")
echo "$VIP_HOME" | grep -q "精品商标" && pass "vip 页面渲染 OK" || fail "vip 页面未渲染"
echo "$APP_HOME" | grep -q "精品商标" && pass "app 页面渲染 OK" || fail "app 页面未渲染"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 全部自动化测试通过"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "接下来手动测试：打开浏览器访问"
echo "   http://biaoxiaosheng.lvh.me:3000/backstage/login"
echo "   http://app.biaoxiaosheng.lvh.me:3000/backstage/login"
echo "验证后台徽章颜色、导入流程和 settings 隔离。"
