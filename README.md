# QwenPaw 背景壁纸插件

为 QwenPaw WebUI 添加自定义背景壁纸，支持轮播、透明度调节。纯前端插件，Windows / Mac 通用。

## 功能

- 🖼️ 从本地文件夹加载壁纸
- 🔄 定时轮播（间隔可调）
- 🎚️ 透明度控制
- 📱 全页设置面板
- ⚡ 异步加载，不阻塞 QwenPaw 启动

## 安装

### 1. 放置插件文件

将本目录复制到 QwenPaw 的插件目录下：

| 系统 | 插件路径 |
|---|---|
| **Windows** | `C:\Users\<用户名>\.qwenpaw\plugins\background-wallpaper\` |
| **macOS** | `~/.qwenpaw/plugins/background-wallpaper/` |
| **Linux** | `~/.qwenpaw/plugins/background-wallpaper/` |

### 2. 放入壁纸图片

在插件目录下创建 `images/` 文件夹，将壁纸图片放进去：

```bash
mkdir images
```

支持格式：`.png` `.jpg` `.jpeg` `.gif` `.webp` `.bmp`

### 3. 生成图片清单

在插件目录下执行：

```bash
# Windows (cmd)
python -c "import os,json;fs=sorted([f for f in os.listdir('images') if f.lower().endswith(('.png','.jpg','.jpeg','.gif','.webp','.bmp'))]);open('images.json','w',encoding='utf-8').write(json.dumps({'files':fs}));print(f'{len(fs)} images')"

# Mac / Linux (终端)
python3 -c "import os,json;fs=sorted([f for f in os.listdir('images') if f.lower().endswith(('.png','.jpg','.jpeg','.gif','.webp','.bmp'))]);open('images.json','w',encoding='utf-8').write(json.dumps({'files':fs}));print(f'{len(fs)} images')"
```

> **提示：** 每次增删 `images/` 里的图片后，都需要重新跑一次这条命令来更新 `images.json`。

### 4. 刷新浏览器

| 浏览器 | 操作 |
|---|---|
| Chrome / Edge | `Ctrl+Shift+Delete` → 勾选「缓存的图片和文件」→ 清除 |
| 调试模式 | `F12` → **Network 标签** → 勾选 **Disable cache**（一劳永逸） |
| Safari | Safari → 偏好设置 → 隐私 → 清除所有网站数据 |

## 使用

1. 侧边栏 **Plugins → 🎨 背景壁纸**
2. 插件启动时会自动从 `images.json` 加载图片列表
3. 若修改了 `images/` 文件夹，点 **🔄 从 images/ 文件夹刷新** 重新加载
4. 点 **📁 临时导入** 可额外添加图片（仅当前会话有效）
5. 每张缩略图右上角 **×** 可删除（持久化）
6. 调节 **启用背景 / 轮播 / 透明度 / 间隔**

### 更换壁纸的工作流

```
1. 修改 images/ 文件夹（增删图片文件）
2. 重新运行 Python 命令更新 images.json
3. 刷新浏览器，或点击面板中的「🔄 刷新」
```

## 文件结构

```
background-wallpaper/
├── plugin.json          # 插件清单
├── index.js             # 插件主代码（无硬编码文件名）
├── images.json          # 图片文件名列表（用户自行生成）
└── images/              # 壁纸图片（需自行放入）
    ├── wallpaper1.jpg
    ├── wallpaper2.png
    └── ...
```

## 注意事项

- 🏷️ 图片文件名建议使用**纯 ASCII**（英文+数字），避免中文 / 空格 / 特殊符号
- 🧹 **首次使用必须清除浏览器缓存**（QwenPaw 未设置 Cache-Control 头）
- 💾 设置（启用 / 轮播 / 透明度）自动保存到 localStorage，刷新不丢
- 🖼️ `index.js` 中**无任何硬编码图片文件名**，所有列表从 `images.json` 实时加载
- ☁️ `images/` 目录不包含在 GitHub 仓库中（`.gitignore`），仅含单张测试图 `test.png`

## 许可

MIT
