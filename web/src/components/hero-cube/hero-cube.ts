import type { CleanupController } from '../../utils/lifecycle'

interface HeroTextPart {
  text: string
  highlighted: boolean
}

function parseHeroText(text: string): HeroTextPart[] {
  const parts: HeroTextPart[] = []
  const regex = /\|([^|]+)\|/g
  let lastIndex = 0

  for (const match of text.matchAll(regex)) {
    if (match.index > lastIndex) {
      parts.push({ text: text.slice(lastIndex, match.index), highlighted: false })
    }
    parts.push({ text: match[1], highlighted: true })
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex), highlighted: false })
  }

  return parts
}

const heroTexts: HeroTextPart[][] = [
  parseHeroText(
    "If you can |hold| your aim when the lobby is |howling| and the meter is |red|; If you can |breathe| through the dip when the city loads in and your frames |fall| like rain; If you can |refuse| the excuse and instead |listen| to the machine; If you can |tune| the fans, |trim| the bloat, |unlock| the scheduler, and |cool| what pride would overheat; If you can |trust| the process when benchmarks |mock| you, yet still |measure| true; If you can |walk| the steady path of |latency| and |discipline|, not chasing miracles, only |margins|; If you can |tinker| as you please—your rig, your rules—without becoming a |servant| to settings; If you can meet |victory| and |defeat| and greet them both as passing |frames|; If you can |enter| the final round with the same calm you had at boot, and when the moment comes your screen stays |smooth|, your input stays |true|, and your crosshair arrives a heartbeat |first|; Yours is the |hardware|, the |silence|, and the |win| earned by clarity— and you'll be the |player|, my friend.",
  ),
  parseHeroText(
    "I remember when your rig would |stutter| at the edge of a fight—audio |tearing|, camera |dragging|, the world a half-second late; And I remember you did not |rage|—you |opened| the case like a craftsman, and spoke to the machine in |numbers|; You |cleared| what did not belong, you |balanced| what ran too loud, you |cooled| what ran too proud; You |measured| the dips, |watched| the spikes, and |shaved| the weight from every needless task; Not for vanity— for |control|; Then the match came: late circle, last push, the old hitch waiting to |betray| you—yet the screen stayed |steady|; Your shot landed because the frame arrived; your dodge worked because the input did; And in that quiet margin between |lag| and |flow|, you found the |win|; The computer is only |hardware|, but your hands make it a |weapon|—tune it how you please, and let the frames tell the truth.",
  ),
  parseHeroText(
    "When frames |drop|, most players blame the fight; You chose the harder path: |understand| the machine; You |trim| the noise, |cool| the heat, |prioritize| what matters, and |measure| without ego; You do not chase magic—only |consistency|; And when the round turns cruel, you are not |surprised|; Your screen stays |smooth|, your input stays |true|, your timing stays |calm|; The win is not luck—it's the sum of small |optimizations| made with patience; This is your |rig|, your |will|, your |frames|; Tinker as you please.",
  ),
  parseHeroText(
    "If you can |optimize| your rig when all about you are |lagging| and |stuttering| behind; If you can |trust| your frames when benchmarks |doubt| you, but make |allowance| for their testing too; If you can |wait| and not be tired by waiting, or being |throttled|, don't give way to |heat|; If you can |dream| of builds and not make dreams your |master|; If you can |think| and not make thoughts your |aim|; If you can meet with |victory| and |defeat| and treat those two |impostors| just the same; If you can bear to hear the |truth| you've benchmarked |twisted| by fools to make a |trap| for noobs; If you can |forge| your loadout and |risk| it on one turn of ranked and |clutch|, and start again at your |beginnings| and never breathe a word about your |loss|; Yours is the |system| and everything that's in it, and which is more you'll be a |gamer|, my friend!",
  ),
]

function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

let shuffledTexts: HeroTextPart[][] = []
let currentTextIndex = 0

interface TextContainer {
  p: HTMLParagraphElement
  nodes: Array<Text | HTMLSpanElement>
}

const textContainers: Map<HTMLDivElement, TextContainer> = new Map()

function buildTextElements(container: HTMLDivElement, parts: HeroTextPart[]): TextContainer {
  const p = document.createElement('p')
  const nodes: Array<Text | HTMLSpanElement> = []

  for (const part of parts) {
    if (part.highlighted) {
      const span = document.createElement('span')
      span.textContent = part.text
      p.appendChild(span)
      nodes.push(span)
    } else {
      const textNode = document.createTextNode(part.text)
      p.appendChild(textNode)
      nodes.push(textNode)
    }
  }

  container.innerHTML = ''
  container.appendChild(p)
  return { p, nodes }
}

function updateTextContent(container: HTMLDivElement, parts: HeroTextPart[]): void {
  const existing = textContainers.get(container)

  if (!existing || existing.nodes.length !== parts.length) {
    const newContainer = buildTextElements(container, parts)
    textContainers.set(container, newContainer)
    return
  }

  for (let i = 0; i < parts.length; i++) {
    const node = existing.nodes[i]
    const part = parts[i]

    if (node.textContent !== part.text) {
      node.textContent = part.text
    }
  }
}

function insertHeroText(): void {
  const textDivs = document.querySelectorAll<HTMLDivElement>('.hero-cube-wrapper .text')
  textDivs.forEach((div) => {
    updateTextContent(div, shuffledTexts[currentTextIndex])
  })
}

let heroStyleSheet: CSSStyleSheet | null = null

function updateHeroKeyframes(): void {
  const wrapper = document.querySelector<HTMLDivElement>('.hero-cube-wrapper')
  if (!wrapper) return

  const styles = getComputedStyle(wrapper)
  const cubeWidth = parseFloat(styles.getPropertyValue('--cube-width')) || 900
  const cubeHalf = cubeWidth / 2

  const faceOffset = cubeWidth * 1.72

  const leftStart = cubeHalf
  const backStart = leftStart - faceOffset
  const rightStart = backStart - faceOffset

  const scrollDistance = 60000
  const leftEnd = leftStart - scrollDistance
  const backEnd = backStart - scrollDistance
  const rightEnd = rightStart - scrollDistance

  if (!heroStyleSheet) {
    const style = document.createElement('style')
    style.id = 'hero-dynamic-keyframes'
    document.head.appendChild(style)
    heroStyleSheet = style.sheet
  }

  if (heroStyleSheet) {
    while (heroStyleSheet.cssRules.length > 0) {
      heroStyleSheet.deleteRule(0)
    }

    heroStyleSheet.insertRule(`
      @keyframes hero-left {
        0% { margin-left: ${leftStart}px; }
        100% { margin-left: ${leftEnd}px; }
      }
    `)
    heroStyleSheet.insertRule(`
      @keyframes hero-back {
        0% { margin-left: ${backStart}px; }
        100% { margin-left: ${backEnd}px; }
      }
    `)
    heroStyleSheet.insertRule(`
      @keyframes hero-right {
        0% { margin-left: ${rightStart}px; }
        100% { margin-left: ${rightEnd}px; }
      }
    `)
  }
}

function adjustHeroCubeSize(): void {
  const container = document.querySelector<HTMLDivElement>('.hero-cube-container')
  const reflect = document.querySelector<HTMLDivElement>('.hero-cube-reflect')
  if (!container) return

  const viewportWidth = window.innerWidth
  const baseWidth = 1100
  if (viewportWidth >= baseWidth) {
    container.style.transform = ''
    if (reflect) reflect.style.transform = 'translateX(-50%)'
  }

  updateHeroKeyframes()
}

function rotateHeroText(controller?: CleanupController): void {
  if (controller?.signal.aborted) return

  currentTextIndex = (currentTextIndex + 1) % shuffledTexts.length
  const textDivs = document.querySelectorAll<HTMLDivElement>('.hero-cube-wrapper .text')
  textDivs.forEach((div) => {
    div.classList.add('text-hidden')
    const timeoutId = setTimeout(() => {
      if (controller?.signal.aborted) return
      updateTextContent(div, shuffledTexts[currentTextIndex])
      div.classList.remove('text-hidden')
    }, 400)
    controller?.addTimeout(timeoutId)
  })
}

export function setupHeroCube(controller?: CleanupController): void {
  shuffledTexts = shuffle(heroTexts)
  insertHeroText()
  updateHeroKeyframes()
  adjustHeroCubeSize()

  window.addEventListener('resize', adjustHeroCubeSize, { signal: controller?.signal })

  const intervalId = setInterval(() => rotateHeroText(controller), 20000)
  controller?.addInterval(intervalId)

  controller?.onCleanup(() => {
    const styleEl = document.getElementById('hero-dynamic-keyframes')
    if (styleEl) {
      styleEl.remove()
      heroStyleSheet = null
    }
    textContainers.clear()
  })
}
