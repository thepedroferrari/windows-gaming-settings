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
    type TroubleshootingItem,
    type GameLaunchItem,
    type StreamingTroubleshootItem,
    type DiagnosticTool,
    type VideoResource,
  } from "$lib/manual-steps";
  import {
    isCompleted,
    toggleItem,
    resetSection,
    resetAll,
    createItemId,
    getProgressData,
  } from "$lib/progress.svelte";

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

  let expandedGroups = $state<Set<string>>(new Set(["windows", "preflight"]));

  let filteredGroups = $derived.by(() => {
    const persona = app.activePreset ?? "gamer";
    const gpu = app.hardware.gpu;
    return getFilteredSectionGroups(persona, gpu);
  });

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

  let progressData = $derived(getProgressData());

  function handleCheckbox(sectionId: string, itemId: string) {
    toggleItem(sectionId, itemId);
  }

  function isDone(sectionId: string, itemId: string): boolean {
    const _ = progressData.lastUpdated;
    return isCompleted(sectionId, itemId);
  }

  function handleResetSection(sectionId: string) {
    resetSection(sectionId);
  }

  function handleResetAll() {
    if (confirm("Reset all progress? This cannot be undone.")) {
      resetAll();
    }
  }

  type AnyItem =
    | ManualStepItem
    | SettingItem
    | SoftwareSettingItem
    | BrowserSettingItem
    | RgbSettingItem
    | PreflightCheck
    | TroubleshootingItem
    | GameLaunchItem
    | StreamingTroubleshootItem
    | DiagnosticTool;

  function getItemId(item: AnyItem): string {
    return item.id ?? createItemId(item as unknown as Record<string, unknown>);
  }

  function getProgressForItems(sectionId: string, items: readonly AnyItem[]) {
    const total = items.length;
    const completed = items.reduce((count, item) => {
      return count + (isCompleted(sectionId, getItemId(item)) ? 1 : 0);
    }, 0);

    return {
      completed,
      total,
      percent: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }

  function getProgress(sectionId: string, items: readonly AnyItem[]) {
    const _ = progressData.lastUpdated;
    return getProgressForItems(sectionId, items);
  }

  function getGroupProgress(sections: readonly ManualStepSection[]) {
    const _ = progressData.lastUpdated;
    let completed = 0;
    let total = 0;

    for (const section of sections) {
      const sectionProgress = getProgressForItems(
        section.id,
        section.items as readonly AnyItem[],
      );
      completed += sectionProgress.completed;
      total += sectionProgress.total;
    }

    return {
      completed,
      total,
      percent: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }

  function isManualStepItem(item: AnyItem): item is ManualStepItem {
    return "step" in item && "check" in item && "why" in item;
  }

  function isSettingItem(item: AnyItem): item is SettingItem {
    return (
      "setting" in item &&
      "value" in item &&
      !("path" in item) &&
      !("browser" in item) &&
      !("software" in item)
    );
  }

  function isSoftwareSettingItem(item: AnyItem): item is SoftwareSettingItem {
    return "path" in item && "value" in item && !("browser" in item);
  }

  function isBrowserSettingItem(item: AnyItem): item is BrowserSettingItem {
    return "browser" in item && "setting" in item;
  }

  function isRgbSettingItem(item: AnyItem): item is RgbSettingItem {
    return "software" in item && "action" in item;
  }

  function isPreflightCheck(item: AnyItem): item is PreflightCheck {
    return "check" in item && "how" in item && "fail" in item;
  }

  function isTroubleshootingItem(item: AnyItem): item is TroubleshootingItem {
    return "problem" in item && "causes" in item && "quickFix" in item;
  }

  function isGameLaunchItem(item: AnyItem): item is GameLaunchItem {
    return "game" in item && "platform" in item && "notes" in item;
  }

  function isStreamingTroubleshootItem(
    item: AnyItem,
  ): item is StreamingTroubleshootItem {
    return (
      "problem" in item &&
      "solution" in item &&
      "why" in item &&
      !("causes" in item)
    );
  }

  function isDiagnosticTool(item: AnyItem): item is DiagnosticTool {
    return "tool" in item && "use" in item;
  }

  let copiedId = $state<string | null>(null);

  async function copyLaunchOptions(launchOptions: string, gameId: string) {
    try {
      await navigator.clipboard.writeText(launchOptions);
      copiedId = gameId;
      setTimeout(() => {
        copiedId = null;
      }, 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = launchOptions;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      copiedId = gameId;
      setTimeout(() => {
        copiedId = null;
      }, 2000);
    }
  }

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
      case "peripherals":
        return "M12 2a4 4 0 0 0-4 4v6a4 4 0 0 0 8 0V6a4 4 0 0 0-4-4zm0 14a6 6 0 0 1-6-6V6a6 6 0 1 1 12 0v4a6 6 0 0 1-6 6zm0 2v4m-4 0h8";
      case "network":
        return "M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01";
      case "preflight":
        return "M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11";
      case "troubleshooting":
        return "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z";
      case "games":
        return "M6 11h4v2H6v4H4v-4H0v-2h4V7h2v4zm10-2h4v8h-2v-6h-2v6h-2V9h2zm-6 3h2v6H8v-6zm6 0h2v6h-2v-6z";
      case "streaming":
        return "M4.75 8.75a7.25 7.25 0 0 1 14.5 0M2 11.5a10.5 10.5 0 0 1 20 0M8.25 15a3.75 3.75 0 0 1 7.5 0M12 15a1 1 0 0 1 1 1v3a1 1 0 0 1-2 0v-3a1 1 0 0 1 1-1z";
      case "diagnostics":
        return "M4.8 2.3A.3.3 0 1 0 5 2.9 2.3 2.3 0 1 1 7.3 5.2a.3.3 0 0 0-.3.3 4 4 0 0 1-4 4 .3.3 0 0 0 0 .6A4.6 4.6 0 0 0 7.6 5.5a.3.3 0 0 0-.3-.3 1.7 1.7 0 1 1-1.7-1.7.3.3 0 0 0 .3-.3 4 4 0 0 1 .6-.9zM12 8a4 4 0 0 0-4 4v7a4 4 0 0 0 8 0v-7a4 4 0 0 0-4-4zm-2 4a2 2 0 1 1 4 0v7a2 2 0 0 1-4 0z";
      default:
        return "M12 2L2 7l10 5 10-5-10-5z";
    }
  }

  function handlePrint() {
    window.print();
  }
</script>

<section id="guide" class="step step--guide manual-steps">
  <header class="step-banner">
    <div class="step-banner__marker">6</div>
    <div class="step-banner__content">
      <h2 class="step-banner__title">Manual Steps Guide</h2>
      <p class="step-banner__subtitle">
        Settings that can't be scripted but make a real difference
      </p>
    </div>
    <div class="step-banner__actions">
      <span class="items-count">{totalItems} items</span>
    </div>
  </header>

  <div class="manual-steps__controls">
    <button type="button" class="manual-steps__btn" onclick={expandAll}>
      Expand All
    </button>
    <button type="button" class="manual-steps__btn" onclick={collapseAll}>
      Collapse All
    </button>
    <button
      type="button"
      class="manual-steps__btn manual-steps__btn--print"
      onclick={handlePrint}
    >
      <svg
        class="icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M6 9V2h12v7" />
        <path
          d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"
        />
        <rect x="6" y="14" width="12" height="8" />
      </svg>
      Print
    </button>
  </div>

  <div class="manual-steps__groups">
    {#each filteredGroups as group (group.id)}
      {@const groupProgress = getGroupProgress(group.sections)}
      {@const isSingleSectionGroup = group.sections.length === 1}
      {@const groupSubtitle = isSingleSectionGroup
        ? (group.sections[0]?.description ?? group.sections[0]?.title)
        : undefined}

      <details
        class="manual-steps__group"
        open={expandedGroups.has(group.id)}
        ontoggle={(e) => {
          const target = e.currentTarget as HTMLDetailsElement;
          if (target.open && !expandedGroups.has(group.id)) {
            expandedGroups = new Set([...expandedGroups, group.id]);
          } else if (!target.open && expandedGroups.has(group.id)) {
            const next = new Set(expandedGroups);
            next.delete(group.id);
            expandedGroups = next;
          }
        }}
      >
        <summary class="manual-steps__group-header">
          <svg
            class="manual-steps__group-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d={getGroupIcon(group.id)} />
          </svg>
          <div class="manual-steps__group-heading">
            <span class="manual-steps__group-title">{group.title}</span>
            {#if groupSubtitle}
              <span class="manual-steps__group-subtitle">{groupSubtitle}</span>
            {/if}
          </div>
          <div class="manual-steps__group-progress">
            <progress
              class="manual-steps__progress-meter manual-steps__progress-meter--group"
              class:complete={groupProgress.percent === 100}
              value={groupProgress.completed}
              max={groupProgress.total}
            ></progress>
            <span class="manual-steps__progress-text">
              {groupProgress.completed}/{groupProgress.total}
            </span>
          </div>
          <svg
            class="manual-steps__chevron"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </summary>

        <div class="manual-steps__group-content">
          {#each group.sections as section (section.id)}
            {@const progress = getProgress(
              section.id,
              section.items as readonly AnyItem[],
            )}
            <div class="manual-steps__section">
              {#if !isSingleSectionGroup}
                <div class="manual-steps__section-header">
                  <h4 class="manual-steps__section-title">{section.title}</h4>
                  <div class="manual-steps__progress">
                    <span class="manual-steps__progress-text">
                      {progress.completed}/{progress.total}
                    </span>
                    {#if progress.completed > 0}
                      <button
                        type="button"
                        class="manual-steps__reset-btn"
                        title="Reset section progress"
                        onclick={() => handleResetSection(section.id)}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                        >
                          <path
                            d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"
                          />
                          <path d="M3 3v5h5" />
                        </svg>
                      </button>
                    {/if}
                  </div>
                </div>
              {:else if progress.completed > 0}
                <div class="manual-steps__section-reset">
                  <button
                    type="button"
                    class="manual-steps__reset-btn"
                    title="Reset section progress"
                    onclick={() => handleResetSection(section.id)}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path
                        d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"
                      />
                      <path d="M3 3v5h5" />
                    </svg>
                  </button>
                </div>
              {/if}
              {#if section.description && !isSingleSectionGroup}
                <p class="manual-steps__section-desc">{section.description}</p>
              {/if}
              {#if section.location}
                <p class="manual-steps__section-location">
                  <svg
                    class="icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  {section.location}
                </p>
              {/if}

              <ul class="manual-steps__items">
                {#each section.items as item}
                  {@const itemId = getItemId(item as AnyItem)}
                  {@const itemDone = isDone(section.id, itemId)}
                  <li class="manual-steps__item" class:completed={itemDone}>
                    <label class="manual-steps__item-label">
                      <input
                        type="checkbox"
                        class="manual-steps__checkbox"
                        checked={itemDone}
                        onchange={() => handleCheckbox(section.id, itemId)}
                      />
                      <span class="manual-steps__checkbox-visual"></span>
                      <div class="manual-steps__item-content">
                        {#if isManualStepItem(item)}
                          <div class="manual-steps__item-main">
                            <span class="manual-steps__step">{item.step}</span>
                            <span class="manual-steps__check">{item.check}</span
                            >
                          </div>
                          <p class="manual-steps__why">{item.why}</p>
                        {:else if isSettingItem(item)}
                          <div class="manual-steps__item-main">
                            <span class="manual-steps__setting"
                              >{item.setting}</span
                            >
                            <span class="manual-steps__value">{item.value}</span
                            >
                          </div>
                          <p class="manual-steps__why">{item.why}</p>
                        {:else if isSoftwareSettingItem(item)}
                          <div class="manual-steps__item-main">
                            <span class="manual-steps__path">{item.path}</span>
                            <span class="manual-steps__value">{item.value}</span
                            >
                          </div>
                          <p class="manual-steps__why">{item.why}</p>
                        {:else if isBrowserSettingItem(item)}
                          <div class="manual-steps__item-main">
                            <span class="manual-steps__browser"
                              >{item.browser}</span
                            >
                            <span class="manual-steps__path"
                              >{item.path} &gt; {item.setting}</span
                            >
                            <span class="manual-steps__value">{item.value}</span
                            >
                          </div>
                          <p class="manual-steps__why">{item.why}</p>
                        {:else if isRgbSettingItem(item)}
                          <div class="manual-steps__item-main">
                            <span class="manual-steps__software"
                              >{item.software}</span
                            >
                            <span class="manual-steps__action"
                              >{item.action}</span
                            >
                          </div>
                          <p class="manual-steps__why">{item.why}</p>
                        {:else if isPreflightCheck(item)}
                          <div class="manual-steps__item-main">
                            <span class="manual-steps__check-question"
                              >{item.check}</span
                            >
                          </div>
                          <p class="manual-steps__how">
                            <strong>How:</strong>
                            {item.how}
                          </p>
                          <p class="manual-steps__fail">
                            <strong>If not:</strong>
                            {item.fail}
                          </p>
                        {:else if isTroubleshootingItem(item)}
                          <div class="manual-steps__item-main">
                            <span class="manual-steps__problem"
                              >{item.problem}</span
                            >
                          </div>
                          <div class="manual-steps__causes">
                            <strong>Possible causes:</strong>
                            <ul>
                              {#each item.causes as cause}
                                <li>{cause}</li>
                              {/each}
                            </ul>
                          </div>
                          <p class="manual-steps__quickfix">
                            <strong>Quick fix:</strong>
                            {item.quickFix}
                          </p>
                        {:else if isGameLaunchItem(item)}
                          <div class="manual-steps__game-header">
                            <span class="manual-steps__game-name"
                              >{item.game}</span
                            >
                            <span class="manual-steps__game-platform"
                              >{item.platform}</span
                            >
                          </div>
                          {#if item.launchOptions}
                            <div class="manual-steps__launch-options">
                              <code class="manual-steps__launch-code"
                                >{item.launchOptions}</code
                              >
                              <button
                                type="button"
                                class="manual-steps__copy-btn"
                                class:copied={copiedId === item.game}
                                onclick={() =>
                                  copyLaunchOptions(
                                    item.launchOptions!,
                                    item.game,
                                  )}
                              >
                                {#if copiedId === item.game}
                                  <svg
                                    class="icon"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                  >
                                    <path d="M20 6L9 17l-5-5" />
                                  </svg>
                                  Copied!
                                {:else}
                                  <svg
                                    class="icon"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                  >
                                    <rect
                                      x="9"
                                      y="9"
                                      width="13"
                                      height="13"
                                      rx="2"
                                    />
                                    <path
                                      d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
                                    />
                                  </svg>
                                  Copy
                                {/if}
                              </button>
                            </div>
                          {/if}
                          <ul class="manual-steps__game-notes">
                            {#each item.notes as note}
                              <li>{note}</li>
                            {/each}
                          </ul>
                        {:else if isStreamingTroubleshootItem(item)}
                          <div class="manual-steps__item-main">
                            <span class="manual-steps__problem"
                              >{item.problem}</span
                            >
                          </div>
                          <p class="manual-steps__solution">
                            <strong>Solution:</strong>
                            {item.solution}
                          </p>
                          <p class="manual-steps__why">{item.why}</p>
                        {:else if isDiagnosticTool(item)}
                          <div class="manual-steps__item-main">
                            <span class="manual-steps__tool-name"
                              >{item.tool}</span
                            >
                            {#if item.arsenalKey}
                              <span
                                class="manual-steps__arsenal-badge"
                                title="Available in Arsenal">Arsenal</span
                              >
                            {/if}
                          </div>
                          <p class="manual-steps__tool-use">{item.use}</p>
                        {/if}
                      </div>
                    </label>
                  </li>
                {/each}
              </ul>

              {#if section.note}
                <p class="manual-steps__note">
                  <svg
                    class="icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                  {section.note}
                </p>
              {/if}
            </div>
          {/each}

          {#if group.videos && group.videos.length > 0}
            <div class="manual-steps__videos">
              <h4 class="manual-steps__videos-title">
                <svg
                  class="icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
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
                        <span class="video-card__desc">{video.description}</span
                        >
                      {/if}
                    </div>
                  </a>
                {/each}
              </div>
            </div>
          {/if}
        </div>
      </details>
    {/each}
  </div>
</section>
