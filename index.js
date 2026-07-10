// ──────────────────────────────────────────────────────────────
// QwenPaw Background Wallpaper Plugin
// ──── HTTP 加载 + ETag 绕过 ────────────────────────────────
// 图片从 images/ 文件夹 HTTP 加载
// 🔄 刷新列表 → 强制绕过浏览器 ETag 缓存
// UI 删图 → 持久化到 localStorage
// UI 导图 → 当前会话有效
// ──────────────────────────────────────────────────────────────

(function () {
  "use strict";

  var STORAGE_KEY = "qwenpaw_bg_wallpaper_settings";
  var PLUGIN_ID = "background-wallpaper";
  var ROUTE_ID = PLUGIN_ID + ".settings";
  var IMG_BASE = "/api/frontend_plugin/" + PLUGIN_ID + "/files/images/";

  // 种子列表（首次使用时的默认图片，后续会被 🔄 刷新覆盖）
  var FILE_LIST_KEY = "qwenpaw_bg_filelist";
  var SEED_LIST = ["test.png"];

  // 读取持久化的图片列表
  function loadFileList() {
    try {
      var raw = localStorage.getItem(FILE_LIST_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
  }

  function saveFileList(list) {
    try { localStorage.setItem(FILE_LIST_KEY, JSON.stringify(list)); } catch (e) {}
  }

  // 获取当前图片列表：优先 localStorage，其次 SEED_LIST
  function getImageList() {
    var saved = loadFileList();
    return saved && saved.length > 0 ? saved : SEED_LIST;
  }

  // ── 设置持久化（小数据）──────────────────────────────────
  function loadSettings() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return { enabled: true, carousel: true, interval: 300, opacity: 1.0, currentIndex: 0, removedIndexes: [] };
  }

  function saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        enabled: config.enabled, carousel: config.carousel,
        interval: config.interval, opacity: config.opacity,
        currentIndex: config.currentIndex, removedIndexes: config.removedIndexes,
      }));
    } catch (e) {}
  }

  // ── 运行时状态 ──────────────────────────────────────────
  var raw = loadSettings();
  var config = {
    enabled: raw.enabled, carousel: raw.carousel,
    interval: raw.interval, opacity: raw.opacity,
    currentIndex: raw.currentIndex, removedIndexes: raw.removedIndexes || [],
    images: [], importedImages: [],
  };

  function buildImageList() {
    var files = getImageList().filter(function (_, i) { return config.removedIndexes.indexOf(i) === -1; });
    var urls = files.map(function (f) { return IMG_BASE + encodeURIComponent(f); });
    return urls.concat(config.importedImages);
  }

  config.images = buildImageList();
  if (config.currentIndex >= config.images.length) config.currentIndex = 0;

  var carouselTimer = null, bgLayer = null;

  // ══════════════════════════════════════════════════════════
  // 背景层
  // ══════════════════════════════════════════════════════════
  function ensureBgLayer() {
    if (bgLayer) return;
    bgLayer = document.createElement("div");
    bgLayer.id = PLUGIN_ID + "-bg";
    bgLayer.style.cssText = "position:fixed;inset:0;z-index:0;pointer-events:none;background-size:cover;background-position:center;background-repeat:no-repeat;";
    document.body.insertBefore(bgLayer, document.body.firstChild);
  }

  function applyBackground() {
    ensureBgLayer();
    if (!config.enabled || config.images.length === 0) { bgLayer.style.backgroundImage = "none"; bgLayer.style.opacity = "0"; return; }
    var img = config.images[config.currentIndex] || config.images[0];
    bgLayer.style.backgroundImage = img ? "url('" + img + "')" : "none";
    bgLayer.style.opacity = config.opacity;
    if (bgLayer.parentNode !== document.body) document.body.insertBefore(bgLayer, document.body.firstChild);
  }

  function ensureTransparentCSS() {
    if (document.getElementById(PLUGIN_ID + "-css")) return;
    var s = document.createElement("style");
    s.id = PLUGIN_ID + "-css";
    s.textContent = "#root,.ant-layout,.ant-layout-content{background:transparent!important}#root{opacity:0.9}.chat-container,.message-list,.ant-layout-sider{background:rgba(255,255,255,0.85)!important}.dark-theme .chat-container,.dark-theme .message-list,.dark-theme .ant-layout-sider{background:rgba(0,0,0,0.75)!important}";
    document.head.appendChild(s);
  }

  // ══════════════════════════════════════════════════════════
  // 轮播
  // ══════════════════════════════════════════════════════════
  function startCarousel() {
    stopCarousel();
    if (!config.carousel || config.images.length < 2) return;
    carouselTimer = setInterval(function () {
      config.currentIndex = (config.currentIndex + 1) % config.images.length;
      applyBackground(); updateThumbnails(); saveSettings();
    }, config.interval * 1000);
  }
  function stopCarousel() { if (carouselTimer) { clearInterval(carouselTimer); carouselTimer = null; } }

  // ══════════════════════════════════════════════════════════
  // 面板 UI（全页版）
  // ══════════════════════════════════════════════════════════
  function buildPanel() {
    var existing = document.getElementById(PLUGIN_ID + "-panel");
    if (existing) { existing.style.display = "block"; updateThumbnails(); updateCount(); return; }

    var p = document.createElement("div");
    p.id = PLUGIN_ID + "-panel";
    p.style.cssText = "padding:24px 32px;font:14px -apple-system,BlinkMacSystemFont,sans-serif;color:#333;max-width:900px;";
    p.innerHTML = [
      '<h3 style="margin:0 0 20px;font-size:18px;">\uD83D\uDDBC\uFE0F 背景壁纸</h3>',
      '<div style="margin-bottom:16px;">',
      '  <button id="'+PLUGIN_ID+'-refreshBtn" style="padding:8px 20px;border:1px solid #52c41a;border-radius:6px;background:#f6ffed;cursor:pointer;color:#52c41a;font-size:14px;margin-right:8px;">\uD83D\uDD04 \u4ECE images/ \u6587\u4EF6\u5939\u5237\u65B0</button>',
      '  <button id="'+PLUGIN_ID+'-importBtn" style="padding:8px 20px;border:1px dashed #1890ff;border-radius:6px;background:#e6f7ff;cursor:pointer;color:#1890ff;font-size:14px;margin-right:8px;">\uD83D\uDCC1 \u4E34\u65F6\u5BFC\u5165</button>',
      '  <button id="'+PLUGIN_ID+'-clearBtn" style="padding:8px 20px;border:1px solid #ff4d4f;border-radius:6px;background:#fff;cursor:pointer;color:#ff4d4f;font-size:14px;">\uD83D\uDDD1\uFE0F \u6E05\u9664</button></div>',
      '<input type="file" id="'+PLUGIN_ID+'-folderInput" webkitdirectory multiple accept="image/*" style="display:none">',
      '<div style="margin-bottom:8px;font-size:12px;color:#888;">\u5171 <span id="'+PLUGIN_ID+'-imgCount">'+config.images.length+'</span> \u5F20\u56FE\u7247</div>',
      '<div id="'+PLUGIN_ID+'-thumbnails" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:24px;min-height:80px;"></div>',
      '<div style="display:flex;gap:24px;flex-wrap:wrap;margin-bottom:24px;">',
      '  <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">',
      '    <input type="checkbox" id="'+PLUGIN_ID+'-enable"'+(config.enabled?' checked':'')+'> \u542F\u7528\u80CC\u666F</label>',
      '  <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">',
      '    <input type="checkbox" id="'+PLUGIN_ID+'-carousel"'+(config.carousel?' checked':'')+'> \u8F6E\u64AD</label>',
      '  <div style="display:flex;align-items:center;gap:8px;">',
      '    <span>\u95F4\u9694\uFF08\u79D2\uFF09:</span>',
      '    <input type="number" id="'+PLUGIN_ID+'-interval" value="'+config.interval+'" min="3" max="3600" style="width:80px;padding:4px;border:1px solid #d9d9d9;border-radius:4px;"></div></div>',
      '<div style="margin-bottom:16px;max-width:400px;">',
      '  <div style="display:flex;justify-content:space-between;margin-bottom:4px;">',
      '    <span>\u900F\u660E\u5EA6</span><span id="'+PLUGIN_ID+'-opacityVal">'+Math.round(config.opacity*100)+'%</span></div>',
      '  <input type="range" id="'+PLUGIN_ID+'-opacity" min="0" max="100" value="'+Math.round(config.opacity*100)+'" style="width:100%;"></div>',
      '<button id="'+PLUGIN_ID+'-resetBtn" style="padding:6px 20px;border:1px solid #faad14;border-radius:6px;background:#fffbe6;cursor:pointer;color:#faad14;font-size:14px;">\uD83D\uDD19 \u6062\u590D\u9ED8\u8BA4\u8BBE\u7F6E</button>',
    ].join("\n");
    // 挂载到 React 页面容器内
    var pageContainer = document.querySelector('[id$="-page"]') || document.body;
    pageContainer.appendChild(p);
  }

  function updateThumbnails() {
    var c = document.getElementById(PLUGIN_ID + "-thumbnails"); if (!c) return;
    c.innerHTML = "";
    config.images.forEach(function (img, idx) {
      var w = document.createElement("div");
      w.style.cssText = "position:relative;width:64px;height:64px;border-radius:6px;overflow:hidden;cursor:pointer;border:2px solid transparent;flex-shrink:0;";
      if (idx === config.currentIndex) w.style.borderColor = "#1890ff";
      var t = document.createElement("img");
      t.src = img; t.style.cssText = "width:100%;height:100%;object-fit:cover;";
      t.onclick = function () { config.currentIndex = idx; applyBackground(); updateThumbnails(); saveSettings(); if (config.enabled) startCarousel(); };
      w.appendChild(t);
      var d = document.createElement("span");
      d.textContent = "\u00D7";
      d.style.cssText = "position:absolute;top:-4px;right:-4px;width:18px;height:18px;border-radius:50%;background:#ff4d4f;color:#fff;font-size:12px;display:flex;align-items:center;justify-content:center;cursor:pointer;border:2px solid #fff;";
      d.title = "\u5220\u9664\uFF08\u6301\u4E45\u5316\uFF09";
      d.onclick = function (e) { e.stopPropagation();
        var imgStr = img;
        var seedIdx = SEED_LIST.findIndex(function (f) { return IMG_BASE + encodeURIComponent(f) === imgStr; });
        if (seedIdx >= 0 && config.removedIndexes.indexOf(seedIdx) === -1) {
          config.removedIndexes.push(seedIdx);
        }
        config.images.splice(idx, 1);
        if (config.currentIndex >= config.images.length) config.currentIndex = 0;
        applyBackground(); updateThumbnails(); updateCount(); saveSettings();
      };
      w.appendChild(d);
      c.appendChild(w);
    });
  }

  function updateCount() {
    var el = document.getElementById(PLUGIN_ID + "-imgCount");
    if (el) el.textContent = config.images.length;
  }

  function bindPanelEvents() {
    function $(id) { return document.getElementById(PLUGIN_ID + "-" + id); }

    $("enable").onchange = function () {
      config.enabled = this.checked;
      if (!config.enabled) { stopCarousel(); applyBackground(); }
      else if (config.images.length > 0) { applyBackground(); if (config.images.length > 1 && config.carousel) startCarousel(); }
      saveSettings();
    };

    // 🔄 核心功能：从 images/ 文件夹刷新列表（带缓存绕行）
    $("refreshBtn").onclick = function () {
      var btn = this;
      btn.textContent = "\uD83D\uDD04 \u5237\u65B0\u4E2D..."; btn.disabled = true;
      // 关键：If-None-Match: '' 强制服务器返回 200 + 最新数据，不走 304
      fetch("/api/frontend_plugin/" + PLUGIN_ID + "/files/images.json", {
        cache: "reload",
        headers: { "Pragma": "no-cache", "Cache-Control": "no-cache", "If-None-Match": "" },
      })
        .then(function (r) {
          if (!r.ok) throw new Error("HTTP " + r.status);
          return r.json();
        })
        .then(function (data) {
          if (!data.files || data.files.length === 0) {
            alert("\u672A\u627E\u5230\u56FE\u7247\uFF0C\u8BF7\u786E\u4FDD images/ \u6587\u4EF6\u5939\u4E2D\u6709\u56FE\u7247\u6587\u4EF6");
            return;
          }
          SEED_LIST.length = 0;
          SEED_LIST.push.apply(SEED_LIST, data.files);
          saveFileList(data.files);
          config.removedIndexes = [];
          config.importedImages = [];
          config.images = buildImageList();
          config.currentIndex = 0;
          applyBackground(); updateThumbnails(); updateCount(); saveSettings();
          if (config.enabled && config.images.length > 1 && config.carousel) startCarousel();
          console.log("[BackgroundWallpaper] Refreshed: " + SEED_LIST.length + " files from images/ folder");
        })
        .catch(function (err) {
          alert("\u5237\u65B0\u5931\u8D25\uFF1A" + err.message);
          console.warn("[BackgroundWallpaper] Refresh failed:", err);
        })
        .finally(function () {
          btn.textContent = "\uD83D\uDD04 \u4ECE images/ \u6587\u4EF6\u5939\u5237\u65B0"; btn.disabled = false;
        });
    };

    $("importBtn").onclick = function () { $("folderInput").click(); };
    $("folderInput").onchange = function () {
      var files = Array.from(this.files).filter(function (f) { return f.type.startsWith("image/"); });
      if (files.length === 0) { alert("\u672A\u627E\u5230\u56FE\u7247"); return; }
      var loaded = 0, newImgs = [];
      files.forEach(function (file) {
        var reader = new FileReader();
        reader.onload = function (e) {
          newImgs.push(e.target.result);
          if (++loaded === files.length) {
            config.images = config.images.concat(newImgs);
            config.importedImages = (config.importedImages || []).concat(newImgs);
            if (config.images.length === newImgs.length) config.currentIndex = 0;
            updateThumbnails(); updateCount();
            if (config.enabled) { applyBackground(); if (config.images.length > 1 && config.carousel) startCarousel(); }
          }
        };
        reader.readAsDataURL(file);
      });
      this.value = "";
    };

    $("carousel").onchange = function () {
      config.carousel = this.checked;
      if (config.carousel && config.images.length > 1) startCarousel(); else stopCarousel();
      saveSettings();
    };
    $("interval").onchange = function () {
      var v = parseInt(this.value, 10);
      if (v >= 3) { config.interval = v; if (config.carousel) startCarousel(); saveSettings(); }
    };
    $("opacity").oninput = function () {
      config.opacity = parseInt(this.value, 10) / 100;
      $("opacityVal").textContent = Math.round(config.opacity * 100) + "%";
      applyBackground(); saveSettings();
    };
    $("resetBtn").onclick = function () {
      config.removedIndexes = []; config.importedImages = []; config.images = buildImageList();
      config.enabled = true; config.carousel = true; config.interval = 300; config.opacity = 1.0;
      config.currentIndex = 0;
      $("enable").checked = true; $("carousel").checked = true;
      $("interval").value = "300"; $("opacity").value = "100"; $("opacityVal").textContent = "100%";
      stopCarousel(); applyBackground(); updateThumbnails(); updateCount(); saveSettings();
      if (config.images.length > 1) startCarousel();
    };
    $("clearBtn").onclick = function () {
      config.images = []; config.importedImages = [];
      config.removedIndexes = getImageList().map(function (_, i) { return i; });
      config.currentIndex = 0; stopCarousel();
      config.enabled = false; $("enable").checked = false;
      applyBackground(); updateThumbnails(); updateCount(); saveSettings();
    };
  }

  // ══════════════════════════════════════════════════════════
  // 菜单 + 路由
  // ══════════════════════════════════════════════════════════
  function registerAPI() {
    if (typeof window.QwenPaw === "undefined") { setTimeout(registerAPI, 300); return; }
    try {
      var React = window.QwenPaw.host.React;
      var SettingsPage = function () {
        var containerRef = React.useRef(null);
        React.useEffect(function () {
          buildPanel();
          bindPanelEvents();
          updateThumbnails();
          updateCount();
          return function () {
            var p = document.getElementById(PLUGIN_ID + "-panel");
            if (p) p.style.display = "none";
          };
        }, []);
        return React.createElement("div", { ref: containerRef, id: PLUGIN_ID + "-page" });
      };
      window.QwenPaw.route.add(PLUGIN_ID, { id: ROUTE_ID, path: "/" + PLUGIN_ID + "/settings", component: SettingsPage });
      window.QwenPaw.menu.add(PLUGIN_ID, { id: PLUGIN_ID + ".menu", label: "\uD83C\uDFA8 背景壁纸", route: ROUTE_ID, parentId: "plugins-group", location: "primary.settings", order: 1 });
      console.log("[BackgroundWallpaper] Menu+route registered");
    } catch (e) { console.warn("[BackgroundWallpaper] registerAPI failed:", e); }
  }

  // ══════════════════════════════════════════════════════════
  // 初始化
  // ══════════════════════════════════════════════════════════
  function init() {
    ensureTransparentCSS();
    ensureBgLayer();

    function defer() {
      if (typeof window.QwenPaw !== "undefined") registerAPI();
      else setTimeout(function () { if (typeof window.QwenPaw !== "undefined") registerAPI(); }, 3000);
      // 首次也可能尝试加载 images.json
      // 优先使用 localStorage 中的已保存列表
      var list = getImageList();
      if (list !== SEED_LIST) {
        // 已有持久化列表，同步到 SEED_LIST
        SEED_LIST.length = 0;
        SEED_LIST.push.apply(SEED_LIST, list);
      }
      if (config.enabled && config.images.length > 0) {
        applyBackground();
        if (config.carousel && config.images.length > 1) startCarousel();
      }
      updateThumbnails(); updateCount();
      console.log("[BackgroundWallpaper] Initialized, " + config.images.length + " images");
    }

    if (window.requestIdleCallback) { requestIdleCallback(defer, { timeout: 2000 }); }
    else { setTimeout(defer, 2000); }
  }

  if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", init); }
  else { init(); }

  window["__" + PLUGIN_ID + "_cleanup"] = function () {
    stopCarousel();
    if (bgLayer) { bgLayer.remove(); bgLayer = null; }
    var s = document.getElementById(PLUGIN_ID + "-css"); if (s) s.remove();
    var p = document.getElementById(PLUGIN_ID + "-panel"); if (p) p.remove();
    delete window["__" + PLUGIN_ID + "_cleanup"];
  };
})();
