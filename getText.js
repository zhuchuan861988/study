const express = require("express");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const app = express();
const PORT = 3001;
const { createProxyMiddleware } = require("http-proxy-middleware");
const cors = require("cors");


// --- 配置区 ---
const BASE_DIR = "F:\\vidnoz-flex-website\\";
const TEMPLATE_PATH_SUFFIX = "\\templates\\new-template\\lan";
const JSON_FILENAME = "lan.json";

// git配置 ---
const GIT_BASE_CONFIG = {
  host: "http://192.168.6.246:8300/api/v1",
  // token: "213828f2bfe6c6750b96754f46230e663e800bbf",
  token:"5fc39318327fdca19f54c967b0e6364d853e68f2",
  owner: "web_dev",
  branch: "master",
};

// 多语言仓库配置 ---
const GIT_REPO_MAP = {
  en: "pc.makevideoclip.com",
  jp: "jp.makevideoclip.com",
  pt: "pt.makevideoclip.com",
  tw: "tw.makevideoclip.com",
  it: "it.makevideoclip.com",
  fr: "fr.makevideoclip.com",
  es: "es.makevideoclip.com",
  de: "de.makevideoclip.com",
  kr: "kr.makevideoclip.com",
  ar: "ar.makevideoclip.com",
};

app.use(cors({
  origin: "*",
  methods: ["GET","POST","OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));


app.use(express.json({ limit: "50mb" }));
app.use(express.static("public"));

async function checkGitDiff(langDomain, langCode, topLevelKey) {
  const repoName = GIT_REPO_MAP[langCode];
  if (!repoName) return { status: "skipped" };

  const remoteFilePath = `templates/new-template/lan/lan.json`;
  const apiUrl = `${GIT_BASE_CONFIG.host}/repos/${GIT_BASE_CONFIG.owner}/${repoName}/raw/${encodeURIComponent(remoteFilePath)}?ref=${GIT_BASE_CONFIG.branch}`;
  const localPath = path.join(BASE_DIR, langDomain, TEMPLATE_PATH_SUFFIX, JSON_FILENAME);

  try {
    const response = await axios.get(apiUrl, {
      headers: { Authorization: `token ${GIT_BASE_CONFIG.token}` },
      timeout: 5000,
    });

    const remoteFullJson = typeof response.data === "object" ? response.data : JSON.parse(response.data);
    const remoteModuleData = remoteFullJson[topLevelKey];

    if (!fs.existsSync(localPath)) {
      return { status: "need_sync", remoteFullJson };
    }

    const localFullJson = JSON.parse(fs.readFileSync(localPath, "utf8"));
    const localModuleData = localFullJson[topLevelKey];

    const isDifferent = JSON.stringify(localModuleData) !== JSON.stringify(remoteModuleData);

    return {
      status: isDifferent ? "need_sync" : "synced",
      remoteFullJson: isDifferent ? remoteFullJson : null
    };
  } catch (error) {
    console.error(`[Git检查失败] ${langCode}: ${error.message}`);
    return { status: "failed" };
  }
}

function ensureProtocol(url) {
  if (!url) return url;
  return /^https?:\/\//i.test(url) ? url : "https://" + url;
}

const PORT_MAP = {
  en: "8010", pt: "8016", jp: "8017", fr: "8012",
  ar: "8018", de: "8014", es: "8015", it: "8013",
  tw: "8027", kr: "8026",
};

Object.entries(PORT_MAP).forEach(([lang, port]) => {
  app.use(
    `/preview_${lang}`,
    createProxyMiddleware({
      target: `https://192.168.7.80:${port}`,
      changeOrigin: true,
      secure: false,
      pathRewrite: { [`^/preview_${lang}`]: "" },
      onProxyRes: function (proxyRes) {
        delete proxyRes.headers["x-frame-options"];
        delete proxyRes.headers["content-security-policy"];
      },
    })
  );
});

function logDifferences(oldObj, newObj, moduleName) {
  const now = new Date();
  const timeStr = now.toLocaleString("zh-CN", { hour12: false });
  console.log(`\n--- [保存修改] 时间: ${timeStr} | 模块: ${moduleName} ---`);
  let hasChanges = false;
  
  const allKeys = new Set([...Object.keys(oldObj || {}), ...Object.keys(newObj || {})]);
  
  for (let key of allKeys) {
    const oldVal = oldObj ? oldObj[key] : undefined;
    const newVal = newObj ? newObj[key] : undefined;
    
    if (!(key in (oldObj || {}))) {
      console.log(`[+] 新增键名: "${key}"`);
      hasChanges = true;
    } else if (!(key in (newObj || {}))) {
      console.log(`[-] 删除键名: "${key}"`);
      hasChanges = true;
    } else if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      console.log(`[*] 修改键名: "${key}"`);
      console.log(`    旧值: ${JSON.stringify(oldVal)}`);
      console.log(`    新值: ${JSON.stringify(newVal)}`);
      hasChanges = true;
    }
  }
  if (!hasChanges) console.log("说明：内容未发生实质性变化。");
  console.log(`------------------------------------------------------------\n`);
}

app.post("/api/extract-by-url", async (req, res) => {
  let { pageUrl } = req.body;
  pageUrl = ensureProtocol(pageUrl);

  try {
    const myUrl = new URL(pageUrl);
    const hostname = myUrl.hostname;
    let langCode = (hostname === "www.vidnoz.com" || hostname === "manage.vidnoz.com") ? "en" : hostname.split(".")[0];
    let topLevelKey = path.basename(myUrl.pathname, ".html") || "index";
    let langDomain = (langCode === "en") ? "pc.makevideoclip.com" : `${langCode}.makevideoclip.com`;

    const diffResult = await checkGitDiff(langDomain, langCode, topLevelKey);
    const jsonFilePath = path.join(BASE_DIR, langDomain, TEMPLATE_PATH_SUFFIX, JSON_FILENAME);
    
    let contentToShow = "";
    if (fs.existsSync(jsonFilePath)) {
      const fileContent = fs.readFileSync(jsonFilePath, "utf8");
      const jsonData = JSON.parse(fileContent);
      if (jsonData[topLevelKey]) {
        contentToShow = `/* --- start --- */\n\n${JSON.stringify({ [topLevelKey]: jsonData[topLevelKey] }, null, 2)}\n\n/* --- END --- */`;
      }
    } else if (diffResult.status === 'need_sync') {
        contentToShow = `/* 本地暂无文件，点击上方同步按钮拉取远程数据 */`;
    }

    res.json({
      success: true,
      content: contentToShow,
      syncStatus: diffResult.status,
      info: { langCode, topLevelKey, folder: langDomain },
    });
  } catch (error) {
    res.status(500).json({ error: "解析失败: " + error.message });
  }
});

app.post("/api/sync-git-force", async (req, res) => {
    const { langDomain, langCode, topLevelKey } = req.body;
    try {
      const diffResult = await checkGitDiff(langDomain, langCode, topLevelKey);
      if (diffResult.status === "need_sync" && diffResult.remoteFullJson) {
        const localPath = path.join(BASE_DIR, langDomain, TEMPLATE_PATH_SUFFIX, JSON_FILENAME);
        let localFullJson = fs.existsSync(localPath) ? JSON.parse(fs.readFileSync(localPath, "utf8")) : {};
  
        localFullJson[topLevelKey] = diffResult.remoteFullJson[topLevelKey];
        fs.mkdirSync(path.dirname(localPath), { recursive: true });
        fs.writeFileSync(localPath, JSON.stringify(localFullJson, null, 2), "utf8");
  
        const formattedContent = `/* --- start --- */\n\n${JSON.stringify({ [topLevelKey]: localFullJson[topLevelKey] }, null, 2)}\n\n/* --- END --- */`;
        res.json({ success: true, content: formattedContent });
      } else {
        res.json({ success: false, error: "远程无更新或获取失败" });
      }
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
});

app.post("/api/save", (req, res) => {
  let { pageUrl, content } = req.body;
  pageUrl = ensureProtocol(pageUrl);
  try {
    const myUrl = new URL(pageUrl);
    const hostname = myUrl.hostname;
    let langCode = (hostname === "www.vidnoz.com" || hostname === "manage.vidnoz.com") ? "en" : hostname.split(".")[0];
    let topLevelKey = path.basename(myUrl.pathname, ".html") || "index";
    let langDomain = (langCode === "en") ? "pc.makevideoclip.com" : `${langCode}.makevideoclip.com`;
    const jsonFilePath = path.join(BASE_DIR, langDomain, TEMPLATE_PATH_SUFFIX, JSON_FILENAME);

    const startMark = "/* --- start --- */";
    const endMark = "/* --- END --- */";
    let jsonString = content;
    if (content.includes(startMark) && content.includes(endMark)) {
        jsonString = content.split(startMark)[1].split(endMark)[0].trim();
    }

    const updatedPart = JSON.parse(jsonString);
    const newData = updatedPart[topLevelKey];
    
    if (!fs.existsSync(jsonFilePath)) throw new Error("本地文件不存在");

    const rawFile = fs.readFileSync(jsonFilePath, "utf8");
    const oldFullJson = JSON.parse(rawFile);

    // 记录差异
    logDifferences(oldFullJson[topLevelKey], newData, topLevelKey);

    // 覆盖并保存
    oldFullJson[topLevelKey] = newData;
    fs.writeFileSync(jsonFilePath, JSON.stringify(oldFullJson, null, 2), "utf8");
    
    res.json({ success: true });
  } catch (error) {
    console.error("Save Error:", error);
    res.status(500).json({ error: "保存失败: " + error.message });
  }
});

app.listen(PORT, () => {
  console.log(`\n=========================================`);
  console.log(` 语言包提取器后端已启动 [手动同步模式]`);
  console.log(` 地址: http://localhost:${PORT}`);
  console.log(`=========================================\n`);
});