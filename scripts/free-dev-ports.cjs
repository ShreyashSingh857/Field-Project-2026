const { execSync } = require('child_process');

const ports = [5000, 5173, 5174, 5175, 5176, 5177, 5178];

function pidsOnPortWin(port) {
  try {
    const out = execSync(`netstat -ano -p tcp | findstr :${port}`, { encoding: 'utf8' });
    const lines = out.split(/\r?\n/).filter(Boolean);
    const pids = new Set();
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (/^\d+$/.test(pid)) pids.add(pid);
    }
    return [...pids];
  } catch {
    return [];
  }
}

function killPidWin(pid) {
  try {
    execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function pidsOnPortUnix(port) {
  try {
    const out = execSync(`lsof -ti tcp:${port}`, { encoding: 'utf8' }).trim();
    if (!out) return [];
    return out.split(/\r?\n/).filter(Boolean);
  } catch {
    return [];
  }
}

function killPidUnix(pid) {
  try {
    execSync(`kill -9 ${pid}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

const isWin = process.platform === 'win32';
let killed = 0;

for (const port of ports) {
  const pids = isWin ? pidsOnPortWin(port) : pidsOnPortUnix(port);
  for (const pid of pids) {
    const ok = isWin ? killPidWin(pid) : killPidUnix(pid);
    if (ok) {
      killed += 1;
      console.log(`Freed port ${port} by killing PID ${pid}`);
    }
  }
}

if (!killed) {
  console.log('No occupied dev ports found.');
}
