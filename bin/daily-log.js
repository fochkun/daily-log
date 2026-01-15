#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const args = process.argv.slice(2);
const cmd = args[0];

const DAILY_DIR = '.daily';
const TEMPLATE_PATH = path.join(DAILY_DIR, 'template.md');
const INDEX_PATH = path.join(DAILY_DIR, 'index.md');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function formatDate(date = new Date()) {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
}

function init() {
  ensureDir(DAILY_DIR);

  if (!fs.existsSync(TEMPLATE_PATH)) {
    fs.writeFileSync(TEMPLATE_PATH, `## {{date}}\n\n### 🚦 Разгон\n- [ ] 1. ...\n`);
  }

  if (!fs.existsSync(INDEX_PATH)) {
    fs.writeFileSync(INDEX_PATH, `# Dev Journal\n\nСписок записей:\n<!-- auto-generated -->\n`);
  }

  console.log('✅ .daily/ initialized');
}

function create() {
  const today = new Date();
  const dateStr = formatDate(today);
  const [year, month] = dateStr.split('-');
  const dirPath = path.join(DAILY_DIR, year, month);
  const filePath = path.join(dirPath, `${dateStr}.md`);

  ensureDir(dirPath);

  if (fs.existsSync(filePath)) {
    console.log(`📝 ${dateStr}.md уже существует. Открываю...`);
  } else {
    let template = fs.readFileSync(TEMPLATE_PATH, 'utf8');
    template = template.replace(/{{date}}/g, dateStr);
    fs.writeFileSync(filePath, template);
    console.log(`✅ Создано: ${filePath}`);
  }

  // Опционально: открыть файл в редакторе
  try {
    execSync(`code "${filePath}"`, { stdio: 'ignore' });
  } catch (e) {
    // code не установлен — молча пропускаем
  }
}

// CLI router
switch (cmd) {
  case 'init':
    init();
    break;
  case 'create':
    create();
    break;
  default:
    console.log('Использование: daily-log <init|create>');
}