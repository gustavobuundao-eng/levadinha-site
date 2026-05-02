const STORAGE_KEYS = {
  visits: "levadinha.visits",
  clients: "levadinha.clients",
  cases: "levadinha.cases",
  denunciations: "levadinha.denunciations",
  posts: "levadinha.posts",
  effects: "levadinha.effects",
  users: "levadinha.users",
  session: "levadinha.session",
  customContent: "levadinha.customContent"
};

const ADMIN_PASSWORD = "levadinha";
const PREMIUM_USER_ID = "levadinha";
const PREMIUM_DEFAULT_PASSWORD = "levadinha";

if (!window.location.hash) {
  window.scrollTo(0, 0);
}

const state = {
  clients: readJson(STORAGE_KEYS.clients, []),
  cases: readJson(STORAGE_KEYS.cases, []),
  denunciations: readJson(STORAGE_KEYS.denunciations, []),
  posts: readJson(STORAGE_KEYS.posts, []),
  users: readJson(STORAGE_KEYS.users, []),
  customContent: readJson(STORAGE_KEYS.customContent, {}),
  currentUser: localStorage.getItem(STORAGE_KEYS.session) || sessionStorage.getItem(STORAGE_KEYS.session) || "",
  clientPage: 1,
  replyingClientId: "",
  selectedEvidence: [],
  evidenceLoading: null,
  profileEditing: false,
  profileAvatarDraft: ""
};

const $ = (selector) => document.querySelector(selector);

const elements = {
  visitCounter: $("#visitCounter"),
  clientCounter: $("#clientCounter"),
  evidenceCounter: $("#evidenceCounter"),
  caseCount: $("#caseCount"),
  profileForm: $("#profileForm"),
  clientDirectory: $("#clientDirectory"),
  clientSearch: $("#clientSearch"),
  caseForm: $("#caseForm"),
  evidenceInput: $("#evidenceInput"),
  evidencePreview: $("#evidencePreview"),
  adminPassword: $("#adminPassword"),
  unlockAdmin: $("#unlockAdmin"),
  adminGate: $("#adminGate"),
  adminPanel: $("#adminPanel"),
  caseList: $("#caseList"),
  denunciationInbox: $("#denunciationInbox"),
  denunciationForm: $("#denunciationForm"),
  publicDenunciationList: $("#publicDenunciationList"),
  postForm: $("#postForm"),
  postList: $("#postList"),
  clearCases: $("#clearCases"),
  authForm: $("#authForm"),
  authStatus: $("#authStatus"),
  logoutButton: $("#logoutButton"),
  clientPagination: $("#clientPagination"),
  siteEditorForm: $("#siteEditorForm"),
  accountSummary: $("#accountSummary"),
  accountAccess: $("#accountAccess"),
  accountsList: $("#accountsList"),
  toast: $("#toast")
};

let authAction = "login";

let scrollAnimationFrame = 0;
let programmaticScrollActive = false;
let updateActiveNavState = null;
let accountMode = "login";
let selectedEditable = null;
let selectedDevElement = null;
let devDragState = null;
const devEditor = {
  active: false,
  undo: [],
  redo: [],
  baseline: new Map(),
  toolbarDrag: null,
  moveDrag: null,
  controlTimer: 0
};

init();

function init() {
  window.history.scrollRestoration = "manual";
  registerVisit();
  seedIfEmpty();
  seedPremiumUser();
  assignDeveloperKeys();
  repairUnsafeDeveloperCustomizations();
  applyCustomContent();
  guardProtectedPages();
  renderAll();
  bindEvents();
  initParticles();
  initTiltCards();
  initHeroFade();
  initTopLink();
  initAnchorScroll();
  initActiveNav();
  initInitialHashScroll();
  initDeveloperMode();
  initScrollReveals();
}

function bindEvents() {
  elements.profileForm?.addEventListener("submit", handleProfileSubmit);
  elements.clientSearch?.addEventListener("input", () => {
    state.clientPage = 1;
    renderClients();
  });
  elements.evidenceInput?.addEventListener("change", handleEvidenceSelection);
  elements.evidencePreview?.addEventListener("click", handleEvidencePreviewAction);
  elements.caseForm?.addEventListener("submit", handleCaseSubmit);
  elements.denunciationForm?.addEventListener("submit", handleDenunciationSubmit);
  elements.postForm?.addEventListener("submit", handlePostSubmit);
  elements.postList?.addEventListener("submit", handlePostReplySubmit);
  elements.postList?.addEventListener("click", handlePostAction);
  elements.denunciationInbox?.addEventListener("click", handleDenunciationAction);
  elements.accountsList?.addEventListener("click", handleAccountAction);
  elements.clearCases?.addEventListener("click", clearCases);
  elements.authForm?.addEventListener("submit", handleAuthSubmit);
  elements.clientDirectory?.addEventListener("click", handleClientDirectoryAction);
  elements.clientDirectory?.addEventListener("submit", handleClientDirectorySubmit);
  elements.authForm?.querySelectorAll("[data-auth-action]").forEach((button) => {
    button.addEventListener("click", () => {
      authAction = button.dataset.authAction || "login";
    });
  });
  elements.logoutButton?.addEventListener("click", logoutUser);
  elements.siteEditorForm?.addEventListener("submit", handleSiteEditorSubmit);
  elements.accountAccess?.addEventListener("submit", handleAccountAccessSubmit);
  elements.accountAccess?.addEventListener("click", handleAccountAccessClick);
  elements.accountSummary?.addEventListener("submit", handleAccountProfileSubmit);
  elements.accountSummary?.addEventListener("click", handleAccountProfileClick);
  elements.accountSummary?.addEventListener("change", handleAccountProfileChange);
  document.addEventListener("beforeinput", handleDeveloperBeforeInput);
  document.addEventListener("input", handleDeveloperInput);
  document.addEventListener("click", handleDeveloperSelection);
  document.addEventListener("click", interceptDeveloperActions, true);
  document.addEventListener("pointerdown", handleDeveloperPointerDown);
  document.addEventListener("pointermove", handleDeveloperPointerMove);
  document.addEventListener("pointerup", handleDeveloperPointerUp);
}

function initTopLink() {
  const brand = document.querySelector(".brand");
  if (!brand) return;

  brand.addEventListener("click", (event) => {
    const href = brand.getAttribute("href") || "";
    if (href && !href.startsWith("#")) return;

    event.preventDefault();
    clearNavActive();
    animatePageScroll(0, { durationMax: 620 });
  });
}

function initAnchorScroll() {
  const links = document.querySelectorAll('a[href^="#"]:not(.brand)');

  links.forEach((link) => {
    link.addEventListener("click", (event) => {
      const targetId = link.getAttribute("href");
      if (!targetId || targetId === "#") return;

      const target = document.querySelector(targetId);
      if (!target) return;

      event.preventDefault();
      const headerOffset = getAnchorOffset(target);
      const top = target.getBoundingClientRect().top + window.scrollY - headerOffset;
      const activeLink = document.querySelector(`.main-nav a[href="${targetId}"]`) || link;

      setNavActive(activeLink);
      animatePageScroll(Math.max(0, top), {
        activeLink,
        onDone: () => updateActiveNavState?.()
      });
    });
  });
}

function getAnchorOffset(target) {
  const header = document.querySelector(".site-header");
  const headerIsSticky = header && getComputedStyle(header).position === "sticky";
  const headerHeight = headerIsSticky ? header.getBoundingClientRect().height : 0;
  const extraSpace = target?.id === "bo" ? 34 : 44;
  return headerHeight + extraSpace;
}

function animatePageScroll(targetTop, options = {}) {
  window.cancelAnimationFrame(scrollAnimationFrame);

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    window.scrollTo(0, targetTop);
    options.onDone?.();
    return;
  }

  programmaticScrollActive = true;
  if (options.activeLink) setNavActive(options.activeLink);

  const startTop = window.scrollY;
  const distance = targetTop - startTop;
  const durationMax = options.durationMax || 720;
  const duration = Math.min(durationMax, Math.max(280, Math.abs(distance) * 0.28));
  const startTime = performance.now();

  const easeInOutCubic = (value) => {
    if (value < 0.5) return 4 * value * value * value;
    return 1 - Math.pow(-2 * value + 2, 3) / 2;
  };

  const step = (now) => {
    const progress = Math.min((now - startTime) / duration, 1);
    window.scrollTo(0, startTop + distance * easeInOutCubic(progress));
    if (progress < 1) {
      scrollAnimationFrame = requestAnimationFrame(step);
      return;
    }

    programmaticScrollActive = false;
    if (options.activeLink) setNavActive(options.activeLink);
    options.onDone?.();
  };

  scrollAnimationFrame = requestAnimationFrame(step);
}

function initTiltCards() {
  const cards = document.querySelectorAll(".tilt-card");

  cards.forEach((card) => {
    if (card.dataset.tiltBound === "true") return;
    card.dataset.tiltBound = "true";

    card.addEventListener("pointermove", (event) => {
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      const rotateY = (x - 0.5) * 10;
      const rotateX = (0.5 - y) * 10;

      card.style.setProperty("--tilt-x", `${rotateX.toFixed(2)}deg`);
      card.style.setProperty("--tilt-y", `${rotateY.toFixed(2)}deg`);
      card.style.setProperty("--tilt-glare-x", `${(x * 100).toFixed(1)}%`);
      card.style.setProperty("--tilt-glare-y", `${(y * 100).toFixed(1)}%`);
      card.style.setProperty("--tilt-glare", "1");
    });

    card.addEventListener("pointerleave", () => {
      card.style.setProperty("--tilt-x", "0deg");
      card.style.setProperty("--tilt-y", "0deg");
      card.style.setProperty("--tilt-glare", "0");
    });
  });
}

function initHeroFade() {
  let lastScrollY = window.scrollY;
  const updateFade = () => {
    const progress = Math.min(window.scrollY / 420, 1);
    const scrollable = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
    const pageProgress = Math.min(Math.max(window.scrollY / scrollable, 0), 1);
    document.documentElement.style.setProperty("--hero-fade-opacity", String(1 - progress));
    document.documentElement.style.setProperty("--bottom-fade-opacity", String(1 - progress));
    document.documentElement.style.setProperty("--scroll-progress", pageProgress.toFixed(4));
    document.documentElement.style.setProperty("--bg-shift", `${(pageProgress * 100).toFixed(2)}%`);
    document.documentElement.style.setProperty("--bg-y", `${(pageProgress * 100).toFixed(2)}%`);
    document.documentElement.style.setProperty("--bg-a-x", `${(12 + pageProgress * 10).toFixed(2)}%`);
    document.documentElement.style.setProperty("--bg-a-y", `${(8 + pageProgress * 18).toFixed(2)}%`);
    document.documentElement.style.setProperty("--bg-b-x", `${(86 - pageProgress * 12).toFixed(2)}%`);
    document.documentElement.style.setProperty("--bg-b-y", `${(18 + pageProgress * 22).toFixed(2)}%`);

    const header = document.querySelector(".site-header");
    if (header) {
      const scrollingDown = window.scrollY > lastScrollY;
      header.classList.toggle("is-hidden", scrollingDown && window.scrollY > 720);
    }
    lastScrollY = window.scrollY;
  };

  updateFade();
  window.addEventListener("scroll", updateFade, { passive: true });
}

function initActiveNav() {
  const allLinks = Array.from(document.querySelectorAll(".main-nav a"));
  const navLinks = allLinks.filter((link) => (link.getAttribute("href") || "").startsWith("#"));

  const galleryLink = allLinks.find((link) => link.getAttribute("href") === "galeria.html");
  const isGalleryPage = document.body.classList.contains("gallery-document");
  if (!navLinks.length) {
    if (isGalleryPage && !window.location.hash && galleryLink) setNavActive(galleryLink);
    return;
  }

  const sections = navLinks
    .map((link) => {
      const section = document.querySelector(link.getAttribute("href"));
      return section ? { link, section } : null;
    })
    .filter(Boolean);

  navLinks.forEach((link) => {
    link.addEventListener("click", () => setNavActive(link));
  });

  const updateActive = () => {
    if (programmaticScrollActive) return;

    const header = document.querySelector(".site-header");
    const headerOffset = header && getComputedStyle(header).position === "sticky"
      ? header.getBoundingClientRect().height + 72
      : 72;
    const marker = window.scrollY + headerOffset;
    let current = sections[0];

    if (window.scrollY < 120 && !isGalleryPage) {
      clearNavActive();
      return;
    }

    if (isGalleryPage && galleryLink) {
      const firstSection = sections[0]?.section;
      if (!firstSection || marker < firstSection.offsetTop) {
        setNavActive(galleryLink);
        return;
      }
    }

    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 6) {
      current = sections[sections.length - 1];
      setNavActive(current.link);
      return;
    }

    sections.forEach((item) => {
      if (item.section.offsetTop <= marker) current = item;
    });

    if (current) setNavActive(current.link);
  };

  updateActiveNavState = updateActive;
  updateActive();
  window.addEventListener("scroll", updateActive, { passive: true });
}

function initInitialHashScroll() {
  if (!window.location.hash) {
    window.scrollTo(0, 0);
    return;
  }

  const target = document.querySelector(window.location.hash);
  if (!target) return;

  window.setTimeout(() => {
    const top = target.getBoundingClientRect().top + window.scrollY - getAnchorOffset(target);
    const activeLink = document.querySelector(`.main-nav a[href="${window.location.hash}"]`);
    if (activeLink) setNavActive(activeLink);
    animatePageScroll(Math.max(0, top), {
      activeLink,
      durationMax: 420,
      onDone: () => updateActiveNavState?.()
    });
  }, 80);
}

function setNavActive(activeLink) {
  if (!activeLink) return;

  document.querySelectorAll(".main-nav a").forEach((link) => {
    link.classList.toggle("is-active", link === activeLink);
  });
}

function clearNavActive() {
  document.querySelectorAll(".main-nav a").forEach((link) => {
    link.classList.remove("is-active");
  });
}

function initEffectsPreference() {
  const enabled = localStorage.getItem(STORAGE_KEYS.effects) !== "off";
  applyEffectsPreference(enabled);
}

function toggleEffects() {
  const enabled = document.body.classList.contains("effects-off");
  localStorage.setItem(STORAGE_KEYS.effects, enabled ? "on" : "off");
  applyEffectsPreference(enabled);
}

function applyEffectsPreference(enabled) {
  document.body.classList.toggle("effects-off", !enabled);
}

function initScrollReveals() {
  const revealGroups = [
    [".about-section .section-heading", "reveal-from-left", 0],
    [".about-character-card", "reveal-from-left", 120],
    [".about-grid article:nth-child(1)", "reveal-from-left", 220],
    [".about-grid article:nth-child(2)", "reveal-from-left", 360],
    [".about-grid article:nth-child(3)", "reveal-from-left", 500],
    [".skill-card:nth-child(1)", "", 140],
    [".skill-card:nth-child(2)", "", 240],
    [".skill-card:nth-child(3)", "", 340],
    [".skill-card:nth-child(4)", "", 440],
    [".gallery-page-head", "reveal-from-left", 0],
    [".gallery-feature", "", 140],
    [".gallery-section .section-heading", "reveal-from-left", 0],
    [".gallery-slot:nth-child(1)", "", 120],
    [".gallery-slot:nth-child(2)", "", 260],
    [".gallery-slot:nth-child(3)", "", 400],
    [".denunciation-section .section-heading", "reveal-from-left", 0],
    [".guide-card:nth-child(1)", "", 120],
    [".guide-card:nth-child(2)", "", 240],
    [".guide-card:nth-child(3)", "", 360],
    [".denunciation-form", "reveal-from-left", 180],
    [".denunciation-layout > div", "reveal-from-right", 260],
    [".clients-section .section-heading", "reveal-from-left", 0],
    [".panel-form", "reveal-from-left", 140],
    [".client-layout > div", "reveal-from-right", 260],
    [".report-section .section-heading", "reveal-from-left", 0],
    [".case-form", "", 160],
    [".admin-section .section-heading", "reveal-from-left", 0],
    [".admin-gate", "", 160],
    [".admin-panel", "", 160]
  ];

  const revealItems = [];

  revealGroups.forEach(([selector, direction, delay]) => {
    document.querySelectorAll(selector).forEach((element) => {
      element.classList.add("reveal-on-scroll");
      if (direction) element.classList.add(direction);
      element.style.setProperty("--reveal-delay", `${delay}ms`);
      revealItems.push(element);
    });
  });

  if (!revealItems.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        const delay = Number.parseInt(
          getComputedStyle(entry.target).getPropertyValue("--reveal-delay"),
          10
        ) || 0;

        window.setTimeout(() => {
          entry.target.classList.add("reveal-complete");
        }, delay + 820);

        observer.unobserve(entry.target);
      });
    },
    {
      threshold: 0.16,
      rootMargin: "0px 0px -8% 0px"
    }
  );

  revealItems.forEach((element) => observer.observe(element));
}

function registerVisit() {
  const visits = Number(localStorage.getItem(STORAGE_KEYS.visits) || 0) + 1;
  localStorage.setItem(STORAGE_KEYS.visits, String(visits));
}

function seedIfEmpty() {
  if (state.clients.length) return;

  state.clients = [
    {
      id: makeId(),
      userId: "seed-cliente-rosa",
      createdAt: new Date().toISOString(),
      nick: "Cliente.Rosa",
      role: "Empresaria",
      status: "Em analise",
      bio: "Busca orientacao para registrar uma quebra de acordo comercial."
    },
    {
      id: makeId(),
      userId: "seed-pixeljusto",
      createdAt: new Date().toISOString(),
      nick: "PixelJusto",
      role: "Jogador",
      status: "Orientado",
      bio: "Perfil publico liberado para acompanhamento do caso."
    }
  ];

  saveClients();
}

function seedPremiumUser() {
  const existing = state.users.find((user) => user.id === PREMIUM_USER_ID);
  if (existing) {
    existing.username = existing.username || "Levadinha";
    existing.password = PREMIUM_DEFAULT_PASSWORD;
    existing.premium = true;
    normalizeAccountRecord(existing, true);
    saveUsers();
    return;
  }

  state.users.unshift({
    id: PREMIUM_USER_ID,
    username: "Levadinha",
    password: PREMIUM_DEFAULT_PASSWORD,
    premium: true,
    accountNumber: "0001",
    accountType: "Conta premium",
    bio: "Advogada dos Habbos, dona do gabinete e responsavel pelos casos premium.",
    avatar: "assets/levadinha-personagem-grande-transparent.png",
    profileFont: "",
    profileGlow: true,
    profileSparkle: true,
    profileOpacity: 88,
    profileBorderWidth: 1,
    profileBorderStyle: "solid",
    nameChanges: 0,
    lastNameChangeAt: "",
    createdAt: new Date().toISOString()
  });
  saveUsers();
}

function normalizeAccountRecord(user, premium = false) {
  user.accountNumber = user.accountNumber || generateAccountNumber();
  user.accountType = premium || user.premium ? "Conta premium" : user.accountType || "Conta base";
  user.bio = user.bio || "";
  user.avatar = user.avatar || "";
  user.profileFont = user.profileFont || "";
  user.profileGlow = Boolean(user.profileGlow);
  user.profileSparkle = Boolean(user.profileSparkle);
  user.profileOpacity = user.profileOpacity || 88;
  user.profileBorderWidth = user.profileBorderWidth ?? 1;
  user.profileBorderStyle = user.profileBorderStyle || "solid";
  user.nameChanges = user.nameChanges || 0;
  user.lastNameChangeAt = user.lastNameChangeAt || "";
}

function generateAccountNumber() {
  const used = new Set(state.users.map((user) => user.accountNumber).filter(Boolean));
  let number = "";
  do {
    number = String(Math.floor(1000 + Math.random() * 9000));
  } while (used.has(number));
  return number;
}

function guardProtectedPages() {
  if (document.body.classList.contains("panel-document") && !isPremiumUser()) {
    showToast("Entre na conta premium para acessar o painel.");
    window.setTimeout(() => {
      window.location.href = "conta.html";
    }, 450);
  }
}

function handleProfileSubmit(event) {
  event.preventDefault();

  if (!requireLogin()) return;
  if (hasCurrentUserProfile()) {
    showToast("Esta conta ja cadastrou um perfil publico.");
    updateAccessState();
    return;
  }

  const data = new FormData(elements.profileForm);
  const nick = clean(data.get("nick"));

  if (!nick) {
    showToast("Informe um nick para salvar o perfil.");
    return;
  }

  const existingIndex = state.clients.findIndex(
    (client) => client.nick.toLowerCase() === nick.toLowerCase()
  );

  const client = {
    id: makeId(),
    userId: state.currentUser,
    createdAt: new Date().toISOString(),
    nick,
    role: clean(data.get("role")) || "Cliente",
    status: clean(data.get("status")) || "Em analise",
    bio: clean(data.get("bio")) || "Perfil publico sem descricao."
  };

  if (existingIndex >= 0) {
    showToast("Esse nick ja esta cadastrado no diretorio publico.");
    return;
  }

  state.clients.unshift(client);

  saveClients();
  elements.profileForm.reset();
  renderAll();
  showToast("Perfil publico salvo com sucesso.");
}

async function handleEvidenceSelection(event) {
  const files = Array.from(event.target.files || []);
  const remainingSlots = Math.max(0, 5 - state.selectedEvidence.length);
  const imageFiles = files.filter((file) => file.type.startsWith("image/")).slice(0, remainingSlots);

  if (!remainingSlots) {
    showToast("Voce pode anexar no maximo 5 prints.");
    if (elements.evidenceInput) elements.evidenceInput.value = "";
    return;
  }

  if (files.filter((file) => file.type.startsWith("image/")).length > remainingSlots) {
    showToast("Limite de 5 prints atingido. Alguns arquivos foram ignorados.");
  }

  if (elements.evidencePreview) {
    elements.evidencePreview.innerHTML = `<p class="evidence-loading">Carregando prints...</p>`;
  }

  state.evidenceLoading = Promise.all(
    imageFiles.map(async (file) => ({
      name: file.name,
      type: file.type,
      dataUrl: await fileToDataUrl(file)
    }))
  );

  state.selectedEvidence = [...state.selectedEvidence, ...await state.evidenceLoading].slice(0, 5);
  state.evidenceLoading = null;
  if (elements.evidenceInput) elements.evidenceInput.value = "";

  renderEvidencePreview();
}

function handleEvidencePreviewAction(event) {
  const button = event.target.closest("[data-evidence-remove]");
  if (!button) return;

  const index = Number(button.dataset.evidenceRemove);
  state.selectedEvidence.splice(index, 1);
  renderEvidencePreview();
}

async function handleCaseSubmit(event) {
  event.preventDefault();

  if (!requireLogin()) return;
  const data = new FormData(elements.caseForm);
  const clientNick = clean(data.get("clientNick"));
  const description = clean(data.get("description"));

  if (!clientNick || !description) {
    showToast("Preencha o nick e a descricao do ocorrido.");
    return;
  }

  if (state.evidenceLoading) {
    showToast("Aguarde os prints terminarem de carregar.");
    state.selectedEvidence = await state.evidenceLoading;
    state.evidenceLoading = null;
  }

  ensurePublicProfile(clientNick);

  const report = {
    id: makeId(),
    userId: state.currentUser,
    createdAt: new Date().toISOString(),
    clientNick,
    contact: clean(data.get("contact")),
    accused: clean(data.get("accused")),
    date: clean(data.get("date")),
    room: clean(data.get("room")),
    category: clean(data.get("category")),
    description,
    evidence: state.selectedEvidence
  };

  state.cases.unshift(report);
  try {
    saveCases();
    saveClients();
  } catch (error) {
    state.cases = state.cases.filter((item) => item.id !== report.id);
    showToast("Nao consegui salvar o B.O. Os prints podem estar pesados demais.");
    return;
  }
  state.selectedEvidence = [];
  elements.caseForm.reset();
  if (elements.evidenceInput) elements.evidenceInput.value = "";
  if (elements.evidencePreview) elements.evidencePreview.innerHTML = "";
  renderAll();
  showToast("B.O. enviado para o painel privado da Levadinha.");
}

function handleDenunciationSubmit(event) {
  event.preventDefault();

  if (!requireLogin()) return;
  if (isPublicMessageLimited()) {
    showToast("Aguarde 24 horas");
    return;
  }

  const data = new FormData(elements.denunciationForm);
  const target = clean(data.get("target"));
  const summary = clean(data.get("summary"));

  if (!target || !summary) {
    showToast("Informe a pessoa denunciada e o resumo.");
    return;
  }

  const visibility = clean(data.get("visibility")) || "anonima";
  const author = clean(data.get("author"));

  state.denunciations.unshift({
    id: makeId(),
    userId: state.currentUser,
    createdAt: new Date().toISOString(),
    visibility,
    author: visibility === "publica" ? author || "Autor nao informado" : "",
    target,
    category: clean(data.get("category")) || "Outro",
    summary,
    proof: clean(data.get("proof")),
    status: "pending"
  });

  saveDenunciations();
  elements.denunciationForm.reset();
  renderAll();
  showToast("Denuncia enviada para analise da Levadinha.");
}

function isPublicMessageLimited() {
  const now = Date.now();
  const recent = state.denunciations.filter((item) => {
    if (item.userId !== state.currentUser) return false;
    return now - new Date(item.createdAt).getTime() < 24 * 60 * 60 * 1000;
  });
  return recent.length >= 3;
}

function handleDenunciationAction(event) {
  if (!isPremiumUser()) {
    showToast("Apenas a conta premium pode moderar denuncias.");
    return;
  }

  const button = event.target.closest("[data-denunciation-action]");
  if (!button) return;

  const id = button.dataset.denunciationId;
  const action = button.dataset.denunciationAction;
  const item = state.denunciations.find((denunciation) => denunciation.id === id);
  if (!item) return;

  if (action === "publish") {
    item.status = "published";
    showToast("Denuncia publicada no mural.");
  }

  if (action === "hide") {
    item.status = "pending";
    showToast("Denuncia voltou para pendente.");
  }

  if (action === "remove") {
    state.denunciations = state.denunciations.filter((denunciation) => denunciation.id !== id);
    showToast("Denuncia removida.");
  }

  saveDenunciations();
  renderAll();
}

function handlePostSubmit(event) {
  event.preventDefault();

  if (!requireLogin()) return;

  const data = new FormData(elements.postForm);
  const content = clean(data.get("content"));

  if (!content) {
    showToast("Escreva uma mensagem para publicar.");
    return;
  }

  const user = getCurrentUser();
  state.posts.unshift({
    id: makeId(),
    authorId: user.id,
    author: user.username,
    content,
    category: clean(data.get("category")) || "Geral",
    status: "published",
    replies: [],
    createdAt: new Date().toISOString()
  });
  savePosts();
  elements.postForm.reset();
  renderPosts();
  showToast("Publicacao enviada ao mural.");
}

function handlePostReplySubmit(event) {
  const form = event.target.closest(".post-reply-form");
  if (!form) return;
  event.preventDefault();

  if (!requireLogin()) return;

  const post = state.posts.find((item) => item.id === form.dataset.postId);
  if (!post) return;

  const data = new FormData(form);
  const content = clean(data.get("reply"));
  if (!content) return;

  const user = getCurrentUser();
  post.replies = post.replies || [];
  post.replies.push({
    id: makeId(),
    authorId: user.id,
    author: user.username,
    content,
    createdAt: new Date().toISOString()
  });
  savePosts();
  renderPosts();
}

function handlePostAction(event) {
  const button = event.target.closest("[data-post-action]");
  if (!button) return;

  if (!isPremiumUser()) {
    showToast("Apenas a conta premium pode moderar o mural.");
    return;
  }

  if (button.dataset.postAction === "delete") {
    state.posts = state.posts.filter((post) => post.id !== button.dataset.postId);
    savePosts();
    renderPosts();
    showToast("Publicacao removida.");
  }
}

function ensurePublicProfile(nick) {
  if (hasCurrentUserProfile()) return;

  const exists = state.clients.some(
    (client) => client.nick.toLowerCase() === nick.toLowerCase()
  );

  if (!exists) {
    state.clients.unshift({
      id: makeId(),
      userId: state.currentUser,
      createdAt: new Date().toISOString(),
      nick,
      role: "Cliente",
      status: "Em analise",
      bio: "Cliente com atendimento registrado. Detalhes do caso permanecem privados."
    });
  }
}

function unlockAdminPanel() {
  if (!isPremiumUser()) return;

  renderCases();
  renderDenunciations();
  showToast("Painel privado liberado.");
}

function clearCases() {
  if (!isPremiumUser()) {
    showToast("Apenas a conta premium pode limpar o painel.");
    return;
  }

  const confirmed = window.confirm("Deseja apagar todos os B.O.s salvos neste navegador?");
  if (!confirmed) return;

  state.cases = [];
  state.denunciations = [];
  saveCases();
  saveDenunciations();
  renderAll();
  showToast("Painel privado limpo deste navegador.");
}

function handleAuthSubmit(event) {
  event.preventDefault();
  const data = new FormData(elements.authForm);
  const username = clean(data.get("username"));
  const password = clean(data.get("password"));

  if (!username || !password) {
    showToast("Informe usuario e senha.");
    return;
  }

  if (authAction === "register") {
    registerUser(username, password);
  } else {
    loginUser(username, password);
  }
}

function registerUser(username, password) {
  const id = normalizeUserId(username);
  const exists = state.users.some((user) => user.id === id);
  const confirm = clean(document.querySelector('[name="confirmPassword"]')?.value);

  if (exists) {
    showToast("Esse usuario ja existe. Use Entrar.");
    return;
  }

  if (confirm && confirm !== password) {
    showToast("As senhas nao conferem.");
    return;
  }

  state.users.push({
    id,
    username,
    password,
    premium: id === PREMIUM_USER_ID,
    accountNumber: generateAccountNumber(),
    accountType: id === PREMIUM_USER_ID ? "Conta premium" : "Conta base",
    bio: "",
    avatar: "",
    profileFont: "",
    profileGlow: false,
    profileSparkle: false,
    profileOpacity: 88,
    profileBorderWidth: 1,
    profileBorderStyle: "solid",
    nameChanges: 0,
    lastNameChangeAt: "",
    createdAt: new Date().toISOString()
  });
  saveUsers();
  accountMode = "login";
  renderAccountAccess();
  showToast("Conta criada. Agora faca login.");
}

function loginUser(username, password) {
  const id = normalizeUserId(username);
  const user = state.users.find((item) => item.id === id && item.password === password);

  if (!user) {
    showToast("Usuario ou senha incorretos.");
    return;
  }

  setCurrentUser(user.id);
  elements.authForm?.reset();
  showToast("Conta conectada.");
}

function logoutUser() {
  state.currentUser = "";
  localStorage.removeItem(STORAGE_KEYS.session);
  sessionStorage.removeItem(STORAGE_KEYS.session);
  updateAccessState();
  showToast("Voce saiu da conta.");
}

function setCurrentUser(userId) {
  state.currentUser = userId;
  if (document.body.classList.contains("account-document")) {
    const remember = document.querySelector('[name="rememberDevice"]')?.checked;
    if (remember) {
      localStorage.setItem(STORAGE_KEYS.session, userId);
    } else {
      sessionStorage.setItem(STORAGE_KEYS.session, userId);
      localStorage.removeItem(STORAGE_KEYS.session);
    }
  } else {
    localStorage.setItem(STORAGE_KEYS.session, userId);
  }
  updateAccessState();
  if (document.body.classList.contains("auth-document")) {
    const destination = isPremiumUser() ? "painel.html" : "conta.html";
    window.setTimeout(() => {
      window.location.href = destination;
    }, 350);
  }
}

function getCurrentUser() {
  state.currentUser = state.currentUser || sessionStorage.getItem(STORAGE_KEYS.session) || "";
  const user = state.users.find((item) => item.id === state.currentUser);
  if (user) normalizeAccountRecord(user, user.premium || user.id === PREMIUM_USER_ID);
  return user;
}

function isPremiumUser() {
  const user = getCurrentUser();
  return Boolean(user && (user.premium || user.id === PREMIUM_USER_ID));
}

function requireLogin() {
  if (state.currentUser) return true;

  showToast("Entre ou crie uma conta para enviar.");
  return false;
}

function hasCurrentUserProfile() {
  return Boolean(state.currentUser && state.clients.some((client) => client.userId === state.currentUser));
}

function hasCurrentUserCase() {
  return Boolean(state.currentUser && state.cases.some((item) => item.userId === state.currentUser));
}

function normalizeUserId(value) {
  return clean(value).toLowerCase().replace(/\s+/g, "-");
}

function updateAccessState() {
  const user = getCurrentUser();
  const logged = Boolean(user);
  const premium = isPremiumUser();
  const profileSent = hasCurrentUserProfile();
  const caseSent = hasCurrentUserCase();

  if (elements.authStatus) {
    elements.authStatus.textContent = logged
      ? `Conectado como ${user.username}${premium ? " (premium)" : ""}. ${profileSent ? "Perfil ja enviado." : "Perfil liberado."} ${caseSent ? "B.O. ja enviado." : "B.O. liberado."}`
      : "Entre ou crie uma conta para ter um perfil unico e enviar B.O.";
  }

  if (elements.authForm) elements.authForm.hidden = logged;
  if (elements.logoutButton) elements.logoutButton.hidden = !logged;

  setFormDisabled(elements.profileForm, !logged || profileSent);
  setFormDisabled(elements.caseForm, !logged);
  document.body.classList.toggle("is-premium", premium);
  document.querySelectorAll(".premium-only").forEach((element) => {
    element.hidden = !premium;
  });

  if (premium) {
    unlockAdminPanel();
    hydrateSiteEditor();
  }

  renderAccountSummary();
  renderAccountAccess();
  renderAccountsList();
}

function setFormDisabled(form, disabled) {
  if (!form) return;

  form.classList.toggle("is-locked", disabled);
  form.querySelectorAll("input, textarea, select, button").forEach((field) => {
    field.disabled = disabled;
  });
}

function renderAccountAccess() {
  if (!elements.accountAccess) return;

  if (getCurrentUser()) {
    elements.accountAccess.innerHTML = "";
    return;
  }

  const isRegister = accountMode === "register";
  elements.accountAccess.innerHTML = `
    <div class="login-card">
      <div class="section-heading">
        <p>${isRegister ? "Registro" : "Login"}</p>
        <h2>${isRegister ? "Crie sua conta para usar o site." : "Entre na sua conta."}</h2>
      </div>
      <form id="accountAccessForm" class="account-access-form" autocomplete="off">
        <label>
          Usuario
          <input name="username" type="text" required />
        </label>
        <label>
          Senha
          <input name="password" type="password" required />
        </label>
        ${isRegister ? `
          <label>
            Repetir senha
            <input name="confirmPassword" type="password" required />
          </label>
        ` : `
          <label class="remember-row">
            <input name="rememberDevice" type="checkbox" />
            Lembrar de mim neste dispositivo
          </label>
        `}
        <button class="button primary" type="submit">${isRegister ? "Registrar" : "Entrar"}</button>
      </form>
      <button class="button ghost auth-switch" type="button" data-account-mode="${isRegister ? "login" : "register"}">
        ${isRegister ? "Ja tenho conta" : "Criar conta"}
      </button>
    </div>
  `;
}

function handleAccountAccessClick(event) {
  const button = event.target.closest("[data-account-mode]");
  if (!button) return;

  accountMode = button.dataset.accountMode || "login";
  renderAccountAccess();
}

function handleAccountAccessSubmit(event) {
  const form = event.target.closest("#accountAccessForm");
  if (!form) return;

  event.preventDefault();
  const data = new FormData(form);
  const username = clean(data.get("username"));
  const password = clean(data.get("password"));

  if (accountMode === "register") {
    registerUser(username, password);
  } else {
    loginUser(username, password);
  }
}

function handleSiteEditorSubmit(event) {
  event.preventDefault();

  if (!isPremiumUser()) {
    showToast("Apenas a conta premium pode personalizar o site.");
    return;
  }

  const data = new FormData(elements.siteEditorForm);
  state.customContent = {
    heroTitle: clean(data.get("heroTitle")),
    heroText: clean(data.get("heroText")),
    primaryButton: clean(data.get("primaryButton")),
    secondaryButton: clean(data.get("secondaryButton")),
    heroLogoSrc: clean(data.get("heroLogoSrc")),
    officeImageSrc: clean(data.get("officeImageSrc")),
    fontFamily: clean(data.get("fontFamily")),
    heroTitleSize: clean(data.get("heroTitleSize")),
    textColor: clean(data.get("textColor")),
    buttonColor: clean(data.get("buttonColor")),
    contentWidth: clean(data.get("contentWidth")),
    cardRadius: clean(data.get("cardRadius"))
  };

  saveCustomContent();
  applyCustomContent();
  showToast("Personalizacao premium salva.");
}

function applyCustomContent() {
  Object.entries(state.customContent || {}).forEach(([key, value]) => {
    if (!value) return;
    const baseKey = key.endsWith("Style") ? key.replace("Style", "") : key;

    document.querySelectorAll(`[data-edit-key="${baseKey}"]`).forEach((element) => {
      if (!key.endsWith("Style")) element.textContent = value;
      if (state.customContent[`${baseKey}Style`]) element.setAttribute("style", state.customContent[`${baseKey}Style`]);
    });

    document.querySelectorAll(`[data-dev-key="${baseKey}"]`).forEach((element) => {
      if (!canApplyStoredDeveloperContent(element)) return;
      if (!key.endsWith("Style") && element.tagName === "IMG") element.src = value;
      if (!key.endsWith("Style") && element.tagName !== "IMG" && isDirectTextEditable(element)) element.textContent = value;
      if (state.customContent[`${baseKey}Style`] && canApplyStoredDeveloperStyle(element)) element.setAttribute("style", state.customContent[`${baseKey}Style`]);
      if (state.customContent[`${baseKey}Classes`]) {
        const classes = state.customContent[`${baseKey}Classes`];
        element.classList.toggle("dev-gravity", Boolean(classes.gravity));
        element.classList.toggle("dev-animated-gradient", Boolean(classes.gradient));
      }
    });
  });

  if (state.customContent.heroLogoSrc) {
    document.querySelectorAll(".hero-logo").forEach((image) => {
      image.src = state.customContent.heroLogoSrc;
    });
  }

  if (state.customContent.officeImageSrc) {
    document.querySelectorAll(".office-room").forEach((image) => {
      image.src = state.customContent.officeImageSrc;
    });
  }

  const root = document.documentElement;
  const styleMap = {
    fontFamily: "--font",
    heroTitleSize: "--hero-title-size",
    textColor: "--text",
    buttonColor: "--pink",
    contentWidth: "--content-width",
    cardRadius: "--radius"
  };

  Object.entries(styleMap).forEach(([key, variable]) => {
    if (state.customContent[key]) root.style.setProperty(variable, state.customContent[key]);
  });
}

function initDeveloperMode() {
  const devEnabled = new URLSearchParams(window.location.search).get("dev") === "1";
  if (!devEnabled || !isPremiumUser()) return;

  devEditor.active = true;
  document.body.classList.add("developer-mode");
  prepareDeveloperTargets();
  captureDeveloperBaseline();
  applyCustomContent();

  if (!document.querySelector(".developer-toolbar")) {
    const toolbar = document.createElement("div");
    toolbar.className = "developer-toolbar";
    const exitUrl = `${window.location.pathname.split("/").pop() || "index.html"}${window.location.hash || ""}`;
    toolbar.innerHTML = `
      <div class="dev-toolbar-topbar">
        <strong>Modo desenvolvedor</strong>
        <span>Ctrl + arrastar move</span>
      </div>
      <span id="devSelectionName">Selecione algo</span>
      <div class="dev-history-row">
        <button id="devUndo" class="button ghost" type="button">←</button>
        <button id="devRedo" class="button ghost" type="button">→</button>
        <button id="devResetSession" class="button danger" type="button">Desfazer tudo</button>
      </div>
      <button id="devClearSelected" class="button ghost" type="button">Limpar elemento selecionado</button>
      <label>Tamanho texto <input id="devFontSize" type="range" min="10" max="110" value="24" /></label>
      <label>Largura <input id="devWidth" type="range" min="24" max="1280" value="520" /></label>
      <label>Altura <input id="devHeight" type="range" min="24" max="900" value="160" /></label>
      <label>Arredondar <input id="devRadius" type="range" min="0" max="46" value="8" /></label>
      <label>Espaco interno <input id="devPadding" type="range" min="0" max="72" value="18" /></label>
      <label>Transparencia <input id="devOpacity" type="range" min="10" max="100" value="100" /></label>
      <label>Borda px <input id="devBorderWidth" type="range" min="0" max="12" value="1" /></label>
      <label>Estilo borda <select id="devBorderStyle"><option>solid</option><option>dashed</option><option>dotted</option><option>double</option></select></label>
      <label>Cor <input id="devTextColor" type="color" value="#fff8fb" /></label>
      <label>Fundo <input id="devBgColor" type="color" value="#171019" /></label>
      <label>Wallpaper <input id="devBgImage" type="text" placeholder="assets/fundo.png" /></label>
      <label>Sombra <input id="devShadow" type="range" min="0" max="100" value="34" /></label>
      <label>Profundidade <input id="devDepth" type="range" min="0" max="80" value="18" /></label>
      <label>Header alt. <input id="devHeaderHeight" type="range" min="48" max="140" value="68" /></label>
      <label><input id="devGravity" type="checkbox" /> gravidade 3D</label>
      <label><input id="devAnimatedGradient" type="checkbox" /> gradiente animado</label>
      <label class="dev-image-field">Imagem <input id="devImageSrc" type="text" placeholder="assets/imagem.png" /></label>
      <button id="devSave" class="button primary" type="button">Salvar</button>
      <a class="button ghost" href="${exitUrl}">Sair</a>
    `;
    document.body.appendChild(toolbar);
  }

  document.getElementById("devSave")?.addEventListener("click", saveInlineDeveloperChanges);
  document.getElementById("devUndo")?.addEventListener("click", undoDeveloperAction);
  document.getElementById("devRedo")?.addEventListener("click", redoDeveloperAction);
  document.getElementById("devResetSession")?.addEventListener("click", resetDeveloperSession);
  document.getElementById("devClearSelected")?.addEventListener("click", clearSelectedDeveloperElement);
  document.querySelector(".dev-toolbar-topbar")?.addEventListener("pointerdown", startToolbarDrag);
  ["devFontSize", "devWidth", "devHeight", "devRadius", "devPadding", "devOpacity", "devBorderWidth", "devBorderStyle", "devTextColor", "devBgColor", "devBgImage", "devShadow", "devDepth", "devHeaderHeight", "devGravity", "devAnimatedGradient", "devImageSrc"].forEach((id) => {
    document.getElementById(id)?.addEventListener("input", applyDeveloperControls);
    document.getElementById(id)?.addEventListener("change", () => selectedDevElement && pushDeveloperHistory(selectedDevElement));
  });
}

function handleDeveloperSelection(event) {
  if (!document.body.classList.contains("developer-mode")) return;
  if (event.target.closest(".developer-toolbar")) return;

  const editable = event.target.closest("[data-dev-key], [data-edit-key]");
  if (!editable) return;

  selectedDevElement = editable;
  selectedEditable = editable.dataset.editKey ? editable : null;
  document.querySelectorAll(".dev-selected").forEach((item) => item.classList.remove("dev-selected"));
  selectedDevElement.classList.add("dev-selected");
  syncDeveloperToolbar(selectedDevElement);
}

function interceptDeveloperActions(event) {
  if (!document.body.classList.contains("developer-mode")) return;
  if (event.target.closest(".developer-toolbar")) return;

  const editable = event.target.closest("[data-dev-key], [data-edit-key]");
  if (editable) {
    event.preventDefault();
    selectedDevElement = editable;
    selectedEditable = editable.dataset.editKey ? editable : null;
    document.querySelectorAll(".dev-selected").forEach((item) => item.classList.remove("dev-selected"));
    selectedDevElement.classList.add("dev-selected");
    syncDeveloperToolbar(selectedDevElement);
    if (isDirectTextEditable(selectedDevElement)) selectedDevElement.focus();
    event.stopImmediatePropagation();
  }
}

function handleDeveloperInput(event) {
  if (!document.body.classList.contains("developer-mode")) return;

  const target = event.target.closest("[data-edit-key]");
  const devTarget = event.target.closest("[data-dev-key]");
  if (!target && !devTarget) return;

  if (target) state.customContent[target.dataset.editKey] = target.textContent.trim();
  if (devTarget && isDirectTextEditable(devTarget)) state.customContent[devTarget.dataset.devKey] = devTarget.textContent.trim();
  saveCustomContent();
}

function handleDeveloperBeforeInput(event) {
  if (!document.body.classList.contains("developer-mode")) return;
  const target = event.target.closest("[data-edit-key], [data-dev-key]");
  if (!target || !isDirectTextEditable(target)) return;

  const lastAction = devEditor.undo[devEditor.undo.length - 1];
  if (!lastAction || lastAction.before.key !== target.dataset.devKey || Date.now() - lastAction.at > 500) {
    pushDeveloperHistory(target);
  }
}

function saveInlineDeveloperChanges() {
  if (!isPremiumUser()) return;

  if (selectedDevElement) {
    applyDeveloperControls();
    persistDeveloperElement(selectedDevElement);
  }

  document.querySelectorAll("[data-edit-key]").forEach((element) => {
    state.customContent[element.dataset.editKey] = element.textContent.trim();
  });
  saveCustomContent();
  showToast("Alteracoes do modo desenvolvedor salvas.");
}

function prepareDeveloperTargets() {
  const targets = assignDeveloperKeys();

  targets.forEach((element) => {
    element.tabIndex = 0;
    if (isDirectTextEditable(element)) {
      element.contentEditable = "true";
      element.setAttribute("spellcheck", "false");
    }
    if (element.tagName !== "IMG" && !element.querySelector(":scope > .dev-resize-handle") && !isDirectTextEditable(element)) {
      const handle = document.createElement("span");
      handle.className = "dev-resize-handle";
      handle.setAttribute("aria-hidden", "true");
      element.appendChild(handle);
    }
  });
}

function assignDeveloperKeys() {
  const targets = Array.from(document.querySelectorAll("header *, main *, footer *")).filter((element) => {
    if (element.closest(".developer-toolbar")) return false;
    if (element.matches("script, style, canvas, input, textarea, select, option")) return false;
    return true;
  });

  targets.forEach((element, index) => {
    if (!element.dataset.devKey) {
      const name = element.dataset.editKey || element.className || element.id || element.tagName.toLowerCase();
      const page = document.body.className || "home";
      element.dataset.devKey = `dev-${String(page).replace(/\s+/g, "-").slice(0, 16)}-${String(name).replace(/\s+/g, "-").slice(0, 24)}-${index + 1}`;
    }
  });

  return targets;
}

function isTextLikeElement(element) {
  return element.matches("h1, h2, h3, h4, p, span, strong, small, a, button, figcaption, li");
}

function isDirectTextEditable(element) {
  if (!isTextLikeElement(element)) return false;
  return !element.querySelector("input, textarea, select, button, img, a, form");
}

function canApplyStoredDeveloperContent(element) {
  return !element.matches("label") && !element.closest(".account-profile-form");
}

function canApplyStoredDeveloperStyle(element) {
  if (element.closest("form") && element.matches("label, span, strong, small, p")) return false;
  if (element.closest(".about-character-card figcaption")) return false;
  return true;
}

function repairUnsafeDeveloperCustomizations() {
  let changed = false;

  document.querySelectorAll("[data-dev-key]").forEach((element) => {
    const key = element.dataset.devKey;
    if (!key) return;

    const unsafeText = !canApplyStoredDeveloperContent(element) || !isDirectTextEditable(element);
    const unsafeStyle = !canApplyStoredDeveloperStyle(element);

    if (unsafeText && state.customContent[key]) {
      delete state.customContent[key];
      changed = true;
    }

    if (unsafeStyle) {
      if (state.customContent[`${key}Style`]) {
        delete state.customContent[`${key}Style`];
        changed = true;
      }
      if (state.customContent[`${key}Classes`]) {
        delete state.customContent[`${key}Classes`];
        changed = true;
      }
    }
  });

  document.querySelectorAll("[data-edit-key]").forEach((element) => {
    const key = `${element.dataset.editKey}Style`;
    if (!state.customContent[key] || !isDirectTextEditable(element)) return;

    const sanitized = sanitizeTextStyle(state.customContent[key]);
    if (sanitized !== state.customContent[key]) {
      if (sanitized) state.customContent[key] = sanitized;
      else delete state.customContent[key];
      changed = true;
    }
  });

  if (changed) saveCustomContent();
}

function sanitizeTextStyle(styleText) {
  const allowed = /^(color|font-size|font-family|font-weight|font-style|text-shadow|letter-spacing|line-height)\s*:/i;
  return String(styleText || "")
    .split(";")
    .map((part) => part.trim())
    .filter((part) => allowed.test(part))
    .join("; ");
}

function syncDeveloperToolbar(element) {
  const styles = getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  const name = document.getElementById("devSelectionName");
  const size = document.getElementById("devFontSize");
  const width = document.getElementById("devWidth");
  const height = document.getElementById("devHeight");
  const radius = document.getElementById("devRadius");
  const padding = document.getElementById("devPadding");
  const opacity = document.getElementById("devOpacity");
  const borderWidth = document.getElementById("devBorderWidth");
  const borderStyle = document.getElementById("devBorderStyle");
  const color = document.getElementById("devTextColor");
  const bg = document.getElementById("devBgColor");
  const bgImage = document.getElementById("devBgImage");
  const shadow = document.getElementById("devShadow");
  const depth = document.getElementById("devDepth");
  const headerHeight = document.getElementById("devHeaderHeight");
  const gravity = document.getElementById("devGravity");
  const gradient = document.getElementById("devAnimatedGradient");
  const image = document.getElementById("devImageSrc");

  if (name) name.textContent = element.dataset.editKey || element.alt || element.id || element.tagName.toLowerCase();
  if (size) size.value = Math.min(110, Math.max(10, parseFloat(styles.fontSize) || 24));
  if (width) width.value = Math.min(1280, Math.max(24, Math.round(rect.width)));
  if (height) height.value = Math.min(900, Math.max(24, Math.round(rect.height)));
  if (radius) radius.value = Math.min(46, Math.max(0, parseFloat(styles.borderRadius) || 0));
  if (padding) padding.value = Math.min(72, Math.max(0, parseFloat(styles.paddingTop) || 0));
  if (opacity) opacity.value = Math.round((parseFloat(styles.opacity) || 1) * 100);
  if (borderWidth) borderWidth.value = Math.min(12, Math.max(0, parseFloat(styles.borderWidth) || 0));
  if (borderStyle) borderStyle.value = styles.borderStyle || "solid";
  if (color) color.value = rgbToHex(styles.color);
  if (bg) bg.value = rgbToHex(styles.backgroundColor);
  if (bgImage) {
    const imageValue = styles.backgroundImage || "";
    bgImage.value = imageValue.startsWith("url(")
      ? imageValue.replace(/^url\(["']?/, "").replace(/["']?\)$/, "")
      : "";
  }
  if (shadow) shadow.value = element.dataset.devShadow || 34;
  if (depth) depth.value = element.dataset.devDepth || 18;
  if (headerHeight) headerHeight.value = Math.min(140, Math.max(48, Math.round(document.querySelector(".site-header")?.getBoundingClientRect().height || 68)));
  if (gravity) gravity.checked = element.classList.contains("dev-gravity") || Boolean(element.dataset.devDepth);
  if (gradient) gradient.checked = element.classList.contains("dev-animated-gradient");
  if (image) {
    image.value = element.tagName === "IMG" ? element.getAttribute("src") || "" : "";
    image.closest("label").hidden = element.tagName !== "IMG";
  }
}

function applyDeveloperControls() {
  if (!selectedDevElement) return;
  queueDeveloperHistory(selectedDevElement);

  const size = document.getElementById("devFontSize")?.value;
  const width = document.getElementById("devWidth")?.value;
  const height = document.getElementById("devHeight")?.value;
  const radius = document.getElementById("devRadius")?.value;
  const padding = document.getElementById("devPadding")?.value;
  const opacity = document.getElementById("devOpacity")?.value;
  const borderWidth = document.getElementById("devBorderWidth")?.value;
  const borderStyle = document.getElementById("devBorderStyle")?.value;
  const color = document.getElementById("devTextColor")?.value;
  const bg = document.getElementById("devBgColor")?.value;
  const bgImage = document.getElementById("devBgImage")?.value;
  const shadow = document.getElementById("devShadow")?.value;
  const depth = document.getElementById("devDepth")?.value;
  const headerHeight = document.getElementById("devHeaderHeight")?.value;
  const gravity = document.getElementById("devGravity")?.checked;
  const gradient = document.getElementById("devAnimatedGradient")?.checked;
  const image = document.getElementById("devImageSrc")?.value;

  if (selectedDevElement.dataset.editKey && size) selectedDevElement.style.fontSize = `${size}px`;
  if (color) selectedDevElement.style.color = color;
  if (bg && selectedDevElement.tagName !== "IMG") selectedDevElement.style.backgroundColor = bg;
  if (bgImage && selectedDevElement.tagName !== "IMG") {
    selectedDevElement.style.backgroundImage = `url("${bgImage}")`;
    selectedDevElement.style.backgroundSize = "cover";
    selectedDevElement.style.backgroundPosition = "center";
  }
  if (!bgImage && !gradient && selectedDevElement.tagName !== "IMG") {
    selectedDevElement.style.backgroundImage = "";
    selectedDevElement.style.backgroundSize = "";
    selectedDevElement.style.backgroundPosition = "";
  }
  if (gradient && selectedDevElement.tagName !== "IMG" && !bgImage) {
    selectedDevElement.style.backgroundImage = `linear-gradient(135deg, ${bg || "#171019"}, rgba(255, 79, 179, 0.42), rgba(255, 211, 111, 0.28), ${bg || "#171019"})`;
    selectedDevElement.style.backgroundSize = "240% 240%";
  }
  if (width) selectedDevElement.style.width = `${width}px`;
  if (height && !selectedDevElement.dataset.editKey) selectedDevElement.style.minHeight = `${height}px`;
  if (radius && selectedDevElement.tagName !== "IMG") selectedDevElement.style.borderRadius = `${radius}px`;
  if (padding && !selectedDevElement.dataset.editKey && selectedDevElement.tagName !== "IMG") selectedDevElement.style.padding = `${padding}px`;
  if (opacity) selectedDevElement.style.opacity = String(Number(opacity) / 100);
  if (borderWidth) selectedDevElement.style.borderWidth = `${borderWidth}px`;
  if (borderStyle) selectedDevElement.style.borderStyle = borderStyle;
  if (shadow && Number(shadow) > 0) {
    selectedDevElement.style.boxShadow = `0 ${Math.round(Number(shadow) / 2)}px ${shadow}px rgba(0, 0, 0, 0.34), 0 0 ${Math.round(Number(shadow) / 2)}px rgba(255, 79, 179, 0.14)`;
  } else {
    selectedDevElement.style.boxShadow = "";
  }
  if (gravity && depth) {
    selectedDevElement.dataset.devDepth = depth;
    selectedDevElement.style.transform = `translateZ(0) perspective(900px) rotateX(0deg) rotateY(0deg)`;
  } else {
    selectedDevElement.style.transform = "";
    delete selectedDevElement.dataset.devDepth;
  }
  selectedDevElement.classList.toggle("dev-gravity", Boolean(gravity));
  selectedDevElement.classList.toggle("dev-animated-gradient", Boolean(gradient));
  if (headerHeight && selectedDevElement.closest(".site-header")) {
    document.querySelector(".site-header")?.style.setProperty("min-height", `${headerHeight}px`);
  }
  selectedDevElement.style.maxWidth = "100%";
  if (selectedDevElement.tagName === "IMG" && image) selectedDevElement.src = image;
}

function persistDeveloperElement(element) {
  if (element.dataset.editKey) {
    state.customContent[element.dataset.editKey] = element.textContent.trim();
    state.customContent[`${element.dataset.editKey}Style`] = element.getAttribute("style") || "";
  }
  if (element.dataset.devKey) {
    state.customContent[`${element.dataset.devKey}Style`] = element.getAttribute("style") || "";
    state.customContent[`${element.dataset.devKey}Classes`] = {
      gravity: element.classList.contains("dev-gravity"),
      gradient: element.classList.contains("dev-animated-gradient")
    };
    if (isDirectTextEditable(element)) state.customContent[element.dataset.devKey] = element.textContent.trim();
    if (element.tagName === "IMG") state.customContent[element.dataset.devKey] = element.getAttribute("src") || "";
  }
}

function clearSelectedDeveloperElement() {
  if (!selectedDevElement) {
    showToast("Selecione um elemento para limpar.");
    return;
  }

  pushDeveloperHistory(selectedDevElement);
  const key = selectedDevElement.dataset.devKey;
  const editKey = selectedDevElement.dataset.editKey;
  selectedDevElement.removeAttribute("style");
  selectedDevElement.classList.remove("dev-gravity", "dev-animated-gradient", "dev-selected");
  delete selectedDevElement.dataset.devDepth;

  if (key) {
    delete state.customContent[`${key}Style`];
    delete state.customContent[`${key}Classes`];
  }
  if (editKey) {
    delete state.customContent[`${editKey}Style`];
  }

  saveCustomContent();
  selectedDevElement = null;
  selectedEditable = null;
  document.getElementById("devSelectionName").textContent = "Selecione algo";
  showToast("Estilo do elemento limpo.");
}

function captureDeveloperBaseline() {
  devEditor.baseline.clear();
  assignDeveloperKeys().forEach((element) => {
    devEditor.baseline.set(element.dataset.devKey, snapshotDeveloperElement(element));
  });
}

function snapshotDeveloperElement(element) {
  return {
    key: element.dataset.devKey,
    editKey: element.dataset.editKey || "",
    style: element.getAttribute("style") || "",
    text: isDirectTextEditable(element) ? element.textContent : "",
    src: element.tagName === "IMG" ? element.getAttribute("src") || "" : "",
    classes: {
      gravity: element.classList.contains("dev-gravity"),
      gradient: element.classList.contains("dev-animated-gradient")
    }
  };
}

function restoreDeveloperSnapshot(snapshot) {
  if (!snapshot) return;
  const element = document.querySelector(`[data-dev-key="${snapshot.key}"]`);
  if (!element) return;
  if (snapshot.style) element.setAttribute("style", snapshot.style);
  else element.removeAttribute("style");
  if (isDirectTextEditable(element)) element.textContent = snapshot.text || "";
  if (element.tagName === "IMG") {
    if (snapshot.src) element.setAttribute("src", snapshot.src);
    else element.removeAttribute("src");
  }
  element.classList.toggle("dev-gravity", Boolean(snapshot.classes?.gravity));
  element.classList.toggle("dev-animated-gradient", Boolean(snapshot.classes?.gradient));
  persistDeveloperElement(element);
}

function pushDeveloperHistory(element) {
  if (!element?.dataset?.devKey) return;
  devEditor.undo.push({
    at: Date.now(),
    before: snapshotDeveloperElement(element),
    after: null
  });
  devEditor.undo = devEditor.undo.slice(-80);
  devEditor.redo = [];
}

function queueDeveloperHistory(element) {
  window.clearTimeout(devEditor.controlTimer);
  const lastAction = devEditor.undo[devEditor.undo.length - 1];
  if (!lastAction || lastAction.before.key !== element.dataset.devKey || lastAction.at < Date.now() - 300) {
    pushDeveloperHistory(element);
  }
  devEditor.controlTimer = window.setTimeout(() => {
    const last = devEditor.undo[devEditor.undo.length - 1];
    if (last && element) last.after = snapshotDeveloperElement(element);
    if (element) {
      persistDeveloperElement(element);
      saveCustomContent();
    }
  }, 180);
}

function undoDeveloperAction() {
  const now = Date.now();
  const index = devEditor.undo.findLastIndex((item) => now - item.at <= 5000);
  if (index < 0) {
    showToast("Nao ha acao recente para desfazer.");
    return;
  }
  const action = devEditor.undo.splice(index, 1)[0];
  action.after = action.after || snapshotDeveloperElement(document.querySelector(`[data-dev-key="${action.before.key}"]`));
  restoreDeveloperSnapshot(action.before);
  devEditor.redo.push(action);
  saveCustomContent();
}

function redoDeveloperAction() {
  const action = devEditor.redo.pop();
  if (!action) {
    showToast("Nada para refazer.");
    return;
  }
  restoreDeveloperSnapshot(action.after);
  devEditor.undo.push(action);
  saveCustomContent();
}

function resetDeveloperSession() {
  devEditor.baseline.forEach((snapshot) => restoreDeveloperSnapshot(snapshot));
  devEditor.undo = [];
  devEditor.redo = [];
  saveCustomContent();
  showToast("Alteracoes desta sessao desfeitas.");
}

function handleDeveloperPointerDown(event) {
  if (!document.body.classList.contains("developer-mode")) return;
  if (event.target.closest(".developer-toolbar")) return;

  if (event.ctrlKey) {
    const target = event.target.closest("[data-dev-key], [data-edit-key]");
    if (!target) return;
    event.preventDefault();
    event.stopPropagation();
    selectedDevElement = target;
    document.querySelectorAll(".dev-selected").forEach((item) => item.classList.remove("dev-selected"));
    target.classList.add("dev-selected");
    syncDeveloperToolbar(target);
    pushDeveloperHistory(target);
    const styles = getComputedStyle(target);
    target.style.position = styles.position === "static" ? "relative" : styles.position;
    target.style.userSelect = "none";
    target.draggable = false;
    devEditor.moveDrag = {
      target,
      startX: event.clientX,
      startY: event.clientY,
      startLeft: parseFloat(target.style.left) || 0,
      startTop: parseFloat(target.style.top) || 0
    };
    return;
  }

  if (!event.target.classList.contains("dev-resize-handle")) return;

  const target = event.target.closest("[data-dev-key]");
  if (!target) return;
  event.preventDefault();
  event.stopPropagation();
  selectedDevElement = target;
  target.classList.add("dev-selected");
  const rect = target.getBoundingClientRect();
  devDragState = {
    target,
    startX: event.clientX,
    startY: event.clientY,
    startWidth: rect.width,
    startHeight: rect.height
  };
}

function handleDeveloperPointerMove(event) {
  if (devEditor.toolbarDrag) {
    const toolbar = document.querySelector(".developer-toolbar");
    if (!toolbar) return;
    toolbar.style.left = `${devEditor.toolbarDrag.left + event.clientX - devEditor.toolbarDrag.startX}px`;
    toolbar.style.top = `${devEditor.toolbarDrag.top + event.clientY - devEditor.toolbarDrag.startY}px`;
    toolbar.style.right = "auto";
    return;
  }

  if (devEditor.moveDrag) {
    const drag = devEditor.moveDrag;
    drag.target.style.left = `${Math.round(drag.startLeft + event.clientX - drag.startX)}px`;
    drag.target.style.top = `${Math.round(drag.startTop + event.clientY - drag.startY)}px`;
    return;
  }

  if (!devDragState) return;
  const width = Math.max(24, devDragState.startWidth + event.clientX - devDragState.startX);
  const height = Math.max(24, devDragState.startHeight + event.clientY - devDragState.startY);
  devDragState.target.style.width = `${Math.round(width)}px`;
  devDragState.target.style.minHeight = `${Math.round(height)}px`;
  syncDeveloperToolbar(devDragState.target);
}

function handleDeveloperPointerUp() {
  if (devEditor.toolbarDrag) {
    devEditor.toolbarDrag = null;
    return;
  }

  if (devEditor.moveDrag) {
    devEditor.moveDrag.target.style.userSelect = "";
    persistDeveloperElement(devEditor.moveDrag.target);
    saveCustomContent();
    devEditor.moveDrag = null;
    return;
  }

  if (!devDragState) return;
  persistDeveloperElement(devDragState.target);
  saveCustomContent();
  devDragState = null;
}

function startToolbarDrag(event) {
  const toolbar = event.currentTarget.closest(".developer-toolbar");
  if (!toolbar) return;
  event.preventDefault();
  const rect = toolbar.getBoundingClientRect();
  devEditor.toolbarDrag = {
    startX: event.clientX,
    startY: event.clientY,
    left: rect.left,
    top: rect.top
  };
}

function hydrateSiteEditor() {
  if (!elements.siteEditorForm) return;

  const defaults = {
    heroTitle: document.querySelector('[data-edit-key="heroTitle"]')?.textContent.trim() || "",
    heroText: document.querySelector('[data-edit-key="heroText"]')?.textContent.trim() || "",
    primaryButton: document.querySelector('[data-edit-key="primaryButton"]')?.textContent.trim() || "",
    secondaryButton: document.querySelector('[data-edit-key="secondaryButton"]')?.textContent.trim() || "",
    heroLogoSrc: document.querySelector(".hero-logo")?.getAttribute("src") || "",
    officeImageSrc: document.querySelector(".office-room")?.getAttribute("src") || "",
    fontFamily: getComputedStyle(document.documentElement).getPropertyValue("--font").trim(),
    heroTitleSize: getComputedStyle(document.documentElement).getPropertyValue("--hero-title-size").trim(),
    textColor: getComputedStyle(document.documentElement).getPropertyValue("--text").trim(),
    buttonColor: getComputedStyle(document.documentElement).getPropertyValue("--pink").trim(),
    contentWidth: getComputedStyle(document.documentElement).getPropertyValue("--content-width").trim(),
    cardRadius: getComputedStyle(document.documentElement).getPropertyValue("--radius").trim()
  };

  Object.entries(defaults).forEach(([key, value]) => {
    const field = elements.siteEditorForm.elements[key];
    if (field) field.value = state.customContent[key] || value;
  });

  elements.siteEditorForm.dataset.hydrated = "true";
}

function renderAccountSummary() {
  if (!elements.accountSummary) return;

  const user = getCurrentUser();
  if (!user) {
    elements.accountSummary.innerHTML = `
      <div class="case-guide">
        <span class="slot-mark">Conta</span>
        <h3>Nenhuma conta conectada</h3>
        <p>Entre ou crie uma conta para ver suas informacoes.</p>
        <a class="button primary" href="conta.html">Ir para conta</a>
      </div>
    `;
    return;
  }

  const profile = state.clients.find((client) => client.userId === user.id);
  const report = state.cases.find((item) => item.userId === user.id);
  const denunciations = state.denunciations.filter((item) => item.userId === user.id);
  const initials = getInitials(user.username);
  const premium = user.premium || user.id === PREMIUM_USER_ID;
  const editing = state.profileEditing;
  const avatarSource = state.profileAvatarDraft || user.avatar;
  const avatar = avatarSource
    ? `<img src="${escapeHtml(avatarSource)}" alt="Foto de perfil de ${escapeHtml(user.username)}" />`
    : escapeHtml(initials);
  const fontOptions = [
    ["", "Padrao elegante"],
    ["Georgia, serif", "Georgia classica"],
    ["Verdana, Geneva, sans-serif", "Verdana limpa"],
    ["Trebuchet MS, sans-serif", "Trebuchet suave"],
    ["Courier New, monospace", "Pixel juridico"]
  ];
  const profileStyle = [
    user.profileFont ? `font-family:${escapeHtml(user.profileFont)}` : "",
    `--profile-opacity:${Number(user.profileOpacity) / 100}`,
    `--profile-border-width:${Number(user.profileBorderWidth)}px`,
    `--profile-border-style:${escapeHtml(user.profileBorderStyle)}`
  ].filter(Boolean).join(";");

  elements.accountSummary.innerHTML = `
    <article class="account-profile-card ${premium ? "is-premium-account" : ""}" style="${profileStyle}">
      <label class="profile-avatar ${editing ? "is-editing" : ""}">
        ${avatar}
        ${editing ? `<input id="profileAvatarInput" type="file" accept="image/*" />` : ""}
        <span>${editing ? "Alterar foto" : "Foto"}</span>
      </label>
      <span class="slot-mark">${premium ? "Conta premium" : "Conta comum"}</span>
      <h2 id="profileNameText" class="${user.profileGlow ? "profile-glow" : ""} ${user.profileSparkle ? "profile-sparkle" : ""}" ${editing ? `contenteditable="true" spellcheck="false"` : ""}>${escapeHtml(user.username)}</h2>
      <p class="account-id">ID #${escapeHtml(user.accountNumber)} · ${escapeHtml(user.accountType)}</p>
      <p id="profileBioText" class="account-bio" ${editing ? `contenteditable="true" spellcheck="false"` : ""}>${escapeHtml(user.bio || "Sem bio por enquanto.")}</p>
      <div class="account-info-grid">
        <span><strong>${formatDate(user.createdAt)}</strong><small>criada em</small></span>
        <span><strong>${profile ? "Sim" : "Nao"}</strong><small>perfil publico</small></span>
        <span><strong>${report ? "Sim" : "Nao"}</strong><small>B.O. privado</small></span>
        <span><strong>${denunciations.length}</strong><small>denuncias</small></span>
      </div>
      ${editing ? `
        <form id="accountProfileForm" class="account-profile-form">
          <div class="profile-editor-panel">
            <label>Fonte do nome e bio
              <select name="profileFont">
                ${fontOptions.map(([value, label]) => `<option value="${escapeHtml(value)}" ${user.profileFont === value ? "selected" : ""}>${label}</option>`).join("")}
              </select>
            </label>
            <div class="profile-effect-grid">
              <label class="effect-toggle"><input name="profileGlow" type="checkbox" ${user.profileGlow ? "checked" : ""} /> <span>Brilho</span></label>
              <label class="effect-toggle"><input name="profileSparkle" type="checkbox" ${user.profileSparkle ? "checked" : ""} /> <span>Cintilante</span></label>
            </div>
            <div class="profile-custom-grid">
              <label>Transparencia <input name="profileOpacity" type="range" min="35" max="100" value="${Number(user.profileOpacity)}" /></label>
              <label>Borda <input name="profileBorderWidth" type="range" min="0" max="8" value="${Number(user.profileBorderWidth)}" /></label>
              <label>Estilo
                <select name="profileBorderStyle">
                  ${["solid", "dashed", "dotted", "double"].map((style) => `<option value="${style}" ${user.profileBorderStyle === style ? "selected" : ""}>${style}</option>`).join("")}
                </select>
              </label>
            </div>
          </div>
          <div class="account-actions">
            <button class="button primary" type="submit">Salvar perfil</button>
            <button class="button ghost" type="button" data-profile-action="cancel">Cancelar</button>
          </div>
        </form>
      ` : ""}
      <div class="account-actions">
        ${editing ? "" : `<button class="button primary" type="button" data-profile-action="edit">Editar perfil</button>`}
        ${premium ? `<a class="button primary golden-button" href="painel.html">Abrir painel premium</a>` : `<a class="button ghost" href="index.html#bo">Registrar B.O.</a>`}
        <button id="logoutButtonInline" class="button ghost" type="button">Sair da conta</button>
      </div>
    </article>
  `;

  document.getElementById("logoutButtonInline")?.addEventListener("click", logoutUser);
}

function renderAccountsList() {
  if (!elements.accountsList || !isPremiumUser()) return;

  elements.accountsList.innerHTML = state.users
    .map((user) => {
      const profiles = state.clients.filter((client) => client.userId === user.id).length;
      const cases = state.cases.filter((item) => item.userId === user.id).length;
      const den = state.denunciations.filter((item) => item.userId === user.id).length;
      const premium = user.premium || user.id === PREMIUM_USER_ID;

      return `
        <article class="case-card">
          <header>
            <div>
              <h4>${escapeHtml(user.username)} ${premium ? "(premium)" : ""}</h4>
              <time>${formatDate(user.createdAt)}</time>
            </div>
            <span class="status-pill">${escapeHtml(user.id)}</span>
          </header>
          <div class="case-meta">
            <span>Perfis: ${profiles}</span>
            <span>B.O.: ${cases}</span>
            <span>Denuncias: ${den}</span>
          </div>
          ${premium ? "" : `<button class="button danger" type="button" data-account-action="delete" data-account-id="${user.id}">Apagar conta</button>`}
        </article>
      `;
    })
    .join("");
}

function handleAccountProfileSubmit(event) {
  const form = event.target.closest("#accountProfileForm");
  if (!form) return;

  event.preventDefault();
  const user = getCurrentUser();
  if (!user) return;

  const data = new FormData(form);
  const nextName = clean(document.getElementById("profileNameText")?.textContent || user.username);
  const canChangeName = canRenameAccount(user);

  if (nextName && nextName !== user.username) {
    if (!canChangeName) {
      showToast("Nome bloqueado. Aguarde 7 dias para alterar novamente.");
      return;
    }
    user.username = nextName;
    user.nameChanges = (user.nameChanges || 0) + 1;
    user.lastNameChangeAt = new Date().toISOString();
  }

  user.avatar = state.profileAvatarDraft || user.avatar;
  user.bio = clean(document.getElementById("profileBioText")?.textContent || "");
  user.profileFont = clean(data.get("profileFont"));
  user.profileGlow = data.get("profileGlow") === "on";
  user.profileSparkle = data.get("profileSparkle") === "on";
  user.profileOpacity = Number(data.get("profileOpacity")) || 88;
  user.profileBorderWidth = Number(data.get("profileBorderWidth")) || 0;
  user.profileBorderStyle = clean(data.get("profileBorderStyle")) || "solid";
  state.profileEditing = false;
  state.profileAvatarDraft = "";
  saveUsers();
  renderAccountSummary();
  showToast("Perfil atualizado.");
}

function handleAccountProfileClick(event) {
  const button = event.target.closest("[data-profile-action]");
  if (!button) return;

  const action = button.dataset.profileAction;
  if (action === "edit") {
    state.profileEditing = true;
    renderAccountSummary();
    return;
  }

  if (action === "cancel") {
    state.profileEditing = false;
    state.profileAvatarDraft = "";
    renderAccountSummary();
  }
}

async function handleAccountProfileChange(event) {
  if (event.target.id !== "profileAvatarInput") return;

  const file = event.target.files?.[0];
  if (!file || !file.type.startsWith("image/")) return;

  state.profileAvatarDraft = await fileToDataUrl(file);
  renderAccountSummary();
}

function canRenameAccount(user) {
  if (!user.nameChanges) return true;
  if (!user.lastNameChangeAt) return true;
  return Date.now() - new Date(user.lastNameChangeAt).getTime() >= 7 * 24 * 60 * 60 * 1000;
}

function handleAccountAction(event) {
  const button = event.target.closest("[data-account-action]");
  if (!button || !isPremiumUser()) return;

  const id = button.dataset.accountId;
  if (!id || id === PREMIUM_USER_ID) return;

  state.users = state.users.filter((user) => user.id !== id);
  state.clients = state.clients.filter((client) => client.userId !== id);
  state.cases = state.cases.filter((item) => item.userId !== id);
  state.denunciations = state.denunciations.filter((item) => item.userId !== id);
  saveUsers();
  saveClients();
  saveCases();
  saveDenunciations();
  renderAll();
  showToast("Conta comum removida.");
}

function renderAll() {
  renderCounters();
  renderClients();
  renderCases();
  renderDenunciations();
  renderPublicDenunciations();
  renderPosts();
  updateAccessState();
}

function renderCounters() {
  const visits = Number(localStorage.getItem(STORAGE_KEYS.visits) || 0);
  const evidenceTotal = state.cases.reduce((total, item) => total + item.evidence.length, 0);

  animateNumber(elements.visitCounter, visits);
  animateNumber(elements.clientCounter, state.clients.length);
  animateNumber(elements.evidenceCounter, evidenceTotal);
  animateNumber(elements.caseCount, state.cases.length);
}

function renderClients() {
  if (!elements.clientDirectory || !elements.clientSearch) return;

  const term = elements.clientSearch.value.trim().toLowerCase();
  state.clientPage = Math.max(1, state.clientPage);
  const clients = state.clients.filter((client) => {
    const haystack = `${client.nick} ${client.role} ${client.status} ${client.bio}`.toLowerCase();
    return haystack.includes(term);
  });

  if (!clients.length) {
    elements.clientDirectory.innerHTML = `<div class="empty-state">Nenhum perfil publico encontrado.</div>`;
    if (elements.clientPagination) elements.clientPagination.innerHTML = "";
    return;
  }

  const pageSize = 4;
  const totalPages = Math.max(1, Math.ceil(clients.length / pageSize));
  state.clientPage = Math.min(state.clientPage, totalPages);
  const visibleClients = clients.slice((state.clientPage - 1) * pageSize, state.clientPage * pageSize);

  elements.clientDirectory.innerHTML = visibleClients
    .map((client) => {
      const initials = getInitials(client.nick);
      const reply = client.reply
        ? `<div class="client-reply"><strong>Resposta da Levadinha</strong><p>${escapeHtml(client.reply)}</p></div>`
        : "";
      const replyEditor = state.replyingClientId === client.id
        ? `
          <form class="reply-editor" data-client-id="${client.id}">
            <div class="reply-author">
              <img src="assets/levadinha-personagem-grande-transparent.png" alt="Levadinha" />
              <div>
                <strong>Levadinha</strong>
                <span>Advogada dos Habbos</span>
              </div>
            </div>
            <label>
              Resposta publica
              <textarea name="reply" rows="3" placeholder="Digite a resposta para este perfil.">${escapeHtml(client.reply || "")}</textarea>
            </label>
            <div class="client-actions">
              <button class="button primary" type="submit">Salvar resposta</button>
              <button class="button ghost" type="button" data-client-action="cancel-reply" data-client-id="${client.id}">Cancelar</button>
            </div>
          </form>
        `
        : "";
      const premiumActions = isPremiumUser()
        ? `
          <div class="client-actions">
            <button class="button ghost" type="button" data-client-action="reply" data-client-id="${client.id}">Responder</button>
            <button class="button danger" type="button" data-client-action="delete" data-client-id="${client.id}">Apagar</button>
          </div>
        `
        : "";

      return `
        <article class="client-card">
          <div class="avatar-chip" aria-hidden="true">${initials}</div>
          <div>
            <h4>${escapeHtml(client.nick)}</h4>
            <p>${escapeHtml(client.role)}</p>
            <p>${escapeHtml(client.bio)}</p>
            <span class="status-pill">${escapeHtml(client.status)}</span>
            ${reply}
            ${replyEditor}
            ${premiumActions}
          </div>
        </article>
      `;
    })
    .join("");

  renderClientPagination(totalPages);
}

function handleClientDirectoryAction(event) {
  const replyForm = event.target.closest(".reply-editor");
  if (replyForm && event.type === "submit") return;

  const button = event.target.closest("[data-client-action]");
  if (!button) return;

  if (!isPremiumUser()) {
    showToast("Apenas a conta premium pode moderar perfis.");
    return;
  }

  const id = button.dataset.clientId;
  const action = button.dataset.clientAction;
  const client = state.clients.find((item) => item.id === id);
  if (!client) return;

  if (action === "delete") {
    state.clients = state.clients.filter((item) => item.id !== id);
    saveClients();
    renderAll();
    showToast("Perfil publico apagado.");
    return;
  }

  if (action === "reply") {
    state.replyingClientId = client.id;
    renderAll();
    return;
  }

  if (action === "cancel-reply") {
    state.replyingClientId = "";
    renderAll();
  }
}

function handleClientDirectorySubmit(event) {
  const form = event.target.closest(".reply-editor");
  if (!form) return;

  event.preventDefault();

  if (!isPremiumUser()) {
    showToast("Apenas a conta premium pode responder perfis.");
    return;
  }

  const client = state.clients.find((item) => item.id === form.dataset.clientId);
  if (!client) return;

  const data = new FormData(form);
  client.reply = clean(data.get("reply"));
  state.replyingClientId = "";
  saveClients();
  renderAll();
  showToast("Resposta publicada no perfil.");
}

function renderClientPagination(totalPages) {
  if (!elements.clientPagination) return;

  if (totalPages <= 1) {
    elements.clientPagination.innerHTML = "";
    return;
  }

  elements.clientPagination.innerHTML = Array.from({ length: totalPages }, (_, index) => {
    const page = index + 1;
    const active = page === state.clientPage ? "is-active" : "";
    return `<button class="${active}" type="button" data-page="${page}">${page}</button>`;
  }).join("");

  elements.clientPagination.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      state.clientPage = Number(button.dataset.page) || 1;
      renderClients();
    });
  });
}

function renderEvidencePreview() {
  if (!elements.evidencePreview) return;

  if (!state.selectedEvidence.length) {
    elements.evidencePreview.innerHTML = "";
    return;
  }

  elements.evidencePreview.innerHTML = state.selectedEvidence
    .map((item, index) => `
      <figure class="evidence-item">
        <img src="${item.dataUrl}" alt="Previa de ${escapeHtml(item.name)}" />
        <button type="button" aria-label="Remover ${escapeHtml(item.name)}" data-evidence-remove="${index}">×</button>
      </figure>
    `)
    .join("");
}

function renderCases() {
  if (!elements.adminPanel || !elements.caseList) return;

  if (!state.cases.length) {
    elements.caseList.innerHTML = `<div class="empty-state">Nenhum B.O. privado cadastrado ainda.</div>`;
    return;
  }

  elements.caseList.innerHTML = state.cases
    .map((item) => {
      const evidenceItems = Array.isArray(item.evidence) ? item.evidence : [];
      const evidence = evidenceItems
        .map((image) => `<img src="${image.dataUrl}" alt="Print anexado: ${escapeHtml(image.name)}" />`)
        .join("");

      return `
        <article class="case-card">
          <header>
            <div>
              <h4>${escapeHtml(item.clientNick)} contra ${escapeHtml(item.accused || "nao informado")}</h4>
              <time>${formatDate(item.createdAt)}</time>
            </div>
            <span class="status-pill">${escapeHtml(item.category)}</span>
          </header>
          <div class="case-meta">
            <span>Contato: ${escapeHtml(item.contact || "nao informado")}</span>
            <span>Data: ${escapeHtml(item.date || "nao informada")}</span>
            <span>Local: ${escapeHtml(item.room || "nao informado")}</span>
          </div>
          <p>${escapeHtml(item.description)}</p>
          <div class="case-evidence">${evidence || "<p>Nenhum print anexado.</p>"}</div>
        </article>
      `;
    })
    .join("");
}

function renderDenunciations() {
  if (!elements.adminPanel || !elements.denunciationInbox) return;

  if (!state.denunciations.length) {
    elements.denunciationInbox.innerHTML = `<div class="empty-state">Nenhuma denuncia recebida ainda.</div>`;
    return;
  }

  elements.denunciationInbox.innerHTML = state.denunciations
    .map((item) => {
      const published = item.status === "published";
      const author = item.visibility === "publica"
        ? item.author || "Autor nao informado"
        : "Denuncia anonima";

      return `
        <article class="case-card denunciation-admin-card">
          <header>
            <div>
              <h4>${escapeHtml(item.target)} - ${escapeHtml(item.category)}</h4>
              <time>${formatDate(item.createdAt)}</time>
            </div>
            <span class="status-pill">${published ? "Publicada" : "Pendente"}</span>
          </header>
          <div class="case-meta">
            <span>${escapeHtml(author)}</span>
            <span>${escapeHtml(item.visibility)}</span>
          </div>
          <p>${escapeHtml(item.summary)}</p>
          ${item.proof ? `<p class="muted-line">Provas: ${escapeHtml(item.proof)}</p>` : ""}
          <div class="denunciation-actions">
            <button class="button ghost" type="button" data-denunciation-action="${published ? "hide" : "publish"}" data-denunciation-id="${item.id}">
              ${published ? "Ocultar" : "Publicar"}
            </button>
            <button class="button danger" type="button" data-denunciation-action="remove" data-denunciation-id="${item.id}">Remover</button>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderPublicDenunciations() {
  if (!elements.publicDenunciationList) return;

  const published = state.denunciations.filter((item) => item.status === "published");

  if (!published.length) {
    elements.publicDenunciationList.innerHTML = `
      <article class="denunciation-card tilt-card">
        <span class="slot-mark">Exemplo</span>
        <h3>Como uma denuncia vai aparecer</h3>
        <p>Quando a Levadinha publicar uma denuncia aprovada, o resumo fica aqui com categoria, alvo citado e tipo de identificacao.</p>
        <div class="case-meta">
          <span>Categoria: Golpe</span>
          <span>Tipo: anonima</span>
        </div>
      </article>
    `;
    initTiltCards();
    return;
  }

  elements.publicDenunciationList.innerHTML = published
    .map((item) => {
      const author = item.visibility === "publica"
        ? item.author || "Autor nao informado"
        : "Denuncia anonima";

      return `
        <article class="denunciation-card tilt-card">
          <span class="slot-mark">${escapeHtml(item.category)}</span>
          <h3>${escapeHtml(item.target)}</h3>
          <p>${escapeHtml(item.summary)}</p>
          <div class="case-meta">
            <span>${escapeHtml(author)}</span>
            <span>${formatDate(item.createdAt)}</span>
          </div>
        </article>
      `;
    })
    .join("");

  initTiltCards();
}

function renderPosts() {
  if (!elements.postList) return;

  if (!state.posts.length) {
    elements.postList.innerHTML = `
      <article class="post-card">
        <span class="slot-mark">Mural</span>
        <h3>Nenhuma publicacao ainda</h3>
        <p>Quando usuarios publicarem mensagens, elas vao aparecer aqui com respostas organizadas.</p>
      </article>
    `;
    return;
  }

  elements.postList.innerHTML = state.posts
    .map((post) => {
      const replies = (post.replies || [])
        .map((reply) => `
          <article class="post-reply">
            <strong>${escapeHtml(reply.author)}</strong>
            <time>${formatDate(reply.createdAt)}</time>
            <p>${escapeHtml(reply.content)}</p>
          </article>
        `)
        .join("");

      return `
        <article class="post-card">
          <header>
            <div>
              <span class="slot-mark">${escapeHtml(post.category)}</span>
              <h3>${escapeHtml(post.author)}</h3>
            </div>
            <time>${formatDate(post.createdAt)}</time>
          </header>
          <p>${escapeHtml(post.content)}</p>
          <div class="post-replies">${replies}</div>
          <form class="post-reply-form" data-post-id="${post.id}">
            <input name="reply" type="text" placeholder="Responder publicacao" required />
            <button class="button ghost" type="submit">Responder</button>
          </form>
          ${isPremiumUser() ? `<button class="button danger" type="button" data-post-action="delete" data-post-id="${post.id}">Remover</button>` : ""}
        </article>
      `;
    })
    .join("");
}

function animateNumber(element, target) {
  if (!element) return;

  const start = Number(element.textContent || 0);
  const duration = 600;
  const startedAt = performance.now();

  function tick(now) {
    const progress = Math.min((now - startedAt) / duration, 1);
    const value = Math.round(start + (target - start) * progress);
    element.textContent = value.toLocaleString("pt-BR");
    if (progress < 1) requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

function readJson(key, fallback) {
  try {
    if (window.LevadinhaStorage?.sync) {
      const value = window.LevadinhaStorage.sync.readValue(key, fallback);
      return value || fallback;
    }
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

function makeId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function saveClients() {
  writeJson(STORAGE_KEYS.clients, state.clients);
}

function saveCases() {
  writeJson(STORAGE_KEYS.cases, state.cases);
}

function saveDenunciations() {
  writeJson(STORAGE_KEYS.denunciations, state.denunciations);
}

function savePosts() {
  writeJson(STORAGE_KEYS.posts, state.posts);
}

function saveCustomContent() {
  writeJson(STORAGE_KEYS.customContent, state.customContent);
}

function saveUsers() {
  writeJson(STORAGE_KEYS.users, state.users);
}

function writeJson(key, value) {
  if (window.LevadinhaStorage?.sync) {
    window.LevadinhaStorage.sync.writeValue(key, value);
    return;
  }
  localStorage.setItem(key, JSON.stringify(value));
}

function clean(value) {
  return String(value || "").trim();
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const maxSide = 1100;
        const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.78));
      };
      image.onerror = () => resolve(reader.result);
      image.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function rgbToHex(value) {
  const match = String(value).match(/\d+(\.\d+)?/g);
  if (!match || match.length < 3) return "#171019";
  return `#${match.slice(0, 3).map((part) => {
    const hex = Math.max(0, Math.min(255, Number(part))).toString(16);
    return hex.length === 1 ? `0${hex}` : hex;
  }).join("")}`;
}

function getInitials(value) {
  return value
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => {
    elements.toast.classList.remove("show");
  }, 3200);
}

function initParticles() {
  const canvas = document.getElementById("particleCanvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const colors = ["#ff4fb3", "#ff9bd3", "#ffd36f", "#65ead5", "#ffffff"];
  const mouse = { x: -9999, y: -9999, active: false };
  const diamondImage = new Image();
  diamondImage.src = "assets/levadinha-diamante-cropped.png";
  let particles = [];
  let width = 0;
  let height = 0;
  let pixelRatio = 1;
  let lastScrollY = window.scrollY;
  let scrollPush = 0;

  function resize() {
    pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * pixelRatio);
    canvas.height = Math.floor(height * pixelRatio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    const targetCount = Math.min(58, Math.max(26, Math.floor((width * height) / 30000)));
    particles = Array.from({ length: targetCount }, () => makeParticle());
  }

  function makeParticle() {
    const isDiamond = Math.random() < 0.14;
    const angle = Math.random() * Math.PI * 2;
    const speed = isDiamond ? Math.random() * 0.085 + 0.035 : Math.random() * 0.11 + 0.045;
    return {
      type: isDiamond ? "diamond" : "spark",
      x: Math.random() * width,
      y: Math.random() * height,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      baseVx: Math.cos(angle) * speed,
      baseVy: Math.sin(angle) * speed,
      size: isDiamond ? Math.random() * 15 + 23 : Math.random() * 2.4 + 1,
      pulse: Math.random() * Math.PI * 2,
      spin: Math.random() * Math.PI * 2,
      spinSpeed: (Math.random() - 0.5) * 0.012,
      color: colors[Math.floor(Math.random() * colors.length)]
    };
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);

    for (const particle of particles) {
      const dx = particle.x - mouse.x;
      const dy = particle.y - mouse.y;
      const distance = Math.hypot(dx, dy);

      if (mouse.active && distance < 150) {
        const force = (150 - distance) / 150;
        const push = particle.type === "diamond" ? 0.045 : 0.035;
        particle.vx += (dx / Math.max(distance, 1)) * force * push;
        particle.vy += (dy / Math.max(distance, 1)) * force * push;
      }

      particle.x += particle.vx;
      particle.y += particle.vy - scrollPush;
      particle.vx += (particle.baseVx - particle.vx) * 0.014;
      particle.vy += (particle.baseVy - particle.vy) * 0.014;
      particle.pulse += particle.type === "diamond" ? 0.032 : 0.038;
      particle.spin += particle.spinSpeed;

      const margin = particle.type === "diamond" ? 44 : 24;
      if (particle.x < -margin) particle.x = width + margin;
      if (particle.x > width + margin) particle.x = -margin;
      if (particle.y < -margin) particle.y = height + margin;
      if (particle.y > height + margin) particle.y = -margin;

      if (particle.type === "diamond" && diamondImage.complete) {
        drawDiamondParticle(particle);
      } else {
        drawSparkParticle(particle);
      }
    }

    ctx.shadowBlur = 0;
    scrollPush *= 0.88;
    requestAnimationFrame(draw);
  }

  function drawSparkParticle(particle) {
    const glow = particle.size + Math.sin(particle.pulse) * 1.15;
    const alpha = 0.44 + Math.sin(particle.pulse) * 0.24;
    ctx.beginPath();
    ctx.fillStyle = hexToRgba(particle.color, alpha);
    ctx.shadowBlur = 18 + Math.sin(particle.pulse) * 8;
    ctx.shadowColor = particle.color;
    ctx.arc(particle.x, particle.y, Math.max(0.8, glow), 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.strokeStyle = hexToRgba(particle.color, alpha * 0.6);
    ctx.lineWidth = 0.8;
    ctx.moveTo(particle.x - glow * 2.2, particle.y);
    ctx.lineTo(particle.x + glow * 2.2, particle.y);
    ctx.moveTo(particle.x, particle.y - glow * 2.2);
    ctx.lineTo(particle.x, particle.y + glow * 2.2);
    ctx.stroke();
  }

  function drawDiamondParticle(particle) {
    const twinkle = 0.76 + Math.sin(particle.pulse) * 0.24;
    const size = particle.size * (0.9 + Math.sin(particle.pulse) * 0.1);
    ctx.save();
    ctx.translate(particle.x, particle.y);
    ctx.rotate(Math.sin(particle.spin) * 0.18);
    ctx.globalAlpha = twinkle;
    ctx.shadowBlur = 24 + Math.sin(particle.pulse) * 10;
    ctx.shadowColor = "#ff4fb3";
    ctx.drawImage(diamondImage, -size / 2, -size / 3, size, size * 0.66);
    ctx.restore();
  }

  window.addEventListener("resize", resize);
  window.addEventListener("pointermove", (event) => {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
    mouse.active = true;
  });
  window.addEventListener("pointerleave", () => {
    mouse.active = false;
  });
  window.addEventListener("scroll", () => {
    const delta = window.scrollY - lastScrollY;
    lastScrollY = window.scrollY;
    scrollPush += Math.max(-7, Math.min(7, delta * 0.035));
  }, { passive: true });

  resize();
  draw();
}

function hexToRgba(hex, alpha) {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
