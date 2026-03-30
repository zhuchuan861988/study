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

const results = { success: [], failure: [] };
const originalDir = process.cwd();

for (const [projectDir, gitUrl] of Object.entries(data)) {
  try {
    const projectPath = path.join(originalDir, projectDir);

    if (fs.existsSync(projectPath)) {
      console.log(`📂 进入项目: ${projectDir}`);
      process.chdir(projectPath);

      // 获取当前分支
      const branch = execSync("git rev-parse --abbrev-ref HEAD").toString().trim();
      console.log(`🔀 当前分支: ${branch}`);

      // 变基拉取最新代码
      console.log(`⬇️ git pull --rebase origin ${branch}`);
      execSync(`git pull --rebase origin ${branch}`, { stdio: "inherit" });

      // 检查是否有改动
      const status = execSync("git status --porcelain").toString().trim();
      if (status) {
        console.log("✏️ 检测到改动，提交中...");
        execSync("git add .", { stdio: "inherit" });
        execSync(`git commit -m "auto commit on ${branch}"`, { stdio: "inherit" });
      } else {
        console.log("✅ 没有需要提交的改动");
      }

      // 推送到远程
      console.log(`⬆️ git push origin ${branch}`);
      execSync(`git push origin ${branch}`, { stdio: "inherit" });

      results.success.push(projectDir);
      console.log(`🎉 ${projectDir} 提交成功`);
    } else {
      console.warn(`⚠️ 项目不存在: ${projectDir}`);
    }
  } catch (err) {
    results.failure.push(projectDir);
    console.error(`❌ ${projectDir} 操作失败:`, err.message);
  } finally {
    process.chdir(originalDir);
  }
}

console.log("\n📊 最终结果:");
console.log("✅ 成功:", results.success);
console.log("❌ 失败:", results.failure);
