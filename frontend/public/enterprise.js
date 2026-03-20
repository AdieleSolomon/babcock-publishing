document.addEventListener("DOMContentLoaded", () => {
  const toggleButton = document.querySelector("[data-press-toggle]");
  const mobileMenu = document.querySelector("[data-press-menu]");
  const overlay = document.querySelector("[data-press-overlay]");
  const normalizePage = (value) => {
    if (!value) return "index";

    const [pathOnly] = value.split(/[?#]/);
    const trimmedPath = pathOnly.replace(/^\/+|\/+$/g, "");
    const pageName = trimmedPath.split("/").pop() || "index";

    return pageName.replace(/\.html$/i, "") || "index";
  };

  function closeMenu() {
    if (mobileMenu) mobileMenu.classList.remove("is-open");
    if (overlay) overlay.classList.remove("is-open");
    document.body.style.overflow = "";
  }

  function openMenu() {
    if (mobileMenu) mobileMenu.classList.add("is-open");
    if (overlay) overlay.classList.add("is-open");
    document.body.style.overflow = "hidden";
  }

  if (toggleButton && mobileMenu && overlay) {
    toggleButton.addEventListener("click", () => {
      if (mobileMenu.classList.contains("is-open")) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    overlay.addEventListener("click", closeMenu);

    mobileMenu.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", closeMenu);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeMenu();
      }
    });
  }

  const currentPath = normalizePage(window.location.pathname);
  document.querySelectorAll("[data-page-link]").forEach((link) => {
    const href = link.getAttribute("href");
    if (!href) return;

    if (normalizePage(href) === currentPath) {
      link.classList.add("is-active");
      link.setAttribute("aria-current", "page");
    }
  });
});
