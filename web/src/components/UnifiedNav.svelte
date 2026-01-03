<script lang="ts">
  /**
   * UnifiedNav - Top navigation bar
   *
   * Fixed navigation with:
   * - RockTune branding (logo/wordmark)
   * - Section links with active state via intersection observer
   * - Share button (global action)
   * - Hamburger menu for mobile
   */

  import { onMount } from "svelte";
  import { slide } from "svelte/transition";
  import ShareModal from "./ShareModal.svelte";

  let shareModalOpen = $state(false);
  let menuOpen = $state(false);

  interface NavLink {
    href: string;
    label: string;
    step: number;
  }

  const NAV_LINKS: NavLink[] = [
    { href: "#quick-start", label: "Presets", step: 0 },
    { href: "#hardware", label: "Hardware", step: 1 },
    { href: "#peripherals", label: "Peripherals", step: 2 },
    { href: "#optimizations", label: "Tweaks", step: 3 },
    { href: "#software", label: "Software", step: 4 },
    { href: "#generate", label: "Forge", step: 5 },
    { href: "#guide", label: "Guide", step: 6 },
  ];

  let activeStep = $state(0);

  function toggleMenu() {
    menuOpen = !menuOpen;
  }

  function closeMenu() {
    menuOpen = false;
  }

  onMount(() => {
    const sections = NAV_LINKS.map((link) => {
      const id = link.href.replace("#", "");
      return document.getElementById(id);
    }).filter(
      (section): section is HTMLElement => section instanceof HTMLElement,
    );

    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        let topSection: { index: number; top: number } | null = null;

        for (const entry of entries) {
          if (entry.isIntersecting && entry.target instanceof HTMLElement) {
            const index = sections.indexOf(entry.target);
            const top = entry.boundingClientRect.top;

            if (index !== -1 && (topSection === null || top < topSection.top)) {
              topSection = { index, top };
            }
          }
        }

        if (topSection !== null) {
          activeStep = topSection.index;
        }
      },
      {
        threshold: 0.1,
        rootMargin: "-80px 0px -20% 0px",
      },
    );

    sections.forEach((section) => observer.observe(section));

    return () => {
      sections.forEach((section) => observer.unobserve(section));
    };
  });

  function handleClick(event: MouseEvent, link: NavLink) {
    const target = document.querySelector(link.href);
    if (target) {
      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      activeStep = link.step;
      closeMenu();
    }
  }

  function handleMobileShare() {
    shareModalOpen = true;
    closeMenu();
  }
</script>

<nav
  class="unified-nav"
  class:menu-open={menuOpen}
  aria-label="Main navigation"
>
  <!-- RockTune logo/wordmark -->
  <button
    type="button"
    class="nav-brand"
    aria-label="RockTune - Back to top"
    onclick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
  >
    <svg class="brand-icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
    <span class="brand-text">RockTune</span>
  </button>

  <!-- Desktop: inline links -->
  <ul class="links links--desktop" role="list">
    {#each NAV_LINKS as link (link.step)}
      <li>
        <a
          href={link.href}
          class="nav-link"
          class:active={activeStep === link.step}
          data-step={link.step}
          onclick={(e) => handleClick(e, link)}
        >
          {link.label}
        </a>
      </li>
    {/each}
  </ul>

  <!-- Desktop: Share button -->
  <button
    type="button"
    class="btn-share btn-share--desktop"
    title="Share your build configuration"
    onclick={() => (shareModalOpen = true)}
  >
    <svg
      class="icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
    Share
  </button>

  <!-- Mobile: Hamburger toggle -->
  <button
    type="button"
    class="nav-toggle"
    aria-expanded={menuOpen}
    aria-controls="mobile-menu"
    onclick={toggleMenu}
  >
    <span class="hamburger-line"></span>
    <span class="hamburger-line"></span>
    <span class="hamburger-line"></span>
    <span class="sr-only">{menuOpen ? "Close" : "Open"} menu</span>
  </button>

  <!-- Mobile: Dropdown menu -->
  {#if menuOpen}
    <div
      class="mobile-menu"
      id="mobile-menu"
      transition:slide={{ duration: 200 }}
    >
      <ul class="mobile-links" role="list">
        {#each NAV_LINKS as link (link.step)}
          <li>
            <a
              href={link.href}
              class="mobile-link"
              class:active={activeStep === link.step}
              onclick={(e) => handleClick(e, link)}
            >
              {link.label}
            </a>
          </li>
        {/each}
      </ul>
      <hr class="mobile-divider" />
      <button type="button" class="mobile-share" onclick={handleMobileShare}>
        <svg
          class="icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
        Share Build
      </button>
      <hr class="mobile-divider" />
      <a
        href="https://github.com/thepedroferrari/rocktune/tree/{__BUILD_COMMIT__}"
        target="_blank"
        rel="noopener"
        class="mobile-github"
      >
        <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.605-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12"
          />
        </svg>
        {__BUILD_COMMIT__} · {__BUILD_DATE__}
      </a>
    </div>
  {/if}
</nav>

<ShareModal open={shareModalOpen} onclose={() => (shareModalOpen = false)} />
