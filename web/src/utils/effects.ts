// Visual effects: cursor glow, scroll animations, ripple effect

export function setupCursorGlow(): void {
  const glow = document.querySelector('.cursor-glow') as HTMLElement | null
  if (!glow) return

  let targetX = 0
  let targetY = 0
  let currentX = 0
  let currentY = 0

  document.addEventListener('mousemove', (e) => {
    targetX = e.clientX
    targetY = e.clientY
  })

  function animate(): void {
    const ease = 0.08
    currentX += (targetX - currentX) * ease
    currentY += (targetY - currentY) * ease
    glow.style.left = `${currentX}px`
    glow.style.top = `${currentY}px`
    requestAnimationFrame(animate)
  }
  animate()
}

export function setupScrollAnimations(): void {
  const sections = document.querySelectorAll('.step')
  if (!sections.length) return

  sections.forEach((section, idx) => {
    ;(section as HTMLElement).style.setProperty('--stagger', String(idx))
  })

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible')
          observer.unobserve(entry.target)
        }
      })
    },
    { threshold: 0.1, rootMargin: '-30px' },
  )

  for (const section of sections) {
    observer.observe(section)
  }
}

export function createRipple(e: MouseEvent, card: HTMLElement): void {
  const ripple = document.createElement('span')
  ripple.className = 'ripple'
  const rect = card.getBoundingClientRect()
  const size = Math.max(rect.width, rect.height)
  ripple.style.width = `${size}px`
  ripple.style.height = `${size}px`
  ripple.style.left = `${e.clientX - rect.left - size / 2}px`
  ripple.style.top = `${e.clientY - rect.top - size / 2}px`
  const front = card.querySelector('.software-card-front')
  if (front) {
    front.appendChild(ripple)
    ripple.addEventListener('animationend', () => ripple.remove())
  }
}

export function setupImageFallbacks(categoryIcons: Record<string, string>): void {
  document.addEventListener(
    'error',
    (e) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'IMG' && target.closest('.software-card')) {
        const img = target as HTMLImageElement
        const customFallback = img.dataset.fallback
        const category = img.dataset.category || 'default'
        const fallbackIcon = customFallback || categoryIcons[category] || categoryIcons.default
        img.style.display = 'none'
        if (img.parentElement) {
          img.parentElement.innerHTML = fallbackIcon
        }
      }
    },
    true,
  )
}
