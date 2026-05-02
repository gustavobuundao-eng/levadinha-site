(function () {
  "use strict";

  const DRIVER = "local";
  const API_BASE_URL = "";
  const LATENCY_MS = 30;

  const wait = () => new Promise((resolve) => window.setTimeout(resolve, LATENCY_MS));

  function readCollection(name) {
    try {
      return JSON.parse(localStorage.getItem(name)) || [];
    } catch {
      return [];
    }
  }

  function writeCollection(name, value) {
    localStorage.setItem(name, JSON.stringify(value));
    return value;
  }

  function readValue(key, fallback = null) {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : JSON.parse(value);
    } catch {
      return fallback;
    }
  }

  function writeValue(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
    return value;
  }

  function createId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  async function request(path, options = {}) {
    if (DRIVER === "api") {
      const response = await fetch(`${API_BASE_URL}${path}`, {
        headers: { "Content-Type": "application/json", ...(options.headers || {}) },
        ...options
      });
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      return response.json();
    }

    await wait();
    return null;
  }

  async function list(collection) {
    await request(`/${collection}`);
    return readCollection(collection);
  }

  async function read(collection, id) {
    await request(`/${collection}/${id}`);
    return readCollection(collection).find((item) => item.id === id) || null;
  }

  async function create(collection, payload) {
    await request(`/${collection}`, { method: "POST", body: JSON.stringify(payload) });
    const items = readCollection(collection);
    const item = { id: payload.id || createId(), createdAt: payload.createdAt || new Date().toISOString(), ...payload };
    items.unshift(item);
    writeCollection(collection, items);
    return item;
  }

  async function update(collection, id, patch) {
    await request(`/${collection}/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
    const items = readCollection(collection);
    const index = items.findIndex((item) => item.id === id);
    if (index < 0) return null;
    items[index] = { ...items[index], ...patch, updatedAt: new Date().toISOString() };
    writeCollection(collection, items);
    return items[index];
  }

  async function remove(collection, id) {
    await request(`/${collection}/${id}`, { method: "DELETE" });
    const next = readCollection(collection).filter((item) => item.id !== id);
    writeCollection(collection, next);
    return true;
  }

  window.LevadinhaStorage = {
    driver: DRIVER,
    list,
    read,
    create,
    update,
    delete: remove,
    getValue: async (key, fallback) => {
      await wait();
      return readValue(key, fallback);
    },
    setValue: async (key, value) => {
      await wait();
      return writeValue(key, value);
    },
    sync: {
      readCollection,
      writeCollection,
      readValue,
      writeValue
    }
  };
})();
