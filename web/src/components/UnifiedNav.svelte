<script lang="ts">
  /**
   * UnifiedNav - Top navigation bar
   *
   * Fixed navigation with:
   * - Status indicator
   * - Section links with active state via intersection observer
   * - GitHub link
   */

  import { onMount } from 'svelte'

  interface NavLink {
    href: string
    label: string
    step: number
  }

  const NAV_LINKS: NavLink[] = [
    { href: '#quick-start', label: 'Presets', step: 0 },
    { href: '#hardware', label: 'Hardware', step: 1 },
    { href: '#peripherals', label: 'Peripherals', step: 2 },
    { href: '#optimizations', label: 'Tweaks', step: 3 },
    { href: '#software', label: 'Software', step: 4 },
    { href: '#generate', label: 'Forge', step: 5 },
  ]

  let activeStep = $state(0)

  onMount(() => {
    // Set up intersection observer for active section tracking
    const sections = NAV_LINKS.map((link) => {
      const id = link.href.replace('#', '')
      return document.getElementById(id)
    }).filter((section): section is HTMLElement => section instanceof HTMLElement)

    if (sections.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.target instanceof HTMLElement) {
            const index = sections.indexOf(entry.target)
            if (index !== -1) {
              activeStep = index
            }
          }
        }
      },
      {
        threshold: 0.3,
        rootMargin: '-80px 0px -50% 0px',
      },
    )

    sections.forEach((section) => observer.observe(section))

    return () => {
      sections.forEach((section) => observer.unobserve(section))
    }
  })

  function handleClick(event: MouseEvent, link: NavLink) {
    // Smooth scroll to section
    const target = document.querySelector(link.href)
    if (target) {
      event.preventDefault()
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
      activeStep = link.step
    }
  }
</script>

<nav class="unified-nav" aria-label="Main navigation">
  <div class="status">
    <span class="dot"></span>
    <span class="label">ONLINE</span>
  </div>

  <div class="links">
    {#each NAV_LINKS as link (link.step)}
      <a
        href={link.href}
        class="nav-link"
        class:active={activeStep === link.step}
        data-step={link.step}
        onclick={(e) => handleClick(e, link)}
      >
        {link.label}
      </a>
    {/each}
  </div>

  <div class="github">
    <a
      href="https://github.com/thepedroferrari/rocktune"
      target="_blank"
      rel="noopener"
      class="badge"
    >
      <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
        <path
          d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.605-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12"
        />
      </svg>
      RCK-TUNE-V1
    </a>
  </div>
</nav>

<!-- Styles are in unified-nav.styles.css (layer: components) -->
