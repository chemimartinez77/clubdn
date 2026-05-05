const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = process.cwd();
const GIT_COMMAND = process.platform === 'win32' ? 'git.exe' : 'git';
const args = new Set(process.argv.slice(2));
const withChecks = args.has('--with-checks');
const asJson = args.has('--json');

const TEXT_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.json',
  '.sql',
  '.md',
  '.css',
  '.html',
  '.yml',
  '.yaml',
  '.mjs',
  '.cjs',
  '.sh',
  '.txt',
  '.toml',
]);

const CODE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);
const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'];
const EXCLUDED_SEGMENTS = new Set(['node_modules', 'dist', 'build', 'coverage', '.vite']);
const CORE_FEATURE_KEYWORDS = new Set([
  'auth',
  'admin',
  'stats',
  'profile',
  'event',
  'membership',
  'game',
  'config',
  'ludoteca',
  'document',
  'invitation',
  'sharelink',
  'badge',
  'report',
  'financial',
  'calendar',
  'pageview',
  'announcement',
  'marketplace',
  'libraryloan',
  'push',
  'photolibrary',
  'jugadoresludoteca',
  'quiensabejugar',
  'member',
  'onboarding',
  'notification',
]);
const SECONDARY_FEATURE_KEYWORDS = new Set([
  'azul',
  'viernes',
  'combatzone',
  'centipede',
  'sevenwondersduel',
  'multiplayer',
  'preview',
]);

function run(command, commandArgs, options = {}) {
  const baseOptions = {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 50,
    ...options,
  };

  let result = spawnSync(command, commandArgs, { ...baseOptions, shell: false });

  if (process.platform === 'win32' && result.error && result.error.code === 'EPERM') {
    result = spawnSync('cmd.exe', ['/d', '/s', '/c', buildWindowsCommand(command, commandArgs)], { ...baseOptions, shell: false });
  }

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    const error = new Error(`Command failed: ${command} ${commandArgs.join(' ')}`);
    error.stdout = result.stdout;
    error.stderr = result.stderr;
    error.status = result.status;
    throw error;
  }

  return result.stdout || '';
}

function runSafe(command, commandArgs, options = {}) {
  try {
    return { ok: true, output: run(command, commandArgs, options) };
  } catch (error) {
    const stderr = error.stderr ? String(error.stderr) : '';
    const stdout = error.stdout ? String(error.stdout) : '';
    return { ok: false, error: String(error.message || error), output: `${stdout}${stderr}`.trim() };
  }
}

function git(argsList) {
  return run(GIT_COMMAND, argsList);
}

function quoteWindowsArg(value) {
  if (/^[A-Za-z0-9_./:\\-]+$/.test(value)) return value;
  return `"${String(value).replace(/"/g, '\\"')}"`;
}

function buildWindowsCommand(command, commandArgs) {
  return [command, ...commandArgs].map(quoteWindowsArg).join(' ');
}

function normalizePath(filePath) {
  return filePath.replace(/\\/g, '/');
}

function getTrackedFiles() {
  const output = git(['ls-files', '-z']);
  return output
    .split('\0')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map(normalizePath);
}

function hasExcludedSegment(filePath) {
  return normalizePath(filePath)
    .split('/')
    .some((segment) => EXCLUDED_SEGMENTS.has(segment));
}

function isTestFile(filePath) {
  const normalized = normalizePath(filePath);
  return (
    normalized.includes('/__tests__/') ||
    normalized.includes('/tests/') ||
    /\.test\.[^.]+$/i.test(normalized) ||
    /\.spec\.[^.]+$/i.test(normalized)
  );
}

function isClientScope(filePath) {
  const normalized = normalizePath(filePath);
  return normalized.startsWith('client/src/') || normalized.startsWith('client/tests/');
}

function isServerScope(filePath) {
  const normalized = normalizePath(filePath);
  return normalized.startsWith('server/src/') || normalized.startsWith('server/tests/');
}

function isSharedScope(filePath) {
  return normalizePath(filePath).startsWith('shared/');
}

function isCodeScope(filePath) {
  return isClientScope(filePath) || isServerScope(filePath) || isSharedScope(filePath);
}

function isTextFile(filePath) {
  return TEXT_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

function isCodeFile(filePath) {
  return CODE_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

function readUtf8(filePath) {
  return fs.readFileSync(path.join(ROOT, filePath), 'utf8');
}

function countLines(content) {
  if (!content) return 0;
  return content.split(/\r?\n/).length;
}

function sum(items, getter) {
  return items.reduce((acc, item) => acc + getter(item), 0);
}

function groupCount(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    map.set(key, (map.get(key) || 0) + 1);
  }
  return map;
}

function sortEntriesDescending(map) {
  return [...map.entries()].sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return String(a[0]).localeCompare(String(b[0]), 'es');
  });
}

function formatBytes(bytes) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 100 || unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`;
}

function formatNumber(number) {
  return new Intl.NumberFormat('es-ES').format(number);
}

function formatRatio(a, b) {
  if (!b) return '∞';
  return (a / b).toFixed(2);
}

function getFileStats(files) {
  return files.map((filePath) => {
    const absolutePath = path.join(ROOT, filePath);
    const size = fs.statSync(absolutePath).size;
    const content = isTextFile(filePath) ? readUtf8(filePath) : '';
    return {
      path: filePath,
      size,
      characters: content.length,
      lines: countLines(content),
      extension: path.extname(filePath).toLowerCase() || '[sin extensión]',
      content,
    };
  });
}

function parseGitLogDates(format) {
  return git(['log', `--date=format:${format}`, '--pretty=%ad'])
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function computeLongestStreak(dateStrings) {
  if (dateStrings.length === 0) {
    return { days: 0, start: null, end: null };
  }

  const uniqueDates = [...new Set(dateStrings)].sort();
  let best = { days: 1, start: uniqueDates[0], end: uniqueDates[0] };
  let current = { days: 1, start: uniqueDates[0], end: uniqueDates[0] };

  for (let index = 1; index < uniqueDates.length; index += 1) {
    const previous = new Date(`${uniqueDates[index - 1]}T00:00:00Z`);
    const currentDate = new Date(`${uniqueDates[index]}T00:00:00Z`);
    const diffDays = Math.round((currentDate - previous) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      current.days += 1;
      current.end = uniqueDates[index];
    } else {
      if (current.days > best.days) best = { ...current };
      current = { days: 1, start: uniqueDates[index], end: uniqueDates[index] };
    }
  }

  if (current.days > best.days) best = current;
  return best;
}

function parseNumstatTotals() {
  const output = git(['log', '--numstat', '--format=tformat:']);
  let additions = 0;
  let deletions = 0;

  for (const line of output.split(/\r?\n/)) {
    const match = line.match(/^(\d+|-)\s+(\d+|-)\s+/);
    if (!match) continue;
    if (match[1] !== '-') additions += Number(match[1]);
    if (match[2] !== '-') deletions += Number(match[2]);
  }

  return { additions, deletions };
}

function getMostModifiedFiles(limit = 10) {
  const output = git(['log', '--name-only', '--pretty=format:']);
  const counter = new Map();

  for (const rawLine of output.split(/\r?\n/)) {
    const line = normalizePath(rawLine.trim());
    if (!line) continue;
    counter.set(line, (counter.get(line) || 0) + 1);
  }

  return sortEntriesDescending(counter).slice(0, limit).map(([filePath, count]) => ({ filePath, count }));
}

function getFirstCommitDate() {
  return git(['log', '--reverse', '--date=iso-strict', '--pretty=%ad', '--max-count=1']).trim();
}

function getElapsedSince(dateString) {
  const start = new Date(dateString);
  const now = new Date();
  const totalDays = Math.floor((now - start) / (1000 * 60 * 60 * 24));
  const years = Math.floor(totalDays / 365);
  const months = Math.floor((totalDays % 365) / 30);
  const days = totalDays - years * 365 - months * 30;
  return { totalDays, years, months, days };
}

function getPackageJsonScripts(packagePath) {
  const fullPath = path.join(ROOT, packagePath);
  if (!fs.existsSync(fullPath)) return {};
  const content = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  return content.scripts || {};
}

function countReactComponents(componentFiles) {
  return componentFiles.filter((filePath) => filePath.endsWith('.tsx')).length;
}

function countPrismaModels() {
  const schemaPath = path.join(ROOT, 'server/prisma/schema.prisma');
  const content = fs.readFileSync(schemaPath, 'utf8');
  return (content.match(/^\s*model\s+\w+/gm) || []).length;
}

function countPrismaEnums() {
  const schemaPath = path.join(ROOT, 'server/prisma/schema.prisma');
  const content = fs.readFileSync(schemaPath, 'utf8');
  return (content.match(/^\s*enum\s+\w+/gm) || []).length;
}

function countMigrationFolders() {
  const migrationsDir = path.join(ROOT, 'server/prisma/migrations');
  if (!fs.existsSync(migrationsDir)) return 0;
  return fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(migrationsDir, entry.name, 'migration.sql'))).length;
}

function getImportsRanking(fileStats, limit = 10) {
  const ranking = fileStats
    .filter((file) => isCodeFile(file.path))
    .map((file) => ({
      path: file.path,
      imports: (file.content.match(/^\s*import\s+/gm) || []).length,
    }))
    .sort((a, b) => {
      if (b.imports !== a.imports) return b.imports - a.imports;
      return a.path.localeCompare(b.path, 'es');
    });

  return {
    average: ranking.length ? ranking.reduce((acc, item) => acc + item.imports, 0) / ranking.length : 0,
    top: ranking.slice(0, limit),
  };
}

function getApiRouteFiles(allFiles) {
  return allFiles.filter((filePath) => {
    const normalized = normalizePath(filePath);
    return (
      /^server\/src\/routes\/.+\.(ts|js)$/.test(normalized) ||
      /^server\/src\/modules\/.+\/routes\/.+\.(ts|js)$/.test(normalized)
    );
  });
}

function countApiEndpoints(routeFiles) {
  let total = 0;
  let protectedCount = 0;

  for (const filePath of routeFiles) {
    const content = readUtf8(filePath);
    const globalAuthenticate = /router\.use\(\s*authenticate\b/.test(content);
    const globalAdmin = /router\.use\([\s\S]*require(Admin|SuperAdmin)\b/.test(content);

    for (const line of content.split(/\r?\n/)) {
      const endpointMatch = line.match(/router\.(get|post|put|patch|delete|options|head)\s*\(/);
      if (!endpointMatch) continue;

      total += 1;
      if (
        globalAuthenticate ||
        globalAdmin ||
        /\bauthenticate\b/.test(line) ||
        /\brequireAdmin\b/.test(line) ||
        /\brequireSuperAdmin\b/.test(line)
      ) {
        protectedCount += 1;
      }
    }
  }

  return { total, protectedCount };
}

function countSharedTypes(allFiles) {
  const typeFiles = allFiles.filter((filePath) => {
    const normalized = normalizePath(filePath);
    return normalized.startsWith('shared/') || normalized.startsWith('client/src/types/') || normalized.startsWith('server/src/types/');
  });

  let declarations = 0;
  for (const filePath of typeFiles) {
    if (!isCodeFile(filePath)) continue;
    const content = readUtf8(filePath);
    declarations += (content.match(/^\s*export\s+(type|interface|enum)\s+\w+/gm) || []).length;
  }

  return { files: typeFiles.length, declarations };
}

function countCustomHooks(allFiles) {
  const hookFiles = allFiles.filter((filePath) => /^client\/src\/hooks\/.+\/?use[A-Z].+\.(ts|tsx)$/.test(normalizePath(filePath)) || /^client\/src\/hooks\/use[A-Z].+\.(ts|tsx)$/.test(normalizePath(filePath)));
  return { count: hookFiles.length, files: hookFiles };
}

function estimateComplexUiFiles(allFiles) {
  const candidates = [];
  const files = allFiles.filter((filePath) => /^client\/src\/.+\.(tsx|ts)$/.test(normalizePath(filePath)));

  for (const filePath of files) {
    const content = readUtf8(filePath);
    const filename = path.basename(filePath);
    const formTags = (content.match(/<form\b/g) || []).length;
    const fieldCount =
      (content.match(/<(input|select|textarea)\b/g) || []).length +
      (content.match(/\bregister\(/g) || []).length +
      (content.match(/\bController\b/g) || []).length;
    const hasModalName = /Modal/i.test(filename);
    const usesDialog = /\bDialog\b|\bmodal\b/i.test(content);
    const usesFormLib = /\buseForm\b|\breact-hook-form\b/.test(content);

    const isComplex = hasModalName || usesDialog || usesFormLib || (formTags > 0 && fieldCount >= 4);
    if (isComplex) {
      candidates.push({ filePath, score: fieldCount + formTags * 2 + (hasModalName ? 2 : 0) + (usesFormLib ? 2 : 0) });
    }
  }

  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.filePath.localeCompare(b.filePath, 'es');
  });

  return { count: candidates.length, top: candidates.slice(0, 10) };
}

function normalizeFeatureName(name) {
  return name.replace(/Routes?$/i, '').replace(/Controller$/i, '').replace(/[^a-z0-9]/gi, '').toLowerCase();
}

function estimateFeatureSplit(routeFiles, pageFiles) {
  const areas = new Set();

  for (const filePath of [...routeFiles, ...pageFiles]) {
    const baseName = path.basename(filePath, path.extname(filePath));
    areas.add(normalizeFeatureName(baseName));
  }

  let core = 0;
  let secondary = 0;
  let uncategorized = 0;

  for (const area of areas) {
    if ([...CORE_FEATURE_KEYWORDS].some((keyword) => area.includes(keyword))) {
      core += 1;
    } else if ([...SECONDARY_FEATURE_KEYWORDS].some((keyword) => area.includes(keyword))) {
      secondary += 1;
    } else {
      uncategorized += 1;
    }
  }

  return { core, secondary, uncategorized, total: areas.size };
}

function countTests(allFiles) {
  const testFiles = allFiles.filter(isTestFile);
  const e2e = testFiles.filter((filePath) => /\/e2e\/|playwright|cypress/i.test(normalizePath(filePath)));
  const logical = testFiles.filter((filePath) => !e2e.includes(filePath));
  return { total: testFiles.length, e2e: e2e.length, logical: logical.length, files: testFiles };
}

function estimateUntestedSourceFiles(allFiles, testFiles) {
  const sourceFiles = allFiles.filter((filePath) => {
    const normalized = normalizePath(filePath);
    return (
      (normalized.startsWith('client/src/') || normalized.startsWith('server/src/') || normalized.startsWith('shared/')) &&
      isCodeFile(filePath) &&
      !isTestFile(filePath)
    );
  });

  const testStems = new Set(
    testFiles.map((filePath) =>
      path
        .basename(filePath)
        .replace(/\.test\.[^.]+$/i, '')
        .replace(/\.spec\.[^.]+$/i, '')
        .replace(/\.[^.]+$/i, '')
        .toLowerCase()
    )
  );

  const uncovered = sourceFiles.filter((filePath) => {
    const stem = path.basename(filePath, path.extname(filePath)).toLowerCase();
    return !testStems.has(stem);
  });

  return {
    sourceFiles: sourceFiles.length,
    untested: uncovered.length,
    percentage: sourceFiles.length ? (uncovered.length / sourceFiles.length) * 100 : 0,
  };
}

function countTodos(fileStats) {
  let todo = 0;
  let fixme = 0;
  for (const file of fileStats) {
    if (!file.content) continue;
    todo += (file.content.match(/\bTODO\b/g) || []).length;
    fixme += (file.content.match(/\bFIXME\b/g) || []).length;
  }
  return { todo, fixme, total: todo + fixme };
}

function resolveRelativeImport(fromFile, specifier) {
  const baseDir = path.posix.dirname(normalizePath(fromFile));
  const candidateBase = normalizePath(path.posix.normalize(path.posix.join(baseDir, specifier)));
  const candidates = [
    candidateBase,
    `${candidateBase}.ts`,
    `${candidateBase}.tsx`,
    `${candidateBase}.js`,
    `${candidateBase}.jsx`,
    `${candidateBase}.json`,
    `${candidateBase}/index.ts`,
    `${candidateBase}/index.tsx`,
    `${candidateBase}/index.js`,
    `${candidateBase}/index.jsx`,
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(path.join(ROOT, candidate)) && fs.statSync(path.join(ROOT, candidate)).isFile()) {
      return normalizePath(candidate);
    }
  }

  return null;
}

function estimateOrphanFiles(allFiles) {
  const codeFiles = allFiles.filter((filePath) => {
    const normalized = normalizePath(filePath);
    return (normalized.startsWith('client/src/') || normalized.startsWith('server/src/') || normalized.startsWith('shared/')) && isCodeFile(filePath);
  });

  const graph = new Map();
  for (const filePath of codeFiles) {
    const content = readUtf8(filePath);
    const imports = new Set();
    const importRegex = /\bimport\s*(?:[^'"]+from\s*)?['"]([^'"]+)['"]|\bimport\(\s*['"]([^'"]+)['"]\s*\)|\brequire\(\s*['"]([^'"]+)['"]\s*\)/g;
    let match;
    while ((match = importRegex.exec(content))) {
      const specifier = match[1] || match[2] || match[3];
      if (!specifier || !specifier.startsWith('.')) continue;
      const resolved = resolveRelativeImport(filePath, specifier);
      if (resolved) imports.add(resolved);
    }
    graph.set(filePath, imports);
  }

  const roots = new Set(
    codeFiles.filter((filePath) => {
      const normalized = normalizePath(filePath);
      return (
        normalized === 'client/src/main.tsx' ||
        normalized === 'client/src/App.tsx' ||
        normalized === 'server/src/index.ts' ||
        isTestFile(filePath)
      );
    })
  );

  const visited = new Set();
  const stack = [...roots];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || visited.has(current)) continue;
    visited.add(current);
    for (const dependency of graph.get(current) || []) {
      if (!visited.has(dependency)) stack.push(dependency);
    }
  }

  const safeStandalonePatterns = [
    /^client\/src\/pages\//,
    /^client\/src\/workers\//,
    /^server\/src\/scripts\//,
    /^server\/src\/routes\//,
    /^server\/src\/controllers\//,
    /^server\/src\/middleware\//,
    /^server\/src\/config\//,
  ];

  const orphans = codeFiles.filter((filePath) => {
    if (visited.has(filePath)) return false;
    return !safeStandalonePatterns.some((pattern) => pattern.test(normalizePath(filePath)));
  });

  return { count: orphans.length, files: orphans.slice(0, 20) };
}

function estimateDuplicateBlocks(fileStats) {
  const blockMap = new Map();
  const blockSize = 6;

  for (const file of fileStats) {
    if (!isCodeFile(file.path) || !file.content) continue;
    const normalizedLines = file.content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('import ') && !line.startsWith('//'));

    for (let index = 0; index <= normalizedLines.length - blockSize; index += 1) {
      const block = normalizedLines.slice(index, index + blockSize).join('\n');
      if (block.length < 80) continue;
      if (!blockMap.has(block)) blockMap.set(block, new Set());
      blockMap.get(block).add(file.path);
    }
  }

  const duplicates = [...blockMap.entries()]
    .map(([block, files]) => ({ block, files: [...files] }))
    .filter((entry) => entry.files.length > 1)
    .sort((a, b) => b.files.length - a.files.length);

  return {
    repeatedBlocks: duplicates.length,
    top: duplicates.slice(0, 5).map((entry) => ({
      files: entry.files,
      preview: entry.block.split('\n').slice(0, 2).join(' | '),
    })),
  };
}

function measureCommand(label, cwd, command, commandArgs) {
  const startedAt = Date.now();
  const result = spawnSync(command, commandArgs, {
    cwd,
    encoding: 'utf8',
    shell: false,
  });
  const durationMs = Date.now() - startedAt;
  const combinedOutput = `${result.stdout || ''}\n${result.stderr || ''}`.trim();
  const warnings = (combinedOutput.match(/warning/gi) || []).length;

  return {
    label,
    ok: result.status === 0,
    status: result.status,
    durationMs,
    warnings,
    output: combinedOutput,
  };
}

function getNpmCommand() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

function maybeRunChecks() {
  if (!withChecks) {
    return {
      executed: false,
      buildLint: [],
      prisma: { checked: false, message: 'No se han ejecutado comprobaciones pesadas. Usa --with-checks.' },
    };
  }

  const npmCommand = getNpmCommand();
  const checks = [];

  checks.push(measureCommand('client:build', path.join(ROOT, 'client'), npmCommand, ['run', 'build']));
  checks.push(measureCommand('client:lint', path.join(ROOT, 'client'), npmCommand, ['run', 'lint']));

  const serverBuildPath = path.join(ROOT, 'server/package.json');
  const serverScripts = getPackageJsonScripts('server/package.json');
  if (fs.existsSync(serverBuildPath) && serverScripts.build) {
    checks.push(measureCommand('server:build', path.join(ROOT, 'server'), npmCommand, ['run', 'build']));
  }

  const prismaStatus = runSafe(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['prisma', 'migrate', 'status'], {
    cwd: path.join(ROOT, 'server'),
  });

  return {
    executed: true,
    buildLint: checks,
    prisma: prismaStatus.ok
      ? { checked: true, ok: true, output: prismaStatus.output.trim() }
      : { checked: true, ok: false, output: prismaStatus.output.trim(), message: prismaStatus.error },
  };
}

function toMarkdown(stats) {
  const lines = [];

  lines.push('# Estadísticas del proyecto');
  lines.push('');
  lines.push('## Resumen ejecutivo');
  lines.push(`- Commits totales: ${formatNumber(stats.git.totalCommits)}`);
  lines.push(`- Líneas front/back/shared: ${formatNumber(stats.structure.lines.front)} / ${formatNumber(stats.structure.lines.back)} / ${formatNumber(stats.structure.lines.shared)}`);
  lines.push(`- Páginas React: ${formatNumber(stats.structure.pages)}`);
  lines.push(`- Endpoints API: ${formatNumber(stats.architecture.apiEndpoints.total)} (${formatNumber(stats.architecture.apiEndpoints.protectedCount)} protegidos)`);
  lines.push(`- Modelos Prisma: ${formatNumber(stats.structure.prismaModels)}`);
  lines.push(`- Migraciones Prisma: ${formatNumber(stats.structure.migrations)}`);
  lines.push(`- Tests: ${formatNumber(stats.quality.tests.total)} (${formatNumber(stats.quality.tests.e2e)} E2E, ${formatNumber(stats.quality.tests.logical)} lógicos)`);
  lines.push(`- Ficheros más tocados históricamente: ${stats.git.mostModifiedFiles.slice(0, 5).map((item) => `${item.filePath} (${formatNumber(item.count)})`).join('; ')}`);
  lines.push('');

  lines.push('## Git / actividad');
  lines.push(`- Commits por mes: ${stats.git.commitsPerMonth.map(([month, count]) => `${month}: ${formatNumber(count)}`).join(', ')}`);
  lines.push(`- Autores: ${formatNumber(stats.git.authors.total)} (${stats.git.authors.names.join(', ')})`);
  lines.push(`- Día con más commits: ${stats.git.busiestDay.date} (${formatNumber(stats.git.busiestDay.count)})`);
  lines.push(`- Racha más larga de días con commits: ${formatNumber(stats.git.longestStreak.days)} (${stats.git.longestStreak.start} → ${stats.git.longestStreak.end})`);
  lines.push(`- Líneas añadidas/borradas: ${formatNumber(stats.git.additions)} / ${formatNumber(stats.git.deletions)} (ratio ${stats.git.addDeleteRatio})`);
  lines.push(`- Ramas locales / tags: ${formatNumber(stats.git.branchCount)} / ${formatNumber(stats.git.tagCount)}`);
  lines.push(`- Tiempo desde el primer commit: ${stats.git.elapsedSinceFirstCommit.years} años, ${stats.git.elapsedSinceFirstCommit.months} meses y ${stats.git.elapsedSinceFirstCommit.days} días`);
  lines.push('');

  lines.push('## Tamaño / estructura');
  lines.push(`- Ficheros en client/server/shared: ${formatNumber(stats.structure.fileCounts.client)} / ${formatNumber(stats.structure.fileCounts.server)} / ${formatNumber(stats.structure.fileCounts.shared)}`);
  lines.push(`- Caracteres actuales en alcance: ${formatNumber(stats.structure.characters.total)} (front ${formatNumber(stats.structure.characters.front)}, back ${formatNumber(stats.structure.characters.back)}, shared ${formatNumber(stats.structure.characters.shared)})`);
  lines.push(`- Tamaño actual del alcance: ${formatBytes(stats.structure.size.total)} (front ${formatBytes(stats.structure.size.front)}, back ${formatBytes(stats.structure.size.back)}, shared ${formatBytes(stats.structure.size.shared)})`);
  lines.push(`- Tipos de fichero: ${stats.structure.fileTypes.map(([ext, count]) => `${ext}: ${formatNumber(count)}`).join(', ')}`);
  lines.push(`- Componentes React: ${formatNumber(stats.structure.reactComponents)}`);
  lines.push(`- Controladores backend: ${formatNumber(stats.structure.controllers)}`);
  lines.push('');

  lines.push('## Complejidad / arquitectura');
  lines.push(`- Fichero más largo: ${stats.architecture.longestFile.path} (${formatNumber(stats.architecture.longestFile.lines)} líneas)`);
  lines.push(`- Media de líneas por fichero: ${stats.architecture.averageLinesPerFile.toFixed(2)}`);
  lines.push(`- Media de imports por fichero: ${stats.architecture.imports.average.toFixed(2)}`);
  lines.push(`- Tipos compartidos: ${formatNumber(stats.architecture.sharedTypes.declarations)} declaraciones en ${formatNumber(stats.architecture.sharedTypes.files)} ficheros`);
  lines.push(`- Hooks personalizados: ${formatNumber(stats.architecture.customHooks.count)}`);
  lines.push(`- Modales o formularios complejos (aproximada): ${formatNumber(stats.architecture.complexUi.count)}`);
  lines.push(`- Features core/secundarias/sin clasificar (aproximada): ${formatNumber(stats.architecture.featureSplit.core)} / ${formatNumber(stats.architecture.featureSplit.secondary)} / ${formatNumber(stats.architecture.featureSplit.uncategorized)}`);
  lines.push('');

  lines.push('## Calidad / cobertura');
  lines.push(`- Ficheros sin tests (aproximada): ${formatNumber(stats.quality.untested.untested)} de ${formatNumber(stats.quality.untested.sourceFiles)} (${stats.quality.untested.percentage.toFixed(2)}%)`);
  lines.push(`- TODO/FIXME: ${formatNumber(stats.quality.todos.todo)} / ${formatNumber(stats.quality.todos.fixme)}`);
  lines.push(`- Huérfanos potenciales (aproximada): ${formatNumber(stats.quality.orphans.count)}`);
  lines.push(`- Bloques duplicados (aproximada): ${formatNumber(stats.quality.duplicates.repeatedBlocks)}`);
  lines.push(`- Scripts auxiliares: ${formatNumber(stats.quality.helperScripts.total)}`);
  if (stats.quality.checks.executed) {
    lines.push(`- Comprobaciones build/lint: ${stats.quality.checks.buildLint.map((check) => `${check.label} ${check.ok ? 'OK' : 'FAIL'} (${(check.durationMs / 1000).toFixed(2)} s, ${formatNumber(check.warnings)} warnings)`).join('; ')}`);
  } else {
    lines.push(`- Comprobaciones build/lint: ${stats.quality.checks.prisma.message}`);
  }
  lines.push('');

  lines.push('## Notas');
  lines.push('- Las métricas marcadas como aproximadas son heurísticas y no deben interpretarse como cobertura o deuda exactas.');
  lines.push('- "Caracteres escritos" significa caracteres actuales del código fuente y tests dentro del alcance, no histórico de tecleo.');

  return lines.join('\n');
}

function main() {
  const trackedFiles = getTrackedFiles().filter((filePath) => !hasExcludedSegment(filePath));
  const codeScopeFiles = trackedFiles.filter(isCodeScope);
  const fileStats = getFileStats(codeScopeFiles.filter(isTextFile));

  const clientFiles = trackedFiles.filter((filePath) => normalizePath(filePath).startsWith('client/') && !hasExcludedSegment(filePath));
  const serverFiles = trackedFiles.filter((filePath) => normalizePath(filePath).startsWith('server/') && !hasExcludedSegment(filePath));
  const sharedFiles = trackedFiles.filter((filePath) => normalizePath(filePath).startsWith('shared/') && !hasExcludedSegment(filePath));

  const frontScopeFiles = codeScopeFiles.filter((filePath) => isClientScope(filePath));
  const backScopeFiles = codeScopeFiles.filter((filePath) => isServerScope(filePath));
  const sharedScopeFiles = codeScopeFiles.filter((filePath) => isSharedScope(filePath));

  const frontStats = getFileStats(frontScopeFiles.filter(isTextFile));
  const backStats = getFileStats(backScopeFiles.filter(isTextFile));
  const sharedStats = getFileStats(sharedScopeFiles.filter(isTextFile));

  const commitDatesByMonth = sortEntriesDescending(groupCount(parseGitLogDates('%Y-%m'), (value) => value)).reverse();
  const commitDatesByDay = sortEntriesDescending(groupCount(parseGitLogDates('%Y-%m-%d'), (value) => value));
  const longestStreak = computeLongestStreak(parseGitLogDates('%Y-%m-%d'));
  const firstCommitDate = getFirstCommitDate();
  const elapsedSinceFirstCommit = getElapsedSince(firstCommitDate);
  const authorLines = git(['shortlog', '-sne', 'HEAD'])
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const authors = authorLines.map((line) => line.replace(/^\d+\s+/, ''));
  const numstatTotals = parseNumstatTotals();

  const pageFiles = trackedFiles.filter((filePath) => normalizePath(filePath).startsWith('client/src/pages/') && filePath.endsWith('.tsx'));
  const componentFiles = trackedFiles.filter((filePath) => normalizePath(filePath).startsWith('client/src/components/') && filePath.endsWith('.tsx'));
  const controllerFiles = trackedFiles.filter((filePath) => /^server\/src\/controllers\/.+\.(ts|js)$/.test(normalizePath(filePath)));
  const routeFiles = getApiRouteFiles(trackedFiles);
  const checks = maybeRunChecks();
  const helperScriptsCount =
    Object.keys(getPackageJsonScripts('package.json')).length +
    Object.keys(getPackageJsonScripts('client/package.json')).length +
    Object.keys(getPackageJsonScripts('server/package.json')).length +
    (fs.existsSync(path.join(ROOT, 'server/scripts'))
      ? fs.readdirSync(path.join(ROOT, 'server/scripts')).filter((entry) => fs.statSync(path.join(ROOT, 'server/scripts', entry)).isFile()).length
      : 0);

  const stats = {
    generatedAt: new Date().toISOString(),
    git: {
      totalCommits: Number(git(['rev-list', '--count', 'HEAD']).trim()),
      commitsPerMonth: commitDatesByMonth,
      authors: {
        total: authors.length,
        names: authors,
      },
      busiestDay: {
        date: commitDatesByDay[0]?.[0] || null,
        count: commitDatesByDay[0]?.[1] || 0,
      },
      longestStreak,
      mostModifiedFiles: getMostModifiedFiles(10),
      additions: numstatTotals.additions,
      deletions: numstatTotals.deletions,
      addDeleteRatio: formatRatio(numstatTotals.additions, numstatTotals.deletions),
      branchCount: git(['branch', '--format=%(refname:short)']).split(/\r?\n/).filter(Boolean).length,
      tagCount: git(['tag', '--list']).split(/\r?\n/).filter(Boolean).length,
      firstCommitDate,
      elapsedSinceFirstCommit,
    },
    structure: {
      fileCounts: {
        client: clientFiles.length,
        server: serverFiles.length,
        shared: sharedFiles.length,
        codeScope: codeScopeFiles.length,
      },
      fileTypes: sortEntriesDescending(groupCount(codeScopeFiles, (filePath) => path.extname(filePath).toLowerCase() || '[sin extensión]')),
      characters: {
        front: sum(frontStats, (file) => file.characters),
        back: sum(backStats, (file) => file.characters),
        shared: sum(sharedStats, (file) => file.characters),
        total: sum(fileStats, (file) => file.characters),
      },
      size: {
        front: sum(frontStats, (file) => file.size),
        back: sum(backStats, (file) => file.size),
        shared: sum(sharedStats, (file) => file.size),
        total: sum(fileStats, (file) => file.size),
      },
      lines: {
        front: sum(frontStats, (file) => file.lines),
        back: sum(backStats, (file) => file.lines),
        shared: sum(sharedStats, (file) => file.lines),
        total: sum(fileStats, (file) => file.lines),
      },
      sizeByFolder: {
        client: sum(frontStats, (file) => file.size),
        server: sum(backStats, (file) => file.size),
        shared: sum(sharedStats, (file) => file.size),
      },
      reactComponents: countReactComponents(componentFiles),
      pages: pageFiles.length,
      controllers: controllerFiles.length,
      prismaModels: countPrismaModels(),
      prismaEnums: countPrismaEnums(),
      migrations: countMigrationFolders(),
    },
    architecture: {
      longestFile: [...fileStats]
        .sort((a, b) => {
          if (b.lines !== a.lines) return b.lines - a.lines;
          return a.path.localeCompare(b.path, 'es');
        })[0],
      top10LongestFiles: [...fileStats]
        .sort((a, b) => {
          if (b.lines !== a.lines) return b.lines - a.lines;
          return a.path.localeCompare(b.path, 'es');
        })
        .slice(0, 10)
        .map((file) => ({ path: file.path, lines: file.lines })),
      averageLinesPerFile: fileStats.length ? sum(fileStats, (file) => file.lines) / fileStats.length : 0,
      imports: getImportsRanking(fileStats, 10),
      apiEndpoints: countApiEndpoints(routeFiles),
      sharedTypes: countSharedTypes(trackedFiles),
      customHooks: countCustomHooks(trackedFiles),
      complexUi: estimateComplexUiFiles(trackedFiles),
      featureSplit: estimateFeatureSplit(routeFiles, pageFiles),
    },
    quality: {
      tests: countTests(trackedFiles),
      untested: null,
      todos: countTodos(fileStats),
      orphans: estimateOrphanFiles(trackedFiles),
      duplicates: estimateDuplicateBlocks(fileStats),
      helperScripts: {
        total: helperScriptsCount,
      },
      checks,
    },
  };

  stats.quality.untested = estimateUntestedSourceFiles(trackedFiles, stats.quality.tests.files);

  if (asJson) {
    process.stdout.write(`${JSON.stringify(stats, null, 2)}\n`);
    return;
  }

  process.stdout.write(`${toMarkdown(stats)}\n`);
}

main();
