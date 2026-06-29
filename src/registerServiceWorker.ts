if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => registration.update())
      .catch(() => {
        // The app should still run normally if service worker registration fails.
      });
  });
}
