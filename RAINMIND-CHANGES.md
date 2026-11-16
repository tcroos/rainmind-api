# RainMind API 前端改造记录

- 基线：QuantumNous/new-api `main` @ `b388140`（2026-11-13）
- 改造周期：2026-11-15 ~ 2026-11-16
- 版本号：`VERSION = 1.0.0-clmm-20261116c`
- 仓库：`https://github.com/tcroos/rainmind-api.git`（`origin`；官方源保留为 `upstream`）
- 范围：**仅展示层前端 + 少量品牌/限流常量**。后端业务逻辑、渠道适配、计费、数据库结构均未改动。

## 一、改动清单

### 1. 首页 / 落地页

| 文件 | 内容 |
| --- | --- |
| `web/src/features/home/landing-html.ts` | 落地页 HTML 与注入资源（约 116 KB），已剥离落地页自带玻璃导航、Next announcer/移动菜单，以及劫持 SPA 登录按钮的幽灵 `click → /sign-in` 监听器 |
| `web/src/features/home/landing-home.tsx` | 落地页挂载与卸载清理；`LANDING_HEADER_PIN_CSS` 在 `html.rm-home-active` 作用域内钉住顶栏文字/表面变量，保证深浅主题下顶栏与深色画布一致 |
| `web/src/features/home/wordmark-splash.tsx` | 开场「RainMind API」描字动画：首帧出现、白色 20% 细线描字 → 紫粉渐变发光（`oklch(60.6% .25 292.72)` / `oklch(66.7% .29 322.15)`）→ 淡出；用多层描边叠加，不用 SVG filter |
| `web/src/features/home/index.tsx` | 首页首帧渲染 splash，发光结束即揭示页面（不等 WebGL 黑洞），两阶段 `onReveal` / `onDone` 衔接 |
| `web/public/_next/` | 落地页编译产物：3 个 CSS + 字体等共 109 个文件，约 4.8 MB |
| `web/public/black-hole-runtime.js`、`napi-sec-*.png`、`logo.svg`、`icon.png`、`apple-icon.png` | 落地页运行时与图片资源 |

顶部导航**保持 new-api 原皮 `PublicHeader`**（logo 左、入口靠右、语言/主题/铃铛/登录），由 `useTopNavLinks()` 驱动，落地页自带的导航不覆盖它。

### 2. 顶栏 / 官网入口

- `web/src/lib/constants.ts`：新增 `MAIN_SITE_URL = 'https://rainmind.net/'`，`DEFAULT_SYSTEM_NAME` → `RainMind`，`DEFAULT_LOGO` → `/logo.svg`。
- `web/src/hooks/use-top-nav-links.ts`：「主页」后插入外链「官网」；配置主站地址时不再生成「关于」（`/about` 仍可直接访问；把 `MAIN_SITE_URL` 置空即可恢复）。
- 7 个 locale 补 `Official Site` 文案。
- `web/src/components/layout/components/public-header.tsx`：加 `data-public-header` / `data-public-header-overlay` 锚点，供首页作用域样式承接。
- `landing-home.tsx` 把顶栏与移动遮罩内的 `--muted-foreground` 钉为 `--base-200`，消除「当前页亮、其它项灰」的明暗混杂；Portal 下拉菜单保持原有次级文字层级，`--primary`（登录按钮配色）不动。

### 3. 品牌与主题

- `common/constants.go`：`SystemName = "RainMind"`；关键限流由 20 次 / 20 分钟调整为 10 次 / 5 分钟。
- `web/src/styles/theme.css`：浅/深两套 primary、ring、chart、sidebar 色值由蓝系改为紫系。
- `web/src/assets/logo.tsx`：改为 RainMind 渐变星形 logo（青 → 紫 → 粉）。
- `footer.tsx` / `system-brand.tsx` / `system-settings/site/index.tsx`：默认名称改 `RainMind`。
- **颜色预设锁定**：`web/src/lib/theme-customization.ts` 新增 `LOCKED_THEME_PRESET = 'anthropic'`；provider 不再读 localStorage、`setPreset` 为空操作、`body` 恒为 `data-theme-preset="anthropic"`；`config-drawer.tsx` 移除 `PresetConfig` 与色卡；`theme-preferences.test.tsx` 改为验证锁定行为。

### 4. 模型广场

- `web/src/routes/pricing/index.tsx` 接入 `web/src/features/pricing/plaza.tsx`（官方模型广场）；`web/public/plaza/` 为展示数据与静态资源（仅展示，不改定价/计费配置）。
- `scripts/sync-plaza-official.cjs`：从 jsDelivr 拉取上游每日 `official.json` 快照的同步脚本（可挂 cron）。
- `router/api-router.go`：移除 `/user/auth/refresh`、`/user/auth/logout` 上的 `CriticalRateLimit()`，避免登录/刷新被限流拦截。
- `web/src/lib/server-error-message.ts` 补「操作过于频繁」提示。

### 5. 登录页

- `web/src/features/auth/eye-characters.tsx`：Eyes-Follow-Mouse 小人，源码配色/间距，转身 700ms、瞳孔 100ms、眨眼 150ms；`MutationObserver` 同步 password input 的 type 变化。
- `web/src/features/auth/auth-layout.tsx`：星空面板（深色深空 / 浅色淡蓝），跟随主题切换；移除品牌宣传文案区。
- `web/src/components/password-input.tsx`：显示/隐藏按钮改为外层 flex 居中，避开 `-translate-y-1/2` 与 Button `:active` transform 争用同一 CSS 变量导致的点击丢失；增加 `data-password-input`、`aria-pressed`。
- `use-auth-redirect.ts` / `user-auth-form.tsx`：登录跳转与主题切换时序调整。

### 6. 工程配置

- `.gitignore`：新增 `*.bak-*`，排除改造过程中的改前快照（本次不入库）。
- `web/bunfig.toml`：bun registry 指向 `registry.npmmirror.com`。
- `VERSION`：`1.0.0-clmm-20261116c`。**注意该文件带 UTF-8 BOM**，脚本读取时建议 `tr -d '\357\273\277'`。

## 二、构建与部署（重要）

`main.go` 使用 `//go:embed web/dist`，前端会被编进**单一 Go 二进制**：

```
main.go  ── go:embed web/dist ──>  new-api 二进制
                 ▲
Dockerfile builder: bun install --frozen-lockfile && bun run build
Dockerfile builder2: COPY --from=builder /build/web/dist ./web/dist && go build
```

- **不要直接 `go build` 或拷贝本地 `web/dist`**：该目录在 `.gitignore` 与 `.dockerignore` 中都被排除，本地只有一个 16 字节的 `dev placeholder`（仅为让本地 `go run` 通过 embed）。用它会得到空白页。
- 必须走完整三阶段 `docker build`，确认 bun 阶段真的生成了 `web/dist/index.html` 与 assets。
- 仓库自带的 `docker-compose.yml` 指向官方 `calciumion/new-api:latest`，**不是**本项目镜像，误用会跑出纯原版。
- 部署 compose 里若写死 `image: rainmind/newapi:<tag>`，每次发版请**换一个新 tag** 并强制重建容器；同名 tag 容易继续跑旧镜像。用 `docker images` 的 CREATED 时间核对。
- 部署后自检：版本号 `20261116c`、开场紫粉渐字、顶栏文字亮度一致、登录页小人、模型广场、官网外链。

## 三、本地开发

```bash
# 终端 1：API（web/dist 需有占位文件）
GOPROXY=https://goproxy.cn,direct SQLITE_PATH=./one-api.db go run main.go   # :3000
# 终端 2：前端热更新
cd web && bun run dev -- --port 5173                                        # :5173
```

`5173` 是 dev server 实时编译结果，**不等于**生产镜像内容；排查线上问题请以镜像内嵌产物为准。

## 四、已验证

- `bun run typecheck`：1499 文件 0 错误。
- 全量测试 233/235 文件、2846/2873 用例通过；2 个失败为环境相关（Windows 临时目录 `EPERM`、并发负载下 `visual-billing-editor` 超时，单跑通过）。
- 深浅两套主题下顶栏文字计算色统一为 `oklch(0.92 0.0053 286.32)`，Portal 下拉与离开首页后主题不受影响，无 pageerror。
- 本地 `:3000/api/status` 与 `:5173` 均返回 200。

## 五、已知约束

1. 落地页注入的 Next 编译 CSS 含全局 `:root` / `.dark` 变量，会污染宿主其它组件；因此首页用 `rm-home-active` 作用域钉色，**不要**把这套 CSS 提到全局，也不要在 `LandingHome` 里抢 `html.dark` 类。
2. 新增静态资源（`web/public/_next`、`web/public/plaza`、`landing-html.ts` 等）现已纳入版本控制；用 `git clone` / `git archive` 打包才不会漏。历史上用 `git add -u` 或文件级筛选打包会丢这些文件，导致首页编译失败。
3. 控制台内页仍是 new-api 原皮，未做落地页风格迁移；`docs_link` 仍指向 `docs.newapi.pro`，待替换。
4. 本次为源码提交，**未构建/推送生产镜像**，也未改动任何线上服务器。
