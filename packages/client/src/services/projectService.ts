import { Project } from '../types';
import { generateId } from '../utils/id';
import { isLoggedIn, getAuthHeaders } from './auth';

const STORAGE_KEY = 'canvasai_projects';

// ============ 本地存储函数（未登录用户） ============

function getLocalProjects(): Project[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function saveLocalProjects(projects: Project[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

// ============ 云端 API 函数（登录用户） ============

async function fetchCloudProjects(): Promise<Project[]> {
  try {
    const response = await fetch('/api/projects', {
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    if (data.success && data.data?.projects) {
      // 转换云端格式为前端格式
      return data.data.projects.map((p: any) => ({
        id: p.id,
        name: p.name,
        items: p.items || [],
        thumbnail: p.thumbnail,
        createdAt: new Date(p.created_at).getTime(),
        updatedAt: new Date(p.updated_at).getTime(),
        viewport: p.viewport || { scale: 1, pan: { x: 0, y: 0 } },
      }));
    }
    return [];
  } catch (error) {
    console.error('[ProjectService] 获取云端项目失败:', error);
    return [];
  }
}

async function fetchCloudProject(id: string): Promise<Project | null> {
  try {
    const response = await fetch(`/api/projects/${id}`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    if (data.success && data.data?.project) {
      const p = data.data.project;
      return {
        id: p.id,
        name: p.name,
        items: p.items || [],
        thumbnail: p.thumbnail,
        createdAt: new Date(p.created_at).getTime(),
        updatedAt: new Date(p.updated_at).getTime(),
        viewport: p.viewport || { scale: 1, pan: { x: 0, y: 0 } },
      };
    }
    return null;
  } catch (error) {
    console.error('[ProjectService] 获取云端项目详情失败:', error);
    return null;
  }
}

async function createCloudProject(name: string): Promise<Project | null> {
  try {
    const response = await fetch('/api/projects', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        name,
        items: [],
        viewport: { scale: 1, pan: { x: 0, y: 0 } },
      }),
    });
    const data = await response.json();
    if (data.success && data.data?.project) {
      const p = data.data.project;
      return {
        id: p.id,
        name: p.name,
        items: p.items || [],
        thumbnail: p.thumbnail,
        createdAt: new Date(p.created_at).getTime(),
        updatedAt: new Date(p.updated_at).getTime(),
        viewport: p.viewport || { scale: 1, pan: { x: 0, y: 0 } },
      };
    }
    return null;
  } catch (error) {
    console.error('[ProjectService] 创建云端项目失败:', error);
    return null;
  }
}

async function saveCloudProject(project: Project): Promise<boolean> {
  try {
    const response = await fetch(`/api/projects/${project.id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        name: project.name,
        items: project.items,
        viewport: project.viewport,
        thumbnail: project.thumbnail,
      }),
    });
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('[ProjectService] 保存云端项目失败:', error);
    return false;
  }
}

async function deleteCloudProject(id: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/projects/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('[ProjectService] 删除云端项目失败:', error);
    return false;
  }
}

async function duplicateCloudProject(id: string): Promise<Project | null> {
  try {
    const response = await fetch(`/api/projects/${id}/duplicate`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    if (data.success && data.data?.project) {
      const p = data.data.project;
      return {
        id: p.id,
        name: p.name,
        items: p.items || [],
        thumbnail: p.thumbnail,
        createdAt: new Date(p.created_at).getTime(),
        updatedAt: new Date(p.updated_at).getTime(),
        viewport: p.viewport || { scale: 1, pan: { x: 0, y: 0 } },
      };
    }
    return null;
  } catch (error) {
    console.error('[ProjectService] 复制云端项目失败:', error);
    return null;
  }
}

// ============ 统一接口（自动选择云端/本地） ============

/**
 * 获取所有项目
 */
export function getProjects(): Project[] {
  // 同步函数只能返回本地数据
  return getLocalProjects();
}

/**
 * 获取所有项目（异步版本，登录用户从云端获取）
 */
export async function getProjectsAsync(): Promise<Project[]> {
  if (isLoggedIn()) {
    return fetchCloudProjects();
  }
  return getLocalProjects();
}

/**
 * 获取单个项目
 */
export function getProject(id: string): Project | null {
  const projects = getLocalProjects();
  return projects.find(p => p.id === id) || null;
}

/**
 * 获取单个项目（异步版本）
 */
export async function getProjectAsync(id: string): Promise<Project | null> {
  if (isLoggedIn()) {
    return fetchCloudProject(id);
  }
  return getProject(id);
}

/**
 * 保存项目
 */
export function saveProject(project: Project): void {
  const projects = getLocalProjects();
  const index = projects.findIndex(p => p.id === project.id);

  // Generate thumbnail from first image if available
  if (project.items.length > 0 && !project.thumbnail) {
    const imageItem = project.items.find(item => item.type === 'image' && item.src);
    if (imageItem) {
      project.thumbnail = imageItem.src;
    }
  }

  project.updatedAt = Date.now();

  if (index >= 0) {
    projects[index] = project;
  } else {
    projects.unshift(project);
  }

  // 保存到本地
  saveLocalProjects(projects);

  // 如果登录了，同时保存到云端（异步，不阻塞）
  if (isLoggedIn()) {
    saveCloudProject(project).catch(err => {
      console.error('[ProjectService] 云端同步失败:', err);
    });
  }
}

/**
 * 创建项目
 */
export function createProject(name: string = '未命名画布'): Project {
  const project: Project = {
    id: generateId(),
    name,
    items: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    viewport: {
      scale: 1,
      pan: { x: 0, y: 0 }
    }
  };

  // 先保存到本地
  saveProject(project);

  // 如果登录了，同时创建到云端
  if (isLoggedIn()) {
    createCloudProject(name).then(cloudProject => {
      if (cloudProject) {
        // 更新本地项目 ID 为云端 ID
        const projects = getLocalProjects();
        const index = projects.findIndex(p => p.id === project.id);
        if (index >= 0) {
          projects[index].id = cloudProject.id;
          saveLocalProjects(projects);
          // 更新返回的项目 ID（但由于是同步函数，调用者可能已经使用了旧 ID）
          project.id = cloudProject.id;
        }
      }
    }).catch(err => {
      console.error('[ProjectService] 云端创建失败:', err);
    });
  }

  return project;
}

/**
 * 创建项目（异步版本，推荐登录用户使用）
 */
export async function createProjectAsync(name: string = '未命名画布'): Promise<Project> {
  if (isLoggedIn()) {
    const cloudProject = await createCloudProject(name);
    if (cloudProject) {
      // 同时保存到本地
      const projects = getLocalProjects();
      projects.unshift(cloudProject);
      saveLocalProjects(projects);
      return cloudProject;
    }
  }

  // 回退到本地创建
  return createProject(name);
}

/**
 * 删除项目
 */
export function deleteProject(id: string): void {
  const projects = getLocalProjects().filter(p => p.id !== id);
  saveLocalProjects(projects);

  // 如果登录了，同时从云端删除
  if (isLoggedIn()) {
    deleteCloudProject(id).catch(err => {
      console.error('[ProjectService] 云端删除失败:', err);
    });
  }
}

/**
 * 更新项目名称
 */
export function updateProjectName(id: string, name: string): void {
  const projects = getLocalProjects();
  const project = projects.find(p => p.id === id);
  if (project) {
    project.name = name;
    project.updatedAt = Date.now();
    saveLocalProjects(projects);

    // 如果登录了，同步到云端
    if (isLoggedIn()) {
      saveCloudProject(project).catch(err => {
        console.error('[ProjectService] 云端同步失败:', err);
      });
    }
  }
}

/**
 * 复制项目
 */
export function duplicateProject(id: string): Project | null {
  const original = getProject(id);
  if (!original) return null;

  const duplicate: Project = {
    ...original,
    id: generateId(),
    name: `${original.name} 副本`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  saveProject(duplicate);

  // 如果登录了，同时在云端复制
  if (isLoggedIn()) {
    duplicateCloudProject(id).catch(err => {
      console.error('[ProjectService] 云端复制失败:', err);
    });
  }

  return duplicate;
}

/**
 * 同步本地项目到云端（登录后调用）
 */
export async function syncLocalToCloud(): Promise<number> {
  if (!isLoggedIn()) return 0;

  const localProjects = getLocalProjects();
  let syncedCount = 0;

  for (const project of localProjects) {
    try {
      // 尝试在云端创建
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: project.name,
          items: project.items,
          viewport: project.viewport,
          thumbnail: project.thumbnail,
        }),
      });
      const data = await response.json();
      if (data.success) {
        syncedCount++;
      }
    } catch (error) {
      console.error('[ProjectService] 同步项目失败:', project.id, error);
    }
  }

  return syncedCount;
}
