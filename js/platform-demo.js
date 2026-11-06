// ============================================================
// platform-demo.js — демо платформы «Нейросборка» (фаза 7)
// Подключается только на case-neirosborka.html. Без фреймворков.
// Роли, лимиты и видимость: spec/05-neirosborka.md → «Интерактив».
// Демо без реального AI: готовые ответы + посимвольная печать.
// ============================================================

const PRINT_MS = 40; // ~25 символов/сек (spec: 20–30)

const DAILY_LIMIT = 5; // Базовый: лимит AI-запросов в день

// Открытые сектора (индексы карточек 0–7) по ролям.
const ROLE_ACCESS = {
  guest: [0, 1],
  basic: [0, 1, 2],
  advanced: [0, 1, 2, 3, 4, 5, 6, 7],
  admin: [0, 1, 2, 3, 4, 5, 6, 7]
};

const ROLE_STATUS = {
  guest: 'Режим: Гость · главная + 2 демо-статьи',
  basic: 'Режим: Базовый · вводный раздел',
  advanced: 'Режим: Расширенный · полный доступ · компьютерное зрение',
  admin: 'Режим: Админ · полный доступ + панель управления'
};

// Готовые ответы: ключевые слова запроса → сектор-источник.
const ANSWERS = [
  { test: /локальн|нейросет|модел|видеокард|gpu/i, source: 'Локальные нейросети', text: 'Каталог локальных моделей: инструкции по установке, воркфлоу-шаблоны и настройки под ваше железо.' },
  { test: /облачн|gpt|chatgpt|подписк[аеу]/i, source: 'Облачные нейросети', text: 'Обзор облачных сервисов: лимиты, тарифы и правила безопасной работы с облаками.' },
  { test: /маркет|продаж|лид|аудитор|воронк/i, source: 'Маркетинг', text: 'Сценарии продвижения: каналы привлечения, воронки и метрики комьюнити.' },
  { test: /дизайн|макет|айдентик|баннер|логотип/i, source: 'Дизайн', text: 'База промптов и шаблонов: от мокапов до айдентики — с примерами работ.' },
  { test: /визуал|графика|картин|изображ|фото/i, source: 'Визуал и графика', text: 'Генерация и обработка изображений: подборка воркфлоу и референсов.' },
  { test: /монтаж|видео|ролик|клип/i, source: 'Монтаж и видео', text: 'Пайплайны монтажа: нейро-обработка видео и шаблоны сценариев.' },
  { test: /музык|звук|трек|аудио/i, source: 'Музыка и звук', text: 'Генерация треков и звуковой дизайн: инструменты и рецепты.' },
  { test: /код|автоматиз|скрипт|бот|api/i, source: 'Кодинг и автоматизация', text: 'Скрипты и боты: интеграции, пайплайны и автоматизация рутины.' }
];

const FALLBACK = { source: 'Облачные нейросети', text: 'Нашёл в базе знаний подборку материалов по вашему запросу.' };

function initPlatformDemo() {
  const frame = document.getElementById('demo-frame');
  if (!frame) return;

  const tabs = Array.from(frame.querySelectorAll('.demo-role'));
  const statusEl = document.getElementById('demo-status');
  const sectors = Array.from(frame.querySelectorAll('.demo-sector'));
  const chatWindow = document.getElementById('demo-chat-window');
  const feed = document.getElementById('demo-feed');
  const input = document.getElementById('demo-input');
  const askBtn = document.getElementById('demo-ask');
  const uploadBtn = document.getElementById('demo-upload');
  const topicBtn = document.getElementById('demo-topic');
  const adminPanel = document.getElementById('demo-admin');
  const adminForm = document.getElementById('demo-admin-form');

  let role = 'guest';
  let remaining = DAILY_LIMIT;
  let busy = false;
  let printToken = 0; // отмена печати при смене роли
  const adminLog = []; // in-page; не сохраняется

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const scrollFeed = () => { feed.scrollTop = feed.scrollHeight; };

  // --- статус-строка -------------------------------------------------------

  function plural(n) {
    const m10 = n % 10;
    const m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return 'запрос';
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'запроса';
    return 'запросов';
  }

  function updateStatus() {
    if (role === 'basic') {
      statusEl.textContent = ROLE_STATUS.basic +
        ' · ' + remaining + ' ' + plural(remaining) + ' / день';
    } else {
      statusEl.textContent = ROLE_STATUS[role];
    }
  }

  // --- чат: сообщения ------------------------------------------------------

  function addMsg(kind, text) {
    const art = document.createElement('article');
    art.className = 'demo-msg demo-msg--' + kind;
    const bubble = document.createElement('div');
    bubble.className = 'demo-bubble';
    bubble.textContent = text;
    art.appendChild(bubble);
    feed.appendChild(art);
    scrollFeed();
  }

  // Посимвольная печать ответа; token отменяет при смене роли.
  async function typeAnswer(text, source, token) {
    const art = document.createElement('article');
    art.className = 'demo-msg demo-msg--ai';
    const bubble = document.createElement('div');
    bubble.className = 'demo-bubble';
    const span = document.createElement('span');
    const caret = document.createElement('span');
    caret.className = 'demo-caret';
    caret.textContent = '▍';
    bubble.append(span, caret);
    art.appendChild(bubble);
    feed.appendChild(art);
    scrollFeed();

    await wait(300); // пауза «размышления»
    for (let i = 0; i < text.length; i += 1) {
      if (token !== printToken) { art.remove(); return; }
      span.textContent += text[i];
      if (i % 2 === 0) scrollFeed();
      await wait(PRINT_MS);
    }
    if (token !== printToken) { art.remove(); return; }
    caret.remove();
    if (source) {
      const src = document.createElement('p');
      src.className = 'demo-src';
      src.textContent = 'Источник: сектор ' + source;
      art.appendChild(src);
      scrollFeed();
    }
  }

  function matchAnswer(query) {
    for (const a of ANSWERS) {
      if (a.test.test(query)) return a;
    }
    return FALLBACK;
  }

  function setChatEnabled(enabled) {
    input.disabled = !enabled;
    askBtn.disabled = !enabled;
  }

  // --- роли ----------------------------------------------------------------

  function applyRole(next) {
    role = next;
    printToken += 1; // активная печать больше не актуальна
    busy = false;
    frame.dataset.role = role;

    tabs.forEach((btn) => {
      const on = btn.dataset.role === role;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-selected', on ? 'true' : 'false');
    });

    const open = new Set(ROLE_ACCESS[role]);
    sectors.forEach((card, i) => card.classList.toggle('locked', !open.has(i)));
    chatWindow.classList.toggle('locked', role === 'guest');

    setChatEnabled(role !== 'guest');
    adminPanel.classList.toggle('show', role === 'admin');

    remaining = DAILY_LIMIT; // счётчик на роль, in-page демо
    updateStatus();
  }

  // --- действия ------------------------------------------------------------

  async function ask() {
    const query = input.value.trim();
    if (!query || busy || role === 'guest') return;

    if (role === 'basic') {
      if (remaining <= 0) {
        addMsg('user', query);
        input.value = '';
        busy = true;
        setChatEnabled(false);
        await typeAnswer('Лимит ' + DAILY_LIMIT + ' запросов/день исчерпан. Обновите подписку.', null, printToken);
        busy = false;
        setChatEnabled(true);
        return;
      }
      remaining -= 1;
      updateStatus();
    }

    addMsg('user', query);
    input.value = '';

    const token = printToken;
    const answer = matchAnswer(query);
    busy = true;
    setChatEnabled(false);
    await typeAnswer(answer.text, answer.source, token);
    if (token === printToken) {
      busy = false;
      setChatEnabled(true);
    }
  }

  // Компьютерное зрение (Расширенный / Админ).
  async function handleUpload() {
    if (busy) return;
    if (role !== 'advanced' && role !== 'admin') return;
    addMsg('user', 'Изображение прикреплено');

    const token = printToken;
    busy = true;
    setChatEnabled(false);
    await typeAnswer('Компьютерное зрение: изображение распознано. Подобрал воркфлоу в секторе.', 'Визуал и графика', token);
    if (token === printToken) {
      busy = false;
      setChatEnabled(true);
    }
  }

  // Предложить тему для базы знаний (Расширенный / Админ).
  async function handleTopic() {
    if (busy) return;
    if (role !== 'advanced' && role !== 'admin') return;

    const token = printToken;
    busy = true;
    setChatEnabled(false);
    await typeAnswer('Спасибо! Тема отправлена на модерацию — после проверки она появится в базе знаний.', null, token);
    if (token === printToken) {
      busy = false;
      setChatEnabled(true);
    }
  }

  // --- админ: выдача бесплатного доступа ----------------------------------

  function renderAdminLog() {
    const logEl = document.getElementById('demo-log');
    logEl.innerHTML = '';
    adminLog.slice(0, 5).forEach((entry) => {
      const li = document.createElement('li');
      li.textContent = entry.date + ' · ' + entry.name +
        ' · ' + entry.email + ' · ' + entry.term + ' · ' + entry.reason;
      logEl.appendChild(li);
    });
  }

  adminForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = document.getElementById('demo-f-name').value.trim();
    const email = document.getElementById('demo-f-email').value.trim();
    const term = document.getElementById('demo-f-term').value;
    const reason = document.getElementById('demo-f-reason').value.trim();
    if (!name || !email || !reason) return;

    const now = new Date();
    adminLog.unshift({
      date: now.toLocaleDateString('ru-RU') + ' ' + now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      name,
      email,
      term,
      reason
    });
    renderAdminLog();
    adminForm.reset();
  });

  // --- события -------------------------------------------------------------

  tabs.forEach((btn) => btn.addEventListener('click', () => {
    if (btn.dataset.role !== role) applyRole(btn.dataset.role);
  }));

  askBtn.addEventListener('click', ask);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      ask();
    }
  });
  uploadBtn.addEventListener('click', handleUpload);
  topicBtn.addEventListener('click', handleTopic);

  applyRole('guest'); // стартовое состояние каркаса
}

initPlatformDemo();
