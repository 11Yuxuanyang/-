import { useState, useEffect } from 'react';
import { HomePage } from './components/HomePage';
import { CanvasEditor } from './components/CanvasEditor';
import { Project } from './types';
import * as ProjectService from './services/projectService';
import { isLoggedIn, getUser, logout, User, isAdmin } from './services/auth';
import { AdminApp } from './components/admin/AdminApp';

export default function App() {
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [route, setRoute] = useState<string>(window.location.hash.slice(1));
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // 检查登录状态（不自动弹出登录弹窗，让用户先浏览首页）
  useEffect(() => {
    const checkAuth = () => {
      if (isLoggedIn()) {
        const savedUser = getUser();
        setUser(savedUser);
      } else {
        setUser(null);
      }
      setAuthChecked(true);
    };
    checkAuth();
  }, []);

  // 登录成功回调
  const handleLoginSuccess = (loggedInUser: User) => {
    setUser(loggedInUser);
  };

  // 退出登录
  const handleLogout = () => {
    logout();
    setUser(null);
    window.location.hash = '';
  };

  // 解析路由
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1); // 去掉 #
      setRoute(hash);

      // 如果是项目页面，加载项目
      if (hash.startsWith('/project/')) {
        const projectId = hash.replace('/project/', '');
        const project = ProjectService.getProject(projectId);
        if (project) {
          setCurrentProject(project);
        } else {
          // 项目不存在，回到首页
          window.location.hash = '';
          setCurrentProject(null);
        }
      } else {
        setCurrentProject(null);
      }
    };

    // 初始化
    handleHashChange();

    // 监听路由变化
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // 返回首页
  const handleBack = () => {
    window.location.hash = '';
  };

  // 等待认证检查完成
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-500 text-xl">加载中...</div>
      </div>
    );
  }

  // 渲染管理后台（需要管理员权限）
  if (route.startsWith('/admin')) {
    if (!user || !isAdmin(user)) {
      // 非管理员回到首页
      window.location.hash = '';
      return (
        <HomePage
          onOpenProject={() => {}}
          onCreateProject={() => {}}
          onLogout={handleLogout}
          user={user}
          onLoginSuccess={handleLoginSuccess}
        />
      );
    }
    return <AdminApp user={user} onLogout={handleLogout} />;
  }

  // 渲染编辑器页面（需要登录）
  if (route.startsWith('/project/') && currentProject) {
    if (!user) {
      // 未登录时回到首页并显示登录弹窗
      window.location.hash = '';
    }
    return (
      <CanvasEditor
        key={currentProject.id}
        project={currentProject}
        onBack={handleBack}
        onLogout={handleLogout}
        user={user}
      />
    );
  }

  // 渲染首页 - 登录弹窗由 HomePage 内部按需触发
  return (
    <HomePage
      onOpenProject={() => {}}
      onCreateProject={() => {}}
      onLogout={handleLogout}
      user={user}
      onLoginSuccess={handleLoginSuccess}
    />
  );
}
