const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const data = {
  "pc.makevideoclip.com": "http://192.168.6.246:8300/web_dev/pc.makevideoclip.com.git",
  "ar.makevideoclip.com": "http://192.168.6.246:8300/web_dev/ar.makevideoclip.com.git",
  "de.makevideoclip.com": "http://192.168.6.246:8300/web_dev/de.makevideoclip.com.git",
  "es.makevideoclip.com": "http://192.168.6.246:8300/web_dev/es.makevideoclip.com.git",
  "fr.makevideoclip.com": "http://192.168.6.246:8300/web_dev/fr.makevideoclip.com.git",
  "it.makevideoclip.com": "http://192.168.6.246:8300/web_dev/it.makevideoclip.com.git",
  "jp.makevideoclip.com": "http://192.168.6.246:8300/web_dev/jp.makevideoclip.com.git",
  "kr.makevideoclip.com": "http://192.168.6.246:8300/web_dev/kr.makevideoclip.com.git",
  "nl.makevideoclip.com": "http://192.168.6.246:8300/web_dev/nl.makevideoclip.com.git",
  "pt.makevideoclip.com": "http://192.168.6.246:8300/web_dev/pt.makevideoclip.com.git",
  "tr.makevideoclip.com": "http://192.168.6.246:8300/web_dev/tr.makevideoclip.com.git",
  "tw.makevideoclip.com": "http://192.168.6.246:8300/web_dev/tw.makevideoclip.com.git",
  "ru.makevideoclip.com": "http://192.168.6.246:8300/web_dev/ru.makevideoclip.com.git",
};

const results = {
  success: [],
  failure: [],
};

const originalDir = process.cwd();

for (const [projectDir, gitUrl] of Object.entries(data)) {
  try {
    const projectPath = path.join(originalDir, projectDir);

    // 检查项目目录是否存在
    if (fs.existsSync(projectPath)) {
      console.log(`🔍 ${projectDir} 已存在，拉取当前分支最新代码...`);
      process.chdir(projectPath);

      // 🔥 不切换分支，直接拉取当前分支
      execSync("git pull", { stdio: "inherit" });
    }

    results.success.push(projectDir);
    console.log(`✅ ${projectDir} 操作成功`);
  } catch (error) {
    results.failure.push(projectDir);
    console.error(`❌ ${projectDir} 操作失败:`, error.message);
  } finally {
    process.chdir(originalDir); // 返回原始目录
  }
}

console.log("\n📊 最终结果:");
console.log("✅ 成功:", results.success);
console.log("❌ 失败:", results.failure);
