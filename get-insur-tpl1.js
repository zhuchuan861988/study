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

// 获取语言代码
function getLanguageCode(folderName) {
  const code = folderName.split('.')[0];
  return code === 'pc' ? 'en' : code; // pc视为英语
}

// 递归获取目录下的所有tpl文件（仅一级目录）
async function getTplFiles(dirPath) {
  try {
    const files = await fs.readdir(dirPath);
    const tplFiles = [];
    
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stat = await fs.stat(filePath);
      
      // 只检查文件，不进入子目录
      if (stat.isFile() && file.endsWith('.tpl')) {
        tplFiles.push(file);
      }
    }
    
    return tplFiles;
  } catch (error) {
    console.error(`读取目录失败 ${dirPath}:`, error.message);
    return [];
  }
}

// 读取common.js文件内容
async function getCommonJsContent(jsPath) {
  try {
    return await fs.readFile(jsPath, 'utf8');
  } catch (error) {
    console.error(`读取common.js失败 ${jsPath}:`, error.message);
    return '';
  }
}

// 检查tpl文件名是否在common.js中
function isTplInCommonJs(tplFile, commonJsContent) {
  // 移除.tpl后缀
  const tplName = tplFile.replace('.tpl', '');
  return commonJsContent.includes(tplName);
}

// 主函数
async function main() {
  const results = [];
  
  for (const folder of languageFolders) {
    const languageCode = getLanguageCode(folder);
    console.log(`正在处理 ${folder} (${languageCode})...`);
    
    const tplPath = path.join(folder, 'templates', 'new-template', 'tpl');
    const jsPath = path.join(folder, 'templates', 'new-template', 'Dev', 'js', 'common.js');
    
    // 检查路径是否存在
    try {
      await fs.access(tplPath);
    } catch (error) {
      console.warn(`警告: ${tplPath} 不存在，跳过`);
      continue;
    }
    
    // 获取tpl文件列表
    const tplFiles = await getTplFiles(tplPath);
    
    // 获取common.js内容
    const commonJsContent = await getCommonJsContent(jsPath);
    
    // 检查每个tpl文件
    for (const tplFile of tplFiles) {
      const isInCommonJs = isTplInCommonJs(tplFile, commonJsContent);
      
      results.push({
        '语言': languageCode,
        '文件夹': folder,
        'TPL文件': tplFile,
        '在common.js中': isInCommonJs ? '是' : '否',
        'TPL路径': path.join(tplPath, tplFile),
        'common.js路径': jsPath
      });
    }
  }
  
  // 生成Excel文件
  generateExcel(results);
}

// 生成Excel文件
function generateExcel(data) {
  // 创建工作簿
  const wb = XLSX.utils.book_new();
  
  // 按语言分组
  const languages = [...new Set(data.map(item => item['语言']))];
  
  // 为每种语言创建一个sheet
  for (const lang of languages) {
    const langData = data.filter(item => item['语言'] === lang);
    
    // 创建worksheet
    const ws = XLSX.utils.json_to_sheet(langData);
    
    // 设置列宽
    const colWidths = [
      { wch: 10 }, // 语言
      { wch: 25 }, // 文件夹
      { wch: 30 }, // TPL文件
      { wch: 15 }, // 在common.js中
      { wch: 50 }, // TPL路径
      { wch: 50 }  // common.js路径
    ];
    ws['!cols'] = colWidths;
    
    // 将sheet添加到工作簿
    XLSX.utils.book_append_sheet(wb, ws, lang);
  }
  
  // 创建汇总sheet
  const summaryWs = XLSX.utils.json_to_sheet(data);
  const summaryColWidths = [
    { wch: 10 }, // 语言
    { wch: 25 }, // 文件夹
    { wch: 30 }, // TPL文件
    { wch: 15 }, // 在common.js中
    { wch: 50 }, // TPL路径
    { wch: 50 }  // common.js路径
  ];
  summaryWs['!cols'] = summaryColWidths;
  XLSX.utils.book_append_sheet(wb, summaryWs, '汇总');
  
  // 生成统计sheet
  const stats = languages.map(lang => {
    const langData = data.filter(item => item['语言'] === lang);
    const total = langData.length;
    const inJs = langData.filter(item => item['在common.js中'] === '是').length;
    const notInJs = langData.filter(item => item['在common.js中'] === '否').length;
    
    return {
      '语言': lang,
      '总TPL文件数': total,
      '在common.js中': inJs,
      '不在common.js中': notInJs,
      '覆盖率': total > 0 ? `${((inJs / total) * 100).toFixed(2)}%` : '0%'
    };
  });
  
  const statsWs = XLSX.utils.json_to_sheet(stats);
  statsWs['!cols'] = [
    { wch: 10 }, // 语言
    { wch: 15 }, // 总TPL文件数
    { wch: 15 }, // 在common.js中
    { wch: 15 }, // 不在common.js中
    { wch: 10 }  // 覆盖率
  ];
  XLSX.utils.book_append_sheet(wb, statsWs, '统计');
  
  // 保存Excel文件
  const fileName = `tpl_check_result_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
  
  console.log(`\n✅ 完成！结果已保存到: ${fileName}`);
  console.log(`📊 总共检查了 ${data.length} 个TPL文件`);
  
  // 打印简要统计
  const statsData = languages.map(lang => {
    const langData = data.filter(item => item['语言'] === lang);
    const inJs = langData.filter(item => item['在common.js中'] === '是').length;
    return `${lang}: ${langData.length}个文件，${inJs}个在common.js中`;
  });
  console.log('\n📈 按语言统计:');
  statsData.forEach(stat => console.log(`   ${stat}`));
}

// 安装依赖提示
console.log('📦 请确保已安装依赖: npm install xlsx\n');

// 运行主函数
main().catch(error => {
  console.error('❌ 程序执行失败:', error);
});