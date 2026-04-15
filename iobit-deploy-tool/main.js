const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const simpleGit = require('simple-git');
const fs = require('fs').promises;
const fsSync = require('fs');
const Store = require('electron-store');
const Client = require('ssh2-sftp-client');

const store = new Store();

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();
});

// 在文件开头添加项目存储相关代码
const PROJECTS_KEY = 'projects';

// 获取所有项目
ipcMain.handle('get-all-projects', async () => {
  const projects = store.get(PROJECTS_KEY, {});
  return projects;
});

// 保存项目
ipcMain.handle('save-project', async (event, projectName, projectData) => {
  const projects = store.get(PROJECTS_KEY, {});
  projects[projectName] = {
    ...projectData,
    updatedAt: new Date().toISOString()
  };
  store.set(PROJECTS_KEY, projects);
  return { success: true };
});

// 删除项目
ipcMain.handle('delete-project', async (event, projectName) => {
  const projects = store.get(PROJECTS_KEY, {});
  delete projects[projectName];
  store.set(PROJECTS_KEY, projects);
  return { success: true };
});

// 获取单个项目
ipcMain.handle('get-project', async (event, projectName) => {
  const projects = store.get(PROJECTS_KEY, {});
  return projects[projectName] || null;
});

// ==================== 固定的配置（写在代码里） ====================

const fixedRepos = {
  "2018.iobit.com": "http://192.168.1.81/liuyuting/2018.iobit.com.git"
};

const fixedPathMapping = {
  "pc.makevideoclip.com": "/manage.vidnoz.com",
  "ar.makevideoclip.com": "/manage-ar.vidnoz.com",
  "de.makevideoclip.com": "/manage-de.vidnoz.com",
  "es.makevideoclip.com": "/manage-es.vidnoz.com",
  "fr.makevideoclip.com": "/manage-fr.vidnoz.com",
  "it.makevideoclip.com": "/manage-it.vidnoz.com",
  "jp.makevideoclip.com": "/manage-jp.vidnoz.com",
  "kr.makevideoclip.com": "/manage-kr.vidnoz.com",
  "nl.makevideoclip.com": "/manage-nl.vidnoz.com",
  "pt.makevideoclip.com": "/manage-pt.vidnoz.com",
  "ru.makevideoclip.com": "/manage-ru.vidnoz.com",
  "tr.makevideoclip.com": "/manage-tr.vidnoz.com",
  "tw.makevideoclip.com": "/manage-tw.vidnoz.com",
};

// ==================== IPC 处理 ====================

// 保存当前配置（保存到当前选中的项目）
ipcMain.handle('save-config', async (event, config) => {
  // 这个函数保留，用于临时保存，但建议用 save-project
  store.set('currentConfig', config);
  return { success: true };
});

// 获取当前配置
ipcMain.handle('load-config', async () => {
  return store.get('currentConfig', {
    basePath: '',
    repos: {},
    pathMapping: {},
    ftp: { host: '', port: 21, user: '', password: '', type: 'ftp' }
  });
});

// 克隆或拉取仓库
ipcMain.handle('clone-or-pull-repo', async (event, repoUrl, targetPath) => {
  try {
    const git = simpleGit();
    const exists = fsSync.existsSync(targetPath);
    
    if (!exists) {
      await git.clone(repoUrl, targetPath);
      return { success: true, message: `克隆成功: ${targetPath}` };
    } else {
      const repoGit = simpleGit(targetPath);
      await repoGit.pull();
      return { success: true, message: `拉取成功: ${targetPath}` };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 过滤Dev目录下的文件
function shouldExcludeFile(filePath) {
  const normalizedPath = filePath.replace(/\\/g, '/');
  if (normalizedPath.includes('/Dev/') || normalizedPath.includes('\\Dev\\')) {
    return true;
  }
  const fileName = path.basename(filePath);
  if (fileName.startsWith('.dev.') || fileName.includes('.dev.')) {
    return true;
  }
  return false;
}

// 扫描指定仓库
ipcMain.handle('scan-repos-by-commits', async (event, repos, commitIdsMap, pathMapping) => {
  const allFiles = [];
  const repoStatus = [];
  
  for (const [repoName, repoPath] of Object.entries(repos)) {
    const commitIds = commitIdsMap[repoName] || '';
    
    if (!commitIds || !commitIds.trim()) {
      repoStatus.push({
        repoName,
        skipped: true,
        message: '未提供Commit ID，已跳过'
      });
      continue;
    }
    
    try {
      const git = simpleGit(repoPath);
      const allFilesSet = new Set();
      const commitList = commitIds.split(',').map(id => id.trim());
      
      for (const commitId of commitList) {
        if (!commitId) continue;
        try {
          const diffResult = await git.diff(['--name-only', `${commitId}^`, commitId]);
          const diffFiles = diffResult.split('\n').filter(f => f.trim());
          diffFiles.forEach(f => allFilesSet.add(f));
        } catch (e) {
          const showResult = await git.show(['--name-only', '--format=', commitId]);
          const showFiles = showResult.split('\n').filter(f => f.trim());
          showFiles.forEach(f => allFilesSet.add(f));
        }
      }
      
      let files = Array.from(allFilesSet);
      const originalCount = files.length;
      files = files.filter(f => !shouldExcludeFile(f));
      
      const branchInfo = await git.branch();
      const log = await git.log({ maxCount: 1 });
      
      const remoteBasePath = pathMapping[repoName] || `/html/${repoName.replace('.makevideoclip.com', '')}-test.vidnoz.com`;
      
      files.forEach(f => {
        // 去掉 templates/new-template/ 前缀
        let relativePath = f.replace(/\\/g, '/');
        if (relativePath.startsWith('templates/new-template/')) {
          relativePath = relativePath.substring('templates/new-template/'.length);
        }
        
        const remotePath = `${remoteBasePath}/${relativePath}`.replace(/\\/g, '/');
        
        allFiles.push({
          path: f,
          fullPath: path.join(repoPath, f),
          repoName,
          lang: repoName.replace('.makevideoclip.com', ''),
          remotePath: remotePath,
          remoteDir: remotePath.substring(0, remotePath.lastIndexOf('/'))
        });
      });
      
      repoStatus.push({
        repoName,
        branch: branchInfo.current,
        commit: log.latest ? log.latest.hash.substring(0, 7) : '',
        fileCount: files.length,
        filteredCount: originalCount - files.length,
        commitIds: commitIds
      });
      
    } catch (error) {
      repoStatus.push({
        repoName,
        error: error.message,
        fileCount: 0,
        commitIds: commitIds
      });
    }
  }
  
  return { success: true, files: allFiles, repoStatus };
});

// SFTP/FTP上传
ipcMain.handle('upload-to-server', async (event, ftpConfig, files) => {
  let client = null;
  
  try {
    if (ftpConfig.type === 'sftp') {
      const SFTPClient = require('ssh2-sftp-client');
      client = new SFTPClient();
      
      await client.connect({
        host: ftpConfig.host,
        port: ftpConfig.port || 22,
        username: ftpConfig.user,
        password: ftpConfig.password
      });
    } else {
      const ftp = require('basic-ftp');
      client = new ftp.Client();
      client.ftp.verbose = true;
      
      await client.access({
        host: ftpConfig.host,
        port: ftpConfig.port || 21,
        user: ftpConfig.user,
        password: ftpConfig.password,
        secure: ftpConfig.secure || false
      });
    }
    
    const results = [];
    let current = 0;
    
    for (const file of files) {
      try {
        const remotePath = file.remotePath;
        const remoteDir = file.remoteDir;
        
        if (ftpConfig.type === 'sftp') {
          await client.mkdir(remoteDir, true);
          await client.put(file.fullPath, remotePath);
        } else {
          await client.ensureDir(remoteDir);
          await client.uploadFrom(file.fullPath, remotePath);
        }
        
        results.push({
          file: `${file.repoName}/${file.path}`,
          remotePath: remotePath,
          success: true,
          message: '上传成功'
        });
      } catch (err) {
        results.push({
          file: `${file.repoName}/${file.path}`,
          remotePath: file.remotePath,
          success: false,
          message: err.message
        });
      }
      
      current++;
      event.sender.send('upload-progress', {
        current,
        total: files.length,
        percent: (current / files.length) * 100
      });
    }
    
    if (ftpConfig.type === 'sftp') {
      await client.end();
    } else {
      client.close();
    }
    
    return { success: true, results };
  } catch (error) {
    if (client) {
      if (ftpConfig.type === 'sftp') {
        try { await client.end(); } catch(e) {}
      } else {
        try { client.close(); } catch(e) {}
      }
    }
    return { success: false, error: error.message };
  }
});

// 添加自定义文件
ipcMain.handle('add-custom-file', async (event, basePath, repoName, filePath, pathMapping) => {
  try {
    const fullLocalPath = path.join(basePath, repoName, filePath);
    const exists = fsSync.existsSync(fullLocalPath);
    
    if (shouldExcludeFile(filePath)) {
      return { success: false, error: 'Dev目录下的文件不能添加' };
    }
    
    const remoteBasePath = pathMapping[repoName] || `/html/${repoName.replace('.makevideoclip.com', '')}-test.vidnoz.com`;
    
    // 去掉 templates/new-template/ 前缀
    let cleanPath = filePath.replace(/\\/g, '/');
    if (cleanPath.startsWith('templates/new-template/')) {
      cleanPath = cleanPath.substring('templates/new-template/'.length);
    }
    
    const remotePath = `${remoteBasePath}/${cleanPath}`.replace(/\\/g, '/');
    
    return {
      success: true,
      file: {
        path: filePath,
        fullPath: fullLocalPath,
        repoName: repoName,
        lang: repoName.replace('.makevideoclip.com', ''),
        remotePath: remotePath,
        remoteDir: remotePath.substring(0, remotePath.lastIndexOf('/')),
        exists: exists,
        isCustom: true
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 获取目录结构
ipcMain.handle('get-repo-structure', async (event, repoPath, relativePath = '') => {
  try {
    const targetPath = path.join(repoPath, relativePath);
    const items = await fs.readdir(targetPath, { withFileTypes: true });
    
    const result = [];
    for (const item of items) {
      const itemPath = path.join(relativePath, item.name);
      
      if (item.name === 'Dev' || itemPath.includes('/Dev/') || itemPath.includes('\\Dev\\')) {
        continue;
      }
      
      if (item.isDirectory()) {
        result.push({
          name: item.name,
          type: 'directory',
          path: itemPath.replace(/\\/g, '/')
        });
      } else {
        result.push({
          name: item.name,
          type: 'file',
          path: itemPath.replace(/\\/g, '/')
        });
      }
    }
    
    return { success: true, items: result };
  } catch (error) {
    return { success: false, error: error.message, items: [] };
  }
});