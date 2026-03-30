const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");
const archiver = require('archiver');

const projects = {
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

const originalDir = process.cwd();
const results = { success: [], failure: [] };

// ===== 拉取或克隆代码 =====
for (const [folder, gitUrl] of Object.entries(projects)) {
  const folderPath = path.join(originalDir, folder);
  try {
    if (fs.existsSync(folderPath)) {
      console.log(`🔍 ${folder} 已存在，拉取最新 master 分支...`);
      process.chdir(folderPath);
      execSync("git checkout master", { stdio: "inherit" });
      execSync("git pull origin master", { stdio: "inherit" });
    } else {
      console.log(`📥 ${folder} 不存在，克隆代码...`);
      execSync(`git clone ${gitUrl} ${folder}`, { stdio: "inherit" });
    }
    results.success.push(folder);
    console.log(`✅ ${folder} 更新成功`);
  } catch (err) {
    results.failure.push(folder);
    console.error(`❌ ${folder} 操作失败:`, err.message);
  } finally {
    process.chdir(originalDir);
  }
}

console.log("\n📊 拉取结果:");
console.log("✅ 成功:", results.success);
console.log("❌ 失败:", results.failure);

// ===== 统一压缩 =====
// ✅ 可配置：要压缩的文件夹
const FOLDERS = Object.keys(projects);

// ✅ 可配置：排除的文件/文件夹
const EXCLUDES = ['.git', 'node_modules', 'preview']

// 输出文件名
const OUTPUT_FILE = 'vidnoz-flex-website.zip'

function shouldExclude(filePath) {
  return EXCLUDES.some(ex => filePath.includes(ex));
}

async function zipFolders() {
  const output = fs.createWriteStream(OUTPUT_FILE);
  const archive = archiver('zip', { zlib: { level: 9 } });

  output.on('close', () => {
    console.log(`✅ 压缩完成: ${OUTPUT_FILE} (共 ${archive.pointer()} 字节)`);
  });

  archive.on('warning', err => {
    if (err.code === 'ENOENT') {
      console.warn('⚠️', err.message);
    } else {
      throw err;
    }
  });

  archive.on('error', err => {
    throw err;
  });

  archive.pipe(output);

  for (const folder of FOLDERS) {
    const folderPath = path.resolve(folder);
    if (!fs.existsSync(folderPath)) {
      console.warn(`⚠️ 文件夹不存在: ${folderPath}`);
      continue;
    }
    console.log(`📦 添加文件夹: ${folderPath}`);
    archive.directory(folderPath, folder, entryData => {
      if (EXCLUDES.some(ex => entryData.name.includes(ex))) {
        return false; // 排除
      }
      return entryData;
    });
  }

  await archive.finalize();
}

zipFolders().catch(err => {
  console.error('❌ 压缩失败:', err);
});
