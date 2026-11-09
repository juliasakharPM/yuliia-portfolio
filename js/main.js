// ============================================================
// main.js — общий скрипт (фаза 2)
// 1) Плавное появление блоков при скролле (.fade-in → .visible)
// 2) Анимация счётчиков [data-counter] — 2s, ease-out (spec/01-design.md)
// Все интерактивы страниц — в отдельных js-файлах.
// ============================================================

// --- Плавное появление блоков при скролле ---
const fadeEls = document.querySelectorAll('.fade-in');

if (fadeEls.length > 0) {
  const fadeObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  fadeEls.forEach((el) => fadeObserver.observe(el));
}

// --- Счётчики ---
// data-counter="1962" · data-counter-suffix="%"
// data-counter-format="money" — тысячи через пробел (981 324)
const counters = document.querySelectorAll('[data-counter]');

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

const formatCounterValue = (value, format) => {
  if (format === 'money') {
    return Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }
  return String(Math.round(value));
};

const runCounter = (el) => {
  const target = parseFloat(el.dataset.counter);
  const suffix = el.dataset.counterSuffix || '';
  const format = el.dataset.counterFormat || '';
  const duration = 2000;
  const start = performance.now();

  const tick = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const value = formatCounterValue(target * easeOutCubic(progress), format) + suffix;
    el.textContent = value;
    if (progress < 1) {
      requestAnimationFrame(tick);
    }
  };

  requestAnimationFrame(tick);
};

if (counters.length > 0) {
  const counterObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        runCounter(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.4 });

  counters.forEach((el) => counterObserver.observe(el));
}

// --- Слайдеры презентаций кейсов (фаза 12, автоплей — фаза 23) ---
// Универсально: .case-slider-wrapper → кнопки .prev/.next и .slide.
// Активный слайд: .active; по кругу (после последнего — первый).
// Автоплей каждые 10 с; пауза при наведении/касании и после клика по кнопке.

const SLIDER_AUTOPLAY_DELAY = 10000;

function nextSlide(container, direction = 1) {
  const slides = Array.from(container.querySelectorAll('.slide'));
  if (slides.length < 2) return;
  const current = slides.findIndex((slide) => slide.classList.contains('active'));
  const from = current < 0 ? 0 : current;
  const next = (from + direction + slides.length) % slides.length;
  slides[from].classList.remove('active');
  slides[next].classList.add('active');
}

document.querySelectorAll('.case-slider-wrapper').forEach((wrapper) => {
  const slider = wrapper.querySelector('.case-slider');
  if (!slider) return;
  const slides = Array.from(slider.querySelectorAll('.slide'));
  if (slides.length < 1) return;

  const prevBtn = wrapper.querySelector('.slider-btn.prev');
  const nextBtn = wrapper.querySelector('.slider-btn.next');
  let timer = null;
  let paused = false;

  const stopAutoplay = () => {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };

  const startAutoplay = () => {
    stopAutoplay();
    timer = window.setInterval(() => {
      if (!paused && !document.hidden) nextSlide(slider, 1);
    }, SLIDER_AUTOPLAY_DELAY);
  };

  if (prevBtn) prevBtn.addEventListener('click', () => {
    nextSlide(slider, -1);
    startAutoplay();
  });

  if (nextBtn) nextBtn.addEventListener('click', () => {
    nextSlide(slider, 1);
    startAutoplay();
  });

  // Пауза, пока пользователь читает слайд: мышь над слайдером или палец на экране.
  wrapper.addEventListener('mouseenter', () => {
    paused = true;
    stopAutoplay();
  });

  wrapper.addEventListener('mouseleave', () => {
    paused = false;
    startAutoplay();
  });

  // Свайп: больше 50 px по горизонтали — переключаем слайд.
  const SWIPE_THRESHOLD = 50;
  let touchStartX = null;
  let touchStartY = null;

  wrapper.addEventListener('touchstart', (event) => {
    paused = true;
    stopAutoplay();
    const touch = event.changedTouches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
  }, { passive: true });

  const resetTouch = () => {
    touchStartX = null;
    touchStartY = null;
    paused = false;
    startAutoplay();
  };

  wrapper.addEventListener('touchend', (event) => {
    if (touchStartX !== null && touchStartY !== null) {
      const touch = event.changedTouches[0];
      const dx = touch.clientX - touchStartX;
      const dy = touch.clientY - touchStartY;
      if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
        nextSlide(slider, dx < 0 ? 1 : -1);
      }
    }
    resetTouch();
  }, { passive: true });

  wrapper.addEventListener('touchcancel', resetTouch, { passive: true });

  startAutoplay();
});

// --- Плавное раскрытие аккордеонов бизнес-логики (фаза 27) ---
// Нативный <details> открывается рывком; анимируем height вручную.
document.querySelectorAll('.logic-accordion').forEach((details) => {
  const summary = details.querySelector('.logic-summary');
  const content = details.querySelector('.logic-content');
  if (!summary || !content) return;

  let onEnd = null;
  let fallback = null;

  const cleanup = () => {
    if (onEnd) {
      details.removeEventListener('transitionend', onEnd);
      onEnd = null;
    }
    if (fallback !== null) {
      window.clearTimeout(fallback);
      fallback = null;
    }
  };

  const finish = (open) => {
    cleanup();
    details.open = open;
    details.style.height = null;
  };

  summary.addEventListener('click', (event) => {
    event.preventDefault();

    const startHeight = details.getBoundingClientRect().height;
    const willOpen = !details.open;

    cleanup();

    if (willOpen) {
      details.open = true;
      const endHeight = summary.offsetHeight + content.offsetHeight;
      details.style.height = `${startHeight}px`;
      details.offsetHeight; // принудительный reflow фиксирует стартовую высоту
      details.style.height = `${endHeight}px`;
    } else {
      const endHeight = summary.offsetHeight;
      details.style.height = `${startHeight}px`;
      details.offsetHeight;
      details.style.height = `${endHeight}px`;
    }

    onEnd = (e) => {
      if (e.target !== details || e.propertyName !== 'height') return;
      finish(willOpen);
    };
    details.addEventListener('transitionend', onEnd);
    // Страховка, если transitionend не придёт.
    fallback = window.setTimeout(() => finish(willOpen), 450);
  });
});

// --- Выпадающее меню «Кейсы» (фаза 16) ---
// Открытие по клику; закрытие по клику вне меню и по Escape.
document.querySelectorAll('.dropdown').forEach((dropdown) => {
  const toggle = dropdown.querySelector('.dropdown-toggle');
  const menu = dropdown.querySelector('.dropdown-menu');
  if (!toggle || !menu) return;

  const close = () => {
    menu.classList.remove('show');
    toggle.setAttribute('aria-expanded', 'false');
  };

  toggle.addEventListener('click', (event) => {
    event.stopPropagation();
    const isOpen = menu.classList.toggle('show');
    toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });

  menu.addEventListener('click', (event) => {
    if (event.target.closest('a')) close();
  });

  document.addEventListener('click', (event) => {
    if (!dropdown.contains(event.target)) close();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') close();
  });
});

// --- Магнитные кнопки (фаза 53) ---
// Только на десктопе с точным указателем и шириной больше 768px.
const magneticQuery = window.matchMedia('(hover: hover) and (pointer: fine)');

if (magneticQuery.matches && window.innerWidth > 768) {
  document.querySelectorAll('.btn').forEach((btn) => {
    btn.addEventListener('mousemove', (event) => {
      const rect = btn.getBoundingClientRect();
      const x = event.clientX - rect.left - rect.width / 2;
      const y = event.clientY - rect.top - rect.height / 2;
      if (Math.abs(x) < rect.width / 2 && Math.abs(y) < rect.height / 2) {
        btn.style.transform = `translate(${x * 0.2}px, ${y * 0.2}px)`;
      }
    });

    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'translate(0, 0)';
    });
  });
}

// --- Глобальный поиск Cmd/Ctrl+K (фаза 53) ---
const searchData = [
  { title: 'Кейс Астрал (AI-бот)', url: 'case-astral.html', keywords: 'астрал ai бот поддержка 1962' },
  { title: 'Кейс Нейросборка', url: 'case-neirosborka.html', keywords: 'нейросборка комьюнити rag' },
  { title: 'Кейс StoryAxis', url: 'case-storyaxis.html', keywords: 'стори квесты платформа' },
  { title: 'Кейс DesignMatrix', url: 'case-designmatrix.html', keywords: 'дизайн 3d интерьер' },
  { title: 'Как я думаю', url: 'how-i-think.html', keywords: 'процесс мышление подход' }
];

const searchModal = document.getElementById('search-modal');
const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');
const searchOpeners = document.querySelectorAll('[data-search-open]');
const searchClosers = document.querySelectorAll('[data-search-close]');

let searchActiveIndex = -1;

function searchNorm(value) {
  return (value || '').toLowerCase().trim();
}

function renderSearchResults(query) {
  if (!searchResults) return;
  const q = searchNorm(query);
  const matches = q
    ? searchData.filter((item) => searchNorm(item.title).includes(q) || searchNorm(item.keywords).includes(q))
    : searchData;

  searchResults.innerHTML = '';
  searchActiveIndex = -1;

  if (matches.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'search-empty';
    empty.textContent = 'Ничего не найдено';
    searchResults.appendChild(empty);
    return;
  }

  matches.forEach((item) => {
    const li = document.createElement('li');
    const link = document.createElement('a');
    link.href = item.url;
    link.textContent = item.title;
    li.appendChild(link);
    searchResults.appendChild(li);
  });
}

function openSearch() {
  if (!searchModal || !searchInput) return;
  searchModal.classList.add('open');
  searchModal.setAttribute('aria-hidden', 'false');
  renderSearchResults('');
  searchInput.value = '';
  requestAnimationFrame(() => searchInput.focus());
}

function closeSearch() {
  if (!searchModal) return;
  searchModal.classList.remove('open');
  searchModal.setAttribute('aria-hidden', 'true');
  searchActiveIndex = -1;
}

function moveSearchSelection(direction) {
  const links = Array.from(searchResults.querySelectorAll('a'));
  if (links.length === 0) return;
  links.forEach((link) => link.classList.remove('active'));
  searchActiveIndex = (searchActiveIndex + direction + links.length) % links.length;
  links[searchActiveIndex].classList.add('active');
  links[searchActiveIndex].scrollIntoView({ block: 'nearest' });
}

searchOpeners.forEach((btn) => btn.addEventListener('click', openSearch));
searchClosers.forEach((el) => el.addEventListener('click', closeSearch));

if (searchInput) {
  searchInput.addEventListener('input', () => renderSearchResults(searchInput.value));
  searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveSearchSelection(1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveSearchSelection(-1);
    } else if (event.key === 'Enter') {
      const active = searchResults.querySelector('a.active') || searchResults.querySelector('a');
      if (active) {
        event.preventDefault();
        window.location.href = active.getAttribute('href');
      }
    }
  });
}

document.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  if ((event.metaKey || event.ctrlKey) && key === 'k') {
    event.preventDefault();
    if (searchModal && searchModal.classList.contains('open')) {
      closeSearch();
    } else {
      openSearch();
    }
  }
  if (event.key === 'Escape' && searchModal && searchModal.classList.contains('open')) {
    closeSearch();
  }
});

// --- Котик в футере: сон → пробуждение → потягивание → сон (фаза 58) ---
document.addEventListener('DOMContentLoaded', () => {
  const cat = document.querySelector('.cat-container');
  const footer = document.querySelector('footer');

  if (cat && footer) {
    let sleepTimer = null;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        // Футер в зоне видимости — будим кота.
        if (sleepTimer !== null) {
          window.clearTimeout(sleepTimer);
          sleepTimer = null;
        }
        cat.classList.add('is-awake');

        // Через пару секунд (после потягивания) кот засыпает снова.
        sleepTimer = window.setTimeout(() => {
          cat.classList.remove('is-awake');
          sleepTimer = null;
        }, 4300);
      });
    }, { threshold: 0.5 });

    observer.observe(footer);
  }
});

// ============================================================
// Фаза 62. Автодетект языка (RU/EN)
// ============================================================

const i18n = {
  ru: {
    nav_home: "Главная", nav_cases: "Кейсы", nav_resume: "Резюме", nav_contacts: "Контакты", nav_how_i_think: "Как я думаю",
    mindmap_title: "Как я думаю", mindmap_subtitle: "Мой процесс", back_to_home: "← Вернуться на главную",
    comp_strategy: "Product Strategy",
    comp_strategy_text: `
      <p><strong>1. Точка входа (Инсайт):</strong> Идея нейроквестов родилась на обучающем вебинаре. Увидев восторженные отзывы пользователей, я поняла, что этот формат можно масштабировать.</p>
      <p><strong>2. Эволюция видения:</strong> Изначально я рассматривала продукт как маркетинговый инструмент (прогрев к покупке или концерту). Позже добавился социально-психологический слой. Ключевое осознание: мозгу не важно, играете вы или проживаете опыт в реальности. VR стал логичной финальной ступенью, но я сразу заложила fallback-сценарии для пользователей без VR-очков.</p>
      <p><strong>3. Декомпозиция и «Система нулевых ошибок»:</strong> ИИ дал оценку, что в одиночку разработать такой продукт нереально. Я приняла это как вызов: декомпозировала задачу и спроектировала модульную архитектуру. План: запуск MVP своими силами → помодульная пересборка с фрилансерами. Принцип «системы нулевых ошибок» родился из реалий: нейросети склонны «мусорить» в коде, плюс существуют риски хакерских атак. Для меня критично сохранить идеальный UX: любая техническая ошибка разрушает магию квеста.</p>
      <p><strong>4. Главный вызов:</strong> Самым сложным было остановиться в улучшениях — постоянно хотелось добавить больше фич. Второй барьер — отсутствие времени на самостоятельную реализацию MVP.</p>
    `,
    comp_ai: "AI Architecture",
    comp_ai_text: `
      <p><strong>1. Гибкость и экономика (AIOrchestrator):</strong> Смена LLM (от OpenAI до локальных моделей) была спроектирована не просто так. Пользователи (включая франчайзи) должны иметь возможность подобрать модель под свой бюджет — от более качественных и дорогих до дешевых/бесплатных в рамках лимитов. Это экономически эффективно. С точки зрения UX: если одна нейросеть перестает работать, я просто подключаю другую модель без переписывания ядра.</p>
      <p><strong>2. Борьба с галлюцинациями в коде:</strong> Главным вызовом стало то, что я не пишу код сама. Самое сложное — отследить галлюцинации ИИ при генерации. Я заложила в архитектуру возможность помодульной переписки: если нейросеть сгенерировала нестабильный код, модуль можно изолировать и переписать с нуля, не ломая всю систему.</p>
      <p><strong>3. Архитектура промптинга (3 шага):</strong> Для минимизации мусора в коде я выстроила жесткую систему:<br>
      1. Создание задачи.<br>
      2. Отслеживание логики микрозадач.<br>
      3. Анализ одной и той же задачи несколькими нейросетями (кросс-валидация), проверка и доработка.<br>
      И только после этой цепочки — этап вайбкодинга.</p>
    `,
    comp_econ: "Экономика и воронка",
    comp_econ_text: `
      <p><strong>1. Стратегия монетизации (от B2C к экосистеме):</strong> Путь начался с B2C-сегмента. Затем я искала способы извлечь больше прибыли и расширила воронку на B2B (как логичное продолжение). Следующим шагом стало открытие админки для других авторов (Creator Economy). Моя логика проста: чем выше экономическая выгода проекта, тем больше фич и ценности я смогу в него внедрить. Также прорабатывала партнерства с производителями VR и смежными сегментами рынка.</p>
      <p><strong>2. Кросс-платформенность как драйвер удержания:</strong> Изначально кроссплатформенность была ценностью для блогеров и инфлюенсеров, которым нужно «перетаскивать» аудиторию за собой. Позже я сместила фокус на удобство обычных пользователей: не все друзья сидят в одной соцсети.</p>
      <p><strong>3. Экосистемная воронка:</strong> Архитектура предусматривает Web, Mobile и Desktop версии. Долгосрочная стратегия — дать каждому пространству свою уникальную фичу, чтобы пользователю было <em>интересно</em> переключаться между платформами, а не просто <em>вынужденно</em> мигрировать.</p>
    `,
    comp_data: "Данные и UX",
    comp_data_text: `
      <p><strong>1. CustDev и психотипы пользователей:</strong> Я понимала, что к моменту выхода продукта рынок может перенасытиться однотипными ИИ-новеллами. Моей целью было создать адаптивный сценарий, который подстраивается под пользователя. Это усиливало эффект как в маркетинговых квестах, так и в развлекательных играх. Опыт должен быть максимально приближен к реальности. Для этого планировалась разработка сценариев совместно с командой психологов — чтобы исключить любой вред для ментального здоровья пользователей.</p>
      <p><strong>2. Архитектура Entry Points (Точек входа):</strong> Если человек играет в квест и хочет сменить устройство (например, с телефона на ПК), зачем ему начинать заново и проходить все шаги с нуля? Это ломает опыт. Поэтому я заложила архитектуру Entry Points. Это логичное развитие в сторону мощного, персонализированного опыта, который не привязан к одному гаджету.</p>
      <p><strong>3. Событийная модель и A/B-тесты:</strong> Возможность заходить с любого шага (через deep-links) дает нам инфраструктуру для запуска A/B-тестов гипотез и демо-версий без изменения ядра кода. Плюс заложена событийная модель трекинга (<code>quest_started</code>, <code>choice_made</code> и т.д.) для отслеживания воронки и точек оттока.</p>
    `,
    comp_security: "Безопасность",
    comp_security_text: `
      <p><strong>1. 4 уровня деградации (Zero-Error UX):</strong> Мне было критически важно создать «систему нулевых ошибок»: пользователь не должен знать, что что-то сломалось. При сбое он получал «оболочку» в виде базового сценария, разработанного с учетом психотипов. Мы сознательно шли на небольшое ухудшение качества (снижение персонализации), но человек не замечал подмены и не выпадал из иммерсивного опыта. В это же время сигнал об ошибке мгновенно поступал мне как владельцу продукта для оперативного исправления.</p>
      <p><strong>2. Этическая защита («Красная кнопка»):</strong> Эта идея продумывалась как защита пользователей и соблюдение законодательных норм. Человек может в любой момент выйти из пугающей или травмирующей сцены и продолжить игру без вреда для психики. Это гарантирует, что продукт не нанесет эмоционального ущерба.</p>
    `,
    comp_process: "Процессы",
    comp_process_text: `
      <p><strong>1. База знаний и снижение нагрузки на саппорт:</strong> Для сложной платформы требовалась подробная документация. Я инициировала создание базы знаний с пошаговыми видеоинструкциями. Это решало две задачи: креаторы могли самостоятельно и быстро обучиться работе с платформой, а нагрузка на техническую поддержку снижалась за счет понятных гайдов.</p>
      <p><strong>2. Ролевая модель и аудит (Governance):</strong> Для работы с B2B-клиентами и франчайзи я спроектировала строгую систему разграничения прав доступа:<br>
      • <strong>Owner (Владелец):</strong> полный доступ, управление биллингом и настройками.<br>
      • <strong>Editor (Редактор):</strong> создание и редактирование контента/сценариев.<br>
      • <strong>Viewer (Зритель):</strong> только просмотр и потребление контента.<br>
      • <em>Безопасность:</em> Заложен аудит действий администраторов (Action Logs), чтобы владелец всегда видел, кто и что менял на платформе.</p>
    `
  },
  en: {
    nav_home: "Home", nav_cases: "Cases", nav_resume: "Resume", nav_contacts: "Contacts", nav_how_i_think: "How I Think",
    mindmap_title: "How I Think", mindmap_subtitle: "My Process", back_to_home: "← Back to Home",
    comp_strategy: "Product Strategy",
    comp_strategy_text: `
      <p><strong>1. Entry point (Insight):</strong> The idea of neuro-quests was born at an educational webinar. Seeing enthusiastic user reviews, I realized the format could be scaled.</p>
      <p><strong>2. Evolution of the vision:</strong> Initially I saw the product as a marketing tool (warming up for a purchase or a concert). Later a socio-psychological layer was added. The key realization: the brain doesn't care whether you are playing or living an experience in reality. VR became the logical final stage, but I immediately built in fallback scenarios for users without VR headsets.</p>
      <p><strong>3. Decomposition and the "zero-error system":</strong> AI estimated that building such a product solo was unrealistic. I took it as a challenge: decomposed the task and designed a modular architecture. The plan: launch an MVP on my own → rebuild module by module with freelancers. The "zero-error system" principle was born from reality: neural networks tend to "litter" code, plus there are hacker attack risks. For me it is critical to preserve a perfect UX: any technical error destroys the magic of the quest.</p>
      <p><strong>4. Main challenge:</strong> The hardest part was to stop improving — I constantly wanted to add more features. The second barrier was the lack of time to implement the MVP myself.</p>
    `,
    comp_ai: "AI Architecture",
    comp_ai_text: `
      <p><strong>1. Flexibility and economics (AIOrchestrator):</strong> Switching LLMs (from OpenAI to local models) was designed for a reason. Users (including franchisees) must be able to choose a model that fits their budget — from higher-quality and more expensive to cheap/free within limits. This is cost-effective. From a UX perspective: if one neural network stops working, I simply connect another model without rewriting the core.</p>
      <p><strong>2. Combating code hallucinations:</strong> The main challenge was that I do not write code myself. The hardest part is tracking AI hallucinations during generation. I built module-level rewritability into the architecture: if a neural network generates unstable code, the module can be isolated and rewritten from scratch without breaking the whole system.</p>
      <p><strong>3. Prompting architecture (3 steps):</strong> To minimize code garbage, I built a strict system:<br>
      1. Task creation.<br>
      2. Tracking the logic of micro-tasks.<br>
      3. Analyzing the same task with several neural networks (cross-validation), checking and refining.<br>
      And only after this chain — the vibe-coding stage.</p>
    `,
    comp_econ: "Economics & Funnel",
    comp_econ_text: `
      <p><strong>1. Monetization strategy (from B2C to an ecosystem):</strong> The journey started with the B2C segment. Then I looked for ways to extract more profit and expanded the funnel to B2B (as a logical continuation). The next step was opening an admin panel for other creators (Creator Economy). My logic is simple: the higher the project's economic benefit, the more features and value I can bring into it. I also explored partnerships with VR manufacturers and adjacent market segments.</p>
      <p><strong>2. Cross-platform as a retention driver:</strong> Initially cross-platform was valuable for bloggers and influencers who need to "pull" their audience along. Later I shifted the focus to convenience for regular users: not all friends are on the same social network.</p>
      <p><strong>3. Ecosystem funnel:</strong> The architecture provides for Web, Mobile and Desktop versions. The long-term strategy is to give each space its own unique feature so that users are <em>interested</em> in switching between platforms, rather than <em>forced</em> to migrate.</p>
    `,
    comp_data: "Data & UX",
    comp_data_text: `
      <p><strong>1. CustDev and user psychotypes:</strong> I understood that by the time the product launched, the market might be saturated with look-alike AI novels. My goal was to create an adaptive scenario that adjusts to the user. This strengthened the effect both in marketing quests and in entertainment games. The experience should be as close to reality as possible. To achieve this, scenario development was planned together with a team of psychologists — to exclude any harm to users' mental health.</p>
      <p><strong>2. Entry Points architecture:</strong> If a person is playing a quest and wants to change devices (for example, from a phone to a PC), why should they start over and go through all the steps again? That breaks the experience. So I built the Entry Points architecture. It is a logical step toward a powerful, personalized experience that is not tied to a single gadget.</p>
      <p><strong>3. Event model and A/B tests:</strong> The ability to enter from any step (via deep links) gives us the infrastructure to run A/B tests of hypotheses and demo versions without changing the code core. An event tracking model is also built in (<code>quest_started</code>, <code>choice_made</code>, etc.) to track the funnel and churn points.</p>
    `,
    comp_security: "Security",
    comp_security_text: `
      <p><strong>1. 4 levels of degradation (Zero-Error UX):</strong> It was critical for me to create a "zero-error system": the user should not know that something broke. On failure, they received a "shell" in the form of a basic scenario designed with psychotypes in mind. We deliberately accepted a slight quality drop (reduced personalization), but the person did not notice the substitution and did not fall out of the immersive experience. At the same time, an error signal was instantly sent to me as the product owner for prompt fixing.</p>
      <p><strong>2. Ethical protection ("Red Button"):</strong> This idea was designed as user protection and compliance with legal norms. A person can exit a frightening or traumatic scene at any moment and continue the game without harm to their mental health. This ensures the product will not cause emotional damage.</p>
    `,
    comp_process: "Processes",
    comp_process_text: `
      <p><strong>1. Knowledge base and reduced support workload:</strong> A complex platform required detailed documentation. I initiated the creation of a knowledge base with step-by-step video instructions. This solved two problems: creators could learn the platform independently and quickly, and the technical support workload decreased thanks to clear guides.</p>
      <p><strong>2. Role model and audit (Governance):</strong> To work with B2B clients and franchisees, I designed a strict access-control system:<br>
      • <strong>Owner:</strong> full access, billing and settings management.<br>
      • <strong>Editor:</strong> creating and editing content/scenarios.<br>
      • <strong>Viewer:</strong> view and consume content only.<br>
      • <em>Security:</em> Administrator action logs (Action Logs) are built in, so the owner always sees who changed what on the platform.</p>
    `
  }
};

document.addEventListener('DOMContentLoaded', () => {
  const langBtn = document.getElementById('lang-switcher');

  // АВТОДЕТЕКТ ЯЗЫКА
  let savedLang = localStorage.getItem('site_lang');
  let currentLang = savedLang;

  if (!currentLang) {
    const browserLang = (navigator.language || navigator.userLanguage).toLowerCase();
    // Если браузер английский, ставим EN, иначе RU
    currentLang = browserLang.startsWith('en') ? 'en' : 'ru';
  }

  function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('site_lang', lang);
    document.documentElement.lang = lang;
    if (langBtn) langBtn.textContent = lang === 'ru' ? 'EN' : 'RU';

    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (i18n[lang] && i18n[lang][key]) el.innerHTML = i18n[lang][key];
    });
  }

  // Делаем переключатель доступным другим скриптам (нейронный мозг).
  window.setLanguage = setLanguage;
  window.getSiteLanguage = () => currentLang;

  if (langBtn) {
    langBtn.addEventListener('click', () => setLanguage(currentLang === 'ru' ? 'en' : 'ru'));
    setLanguage(currentLang); // Инициализация при загрузке
  }
});

// ============================================================
// Фаза 64. Нейронная карта StoryAxis: узлы, плашки, модальное окно
// ============================================================

const storyaxisData = ['strategy', 'ai', 'econ', 'data', 'security', 'process'];

const nodesData = [
  { id: 'strategy', x: 250, y: 200 }, // Верх-лево
  { id: 'ai',       x: 550, y: 200 }, // Верх-право
  { id: 'econ',     x: 700, y: 400 }, // Право
  { id: 'data',     x: 550, y: 600 }, // Низ-право
  { id: 'security', x: 250, y: 600 }, // Низ-лево
  { id: 'process',  x: 100, y: 400 }  // Лево
];

document.addEventListener('DOMContentLoaded', () => {
  const activeNode = document.querySelector('.brain-svg .case-node.active');
  const connectionsLayer = document.getElementById('connections-layer');
  const mindmapContainer = document.querySelector('.mindmap-container');
  const brainSvg = document.querySelector('.brain-svg');
  const modal = document.getElementById('mindmap-modal');
  const modalTitle = document.getElementById('modal-title');
  const modalText = document.getElementById('modal-text');
  const closeModalBtn = document.getElementById('close-mindmap-modal');

  if (!activeNode || !connectionsLayer || !mindmapContainer) return;

  const getLang = () => (
    (window.getSiteLanguage && window.getSiteLanguage()) ||
    localStorage.getItem('site_lang') ||
    'ru'
  );

  // --- Модальное окно ---
  function openModal(id) {
    if (!modal || !modalTitle || !modalText) return;
    const lang = getLang();
    const dict = i18n[lang] || i18n.ru;

    modalTitle.textContent = dict[`comp_${id}`] || '';
    modalText.innerHTML = dict[`comp_${id}_text`] || '';
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    if (!modal) return;
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);

  if (modal) {
    modal.addEventListener('click', (event) => {
      if (event.target === modal) closeModal();
    });
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal && modal.style.display === 'flex') {
      closeModal();
    }
  });

  // --- Позиционирование HTML-плашек поверх SVG ---
  function positionNodeLabels() {
    const svgRect = brainSvg.getBoundingClientRect();
    const containerRect = mindmapContainer.getBoundingClientRect();

    mindmapContainer.querySelectorAll('.mindmap-node-label').forEach((label) => {
      const x = parseFloat(label.dataset.x);
      const y = parseFloat(label.dataset.y);
      const left = (svgRect.left - containerRect.left) + (x / 800) * svgRect.width;
      const top = (svgRect.top - containerRect.top) + (y / 800) * svgRect.height;
      label.style.left = `${left}px`;
      label.style.top = `${top}px`;
    });
  }

  window.addEventListener('resize', positionNodeLabels);

  // --- Проращивание карты ---
  activeNode.addEventListener('click', () => {
    const lang = getLang();
    const dict = i18n[lang] || i18n.ru;
    const startX = 400;
    const startY = 400;

    connectionsLayer.innerHTML = '';
    mindmapContainer.querySelectorAll('.mindmap-node-label').forEach((label) => label.remove());

    nodesData.forEach((node, index) => {
      // Прямая линия от центра к узлу.
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', `M ${startX} ${startY} L ${node.x} ${node.y}`);
      path.setAttribute('class', 'neuron-path');
      path.setAttribute('filter', 'url(#neon-glow)');
      connectionsLayer.appendChild(path);

      // Кружок-узел на конце линии.
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', node.x);
      circle.setAttribute('cy', node.y);
      circle.setAttribute('r', '8');
      circle.setAttribute('fill', 'var(--metric)');
      circle.setAttribute('class', 'mindmap-node');
      circle.setAttribute('filter', 'url(#neon-glow)');
      circle.dataset.node = node.id;
      circle.style.cursor = 'pointer';
      circle.style.opacity = '0';
      circle.addEventListener('click', () => openModal(node.id));
      connectionsLayer.appendChild(circle);

      // HTML-плашка с названием компетенции.
      const label = document.createElement('div');
      label.className = 'mindmap-node-label';
      label.dataset.node = node.id;
      label.dataset.x = node.x;
      label.dataset.y = node.y;
      label.dataset.i18n = `comp_${node.id}`;
      label.textContent = dict[`comp_${node.id}`] || node.id;
      label.addEventListener('click', () => openModal(node.id));
      mindmapContainer.appendChild(label);

      setTimeout(() => {
        circle.style.transition = 'opacity 0.35s ease';
        circle.style.opacity = 1;
        label.classList.add('visible');
      }, index * 140);
    });

    positionNodeLabels();
    requestAnimationFrame(positionNodeLabels);
  });
});
