# Token 自动抓取功能开发交接文档

## 项目背景

GOOSE WebApp 是一个 Vue 3 运动打卡系统，当前用户需要手动从 CAS 系统获取 token：

1. 打开 https://tyxsjpt.seu.edu.cn/h5/#/pages/home/index
2. 登录账号（跳转到 CAS 认证）
3. F12 打开控制台
4. 找到 request.headers.token 并复制

目标：实现 Token 自动抓取功能。

## 技术方案

采用 **Tauri 桌面应用** 方案，因为：

- Web 端受限于浏览器同源策略，无法监听跨域窗口
- Tauri 可以创建多个 WebView 窗口
- 可以通过 JavaScript 注入拦截网络请求
- 可以通过 IPC 机制在窗口间通信

### 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                      Tauri 自动 Token 抓取方案                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐     IPC      ┌─────────────────┐           │
│  │  主窗口      │◄────────────►│  登录窗口        │           │
│  │  (Vue App)  │              │  (CAS WebView)  │           │
│  └─────────────┘              └─────────────────┘           │
│         │                             │                     │
│         │                     JavaScript注入：               │
│         │                     - 劫持 fetch()                │
│         │                     - 劫持 XMLHttpRequest         │
│         │                     - 监听 tokenH5-cas 回调       │
│         │                             │                     │
│         │◄────────────────────────────┘                     │
│         │     发现 token 后通过 IPC 发送                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 当前进度

### 已完成

1. **安装 Tauri 依赖**

   ```bash
   pnpm add -D @tauri-apps/cli
   pnpm add @tauri-apps/api
   ```

2. **初始化 Tauri 配置**
   - 创建了 `src-tauri/` 目录
   - 配置文件：`src-tauri/tauri.conf.json`

3. **创建前端代码**
   - `src/utils/tauriEnv.ts` - Tauri 环境检测工具（无 Tauri 依赖）
   - `src/services/loginService.ts` - 登录窗口管理服务（懒加载 Tauri API）
   - `src/types/index.ts` - 添加了 LoginResult 接口
   - `src/components/UserConfigForm.vue` - 添加了"自动获取"按钮

4. **UI 集成**
   - Token 输入框右侧添加了"自动获取"按钮
   - 仅在 Tauri 环境下显示
   - 添加了加载状态和错误提示

5. **Rust 后端与注入脚本**
   - 已在 `src-tauri/src/lib.rs` 中实现 `token_captured` 和 `open_login_window` Tauri 命令
   - 实现了登录窗口中的 JavaScript 注入与网络请求拦截（fetch/XHR/navigation 拦截）

### 待完成

1. **测试验证**
   - 运行 `pnpm tauri dev` 测试桌面应用
   - 验证 token 抓取功能在各主要平台上的表现（Windows / macOS / Linux）

2. **后续优化（可选）**
   - 根据实际使用情况优化错误处理与日志上报
   - 根据用户反馈调整交互细节

## 关键文件说明

### src/utils/tauriEnv.ts

Tauri 环境检测工具，无 Tauri 依赖，可安全在 Web 构建中使用：

- `isTauriEnvironment()` - 检测当前是否运行在 Tauri 桌面环境中

### src/services/loginService.ts

登录窗口管理服务，功能：

- `isTauriEnvironment()` - 检测是否在 Tauri 环境
- `openLoginWindow()` - 创建 CAS 登录窗口
- `closeLoginWindow()` - 关闭登录窗口
- 监听 `token-captured` 事件

### src/components/UserConfigForm.vue

用户配置表单，修改：

- 添加了 `isTauri` 状态检测
- 添加了"自动获取"按钮
- 添加了 `autoGetToken` 方法

### src-tauri/tauri.conf.json

Tauri 配置文件，关键配置：

```json
{
  "productName": "GOOSE",
  "build": {
    "frontendDist": "../dist",
    "devUrl": "http://localhost:5173"
  }
}
```

## 下一步工作

### 测试命令

```bash
# 类型检查
pnpm type-check

# 代码检查
pnpm lint

# 桌面应用开发模式
pnpm tauri dev

# 构建桌面应用
pnpm tauri build
```

## CAS 登录流程说明

1. 未登录时访问目标网站会 302 重定向到：

   ```
   https://auth.seu.edu.cn/dist/#/dist/main/login?service=https://tyxsjpt.seu.edu.cn/api/oauth/anno/tokenH5-cas
   ```

2. 用户在 CAS 登录成功后，CAS 重定向回 `service` 指定的地址

3. 回调地址 `tokenH5-cas` 会返回或重定向携带 token

4. Token 格式：`Bearer [part1].[part2].[part3]`（JWT 格式）

## 已知问题

1. CAS 登录页面可能有反注入检测
2. 需要处理登录超时情况
3. 需要处理用户取消登录的情况
4. Token 过期需要重新获取

## 开发环境

- Node.js: ^20.19.0 || >=22.12.0
- 包管理器: pnpm
- 前端框架: Vue 3 + TypeScript + Vite
- 桌面框架: Tauri 2.0

## 联系方式

如有问题，请参考：

- Tauri 文档: https://v2.tauri.app
- 项目 README: README.md
