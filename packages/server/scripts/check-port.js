import net from 'net';
import { execSync } from 'child_process';

const PORT = process.env.PORT || 3001;
const isWindows = process.platform === 'win32';

/**
 * 检查端口是否被占用
 */
function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(true);
      } else {
        resolve(false);
      }
    });

    server.once('listening', () => {
      server.close();
      resolve(false);
    });

    server.listen(port);
  });
}

/**
 * 查找占用端口的进程 ID
 */
function findProcessOnPort(port) {
  try {
    if (isWindows) {
      // Windows: netstat -ano | findstr :<PORT>
      const output = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf-8' });
      const lines = output.trim().split('\n');

      for (const line of lines) {
        if (line.includes('LISTENING')) {
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          return pid;
        }
      }
    } else {
      // Unix: lsof -ti:PORT
      const output = execSync(`lsof -ti:${port}`, { encoding: 'utf-8' });
      return output.trim();
    }
  } catch (error) {
    // 命令失败（可能是没有进程）
    return null;
  }
  return null;
}

/**
 * 终止进程
 */
function killProcess(pid) {
  try {
    if (isWindows) {
      execSync(`taskkill /PID ${pid} /F`, { stdio: 'inherit' });
    } else {
      execSync(`kill -9 ${pid}`, { stdio: 'inherit' });
    }
    return true;
  } catch (error) {
    console.error(`❌ 无法终止进程 ${pid}:`, error.message);
    return false;
  }
}

/**
 * 主函数
 */
async function main() {
  console.log(`🔍 检查端口 ${PORT}...`);

  const inUse = await isPortInUse(PORT);

  if (!inUse) {
    console.log(`✅ 端口 ${PORT} 可用`);
    process.exit(0);
  }

  console.log(`⚠️  端口 ${PORT} 已被占用`);

  const pid = findProcessOnPort(PORT);

  if (!pid) {
    console.error(`❌ 无法找到占用端口的进程`);
    console.error(`💡 请手动检查: ${isWindows ? `netstat -ano | findstr :${PORT}` : `lsof -i :${PORT}`}`);
    process.exit(1);
  }

  console.log(`📍 发现进程 PID: ${pid}`);
  console.log(`🧹 正在终止旧进程...`);

  if (killProcess(pid)) {
    console.log(`✅ 进程已终止`);

    // 等待端口释放（Windows 延迟）
    await new Promise(resolve => setTimeout(resolve, 1000));

    const stillInUse = await isPortInUse(PORT);
    if (stillInUse) {
      console.error(`❌ 端口仍然被占用，请重试`);
      process.exit(1);
    }

    console.log(`✅ 端口 ${PORT} 现已可用`);
    process.exit(0);
  } else {
    process.exit(1);
  }
}

main();
