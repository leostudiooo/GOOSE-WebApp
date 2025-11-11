<div align="center">

<img alt="GOOSE Logo" src="https://github.com/leostudiooo/GOOSE/raw/main/img/GOOSE.webp" width=50% />

# GOOSE WebApp 🪿

基于 [GOOSE](https://github.com/leostudiooo/GOOSE) 项目的现代化 Web 应用

![GPL v3](https://img.shields.io/badge/license-GPLv3-blue.svg)
![Vue 3](https://img.shields.io/badge/vue-3.0%2B-green.svg)
![TypeScript](https://img.shields.io/badge/typescript-5.0%2B-blue.svg)

</div>

## 🪿 关于

<img alt="GOOSE WebApp 运行截图" width=682 src="https://github.com/user-attachments/assets/e10bb5e4-f241-4017-9f9e-2011fbd470ee"/>

GOOSE WebApp 是 [GOOSE](https://github.com/leostudiooo/GOOSE) 项目的 Web 版本，为 SEU 本科生提供了一个现代化、直观的浏览器界面来记录和跟踪锻炼进度。通过 Terminal UI (TUI) 风格的设计，它提供了与原 Python TUI 版本相似的体验，同时具备现代 Web 应用的便利性。

WebApp 版本同时也集成了 [PRTS](https://github.com/leostudiooo/PRTS) 轨迹编辑工具，支持一站式绘制和上传自定义运动轨迹。

## 🚀 快速开始

已经在 https://goose-webapp.pages.dev 上线，可直接访问使用。

### 运行环境

- Node.js 16+ 
- 现代浏览器（Chrome 90+, Firefox 88+, Safari 14+）

### 安装和运行

1. **克隆项目**
   ```sh
   git clone https://github.com/leostudiooo/GOOSE-WebApp.git
   cd GOOSE-WebApp
   ```

2. **安装依赖**
   ```sh
   pnpm install
   ```
   
   也可以使用 npm 或 yarn：
   ```sh
   npm install
   # 或
   yarn install
   ```

3. **开发模式运行**
   ```sh
   pnpm dev
   ```

4. **生产环境构建**
   ```sh
   pnpm build
   ```

### 开发命令

```sh
# 安装依赖
pnpm install

# 开发服务器（支持热重载）
pnpm dev

# 生产构建（包含类型检查）
pnpm build

# 仅类型检查
pnpm type-check

# 代码检查和修复
pnpm lint

# 代码格式化
pnpm format
```

### 项目结构

```
src/
├── components/          # Vue 组件
│   ├── UserConfigForm.vue     # 用户配置表单
│   ├── TrackSelector.vue      # 轨迹选择器
│   ├── PRTSTracker.vue        # 轨迹绘制工具
│   └── ImageUploader.vue      # 图片上传组件
├── stores/             # Pinia 状态管理
│   ├── user.ts         # 用户配置和轨迹数据
│   ├── config.ts       # API 配置
│   └── route.ts        # 运动场馆信息
├── services/           # 业务服务
│   ├── api.ts          # API 客户端
│   ├── uploadService.ts        # 上传服务
│   └── verificationService.ts  # 验证服务
├── utils/              # 工具函数
└── views/              # 页面组件
    └── HomeView.vue    # 主页面
```

## 📋 使用指南

### 基本使用流程

1. **配置用户信息**
   - 填写 Token（需要在小程序或网页中获取）
     - 建议填写后**立刻进行一次验证**
   - 设置锻炼时间
   - 选择运动场地
   - 上传开始和结束图片

2. **选择轨迹类型**
   - **默认轨迹** - 使用预设的场馆轨迹
   - **自定义轨迹** - 上传 JSON 文件或使用绘图工具创建

3. **绘制自定义轨迹**（可选）
   - 点击"打开绘图工具"进入 PRTS 轨迹编辑器
   - 在地图上绘制运动轨迹
   - 系统自动计算距离和时间
   - 完成后轨迹自动保存到本地

4. **验证和上传**
   - 点击"验证配置"确认信息正确
   - 点击"上传记录"提交运动数据

### 轨迹管理

- **本地存储** - 绘制的轨迹自动保存到浏览器本地存储
- **文件导入** - 支持拖拽或点击上传 JSON 格式的轨迹文件
- **轨迹编辑** - 可重新打开绘图工具编辑现有轨迹
- **数据清除** - 可清除本地保存的轨迹数据

### 配置说明

应用配置通过以下方式管理：

- **用户配置** - 存储在浏览器 localStorage (`goose_user_config`)
- **轨迹数据** - 存储在浏览器 localStorage (`goose_prts_path_points`)
- **API 配置** - 从 `/public/config/headers.json` 加载
- **场馆信息** - 从 `/public/config/routes.json` 加载

## 🛠️ 开发指南

### 代码规范

项目使用以下工具确保代码质量：

- **ESLint** - 代码质量检查
- **Prettier** - 代码格式化
- **TypeScript** - 类型检查
- **Vue Tsc** - Vue 组件类型检查

### 提交前检查

```sh
# 运行完整检查
pnpm type-check  # 类型检查
pnpm lint        # 代码规范检查
pnpm format      # 代码格式化
pnpm build       # 构建检查
```

## 🔗 相关项目

- **[GOOSE](https://github.com/leostudiooo/GOOSE)** - Python TUI 和 CLI 版本，若有批量操作需求可优先考虑该版本
- **[PRTS](https://github.com/leostudiooo/PRTS)** - 轨迹编辑工具
- **[ML-SEU-Exercise-Helper](https://github.com/midairlogn/ml-seu-exercise-helper)** - 首个使用 Web 实现类似功能的项目

## 📜 开源协议

本项目遵循 [GPLv3 许可证](LICENSE)，与原 GOOSE 项目保持一致。

**重要声明**：
- 软件按"原样"提供，不附带任何担保
- 用户应对其上传的数据承担全部责任
- 本项目基于学习和研究目的开发
- 我们反对使用本项目获取商业利益

## 🤝 贡献

欢迎通过以下方式参与项目：

- 提交 [Issue](https://github.com/leostudiooo/GOOSE-WebApp/issues) 报告问题或建议
- 创建 [Pull Request](https://github.com/leostudiooo/GOOSE-WebApp/pulls) 贡献代码
- 改进文档和用户体验

## 致谢

[@midairlogn](https://github.com/midairlogn) 的 [midairlogn/ml-seu-exercise-helper](https://github.com/leostudiooo/ml-seu-exercise-helper)（原项目已经被删除或 Private，此处指向 Fork）是首个使用 Web 实现类似功能的项目，它提供了宝贵的参考和灵感。GOOSE WebApp 部分参考了该项目的实现，在此按照 GPLv3 对其进行署名致谢。

---

<div align="center">

基于 [GOOSE](https://github.com/leostudiooo/GOOSE)、[PRTS](https://github.com/leostudiooo/PRTS) 和 [ML-SEU-Exercise-Helper](https://github.com/midairlogn/ml-seu-exercise-helper) 开发 | GPL-3.0 License

</div>
