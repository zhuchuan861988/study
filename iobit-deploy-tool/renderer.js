let currentConfig = null;
let currentFiles = [];

// DOM 元素
const basePathInput = document.getElementById('base-path');
const reposConfigTextarea = document.getElementById('repos-config');
const pathMappingTextarea = document.getElementById('path-mapping');
const ftpTypeSelect = document.getElementById('ftp-type');
const ftpHostInput = document.getElementById('ftp-host');
const ftpPortInput = document.getElementById('ftp-port');
const ftpUserInput = document.getElementById('ftp-user');
const ftpPasswordInput = document.getElementById('ftp-password');
const fileCountSpan = document.getElementById('file-count');
const uploadBtn = document.getElementById('upload-btn');
const scanWithCommitBtn = document.getElementById('scan-with-commit-btn');
const cloneAllBtn = document.getElementById('clone-all-btn');
const clearLogBtn = document.getElementById('clear-log-btn');
const logArea = document.getElementById('log-area');
const progressBar = document.getElementById('progress-bar');
const progressFill = document.getElementById('progress-fill');
const repoListDiv = document.getElementById('repo-list');

// JSON 编辑器相关
const fileJsonEditor = document.getElementById('file-json-editor');
const applyFileListBtn = document.getElementById('apply-file-list-btn');
const refreshFileListBtn = document.getElementById('refresh-file-list-btn');
const formatJsonBtn = document.getElementById('format-json-btn');

// 添加日志
function addLog(message, type = 'info') {
  const logEntry = document.createElement('div');
  logEntry.className = `log-entry log-${type}`;
  logEntry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
  logArea.appendChild(logEntry);
  logEntry.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// 清空日志
if (clearLogBtn) {
  clearLogBtn.addEventListener('click', () => {
    logArea.innerHTML = '<div class="log-entry log-info">日志已清空</div>';
  });
}

// 将 currentFiles 转换为 JSON 格式
function filesToJson(files) {
  const jsonObj = {};
  files.forEach(file => {
    if (!jsonObj[file.repoName]) {
      jsonObj[file.repoName] = [];
    }
    jsonObj[file.repoName].push(file.path);
  });
  return jsonObj;
}

// 将 JSON 格式转换为 currentFiles
async function jsonToFiles(jsonObj) {
  const newFiles = [];
  const basePath = currentConfig.basePath;
  const pathMapping = currentConfig.pathMapping || {};
  
  for (const [repoName, filePaths] of Object.entries(jsonObj)) {
    if (!Array.isArray(filePaths)) {
      addLog(`警告：${repoName} 的值不是数组，已跳过`, 'error');
      continue;
    }
    
    const repoPath = `${basePath}/${repoName}`;
    const remoteBasePath = pathMapping[repoName] || `/html/${repoName.replace('.makevideoclip.com', '')}-test.vidnoz.com`;
    
    for (const filePath of filePaths) {
      let cleanPath = filePath.replace(/\\/g, '/');
      let remoteCleanPath = cleanPath;
      if (remoteCleanPath.startsWith('templates/new-template/')) {
        remoteCleanPath = remoteCleanPath.substring('templates/new-template/'.length);
      }
      const remotePath = `${remoteBasePath}/${remoteCleanPath}`.replace(/\\/g, '/');
      
      newFiles.push({
        path: filePath,
        fullPath: `${repoPath}/${filePath}`.replace(/\\/g, '/'),
        repoName: repoName,
        remotePath: remotePath,
        remoteDir: remotePath.substring(0, remotePath.lastIndexOf('/')),
        isCustom: true
      });
    }
  }
  
  return newFiles;
}

// 更新 JSON 编辑器内容
function updateJsonEditor() {
  if (fileJsonEditor && currentFiles.length > 0) {
    const jsonObj = filesToJson(currentFiles);
    fileJsonEditor.value = JSON.stringify(jsonObj, null, 2);
  }
}

// 显示文件统计信息
function displayFilesCompact(files) {
  if (!files || files.length === 0) {
    fileCountSpan.textContent = '0个文件';
    if (uploadBtn) uploadBtn.disabled = true;
    return;
  }
  const jsonObj = filesToJson(files);
  const summary = Object.keys(jsonObj).map(k => `${k}:${jsonObj[k].length}个`).join(', ');
  addLog(`当前文件列表: ${summary}`, 'info');
  fileCountSpan.textContent = `${files.length}个文件`;
  if (uploadBtn) uploadBtn.disabled = false;  // 🔧 启用上传按钮
}


// 渲染仓库列表
function renderRepoList() {
  if (!currentConfig || !currentConfig.repos) {
    repoListDiv.innerHTML = '<div style="text-align: center; padding: 20px; color: #999; grid-column: 1/-1;">请先加载配置</div>';
    return;
  }
  
  const repos = currentConfig.repos;
  let html = '';
  for (const [repoName] of Object.entries(repos)) {
    html += `
      <div class="repo-card" data-repo="${repoName}">
        <div class="repo-name">📁 ${repoName}</div>
        <div class="repo-status" id="status-${repoName.replace(/\./g, '-')}">状态：待检测</div>
        <input type="text" class="repo-commit-input" id="commit-${repoName.replace(/\./g, '-')}" placeholder="输入Commit ID（多个用逗号分隔）">
      </div>
    `;
  }
  repoListDiv.innerHTML = html;
}

// 克隆/更新所有仓库
if (cloneAllBtn) {
  cloneAllBtn.addEventListener('click', async () => {
    if (!currentConfig || !currentConfig.repos) {
      addLog('请先加载配置', 'error');
      return;
    }
    
    const basePath = currentConfig.basePath;
    if (!basePath) {
      addLog('请设置基础存放路径', 'error');
      return;
    }
    
    const repos = currentConfig.repos;
    addLog(`开始处理 ${Object.keys(repos).length} 个仓库...`, 'info');
    
    for (const [repoName, repoUrl] of Object.entries(repos)) {
      const targetPath = `${basePath}/${repoName}`;
      addLog(`正在处理: ${repoName}...`, 'info');
      const result = await window.electronAPI.cloneOrPullRepo(repoUrl, targetPath);
      if (result.success) {
        addLog(`✅ ${repoName}: ${result.message}`, 'success');
        const statusElem = document.getElementById(`status-${repoName.replace(/\./g, '-')}`);
        if (statusElem) statusElem.innerHTML = '状态：✅ 已就绪';
      } else {
        addLog(`❌ ${repoName}: ${result.error}`, 'error');
        const statusElem = document.getElementById(`status-${repoName.replace(/\./g, '-')}`);
        if (statusElem) statusElem.innerHTML = '状态：❌ 失败';
      }
    }
    addLog('所有仓库处理完成', 'success');
  });
}

// 获取所有仓库的Commit IDs
function getCommitIdsMap() {
  const commitIdsMap = {};
  if (!currentConfig || !currentConfig.repos) return commitIdsMap;
  
  for (const repoName of Object.keys(currentConfig.repos)) {
    const inputId = `commit-${repoName.replace(/\./g, '-')}`;
    const input = document.getElementById(inputId);
    if (input && input.value.trim()) {
      commitIdsMap[repoName] = input.value.trim();
    }
  }
  return commitIdsMap;
}

// 扫描有Commit ID的仓库
if (scanWithCommitBtn) {
  scanWithCommitBtn.addEventListener('click', async () => {
    if (!currentConfig || !currentConfig.repos) {
      addLog('请先加载配置', 'error');
      return;
    }
    
    const basePath = currentConfig.basePath;
    if (!basePath) {
      addLog('请设置基础存放路径', 'error');
      return;
    }
    
    const commitIdsMap = getCommitIdsMap();
    const hasCommit = Object.values(commitIdsMap).some(v => v && v.trim());
    
    if (!hasCommit) {
      addLog('请至少填写一个仓库的Commit ID', 'error');
      return;
    }
    
    const repos = {};
    for (const [repoName] of Object.entries(currentConfig.repos)) {
      repos[repoName] = `${basePath}/${repoName}`;
    }
    
    const pathMapping = currentConfig.pathMapping || {};
    
    addLog(`开始扫描有Commit ID的仓库...`, 'info');
    
    const result = await window.electronAPI.scanReposByCommits(repos, commitIdsMap, pathMapping);
    
    if (result.success) {
      // 将扫描结果存入临时变量
      const scannedFiles = result.files;
      
      // 显示到 JSON 编辑器
      const jsonObj = filesToJson(scannedFiles);
      fileJsonEditor.value = JSON.stringify(jsonObj, null, 2);
      
      // 清空 currentFiles，强制用户点击"应用文件列表"
      currentFiles = [];
      displayFilesCompact(currentFiles);
      
      let totalFiles = scannedFiles.length;
      let filteredInfo = '';
      result.repoStatus.forEach(s => {
        if (s.filteredCount > 0) {
          filteredInfo += ` ${s.repoName}过滤了${s.filteredCount}个Dev文件；`;
        }
      });
      
      addLog(`扫描完成，共发现 ${totalFiles} 个修改文件${filteredInfo ? '（' + filteredInfo + '）' : ''}`, 'success');
      addLog(`请在JSON编辑器中确认文件列表后，点击"应用文件列表"按钮`, 'info');
      
      for (const status of result.repoStatus) {
        const statusElem = document.getElementById(`status-${status.repoName.replace(/\./g, '-')}`);
        if (statusElem) {
          if (status.skipped) {
            statusElem.innerHTML = `状态：⏭️ ${status.message}`;
          } else if (status.error) {
            statusElem.innerHTML = `状态：❌ ${status.error}`;
          } else {
            statusElem.innerHTML = `状态：✅ ${status.branch} | ${status.commit} | ${status.fileCount}个文件修改 | 过滤Dev:${status.filteredCount}个 | Commit: ${status.commitIds}`;
          }
        }
      }
    } else {
      addLog(`扫描失败：${result.error}`, 'error');
    }
  });
}

// 应用文件列表（从 JSON 编辑器加载）
if (applyFileListBtn) {
  applyFileListBtn.addEventListener('click', async () => {
    try {
      const jsonContent = fileJsonEditor.value.trim();
      if (!jsonContent) {
        addLog('请先在编辑器中输入JSON格式的文件列表', 'error');
        return;
      }
      
      const jsonObj = JSON.parse(jsonContent);
      const newFiles = await jsonToFiles(jsonObj);
      
      if (newFiles.length === 0) {
        addLog('没有有效的文件', 'error');
        return;
      }
      
      currentFiles = newFiles;
      displayFilesCompact(currentFiles);
      
      addLog(`✅ 已应用文件列表，共 ${currentFiles.length} 个文件，现在可以点击"开始上传"了`, 'success');
      
    } catch (error) {
      addLog(`JSON解析失败：${error.message}`, 'error');
    }
  });
}

// 从扫描结果刷新（将当前文件列表显示到编辑器）
if (refreshFileListBtn) {
  refreshFileListBtn.addEventListener('click', () => {
    if (currentFiles.length === 0) {
      addLog('当前没有文件列表，请先扫描或应用文件列表', 'error');
      return;
    }
    updateJsonEditor();
    addLog('已从当前文件列表刷新编辑器内容', 'success');
  });
}

// 格式化 JSON
if (formatJsonBtn) {
  formatJsonBtn.addEventListener('click', () => {
    try {
      const jsonContent = fileJsonEditor.value.trim();
      if (!jsonContent) return;
      const jsonObj = JSON.parse(jsonContent);
      fileJsonEditor.value = JSON.stringify(jsonObj, null, 2);
      addLog('JSON已格式化', 'success');
    } catch (error) {
      addLog(`JSON格式化失败：${error.message}`, 'error');
    }
  });
}

// 上传进度监听
if (window.electronAPI && window.electronAPI.onUploadProgress) {
  window.electronAPI.onUploadProgress((data) => {
    if (progressFill) progressFill.style.width = `${data.percent}%`;
  });
}

// 上传文件
if (uploadBtn) {
  uploadBtn.addEventListener('click', async () => {
    // 检查是否已应用文件列表
    if (!currentFiles || currentFiles.length === 0) {
      addLog('❌ 请先在JSON编辑器中确认文件列表，然后点击"应用文件列表"按钮', 'error');
      alert('请先在JSON编辑器中确认文件列表，然后点击"应用文件列表"按钮');
      return;
    }
    
    if (!currentConfig || !currentConfig.ftp || !currentConfig.ftp.host) {
      addLog('请先配置FTP/SFTP信息并保存配置', 'error');
      alert('请先配置FTP/SFTP信息并保存配置');
      return;
    }
    
    if (progressBar) progressBar.style.display = 'block';
    if (progressFill) progressFill.style.width = '0%';
    
    const protocol = currentConfig.ftp.type === 'sftp' ? 'SFTP' : 'FTP';
    addLog(`开始上传 ${currentFiles.length} 个文件到 ${protocol}服务器 ${currentConfig.ftp.host}...`, 'info');
    
    const result = await window.electronAPI.uploadToServer(currentConfig.ftp, currentFiles);
    
    if (result.success) {
      let successCount = 0;
      let failCount = 0;
      result.results.forEach(r => {
        if (r.success) {
          successCount++;
          addLog(`✅ ${r.file} -> ${r.remotePath} - 上传成功`, 'success');
        } else {
          failCount++;
          addLog(`❌ ${r.file} - 上传失败：${r.message}`, 'error');
        }
      });
      addLog(`上传完成：成功 ${successCount} 个，失败 ${failCount} 个`, successCount > 0 ? 'success' : 'error');
    } else {
      addLog(`上传失败：${result.error}`, 'error');
    }
    
    setTimeout(() => {
      if (progressBar) progressBar.style.display = 'none';
      if (progressFill) progressFill.style.width = '0%';
    }, 1000);
  });
}

// FTP类型切换时更新默认端口
if (ftpTypeSelect) {
  ftpTypeSelect.addEventListener('change', () => {
    if (ftpPortInput) {
      if (ftpTypeSelect.value === 'sftp') {
        if (ftpPortInput.value === '21') ftpPortInput.value = '22';
      } else {
        if (ftpPortInput.value === '22') ftpPortInput.value = '21';
      }
    }
  });
}

// ==================== 项目配置管理 ====================

const projectSelect = document.getElementById('project-select');
const newProjectName = document.getElementById('new-project-name');
const saveProjectBtn = document.getElementById('save-project-btn');
const loadProjectBtn = document.getElementById('load-project-btn');
const deleteProjectBtn = document.getElementById('delete-project-btn');
const projectDesc = document.getElementById('project-desc');

// 加载项目列表
async function loadProjectList() {
  const projects = await window.electronAPI.getAllProjects();
  projectSelect.innerHTML = '<option value="">-- 选择项目 --</option>';
  for (const [name, data] of Object.entries(projects)) {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = `${name}${data.updatedAt ? ` (${new Date(data.updatedAt).toLocaleDateString()})` : ''}`;
    projectSelect.appendChild(option);
  }
}

// 保存当前配置到项目
if (saveProjectBtn) {
  saveProjectBtn.addEventListener('click', async () => {
    const projectName = newProjectName.value.trim();
    if (!projectName) {
      addLog('请输入项目名称', 'error');
      alert('请输入项目名称');
      return;
    }
    
    // 收集当前所有配置
    const projectData = {
      basePath: basePathInput.value,
      repos: JSON.parse(reposConfigTextarea.value || '{}'),
      pathMapping: JSON.parse(pathMappingTextarea.value || '{}'),
      ftp: {
        type: ftpTypeSelect.value,
        host: ftpHostInput.value,
        port: parseInt(ftpPortInput.value) || (ftpTypeSelect.value === 'sftp' ? 22 : 21),
        user: ftpUserInput.value,
        password: ftpPasswordInput.value
      },
      desc: projectDesc.value
    };
    
    await window.electronAPI.saveProject(projectName, projectData);
    addLog(`✅ 项目 "${projectName}" 保存成功`, 'success');
    localStorage.setItem('lastProject', projectName);
    await loadProjectList();
    
    // 自动选中刚保存的项目
    projectSelect.value = projectName;
    newProjectName.value = '';
  });
}

// 加载选中的项目
if (loadProjectBtn) {
  loadProjectBtn.addEventListener('click', async () => {
    const projectName = projectSelect.value;
    if (!projectName) {
      addLog('请先选择一个项目', 'error');
      return;
    }
    
    const project = await window.electronAPI.getProject(projectName);
    if (project) {
      // 应用项目配置到界面
      basePathInput.value = project.basePath || '';
      ftpTypeSelect.value = project.ftp?.type || 'ftp';
      ftpHostInput.value = project.ftp?.host || '';
      ftpPortInput.value = project.ftp?.port || 21;
      ftpUserInput.value = project.ftp?.user || '';
      ftpPasswordInput.value = project.ftp?.password || '';
      reposConfigTextarea.value = JSON.stringify(project.repos || {}, null, 2);
      pathMappingTextarea.value = JSON.stringify(project.pathMapping || {}, null, 2);
      projectDesc.value = project.desc || '';
      
      // 更新 currentConfig
      currentConfig = {
        basePath: project.basePath || '',
        repos: project.repos || {},
        pathMapping: project.pathMapping || {},
        ftp: project.ftp || { host: '', port: 21, user: '', password: '', type: 'ftp' }
      };
      
      addLog(`✅ 已加载项目 "${projectName}"`, 'success');
      renderRepoList();
    } else {
      addLog(`项目 "${projectName}" 不存在`, 'error');
    }
  });
}

// 删除项目
if (deleteProjectBtn) {
  deleteProjectBtn.addEventListener('click', async () => {
    const projectName = projectSelect.value;
    if (!projectName) {
      addLog('请先选择一个项目', 'error');
      return;
    }
    
    if (confirm(`确定要删除项目 "${projectName}" 吗？`)) {
      await window.electronAPI.deleteProject(projectName);
      addLog(`✅ 项目 "${projectName}" 已删除`, 'success');
      await loadProjectList();
      projectSelect.value = '';
    }
  });
}


// 页面加载时自动加载上次使用的项目
async function loadLastProject() {
  const projects = await window.electronAPI.getAllProjects();
  const projectNames = Object.keys(projects);
  if (projectNames.length > 0) {
    // 可以保存上次使用的项目名到 store，或者直接加载第一个
    const lastProject = localStorage.getItem('lastProject');
    if (lastProject && projects[lastProject]) {
      projectSelect.value = lastProject;
      loadProjectBtn.click();
    } else if (projectNames.length > 0) {
      projectSelect.value = projectNames[0];
      loadProjectBtn.click();
    }
  }
}
// 页面加载时加载项目列表
loadProjectList();

// 页面加载时调用
loadLastProject();
