#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

// === Paths ===
const DAILY_DIR = '.daily';
const START_TEMPLATE_PATH = path.join(DAILY_DIR, 'template-start.md');
const TASK_TEMPLATE_PATH = path.join(DAILY_DIR, 'template-task.md');
const INDEX_PATH = path.join(DAILY_DIR, 'index.md');
const CONFIG_PATH = path.join(DAILY_DIR, 'config.json');

// === Utils ===
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function formatDate(date = new Date()) {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
}

function formatTime(date = new Date()) {
  return date.toTimeString().slice(0, 5); // HH:MM
}

function copyTemplateIfNeeded(srcPath, destPath) {
  if (!fs.existsSync(destPath)) {
    fs.copyFileSync(srcPath, destPath);
  }
}

function openFile(filePath) {
  try {
    execSync(`code "${filePath}"`, { stdio: 'ignore' });
  } catch (e) {
    // VS Code not found — silently skip
  }
}

function getTodayFilePath() {
  const today = new Date();
  const dateStr = formatDate(today);
  const [year, month] = dateStr.split('-');
  const dirPath = path.join(DAILY_DIR, year, month);
  ensureDir(dirPath);
  return path.join(dirPath, `${dateStr}.md`);
}

function updateIndex(dateStr, relativePath) {
  const indexPath = INDEX_PATH;
  let indexContent = '';

  console.log('Запускаем апдэйт');
  if (fs.existsSync(indexPath)) {
    indexContent = fs.readFileSync(indexPath, 'utf8');
  } else {
    // Инициализация index.md (на случай, если его нет)
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    const header = config.lang === 'en'
      ? '# Dev Journal\n\nList of entries:\n'
      : '# Журнал разработчика\n\nСписок записей:\n';
    indexContent = header;
    fs.writeFileSync(indexPath, indexContent);
  }

  // Формат ссылки: - [2026-01-15](2026/01/2026-01-15.md)
  const linkLine = `- [${dateStr}](${relativePath})`;

  // Проверяем, есть ли уже такая строка
  if (!indexContent.includes(linkLine)) {
    // Находим последнюю строку с "- [" или конец заголовка
    const lines = indexContent.split('\n');
    let insertIndex = lines.length;

    // Ищем последнюю строку, начинающуюся с "- ["
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].startsWith('- [')) {
        insertIndex = i + 1;
        break;
      }
    }

    // Если не нашли — вставляем после заголовка
    if (insertIndex === lines.length) {
      // Пропускаем первую строку (# Заголовок) и пустые строки
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim() === '' && i > 0) {
          insertIndex = i + 1;
          break;
        }
      }
    }

    lines.splice(insertIndex, 0, linkLine);
    fs.writeFileSync(indexPath, lines.join('\n'));
  }
}

// === Commands ===

function init() {
  ensureDir(DAILY_DIR);

  if (fs.existsSync(CONFIG_PATH)) {
    console.log('✅ .daily/ уже инициализирован.');
    return;
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('Выберите язык шаблонов / Choose template language (ru/en) [ru]: ', (answer) => {
    let lang = 'ru';
    const input = answer.trim().toLowerCase();
    if (input === 'en') {
      lang = 'en';
    } else if (input !== '' && input !== 'ru') {
      console.log('⚠️ Неверный ввод. Используется "ru".');
    }

    const pkgRoot = path.join(__dirname, '..');
    const templatesDir = path.join(pkgRoot, 'templates', lang);

    if (!fs.existsSync(templatesDir)) {
      console.error(`❌ Шаблоны для языка "${lang}" не найдены.`);
      rl.close();
      process.exit(1);
    }

    // Copy templates
    copyTemplateIfNeeded(path.join(templatesDir, 'start.md'), START_TEMPLATE_PATH);
    copyTemplateIfNeeded(path.join(templatesDir, 'task.md'), TASK_TEMPLATE_PATH);

    // Create index.md
    const indexContent = lang === 'en'
      ? '# Dev Journal\n\nList of entries:\n'
      : '# Журнал разработчика\n\nСписок записей:\n';
    fs.writeFileSync(INDEX_PATH, indexContent);

    // Save config
    fs.writeFileSync(CONFIG_PATH, JSON.stringify({ lang }, null, 2));

    console.log(`✅ .daily/ инициализирован с шаблонами: ${lang}`);
    rl.close();
  });
}

function create() {
  const today = new Date();
  const dateStr = formatDate(today);
  const filePath = getTodayFilePath();

  if (fs.existsSync(filePath)) {
    console.log('📝 Разгон уже начат. Открываю файл...');
  } else {
    if (!fs.existsSync(START_TEMPLATE_PATH)) {
      console.error('❌ Шаблон template-start.md не найден. Выполните `dailydev init`.');
      process.exit(1);
    }

    let content = fs.readFileSync(START_TEMPLATE_PATH, 'utf8');
    content = content.replace(/{{date}}/g, formatDate());
    fs.writeFileSync(filePath, content);
    console.log(`✅ Создан разгон: ${filePath}`);

    // обновление index.md ---
    const [year, month] = dateStr.split('-');
    const relativePath = `${year}/${month}/${dateStr}.md`;
    updateIndex(dateStr, relativePath);
  }

  openFile(filePath);
}

function task() {
  const filePath = getTodayFilePath();

  if (!fs.existsSync(filePath)) {
    console.error('⚠️ Сначала запустите `dailydev create`');
    process.exit(1);
  }

  if (!fs.existsSync(TASK_TEMPLATE_PATH)) {
    console.error('❌ Шаблон template-task.md не найден. Выполните `dailydev init`.');
    process.exit(1);
  }

  const taskName = process.argv.slice(3).join(' ') || 'Без названия';
  let content = fs.readFileSync(TASK_TEMPLATE_PATH, 'utf8');
  content = content
    .replace(/{{taskName}}/g, taskName)
    .replace(/{{timestamp}}/g, formatTime());

  fs.appendFileSync(filePath, '\n' + content);
  console.log(`✅ Добавлена задача: "${taskName}"`);

  openFile(filePath);
}

// === CLI Router ===
const cmd = process.argv[2];

switch (cmd) {
  case 'init':
    init();
    break;
  case 'create':
    create();
    break;
  case 'task':
    task();
    break;
  default:
    console.log('Использование: dailydev <init|create|task [название задачи]>');
    process.exit(1);
}