// ============================================================
// three-scene.js — интерактивная 3D-сцена премиального интерьера
// (case-designmatrix, фаза 11 / фикс 11.1: UMD-версия THREE r128).
// Пресеты стилей и цифры локаций: spec/07-designmatrix.md
// Требует: THREE (three.min.js r128) + THREE.OrbitControls — глобальные.
// ============================================================

const ACCENT = 0xa89cc8;

// Пресеты «AI Generate»: минимализм → классика → модерн.
// wall/floor/sofa/rug — цвета материалов, dir/amb/point — цвета света.
const PRESETS = [
  { name: 'Современный минимализм', wall: 0xf5f2ec, floor: 0xc9ab84, sofa: 0xdcd6cc, rug: 0xe8e4dc, dir: 0xdfe8f5, amb: 0xe8edf5, point: 0xc8d4e0 },
  { name: 'Современная классика', wall: 0xe3d5bd, floor: 0x7a5c3a, sofa: 0xb0a590, rug: 0xd8c4a4, dir: 0xffdcae, amb: 0xfff0dd, point: 0xffe4b8 },
  { name: 'Тёплый модерн', wall: 0x3d4a3a, floor: 0x52402c, sofa: 0x8f8a78, rug: 0x6e7a62, dir: 0xffd27f, amb: 0xfff2d9, point: 0xffcc88 }
];

// Цикл материалов для кнопки «Сменить материал».
const MAT_CYCLE = [
  { name: 'дерево', roughness: 0.5, metalness: 0.0, color: 0x8a6642 },
  { name: 'мрамор', roughness: 0.25, metalness: 0.05, color: 0xe9e4da },
  { name: 'ткань', roughness: 0.95, metalness: 0.0, color: 0xa6998a },
  { name: 'металл', roughness: 0.3, metalness: 0.9, color: 0xb8b8b8 }
];

function init() {
  const box = document.getElementById('three-scene-placeholder');
  if (!box) return;

  const HEIGHT = 500;

  // --- рендерер / камера / контроллер ----------------------------------------

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setSize(box.clientWidth || 800, HEIGHT);
  renderer.domElement.className = 'tss-canvas';
  box.innerHTML = ''; // плейсхолдер «3D-сцена загружается...» больше не нужен
  box.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1d21);

  const camera = new THREE.PerspectiveCamera(50, (box.clientWidth || 800) / HEIGHT, 0.1, 100);
  camera.position.set(5, 5, 8);
  camera.lookAt(0, 0.6, 0);

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.6, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.maxPolarAngle = Math.PI / 2 - 0.1; // не уходим под пол
  controls.minDistance = 3;
  controls.maxDistance = 20;
  controls.update();

  // --- свет (тёплый) -----------------------------------------------------------

  const ambient = new THREE.AmbientLight(0xfff5e0, 0.6);
  scene.add(ambient);

  const dir = new THREE.DirectionalLight(0xffe0b0, 1.2);
  dir.position.set(5, 10, 5);
  dir.castShadow = true;
  dir.shadow.mapSize.set(1024, 1024);
  dir.shadow.camera.left = -8;
  dir.shadow.camera.right = 8;
  dir.shadow.camera.top = 8;
  dir.shadow.camera.bottom = -8;
  scene.add(dir);

  // --- материалы (общие для интерполяции пресетов) --------------------------------

  const wallMat = new THREE.MeshStandardMaterial({ color: 0xe8dcc8, roughness: 0.9, side: THREE.DoubleSide });
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x6b4e2e, roughness: 0.55, metalness: 0.05 });
  const sofaMat = new THREE.MeshStandardMaterial({ color: 0xa6998a, roughness: 0.95 });
  const rugMat = new THREE.MeshStandardMaterial({ color: 0xd4c5a8, roughness: 0.98 });
  const metalMat = new THREE.MeshStandardMaterial({ color: 0x9b9b9b, roughness: 0.25, metalness: 0.9 });
  const tableWoodMat = new THREE.MeshStandardMaterial({ color: 0x8a6642, roughness: 0.45, metalness: 0.15 });
  const shadeMat = new THREE.MeshStandardMaterial({ color: 0xf0e0c0, roughness: 0.8, emissive: 0xffd9a0, emissiveIntensity: 0.8 });

  function mesh(geo, mat, cast) {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = !!cast;
    m.receiveShadow = true;
    return m;
  }

  // --- комната -----------------------------------------------------------------

  const floor = mesh(new THREE.BoxGeometry(8, 0.2, 8), floorMat);
  floor.position.y = -0.1;
  scene.add(floor);

  // Стены толщиной 0.2. Переднюю (z = +4.09) не ставим — камера видит интерьер.
  const wallGeoSide = new THREE.BoxGeometry(0.2, 4.2, 8.4);
  const wallGeoBack = new THREE.BoxGeometry(8.4, 4.2, 0.2);
  const wallGeoTop = new THREE.BoxGeometry(8.4, 0.2, 8.4);

  const wallDefs = [
    { geo: wallGeoSide, pos: [-4.09, 2.1, 0] },  // левая
    { geo: wallGeoSide, pos: [4.09, 2.1, 0] },   // правая
    { geo: wallGeoBack, pos: [0, 2.1, -4.09] },  // дальняя
    { geo: wallGeoTop, pos: [0, 4.2, 0] }        // потолок
  ];

  const wallMeshes = wallDefs.map((def) => {
    const wall = mesh(def.geo, wallMat);
    wall.position.set(def.pos[0], def.pos[1], def.pos[2]);
    wall.userData.kind = 'wall';
    scene.add(wall);
    return wall;
  });

  // --- мебель (4 группы с именами) ------------------------------------------------

  const furniture = [];

  function furnitureGroup(name, x, z) {
    const group = new THREE.Group();
    group.name = name;
    group.userData.kind = 'furniture';
    group.userData.matIndex = 0;
    group.position.set(x, 0, z);
    scene.add(group);
    furniture.push(group);
    return group;
  }

  // Диван: сиденье, спинка, подлокотники. Ткань #a6998a.
  const sofa = furnitureGroup('Диван', -0.4, -2.6);
  const seat = mesh(new THREE.BoxGeometry(2.2, 0.45, 0.9), sofaMat, true);
  seat.position.y = 0.42;
  sofa.add(seat);
  const back = mesh(new THREE.BoxGeometry(2.2, 0.7, 0.25), sofaMat, true);
  back.position.set(0, 0.75, -0.33);
  sofa.add(back);
  [-1.1, 1.1].forEach((armX) => {
    const arm = mesh(new THREE.BoxGeometry(0.25, 0.55, 0.9), sofaMat, true);
    arm.position.set(armX, 0.47, 0);
    sofa.add(arm);
  });

  // Стол: столешница (дерево) + 4 ножки (металл).
  const table = furnitureGroup('Стол', 0, -0.2);
  const top = mesh(new THREE.BoxGeometry(1.8, 0.08, 0.9), tableWoodMat, true);
  top.position.y = 0.55;
  table.add(top);
  [[-0.8, -0.35], [0.8, -0.35], [-0.8, 0.35], [0.8, 0.35]].forEach((legPos) => {
    const leg = mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.55), metalMat, true);
    leg.position.set(legPos[0], 0.28, legPos[1]);
    table.add(leg);
  });

  // Лампа: основание + стойка (металл) + светящийся абажур. Внутри — тёплый PointLight.
  const lamp = furnitureGroup('Лампа', 2.6, -2.6);
  const lampBase = mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.06), metalMat, true);
  lampBase.position.y = 0.03;
  lamp.add(lampBase);
  const lampPole = mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.2), metalMat, true);
  lampPole.position.y = 1.12;
  lamp.add(lampPole);
  const lampShade = mesh(new THREE.CylinderGeometry(0.22, 0.38, 0.38, 24, 1, true), shadeMat, true);
  lampShade.position.y = 2.28;
  lamp.add(lampShade);
  const pointLight = new THREE.PointLight(0xffd9a0, 0.9, 8, 2);
  pointLight.position.set(0, 2.15, 0);
  lamp.add(pointLight);

  // Ковёр: тонкая плоскость на полу. Ткань #d4c5a8.
  const rug = furnitureGroup('Ковёр', 0, -1.4);
  const rugMesh = mesh(new THREE.BoxGeometry(3.4, 0.02, 2.2), rugMat);
  rugMesh.position.y = 0.011;
  rug.add(rugMesh);

  // --- лучи / пикинг ----------------------------------------------------------------

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const planeHit = new THREE.Vector3();

  let pickables = [];

  function refillPickables() {
    pickables = [];
    furniture.forEach((group) => {
      group.traverse((child) => {
        if (child.isMesh) {
          child.userData.furnitureRoot = group;
          pickables.push(child);
        }
      });
    });
    pickables.push(...wallMeshes);
  }

  refillPickables();

  function setPointer(e) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
  }

  function pick(e) {
    setPointer(e);
    const hits = raycaster.intersectObjects(pickables, false);
    if (!hits.length) return null;
    const obj = hits[0].object;
    if (obj.userData.furnitureRoot) return { kind: 'furniture', group: obj.userData.furnitureRoot };
    if (obj.userData.kind === 'wall') return { kind: 'wall', group: obj };
    return null;
  }

  // --- выделение / панели ------------------------------------------------------------

  let selected = null;
  let selectedWall = null;
  let helper = null;

  const furniturePanel = document.getElementById('tss-furniture-panel');
  const wallPanel = document.getElementById('tss-wall-panel');
  const matBtn = document.getElementById('tss-cycling');
  const selectedName = document.getElementById('tss-selected-name');
  const wallColorInput = document.getElementById('tss-wall-color');

  function clearSelection() {
    if (helper) {
      scene.remove(helper);
      helper = null;
    }
    selected = null;
    selectedWall = null;
    furniturePanel.hidden = true;
    wallPanel.hidden = true;
  }

  function updateMatLabel() {
    if (selected) {
      const mat = MAT_CYCLE[selected.userData.matIndex % MAT_CYCLE.length];
      matBtn.textContent = 'Сменить материал (' + mat.name + ')';
    } else {
      matBtn.textContent = 'Сменить материал';
    }
  }

  function selectFurniture(group) {
    clearSelection();
    selected = group;
    helper = new THREE.BoxHelper(group, ACCENT);
    scene.add(helper);
    furniturePanel.hidden = false;
    selectedName.textContent = 'Настройка мебели: ' + group.name;
    updateMatLabel();
  }

  function selectWall(wall) {
    clearSelection();
    selectedWall = wall;
    wallPanel.hidden = false;
    wallColorInput.value = '#' + wallMat.color.getHexString();
  }

  // Смена материала: следующий пресет цикла на все меши выделенной группы.
  matBtn.addEventListener('click', () => {
    if (!selected) return;
    selected.userData.matIndex = (selected.userData.matIndex + 1) % MAT_CYCLE.length;
    const preset = MAT_CYCLE[selected.userData.matIndex];
    selected.traverse((child) => {
      if (child.isMesh) {
        const mat = child.material.clone();
        mat.color.set(preset.color);
        mat.roughness = preset.roughness;
        mat.metalness = preset.metalness;
        child.material.dispose();
        child.material = mat;
      }
    });
    updateMatLabel();
    if (helper) helper.update();
  });

  document.getElementById('tss-delete').addEventListener('click', () => {
    if (!selected) return;
    scene.remove(selected);
    const idx = furniture.indexOf(selected);
    if (idx >= 0) furniture.splice(idx, 1);
    refillPickables();
    clearSelection();
  });

  // Маркетплейс (фаза 12): добавление товара в комнату.
  const MP_SLOTS = [[0.6, -3.9], [-0.8, -3.0], [1.8, -3.3], [-1.8, -3.3]];
  let mpSlot = 0;
  const potMat = new THREE.MeshStandardMaterial({ color: 0x8a4a32, roughness: 0.85 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x3d6b3d, roughness: 0.9 });

  function buildMpData(type) {
    if (type === 'chair') {
      return {
        name: 'Стул',
        build: (g) => {
          const seatB = mesh(new THREE.BoxGeometry(0.5, 0.06, 0.5), floorMat, true);
          seatB.position.y = 0.45;
          const backB = mesh(new THREE.BoxGeometry(0.5, 0.55, 0.06), floorMat, true);
          backB.position.set(0, 0.75, -0.22);
          g.add(seatB, backB);
          [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]].forEach((lp) => {
            const leg = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.45), metalMat, true);
            leg.position.set(lp[0], 0.225, lp[1]);
            g.add(leg);
          });
        }
      };
    }
    if (type === 'shelf') {
      return {
        name: 'Шкаф',
        build: (g) => {
          const body = mesh(new THREE.BoxGeometry(0.7, 1.8, 0.4), floorMat, true);
          body.position.y = 0.9;
          g.add(body);
          [0.45, 0.9, 1.35].forEach((y) => {
            const shelf = mesh(new THREE.BoxGeometry(0.6, 0.03, 0.34), tableWoodMat, true);
            shelf.position.y = y;
            g.add(shelf);
          });
        }
      };
    }
    // 'plant': горшок + зелёная крона
    return {
      name: 'Растение',
      build: (g) => {
        const pot = mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.26), potMat, true);
        pot.position.y = 0.13;
        const crown = mesh(new THREE.SphereGeometry(0.24, 20, 16), leafMat, true);
        crown.position.y = 0.5;
        g.add(pot, crown);
      }
    };
  }

  function addFurniture(type) {
    const data = buildMpData(type);
    if (!data) return;
    const group = new THREE.Group();
    group.name = data.name;
    group.userData.kind = 'furniture';
    group.userData.matIndex = 0;
    const slot = MP_SLOTS[mpSlot % MP_SLOTS.length];
    mpSlot += 1;
    group.position.set(slot[0], 0, slot[1]);
    data.build(group);
    scene.add(group);
    furniture.push(group);
    refillPickables(); // объект кликабелен и перетаскивается, «Удалить» работает
    if (helper) helper.update();
  }

  window.addFurniture = addFurniture;

  wallColorInput.addEventListener('input', () => {
    wallMat.color.set(wallColorInput.value);
  });

  // --- drag по плоскости пола (выделенная мебель) --------------------------------------

  let dragging = null;
  let dragStart = null;
  let moved = 0;

  renderer.domElement.addEventListener('pointerdown', (e) => {
    moved = 0;
    dragStart = null;
    const hit = pick(e);
    if (hit && hit.kind === 'furniture' && hit.group === selected) {
      dragging = hit.group;
      controls.enabled = false;
      try { e.target.setPointerCapture(e.pointerId); } catch (ignore) { /* noop */ }
      if (raycaster.ray.intersectPlane(floorPlane, planeHit)) {
        dragStart = { x: planeHit.x, z: planeHit.z, gx: dragging.position.x, gz: dragging.position.z };
      }
    }
  });

  renderer.domElement.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    moved += 1;
    if (!dragStart) return;
    setPointer(e);
    if (!raycaster.ray.intersectPlane(floorPlane, planeHit)) return;
    dragged = true;
    dragging.position.x = Math.max(-3.4, Math.min(3.4, dragStart.gx + (planeHit.x - dragStart.x)));
    dragging.position.z = Math.max(-3.4, Math.min(3.4, dragStart.gz + (planeHit.z - dragStart.z)));
    if (helper) helper.update();
  });

  let dragged = false;

  renderer.domElement.addEventListener('pointerup', () => {
    if (dragging) {
      dragging = null;
      dragStart = null;
      controls.enabled = true;
    }
  });

  // Клик по сцене: мебель → панель мебели, стена → панель стены, пустота → снять.
  renderer.domElement.addEventListener('click', (e) => {
    if (dragged) {
      dragged = false;
      moved = 0;
      return; // это было перетаскивание, не клик
    }
    const hit = pick(e);
    if (hit && hit.kind === 'furniture') selectFurniture(hit.group);
    else if (hit && hit.kind === 'wall') selectWall(hit.group);
    else clearSelection();
  });

  // --- AI Generate: пульсация золотым + интерполяция пресета за 1 с -------------------------

  const aiBtn = document.getElementById('tss-ai');
  let styleIndex = 0;
  let colorFrom = null;
  let colorTo = null;
  let colorT = 1; // 0..1, >=1 — анимация не идёт

  aiBtn.addEventListener('click', () => {
    // перезапуск CSS-пульсации
    aiBtn.classList.remove('is-pulsating');
    void aiBtn.offsetWidth;
    aiBtn.classList.add('is-pulsating');
    setTimeout(() => aiBtn.classList.remove('is-pulsating'), 1000);

    styleIndex = (styleIndex + 1) % PRESETS.length;
    colorTo = PRESETS[styleIndex];
    colorFrom = {
      wall: wallMat.color.clone(),
      floor: floorMat.color.clone(),
      sofa: sofaMat.color.clone(),
      rug: rugMat.color.clone(),
      dir: dir.color.clone(),
      amb: ambient.color.clone(),
      point: pointLight.color.clone()
    };
    colorT = 0;
  });

  // --- локации: плавная смена счётчиков за 0.5 с ---------------------------------------------

  const budgetEl = document.getElementById('tss-budget');
  const paybackEl = document.getElementById('tss-payback');
  const roiEl = document.getElementById('tss-roi');
  const locBtns = [...document.querySelectorAll('.tss-loc')];
  const counterValue = { b: 50, p: 30, r: 20 };
  let counterRaf = null;

  function animateCounters(target) {
    const from = { ...counterValue };
    const t0 = performance.now();
    if (counterRaf) cancelAnimationFrame(counterRaf);
    const step = (now) => {
      const p = Math.min(1, (now - t0) / 500);
      const ease = 1 - Math.pow(1 - p, 3);
      counterValue.b = from.b + (target.b - from.b) * ease;
      counterValue.p = from.p + (target.p - from.p) * ease;
      counterValue.r = from.r + (target.r - from.r) * ease;
      budgetEl.textContent = Math.round(counterValue.b) + 'M ₽';
      paybackEl.textContent = Math.round(counterValue.p) + ' мес';
      roiEl.textContent = Math.round(counterValue.r) + '%';
      if (p < 1) counterRaf = requestAnimationFrame(step);
    };
    counterRaf = requestAnimationFrame(step);
  }

  locBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      locBtns.forEach((b) => b.classList.toggle('is-active', b === btn));
      const [b, p, r] = btn.dataset.v.split('|').map(Number);
      animateCounters({ b, p, r });
    });
  });

  // --- ресайз --------------------------------------------------------------------------------

  window.addEventListener('resize', () => {
    const w = box.clientWidth || 800;
    camera.aspect = w / HEIGHT;
    camera.updateProjectionMatrix();
    renderer.setSize(w, HEIGHT);
  });

  // --- цикл анимации ----------------------------------------------------------------------------

  const clock = new THREE.Clock();
  const tmpColor = new THREE.Color();

  function animate() {
    requestAnimationFrame(animate);
    const dt = clock.getDelta();

    if (colorT < 1 && colorFrom) {
      colorT = Math.min(1, colorT + dt);
      const e = 1 - Math.pow(1 - colorT, 3);
      wallMat.color.copy(colorFrom.wall).lerp(tmpColor.set(colorTo.wall), e);
      floorMat.color.copy(colorFrom.floor).lerp(tmpColor.set(colorTo.floor), e);
      sofaMat.color.copy(colorFrom.sofa).lerp(tmpColor.set(colorTo.sofa), e);
      rugMat.color.copy(colorFrom.rug).lerp(tmpColor.set(colorTo.rug), e);
      dir.color.copy(colorFrom.dir).lerp(tmpColor.set(colorTo.dir), e);
      ambient.color.copy(colorFrom.amb).lerp(tmpColor.set(colorTo.amb), e);
      pointLight.color.copy(colorFrom.point).lerp(tmpColor.set(colorTo.point), e);
    }

    controls.update();
    renderer.render(scene, camera);
  }

  animate();
}

try {
  init();
} catch (err) {
  // WebGL недоступен: HTML-плейсхолдер «3D-сцена загружается...» остаётся как есть.
  console.warn('Three.js сцена недоступна:', err && err.message);
}
