<script lang="ts">
  /**
   * ProfileActions - Save/Load profile buttons
   *
   * Allows users to save their current configuration to JSON
   * and load previously saved configurations.
   */

  import {
    app,
    setCpu,
    setGpu,
    setOptimizations,
    setPeripherals,
    setMonitorSoftware,
    setSelection,
    getOptimizations,
  } from '$lib/state.svelte'
  import {
    PROFILE_VERSION,
    isCpuType,
    isGpuType,
    isPeripheralType,
    isMonitorSoftwareType,
    type HardwareProfile,
    type PackageKey,
    type OptimizationKey,
  } from '$lib/types'
  import { downloadJson } from '../utils/download'

  let fileInputEl: HTMLInputElement | null = null

  interface SavedProfile {
    version: string
    created: string
    hardware: HardwareProfile
    optimizations: string[]
    software: string[]
  }

  function buildProfile(): SavedProfile {
    return {
      version: PROFILE_VERSION,
      created: new Date().toISOString(),
      hardware: {
        cpu: app.hardware.cpu,
        gpu: app.hardware.gpu,
        peripherals: Array.from(app.peripherals),
        monitorSoftware: Array.from(app.monitorSoftware),
      },
      optimizations: getOptimizations(),
      software: Array.from(app.selected),
    }
  }

  function handleSave() {
    const profile = buildProfile()
    downloadJson(profile, `rocktune-profile-${Date.now()}.json`)
  }

  async function handleLoad() {
    const file = fileInputEl?.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const profile = JSON.parse(text) as SavedProfile
      applyProfile(profile)
      // Script auto-updates reactively via generateCurrentScript()
    } catch (error) {
      console.error('[RockTune] Failed to load profile:', error)
      alert('Failed to load profile. Please check the file format.')
    } finally {
      if (fileInputEl) {
        fileInputEl.value = ''
      }
    }
  }

  function applyProfile(profile: SavedProfile): void {
    // Apply hardware
    if (profile.hardware?.cpu && isCpuType(profile.hardware.cpu)) {
      setCpu(profile.hardware.cpu)
    }
    if (profile.hardware?.gpu && isGpuType(profile.hardware.gpu)) {
      setGpu(profile.hardware.gpu)
    }

    // Apply peripherals
    const validPeripherals = (profile.hardware?.peripherals ?? []).filter(isPeripheralType)
    setPeripherals(validPeripherals)

    // Apply monitor software
    const validMonitorSoftware = (profile.hardware?.monitorSoftware ?? []).filter(
      isMonitorSoftwareType,
    )
    setMonitorSoftware(validMonitorSoftware)

    // Apply optimizations
    if (Array.isArray(profile.optimizations)) {
      setOptimizations(profile.optimizations as OptimizationKey[])
    }

    // Apply software selection
    if (Array.isArray(profile.software)) {
      const validSoftware = profile.software.filter((key) => key in app.software)
      setSelection(validSoftware as PackageKey[])
    }
  }
</script>

<div class="profile-actions">
  <button
    type="button"
    class="btn-secondary"
    title="Save your current configuration to a JSON file"
    onclick={handleSave}
  >
    <svg
      class="btn-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
    Save Profile
  </button>

  <label class="btn-secondary" title="Load a previously saved configuration">
    <svg
      class="btn-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      <line x1="12" y1="11" x2="12" y2="17" />
      <polyline points="9 14 12 11 15 14" />
    </svg>
    Load Profile
    <input
      type="file"
      accept=".json"
      bind:this={fileInputEl}
      onchange={handleLoad}
      style="display: none"
    />
  </label>
</div>

<!-- Styles are in profiles.styles.css and forge.styles.css (layer: components) -->
