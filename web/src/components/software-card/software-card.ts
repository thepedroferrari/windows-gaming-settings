import { store } from '../../state'
import type { Category, PackageKey, SoftwarePackage } from '../../types'
import { CATEGORY_SVG_ICONS, SIMPLE_ICONS_CDN } from '../../types'
import { sanitize } from '../../utils/dom'
import { createRipple } from '../../utils/effects'

const DESCRIPTION_MAX_LENGTH = 60 as const
const MAGNETIC_FACTOR = 0.05 as const

const ARIA_LABELS = {
  selectedAction: 'remove from',
  unselectedAction: 'add to',
} as const

interface CardConfig {
  readonly key: PackageKey
  readonly pkg: Readonly<SoftwarePackage>
  readonly delay: number
  readonly isSelected: boolean
}

type LogoType = 'sprite' | 'cdn' | 'emoji' | 'fallback'

interface LogoConfig {
  readonly type: LogoType
  readonly html: string
}

function buildCardConfig(
  key: PackageKey,
  pkg: Readonly<SoftwarePackage>,
  delay: number,
): CardConfig {
  return {
    key,
    pkg,
    delay,
    isSelected: store.isSelected(key),
  } as const
}

export function createCard(
  key: PackageKey,
  pkg: Readonly<SoftwarePackage>,
  delay: number,
): HTMLDivElement {
  const config = buildCardConfig(key, pkg, delay)
  const card = document.createElement('div')

  setupCardElement(card, config)
  setupCardAccessibility(card, config)
  card.innerHTML = buildCardHTML(config)
  attachCardEventListeners(card, key)

  return card
}

function setupCardElement(card: HTMLDivElement, config: CardConfig): void {
  card.className = config.isSelected ? 'software-card entering selected' : 'software-card entering'
  card.dataset.key = config.key
  card.dataset.category = config.pkg.category
  card.style.animationDelay = `${config.delay}ms`
}

function setupCardAccessibility(card: HTMLDivElement, config: CardConfig): void {
  const { pkg, isSelected } = config
  const action = isSelected ? ARIA_LABELS.selectedAction : ARIA_LABELS.unselectedAction

  card.setAttribute('tabindex', '0')
  card.setAttribute('role', 'switch')
  card.setAttribute('aria-checked', String(isSelected))
  card.setAttribute(
    'aria-label',
    `${pkg.name}: ${pkg.desc ?? pkg.category}. Press Enter or Space to ${action} selection.`,
  )
}

function determineLogoType(pkg: Readonly<SoftwarePackage>): LogoType {
  if (pkg.icon) {
    return pkg.icon.endsWith('.svg') || pkg.icon.startsWith('icons/') ? 'sprite' : 'cdn'
  }
  return pkg.emoji ? 'emoji' : 'fallback'
}

function buildLogoHTML(pkg: Readonly<SoftwarePackage>): LogoConfig {
  const safeName = sanitize(pkg.name)
  const type = determineLogoType(pkg)

  switch (type) {
    case 'sprite': {
      const iconId = sanitize(pkg.icon?.replace('icons/', '').replace('.svg', ''))
      return {
        type,
        html: `<svg class="sprite-icon" role="img" aria-label="${safeName} icon"><use href="icons/sprite.svg#${iconId}"></use></svg>`,
      }
    }
    case 'cdn': {
      const safeIcon = sanitize(pkg.icon ?? '')
      const safeCategory = sanitize(pkg.category)
      const safeEmoji = sanitize(pkg.emoji ?? '')
      return {
        type,
        html: `<img src="${SIMPLE_ICONS_CDN}/${safeIcon}/white" alt="${safeName} logo" loading="lazy" data-category="${safeCategory}" data-fallback="${safeEmoji}">`,
      }
    }
    case 'emoji': {
      const safeEmoji = sanitize(pkg.emoji ?? '')
      return {
        type,
        html: `<span class="emoji-icon" role="img" aria-label="${safeName} icon">${safeEmoji}</span>`,
      }
    }
    default: {
      const fallbackIcon = getCategoryIcon(pkg.category)
      return { type, html: fallbackIcon }
    }
  }
}

function getCategoryIcon(category: Category): string {
  return CATEGORY_SVG_ICONS[category] ?? CATEGORY_SVG_ICONS.default
}

function buildCardHTML(config: CardConfig): string {
  const { pkg, isSelected } = config
  const logo = buildLogoHTML(pkg)

  const safeName = sanitize(pkg.name)
  const safeCategory = sanitize(pkg.category)
  const descText = pkg.desc ?? 'No description available.'
  const safeDesc = sanitize(descText)
  const shortDesc =
    descText.length > DESCRIPTION_MAX_LENGTH
      ? sanitize(`${descText.slice(0, DESCRIPTION_MAX_LENGTH - 3)}...`)
      : safeDesc

  const actionText = isSelected ? '✓ Selected' : 'Click to add'

  return `
    <div class="software-card-inner">
      <div class="software-card-front">
        <div class="logo">${logo.html}</div>
        <span class="name">${safeName}</span>
        <span class="list-desc">${shortDesc}</span>
        <span class="list-category">${safeCategory}</span>
      </div>
      <div class="software-card-back">
        <span class="back-name">${safeName}</span>
        <span class="back-desc">${safeDesc}</span>
        <span class="back-category">${safeCategory}</span>
        <span class="back-action">${actionText}</span>
      </div>
    </div>
  `
}

function attachCardEventListeners(card: HTMLDivElement, key: PackageKey): void {
  card.addEventListener('click', (e) => {
    toggleCardSelection(key, card)
    createRipple(e, card)
  })

  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      toggleCardSelection(key, card)
    }
  })

  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect()
    const magneticX = (e.clientX - rect.left - rect.width / 2) * MAGNETIC_FACTOR
    const magneticY = (e.clientY - rect.top - rect.height / 2) * MAGNETIC_FACTOR
    card.style.transform = `translate(${magneticX}px, ${magneticY}px)`

    const lightX = ((e.clientX - rect.left) / rect.width) * 100
    const lightY = ((e.clientY - rect.top) / rect.height) * 100
    card.style.setProperty('--light-x', `${lightX}%`)
    card.style.setProperty('--light-y', `${lightY}%`)
  })

  card.addEventListener('mouseleave', () => {
    card.style.transform = ''
    card.style.setProperty('--light-x', '50%')
    card.style.setProperty('--light-y', '50%')
  })

  card.addEventListener('animationend', () => {
    card.classList.remove('entering')
  })
}

export function toggleCardSelection(key: PackageKey, card: HTMLElement): void {
  const isNowSelected = store.toggleSoftware(key)
  updateCardState(card, key, isNowSelected)
  document.dispatchEvent(new CustomEvent('software-selection-changed'))
}

export function updateCardState(card: HTMLElement, key: PackageKey, isSelected: boolean): void {
  const pkg = store.getPackage(key)
  const pkgName = pkg?.name ?? key
  const pkgDesc = pkg?.desc ?? pkg?.category ?? ''
  const action = isSelected ? ARIA_LABELS.selectedAction : ARIA_LABELS.unselectedAction

  card.classList.toggle('selected', isSelected)
  card.setAttribute('aria-checked', String(isSelected))
  card.setAttribute(
    'aria-label',
    `${pkgName}: ${pkgDesc}. Press Enter or Space to ${action} selection.`,
  )

  const actionBtn = card.querySelector('.back-action')
  if (actionBtn) {
    actionBtn.textContent = isSelected ? '✓ Selected' : 'Click to add'
  }
}
