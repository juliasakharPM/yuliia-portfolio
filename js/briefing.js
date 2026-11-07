// ============================================================
// briefing.js — пошаговый визард брифинга (фаза 9, v3).
// Один экран в момент времени: renderStep() с fade-out/fade-in.
// Данные кейсов и вариантов: spec/06-storyaxis.md (экраны 2–7).
// Состояние восстанавливается из localStorage (sa_briefing_state).
// ============================================================

const BF_STORAGE_KEY = 'sa_briefing_state';

// TODO: заменить YOUR_FORM_ID на реальный endpoint Formspree.
const BF_FORMSPREE_URL = 'https://formspree.io/f/mrppjjwr';

// Состояние визарда. Шаги: 1 интро → 2 задача → 3 стадия →
// 4 метрика → 5 боль → 6 кейс → 7 форма → 8 финал (success).
const state = { step: 1, task: null, stage: null, metric: null, pain: null };

// Названия метрик для шага 5 (подстановка в #metric-name).
const METRIC_NAMES = {
  MRR: 'Выручка / MRR',
  Retention: 'Удержание / Retention',
  CAC: 'Стоимость привлечения / CAC',
  Time: 'Время на рутинные операции',
  CR: 'Конверсия в оплату'
};

// Шаг 6: карточки кейсов по задаче (spec, экран 4; astral — по тексту сценария).
const CASES = {
  astral: {
    badge: null,
    lead: 'Как я снизила нагрузку на поддержку на 70%',
    problem: '70% запросов — рутина. Сотрудники тратили 24 часа в неделю.',
    solution: 'Инициировала проект AI-бота с адаптивным порогом уверенности.',
    result: 'Нагрузка −70%, экономия 981 324 ₽, окупаемость 22 дня, ROI 1962%.'
  },
  designmatrix: {
    badge: 'КОНЦЕПТ-ПРОЕКТ',
    lead: 'Как я спроектировала облачную платформу с AI для фрагментированного рынка 3D-проектирования',
    problem: 'дорогие проф. инструменты vs примитивные онлайн-решения.',
    solution: 'облачная платформа с AI + маркетплейс + открытый API.',
    result: 'бюджет 12–50 млн ₽, окупаемость 18–24 мес, ROI 20–25%.'
  },
  storyaxis: {
    badge: null,
    lead: 'Как я спроектировала экосистему для фрагментированного рынка иммерсивных сценариев',
    problem: 'каждый квест с нуля, нет стандартов.',
    solution: 'экосистема с Entry Points, 4 уровнями деградации, Parent Dashboard.',
    result: '4 потока монетизации, прогнозируемая доходность в первый год.'
  },
  neirosborka: {
    badge: null,
    lead: 'Как я защитила закрытое комьюнити нейросетей от утечек и токсичности',
    problem: 'утечка ИС, отток экспертов, разрушение экосистемы.',
    solution: 'регламенты, подписка, ролевая модель, RAG-чат.',
    result: '0% оттока экспертов за 6 месяцев.'
  }
};

function bfSaveState() {
  try {
    localStorage.setItem(BF_STORAGE_KEY, JSON.stringify(state));
  } catch (e) { /* localStorage недоступен — визард работает без сохранения */ }
}

// Восстановление состояния: неизвестные/чужие данные → шаг понижается
// до последнего сохранённого валидного ответа.
function bfLoadState() {
  let saved;
  try {
    saved = JSON.parse(localStorage.getItem(BF_STORAGE_KEY) || 'null');
  } catch (e) {
    return;
  }
  if (!saved || typeof saved !== 'object') return;

  const step = Number(saved.step);
  if (Number.isInteger(step) && step >= 1 && step <= 8) state.step = step;

  if (typeof saved.task === 'string' && CASES[saved.task]) state.task = saved.task;
  if (typeof saved.stage === 'string' && ['idea', 'mvp', 'growth', 'scale', 'internal'].indexOf(saved.stage) !== -1) state.stage = saved.stage;
  if (typeof saved.metric === 'string' && METRIC_NAMES[saved.metric]) state.metric = saved.metric;
  if (typeof saved.pain === 'string' && ['routine', 'churn', 'monetization', 'team', 'ai'].indexOf(saved.pain) !== -1) state.pain = saved.pain;

  if (!state.task && state.step >= 3) state.step = Math.min(state.step, 2);
  if (!state.stage && state.step >= 4) state.step = Math.min(state.step, 3);
  if (!state.metric && state.step >= 5) state.step = Math.min(state.step, 4);
  if (!state.pain && state.step >= 6) state.step = Math.min(state.step, 5);
}

// Валидный шаг: не дальше, чем позволяют сохранённые ответы.
function bfSanitizeStep() {
  if (!state.task && state.step >= 3) state.step = Math.min(state.step, 2);
  if (!state.stage && state.step >= 4) state.step = Math.min(state.step, 3);
  if (!state.metric && state.step >= 5) state.step = Math.min(state.step, 4);
  if (!state.pain && state.step >= 6) state.step = Math.min(state.step, 5);
}

// --- построение HTML экранов --------------------------------------------------

// Карточка кейса для шага 6 (в #case-content).
function bfCaseHtml(task) {
  const data = CASES[task];
  let html = '';
  if (data.badge) html += '<p class="bf-case-flag mono">' + data.badge + '</p>';
  html += '<h4>' + data.lead + '</h4>' +
    '<p><strong>Проблема:</strong> ' + data.problem + '</p>' +
    '<p><strong>Решение:</strong> ' + data.solution + '</p>' +
    '<p><strong>Результат:</strong> ' + data.result + '</p>';
  return html;
}

// Экран 8: финал после успешной отправки формы.
function bfSuccessHtml() {
  return '<div class="bf-screen">' +
    '<div class="bf-msg" style="text-align: center; border-left: none; border-top: 3px solid var(--accent);">' +
      '<h3 style="color: var(--accent); margin-bottom: 12px;">Принято!</h3>' +
      'Свяжусь с вами в течение 24 часов.' +
    '</div>' +
    '<a class="btn btn--outline" href="resume.pdf" download style="margin-top: 20px;">Скачать резюме (PDF)</a>' +
  '</div>';
}

function bfBuildStep(step) {
  if (step === 1) {
    return '<div class="bf-screen">' +
      '<div style="display: flex; gap: 32px; align-items: flex-start; flex-wrap: wrap;">' +
        '<img src="img/quest.jpg" class="bf-avatar-img rounded-2xl" alt="Юлия Сахарова" width="180" height="180">' +
        '<div style="flex: 1; min-width: 280px;">' +
          '<p style="margin-bottom: 16px;">Здравствуйте, я Юлия Сахарова, Product Manager | Product Owner.</p>' +
          '<p style="margin-bottom: 16px;">Проектирую бизнес-логику. За 5 лет в IT я прошла путь от техподдержки до управления продуктами. Считаю unit-экономику, защищаю бюджеты перед финдиром и выстраиваю процессы так, чтобы команда выдавала результат, а не сгорала на митингах.</p>' +
          '<p style="margin-bottom: 16px;">Мой профиль — это цифры. Мой рекорд — окупаемость AI-решения за 22 дня с ROI 1962%.</p>' +
          '<p>Прежде чем мы перейдем к обсуждению оффера, давайте проведем быстрый чек-ап. Ответьте на несколько вопросов о вашей задаче, и я покажу, как решала подобное на практике.</p>' +
          '<button class="btn btn--primary" style="margin-top: 24px;" onclick="nextStep()">Начать брифинг →</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  if (step === 2) {
    return '<div class="bf-screen">' +
      '<div class="bf-msg">С какой проблемой вы пришли? Выберите задачу, которая стоит перед бизнесом.</div>' +
      '<div class="bf-options">' +
        '<button class="bf-btn" onclick="selectTask(\'astral\')">Внедрить AI во внутренние процессы</button>' +
        '<button class="bf-btn" onclick="selectTask(\'storyaxis\')">Продукт не растёт / неясна монетизация</button>' +
        '<button class="bf-btn" onclick="selectTask(\'neirosborka\')">Хаос в процессах и требованиях</button>' +
        '<button class="bf-btn" onclick="selectTask(\'designmatrix\')">Нужен Product Owner, который видит продукт целиком</button>' +
      '</div>' +
    '</div>';
  }

  if (step === 3) {
    return '<div class="bf-screen">' +
      '<div class="bf-msg"><p style="margin-bottom: 12px; color: var(--text-muted);">Принято. Это классическая продуктовая задача. Давайте уточним контекст, чтобы я показала максимально релевантный кейс.</p>На какой стадии сейчас продукт или задача?</div>' +
      '<div class="bf-options">' +
        '<button class="bf-btn" onclick="selectStage(\'idea\')">Идея / pre-seed</button>' +
        '<button class="bf-btn" onclick="selectStage(\'mvp\')">MVP, первые пользователи</button>' +
        '<button class="bf-btn" onclick="selectStage(\'growth\')">Рост, ищем Product-Market Fit</button>' +
        '<button class="bf-btn" onclick="selectStage(\'scale\')">Масштабирование / оптимизация</button>' +
        '<button class="bf-btn" onclick="selectStage(\'internal\')">Внутренняя задача в компании</button>' +
      '</div>' +
    '</div>';
  }

  if (step === 4) {
    return '<div class="bf-screen">' +
      '<div class="bf-msg"><p style="margin-bottom: 12px; color: var(--text-muted);">Понятно. На этой стадии критически важно не распылять ресурсы. Учту это в кейсе.</p>Какая метрика болит сильнее всего?</div>' +
      '<div class="bf-options">' +
        '<button class="bf-btn" onclick="selectMetric(\'MRR\')">Выручка / MRR</button>' +
        '<button class="bf-btn" onclick="selectMetric(\'Retention\')">Удержание / Retention</button>' +
        '<button class="bf-btn" onclick="selectMetric(\'CAC\')">Стоимость привлечения / CAC</button>' +
        '<button class="bf-btn" onclick="selectMetric(\'Time\')">Время на рутинные операции</button>' +
        '<button class="bf-btn" onclick="selectMetric(\'CR\')">Конверсия в оплату</button>' +
      '</div>' +
    '</div>';
  }

  if (step === 5) {
    const name = METRIC_NAMES[state.metric] || '';
    return '<div class="bf-screen">' +
      '<div class="bf-msg"><p style="margin-bottom: 12px; color: var(--text-muted);">Логично. <span id="metric-name" style="color: var(--accent);">' + name + '</span> — это фундамент. Без работы с ней остальное даст лишь временный эффект.</p>В чем главная боль прямо сейчас?</div>' +
      '<div class="bf-options">' +
        '<button class="bf-btn" onclick="selectPain(\'routine\')">Дорого обходятся рутинные процессы</button>' +
        '<button class="bf-btn" onclick="selectPain(\'churn\')">Пользователи приходят и уходят</button>' +
        '<button class="bf-btn" onclick="selectPain(\'monetization\')">Неясно, как монетизировать продукт</button>' +
        '<button class="bf-btn" onclick="selectPain(\'team\')">Команда не понимает, что делать дальше</button>' +
        '<button class="bf-btn" onclick="selectPain(\'ai\')">Нужно внедрить AI, но страшно наступить на грабли</button>' +
      '</div>' +
    '</div>';
  }

  if (step === 6) {
    // Защита: нет сохранённой задачи → визард не может показать кейс.
    if (!state.task) state.task = 'storyaxis';
    return '<div class="bf-screen">' +
      '<div class="bf-msg">Знакомая ситуация, часто с ней сталкиваюсь. Сейчас покажу, как я решала похожую задачу и к каким цифрам мы пришли.</div>' +
      '<div class="chat-case-card" id="case-content">' + bfCaseHtml(state.task) + '</div>' +
      '<button class="btn btn--primary" style="margin-top: 24px;" onclick="renderStep(7)">Обсудить ваш проект →</button>' +
    '</div>';
  }

  if (step === 7) {
    return '<div class="bf-screen">' +
      '<div class="bf-msg">Брифинг завершен. Вы рассказали о задаче, я показала, как решаю такие проблемы. Оставьте контакты и краткое описание проекта. Если увижу, что моя экспертиза полезна, подготовлю первичное видение вашей задачи: гипотезы, точки роста и метрики, которые подняла бы в первую очередь. Давайте сразу перейдем к сути и обсудим потенциальный оффер.</div>' +
      '<form id="bf-form" class="chat-form-card" onsubmit="submitForm(event)">' +
        '<input type="text" name="company" placeholder="Название компании / продукта *" required>' +
        '<input type="url" name="website" placeholder="Ссылка на сайт (опционально)">' +
        '<textarea name="task" placeholder="Кратко о задаче *" rows="3" required></textarea>' +
        '<input type="text" name="name" placeholder="Ваше имя *" required>' +
        '<input type="text" name="contact" placeholder="Telegram или Email *" required>' +
        '<input type="text" name="_gotcha" style="display:none" tabindex="-1" autocomplete="off">' +
        '<input type="hidden" name="answer_task">' +
        '<input type="hidden" name="answer_stage">' +
        '<input type="hidden" name="answer_metric">' +
        '<input type="hidden" name="answer_pain">' +
        '<p class="bf-form-error" id="bf-form-error" hidden></p>' +
        '<button type="submit" class="btn btn--primary" style="width: 100%; margin-top: 8px;">Получить видение проекта →</button>' +
      '</form>' +
      '<a class="btn btn--outline" href="resume.pdf" download style="margin-top: 16px;">Скачать резюме (PDF)</a>' +
    '</div>';
  }

  // step 8: success
  return bfSuccessHtml();
}

// --- рендер шага ----------------------------------------------------------------

// Ставит скрытые поля формы: ответы визарда уходят вместе с данными формы.
function bfFillHiddenAnswers() {
  const form = document.getElementById('bf-form');
  if (!form) return;
  form.elements.answer_task.value = state.task ? state.task : '';
  form.elements.answer_stage.value = state.stage ? state.stage : '';
  form.elements.answer_metric.value = state.metric ? state.metric : '';
  form.elements.answer_pain.value = state.pain ? state.pain : '';
}

// Замена текущего экрана: fade-out → новая разметка fade-in.
function bfSwapScreen(html) {
  const content = document.getElementById('bf-content');
  if (!content) return;

  const current = content.querySelector('.bf-screen');
  if (!current) {
    content.innerHTML = html;
    return;
  }

  current.classList.add('fade-out');
  setTimeout(function () {
    content.innerHTML = html;
    const next = content.querySelector('.bf-screen');
    next.classList.add('fade-in');
    bfFillHiddenAnswers();
  }, 250);
}

// Публичные функции для onclick-разметки экранов.

function renderStep(step, animate) {
  state.step = step;
  bfSaveState();
  if (animate === false) {
    // без анимации (первый рендер / restore)
    const content = document.getElementById('bf-content');
    if (content) {
      content.innerHTML = bfBuildStep(state.step);
      bfFillHiddenAnswers();
    }
    return;
  }
  bfSwapScreen(bfBuildStep(state.step));
}

function nextStep() {
  renderStep(state.step + 1);
}

function selectTask(task) {
  state.task = task;
  nextStep();
}

function selectStage(stage) {
  state.stage = stage;
  nextStep();
}

function selectMetric(metric) {
  state.metric = metric;
  nextStep();
}

function selectPain(pain) {
  state.pain = pain;
  nextStep();
}

function submitForm(e) {
  e.preventDefault();
  const form = e.target;
  const error = document.getElementById('bf-form-error');
  const btn = form.querySelector('button[type="submit"]');
  const original = btn.textContent;

  // honeypot: заполнен скрытый элемент → тихий успех без запроса.
  if (form.elements._gotcha.value) {
    bfSwapScreen(bfSuccessHtml());
    state.step = 8;
    bfSaveState();
    return;
  }

  error.hidden = true;
  btn.disabled = true;
  btn.textContent = 'Отправляю...';

  fetch(BF_FORMSPREE_URL, {
    method: 'POST',
    body: new FormData(form),
    headers: { Accept: 'application/json' }
  })
    .then(function (response) {
      if (!response.ok) throw new Error('bad status');
      // успех: финальный экран
      state.step = 8;
      bfSaveState();
      bfSwapScreen(bfSuccessHtml());
    })
    .catch(function () {
      error.textContent = 'Что-то пошло не так, напишите мне напрямую в Telegram @JSArchitectRealite';
      error.hidden = false;
      btn.disabled = false;
      btn.textContent = original;
    });
}

// --- старт -----------------------------------------------------------------------

function bfInit() {
  const content = document.getElementById('bf-content');
  if (!content) return;

  bfLoadState();
  bfSanitizeStep();
  if (state.step < 1) state.step = 1;
  if (state.step > 8) state.step = 8;

  // первый рендер без анимации
  content.innerHTML = bfBuildStep(state.step);
  bfFillHiddenAnswers();
}

bfInit();
