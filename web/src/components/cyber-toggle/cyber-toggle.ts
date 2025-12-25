import './cyber-toggle.styles.css'

class CyberToggle {
  private rows: SVGGElement[]
  private animationOrder: number[]

  constructor(input: HTMLInputElement) {
    const label = input.nextElementSibling as HTMLLabelElement
    const track = label?.querySelector('.cyber-toggle-track')
    if (!track) return

    this.rows = [...track.querySelectorAll('.pixel-row')] as SVGGElement[]
    this.animationOrder = this.createRandomOrder(this.rows.length)

    input.addEventListener('change', () => this.animate(input.checked))
  }

  private createRandomOrder(length: number): number[] {
    const arr = Array.from({ length }, (_, i) => i)
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
  }

  private animate(checked: boolean) {
    const translateX = checked ? 32 : 0

    this.animationOrder.forEach((rowIndex, orderIndex) => {
      const row = this.rows[rowIndex]
      if (!row) return

      setTimeout(() => {
        row.style.transform = `translateX(${translateX}px)`
      }, orderIndex * 12)
    })
  }
}

export function initCyberToggle(): void {
  const toggles = document.querySelectorAll<HTMLInputElement>('.cyber-toggle-input')
  toggles.forEach((input) => {
    new CyberToggle(input)
  })
}
