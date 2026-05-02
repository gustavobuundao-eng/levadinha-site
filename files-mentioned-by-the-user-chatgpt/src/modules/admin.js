(function () {
  "use strict";

  window.LevadinhaAdmin = {
    canAccess(user) {
      return Boolean(user?.premium || user?.id === "levadinha");
    }
  };
})();
