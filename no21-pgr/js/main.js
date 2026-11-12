(() => {
  "use strict";

  document.documentElement.classList.add("js");

  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => Array.from(context.querySelectorAll(selector));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Header state & scroll progress ---------------------------------------- */

  const header = $("#siteHeader");
  const scrollProgress = $("#scrollProgress");

  const updateScrollUI = () => {
    const top = window.scrollY || document.documentElement.scrollTop;
    const max = document.documentElement.scrollHeight - window.innerHeight;

    if (header) header.classList.toggle("is-scrolled", top > 24);
    if (scrollProgress) {
      scrollProgress.style.width = `${max > 0 ? Math.min((top / max) * 100, 100) : 0}%`;
    }
  };

  window.addEventListener("scroll", updateScrollUI, { passive: true });
  window.addEventListener("resize", updateScrollUI);
  updateScrollUI();

  /* Mobile navigation ------------------------------------------------------ */

  const nav = $("#mainNav");
  const navToggle = $("#navToggle");

  const closeNav = () => {
    if (!nav || !navToggle) return;
    nav.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
  };

  if (nav && navToggle) {
    navToggle.addEventListener("click", () => {
      const isOpen = nav.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(isOpen));
    });

    nav.addEventListener("click", (event) => {
      if (event.target.closest("a")) closeNav();
    });

    document.addEventListener("click", (event) => {
      if (!nav.classList.contains("is-open")) return;
      if (nav.contains(event.target) || navToggle.contains(event.target)) return;
      closeNav();
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 980) closeNav();
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeNav();
  });

  /* Active navigation link ------------------------------------------------ */

  const navLinks = $$("a[data-nav]");
  const navTargets = navLinks
    .map((link) => document.getElementById(link.dataset.nav))
    .filter(Boolean);

  if ("IntersectionObserver" in window && navTargets.length) {
    const setActiveNav = (id) => {
      navLinks.forEach((link) => {
        const active = link.dataset.nav === id;
        link.classList.toggle("is-active", active);
        if (active) link.setAttribute("aria-current", "true");
        else link.removeAttribute("aria-current");
      });
    };

    const navObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visible.length) setActiveNav(visible[0].target.id);
      },
      { rootMargin: "-32% 0px -56% 0px", threshold: 0 }
    );

    navTargets.forEach((target) => navObserver.observe(target));
  }

  /* Frame tabs ------------------------------------------------------------ */

  const tabs = $$(".frame-tab");
  const panels = $$(".frame-panel");

  const activateTab = (tab) => {
    if (!tab) return;

    tabs.forEach((item) => {
      const active = item === tab;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-selected", String(active));
      item.tabIndex = active ? 0 : -1;
    });

    panels.forEach((panel) => {
      const active = panel.id === tab.dataset.target;
      panel.classList.toggle("is-active", active);
      panel.hidden = !active;
      if (active) {
        $$(".reveal", panel).forEach((element) => element.classList.add("is-visible"));
      }
    });
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => activateTab(tab));

    tab.addEventListener("keydown", (event) => {
      let nextIndex = null;

      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        nextIndex = (index + 1) % tabs.length;
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        nextIndex = (index - 1 + tabs.length) % tabs.length;
      } else if (event.key === "Home") {
        nextIndex = 0;
      } else if (event.key === "End") {
        nextIndex = tabs.length - 1;
      }

      if (nextIndex !== null) {
        event.preventDefault();
        activateTab(tabs[nextIndex]);
        tabs[nextIndex].focus();
      }
    });
  });

  /* Scroll reveal --------------------------------------------------------- */

  const revealElements = $$(".reveal");

  if ("IntersectionObserver" in window && !reduceMotion) {
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          const delay = Number.parseInt(entry.target.dataset.delay || "0", 10);
          if (delay > 0) entry.target.style.transitionDelay = `${delay}ms`;

          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
    );

    revealElements.forEach((element) => revealObserver.observe(element));
  } else {
    revealElements.forEach((element) => element.classList.add("is-visible"));
  }

  /* Skin filters ---------------------------------------------------------- */

  const filterButtons = $$(".filter-btn");
  const skinCards = $$(".skin-card");

  const applyFilter = (filter) => {
    filterButtons.forEach((button) => {
      const active = button.dataset.filter === filter;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    skinCards.forEach((card) => {
      const visible = filter === "all" || card.dataset.frame === filter;
      card.classList.toggle("is-hidden", !visible);
    });
  };

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => applyFilter(button.dataset.filter));
  });

  /* Lightbox -------------------------------------------------------------- */

  const lightbox = $("#lightbox");
  const lightboxImage = $("#lbImage");
  const lightboxTitle = $("#lbTitle");
  const lightboxMeta = $("#lbMeta");
  const lightboxDesc = $("#lbDesc");
  const lightboxCounter = $("#lbCounter");
  const lightboxPrev = $("#lbPrev");
  const lightboxNext = $("#lbNext");
  const lightboxClose = $(".lightbox-close", lightbox || document);

  let lightboxItems = [];
  let lightboxIndex = 0;
  let lastTrigger = null;
  let previousFocus = null;

  const isItemVisible = (item) => {
    const card = item.closest(".skin-card");
    if (card && card.classList.contains("is-hidden")) return false;
    return item.getClientRects().length > 0;
  };

  const getDescription = (item) => {
    const card = item.closest(".skin-card");
    const custom = card ? card.querySelector(".skin-desc") : null;
    if (custom && custom.textContent.trim()) return custom.textContent.trim();
    return "Arsip visual Construct No. 21 — dokumentasi resmi CERBERUS.";
  };

  const renderLightbox = () => {
    const item = lightboxItems[lightboxIndex];
    if (!item) return;

    const sourceImage = item.querySelector("img");
    const total = lightboxItems.length;

    lightboxImage.src = item.dataset.full || sourceImage?.src || "";
    lightboxImage.alt = sourceImage?.alt || item.dataset.title || "Arsip visual No. 21";
    lightboxTitle.textContent = item.dataset.title || "No. 21";
    lightboxMeta.textContent = item.dataset.meta || "CERBERUS ARCHIVE";
    lightboxDesc.textContent = getDescription(item);
    lightboxCounter.textContent = `${String(lightboxIndex + 1).padStart(2, "0")} / ${String(
      total
    ).padStart(2, "0")}`;

    const single = total <= 1;
    lightboxPrev.disabled = single;
    lightboxNext.disabled = single;

    [lightboxIndex - 1, lightboxIndex + 1].forEach((index) => {
      const neighbor = lightboxItems[(index + total) % total];
      if (neighbor?.dataset.full) {
        const preload = new Image();
        preload.src = neighbor.dataset.full;
      }
    });
  };

  const openLightbox = (trigger) => {
    if (!lightbox) return;

    const group = trigger.dataset.lightboxGroup;
    lightboxItems = $$('[data-lightbox-group]').filter(
      (item) => item.dataset.lightboxGroup === group && isItemVisible(item)
    );

    if (!lightboxItems.length) return;

    lightboxIndex = Math.max(lightboxItems.indexOf(trigger), 0);
    lastTrigger = trigger;
    previousFocus = document.activeElement;

    renderLightbox();
    lightbox.classList.add("is-open");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.classList.add("no-scroll");
    lightboxClose?.focus({ preventScroll: true });
  };

  const closeLightbox = () => {
    if (!lightbox || !lightbox.classList.contains("is-open")) return;

    lightbox.classList.remove("is-open");
    lightbox.setAttribute("aria-hidden", "true");
    document.body.classList.remove("no-scroll");

    const focusTarget = lastTrigger || previousFocus;
    if (focusTarget && typeof focusTarget.focus === "function") {
      focusTarget.focus({ preventScroll: true });
    }
  };

  const stepLightbox = (direction) => {
    if (lightboxItems.length <= 1) return;
    lightboxIndex = (lightboxIndex + direction + lightboxItems.length) % lightboxItems.length;
    renderLightbox();
  };

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-lightbox-group]");
    if (trigger) {
      event.preventDefault();
      openLightbox(trigger);
      return;
    }

    if (event.target.closest("[data-close]")) {
      closeLightbox();
    }
  });

  lightboxPrev?.addEventListener("click", () => stepLightbox(-1));
  lightboxNext?.addEventListener("click", () => stepLightbox(1));

  document.addEventListener("keydown", (event) => {
    if (!lightbox || !lightbox.classList.contains("is-open")) return;

    if (event.key === "Escape") {
      event.preventDefault();
      closeLightbox();
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      stepLightbox(-1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      stepLightbox(1);
    } else if (event.key === "Tab") {
      const focusable = $$(
        'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
        lightbox
      );
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  /* Footer year ----------------------------------------------------------- */

  const year = $("#year");
  if (year) year.textContent = String(new Date().getFullYear());
})();
