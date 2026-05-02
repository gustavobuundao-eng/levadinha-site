(function () {
  "use strict";

  const CASES = "levadinha.cases";

  async function submitCase(payload) {
    return window.LevadinhaStorage.create(CASES, {
      ...payload,
      status: payload.status || "private"
    });
  }

  async function listCases() {
    return window.LevadinhaStorage.list(CASES);
  }

  async function deleteCase(id) {
    return window.LevadinhaStorage.delete(CASES, id);
  }

  window.LevadinhaCases = { submitCase, listCases, deleteCase };
})();
