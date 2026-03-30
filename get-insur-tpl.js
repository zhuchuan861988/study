const fs = require('fs').promises;
const path = require('path');
const XLSX = require('xlsx');

// 语言文件夹列表
const languageFolders = [
  'pc.makevideoclip.com',
  'ar.makevideoclip.com',
  'de.makevideoclip.com',
  'es.makevideoclip.com',
  'fr.makevideoclip.com',
  'it.makevideoclip.com',
  'jp.makevideoclip.com',
  'kr.makevideoclip.com',
  'nl.makevideoclip.com',
  'pt.makevideoclip.com',
  'tr.makevideoclip.com',
  'tw.makevideoclip.com',
  'ru.makevideoclip.com'
];

// 获取语言代码和对应的域名
function getLanguageInfo(folderName) {
  const code = folderName.split('.')[0];
  const languageCode = code === 'pc' ? 'en' : code;
  
  // 构建域名
  let domain;
  if (languageCode === 'en') {
    domain = 'https://www.vidnoz.com';
  } else {
    domain = `https://${languageCode}.vidnoz.com`;
  }
  
  return { languageCode, domain };
}

// 获取tpl根目录下的直接tpl文件（不递归）
async function getRootTplFiles(tplPath) {
  try {
    const files = await fs.readdir(tplPath);
    const tplFiles = [];
    
    for (const file of files) {
      const filePath = path.join(tplPath, file);
      const stat = await fs.stat(filePath);
      
      // 只检查文件，不进入子目录
      if (stat.isFile() && file.endsWith('.tpl')) {
        const nameWithoutSuffix = file.replace('.tpl', '');
        tplFiles.push({
          fileName: file,
          nameWithoutSuffix: nameWithoutSuffix,
          relativePath: file,
          fullPath: filePath,
          type: 'root',
          urlPath: file.replace('.tpl', '.html')
        });
      }
    }
    
    return tplFiles;
  } catch (error) {
    console.error(`读取根目录失败 ${tplPath}:`, error.message);
    return [];
  }
}

// 递归获取second-dir目录下的所有tpl文件
async function getSecondDirTplFiles(secondDirPath) {
  try {
    const entries = await fs.readdir(secondDirPath, { withFileTypes: true });
    const tplFiles = [];
    
    for (const entry of entries) {
      const fullPath = path.join(secondDirPath, entry.name);
      
      if (entry.isDirectory()) {
        const subFiles = await getSecondDirTplFiles(fullPath);
        tplFiles.push(...subFiles.map(file => ({
          ...file,
          relativePath: path.join(entry.name, file.relativePath),
          urlPath: `${entry.name}/${file.urlPath}`
        })));
      } else if (entry.isFile() && entry.name.endsWith('.tpl')) {
        const nameWithoutSuffix = entry.name.replace('.tpl', '');
        tplFiles.push({
          fileName: entry.name,
          nameWithoutSuffix: nameWithoutSuffix,
          relativePath: entry.name,
          fullPath: fullPath,
          type: 'second-dir',
          parentDir: path.basename(secondDirPath),
          urlPath: entry.name.replace('.tpl', '.html')
        });
      }
    }
    
    return tplFiles;
  } catch (error) {
    console.error(`读取second-dir失败 ${secondDirPath}:`, error.message);
    return [];
  }
}

// 获取getinsurValue方法的完整内容
async function getGetinsurValueContent(jsPath) {
  try {
    const content = await fs.readFile(jsPath, 'utf8');
    
    // 匹配 const getinsurValue = () => { ... } 格式
    const methodRegex = /const\s+getinsurValue\s*=\s*\(\s*\)\s*=>\s*{([\s\S]*?)}\s*;/m;
    const match = content.match(methodRegex);
    
    if (match && match[1]) {
      return match[1]; // 返回方法体内容
    }
    
    return '';
  } catch (error) {
    console.error(`读取getinsurValue方法失败 ${jsPath}:`, error.message);
    return '';
  }
}

// 检查tpl文件名是否能在方法内容中被includes匹配到
function isTplInGetinsurValue(tplName, methodContent) {
  if (!methodContent) return false;
  
  // 直接检查方法内容是否包含这个文件名（去掉后缀的）
  return methodContent.includes(tplName);
}

// 生成URL（确保使用正斜杠）
function generateUrl(tplInfo, domain) {
  if (tplInfo.type === 'root') {
    return `${domain}/${tplInfo.fileName.replace('.tpl', '.html')}`;
  } else {
    // second-dir下的文件，需要构建正确的URL路径
    // 例如: second-dir/docs/change-clothes.tpl -> https://www.vidnoz.com/docs/change-clothes.html
    const urlPath = tplInfo.urlPath.replace(/\\/g, '/');
    return `${domain}/${urlPath}`;
  }
}

// 主函数
async function main() {
  console.log('开始检查TPL文件（筛选在getinsurValue方法中能被includes匹配到的文件）...\n');
  
  const results = [];
  const startTime = Date.now();
  
  for (const folder of languageFolders) {
    const { languageCode, domain } = getLanguageInfo(folder);
    console.log(`正在处理 ${folder} (${languageCode})...`);
    
    const tplRootPath = path.join(folder, 'templates', 'new-template', 'tpl');
    const secondDirPath = path.join(tplRootPath, 'second-dir');
    const jsPath = path.join(folder, 'templates', 'new-template', 'Dev', 'js', 'common.js');
    
    let allTplFiles = [];
    let rootCount = 0;
    let secondDirCount = 0;
    
    // 检查tpl根目录
    try {
      await fs.access(tplRootPath);
      const rootFiles = await getRootTplFiles(tplRootPath);
      allTplFiles.push(...rootFiles);
      rootCount = rootFiles.length;
    } catch (error) {
      console.warn(`  ⚠️ 警告: ${tplRootPath} 不存在`);
    }
    
    // 检查second-dir目录
    try {
      await fs.access(secondDirPath);
      const secondDirFiles = await getSecondDirTplFiles(secondDirPath);
      allTplFiles.push(...secondDirFiles);
      secondDirCount = secondDirFiles.length;
    } catch (error) {
      console.warn(`  ⚠️ 警告: ${secondDirPath} 不存在`);
    }
    
    if (allTplFiles.length === 0) {
      console.log(`  📁 没有找到任何tpl文件`);
      continue;
    }
    
    console.log(`  📁 根目录: ${rootCount}个文件, second-dir: ${secondDirCount}个文件`);
    
    // 获取getinsurValue方法内容
    const methodContent = await getGetinsurValueContent(jsPath);
    
    if (methodContent) {
      console.log(`  🔍 成功获取getinsurValue方法内容 (${methodContent.length} 字符)`);
      
      // 显示方法内容的前200个字符作为预览
      const preview = methodContent.substring(0, 200).replace(/\n/g, ' ').trim();
      console.log(`  📝 方法内容预览: ${preview}...`);
    } else {
      console.warn(`  ⚠️ 警告: 在common.js中未找到getinsurValue方法`);
    }
    
    // 检查每个tpl文件，记录不在方法内容中的
    let notFoundCount = 0;
    let foundInMethod = [];
    
    for (const tplInfo of allTplFiles) {
      const isInMethod = isTplInGetinsurValue(tplInfo.nameWithoutSuffix, methodContent);
      
      if (isInMethod) {
        foundInMethod.push(tplInfo.nameWithoutSuffix);
      } else {
        notFoundCount++;
        
        // 生成URL
        const url = generateUrl(tplInfo, domain);
        
        // 完整路径转换为可读格式
        const readablePath = tplInfo.fullPath.split(path.sep).join('/');
        
        results.push({
          '语言': languageCode,
          '位置': tplInfo.type === 'root' ? '根目录' : `second-dir/${tplInfo.parentDir || ''}`,
          'TPL文件': tplInfo.fileName,
          '匹配名称': tplInfo.nameWithoutSuffix,
          '完整路径': readablePath,
          'URL': url
        });
      }
    }
    
    console.log(`  ✅ 完成: 共 ${allTplFiles.length} 个tpl文件`);
    console.log(`     ✅ 在getinsurValue方法中找到: ${foundInMethod.length} 个`);
    console.log(`     ❌ 不在方法中: ${notFoundCount} 个`);
    
    // 显示前10个找到的示例
    if (foundInMethod.length > 0) {
      const examples = foundInMethod.slice(0, 10).join(', ');
      console.log(`     📌 匹配到的示例: ${examples}${foundInMethod.length > 10 ? '...' : ''}`);
    }
    
    // 显示前10个缺失的示例
    if (notFoundCount > 0) {
      const missingExamples = results
        .filter(r => r['语言'] === languageCode)
        .slice(0, 10)
        .map(r => r['匹配名称'])
        .join(', ');
      console.log(`     ❌ 缺失示例: ${missingExamples}${notFoundCount > 10 ? '...' : ''}`);
    }
  }
  
  // 按语言统计
  const languages = [...new Set(results.map(item => item['语言']))];
  const langStats = languages.map(lang => {
    const langResults = results.filter(item => item['语言'] === lang);
    return {
      '语言': lang,
      '缺失文件数': langResults.length
    };
  });
  
  // 按位置统计
  const locationStats = {};
  results.forEach(item => {
    const loc = item['位置'];
    if (!locationStats[loc]) {
      locationStats[loc] = 0;
    }
    locationStats[loc]++;
  });
  
  const locationStatsArray = Object.entries(locationStats).map(([loc, count]) => ({
    '位置': loc,
    '缺失文件数': count
  }));
  
  // 生成Excel文件
  generateExcel(results, langStats, locationStatsArray);
  
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ 完成！');
  console.log('='.repeat(60));
  console.log(`📊 总共发现 ${results.length} 个不在getinsurValue方法中的TPL文件`);
  console.log(`⏱️  耗时: ${duration} 秒`);
  console.log(`🔍 匹配规则: 检查getinsurValue方法内容是否包含tpl文件名（去掉.tpl后缀）`);
  
  console.log('\n📈 按语言统计:');
  langStats.forEach(stat => {
    console.log(`   ${stat['语言']}: ${stat['缺失文件数']}个文件缺失`);
  });
  
  console.log('\n📁 按位置统计:');
  locationStatsArray.forEach(stat => {
    console.log(`   ${stat['位置']}: ${stat['缺失文件数']}个文件缺失`);
  });
}

// 生成Excel文件
function generateExcel(data, langStats, locationStats) {
  // 创建工作簿
  const wb = XLSX.utils.book_new();
  
  // 按语言分组创建sheet
  const languages = [...new Set(data.map(item => item['语言']))];
  
  for (const lang of languages) {
    const langData = data.filter(item => item['语言'] === lang);
    
    if (langData.length > 0) {
      // 创建worksheet
      const ws = XLSX.utils.json_to_sheet(langData);
      
      // 设置列宽
      const colWidths = [
        { wch: 10 }, // 语言
        { wch: 25 }, // 位置
        { wch: 40 }, // TPL文件
        { wch: 30 }, // 匹配名称
        { wch: 100 }, // 完整路径
        { wch: 100 }  // URL
      ];
      ws['!cols'] = colWidths;
      
      // 将sheet添加到工作簿
      XLSX.utils.book_append_sheet(wb, ws, lang.toUpperCase());
    }
  }
  
  // 创建汇总sheet（所有缺失的文件）
  if (data.length > 0) {
    const summaryWs = XLSX.utils.json_to_sheet(data);
    const summaryColWidths = [
      { wch: 10 }, // 语言
      { wch: 25 }, // 位置
      { wch: 40 }, // TPL文件
      { wch: 30 }, // 匹配名称
      { wch: 100 }, // 完整路径
      { wch: 100 }  // URL
    ];
    summaryWs['!cols'] = summaryColWidths;
    XLSX.utils.book_append_sheet(wb, summaryWs, '所有缺失文件');
  }
  
  // 创建语言统计sheet
  const langStatsWs = XLSX.utils.json_to_sheet(langStats);
  langStatsWs['!cols'] = [
    { wch: 10 }, // 语言
    { wch: 20 }  // 缺失文件数
  ];
  XLSX.utils.book_append_sheet(wb, langStatsWs, '语言统计');
  
  // 创建位置统计sheet
  const locationStatsWs = XLSX.utils.json_to_sheet(locationStats);
  locationStatsWs['!cols'] = [
    { wch: 30 }, // 位置
    { wch: 20 }  // 缺失文件数
  ];
  XLSX.utils.book_append_sheet(wb, locationStatsWs, '位置统计');
  
  // 保存Excel文件
  const fileName = `missing_tpl_files_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
  
  console.log(`\n📁 结果已保存到: ${fileName}`);
}

// 运行主函数
main().catch(error => {
  console.error('❌ 程序执行失败:', error);
});