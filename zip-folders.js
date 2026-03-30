// zip-folders.js
import fs from 'fs'
import path from 'path'
import archiver from 'archiver'

// ✅ 可配置：要压缩的文件夹
const FOLDERS = [
  'ar.makevideoclip.com'
]

// ✅ 可配置：排除的文件/文件夹
const EXCLUDES = ['.git', 'node_modules']

// 输出文件名
const OUTPUT_FILE = 'makevideoclip_sites.zip'

function shouldExclude(filePath) {
  return EXCLUDES.some(ex => filePath.includes(ex))
}

async function zipFolders() {
  const output = fs.createWriteStream(OUTPUT_FILE)
  const archive = archiver('zip', { zlib: { level: 9 } })

  output.on('close', () => {
    console.log(`✅ 压缩完成: ${OUTPUT_FILE} (共 ${archive.pointer()} 字节)`)
  })

  archive.on('warning', err => {
    if (err.code === 'ENOENT') {
      console.warn('⚠️', err.message)
    } else {
      throw err
    }
  })

  archive.on('error', err => {
    throw err
  })

  archive.pipe(output)

  for (const folder of FOLDERS) {
    const folderPath = path.resolve(folder)
    if (!fs.existsSync(folderPath)) {
      console.warn(`⚠️ 文件夹不存在: ${folderPath}`)
      continue
    }
    console.log(`📦 添加文件夹: ${folderPath}`)
    archive.directory(folderPath, folder, entryData => {
      if (shouldExclude(entryData.name)) {
        return false // 跳过
      }
      return entryData
    })
  }

  await archive.finalize()
}

zipFolders().catch(err => {
  console.error('❌ 压缩失败:', err)
})
