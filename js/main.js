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
      <p>Спроектировала модульную архитектуру для запуска MVP силами одного человека с масштабированием в полноценную экосистему.</p>
      <ul>
        <li><strong>Точка входа:</strong> обучающий вебинар, который показал востребованность формата.</li>
        <li><strong>Эволюция:</strong> от маркетингового прогрева к социально-психологическому слою.</li>
        <li><strong>VR:</strong> заложена как финальная ступень с fallback-сценариями для пользователей без очков.</li>
      </ul>
      <p><strong>Вызов:</strong> остановиться в улучшениях и уложиться в дедлайны.</p>
    `,
    comp_ai: "AI Architecture",
    comp_ai_text: `
      <p>Спроектировала модуль <strong>AIOrchestrator</strong> для гибкости и отказоустойчивости.</p>
      <ul>
        <li><strong>Экономика:</strong> смена LLM под бюджет франчайзи (включая бесплатные лимиты).</li>
        <li><strong>Устойчивость:</strong> при сбое одной модели подключается другая без переписывания ядра.</li>
        <li><strong>Борьба с галлюцинациями:</strong> 3-шаговая система (создание задачи → логика микрозадач → кросс-валидация несколькими нейросетями) перед вайбкодингом.</li>
      </ul>
    `,
    comp_econ: "Экономика и воронка",
    comp_econ_text: `
      <p>Спроектировала 4 потока монетизации для диверсификации выручки.</p>
      <ul>
        <li><strong>Потоки:</strong> B2C, B2B, Creator Economy (админка для авторов), партнерства с VR-производителями.</li>
        <li><strong>Кроссплатформенность:</strong> Web, Mobile, Desktop как драйвер удержания.</li>
        <li><strong>Стратегия:</strong> уникальные фичи для каждого девайса, чтобы стимулировать миграцию пользователей.</li>
      </ul>
    `,
    comp_data: "Данные и UX",
    comp_data_text: `
      <p>Выстроила процессы на основе данных и адаптивного UX.</p>
      <ul>
        <li><strong>Психотипы:</strong> адаптация сценариев с командой психологов для безопасности пользователя.</li>
        <li><strong>Entry Points:</strong> бесшовный переход между устройствами без потери прогресса.</li>
        <li><strong>Аналитика:</strong> событийная модель (quest_started, choice_made) для A/B-тестов и отслеживания оттока.</li>
      </ul>
    `,
    comp_security: "Безопасность",
    comp_security_text: `
      <p>Заложила концепцию Zero-Error UX и этическую защиту.</p>
      <ul>
        <li><strong>Zero-Error UX:</strong> при сбое ИИ подменяет ответ на базовый сценарий (пользователь не замечает потери качества).</li>
        <li><strong>Деградация:</strong> 4 уровня (до режима Read-Only).</li>
        <li><strong>Красная кнопка:</strong> мгновенный выход из травмирующих сцен для защиты психики и соответствия законодательству.</li>
      </ul>
    `,
    comp_process: "Процессы",
    comp_process_text: `
      <p>Настроила прозрачные процессы для B2B и франчайзи.</p>
      <ul>
        <li><strong>Роли:</strong> строгая модель доступов (Owner / Editor / Viewer) с аудитом действий.</li>
        <li><strong>База знаний:</strong> видеоинструкции для креаторов для снижения нагрузки на саппорт.</li>
      </ul>
    `
  },
  en: {
    nav_home: "Home", nav_cases: "Cases", nav_resume: "Resume", nav_contacts: "Contacts", nav_how_i_think: "How I Think",
    mindmap_title: "How I Think", mindmap_subtitle: "My Process", back_to_home: "← Back to Home",
    comp_strategy: "Product Strategy",
    comp_strategy_text: `
      <p>Designed a modular architecture to launch an MVP single-handedly, scaling into a full ecosystem.</p>
      <ul>
        <li><strong>Entry point:</strong> an educational webinar that proved demand for the format.</li>
        <li><strong>Evolution:</strong> from marketing warm-up to a socio-psychological layer.</li>
        <li><strong>VR:</strong> designed as the final stage, with fallback scenarios for users without headsets.</li>
      </ul>
      <p><strong>Challenge:</strong> knowing when to stop improving and meeting deadlines.</p>
    `,
    comp_ai: "AI Architecture",
    comp_ai_text: `
      <p>Designed the <strong>AIOrchestrator</strong> module for flexibility and fault tolerance.</p>
      <ul>
        <li><strong>Economics:</strong> switching LLMs to fit the franchisee's budget (including free tiers).</li>
        <li><strong>Resilience:</strong> if one model fails, another connects without rewriting the core.</li>
        <li><strong>Combating hallucinations:</strong> a 3-step system (task creation → micro-task logic → cross-validation by multiple neural networks) before vibe-coding.</li>
      </ul>
    `,
    comp_econ: "Economics & Funnel",
    comp_econ_text: `
      <p>Designed 4 monetization streams to diversify revenue.</p>
      <ul>
        <li><strong>Streams:</strong> B2C, B2B, Creator Economy (an admin panel for creators), partnerships with VR manufacturers.</li>
        <li><strong>Cross-platform:</strong> Web, Mobile, Desktop as a retention driver.</li>
        <li><strong>Strategy:</strong> unique features for each device to encourage user migration.</li>
      </ul>
    `,
    comp_data: "Data & UX",
    comp_data_text: `
      <p>Built data-driven processes and adaptive UX.</p>
      <ul>
        <li><strong>Psychotypes:</strong> scenario adaptation with a team of psychologists to keep users safe.</li>
        <li><strong>Entry Points:</strong> seamless switching between devices without losing progress.</li>
        <li><strong>Analytics:</strong> an event model (quest_started, choice_made) for A/B testing and churn tracking.</li>
      </ul>
    `,
    comp_security: "Security",
    comp_security_text: `
      <p>Established the Zero-Error UX concept and ethical safeguards.</p>
      <ul>
        <li><strong>Zero-Error UX:</strong> when AI fails, the response is replaced with a basic scenario (the user does not notice the quality drop).</li>
        <li><strong>Degradation:</strong> 4 levels (down to Read-Only mode).</li>
        <li><strong>Red Button:</strong> instant exit from traumatic scenes to protect mental health and comply with legislation.</li>
      </ul>
    `,
    comp_process: "Processes",
    comp_process_text: `
      <p>Set up transparent processes for B2B and franchisees.</p>
      <ul>
        <li><strong>Roles:</strong> a strict access model (Owner / Editor / Viewer) with action logs.</li>
        <li><strong>Knowledge base:</strong> video instructions for creators to reduce the support workload.</li>
      </ul>
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
