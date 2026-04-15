const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // 配置管理
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  loadConfig: () => ipcRenderer.invoke('load-config'),
  
  // 仓库操作
  cloneOrPullRepo: (repoUrl, targetPath) => ipcRenderer.invoke('clone-or-pull-repo', repoUrl, targetPath),
  scanReposByCommits: (repos, commitIdsMap, pathMapping) => ipcRenderer.invoke('scan-repos-by-commits', repos, commitIdsMap, pathMapping),
  
  // 上传
  uploadToServer: (ftpConfig, files) => ipcRenderer.invoke('upload-to-server', ftpConfig, files),
  
  // 添加自定义文件
  addCustomFile: (basePath, repoName, filePath, pathMapping) => ipcRenderer.invoke('add-custom-file', basePath, repoName, filePath, pathMapping),
  
  // 获取目录结构
  getRepoStructure: (repoPath, relativePath) => ipcRenderer.invoke('get-repo-structure', repoPath, relativePath),
  
  // 事件监听
  onUploadProgress: (callback) => ipcRenderer.on('upload-progress', (event, data) => callback(data)),

  // 新增项目管理接口
  getAllProjects: () => ipcRenderer.invoke('get-all-projects'),
  saveProject: (name, data) => ipcRenderer.invoke('save-project', name, data),
  deleteProject: (name) => ipcRenderer.invoke('delete-project', name),
  getProject: (name) => ipcRenderer.invoke('get-project', name)
});