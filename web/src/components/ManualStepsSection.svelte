<script lang="ts">
  /**
   * ManualStepsSection - Persona-aware manual steps checklist
   *
   * Displays settings that cannot be scripted but are essential
   * for optimal gaming performance. Filtered by:
   * - Selected persona (Gamer, Pro Gamer, Streamer, Benchmarker)
   * - Hardware (NVIDIA vs AMD GPU)
   */

  import { app } from "$lib/state.svelte";
  import {
    getFilteredSectionGroups,
    countTotalItems,
    type SectionGroup,
    type ManualStepSection,
    type ManualStepItem,
    type SettingItem,
    type SoftwareSettingItem,
    type BrowserSettingItem,
    type RgbSettingItem,
    type PreflightCheck,
    type VideoResource,
  } from "$lib/manual-steps";

  /**
   * Get YouTube thumbnail URL from video ID
   * Using mqdefault (320x180) for good quality without being too large
   */
  function getYouTubeThumbnail(videoId: string): string {
    return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
  }

  /**
   * Get YouTube video URL
   */
  function getYouTubeUrl(videoId: string): string {
    return `https://www.youtube.com/watch?v=${videoId}`;
  }

  // Track which groups are expanded
  let expandedGroups = $state<Set<string>>(new Set(["windows", "preflight"]));

  // Get filtered sections based on current persona and GPU
  let filteredGroups = $derived.by(() => {
    const persona = app.activePreset ?? "gamer";
    const gpu = app.hardware.gpu;
    return getFilteredSectionGroups(persona, gpu);
  });

  // Count total items
  let totalItems = $derived.by(() => {
    const persona = app.activePreset ?? "gamer";
    const gpu = app.hardware.gpu;
    return countTotalItems(persona, gpu);
  });

  function toggleGroup(groupId: string) {
    const next = new Set(expandedGroups);
    if (next.has(groupId)) {
      next.delete(groupId);
    } else {
      next.add(groupId);
    }
    expandedGroups = next;
  }

  function expandAll() {
    expandedGroups = new Set(filteredGroups.map((g) => g.id));
  }

  function collapseAll() {
    expandedGroups = new Set();
  }

  // Type guards for rendering
  function isManualStepItem(
    item: ManualStepItem | SettingItem | SoftwareSettingItem | BrowserSettingItem | RgbSettingItem | PreflightCheck
  ): item is ManualStepItem {
    return "step" in item && "check" in item;
  }

  function isSettingItem(
    item: ManualStepItem | SettingItem | SoftwareSettingItem | BrowserSettingItem | RgbSettingItem | PreflightCheck
  ): item is SettingItem {
    return "setting" in item && "value" in item && !("path" in item) && !("browser" in item) && !("software" in item);
  }

  function isSoftwareSettingItem(
    item: ManualStepItem | SettingItem | SoftwareSettingItem | BrowserSettingItem | RgbSettingItem | PreflightCheck
  ): item is SoftwareSettingItem {
    return "path" in item && "value" in item && !("browser" in item);
  }

  function isBrowserSettingItem(
    item: ManualStepItem | SettingItem | SoftwareSettingItem | BrowserSettingItem | RgbSettingItem | PreflightCheck
  ): item is BrowserSettingItem {
    return "browser" in item && "setting" in item;
  }

  function isRgbSettingItem(
    item: ManualStepItem | SettingItem | SoftwareSettingItem | BrowserSettingItem | RgbSettingItem | PreflightCheck
  ): item is RgbSettingItem {
    return "software" in item && "action" in item;
  }

  function isPreflightCheck(
    item: ManualStepItem | SettingItem | SoftwareSettingItem | BrowserSettingItem | RgbSettingItem | PreflightCheck
  ): item is PreflightCheck {
    return "check" in item && "how" in item && "fail" in item;
  }

  // Icon map
  function getGroupIcon(groupId: string): string {
    switch (groupId) {
      case "windows":
        return "M3 5a2 2 0 0 1 2-2h6v8H3V5zm8-2h6a2 2 0 0 1 2 2v6h-8V3zm8 10v6a2 2 0 0 1-2 2h-6v-8h8zm-10 8H5a2 2 0 0 1-2-2v-6h8v8z";
      case "gpu":
        return "M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zm2 3v6h3v-6H6zm5 0v6h3v-6h-3zm5 0v6h3v-6h-3z";
      case "bios":
        return "M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0-6h18M3 9v6";
      case "software":
        return "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5";
      case "preflight":
        return "M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11";
      case "troubleshooting":
        return "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z";
      default:
        return "M12 2L2 7l10 5 10-5-10-5z";
    }
  }

  function handlePrint() {
    window.print();
  }
</script>

<div class="manual-steps">
  <div class="manual-steps__header">
    <div class="manual-steps__title-row">
      <h3 class="manual-steps__title">
        <svg class="manual-steps__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
        Manual Steps Guide
      </h3>
      <span class="manual-steps__count">{totalItems} items</span>
    </div>
    <p class="manual-steps__desc">
      Settings that can't be scripted but make a real difference
    </p>
    <div class="manual-steps__controls">
      <button type="button" class="manual-steps__btn" onclick={expandAll}>
        Expand All
      </button>
      <button type="button" class="manual-steps__btn" onclick={collapseAll}>
        Collapse All
      </button>
      <button type="button" class="manual-steps__btn manual-steps__btn--print" onclick={handlePrint}>
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6 9V2h12v7" />
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
          <rect x="6" y="14" width="12" height="8" />
        </svg>
        Print
      </button>
    </div>
  </div>

  <div class="manual-steps__groups">
    {#each filteredGroups as group (group.id)}
      {@const isExpanded = expandedGroups.has(group.id)}
      {@const itemCount = group.sections.reduce((sum, s) => sum + s.items.length, 0)}

      <div class="manual-steps__group" class:expanded={isExpanded}>
        <button
          type="button"
          class="manual-steps__group-header"
          onclick={() => toggleGroup(group.id)}
          aria-expanded={isExpanded}
        >
          <svg class="manual-steps__group-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d={getGroupIcon(group.id)} />
          </svg>
          <span class="manual-steps__group-title">{group.title}</span>
          <span class="manual-steps__group-count">{itemCount}</span>
          <svg class="manual-steps__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        {#if isExpanded}
          <div class="manual-steps__group-content">
            {#each group.sections as section (section.id)}
              <div class="manual-steps__section">
                {#if section.description}
                  <p class="manual-steps__section-desc">{section.description}</p>
                {/if}
                {#if section.location}
                  <p class="manual-steps__section-location">
                    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    {section.location}
                  </p>
                {/if}

                <ul class="manual-steps__items">
                  {#each section.items as item}
                    <li class="manual-steps__item">
                      <span class="manual-steps__checkbox"></span>
                      <div class="manual-steps__item-content">
                        {#if isManualStepItem(item)}
                          <div class="manual-steps__item-main">
                            <span class="manual-steps__step">{item.step}</span>
                            <span class="manual-steps__check">{item.check}</span>
                          </div>
                          <p class="manual-steps__why">{item.why}</p>
                        {:else if isSettingItem(item)}
                          <div class="manual-steps__item-main">
                            <span class="manual-steps__setting">{item.setting}</span>
                            <span class="manual-steps__value">{item.value}</span>
                          </div>
                          <p class="manual-steps__why">{item.why}</p>
                        {:else if isSoftwareSettingItem(item)}
                          <div class="manual-steps__item-main">
                            <span class="manual-steps__path">{item.path}</span>
                            <span class="manual-steps__value">{item.value}</span>
                          </div>
                          <p class="manual-steps__why">{item.why}</p>
                        {:else if isBrowserSettingItem(item)}
                          <div class="manual-steps__item-main">
                            <span class="manual-steps__browser">{item.browser}</span>
                            <span class="manual-steps__path">{item.path} &gt; {item.setting}</span>
                            <span class="manual-steps__value">{item.value}</span>
                          </div>
                          <p class="manual-steps__why">{item.why}</p>
                        {:else if isRgbSettingItem(item)}
                          <div class="manual-steps__item-main">
                            <span class="manual-steps__software">{item.software}</span>
                            <span class="manual-steps__action">{item.action}</span>
                          </div>
                          <p class="manual-steps__why">{item.why}</p>
                        {:else if isPreflightCheck(item)}
                          <div class="manual-steps__item-main">
                            <span class="manual-steps__check-question">{item.check}</span>
                          </div>
                          <p class="manual-steps__how">
                            <strong>How:</strong> {item.how}
                          </p>
                          <p class="manual-steps__fail">
                            <strong>If not:</strong> {item.fail}
                          </p>
                        {/if}
                      </div>
                    </li>
                  {/each}
                </ul>

                {#if section.note}
                  <p class="manual-steps__note">
                    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                    {section.note}
                  </p>
                {/if}
              </div>
            {/each}

            <!-- Video Resources -->
            {#if group.videos && group.videos.length > 0}
              <div class="manual-steps__videos">
                <h4 class="manual-steps__videos-title">
                  <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="23 7 16 12 23 17 23 7" />
                    <rect x="1" y="5" width="15" height="14" rx="2" />
                  </svg>
                  Learn More
                </h4>
                <div class="manual-steps__videos-grid">
                  {#each group.videos as video (video.id)}
                    <a
                      href={getYouTubeUrl(video.videoId)}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="video-card"
                    >
                      <div class="video-card__thumbnail">
                        <img
                          src={getYouTubeThumbnail(video.videoId)}
                          alt={video.title}
                          loading="lazy"
                        />
                        <div class="video-card__play">
                          <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      </div>
                      <div class="video-card__info">
                        <span class="video-card__title">{video.title}</span>
                        <span class="video-card__creator">{video.creator}</span>
                        {#if video.description}
                          <span class="video-card__desc">{video.description}</span>
                        {/if}
                      </div>
                    </a>
                  {/each}
                </div>
              </div>
            {/if}
          </div>
        {/if}
      </div>
    {/each}
  </div>
</div>

<!-- Styles are in manual-steps.styles.css -->
