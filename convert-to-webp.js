/**
 * 批量将 PNG/JPG 图片转换为 WebP
 * 用法：node convert-to-webp.js ./images
 */

import fs from "fs";
import path from "path";
import sharp from "sharp";

const inputDir = process.argv[2] || "./";
const outputDir = process.argv[3] || inputDir; // 输出目录（默认同输入）

// 是否递归子目录
const recursive = true;

// 允许转换的格式
const validExts = [".png", ".jpg", ".jpeg"];

async function convertImage(inputPath, outputPath) {
  try {
    await sharp(inputPath).toFormat("webp", { quality: 85 }).toFile(outputPath);
    console.log(`✅ 转换成功: ${path.basename(inputPath)} → ${path.basename(outputPath)}`);
  } catch (err) {
    console.error(`❌ 转换失败: ${inputPath}`, err.message);
  }
}

function walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (recursive) walkDir(fullPath);
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (validExts.includes(ext)) {
        const outPath = path.join(
          outputDir,
          path.relative(inputDir, fullPath).replace(ext, ".webp")
        );

        // 确保输出目录存在
        fs.mkdirSync(path.dirname(outPath), { recursive: true });

        convertImage(fullPath, outPath);
      }
    }
  }
}

// 启动转换
console.log(`🚀 开始批量转换图片: ${inputDir}`);
walkDir(inputDir);
