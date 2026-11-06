// ============================================================
// chat-simulator.js — симулятор внутреннего чата «Астрал» (фаза 5)
// Подключается только на case-astral.html. Без фреймворков.
// Сценарии и названия этапов: spec/04-astral.md → «Интерактив».
// ============================================================

const TYPING_MS = 1200;
const OCR_FILL_MS = 900;

// Каждый сценарий: вопрос пользователя, этапы SYSTEM VIEW (строго
// по последовательностям из spec) и ответ бота.
const SCENARIOS = [
  {
    label: 'Как отправить отчёт?',
    steps: [
      { type: 'search', note: 'Совпадение в базе: 98%', log: '▸ Поиск: совпадение 98%' },
      { type: 'confidence', fill: 98, note: '98%', log: '▸ Confidence: 98%' },
      { type: 'decision', cls: 'sv-ok', note: 'Ответ из базы', log: '▸ Решение: ответ из базы' }
    ],
    bot: 'Раздел «Отчётность» → кнопка «Отправить». Полная инструкция — в базе знаний.'
  },
  {
    label: 'У меня ошибка на скриншоте',
    userExtra: 'attach',
    steps: [
      { type: 'ocr', fill: 100, note: 'Текст распознан', log: '▸ OCR: распознавание выполнено' },
      { type: 'search', note: 'Совпадение в базе: 82%', log: '▸ Поиск: совпадение 82%' },
      { type: 'confidence', fill: 82, note: '82%', log: '▸ Confidence: 82%' },
      { type: 'decision', cls: 'sv-ok', note: 'Ответ из базы', log: '▸ Решение: ответ из базы' }
    ],
    bot: 'Распознал ошибку «Ошибка загрузки данных». Решение — в статье базы знаний: <a class="chat-link" href="#">Инструкция: ошибка загрузки данных</a>'
  },
  {
    label: 'Нестандартная проблема',
    steps: [
      { type: 'search', note: 'Совпадений в базе нет', log: '▸ Поиск: совпадений нет' },
      { type: 'confidence', fill: 35, note: '35%', low: true, log: '▸ Confidence: 35%' },
      { type: 'decision', cls: 'sv-warn', note: 'Эскалация эксперту', log: '▸ Решение: эскалация' }
    ],
    after: [{ log: '▸ Создание тикета: выполнено' }],
    bot: 'Передаю эксперту @expert_name'
  },
  {
    label: 'Статус моего обращения',
    steps: [
      { type: 'search', note: 'Запрос к базе…', log: '▸ Запрос к базе: выполнен' },
      { type: 'decision', cls: 'sv-ok', note: 'Список активных обращений: 2', log: '▸ Найдено обращений: 2' }
    ],
    bot: 'Ваши активные обращения:<ul class="msg-tickets"><li>№ 000128 · в работе</li><li>№ 000091 · ожидает ответа</li></ul>'
  }
];

function initChatSimulator() {
  const root = document.getElementById('chat-simulator');
  if (!root) return;

  const feed = root.querySelector('.chat-feed');
  const logEl = root.querySelector('.sv-log');
  const resetBtn = root.querySelector('.chat-reset');
  const actions = root.querySelectorAll('.chat-action');

  const stageEls = {
    ocr: { box: document.getElementById('sv-ocr'), fill: document.getElementById('sv-ocr-fill'), note: document.getElementById('sv-ocr-note') },
    search: { box: document.getElementById('sv-search'), note: document.getElementById('sv-search-note') },
    confidence: { box: document.getElementById('sv-confidence'), fill: document.getElementById('sv-conf-fill'), note: document.getElementById('sv-conf-note') },
    decision: { box: document.getElementById('sv-decision'), note: document.getElementById('sv-decision-note') }
  };

  let busy = false;
  let playToken = 0;

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const scrollFeed = () => { feed.scrollTop = feed.scrollHeight; };
  const scrollLog = () => { logEl.scrollTop = logEl.scrollHeight; };

  function appendLog(text) {
    const line = document.createElement('p');
    line.textContent = text;
    logEl.appendChild(line);
    scrollLog();
  }

  function addUserMsg(scenario) {
    const msg = document.createElement('article');
    msg.className = 'msg msg--user msg--added';
    msg.innerHTML = '<div class="msg-bubble">' + scenario.label +
      (scenario.userExtra ? '<span class="msg-attach">Скриншот прикреплён</span>' : '') + '</div>';
    feed.appendChild(msg);
    scrollFeed();
  }

  function addBotMsg(html) {
    const msg = document.createElement('article');
    msg.className = 'msg msg--bot msg--added';
    msg.innerHTML = '<div class="msg-bubble">' + html + '</div>';
    feed.appendChild(msg);
    scrollFeed();
  }

  function showTyping() {
    const msg = document.createElement('article');
    msg.className = 'msg msg--bot msg--typing msg--added';
    msg.innerHTML = '<div class="msg-bubble"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>';
    feed.appendChild(msg);
    scrollFeed();
  }

  function hideTyping() {
    root.querySelectorAll('.msg--typing').forEach((el) => el.remove());
  }

  function setActionsDisabled(disabled) {
    actions.forEach((btn) => { btn.disabled = disabled; });
  }

  function hideAllStages() {
    for (const key of Object.keys(stageEls)) {
      const els = stageEls[key];
      els.box.classList.remove('show');
      els.note.textContent = '';
      els.note.classList.remove('sv-ok', 'sv-warn');
      if (els.fill) {
        els.fill.style.width = '0%';
        els.fill.classList.remove('progress-fill--warn');
      }
    }
  }

  function clearSystemLog() {
    logEl.innerHTML = '';
  }

  async function runStep(step, token) {
    const els = stageEls[step.type];

    if (step.type === 'ticket' || !els) {
      await wait(300);
      if (token === playToken && step.log) appendLog(step.log);
      return;
    }

    els.box.classList.add('show');

    if (els.fill) {
      els.fill.style.width = '0%';
      await wait(50); // reflow: запуск transition
      els.fill.style.width = step.fill + '%';
      if (step.low) els.fill.classList.add('progress-fill--warn');
    }

    if (step.type === 'ocr') await wait(OCR_FILL_MS);
    else await wait(700);

    if (token !== playToken) return;
    els.note.textContent = step.note || '';
    els.note.classList.remove('sv-ok', 'sv-warn');
    if (step.cls) els.note.classList.add(step.cls);
    appendLog(step.log);
    await wait(250);
  }

  async function runSystemSteps(steps, token) {
    for (const step of steps) {
      if (token !== playToken) return;
      await runStep(step, token);
    }
  }

  async function play(index) {
    const scenario = SCENARIOS[index];
    if (!scenario || busy) return;
    busy = true;
    const token = ++playToken;
    setActionsDisabled(true);
    hideAllStages();

    addUserMsg(scenario);
    appendLog('▸ Вопрос: ' + scenario.label);

    const system = runSystemSteps(scenario.steps, token);
    const reply = (async () => {
      showTyping();
      await wait(TYPING_MS);
      if (token !== playToken) return;
      hideTyping();
      addBotMsg(scenario.bot);
    })();

    await Promise.all([system, reply]);
    if (token !== playToken) return;

    if (scenario.after) scenario.after.forEach((extra) => appendLog(extra.log));
    appendLog('▸ Ответ отправлен');

    busy = false;
    setActionsDisabled(false);
    scrollFeed();
  }

  function reset() {
    playToken += 1;
    busy = false;
    setActionsDisabled(false);
    root.querySelectorAll('.msg--added').forEach((el) => el.remove());
    hideAllStages();
    clearSystemLog();
    feed.scrollTop = 0;
  }

  feed.addEventListener('click', (event) => {
    const btn = event.target.closest('.chat-action');
    if (btn && !busy) play(Number(btn.dataset.scenario));
  });

  resetBtn.addEventListener('click', reset);

  hideAllStages();
  clearSystemLog();
}

initChatSimulator();
