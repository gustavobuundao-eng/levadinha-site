(function () {
  "use strict";

  const USERS = "levadinha.users";
  const SESSION = "levadinha.session";

  function normalizeUserId(value) {
    return String(value || "").trim().toLowerCase().replace(/\s+/g, "-");
  }

  async function register({ username, password }) {
    const id = normalizeUserId(username);
    const users = await window.LevadinhaStorage.list(USERS);
    if (users.some((user) => user.id === id)) throw new Error("USER_EXISTS");
    return window.LevadinhaStorage.create(USERS, {
      id,
      username,
      password,
      accountType: "Conta base",
      premium: false
    });
  }

  async function login({ username, password, remember = true }) {
    const id = normalizeUserId(username);
    const users = await window.LevadinhaStorage.list(USERS);
    const user = users.find((item) => item.id === id && item.password === password);
    if (!user) throw new Error("INVALID_CREDENTIALS");
    const target = remember ? localStorage : sessionStorage;
    target.setItem(SESSION, user.id);
    return user;
  }

  async function logout() {
    localStorage.removeItem(SESSION);
    sessionStorage.removeItem(SESSION);
    return true;
  }

  async function currentUser() {
    const id = localStorage.getItem(SESSION) || sessionStorage.getItem(SESSION);
    if (!id) return null;
    const users = await window.LevadinhaStorage.list(USERS);
    return users.find((user) => user.id === id) || null;
  }

  window.LevadinhaAuth = { register, login, logout, currentUser };
})();
