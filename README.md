# XiangMeta

一个随 AI 项目、科研、摄影与音乐持续成长的个人数字世界。当前版本 **1.0.0 正式版**；版本说明见 [更新记录](docs/releases/1.0.0/README.md)。

准备发布源码或成品时，参见 [GitHub 发布说明](docs/github-publishing.md)。

## 直接运行

打开 [XiangMeta 1.0.0](build/XiangMeta-1.0.0/XiangMeta-1.0.0-x64.exe)。移动到别的位置时，复制整个 `build/XiangMeta-1.0.0/` 文件夹，保留 `local.json` 和 `runtime/`。

成品包含世界、照片、专辑和 MV，旁边的运行目录包含独立 Python 与五个模型。旧版成品及临时打包目录在正式版验收后清理，历版说明保存在文档目录。Windows 字体、显卡驱动与用户收藏仍按系统惯例使用当前 Windows 环境。

## 文件放在哪里

| 目录 | 用途 |
|---|---|
| `src/`、`shared/` | 世界、界面与共用逻辑 |
| `modules/<id>/` | 独立项目清单、场景、模型适配器和展示媒体 |
| `backend/`、`desktop/` | 本地服务与 Windows 桌面程序 |
| `data/` | 当前世界和本地模型路径配置 |
| `public/` | 全局音频编排及通用资源约定 |
| `runtime/` | 开发用独立 Python、五个模型、导入工具 |
| `asset-sources/` | 论文原稿、无损音频存档、素材来源记录 |
| `build/XiangMeta-1.0.0/` | 当前完整成品 |
| `build/staging/` | 打包时生成的临时输出 |
| `docs/releases/` | 每版更新说明、验收记录和已有校验值 |
| `docs/maintenance/` | 清理记录、删除清单、依赖核查 |
| `artifacts/current/` | 当前版本的截图和检查报告 |
| `scripts/`、`tests/` | 维护工具和回归检查 |
| `node_modules/`、`dist/` | 保留的开发依赖与当前网页构建 |

详见 [目录维护规则](docs/file-layout.md)、[版本档案](docs/releases/README.md)、[正式版清理记录](docs/maintenance/release-1.0-cleanup.md)。

## 开发与检查

Node.js 依赖由 `package-lock.json` 固定；当前本机已装好依赖。模型配置 `data/local.json` 使用相对路径。

```powershell
npm.cmd run dev       # 热更新，浏览器 http://127.0.0.1:5173
npm.cmd test
npm.cmd run build
node scripts/audit-local.mjs
npm.cmd run doctor
node scripts/model-smoke.mjs recommendation poetry xianglm
```

生产网页：`npm.cmd start`，地址 `http://127.0.0.1:4318`；桌面地址固定为 `http://127.0.0.1:4319`。首次建立新开发环境时运行 `npm.cmd ci`。

## 构建新的 Windows 成品

```powershell
npm.cmd run dist:win -- --config.electronDist=node_modules/electron/dist --config.compression=store
.\runtime\python\python.exe -B -X utf8 scripts/verify-packed-media.py
.\runtime\python\python.exe -B -X utf8 scripts/stage-portable.py
```

中间产物统一进入 `build/staging/`；整理后的完整成品进入 `build/XiangMeta-<版本号>/`。验证完成后可以清理 staging。不要删除完整成品里的 runtime，也不要删除开发用 runtime 或开发依赖。

## 扩展与内容

新增项目遵循 [World Module Contract](docs/world-module-contract.md) 和 [模块开发指南](docs/modules.md)。运行 `npm.cmd run module:new -- music-ai ai-mountain --scene` 可创建基础模块。

已经接入五个 AI 模型、两篇论文方程工作台、十四幅摄影、五张专辑、四季音乐、《燕来有声》MV 和十六个 R 互动。模型支持逐步输出。科研曲线使用论文方程及演示参数，尚未对实验数据拟合；远方三岛保持未开放。

后续素材见 [内容备忘](docs/assets-needed.md)。中秋作品保留预告，曲名待定。

## 操作

WASD 行走，Shift 加速，空格跳跃；鼠标环顾，F 使用展品，R 体验装置或收集碎片，P 摄影。Esc 关闭面板后返回探索；世界中再次按 Esc 释放鼠标。
