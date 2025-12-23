/**
 * Hero Cube - 3D scrolling text animation for the header
 * Inspired by CodePen "Living Words" by Alexandre Vacassin
 */

const heroText = `<p>If you can <span>optimize</span> your rig when all about you are <span>lagging</span> and <span>stuttering</span> behind; If you can <span>trust</span> your frames when benchmarks <span>doubt</span> you, but make <span>allowance</span> for their testing too; If you can <span>wait</span> and not be tired by waiting, or being <span>throttled</span>, don't give way to <span>heat</span>; If you can <span>dream</span> of builds and not make dreams your <span>master</span>; If you can <span>think</span> and not make thoughts your <span>aim</span>; If you can meet with <span>victory</span> and <span>defeat</span> and treat those two <span>impostors</span> just the same; If you can bear to hear the <span>truth</span> you've benchmarked <span>twisted</span> by fools to make a <span>trap</span> for noobs; If you can <span>forge</span> your loadout and <span>risk</span> it on one turn of ranked and <span>clutch</span>, and start again at your <span>beginnings</span> and never breathe a word about your <span>loss</span>; Yours is the <span>system</span> and everything that's in it, and which is more you'll be a <span>gamer</span>, my friend!</p>`

function insertHeroText(): void {
  const textDivs = document.querySelectorAll<HTMLDivElement>('.hero-cube-wrapper .text')
  textDivs.forEach((div) => {
    div.innerHTML = heroText
  })
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
}

export function setupHeroCube(): void {
  insertHeroText()
  adjustHeroCubeSize()
  window.addEventListener('resize', adjustHeroCubeSize)
}
