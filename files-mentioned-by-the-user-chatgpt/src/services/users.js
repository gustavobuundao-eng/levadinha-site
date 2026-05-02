(function () {
  "use strict";

  const USERS = "levadinha.users";

  async function listUsers() {
    return window.LevadinhaStorage.list(USERS);
  }

  async function updateUser(id, patch) {
    return window.LevadinhaStorage.update(USERS, id, patch);
  }

  async function deleteUser(id) {
    return window.LevadinhaStorage.delete(USERS, id);
  }

  window.LevadinhaUsers = { listUsers, updateUser, deleteUser };
})();
