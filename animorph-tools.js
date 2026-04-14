"use strict";
(() => {
  // src/core/debug.ts
  var DEBUG_MODE = false;
  function debugLog(...args) {
    if (DEBUG_MODE) {
      console.log("[Animorph Debug]", ...args);
    }
  }

  // src/core/constants.ts
  var PLUGIN_ID = "animorph-tools";
  var PLUGIN_NAME = "Animorph Tools";
  var PLUGIN_VERSION = "1.1.0-beta";
  var PROPERTY_NAME = "loop_start";
  var PROPERTY_DEFAULT = 0;
  var MARKER_ID = "timeline_loop_start_marker";
  var TOOLTIP_ID = "loop_start_tooltip";
  var MARKER_COLOR = "var(--color-accent)";
  var SETTING_NORMALIZED_UVS = "animorph_normalized_mesh_uvs";
  var SETTING_SKIP_NORMALS = "animorph_skip_mesh_normals";

  // src/changelog-injector/index.ts
  var CHANGELOG_URL = "https://raw.githubusercontent.com/feeldev12/animorph-blockbench/main/changelog.json";
  var CONTAINER_ID = "at_changelog_panel";
  var CACHE_KEY = "animorph_changelog_cache";
  var CACHE_HASH_KEY = "animorph_changelog_cache_hash";
  function hashStr(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return hash.toString(36);
  }
  function buildChangelogHTML(data) {
    let html = "";
    for (const [version, entry] of Object.entries(data)) {
      html += `<div style="margin-bottom:20px;">`;
      html += `<div style="display:flex;align-items:baseline;gap:12px;margin-bottom:8px;">`;
      html += `<h3 style="margin:0;font-size:1.2em;">${version}</h3>`;
      html += `<span style="color:#888;font-style:italic;font-size:0.9em;">by ${entry.author}</span>`;
      if (entry.date) {
        html += `<span style="color:#666;font-size:0.85em;">${entry.date}</span>`;
      }
      html += `</div>`;
      for (const category of entry.categories) {
        html += `<div style="margin-bottom:12px;">`;
        html += `<h4 style="margin:4px 0;color:#aaa;font-size:1em;font-weight:600;">${category.title}</h4>`;
        html += `<ul style="margin:4px 0 8px 20px;">`;
        for (const item of category.list) {
          html += `<li style="margin-bottom:3px;line-height:1.4;">${item}</li>`;
        }
        html += `</ul>`;
        html += `</div>`;
      }
      html += `</div>`;
    }
    return html;
  }
  function isOnOurPluginPage() {
    const titleEl = document.querySelector("#plugin_browser_page h1");
    if (!titleEl)
      return false;
    return titleEl.textContent?.includes("Animorph Tools") ?? false;
  }
  function isChangelogTabSelected() {
    const tabBar = document.getElementById("plugin_browser_page_tab_bar");
    if (!tabBar)
      return false;
    const tabs = tabBar.querySelectorAll("li");
    for (const tab of tabs) {
      if (tab.classList.contains("selected")) {
        return tab.textContent?.trim() === "Changelog";
      }
    }
    return false;
  }
  function getCachedChangelog() {
    try {
      return localStorage.getItem(CACHE_KEY);
    } catch {
      return null;
    }
  }
  function saveCachedChangelog(jsonStr) {
    try {
      localStorage.setItem(CACHE_KEY, jsonStr);
      localStorage.setItem(CACHE_HASH_KEY, hashStr(jsonStr));
      debugLog("\u2713 Changelog cached in localStorage");
    } catch {
      debugLog("\u26A0 Failed to cache changelog in localStorage");
    }
  }
  function getCachedHash() {
    try {
      return localStorage.getItem(CACHE_HASH_KEY);
    } catch {
      return null;
    }
  }
  async function fetchChangelog() {
    try {
      const res = await fetch(CHANGELOG_URL);
      if (res.ok) {
        const text = await res.text();
        debugLog("\u2713 Changelog fetched from GitHub");
        return text;
      }
      debugLog("\u26A0 GitHub fetch failed (status " + res.status + ")");
    } catch (e) {
      debugLog("\u26A0 Fetch failed");
    }
    return null;
  }
  async function resolveChangelog() {
    const remote = await fetchChangelog();
    if (remote) {
      const remoteHash = hashStr(remote);
      const cachedHash = getCachedHash();
      if (remoteHash !== cachedHash) {
        saveCachedChangelog(remote);
        debugLog("\u2713 Changelog updated from GitHub");
        return { data: JSON.parse(remote), source: "remote" };
      }
      return { data: JSON.parse(remote), source: "remote" };
    }
    const cached = getCachedChangelog();
    if (cached) {
      debugLog("\u2713 Using cached changelog (fetch failed)");
      return { data: JSON.parse(cached), source: "cache" };
    }
    debugLog("\u26A0 No changelog available (no GitHub, no cache)");
    return null;
  }
  function getOrCreateContainer() {
    let container = document.getElementById(CONTAINER_ID);
    if (container)
      return container;
    const nativeUl = document.getElementById("plugin_browser_changelog");
    if (!nativeUl || !nativeUl.parentElement)
      return null;
    container = document.createElement("div");
    container.id = CONTAINER_ID;
    container.style.display = "none";
    container.style.padding = "12px 16px";
    container.style.overflowY = "auto";
    nativeUl.parentElement.insertBefore(container, nativeUl.nextSibling);
    return container;
  }
  function updateVisibility() {
    const container = document.getElementById(CONTAINER_ID);
    if (!container)
      return;
    if (isOnOurPluginPage() && isChangelogTabSelected()) {
      container.style.display = "block";
    } else {
      container.style.display = "none";
    }
  }
  async function refreshChangelog() {
    const container = getOrCreateContainer();
    if (!container)
      return;
    const result = await resolveChangelog();
    if (result) {
      const { data, source } = result;
      container.innerHTML = buildChangelogHTML(data);
      debugLog(`\u2713 Changelog rendered (source: ${source})`);
    } else {
      container.innerHTML = `
      <div style="color:#888;text-align:center;padding:40px 20px;">
        <i class="material-icons icon" style="font-size:48px;opacity:0.3;">update_disabled</i>
        <p style="margin-top:12px;font-size:1.1em;">No changelog available</p>
        <p style="font-size:0.85em;color:#666;">Connect to the internet to fetch changelog data.</p>
      </div>`;
      debugLog("\u26A0 No changelog to display");
    }
  }
  function onTabBarClick(_e) {
    setTimeout(() => {
      if (isOnOurPluginPage() && isChangelogTabSelected()) {
        refreshChangelog();
      }
      updateVisibility();
    }, 150);
  }
  function startChangelogInjector() {
    setTimeout(() => {
      const tabBar = document.getElementById("plugin_browser_page_tab_bar");
      if (tabBar) {
        tabBar.addEventListener("click", onTabBarClick);
        debugLog("\u2713 Changelog injector: tab click listener attached");
      }
      if (isOnOurPluginPage() && isChangelogTabSelected()) {
        setTimeout(async () => {
          await refreshChangelog();
          updateVisibility();
        }, 500);
      }
    }, 700);
  }
  function stopChangelogInjector() {
    const tabBar = document.getElementById("plugin_browser_page_tab_bar");
    if (tabBar) {
      tabBar.removeEventListener("click", onTabBarClick);
    }
    const container = document.getElementById(CONTAINER_ID);
    if (container)
      container.remove();
    debugLog("\u2713 Changelog injector stopped");
  }

  // src/ui/styles.ts
  var styleElement = null;
  function createMarkerStyles() {
    styleElement = document.createElement("style");
    styleElement.id = "loop_start_marker_styles";
    styleElement.textContent = `
    #${MARKER_ID} {
      position: absolute;
      width: 8px;
      height: 26px;
      top: 0;
      z-index: 2;
      cursor: ew-resize;
      transform: translateX(-4px);
    }
    #${MARKER_ID}::before {
      content: '';
      position: absolute;
      left: 3px;
      top: 0;
      width: 2px;
      height: 100%;
      background-color: ${MARKER_COLOR};
    }
    #${MARKER_ID}::after {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      border-left: 4px solid transparent;
      border-right: 4px solid transparent;
      border-top: 6px solid ${MARKER_COLOR};
    }
    #${TOOLTIP_ID} {
      position: fixed;
      background-color: #1a1a1a;
      color: ${MARKER_COLOR};
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: bold;
      pointer-events: none;
      z-index: 1000;
      border: 1px solid ${MARKER_COLOR};
      display: none;
    }
  `;
    document.head.appendChild(styleElement);
  }
  function removeMarkerStyles() {
    if (styleElement) {
      styleElement.remove();
      styleElement = null;
    }
  }

  // src/core/utils.ts
  function colorToString(color) {
    if (typeof color === "string") {
      if (color === "[object Object]") {
        return "#ffffff";
      }
      return color;
    }
    if (color && typeof color === "object") {
      if (color._a !== void 0 && color._a < 1) {
        const r = Math.round(color._r);
        const g = Math.round(color._g);
        const b = Math.round(color._b);
        const a = Math.round(color._a * 100) / 100;
        return `rgba(${r}, ${g}, ${b}, ${a})`;
      }
      if (color.toHexString) {
        return color.toHexString();
      }
      if (color._r !== void 0) {
        const r = Math.round(color._r).toString(16).padStart(2, "0");
        const g = Math.round(color._g).toString(16).padStart(2, "0");
        const b = Math.round(color._b).toString(16).padStart(2, "0");
        return `#${r}${g}${b}`;
      }
    }
    return "#ffffff";
  }
  function getLoopStartTime() {
    if (Animation.selected?.loop === "loop" && Animation.selected?.loop_start) {
      return Animation.selected.loop_start;
    }
    return Timeline.custom_range[0];
  }
  function getAnimationEndTime() {
    const animLength = Animation.selected?.length || 1e3;
    return Timeline.custom_range[1] || animLength;
  }
  function formatTime(time) {
    return Math.round(time * 100) / 100 + "s";
  }
  function isBedrockFormat() {
    const Format2 = window.Format;
    return Format2?.id === "geckolib_model" || Format2?.id === "bedrock" || Format2?.id === "bedrock_old";
  }

  // src/ui/tooltip.ts
  var tooltip = null;
  function createTooltip() {
    tooltip = document.createElement("div");
    tooltip.id = TOOLTIP_ID;
    document.body.appendChild(tooltip);
  }
  function showTooltip(x, y, time) {
    if (!tooltip)
      return;
    tooltip.textContent = formatTime(time);
    tooltip.style.left = x + 15 + "px";
    tooltip.style.top = y - 10 + "px";
    tooltip.style.display = "block";
  }
  function hideTooltip() {
    if (!tooltip)
      return;
    tooltip.style.display = "none";
  }
  function removeTooltip() {
    if (tooltip) {
      tooltip.remove();
      tooltip = null;
    }
  }

  // src/ui/marker.ts
  var loopStartMarker = null;
  function createLoopStartMarker() {
    if (loopStartMarker)
      return;
    const timelineTime = document.getElementById("timeline_time");
    if (!timelineTime)
      return;
    loopStartMarker = document.createElement("div");
    loopStartMarker.id = MARKER_ID;
    timelineTime.appendChild(loopStartMarker);
    setupMarkerDrag();
  }
  function setupMarkerDrag() {
    if (!loopStartMarker)
      return;
    let isDragging = false;
    loopStartMarker.addEventListener("mousedown", (e) => {
      if (!Animation.selected || Animation.selected.loop !== "loop")
        return;
      isDragging = true;
      Undo.initEdit({ animations: [Animation.selected] });
      e.preventDefault();
      e.stopPropagation();
    });
    document.addEventListener("mousemove", (e) => {
      if (!isDragging)
        return;
      const timelineTime = document.getElementById("timeline_time");
      if (!timelineTime)
        return;
      const rect = timelineTime.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const time = Math.max(0, x / Timeline.vue.size);
      const snappedTime = Timeline.snapTime(time);
      const clampedTime = Math.min(snappedTime, Animation.selected.length || 1e3);
      Animation.selected.loop_start = clampedTime;
      updateLoopStartMarker();
      showTooltip(e.clientX, e.clientY, clampedTime);
    });
    document.addEventListener("mouseup", () => {
      if (isDragging) {
        isDragging = false;
        hideTooltip();
        Undo.finishEdit("Change loop start time");
      }
    });
  }
  function updateLoopStartMarker() {
    if (!loopStartMarker)
      return;
    const anim = Animation.selected;
    if (!anim || anim.loop !== "loop" || !anim.loop_start) {
      loopStartMarker.style.display = "none";
      return;
    }
    const left = anim.loop_start * Timeline.vue.size;
    const scrollLeft = Timeline.vue.scroll_left || 0;
    if (left < scrollLeft) {
      loopStartMarker.style.display = "none";
      return;
    }
    loopStartMarker.style.display = "block";
    loopStartMarker.style.left = left + "px";
  }
  function hideLoopStartMarker() {
    if (!loopStartMarker)
      return;
    loopStartMarker.style.display = "none";
  }
  function removeLoopStartMarker() {
    if (loopStartMarker) {
      loopStartMarker.remove();
      loopStartMarker = null;
    }
  }

  // src/handlers/io.ts
  var originalAnimationImport = null;
  var originalBlockbenchImport = null;
  var LAYER_SEPARATOR = ".";
  function remapLayerBoneNamesInJson(jsonContent) {
    if (!jsonContent?.animations || typeof Collection === "undefined")
      return false;
    let remapped = false;
    for (const animName in jsonContent.animations) {
      const animData = jsonContent.animations[animName];
      if (!animData?.bones)
        continue;
      const renames = [];
      for (const boneName of Object.keys(animData.bones)) {
        const directMatch = Group.all.find(
          (g) => g.name === boneName && !g.name.includes(LAYER_SEPARATOR)
        );
        if (directMatch)
          continue;
        for (const collection of Collection.all) {
          if (collection.export_codec !== "animorph_layer")
            continue;
          const prefix = collection.name + LAYER_SEPARATOR;
          const prefixedName = prefix + boneName;
          const group = Group.all.find((g) => g.name === prefixedName);
          if (group) {
            renames.push([boneName, prefixedName]);
            break;
          }
        }
      }
      for (const [oldName, newName] of renames) {
        animData.bones[newName] = animData.bones[oldName];
        delete animData.bones[oldName];
      }
      if (renames.length > 0) {
        debugLog(`[Layers] Remapped ${renames.length} bone names in "${animName}"`);
        remapped = true;
      }
    }
    return remapped;
  }
  function interceptAnimationImport() {
    if (Animator && Animator.importFile) {
      debugLog("\u2713 Interceptando Animator.importFile");
      originalAnimationImport = Animator.importFile;
      Animator.importFile = function(file) {
        debugLog("=== ANIMATOR IMPORT FILE ===");
        if (!isBedrockFormat()) {
          debugLog("  Formato no Bedrock, saltando captura de loop_start");
          return originalAnimationImport.call(this, file);
        }
        debugLog("  Formato Bedrock/GeckoLib detectado");
        if (file && file.content) {
          try {
            const jsonContent = JSON.parse(file.content);
            window._tempAnimationJson = jsonContent;
            if (remapLayerBoneNamesInJson(jsonContent)) {
              file.content = JSON.stringify(jsonContent);
            }
          } catch (error) {
            console.warn("Error parseando JSON:", error);
          }
        }
        const result = originalAnimationImport.call(this, file);
        setTimeout(() => {
          processImportedAnimations();
        }, 100);
        return result;
      };
    }
    interceptBlockbenchImport();
  }
  function processImportedAnimations() {
    const jsonContent = window._tempAnimationJson;
    if (!jsonContent || !jsonContent.animations) {
      return;
    }
    debugLog("Procesando animaciones importadas...");
    for (const animName in jsonContent.animations) {
      const animJson = jsonContent.animations[animName];
      if (animJson.loop_start !== void 0) {
        debugLog(`\u2713 Encontrado loop_start en "${animName}": ${animJson.loop_start}s`);
        const bbAnim = Animation.all.find((a) => a.name === animName);
        if (bbAnim) {
          bbAnim.loop_start = animJson.loop_start;
          if (Animation.selected === bbAnim) {
            updateLoopStartMarker();
          }
        }
      }
    }
    delete window._tempAnimationJson;
  }
  function interceptBlockbenchImport() {
    const Blockbench2 = window.Blockbench;
    if (!Blockbench2?.import)
      return;
    originalBlockbenchImport = Blockbench2.import;
    Blockbench2.import = function(options, callback, ...rest) {
      const newCallback = (files) => {
        if (Array.isArray(files)) {
          for (const file of files) {
            try {
              const content = file.content ?? file.data ?? "";
              if (typeof content === "string" && content.trim().startsWith("{")) {
                const parsed = JSON.parse(content);
                if (parsed?.animations && typeof parsed.animations === "object") {
                  window._tempAnimationJson = parsed;
                  debugLog("\u2713 Animaci\xF3n capturada via Blockbench.import");
                }
              }
            } catch {
            }
          }
        }
        callback(files);
        setTimeout(processImportedAnimations, 100);
      };
      return originalBlockbenchImport.call(this, options, newCallback, ...rest);
    };
    debugLog("\u2713 Interceptado Blockbench.import");
  }
  function restoreAnimationImport() {
    if (originalAnimationImport && Animator) {
      Animator.importFile = originalAnimationImport;
      debugLog("\u2713 Restaurado Animator.importFile");
    }
    const Blockbench2 = window.Blockbench;
    if (originalBlockbenchImport && Blockbench2) {
      Blockbench2.import = originalBlockbenchImport;
      debugLog("\u2713 Restaurado Blockbench.import");
    }
  }
  function onCompileAnimation(data) {
    if (!isBedrockFormat())
      return;
    if (data.animation.loop === "loop" && data.animation.loop_start) {
      data.json.loop_start = data.animation.loop_start;
    }
  }
  function onParseBedrock(data) {
    debugLog("=== PARSE BEDROCK LLAMADO ===");
    debugLog("  Animation:", data.animation?.name);
    debugLog("  loop_start en JSON:", data.json?.loop_start);
    if (data.json && data.json.loop_start !== void 0) {
      const loopStart = data.json.loop_start;
      const animName = data.animation?.name;
      data.animation.loop_start = loopStart;
      debugLog(`\u2713 Loop start asignado inmediatamente: ${loopStart}s`);
      setTimeout(() => {
        const finalAnim = Animation.all.find((a) => a.name === animName);
        if (finalAnim && finalAnim.loop_start !== loopStart) {
          finalAnim.loop_start = loopStart;
          debugLog(`\u2713 Loop start aplicado post-parse en "${animName}": ${loopStart}s`);
        }
        if (Animation.selected?.name === animName) {
          updateLoopStartMarker();
        }
      }, 100);
    }
  }

  // src/handlers/dialog.ts
  var originalPropertiesDialog = null;
  function createPropertiesDialog(original) {
    return function() {
      const anim = this;
      const labels = {
        animTimeUpdate: tl("menu.animation.anim_time_update"),
        blendWeight: tl("menu.animation.blend_weight"),
        startDelay: tl("menu.animation.start_delay"),
        loopDelay: tl("menu.animation.loop_delay")
      };
      const dialog = new Dialog({
        id: "animation_properties",
        title: this.name,
        width: 660,
        form: getFormConfig(anim),
        component: getComponentConfig(anim, labels),
        onFormChange(formData) {
          this.component.data.loop_mode = formData.loop;
        },
        onOpen() {
          this.form.node.style.removeProperty("--max_label_width");
        },
        onConfirm: (formData) => handleConfirm(dialog, anim, formData),
        onCancel: () => dialog.hide().delete()
      });
      dialog.show();
    };
  }
  function getFormConfig(anim) {
    return {
      name: { label: "generic.name", value: anim.name },
      path: {
        label: "menu.animation.file",
        value: anim.path,
        type: "file",
        extensions: ["json"],
        filetype: "JSON Animation",
        condition: Animation.properties.path.condition
      },
      loop: {
        label: "menu.animation.loop",
        type: "inline_select",
        value: anim.loop,
        options: {
          once: "menu.animation.loop.once",
          hold: "menu.animation.loop.hold",
          loop: "menu.animation.loop.loop"
        }
      },
      override: {
        label: "menu.animation.override",
        type: "checkbox",
        value: anim.override
      },
      snapping: {
        label: "menu.animation.snapping",
        type: "number",
        value: anim.snapping,
        step: 1,
        min: 10,
        max: 500
      }
    };
  }
  function getComponentConfig(anim, labels) {
    return {
      components: { VuePrismEditor },
      data: {
        anim_time_update: anim.anim_time_update,
        blend_weight: anim.blend_weight,
        start_delay: anim.start_delay,
        loop_delay: anim.loop_delay,
        loop_mode: anim.loop,
        loop_start: anim.loop_start ?? PROPERTY_DEFAULT
      },
      methods: {
        openMolangContextMenu(event, key, value) {
          new Menu([
            {
              name: "menu.text_edit.expression_editor",
              icon: "code_blocks",
              click: () => {
                openExpressionEditor(
                  {
                    autocomplete_context: MolangAutocomplete.AnimationContext,
                    text: value
                  },
                  (result) => this[key] = result
                );
              }
            }
          ]).open(event);
        },
        autocomplete(text, position) {
          if (Settings.get("autocomplete_code") === false)
            return [];
          return MolangAutocomplete.AnimationContext.autocomplete(text, position);
        }
      },
      template: buildTemplate(labels)
    };
  }
  function buildTemplate(labels) {
    const molangInput = (label, model) => `<div class="dialog_bar form_bar">
      <label class="name_space_left">${label}:</label>
      <vue-prism-editor class="molang_input"
        v-model="${model}"
        @contextmenu="openMolangContextMenu($event, '${model}', ${model})"
        language="molang"
        :autocomplete="autocomplete" :line-numbers="false"
      />
    </div>`;
    const loopStartInput = `
    <div class="dialog_bar form_bar" v-if="loop_mode == 'loop'">
      <label class="name_space_left">Loop Start Time (s):</label>
      <input type="number" class="dark_bordered" v-model.number="loop_start" step="0.05" min="0">
    </div>`;
    return `
    <div id="animation_properties_vue">
      ${molangInput(labels.animTimeUpdate, "anim_time_update")}
      ${molangInput(labels.blendWeight, "blend_weight")}
      ${molangInput(labels.startDelay, "start_delay")}
      <div class="dialog_bar form_bar" v-if="loop_mode == 'loop'">
        <label class="name_space_left">${labels.loopDelay}:</label>
        <vue-prism-editor class="molang_input"
          v-model="loop_delay"
          @contextmenu="openMolangContextMenu($event, 'loop_delay', loop_delay)"
          language="molang"
          :autocomplete="autocomplete" :line-numbers="false"
        />
      </div>
      ${loopStartInput}
    </div>`;
  }
  function handleConfirm(dialog, anim, formData) {
    dialog.hide().delete();
    const componentData = dialog.component.data;
    const newLoopStart = componentData.loop_start;
    const hasChanges = formData.loop !== anim.loop || formData.name !== anim.name || formData.path !== anim.path || formData.override !== anim.override || formData.snapping !== anim.snapping || newLoopStart !== anim.loop_start || componentData.anim_time_update !== anim.anim_time_update || componentData.blend_weight !== anim.blend_weight || componentData.start_delay !== anim.start_delay || componentData.loop_delay !== anim.loop_delay;
    if (hasChanges) {
      Undo.initEdit({ animations: [anim] });
      anim.extend({
        loop: formData.loop,
        name: formData.name,
        override: formData.override,
        snapping: formData.snapping,
        loop_start: newLoopStart,
        anim_time_update: componentData.anim_time_update.trim().replace(/\n/g, ""),
        blend_weight: componentData.blend_weight.trim().replace(/\n/g, ""),
        start_delay: componentData.start_delay.trim().replace(/\n/g, ""),
        loop_delay: componentData.loop_delay.trim().replace(/\n/g, "")
      });
      anim.path = formData.path;
      anim.createUniqueName();
      Blockbench.dispatchEvent("edit_animation_properties", { animation: anim });
      Undo.finishEdit("Edit animation properties");
      updateLoopStartMarker();
    }
  }
  function installPropertiesDialog() {
    originalPropertiesDialog = Animation.prototype.propertiesDialog;
    Animation.prototype.propertiesDialog = createPropertiesDialog(originalPropertiesDialog);
  }
  function restorePropertiesDialog() {
    if (originalPropertiesDialog) {
      Animation.prototype.propertiesDialog = originalPropertiesDialog;
    }
  }

  // src/handlers/events.ts
  function onAnimationSelect() {
    updateLoopStartMarker();
  }
  function onTimelineZoom() {
    updateLoopStartMarker();
  }
  function onRemoveAnimation() {
    hideLoopStartMarker();
  }

  // src/timeline/loop.ts
  var originalTimelineLoop = null;
  function createTimelineLoop(original) {
    return function() {
      if (!Animation.selected)
        return;
      const endTime = getAnimationEndTime();
      let newTime = null;
      if (Animation.selected.anim_time_update) {
        newTime = Animator.MolangParser.parse(Animation.selected.anim_time_update);
      }
      if (newTime == null || newTime <= Timeline.time) {
        newTime = Animator.MolangParser.parse("query.anim_time + query.delta_time");
      }
      newTime = Timeline.time + (newTime - Timeline.time) * (Timeline.playback_speed / 100);
      if (Animation.selected.loop === "hold") {
        newTime = Math.clamp(newTime, Timeline.custom_range[0], endTime);
      }
      Timeline.last_frame_timecode = performance.now();
      if (newTime < endTime) {
        Timeline.setTime(newTime);
      } else if (Animation.selected.loop === "loop" || BarItems.looped_animation_playback.value) {
        Timeline.setTime(getLoopStartTime());
      } else if (Animation.selected.loop === "once") {
        Timeline.setTime(Timeline.custom_range[0]);
        Animator.preview();
        Timeline.pause();
      } else if (Animation.selected.loop === "hold") {
        Timeline.setTime(endTime);
        Timeline.pause();
      }
      Animator.preview(true);
    };
  }
  function installTimelineLoop() {
    const Timeline2 = window.Timeline;
    originalTimelineLoop = Timeline2.loop;
    Timeline2.loop = createTimelineLoop(originalTimelineLoop);
  }
  function restoreTimelineLoop() {
    if (originalTimelineLoop) {
      const Timeline2 = window.Timeline;
      Timeline2.loop = originalTimelineLoop;
    }
  }

  // src/mesh/compile.ts
  function rotatePoint(point, center, rotation) {
    const [rx, ry, rz] = rotation.map((deg) => deg * Math.PI / 180);
    let [x, y, z] = point.map((coord, i) => coord - center[i]);
    let temp = y;
    y = y * Math.cos(rx) - z * Math.sin(rx);
    z = temp * Math.sin(rx) + z * Math.cos(rx);
    temp = x;
    x = x * Math.cos(ry) + z * Math.sin(ry);
    z = -temp * Math.sin(ry) + z * Math.cos(ry);
    temp = x;
    x = x * Math.cos(rz) - y * Math.sin(rz);
    y = temp * Math.sin(rz) + y * Math.cos(rz);
    return [x + center[0], y + center[1], z + center[2]];
  }
  function getVertices(mesh) {
    return Object.entries(mesh.vertices).map(([key, point]) => {
      let p = [...point];
      p[0] += mesh.origin[0];
      p[1] += mesh.origin[1];
      p[2] += mesh.origin[2];
      p = rotatePoint(p, mesh.origin, mesh.rotation);
      p[0] *= -1;
      return [key, p];
    });
  }
  function getVertexNormal(mesh, vertexKey, vertexFacesMap) {
    if (settings[SETTING_SKIP_NORMALS]?.value) {
      return [0, 1, 0];
    }
    let normalSum = [0, 0, 0];
    const faces = vertexFacesMap.get(vertexKey) || [];
    for (const faceKey of faces) {
      const face = mesh.faces[faceKey];
      const faceNormal = face.getNormal();
      normalSum[0] += faceNormal[0];
      normalSum[1] += faceNormal[1];
      normalSum[2] += faceNormal[2];
    }
    const normalLength = Math.sqrt(
      normalSum[0] * normalSum[0] + normalSum[1] * normalSum[1] + normalSum[2] * normalSum[2]
    );
    if (normalLength === 0) {
      return [0, 1, 0];
    }
    return [
      normalSum[0] / normalLength,
      normalSum[1] / normalLength,
      normalSum[2] / normalLength
    ];
  }
  function uvOnSave(u, v) {
    const Project2 = window.Project;
    const uv = [u, Project2.texture_height - v];
    if (!settings[SETTING_NORMALIZED_UVS]?.value) {
      return uv;
    }
    uv[0] /= Project2.texture_width;
    uv[1] /= Project2.texture_height;
    return uv;
  }
  function compileMesh(polyMesh, mesh) {
    polyMesh ?? (polyMesh = {
      normalized_uvs: settings[SETTING_NORMALIZED_UVS]?.value ?? true,
      positions: [],
      normals: [],
      uvs: [],
      polys: []
    });
    const positionMap = /* @__PURE__ */ new Map();
    const normalMap = /* @__PURE__ */ new Map();
    const uvMap = /* @__PURE__ */ new Map();
    const normals = /* @__PURE__ */ new Map();
    const vertexFacesMap = /* @__PURE__ */ new Map();
    for (const faceKey in mesh.faces) {
      const face = mesh.faces[faceKey];
      for (const vertexKey of face.vertices) {
        if (!vertexFacesMap.has(vertexKey)) {
          vertexFacesMap.set(vertexKey, []);
        }
        vertexFacesMap.get(vertexKey).push(faceKey);
      }
    }
    for (const [key, pos] of getVertices(mesh)) {
      positionMap.set(key, polyMesh.positions.length);
      polyMesh.positions.push(pos);
      const normal = getVertexNormal(mesh, key, vertexFacesMap);
      const normalKey = normal.toString();
      if (!normals.has(normalKey)) {
        normalMap.set(key, polyMesh.normals.length);
        normals.set(normalKey, polyMesh.normals.length);
        polyMesh.normals.push(normal);
      } else {
        normalMap.set(key, normals.get(normalKey));
      }
    }
    const polys = Object.values(mesh.faces).map((face) => {
      const poly = face.getSortedVertices().map((vertexKey) => {
        const uv = uvOnSave(face.uv[vertexKey][0], face.uv[vertexKey][1]);
        const uvKey = uv.toString();
        let uIndex = uvMap.get(uvKey);
        if (uIndex === void 0) {
          uIndex = polyMesh.uvs.length;
          polyMesh.uvs.push(uv);
          uvMap.set(uvKey, uIndex);
        }
        return [positionMap.get(vertexKey), normalMap.get(vertexKey), uIndex];
      });
      if (poly.length < 4) {
        return poly.concat(Array(4 - poly.length).fill(poly[0]));
      }
      return poly;
    });
    for (const poly of polys) {
      polyMesh.polys.push(poly);
    }
    return polyMesh;
  }

  // src/mesh/parse.ts
  function parseMesh(polyMesh, group) {
    const mesh = new Mesh({
      name: "mesh",
      autouv: 0,
      color: group.color,
      vertices: {}
    });
    const uniquePoints = /* @__PURE__ */ new Set();
    for (const face of polyMesh.polys) {
      const unique = /* @__PURE__ */ new Set();
      const vertices = [];
      const uvs = {};
      for (const point of face) {
        const pointKey = point.toString();
        if (unique.has(pointKey))
          continue;
        unique.add(pointKey);
        const posIndex = point[0];
        const uvIndex = point[2];
        if (!uniquePoints.has(posIndex)) {
          uniquePoints.add(posIndex);
          const position = [...polyMesh.positions[posIndex]];
          position[0] *= -1;
          mesh.vertices[`v${posIndex}`] = position;
        }
        vertices.push(`v${posIndex}`);
        const uv = [...polyMesh.uvs[uvIndex]];
        if (polyMesh.normalized_uvs) {
          uv[0] *= Project.texture_width;
          uv[1] *= Project.texture_height;
        }
        uv[1] = Project.texture_height - uv[1];
        uvs[`v${posIndex}`] = uv;
      }
      if (vertices.length >= 3) {
        mesh.addFaces(new MeshFace(mesh, { uv: uvs, vertices }));
      }
    }
    mesh.addTo(group).init();
  }

  // src/mesh/handlers.ts
  var COMPILE_HANDLER_NAME = "animorphMeshCompile";
  var COMPILE_BEDROCK_HANDLER_NAME = "animorphMeshCompileBedrock";
  var PARSE_HANDLER_NAME = "animorphMeshParse";
  function animorphMeshCompile({ model, options }) {
    const groups = getAllGroups();
    const looseElements = [];
    Outliner.root.forEach((obj) => {
      if (obj instanceof OutlinerElement) {
        looseElements.push(obj);
      }
    });
    if (looseElements.length) {
      const group = new Group({ name: "bb_main" });
      group.children.push(...looseElements);
      group.is_catch_bone = true;
      group.createUniqueName();
      groups.splice(0, 0, group);
    }
    for (const g of groups) {
      if (g.type !== "group" || g.export === false)
        continue;
      if (!settings.export_empty_groups?.value && !g.children.find((child) => child.export)) {
        continue;
      }
      const bone = model.bones.find((b) => b.name === g.name);
      if (!bone)
        continue;
      let polyMesh = null;
      for (const obj of g.children) {
        if (obj instanceof Mesh) {
          polyMesh = compileMesh(polyMesh, obj);
        }
      }
      if (polyMesh !== null) {
        bone.poly_mesh = polyMesh;
      }
    }
  }
  function animorphMeshCompileBedrock({ model, options }) {
    const geometry = model["minecraft:geometry"]?.[0];
    if (geometry) {
      animorphMeshCompile({ model: geometry, options });
    }
  }
  function animorphMeshParse({ model }) {
    const bones = model["minecraft:geometry"]?.[0]?.bones ?? model.bones;
    if (!bones)
      return;
    setTimeout(() => {
      for (let i = 0; i < bones.length; i++) {
        const bone = bones[i];
        if (bone.poly_mesh == null)
          continue;
        let group = Project.groups?.find((g) => g.name === bone.name);
        if (!group) {
          group = findGroupByName(bone.name);
        }
        if (!group) {
          console.warn(`Group "${bone.name}" not found, creating new one`);
          group = new Group({ name: bone.name });
          group.init();
        }
        parseMesh(bone.poly_mesh, group);
      }
    }, 50);
  }
  function findGroupByName(name) {
    function searchInChildren(children) {
      for (const child of children) {
        if (child.type === "group" && child.name === name) {
          return child;
        }
        if (child.children) {
          const found = searchInChildren(child.children);
          if (found)
            return found;
        }
      }
      return null;
    }
    return searchInChildren(Outliner.root);
  }
  function purgeEvents(codec) {
    const handlerNames = [COMPILE_HANDLER_NAME, COMPILE_BEDROCK_HANDLER_NAME, PARSE_HANDLER_NAME];
    for (const eventType of ["parsed", "compile"]) {
      const events = codec.events?.[eventType];
      if (!events)
        continue;
      for (let i = events.length - 1; i >= 0; i--) {
        if (handlerNames.includes(events[i].name)) {
          events.splice(i, 1);
        }
      }
    }
  }
  function installMeshSupport() {
    Formats["bedrock"].meshes = true;
    Formats["bedrock_old"].meshes = true;
    if (Formats["geckolib_model"]) {
      Formats["geckolib_model"].meshes = true;
    }
    if (!settings[SETTING_NORMALIZED_UVS]) {
      new Setting(SETTING_NORMALIZED_UVS, {
        id: SETTING_NORMALIZED_UVS,
        name: "Normalize Mesh UVs",
        description: "Normalize UVs of polymeshes (0-1 range)",
        category: "export",
        value: true,
        plugin: PLUGIN_ID
      });
    }
    if (!settings[SETTING_SKIP_NORMALS]) {
      new Setting(SETTING_SKIP_NORMALS, {
        id: SETTING_SKIP_NORMALS,
        name: "Skip Mesh Normals",
        description: "Skip normal calculation on polymeshes (uses default up vector)",
        category: "export",
        value: false,
        plugin: PLUGIN_ID
      });
    }
    const bedrockCodec = Codecs["bedrock"];
    if (bedrockCodec) {
      purgeEvents(bedrockCodec);
      bedrockCodec.on("parsed", animorphMeshParse);
      bedrockCodec.on("compile", animorphMeshCompileBedrock);
    }
    const bedrockOldCodec = Codecs["bedrock_old"];
    if (bedrockOldCodec) {
      purgeEvents(bedrockOldCodec);
      bedrockOldCodec.on("parsed", animorphMeshParse);
      bedrockOldCodec.on("compile", animorphMeshCompile);
    }
    const geckolibCodec = Codecs["geckolib_model"];
    if (geckolibCodec) {
      purgeEvents(geckolibCodec);
      geckolibCodec.on("parsed", animorphMeshParse);
      geckolibCodec.on("compile", animorphMeshCompileBedrock);
    }
    debugLog("\u2713 Mesh support installed");
  }
  function uninstallMeshSupport() {
    Formats["bedrock"].meshes = false;
    Formats["bedrock_old"].meshes = false;
    Formats["bedrock"].single_texture = true;
    Formats["bedrock_old"].single_texture = true;
    if (Formats["geckolib_model"]) {
      Formats["geckolib_model"].meshes = false;
    }
    if (settings[SETTING_NORMALIZED_UVS]) {
      settings[SETTING_NORMALIZED_UVS].delete();
    }
    if (settings[SETTING_SKIP_NORMALS]) {
      settings[SETTING_SKIP_NORMALS].delete();
    }
    const codecs = ["bedrock", "bedrock_old", "geckolib_model"];
    for (const codecName of codecs) {
      const codec = Codecs[codecName];
      if (codec) {
        purgeEvents(codec);
      }
    }
    debugLog("\u2713 Mesh support uninstalled");
  }

  // src/text-display/constants.ts
  var TEXT_DISPLAY_DEFAULT_CONTENT = "Text";
  var TEXT_DISPLAY_DEFAULT_COLOR = "#ffffff";
  var TEXT_DISPLAY_DEFAULT_BACKGROUND = "#000000";
  var TEXT_DISPLAY_DEFAULT_BACKGROUND_ENABLED = true;
  var TEXT_DISPLAY_DEFAULT_ALIGNMENT = "center";
  var TEXT_DISPLAY_DEFAULT_PADDING = 16;

  // src/text-display/renderer.ts
  function createTextTexture(options) {
    const {
      content = "Text",
      color = TEXT_DISPLAY_DEFAULT_COLOR,
      background = TEXT_DISPLAY_DEFAULT_BACKGROUND,
      background_enabled = TEXT_DISPLAY_DEFAULT_BACKGROUND_ENABLED,
      alignment = TEXT_DISPLAY_DEFAULT_ALIGNMENT,
      padding = TEXT_DISPLAY_DEFAULT_PADDING
    } = options;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const fontSize = 64;
    ctx.font = `bold ${fontSize}px Arial`;
    const metrics = ctx.measureText(content || " ");
    const textWidth = metrics.width;
    const textHeight = fontSize;
    canvas.width = Math.ceil(textWidth + padding * 2);
    canvas.height = Math.ceil(textHeight + padding * 2);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (background_enabled) {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.fillStyle = color;
    ctx.textBaseline = "middle";
    let x;
    switch (alignment) {
      case "left":
        ctx.textAlign = "left";
        x = padding;
        break;
      case "right":
        ctx.textAlign = "right";
        x = canvas.width - padding;
        break;
      case "center":
      default:
        ctx.textAlign = "center";
        x = canvas.width / 2;
        break;
    }
    ctx.fillText(content || " ", x, canvas.height / 2);
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    return {
      texture,
      width: canvas.width,
      height: canvas.height,
      aspectRatio: canvas.width / canvas.height
    };
  }
  function createTextMesh(options) {
    const { texture, aspectRatio } = createTextTexture(options);
    const geometry = new THREE.PlaneGeometry(1, 1);
    geometry.userData = { aspectRatio };
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
      depthTest: true,
      depthWrite: true
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = "text_display_mesh";
    mesh.visible = true;
    mesh.renderOrder = 999;
    return mesh;
  }
  function updateTextMesh(mesh, options) {
    const { texture, aspectRatio } = createTextTexture(options);
    if (mesh.material.map) {
      mesh.material.map.dispose();
    }
    mesh.material.map = texture;
    mesh.material.needsUpdate = true;
    mesh.geometry.dispose();
    mesh.geometry = new THREE.PlaneGeometry(1, 1);
    mesh.geometry.userData = { aspectRatio };
  }
  function disposeTextMesh(mesh) {
    if (mesh.material.map) {
      mesh.material.map.dispose();
    }
    mesh.material.dispose();
    mesh.geometry.dispose();
  }

  // src/text-display/element.ts
  var textMeshes = /* @__PURE__ */ new Map();
  var textDisplayData = /* @__PURE__ */ new Map();
  var allTextDisplays = [];
  var TEXT_DISPLAY_NAME_PREFIX = "text_display";
  var registeredProperties = [];
  function registerTextDisplayType() {
    registeredProperties = [
      new Property(Cube, "boolean", "is_text_display", { default: false }),
      new Property(Cube, "string", "text_content", { default: "Text" }),
      new Property(Cube, "string", "text_color", { default: "#ffffff" }),
      new Property(Cube, "string", "text_background", { default: "#000000" }),
      new Property(Cube, "boolean", "text_background_enabled", { default: true }),
      new Property(Cube, "string", "text_alignment", { default: "center" }),
      new Property(Cube, "number", "text_padding", { default: 16 })
    ];
    debugLog("\u2713 TextDisplay type registered with", registeredProperties.length, "properties");
  }
  function unregisterTextDisplayType() {
    for (const [uuid, mesh] of textMeshes) {
      if (mesh.parent) {
        mesh.parent.remove(mesh);
      }
      disposeTextMesh(mesh);
    }
    textMeshes.clear();
    textDisplayData.clear();
    allTextDisplays.length = 0;
    for (const prop of registeredProperties) {
      if (prop.delete) {
        prop.delete();
      }
    }
    registeredProperties = [];
    debugLog("\u2713 TextDisplay type unregistered");
  }
  function saveTextDisplayData(cube) {
    textDisplayData.set(cube.uuid, {
      content: cube.text_content,
      color: colorToString(cube.text_color),
      background: colorToString(cube.text_background),
      background_enabled: cube.text_background_enabled,
      alignment: cube.text_alignment,
      padding: cube.text_padding
    });
  }
  function isTextDisplay(cube) {
    if (!cube)
      return false;
    if (cube.is_text_display)
      return true;
    if (textDisplayData.has(cube.uuid))
      return true;
    if (cube.name && cube.name.startsWith(TEXT_DISPLAY_NAME_PREFIX)) {
      return textDisplayData.has(cube.uuid) || allTextDisplays.some((td) => td.uuid === cube.uuid);
    }
    return false;
  }
  function normalizeTextDisplayColors(cube) {
    if (cube.text_color) {
      cube.text_color = colorToString(cube.text_color);
    }
    if (cube.text_background) {
      cube.text_background = colorToString(cube.text_background);
    }
  }
  function createTextDisplayElement(data = {}) {
    debugLog("[TextDisplay] Creating new text display cube...");
    const targetGroup = Group.selected?.[0];
    const cube = new Cube({
      name: data.name || "text_display",
      from: data.from || [-4, 0, -0.5],
      to: data.to || [4, 4, 0.5],
      origin: data.origin || [0, 0, 0],
      rotation: data.rotation || [0, 0, 0],
      visibility: true
    });
    cube.text_content = data.content ?? TEXT_DISPLAY_DEFAULT_CONTENT;
    cube.text_color = colorToString(data.text_color ?? TEXT_DISPLAY_DEFAULT_COLOR);
    cube.text_background = colorToString(data.background_color ?? TEXT_DISPLAY_DEFAULT_BACKGROUND);
    cube.text_background_enabled = data.background_enabled ?? TEXT_DISPLAY_DEFAULT_BACKGROUND_ENABLED;
    cube.text_alignment = data.alignment ?? TEXT_DISPLAY_DEFAULT_ALIGNMENT;
    cube.text_padding = data.padding ?? TEXT_DISPLAY_DEFAULT_PADDING;
    cube.is_text_display = true;
    Undo.initEdit({ elements: [cube], outliner: true });
    if (targetGroup) {
      cube.addTo(targetGroup).init();
    } else {
      cube.init();
    }
    hideOriginalCubeMesh(cube);
    createTextMeshForCube(cube);
    saveTextDisplayData(cube);
    allTextDisplays.push(cube);
    cube.select();
    Undo.finishEdit("Add text display");
    Canvas.updateAll();
    return cube;
  }
  function hideOriginalCubeMesh(cube) {
    if (cube.mesh) {
      cube.mesh.visible = false;
    }
  }
  function createTextMeshForCube(cube) {
    if (textMeshes.has(cube.uuid)) {
      return;
    }
    const mesh = createTextMesh({
      content: cube.text_content,
      color: cube.text_color,
      background: cube.text_background,
      background_enabled: cube.text_background_enabled ?? true,
      alignment: cube.text_alignment,
      padding: cube.text_padding ?? 16
    });
    mesh.name = `text_mesh_${cube.uuid}`;
    textMeshes.set(cube.uuid, mesh);
    updateTextMeshFromCube(cube);
  }
  function findParentGroupMesh(cube) {
    let parent = cube.parent;
    while (parent) {
      if (parent instanceof Group && parent.mesh) {
        return parent.mesh;
      }
      parent = parent.parent;
    }
    return null;
  }
  function updateTextMeshFromCube(cube) {
    const mesh = textMeshes.get(cube.uuid);
    if (!mesh)
      return;
    mesh.visible = cube.visibility !== false;
    const from = cube.from || [0, 0, 0];
    const to = cube.to || [1, 1, 1];
    const sizeX = Math.abs(to[0] - from[0]);
    const sizeY = Math.abs(to[1] - from[1]);
    mesh.scale.set(sizeX, sizeY, 1);
    const parentGroupMesh = findParentGroupMesh(cube);
    const targetParent = parentGroupMesh || Project?.model_3d;
    if (!mesh.parent || mesh.parent !== targetParent) {
      if (mesh.parent) {
        mesh.parent.remove(mesh);
      }
      if (targetParent) {
        targetParent.add(mesh);
      }
    }
    const rotation = cube.rotation || [0, 0, 0];
    const origin = cube.origin || [0, 0, 0];
    const centerX = (from[0] + to[0]) / 2;
    const centerY = (from[1] + to[1]) / 2;
    const centerZ = (from[2] + to[2]) / 2;
    const relX = centerX - origin[0];
    const relY = centerY - origin[1];
    const relZ = centerZ - origin[2];
    const euler = new THREE.Euler(
      THREE.MathUtils.degToRad(-rotation[0]),
      THREE.MathUtils.degToRad(rotation[1]),
      THREE.MathUtils.degToRad(rotation[2]),
      "ZYX"
    );
    const pos = new THREE.Vector3(relX, relY, relZ);
    pos.applyEuler(euler);
    const modelX = origin[0] + pos.x;
    const modelY = origin[1] + pos.y;
    const modelZ = origin[2] + pos.z;
    if (parentGroupMesh) {
      const parentGroup = cube.parent;
      const boneOrigin = parentGroup?.origin || [0, 0, 0];
      mesh.position.set(
        modelX - boneOrigin[0],
        modelY - boneOrigin[1],
        modelZ - boneOrigin[2]
      );
    } else {
      mesh.position.set(modelX, modelY, modelZ);
    }
    mesh.rotation.set(
      THREE.MathUtils.degToRad(-rotation[0]),
      THREE.MathUtils.degToRad(rotation[1] + 180),
      THREE.MathUtils.degToRad(rotation[2]),
      "ZYX"
    );
  }
  function updateTextDisplayElement(cube, newData) {
    if (newData.name !== void 0)
      cube.name = newData.name;
    if (newData.content !== void 0)
      cube.text_content = newData.content;
    if (newData.text_color !== void 0)
      cube.text_color = newData.text_color;
    if (newData.background_color !== void 0)
      cube.text_background = newData.background_color;
    if (newData.background_enabled !== void 0)
      cube.text_background_enabled = newData.background_enabled;
    if (newData.alignment !== void 0)
      cube.text_alignment = newData.alignment;
    if (newData.padding !== void 0)
      cube.text_padding = newData.padding;
    saveTextDisplayData(cube);
    const mesh = textMeshes.get(cube.uuid);
    if (mesh) {
      updateTextMesh(mesh, {
        content: cube.text_content,
        color: cube.text_color,
        background: cube.text_background,
        background_enabled: cube.text_background_enabled ?? true,
        alignment: cube.text_alignment,
        padding: cube.text_padding ?? 16
      });
      updateTextMeshFromCube(cube);
    }
  }
  function removeTextDisplayElement(cube) {
    const mesh = textMeshes.get(cube.uuid);
    if (mesh) {
      if (mesh.parent) {
        mesh.parent.remove(mesh);
      }
      disposeTextMesh(mesh);
      textMeshes.delete(cube.uuid);
    }
    const index = allTextDisplays.indexOf(cube);
    if (index >= 0) {
      allTextDisplays.splice(index, 1);
    }
  }
  function getTextDisplayMesh(cube) {
    if (!cube)
      return void 0;
    const uuid = typeof cube === "string" ? cube : cube.uuid;
    return textMeshes.get(uuid);
  }
  function removeTextMesh(cube) {
    if (!cube)
      return;
    const uuid = typeof cube === "string" ? cube : cube.uuid;
    const mesh = textMeshes.get(uuid);
    if (mesh) {
      if (mesh.parent) {
        mesh.parent.remove(mesh);
      }
      disposeTextMesh(mesh);
      textMeshes.delete(uuid);
    }
  }
  function syncAllTextDisplays() {
    for (const cube of allTextDisplays) {
      if (cube && cube.is_text_display) {
        hideOriginalCubeMesh(cube);
        updateTextMeshFromCube(cube);
      }
    }
  }
  function recreateAllTextMeshes() {
    for (const [uuid, mesh] of textMeshes) {
      if (mesh.parent) {
        mesh.parent.remove(mesh);
      }
      disposeTextMesh(mesh);
    }
    textMeshes.clear();
    allTextDisplays.length = 0;
    if (typeof Cube !== "undefined" && Cube.all) {
      for (const cube of Cube.all) {
        if (cube && cube.is_text_display) {
          allTextDisplays.push(cube);
          hideOriginalCubeMesh(cube);
          createTextMeshForCube(cube);
        }
      }
    }
  }

  // src/text-display/dialog.ts
  function openTextDisplayDialog(cube) {
    const dialog = new Dialog({
      id: "text_display_properties",
      title: "Text Display Properties",
      width: 400,
      form: {
        name: {
          label: "Name",
          type: "text",
          value: cube.name
        },
        content: {
          label: "Text Content",
          type: "text",
          value: cube.text_content || "Text"
        },
        text_color: {
          label: "Text Color",
          type: "color",
          value: cube.text_color || TEXT_DISPLAY_DEFAULT_COLOR
        },
        divider1: "_",
        background_enabled: {
          label: "Show Background",
          type: "checkbox",
          value: cube.text_background_enabled ?? TEXT_DISPLAY_DEFAULT_BACKGROUND_ENABLED
        },
        background_color: {
          label: "Background Color",
          type: "color",
          value: cube.text_background || TEXT_DISPLAY_DEFAULT_BACKGROUND,
          condition: (form) => form.background_enabled
        },
        divider2: "_",
        alignment: {
          label: "Alignment",
          type: "select",
          value: cube.text_alignment || "center",
          options: {
            left: "Left",
            center: "Center",
            right: "Right"
          }
        },
        padding: {
          label: "Padding",
          type: "number",
          value: cube.text_padding ?? TEXT_DISPLAY_DEFAULT_PADDING,
          min: 0,
          max: 64,
          step: 1
        }
      },
      onConfirm: (formData) => {
        Undo.initEdit({ elements: [cube] });
        updateTextDisplayElement(cube, {
          name: formData.name,
          content: formData.content,
          text_color: formData.text_color,
          background_color: formData.background_color,
          background_enabled: formData.background_enabled,
          alignment: formData.alignment,
          padding: formData.padding
        });
        Undo.finishEdit("Edit text display");
        Canvas.updateAll();
        dialog.hide();
      }
    });
    dialog.show();
  }

  // src/text-display/io.ts
  var isParsing = false;
  function isParsingModel() {
    return isParsing;
  }
  function findTextDisplayForExportedCube(boneName, cubeData, cubeIndex) {
    const textDisplaysInBone = allTextDisplays.filter((td) => {
      if (!td || !isTextDisplay(td))
        return false;
      const parent = td.parent;
      return parent && parent.name === boneName;
    });
    if (textDisplaysInBone.length === 0)
      return null;
    if (textDisplaysInBone.length === 1)
      return textDisplaysInBone[0];
    for (const td of textDisplaysInBone) {
      const from = td.from || [0, 0, 0];
      const cubeOrigin = cubeData.origin || [0, 0, 0];
      const matches = Math.abs(cubeOrigin[0] - from[0]) < 0.1 && Math.abs(cubeOrigin[1] - from[1]) < 0.1 && Math.abs(cubeOrigin[2] - from[2]) < 0.1;
      if (matches)
        return td;
    }
    return null;
  }
  function onCompileTextDisplay({ model }) {
    const geometry = model["minecraft:geometry"]?.[0];
    if (!geometry || !geometry.bones)
      return;
    for (const bone of geometry.bones) {
      if (!bone.cubes)
        continue;
      for (let i = 0; i < bone.cubes.length; i++) {
        const cube = bone.cubes[i];
        const td = findTextDisplayForExportedCube(bone.name, cube, i);
        if (td) {
          cube.text_display = {
            content: td.text_content || "Text",
            color: colorToString(td.text_color),
            background: colorToString(td.text_background),
            background_enabled: td.text_background_enabled ?? true,
            alignment: td.text_alignment || "center",
            padding: td.text_padding ?? 16
          };
        }
      }
    }
  }
  function onCompileTextDisplayLegacy({ model }) {
    if (!model.bones)
      return;
    for (const bone of model.bones) {
      if (!bone.cubes)
        continue;
      for (let i = 0; i < bone.cubes.length; i++) {
        const cube = bone.cubes[i];
        const td = findTextDisplayForExportedCube(bone.name, cube, i);
        if (td) {
          cube.text_display = {
            content: td.text_content || "Text",
            color: colorToString(td.text_color),
            background: colorToString(td.text_background),
            background_enabled: td.text_background_enabled ?? true,
            alignment: td.text_alignment || "center",
            padding: td.text_padding ?? 16
          };
        }
      }
    }
  }
  function onParseTextDisplay({ model }) {
    const geometry = model["minecraft:geometry"]?.[0];
    const bones = geometry?.bones ?? model.bones;
    if (!bones)
      return;
    const textDisplayData2 = /* @__PURE__ */ new Map();
    for (const bone of bones) {
      if (!bone.cubes)
        continue;
      for (let i = 0; i < bone.cubes.length; i++) {
        const cubeData = bone.cubes[i];
        if (cubeData.text_display) {
          debugLog("Found text_display in bone:", bone.name, "cube index:", i);
          textDisplayData2.set(bone.name, {
            ...cubeData.text_display,
            cubeIndex: i
          });
        }
      }
    }
    if (textDisplayData2.size === 0) {
      debugLog("No text_display data found in model");
      return;
    }
    debugLog("Found", textDisplayData2.size, "bones with text_display");
    isParsing = true;
    setTimeout(() => {
      convertCubesToTextDisplays(textDisplayData2);
      isParsing = false;
    }, 200);
  }
  function convertCubesToTextDisplays(textDisplayData2) {
    if (typeof Cube === "undefined" || !Cube.all)
      return;
    debugLog("Converting cubes, total cubes:", Cube.all.length);
    for (const cube of Cube.all) {
      const parentGroup = cube.parent;
      const boneName = parentGroup?.name;
      if (!boneName || !textDisplayData2.has(boneName))
        continue;
      const matchedData = textDisplayData2.get(boneName);
      debugLog("Match found for cube in bone:", boneName);
      textDisplayData2.delete(boneName);
      if (matchedData && !cube.is_text_display) {
        debugLog("Converting cube to TextDisplay:", cube.name);
        cube.is_text_display = true;
        cube.text_content = matchedData.content || "Text";
        cube.text_color = matchedData.color || "#ffffff";
        cube.text_background = matchedData.background || "#000000";
        cube.text_background_enabled = matchedData.background_enabled ?? true;
        cube.text_alignment = matchedData.alignment || "center";
        cube.text_padding = matchedData.padding ?? 16;
        allTextDisplays.push(cube);
        hideOriginalCubeMesh(cube);
        createTextMeshForCube(cube);
        saveTextDisplayData(cube);
      }
    }
  }
  function installTextDisplayIO() {
    const codecs = ["bedrock", "bedrock_old", "geckolib_model"];
    for (const codecName of codecs) {
      const codec = Codecs[codecName];
      if (!codec)
        continue;
      if (codecName === "bedrock_old") {
        codec.on("compile", onCompileTextDisplayLegacy);
      } else {
        codec.on("compile", onCompileTextDisplay);
      }
      codec.on("parsed", onParseTextDisplay);
    }
    debugLog("\u2713 TextDisplay IO handlers installed");
  }
  function uninstallTextDisplayIO() {
    debugLog("\u2713 TextDisplay IO handlers uninstalled");
  }

  // src/text-display/actions.ts
  var addTextDisplayAction = null;
  var editTextDisplayAction = null;
  function createTextDisplay() {
    try {
      const textDisplay = createTextDisplayElement({
        name: "text_display",
        content: "Text"
      });
      if (textDisplay) {
        openTextDisplayDialog(textDisplay);
      }
    } catch (error) {
      console.error("[TextDisplay] Error creating text display:", error);
    }
  }
  function editSelectedTextDisplay() {
    const selected = Cube.selected.find((c) => isTextDisplay(c));
    if (selected) {
      openTextDisplayDialog(selected);
    }
  }
  function onUpdateSelection() {
    cleanupDeletedTextDisplays();
    syncAllTextDisplays();
    checkForNewTextDisplays();
  }
  function onOutlinerChange() {
    for (const cube of allTextDisplays) {
      if (cube && isTextDisplay(cube)) {
        updateTextMeshFromCube(cube);
      }
    }
  }
  function onUpdateView() {
    cleanupDeletedTextDisplays();
    for (const cube of allTextDisplays) {
      if (cube && isTextDisplay(cube)) {
        hideOriginalCubeMesh(cube);
        updateTextMeshFromCube(cube);
      }
    }
  }
  function onSelectProject() {
    recreateAllTextMeshes();
  }
  function checkForNewTextDisplays() {
    if (isParsingModel())
      return;
    if (typeof Cube === "undefined" || !Cube.all)
      return;
    for (const cube of Cube.all) {
      if (cube && cube.is_text_display) {
        const existsInList = allTextDisplays.some((td) => td.uuid === cube.uuid);
        const hasMesh = getTextDisplayMesh(cube) !== void 0;
        if (!existsInList || !hasMesh) {
          normalizeTextDisplayColors(cube);
          if (!cube.text_content) {
            cube.text_content = "Text";
            cube.text_color = "#ffffff";
            cube.text_background = "#000000";
            cube.text_background_enabled = true;
            cube.text_alignment = "center";
            cube.text_padding = 16;
          }
          if (!existsInList) {
            allTextDisplays.push(cube);
          }
          hideOriginalCubeMesh(cube);
          removeTextMesh(cube);
          createTextMeshForCube(cube);
          saveTextDisplayData(cube);
        }
      }
    }
  }
  function cleanupDeletedTextDisplays() {
    for (let i = allTextDisplays.length - 1; i >= 0; i--) {
      const cube = allTextDisplays[i];
      if (!cube || !cube.mesh || !cube.mesh.parent) {
        debugLog("[TextDisplay] Cleaning up deleted text display:", cube?.uuid);
        removeTextDisplayElement(cube);
      }
    }
  }
  function onRenderFrame() {
    for (const cube of allTextDisplays) {
      if (cube && cube.is_text_display && cube.mesh && cube.mesh.parent) {
        if (cube.mesh.visible) {
          cube.mesh.visible = false;
        }
      }
    }
  }
  function registerTextDisplayActions() {
    addTextDisplayAction = new Action("add_text_display", {
      name: "Text Display",
      icon: "text_fields",
      description: "Add a 3D text display element",
      click: createTextDisplay
    });
    editTextDisplayAction = new Action("edit_text_display", {
      name: "Edit Text Display",
      icon: "edit",
      description: "Edit the selected text display",
      condition: () => Cube.selected?.some((c) => isTextDisplay(c)),
      click: editSelectedTextDisplay
    });
    const addElementAction = BarItems?.add_element;
    if (addElementAction?.side_menu?.structure) {
      addElementAction.side_menu.structure.push("add_text_display");
    }
    Cube.prototype.menu.structure.push("_", "edit_text_display");
    Blockbench.on("update_selection", onUpdateSelection);
    Blockbench.on("update_view", onUpdateView);
    Blockbench.on("select_project", onSelectProject);
    Blockbench.on("render_frame", onRenderFrame);
    Blockbench.on("update_outliner_structure", onOutlinerChange);
    debugLog("\u2713 TextDisplay actions registered");
  }
  function unregisterTextDisplayActions() {
    const addElementAction = BarItems?.add_element;
    if (addElementAction?.side_menu?.structure) {
      const index = addElementAction.side_menu.structure.indexOf("add_text_display");
      if (index > -1) {
        addElementAction.side_menu.structure.splice(index, 1);
      }
    }
    if (Cube.prototype.menu?.structure) {
      const editIndex = Cube.prototype.menu.structure.indexOf("edit_text_display");
      if (editIndex > -1) {
        const separatorIndex = Cube.prototype.menu.structure.indexOf("_", editIndex - 1);
        if (separatorIndex === editIndex - 1) {
          Cube.prototype.menu.structure.splice(separatorIndex, 2);
        } else {
          Cube.prototype.menu.structure.splice(editIndex, 1);
        }
      }
    }
    if (addTextDisplayAction) {
      addTextDisplayAction.delete();
      addTextDisplayAction = null;
    }
    if (editTextDisplayAction) {
      editTextDisplayAction.delete();
      editTextDisplayAction = null;
    }
    Blockbench.removeListener("update_selection", onUpdateSelection);
    Blockbench.removeListener("update_view", onUpdateView);
    Blockbench.removeListener("select_project", onSelectProject);
    Blockbench.removeListener("render_frame", onRenderFrame);
    Blockbench.removeListener("update_outliner_structure", onOutlinerChange);
    debugLog("\u2713 TextDisplay actions unregistered");
  }

  // src/layers/index.ts
  var LAYER_SEPARATOR2 = ".";
  var autoEnabledMultiTextures = false;
  var importLayerAction = null;
  var reloadLayerAction = null;
  var reloadAllLayersAction = null;
  var saveLayerAction = null;
  var deleteHandler = null;
  var toggleVisibilityAction = null;
  var exportLayerAnimAction = null;
  var exportLayerModelAction = null;
  var saveLayerToFileAction = null;
  var reloadMainModelAction = null;
  var layerSaveObserver = null;
  var ctrlSHandler = null;
  var currentProjectPath = null;
  var selectProjectHandler = null;
  var compileFilterHandlers = [];
  var animCompileFilterHandler = null;
  var layerAnimBuffer = /* @__PURE__ */ new Map();
  var compileFlushTimer = null;
  function guid() {
    return "xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      return (c === "x" ? r : r & 3 | 8).toString(16);
    });
  }
  function findBoneUuidInBBModel(bbmodel, boneName) {
    if (!bbmodel.outliner)
      return null;
    function search(nodes) {
      for (const node of nodes) {
        if (node && typeof node === "object") {
          if (node.name === boneName && node.uuid)
            return node.uuid;
          if (node.children) {
            const found = search(node.children.filter((c) => typeof c === "object"));
            if (found)
              return found;
          }
        }
      }
      return null;
    }
    return search(bbmodel.outliner);
  }
  var SUPPORTED_FORMATS = [
    "animated_entity_model",
    "geckolib_model",
    "bedrock",
    "bedrock_old"
  ];
  function enableMultiTextures() {
    if (Formats["bedrock"]) {
      Formats["bedrock"].single_texture = false;
    }
    if (Formats["bedrock_old"]) {
      Formats["bedrock_old"].single_texture = false;
    }
    if (Formats["animated_entity_model"]) {
      Formats["animated_entity_model"].single_texture = false;
    }
    if (Formats["geckolib_model"]) {
      Formats["geckolib_model"].single_texture = false;
    }
    debugLog("[Layers] Multi-textures enabled");
  }
  function disableMultiTextures() {
    if (Formats["bedrock"]) {
      Formats["bedrock"].single_texture = true;
    }
    if (Formats["bedrock_old"]) {
      Formats["bedrock_old"].single_texture = true;
    }
    if (Formats["animated_entity_model"]) {
      Formats["animated_entity_model"].single_texture = true;
    }
    if (Formats["geckolib_model"]) {
      Formats["geckolib_model"].single_texture = true;
    }
    debugLog("[Layers] Multi-textures disabled");
  }
  function hasLayers() {
    return Collection.all.some((c) => c.export_codec === "animorph_layer");
  }
  function updateMultiTexturesState() {
    if (hasLayers()) {
      if (!autoEnabledMultiTextures) {
        enableMultiTextures();
        autoEnabledMultiTextures = true;
      }
    } else {
      if (autoEnabledMultiTextures) {
        disableMultiTextures();
        autoEnabledMultiTextures = false;
      }
    }
  }
  function supportsLayers() {
    if (!Format)
      return false;
    if (SUPPORTED_FORMATS.includes(Format.id))
      return true;
    const formatName = (Format.name || "").toLowerCase();
    const formatId = (Format.id || "").toLowerCase();
    if (formatName.includes("gecko") || formatId.includes("gecko"))
      return true;
    if (formatName.includes("bedrock") || formatId.includes("bedrock"))
      return true;
    if (formatName.includes("entity") || formatId.includes("entity"))
      return true;
    return false;
  }
  function discoverTexturePaths(dirname, modelName) {
    if (!isApp)
      return [];
    const fs = requireNativeModule("fs");
    const paths = [];
    try {
      const dirFiles = fs.readdirSync(dirname);
      for (const fileName of dirFiles) {
        if (fileName.match(/\.png$/i) && (fileName.startsWith(modelName) || fileName === "texture.png")) {
          paths.push(PathModule.join(dirname, fileName));
        }
      }
      const texturesFolderPath = PathModule.join(dirname, `${modelName}_textures`);
      if (fs.existsSync(texturesFolderPath) && fs.statSync(texturesFolderPath).isDirectory()) {
        const folderFiles = fs.readdirSync(texturesFolderPath);
        for (const fileName of folderFiles) {
          if (fileName.match(/\.png$/i)) {
            paths.push(PathModule.join(texturesFolderPath, fileName));
          }
        }
      }
    } catch (e) {
      console.error("[Layers] Error discovering textures:", e);
    }
    return [...new Set(paths)];
  }
  function addTextureBypass(texture) {
    if (!texture.uuid) {
      texture.uuid = Blockbench.guid();
    }
    if (!Texture.all.includes(texture)) {
      Texture.all.push(texture);
    }
    if (Project && Project.textures && !Project.textures.includes(texture)) {
      Project.textures.push(texture);
    }
  }
  function processLayerTextures(layerName, newTextures, uvWidth, uvHeight) {
    if (newTextures.length === 0)
      return "";
    const textureGroup = new TextureGroup({ name: layerName });
    textureGroup.folded = true;
    textureGroup.add();
    for (const tex of newTextures) {
      tex.group = textureGroup.uuid;
      tex.layer_uv_width = uvWidth;
      tex.layer_uv_height = uvHeight;
    }
    const texture = newTextures.find((t) => t.name.startsWith(layerName)) ?? newTextures[0];
    return texture.uuid;
  }
  function getMainProjectTexture() {
    for (const tex of Texture.all) {
      const isLayerTexture = TextureGroup.all.some((tg) => {
        if (tex.group !== tg.uuid)
          return false;
        return Collection.all.some((c) => c.export_codec === "animorph_layer" && c.name === tg.name);
      });
      if (!isLayerTexture) {
        return tex;
      }
    }
    return Texture.all[0];
  }
  function reapplyMainTexture() {
    const mainTexture = getMainProjectTexture();
    if (!mainTexture)
      return;
    const layerCubeUuids = /* @__PURE__ */ new Set();
    for (const collection of Collection.all) {
      if (collection.export_codec === "animorph_layer" && collection.layer_elements) {
        for (const uuid of collection.layer_elements) {
          layerCubeUuids.add(uuid);
        }
      }
    }
    const faceNames = ["north", "east", "south", "west", "up", "down"];
    for (const cube of Cube.all) {
      if (layerCubeUuids.has(cube.uuid))
        continue;
      if (cube.faces) {
        for (const faceName of faceNames) {
          if (cube.faces[faceName]) {
            cube.faces[faceName].texture = mainTexture.uuid;
          }
        }
      }
      if (cube.mesh && mainTexture.getMaterial) {
        const material = mainTexture.getMaterial();
        if (material) {
          cube.mesh.material = material;
        }
      }
    }
  }
  function scaleUVToProject(uv, layerUvWidth, layerUvHeight) {
    const projectUvWidth = Project.texture_width || 64;
    const projectUvHeight = Project.texture_height || 64;
    const scaleX = projectUvWidth / layerUvWidth;
    const scaleY = projectUvHeight / layerUvHeight;
    return [
      uv[0] * scaleX,
      uv[1] * scaleY,
      uv[2] * scaleX,
      uv[3] * scaleY
    ];
  }
  function applyTextureToLayerCube(cube, texture) {
    if (!cube || !texture)
      return;
    const faceNames = ["north", "east", "south", "west", "up", "down"];
    for (const faceName of faceNames) {
      if (cube.faces && cube.faces[faceName]) {
        cube.faces[faceName].texture = texture.uuid;
      }
    }
    if (cube.mesh && texture.getMaterial) {
      const material = texture.getMaterial();
      if (material) {
        cube.mesh.material = material;
      }
    }
  }
  function parseBedrockGeometry(json, layerName) {
    const groups = [];
    const cubes = [];
    const allElements = [];
    const rootGroups = [];
    const groupMap = /* @__PURE__ */ new Map();
    let uvWidth = 64;
    let uvHeight = 64;
    let geometry = null;
    if (json["minecraft:geometry"]) {
      geometry = Array.isArray(json["minecraft:geometry"]) ? json["minecraft:geometry"][0] : json["minecraft:geometry"];
    } else if (json.bones) {
      geometry = json;
    }
    if (!geometry) {
      return { groups, cubes, allElements, rootGroups, uvWidth, uvHeight };
    }
    if (geometry.description) {
      uvWidth = geometry.description.texture_width || 64;
      uvHeight = geometry.description.texture_height || 64;
    }
    if (!geometry.bones) {
      return { groups, cubes, allElements, rootGroups, uvWidth, uvHeight };
    }
    for (const bone of geometry.bones) {
      const prefixedName = `${layerName}${LAYER_SEPARATOR2}${bone.name}`;
      const group = new Group({
        name: prefixedName,
        origin: bone.pivot ? [-bone.pivot[0], bone.pivot[1], bone.pivot[2]] : [0, 0, 0],
        rotation: bone.rotation ? [-bone.rotation[0], -bone.rotation[1], bone.rotation[2]] : [0, 0, 0],
        color: 3
      });
      group.init();
      groups.push(group);
      allElements.push(group);
      groupMap.set(bone.name, { group, parentName: bone.parent });
    }
    for (const [boneName, data] of groupMap) {
      if (data.parentName && groupMap.has(data.parentName)) {
        const parentData = groupMap.get(data.parentName);
        data.group.addTo(parentData.group);
      } else {
        rootGroups.push(data.group);
      }
    }
    for (const bone of geometry.bones) {
      if (!bone.cubes)
        continue;
      const groupData = groupMap.get(bone.name);
      if (!groupData)
        continue;
      for (const cubeData of bone.cubes) {
        const origin = cubeData.origin || [0, 0, 0];
        const size = cubeData.size || [1, 1, 1];
        const pivot = cubeData.pivot || bone.pivot || [0, 0, 0];
        const rotation = cubeData.rotation || [0, 0, 0];
        const w = size[0];
        const h = size[1];
        const d = size[2];
        let faces = {};
        let isPerFaceUv = false;
        if (cubeData.uv && typeof cubeData.uv === "object" && !Array.isArray(cubeData.uv)) {
          isPerFaceUv = true;
          const faceNames = ["north", "east", "south", "west", "up", "down"];
          for (const faceName of faceNames) {
            const faceData = cubeData.uv[faceName];
            if (faceData) {
              const fuv = faceData.uv || [0, 0];
              const fsize = faceData.uv_size || [0, 0];
              faces[faceName] = {
                uv: scaleUVToProject([fuv[0], fuv[1], fuv[0] + fsize[0], fuv[1] + fsize[1]], uvWidth, uvHeight)
              };
            }
          }
        } else {
          const uvOffset = Array.isArray(cubeData.uv) ? cubeData.uv : [0, 0];
          const ox = uvOffset[0];
          const oy = uvOffset[1];
          faces = {
            north: { uv: scaleUVToProject([ox + d, oy + d, ox + d + w, oy + d + h], uvWidth, uvHeight) },
            south: { uv: scaleUVToProject([ox + d + w + d, oy + d, ox + d + w + d + w, oy + d + h], uvWidth, uvHeight) },
            east: { uv: scaleUVToProject([ox, oy + d, ox + d, oy + d + h], uvWidth, uvHeight) },
            west: { uv: scaleUVToProject([ox + d + w, oy + d, ox + d + w + d, oy + d + h], uvWidth, uvHeight) },
            up: { uv: scaleUVToProject([ox + d, oy, ox + d + w, oy + d], uvWidth, uvHeight) },
            down: { uv: scaleUVToProject([ox + d + w, oy, ox + d + w + w, oy + d], uvWidth, uvHeight) }
          };
        }
        const cube = new Cube({
          name: `${layerName}${LAYER_SEPARATOR2}${bone.name}`,
          from: [-(origin[0] + size[0]), origin[1], origin[2]],
          to: [-origin[0], origin[1] + size[1], origin[2] + size[2]],
          origin: [-pivot[0], pivot[1], pivot[2]],
          rotation: [-rotation[0], -rotation[1], rotation[2]],
          inflate: cubeData.inflate || 0,
          box_uv: false,
          faces
        });
        cube.layer_uv_width = uvWidth;
        cube.layer_uv_height = uvHeight;
        cube.layer_per_face_uv = isPerFaceUv;
        cube.layer_original_uv = cubeData.uv;
        cube.addTo(groupData.group);
        cube.init();
        cubes.push(cube);
        allElements.push(cube);
      }
    }
    return { groups, cubes, allElements, rootGroups, uvWidth, uvHeight };
  }
  function parseBBModel(json, layerName, filePath) {
    const groups = [];
    const cubes = [];
    const allElements = [];
    const rootGroups = [];
    const textures = [];
    let uvWidth = json.resolution?.width || 64;
    let uvHeight = json.resolution?.height || 64;
    debugLog(`[Layers] BBModel resolution: ${uvWidth}x${uvHeight}, Project: ${Project.texture_width}x${Project.texture_height}`);
    if (!json.elements || !json.outliner) {
      return { groups, cubes, allElements, rootGroups, textures, uvWidth, uvHeight };
    }
    if (json.textures && Array.isArray(json.textures) && json.textures.length > 0) {
      for (const texData of json.textures) {
        try {
          if (texData.source) {
            const tex = new Texture({
              name: texData.name || `${layerName}_texture`,
              id: texData.id
            });
            tex.fromDataURL(texData.source);
            addTextureBypass(tex);
            textures.push(tex);
          } else if (texData.path && isApp) {
            let texPath = texData.path;
            if (!PathModule.isAbsolute(texPath) && filePath) {
              texPath = PathModule.join(PathModule.dirname(filePath), texData.relative_path || texData.path);
            }
            const fs = requireNativeModule("fs");
            if (fs.existsSync(texPath)) {
              const tex = new Texture().fromPath(texPath);
              addTextureBypass(tex);
              textures.push(tex);
            }
          }
        } catch (e) {
          console.error("[Layers] Error importing texture:", e);
        }
      }
    }
    const elementMap = /* @__PURE__ */ new Map();
    for (const elem of json.elements) {
      if (elem && elem.uuid) {
        elementMap.set(elem.uuid, elem);
      }
    }
    const groupDataMap = /* @__PURE__ */ new Map();
    if (json.groups && Array.isArray(json.groups)) {
      let indexGroups2 = function(groups2) {
        for (const grp of groups2) {
          if (grp && grp.uuid) {
            groupDataMap.set(grp.uuid, grp);
            if (grp.children && Array.isArray(grp.children)) {
              const childGroups = grp.children.filter((c) => typeof c === "object" && c.uuid);
              if (childGroups.length > 0) {
                indexGroups2(childGroups);
              }
            }
          }
        }
      };
      var indexGroups = indexGroups2;
      indexGroups2(json.groups);
    }
    function indexOutlinerGroups(nodes) {
      for (const node of nodes) {
        if (node && typeof node === "object" && node.uuid) {
          if (!groupDataMap.has(node.uuid) && node.name) {
            groupDataMap.set(node.uuid, node);
          }
          if (node.children) {
            indexOutlinerGroups(node.children.filter((c) => typeof c === "object"));
          }
        }
      }
    }
    if (json.outliner) {
      indexOutlinerGroups(json.outliner);
    }
    function processOutlinerNode(node, parentGroup, isRoot) {
      if (typeof node === "string") {
        const elemData = elementMap.get(node);
        if (elemData && elemData.type !== "locator") {
          const from = elemData.from || [0, 0, 0];
          const to = elemData.to || [1, 1, 1];
          const origin = elemData.origin || [0, 0, 0];
          const rotation = elemData.rotation || [0, 0, 0];
          let faces = {};
          if (elemData.faces) {
            const faceNames = ["north", "east", "south", "west", "up", "down"];
            for (const faceName of faceNames) {
              const faceData = elemData.faces[faceName];
              if (faceData) {
                const originalUv = faceData.uv || [0, 0, uvWidth, uvHeight];
                faces[faceName] = {
                  uv: scaleUVToProject(originalUv, uvWidth, uvHeight),
                  rotation: faceData.rotation || 0
                };
              }
            }
          } else if (elemData.box_uv && elemData.uv_offset) {
            const w = Math.abs(to[0] - from[0]);
            const h = Math.abs(to[1] - from[1]);
            const d = Math.abs(to[2] - from[2]);
            const ox = elemData.uv_offset[0];
            const oy = elemData.uv_offset[1];
            faces = {
              north: { uv: scaleUVToProject([ox + d, oy + d, ox + d + w, oy + d + h], uvWidth, uvHeight) },
              south: { uv: scaleUVToProject([ox + d + w + d, oy + d, ox + d + w + d + w, oy + d + h], uvWidth, uvHeight) },
              east: { uv: scaleUVToProject([ox, oy + d, ox + d, oy + d + h], uvWidth, uvHeight) },
              west: { uv: scaleUVToProject([ox + d + w, oy + d, ox + d + w + d, oy + d + h], uvWidth, uvHeight) },
              up: { uv: scaleUVToProject([ox + d, oy, ox + d + w, oy + d], uvWidth, uvHeight) },
              down: { uv: scaleUVToProject([ox + d + w, oy, ox + d + w + w, oy + d], uvWidth, uvHeight) }
            };
          } else {
            const faceNames = ["north", "east", "south", "west", "up", "down"];
            for (const faceName of faceNames) {
              faces[faceName] = {
                uv: scaleUVToProject([0, 0, uvWidth, uvHeight], uvWidth, uvHeight)
              };
            }
          }
          const cube = new Cube({
            name: `${layerName}${LAYER_SEPARATOR2}${elemData.name || "cube"}`,
            from: [from[0], from[1], from[2]],
            to: [to[0], to[1], to[2]],
            origin: [origin[0], origin[1], origin[2]],
            rotation: [rotation[0], rotation[1], rotation[2]],
            inflate: elemData.inflate || 0,
            box_uv: false,
            faces
          });
          cube.layer_uv_width = uvWidth;
          cube.layer_uv_height = uvHeight;
          if (parentGroup) {
            cube.addTo(parentGroup);
          }
          cube.init();
          cubes.push(cube);
          allElements.push(cube);
        }
      } else if (node && typeof node === "object" && node.uuid) {
        const groupData = groupDataMap.get(node.uuid);
        const originalName = groupData?.name || "group";
        const prefixedName = `${layerName}${LAYER_SEPARATOR2}${originalName}`;
        const nodeOrigin = groupData?.origin || [0, 0, 0];
        const nodeRotation = groupData?.rotation || [0, 0, 0];
        const group = new Group({
          name: prefixedName,
          origin: [nodeOrigin[0], nodeOrigin[1], nodeOrigin[2]],
          rotation: [nodeRotation[0], nodeRotation[1], nodeRotation[2]],
          color: 3
        });
        if (parentGroup) {
          group.addTo(parentGroup);
        }
        group.init();
        groups.push(group);
        allElements.push(group);
        if (isRoot) {
          rootGroups.push(group);
        }
        const children = node.children || [];
        for (const child of children) {
          processOutlinerNode(child, group, false);
        }
      }
    }
    for (const node of json.outliner) {
      processOutlinerNode(node, null, true);
    }
    return { groups, cubes, allElements, rootGroups, textures, uvWidth, uvHeight };
  }
  function loadTextureForGeoJson(filePath, layerName) {
    if (!isApp || !filePath)
      return null;
    const dirname = PathModule.dirname(filePath);
    const texturePaths = discoverTexturePaths(dirname, layerName);
    if (texturePaths.length > 0) {
      try {
        const tex = new Texture({
          name: `${layerName}_texture`
        }).fromPath(texturePaths[0]);
        addTextureBypass(tex);
        return tex;
      } catch (e) {
        console.error("[Layers] Error loading texture:", e);
      }
    }
    return null;
  }
  function parseModelFile(json, layerName, filePath) {
    if (json.elements !== void 0 && json.outliner !== void 0) {
      debugLog("[Layers] Detected BBModel format");
      return parseBBModel(json, layerName, filePath);
    }
    if (json["minecraft:geometry"] || json.bones) {
      debugLog("[Layers] Detected Bedrock geometry format");
      const layerTexture = loadTextureForGeoJson(filePath, layerName);
      const textures = layerTexture ? [layerTexture] : [];
      const result = parseBedrockGeometry(json, layerName);
      return { ...result, textures };
    }
    console.warn("[Layers] Unknown model format");
    return { groups: [], cubes: [], allElements: [], rootGroups: [], textures: [], uvWidth: 64, uvHeight: 64 };
  }
  function deleteLayerElements(collection) {
    if (!collection || collection.export_codec !== "animorph_layer")
      return;
    const elementUuids = collection.layer_elements || [];
    const elementsToDelete = [];
    for (const uuid of elementUuids) {
      const group = Group.all.find((g) => g.uuid === uuid);
      if (group) {
        elementsToDelete.push(group);
        continue;
      }
      const cube = Cube.all.find((c) => c.uuid === uuid);
      if (cube) {
        elementsToDelete.push(cube);
      }
    }
    for (const element of elementsToDelete.reverse()) {
      if (element && element.remove) {
        element.remove();
      }
    }
    const textureGroup = TextureGroup.all.find((tg) => tg.name === collection.name);
    if (textureGroup) {
      const texturesToRemove = Texture.all.filter((t) => t.group === textureGroup.uuid);
      for (const tex of texturesToRemove) {
        const idx = Texture.all.indexOf(tex);
        if (idx > -1)
          Texture.all.splice(idx, 1);
        if (Project && Project.textures) {
          const pIdx = Project.textures.indexOf(tex);
          if (pIdx > -1)
            Project.textures.splice(pIdx, 1);
        }
      }
      textureGroup.remove();
    }
  }
  function setLayerVisibility(collection, visible) {
    if (!collection || collection.export_codec !== "animorph_layer")
      return;
    const elementUuids = collection.layer_elements || [];
    for (const uuid of elementUuids) {
      const group = Group.all.find((g) => g.uuid === uuid);
      if (group) {
        group.visibility = visible;
        continue;
      }
      const cube = Cube.all.find((c) => c.uuid === uuid);
      if (cube) {
        cube.visibility = visible;
      }
    }
    Canvas.updateAll();
  }
  function attachToExistingHierarchy(rootGroups, allElements, groups, layerName) {
    const removedGroups = [];
    const prefix = layerName + LAYER_SEPARATOR2;
    function getOriginalName(prefixedName) {
      if (prefixedName.startsWith(prefix)) {
        return prefixedName.substring(prefix.length);
      }
      return prefixedName;
    }
    function findProjectGroup(originalName) {
      return Group.all.find((g) => {
        if (g.name.includes(LAYER_SEPARATOR2))
          return false;
        return g.name === originalName;
      });
    }
    function processGroup(layerGroup) {
      const originalName = getOriginalName(layerGroup.name);
      const existingGroup = findProjectGroup(originalName);
      if (!existingGroup)
        return;
      const children = [...layerGroup.children];
      for (const child of children) {
        child.addTo(existingGroup);
      }
      layerGroup.remove();
      removedGroups.push(layerGroup);
      for (const child of children) {
        if (child.children !== void 0) {
          processGroup(child);
        }
      }
    }
    for (const rootGroup of [...rootGroups]) {
      processGroup(rootGroup);
    }
    for (const g of removedGroups) {
      const aeIdx = allElements.indexOf(g);
      if (aeIdx > -1)
        allElements.splice(aeIdx, 1);
      const gIdx = groups.indexOf(g);
      if (gIdx > -1)
        groups.splice(gIdx, 1);
    }
    const newRootGroups = rootGroups.filter((g) => !removedGroups.includes(g));
    debugLog(`[Layers] Hierarchy attachment: ${removedGroups.length} groups merged into existing bones, ${newRootGroups.length} new root groups`);
    return { newRootGroups };
  }
  function importLayer(file) {
    const json = typeof file.content === "string" ? JSON.parse(file.content) : file.content;
    const layerName = file.name.replace(/\.\w+$/, "").replace(/\.geo$/, "");
    const { groups, cubes, allElements, rootGroups, textures, uvWidth, uvHeight } = parseModelFile(json, layerName, file.path);
    if (allElements.length === 0) {
      Blockbench.showQuickMessage(`No geometry found in: ${layerName}`, 2e3);
      return;
    }
    const { newRootGroups } = attachToExistingHierarchy(rootGroups, allElements, groups, layerName);
    const collection = new Collection({
      name: layerName,
      children: allElements.map((e) => e.uuid),
      export_codec: "animorph_layer"
    });
    collection.layer_elements = allElements.map((e) => e.uuid);
    collection.add();
    collection.export_path = file.path;
    collection.layer_uv_width = uvWidth;
    collection.layer_uv_height = uvHeight;
    const uvMap = {};
    for (const cube of cubes) {
      if (cube.layer_original_uv !== void 0) {
        uvMap[cube.uuid] = { uv: cube.layer_original_uv, perFace: cube.layer_per_face_uv || false };
      }
    }
    collection.layer_cube_uv_map = uvMap;
    const textureUuid = processLayerTextures(layerName, textures, uvWidth, uvHeight);
    if (textureUuid) {
      collection.texture = textureUuid;
    }
    if (textures.length > 0) {
      const layerTexture = textures[0];
      setTimeout(() => {
        for (const cube of cubes) {
          applyTextureToLayerCube(cube, layerTexture);
        }
        reapplyMainTexture();
        Canvas.updateAll();
      }, 100);
    } else {
      setTimeout(() => {
        reapplyMainTexture();
        Canvas.updateAll();
      }, 100);
    }
    updateMultiTexturesState();
    Canvas.updateAll();
    if (file.path) {
      if (isBBModelLayer(file.path)) {
        setTimeout(() => loadAnimationsFromBBModel(json, layerName), 200);
      } else {
        const animPath = getLayerAnimPath(file.path);
        setTimeout(() => loadLayerAnimations(animPath), 200);
      }
    }
    Blockbench.showQuickMessage(`Imported layer: ${layerName} (UV: ${uvWidth}x${uvHeight})`);
    debugLog(`[Layers] Imported layer: ${layerName} with ${groups.length} groups, ${cubes.length} cubes, UV: ${uvWidth}x${uvHeight}`);
  }
  function reloadLayer(collection, preserveVisibility = true) {
    if (!collection.export_path || collection.export_codec !== "animorph_layer")
      return;
    if (!isApp)
      return;
    const fs = requireNativeModule("fs");
    let sourceContent = null;
    try {
      sourceContent = fs.readFileSync(collection.export_path, "utf-8");
    } catch (_) {
      debugLog(`[Layers] Source file not readable for "${collection.name}", falling back to in-memory restore`);
    }
    if (!sourceContent) {
      enableMultiTextures();
      if (!collection.layer_elements || collection.layer_elements.length === 0) {
        collection.layer_elements = [...collection.children || []];
      }
      const layerTexture = findLayerTexture(collection);
      if (layerTexture) {
        collection.texture = layerTexture.uuid;
        for (const uuid of collection.layer_elements) {
          const cube = Cube.all.find((c) => c.uuid === uuid);
          if (cube)
            applyTextureToLayerCube(cube, layerTexture);
        }
        reapplyMainTexture();
        Canvas.updateAll();
        Blockbench.showQuickMessage(`Layer restored: ${collection.name}`);
      } else {
        Blockbench.showQuickMessage(`Layer embedded \u2014 no external file to reload: ${collection.name}`, 2e3);
      }
      return;
    }
    try {
      const json = JSON.parse(sourceContent);
      let wasVisible = true;
      if (preserveVisibility) {
        const elementUuids = collection.layer_elements || [];
        if (elementUuids.length > 0) {
          const firstUuid = elementUuids[0];
          const element = Group.all.find((g) => g.uuid === firstUuid) || Cube.all.find((c) => c.uuid === firstUuid);
          if (element) {
            wasVisible = element.visibility !== false;
          }
        }
      }
      deleteLayerElements(collection);
      const { groups, cubes, allElements, rootGroups, textures, uvWidth, uvHeight } = parseModelFile(json, collection.name, collection.export_path);
      const { newRootGroups } = attachToExistingHierarchy(rootGroups, allElements, groups, collection.name);
      collection.children = allElements.map((e) => e.uuid);
      collection.layer_elements = allElements.map((e) => e.uuid);
      collection.layer_uv_width = uvWidth;
      collection.layer_uv_height = uvHeight;
      const uvMap = {};
      for (const cube of cubes) {
        if (cube.layer_original_uv !== void 0) {
          uvMap[cube.uuid] = { uv: cube.layer_original_uv, perFace: cube.layer_per_face_uv || false };
        }
      }
      collection.layer_cube_uv_map = uvMap;
      const textureUuid = processLayerTextures(collection.name, textures, uvWidth, uvHeight);
      if (textureUuid) {
        collection.texture = textureUuid;
      }
      if (preserveVisibility && !wasVisible) {
        setLayerVisibility(collection, false);
      }
      if (textures.length > 0) {
        const layerTexture = textures[0];
        setTimeout(() => {
          for (const cube of cubes) {
            applyTextureToLayerCube(cube, layerTexture);
          }
          reapplyMainTexture();
          Canvas.updateAll();
        }, 100);
      } else {
        setTimeout(() => {
          reapplyMainTexture();
          Canvas.updateAll();
        }, 100);
      }
      Canvas.updateAll();
      debugLog(`[Layers] Reloaded layer: ${collection.name}`);
      Blockbench.showQuickMessage(`Reloaded layer: ${collection.name}`);
    } catch (e) {
      console.error("[Layers] Error reloading layer:", e);
      Blockbench.showQuickMessage(`Error reloading layer: ${collection.name}`, 2e3);
    }
  }
  function serializeLayerToBedrock(collection) {
    const layerName = collection.name;
    const prefix = layerName + LAYER_SEPARATOR2;
    const uvWidth = collection.layer_uv_width || 64;
    const uvHeight = collection.layer_uv_height || 64;
    const elementUuids = new Set(collection.layer_elements || []);
    const layerCubes = Cube.all.filter((c) => elementUuids.has(c.uuid));
    const layerGroups = Group.all.filter((g) => elementUuids.has(g.uuid));
    const cubeUvMap = collection.layer_cube_uv_map || {};
    const boneGroups = /* @__PURE__ */ new Map();
    function getOriginalName(group) {
      return group.name.startsWith(prefix) ? group.name.substring(prefix.length) : group.name;
    }
    function isGroupParent(element) {
      return element.parent && Group.all.includes(element.parent);
    }
    function addGroupAndAncestors(group) {
      const name = getOriginalName(group);
      if (boneGroups.has(name))
        return;
      boneGroups.set(name, group);
      if (isGroupParent(group)) {
        addGroupAndAncestors(group.parent);
      }
    }
    for (const group of layerGroups) {
      addGroupAndAncestors(group);
    }
    for (const cube of layerCubes) {
      if (isGroupParent(cube)) {
        addGroupAndAncestors(cube.parent);
      }
    }
    const projectUvW = Project?.texture_width || 64;
    const projectUvH = Project?.texture_height || 64;
    const scaleX = uvWidth / projectUvW;
    const scaleY = uvHeight / projectUvH;
    const bones = [];
    for (const [name, group] of boneGroups) {
      const bone = { name };
      if (isGroupParent(group)) {
        bone.parent = getOriginalName(group.parent);
      }
      bone.pivot = [-group.origin[0], group.origin[1], group.origin[2]];
      const rx = group.rotation?.[0] || 0;
      const ry = group.rotation?.[1] || 0;
      const rz = group.rotation?.[2] || 0;
      if (rx !== 0 || ry !== 0 || rz !== 0) {
        bone.rotation = [-rx, -ry, rz];
      }
      const boneCubes = layerCubes.filter((c) => c.parent === group);
      if (boneCubes.length > 0) {
        bone.cubes = boneCubes.map((cube) => {
          const size = [
            cube.to[0] - cube.from[0],
            cube.to[1] - cube.from[1],
            cube.to[2] - cube.from[2]
          ];
          const bedrockOrigin = [-cube.to[0], cube.from[1], cube.from[2]];
          const storedUvData = cubeUvMap[cube.uuid];
          let uv;
          if (cube.layer_original_uv !== void 0) {
            uv = cube.layer_original_uv;
          } else if (storedUvData) {
            uv = storedUvData.uv;
          } else if (cube.layer_per_face_uv && cube.faces) {
            const faceNames = ["north", "east", "south", "west", "up", "down"];
            uv = {};
            for (const faceName of faceNames) {
              const face = cube.faces[faceName];
              if (face?.uv) {
                const u1 = face.uv[0] * scaleX;
                const v1 = face.uv[1] * scaleY;
                const u2 = face.uv[2] * scaleX;
                const v2 = face.uv[3] * scaleY;
                uv[faceName] = {
                  uv: [u1, v1],
                  uv_size: [u2 - u1, v2 - v1]
                };
              }
            }
          } else if (cube.faces?.north?.uv) {
            const d = size[2];
            uv = [
              Math.round(cube.faces.north.uv[0] * scaleX - d),
              Math.round(cube.faces.north.uv[1] * scaleY - d)
            ];
          } else {
            uv = [0, 0];
          }
          const cubeData = {
            origin: bedrockOrigin,
            size,
            uv
          };
          if (cube.inflate)
            cubeData.inflate = cube.inflate;
          const crx = cube.rotation?.[0] || 0;
          const cry = cube.rotation?.[1] || 0;
          const crz = cube.rotation?.[2] || 0;
          if (crx !== 0 || cry !== 0 || crz !== 0) {
            cubeData.pivot = [-cube.origin[0], cube.origin[1], cube.origin[2]];
            cubeData.rotation = [-crx, -cry, crz];
          }
          return cubeData;
        });
      }
      bones.push(bone);
    }
    let formatVersion = "1.12.0";
    let description = {
      identifier: `geometry.${layerName}`,
      texture_width: uvWidth,
      texture_height: uvHeight
    };
    if (collection.export_path && isApp) {
      try {
        const fs = requireNativeModule("fs");
        const content = fs.readFileSync(collection.export_path, "utf-8");
        const existing = JSON.parse(content);
        if (existing.format_version)
          formatVersion = existing.format_version;
        const origDesc = existing["minecraft:geometry"]?.[0]?.description;
        if (origDesc) {
          description = { ...origDesc, texture_width: uvWidth, texture_height: uvHeight };
        }
      } catch (e) {
      }
    }
    return {
      format_version: formatVersion,
      "minecraft:geometry": [{
        description,
        bones
      }]
    };
  }
  function serializeLayerToBBModel(collection) {
    const layerName = collection.name;
    const prefix = layerName + LAYER_SEPARATOR2;
    const uvWidth = collection.layer_uv_width || 64;
    const uvHeight = collection.layer_uv_height || 64;
    function stripPrefix(name) {
      return name.startsWith(prefix) ? name.substring(prefix.length) : name;
    }
    if (collection.export_path && isApp) {
      try {
        let extractOutliner2 = function(nodes) {
          const out = [];
          for (const node of nodes) {
            if (typeof node === "string") {
              if (layerCubeUuids.has(node))
                out.push(node);
            } else if (node && typeof node === "object") {
              if (node.name?.startsWith(prefix)) {
                out.push({ ...node, name: stripPrefix(node.name), children: extractOutliner2(node.children || []) });
              } else {
                out.push(...extractOutliner2(node.children || []));
              }
            }
          }
          return out;
        };
        var extractOutliner = extractOutliner2;
        const fs = requireNativeModule("fs");
        const srcJson = JSON.parse(fs.readFileSync(collection.export_path, "utf-8"));
        const isProjectFile = (srcJson.collections || []).some(
          (c) => c.export_codec === "animorph_layer"
        );
        if (!isProjectFile) {
          return srcJson;
        }
        const elementUuids2 = new Set(collection.layer_elements || []);
        const layerCubeUuids = new Set(
          Cube.all.filter((c) => elementUuids2.has(c.uuid)).map((c) => c.uuid)
        );
        const elements2 = (srcJson.elements || []).filter((e) => layerCubeUuids.has(e.uuid)).map((e) => ({ ...e, name: stripPrefix(e.name) }));
        const outliner2 = extractOutliner2(srcJson.outliner || []);
        return {
          meta: srcJson.meta || { format_version: "4.10", model_format: "bedrock", box_uv: false },
          name: layerName,
          geometry_name: srcJson.geometry_name || "",
          visible_box: srcJson.visible_box || [1, 1, 0],
          variable_placeholders: srcJson.variable_placeholders || "",
          resolution: { width: uvWidth, height: uvHeight },
          elements: elements2,
          outliner: outliner2,
          textures: srcJson.textures || [],
          animations: []
        };
      } catch (_) {
      }
    }
    const elementUuids = new Set(collection.layer_elements || []);
    const cubeUvMap = collection.layer_cube_uv_map || {};
    const layerCubes = Cube.all.filter((c) => elementUuids.has(c.uuid));
    const layerGroupSet = new Set(
      Group.all.filter((g) => elementUuids.has(g.uuid) && g.name.startsWith(prefix))
    );
    const scaleX = uvWidth / (Project?.texture_width || 64);
    const scaleY = uvHeight / (Project?.texture_height || 64);
    const faceNames = ["north", "east", "south", "west", "up", "down"];
    const elements = layerCubes.map((cube) => {
      const storedUv = cubeUvMap[cube.uuid];
      const originalUv = cube.layer_original_uv ?? storedUv?.uv;
      const isPerFace = cube.layer_per_face_uv ?? storedUv?.perFace ?? false;
      const faces = {};
      if (isPerFace && originalUv && !Array.isArray(originalUv)) {
        for (const fn of faceNames) {
          const o = originalUv[fn];
          if (o)
            faces[fn] = { uv: [o.uv[0], o.uv[1], o.uv[0] + (o.uv_size?.[0] ?? 0), o.uv[1] + (o.uv_size?.[1] ?? 0)], texture: 0, rotation: 0 };
        }
      } else {
        for (const fn of faceNames) {
          const f = cube.faces?.[fn];
          if (f) {
            const uv = f.uv ? [f.uv[0] * scaleX, f.uv[1] * scaleY, f.uv[2] * scaleX, f.uv[3] * scaleY] : [0, 0, uvWidth, uvHeight];
            faces[fn] = { uv, texture: 0, rotation: f.rotation || 0 };
          }
        }
      }
      return {
        name: stripPrefix(cube.name),
        box_uv: false,
        rescale: false,
        locked: false,
        from: [...cube.from],
        to: [...cube.to],
        autouv: 0,
        color: cube.color ?? 0,
        inflate: cube.inflate || 0,
        origin: [...cube.origin],
        rotation: [...cube.rotation || [0, 0, 0]],
        faces,
        uuid: cube.uuid
      };
    });
    const nodeMap = /* @__PURE__ */ new Map();
    for (const g of layerGroupSet) {
      nodeMap.set(g, { name: stripPrefix(g.name), origin: [...g.origin], rotation: [...g.rotation || [0, 0, 0]], uuid: g.uuid, export: true, isOpen: true, locked: false, visibility: true, autouv: 0, children: [] });
    }
    for (const g of layerGroupSet) {
      const node = nodeMap.get(g);
      for (const child of layerGroupSet) {
        if (child.parent === g)
          node.children.push(nodeMap.get(child));
      }
      for (const cube of layerCubes) {
        if (cube.parent === g)
          node.children.push(cube.uuid);
      }
    }
    const outliner = [...layerGroupSet].filter((g) => !layerGroupSet.has(g.parent)).map((g) => nodeMap.get(g));
    for (const cube of layerCubes) {
      if (!layerGroupSet.has(cube.parent))
        outliner.push(cube.uuid);
    }
    const textures = [];
    const tg = TextureGroup.all.find((t) => t.name === layerName);
    if (tg) {
      for (const tex of Texture.all.filter((t) => t.group === tg.uuid)) {
        textures.push({ path: tex.path || "", name: tex.name || "texture", folder: "", namespace: "", id: String(textures.length), render_mode: "default", render_sides: "auto", frame_time: 1, frame_linear_interpolation: false, visible: true, width: uvWidth, height: uvHeight, uv_width: uvWidth, uv_height: uvHeight, source: tex.source || "" });
      }
    }
    return {
      meta: { format_version: "4.10", model_format: "bedrock", box_uv: false },
      name: layerName,
      geometry_name: "",
      visible_box: [1, 1, 0],
      variable_placeholders: "",
      resolution: { width: uvWidth, height: uvHeight },
      elements,
      outliner,
      textures,
      animations: []
    };
  }
  function exportLayerModel(collection) {
    if (!collection || collection.export_codec !== "animorph_layer")
      return;
    if (!isApp) {
      Blockbench.showQuickMessage("Export Layer is only available in the desktop app", 2e3);
      return;
    }
    const srcPath = collection.export_path;
    const exportAsBBModel = !srcPath || isBBModelLayer(srcPath);
    if (exportAsBBModel) {
      let bbmodel;
      try {
        bbmodel = serializeLayerToBBModel(collection);
      } catch (e) {
        console.error("[Layers] Error serializing layer as bbmodel:", e);
        Blockbench.showQuickMessage("Error exporting layer model", 2e3);
        return;
      }
      Blockbench.export({
        type: "Blockbench Model",
        extensions: ["bbmodel"],
        name: collection.name + ".bbmodel",
        content: JSON.stringify(bbmodel, null, 2),
        savetype: "text"
      }, (path) => {
        const savedPath = path?.path || path;
        if (savedPath) {
          collection.export_path = savedPath;
          Blockbench.showQuickMessage(`Exported layer: ${collection.name}`);
          debugLog(`[Layers] Exported layer as bbmodel to: ${savedPath}`);
        }
      });
    } else {
      let json;
      try {
        json = serializeLayerToBedrock(collection);
      } catch (e) {
        console.error("[Layers] Error serializing layer as geo.json:", e);
        Blockbench.showQuickMessage("Error exporting layer model", 2e3);
        return;
      }
      Blockbench.export({
        type: "Bedrock Geometry",
        extensions: ["geo.json", "json"],
        name: collection.name + ".geo.json",
        content: JSON.stringify(json, null, 2),
        savetype: "text"
      }, (path) => {
        const savedPath = path?.path || path;
        if (savedPath) {
          collection.export_path = savedPath;
          Blockbench.showQuickMessage(`Exported layer: ${collection.name}`);
          debugLog(`[Layers] Exported layer as geo.json to: ${savedPath}`);
        }
      });
    }
  }
  function saveLayer(collection) {
    if (!collection || collection.export_codec !== "animorph_layer")
      return;
    if (!isApp) {
      Blockbench.showQuickMessage("Save Layer is only available in the desktop app", 2e3);
      return;
    }
    const filePath = collection.export_path;
    if (!filePath) {
      exportLayerModel(collection);
      return;
    }
    const fs = requireNativeModule("fs");
    if (isBBModelLayer(filePath)) {
      try {
        let stripPrefix2 = function(name) {
          return name.startsWith(prefix) ? name.substring(prefix.length) : name;
        }, buildGroupNode2 = function(group) {
          const children = [];
          for (const childUuid of group.children || []) {
            if (allElementUuids.has(childUuid)) {
              children.push(childUuid);
            } else if (allGroupUuids.has(childUuid)) {
              const sub = bbmodelContent.groups.find((g) => g.uuid === childUuid);
              if (sub)
                children.push(buildGroupNode2(sub));
            }
          }
          return { ...group, children };
        };
        var stripPrefix = stripPrefix2, buildGroupNode = buildGroupNode2;
        if (!fs.existsSync(filePath)) {
          debugLog(`[Layers] File no longer exists: ${filePath}`);
          Blockbench.showQuickMessage("File no longer exists. Please use 'Export Layer Model' to save to a new location", 3e3);
          exportLayerModel(collection);
          return;
        }
        const bbmodelContent = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        debugLog(`[Layers] Saving layer "${collection.name}" to bbmodel: ${filePath}`);
        debugLog(`[Layers] Layer elements to save: ${collection.layer_elements?.length || 0} elements`);
        const layerElementUuids = new Set(collection.layer_elements || []);
        const prefix = collection.name + LAYER_SEPARATOR2;
        let elements = Cube.all.filter((c) => layerElementUuids.has(c.uuid)).map((cube) => {
          const faceNames = ["north", "east", "south", "west", "up", "down"];
          const faces = {};
          for (const fn of faceNames) {
            const f = cube.faces?.[fn];
            if (f) {
              faces[fn] = {
                uv: f.uv ? [...f.uv] : [0, 0, 64, 64],
                texture: f.texture,
                rotation: f.rotation || 0
              };
            }
          }
          return {
            uuid: cube.uuid,
            name: stripPrefix2(cube.name),
            box_uv: false,
            render_order: "default",
            locked: cube.locked ?? false,
            export: cube.export ?? true,
            scope: cube.scope ?? 0,
            allow_mirror_modeling: true,
            is_text_display: cube.is_text_display ?? false,
            text_content: cube.text_content ?? "Text",
            text_color: cube.text_color ?? "#ffffff",
            text_background: cube.text_background ?? "#000000",
            text_background_enabled: cube.text_background_enabled ?? true,
            text_alignment: cube.text_alignment ?? "center",
            text_padding: cube.text_padding ?? 16,
            from: [...cube.from],
            to: [...cube.to],
            autouv: cube.autouv ?? 0,
            color: cube.color ?? 0,
            origin: [...cube.origin || [0, 0, 0]],
            faces
          };
        });
        const missingUuids = [...layerElementUuids].filter(
          (uuid) => !elements.some((e) => e.uuid === uuid)
        );
        if (missingUuids.length > 0) {
          debugLog(`[Layers] ${missingUuids.length} layer elements missing from Cube.all, retrieving from bbmodel file`);
          const bbmodelLayerElements = (bbmodelContent.elements || []).filter(
            (e) => missingUuids.includes(e.uuid)
          );
          elements = [...elements, ...bbmodelLayerElements];
        }
        debugLog(`[Layers] Serialized ${elements.length} elements from current state`);
        const otherElements = (bbmodelContent.elements || []).filter(
          (e) => !layerElementUuids.has(e.uuid)
        );
        bbmodelContent.elements = [...otherElements, ...elements];
        debugLog(`[Layers] Merged elements: ${otherElements.length} other + ${elements.length} layer = ${bbmodelContent.elements.length} total`);
        const layerGroupUuids = new Set(
          Group.all.filter((g) => g.name.startsWith(prefix)).map((g) => g.uuid)
        );
        const originalLayerGroups = (bbmodelContent.groups || []).filter(
          (g) => layerGroupUuids.has(g.uuid) || g.name.startsWith(prefix)
        );
        debugLog(`[Layers] Found ${originalLayerGroups.length} original layer groups in bbmodel`);
        const updatedGroups = originalLayerGroups.map((origGroup) => {
          const liveGroup = Group.all.find((g) => g.uuid === origGroup.uuid);
          if (liveGroup) {
            const liveChildren = (liveGroup.children || []).map((c) => typeof c === "string" ? c : c.uuid);
            const children = liveChildren.length > 0 ? liveChildren : origGroup.children || [];
            return {
              ...origGroup,
              name: liveGroup.name.startsWith(prefix) ? stripPrefix2(liveGroup.name) : origGroup.name,
              origin: [...liveGroup.origin || origGroup.origin || [0, 0, 0]],
              rotation: [...liveGroup.rotation || origGroup.rotation || [0, 0, 0]],
              color: liveGroup.color ?? origGroup.color ?? 0,
              children,
              export: liveGroup.export ?? origGroup.export ?? true,
              locked: liveGroup.locked ?? origGroup.locked ?? false,
              visibility: liveGroup.visibility ?? origGroup.visibility ?? true,
              isOpen: liveGroup.isOpen ?? origGroup.isOpen ?? true,
              shade: liveGroup.shade ?? origGroup.shade ?? true
            };
          }
          return origGroup;
        });
        const existingGroupUuids = new Set(updatedGroups.map((g) => g.uuid));
        const newGroups = Group.all.filter((g) => g.name.startsWith(prefix) && !existingGroupUuids.has(g.uuid)).map((group) => ({
          name: stripPrefix2(group.name),
          uuid: group.uuid,
          export: group.export ?? true,
          locked: group.locked ?? false,
          scope: group.scope ?? 0,
          selected: group.selected ?? false,
          _static: group._static || { properties: {}, temp_data: {} },
          origin: [...group.origin || [0, 0, 0]],
          rotation: [...group.rotation || [0, 0, 0]],
          color: group.color ?? 0,
          children: (group.children || []).map((c) => c.uuid),
          reset: group.reset ?? false,
          shade: group.shade ?? true,
          mirror_uv: group.mirror_uv ?? false,
          visibility: group.visibility ?? true,
          autouv: group.autouv ?? 0,
          isOpen: group.isOpen ?? true,
          primary_selected: group.primary_selected ?? false
        }));
        const allLayerGroups = [...updatedGroups, ...newGroups];
        debugLog(`[Layers] Serialized ${allLayerGroups.length} groups (${updatedGroups.length} existing + ${newGroups.length} new)`);
        for (const g of allLayerGroups) {
          debugLog(`[Layers] Group "${g.name}" (${g.uuid}) children:`, JSON.stringify(g.children));
        }
        debugLog(`[Layers] collection.layer_elements:`, JSON.stringify(collection.layer_elements));
        const originalGroups = bbmodelContent.groups || [];
        const mergedGroups = originalGroups.map((origGroup) => {
          const isLayerGroup = layerGroupUuids.has(origGroup.uuid) || origGroup.name?.startsWith(prefix);
          if (isLayerGroup) {
            const updated = allLayerGroups.find((g) => g.uuid === origGroup.uuid);
            return updated || origGroup;
          }
          return origGroup;
        });
        const mergedUuids = new Set(mergedGroups.map((g) => g.uuid));
        for (const layerGroup of allLayerGroups) {
          if (!mergedUuids.has(layerGroup.uuid)) {
            mergedGroups.push(layerGroup);
          }
        }
        bbmodelContent.groups = mergedGroups;
        debugLog(`[Layers] Merged groups: ${mergedGroups.length} total`);
        const allGroupUuids = new Set(bbmodelContent.groups.map((g) => g.uuid));
        const allElementUuids = new Set(bbmodelContent.elements.map((e) => e.uuid));
        const childGroupUuids = /* @__PURE__ */ new Set();
        for (const g of bbmodelContent.groups) {
          for (const c of g.children || []) {
            if (allGroupUuids.has(c))
              childGroupUuids.add(c);
          }
        }
        const rootGroups = bbmodelContent.groups.filter((g) => !childGroupUuids.has(g.uuid));
        const outliner = rootGroups.map(buildGroupNode2);
        const inGroup = /* @__PURE__ */ new Set();
        for (const g of bbmodelContent.groups) {
          for (const c of g.children || []) {
            if (allElementUuids.has(c))
              inGroup.add(c);
          }
        }
        const rootElements = bbmodelContent.elements.filter((e) => !inGroup.has(e.uuid)).map((e) => e.uuid);
        bbmodelContent.outliner = [...outliner, ...rootElements];
        debugLog(`[Layers] Outliner: ${outliner.length} root groups, ${rootElements.length} root elements`);
        const textures = Texture.all.filter((t) => collection.texture === t.uuid || t.group && t.group === collection.name).map((tex) => ({
          uuid: tex.uuid,
          name: tex.name,
          path: tex.path || "",
          mode: tex.mode || "bitmap",
          source: tex.source
        }));
        if (textures.length > 0) {
          const layerTextureUuids = new Set(textures.map((t) => t.uuid));
          const otherTextures = (bbmodelContent.textures || []).filter(
            (t) => !layerTextureUuids.has(t.uuid)
          );
          bbmodelContent.textures = [...otherTextures, ...textures];
          debugLog(`[Layers] Updated ${textures.length} textures`);
        }
        const animJson = serializeLayerAnimations(collection);
        if (animJson && Object.keys(animJson.animations).length > 0) {
          if (!bbmodelContent.animations) {
            bbmodelContent.animations = [];
          }
          for (const [animName, animData] of Object.entries(animJson.animations)) {
            let bbAnim = bbmodelContent.animations.find((a) => a.name === animName);
            if (!bbAnim) {
              bbAnim = {
                uuid: guid(),
                name: animName,
                loop: "once",
                override: false,
                length: 0,
                snapping: 24,
                animators: {}
              };
              bbmodelContent.animations.push(bbAnim);
            }
            if (animData.animation_length)
              bbAnim.length = animData.animation_length;
            if (animData.loop === true)
              bbAnim.loop = "loop";
            else if (animData.loop === "hold_on_last_frame")
              bbAnim.loop = "hold";
            else if (animData.loop !== void 0)
              bbAnim.loop = "once";
            if (!bbAnim.animators)
              bbAnim.animators = {};
            for (const [boneName, boneData] of Object.entries(animData.bones)) {
              const boneUuid = findBoneUuidInBBModel(bbmodelContent, boneName);
              const animatorKey = boneUuid || boneName;
              const keyframes = [];
              for (const channel of ["rotation", "position", "scale"]) {
                if (!boneData[channel])
                  continue;
                for (const [timeStr, val] of Object.entries(boneData[channel])) {
                  const values = Array.isArray(val) ? val : val?.vector || [0, 0, 0];
                  keyframes.push({
                    channel,
                    data_points: [{ x: values[0], y: values[1], z: values[2] }],
                    uuid: guid(),
                    time: parseFloat(timeStr),
                    color: -1,
                    interpolation: val?.lerp_mode || "linear"
                  });
                }
              }
              bbAnim.animators[animatorKey] = {
                name: boneName,
                type: "bone",
                keyframes
              };
            }
          }
        }
        fs.writeFileSync(filePath, JSON.stringify(bbmodelContent, null, 2), "utf-8");
        Blockbench.showQuickMessage(`Saved layer: ${collection.name}`);
        debugLog(`[Layers] \u2713 Successfully saved layer "${collection.name}" to: ${filePath}`);
      } catch (e) {
        console.error("[Layers] Error saving bbmodel layer:", e);
        Blockbench.showQuickMessage(`Error saving layer: ${collection.name}`, 2e3);
        exportLayerModel(collection);
      }
    } else {
      try {
        const json = serializeLayerToBedrock(collection);
        fs.writeFileSync(filePath, JSON.stringify(json, null, 2), "utf-8");
        Blockbench.showQuickMessage(`Saved layer: ${collection.name}`);
      } catch (e) {
        console.error("[Layers] Error saving layer:", e);
        Blockbench.showQuickMessage(`Error saving layer: ${collection.name}`, 2e3);
      }
    }
  }
  function saveLayerToFile(collection) {
    if (!collection || collection.export_codec !== "animorph_layer")
      return;
    if (!isApp) {
      Blockbench.showQuickMessage("Save Layer to File is only available in the desktop app", 2e3);
      return;
    }
    let filePath = collection.export_path;
    if (!filePath) {
      Blockbench.showQuickMessage("Please select the .bbmodel file to save to", 2e3);
      Blockbench.export({
        type: "Blockbench Model",
        extensions: ["bbmodel"],
        name: collection.name + ".bbmodel",
        content: "",
        savetype: "text"
      }, (path) => {
        const savedPath = path?.path || path;
        if (savedPath) {
          collection.export_path = savedPath;
          saveLayerToFile(collection);
        }
      });
      return;
    }
    const fs = requireNativeModule("fs");
    const prefix = collection.name + LAYER_SEPARATOR2;
    const layerElementUuids = new Set(collection.layer_elements || []);
    const layerGroupUuids = new Set(
      Group.all.filter((g) => g.name.startsWith(prefix)).map((g) => g.uuid)
    );
    const layerElements = Cube.all.filter((c) => layerElementUuids.has(c.uuid)).map((cube) => {
      const faces = {};
      for (const fn of ["north", "east", "south", "west", "up", "down"]) {
        const f = cube.faces?.[fn];
        if (f)
          faces[fn] = { uv: f.uv ? [...f.uv] : [0, 0, 64, 64], texture: f.texture, rotation: f.rotation || 0 };
      }
      return {
        uuid: cube.uuid,
        name: cube.name.startsWith(prefix) ? cube.name.substring(prefix.length) : cube.name,
        box_uv: false,
        render_order: "default",
        locked: cube.locked ?? false,
        export: cube.export ?? true,
        from: [...cube.from],
        to: [...cube.to],
        autouv: cube.autouv ?? 0,
        color: cube.color ?? 0,
        origin: [...cube.origin || [0, 0, 0]],
        faces
      };
    });
    const allElements = [...layerElements];
    function hasRelevantDescendant(group) {
      for (const child of group.children || []) {
        const childUuid = typeof child === "string" ? child : child.uuid;
        if (layerElementUuids.has(childUuid) || layerGroupUuids.has(childUuid))
          return true;
        const childGroup = Group.all.find((g) => g.uuid === childUuid);
        if (childGroup && hasRelevantDescendant(childGroup))
          return true;
      }
      return false;
    }
    const allProjectGroups = Group.all.filter((g) => layerGroupUuids.has(g.uuid) || hasRelevantDescendant(g)).map((group) => {
      const isLayerGroup = layerGroupUuids.has(group.uuid);
      const children = (group.children || []).map((c) => typeof c === "string" ? c : c.uuid).filter((uuid) => {
        if (isLayerGroup) {
          return layerElementUuids.has(uuid) || layerGroupUuids.has(uuid);
        } else {
          return layerGroupUuids.has(uuid) || layerElementUuids.has(uuid) || Group.all.some((g) => g.uuid === uuid && (layerGroupUuids.has(g.uuid) || hasRelevantDescendant(g)));
        }
      });
      return {
        name: group.name.startsWith(prefix) ? group.name.substring(prefix.length) : group.name,
        uuid: group.uuid,
        export: group.export ?? true,
        locked: group.locked ?? false,
        scope: group.scope ?? 0,
        selected: group.selected ?? false,
        _static: group._static || { properties: {}, temp_data: {} },
        origin: [...group.origin || [0, 0, 0]],
        rotation: [...group.rotation || [0, 0, 0]],
        color: group.color ?? 0,
        children,
        reset: group.reset ?? false,
        shade: group.shade ?? true,
        mirror_uv: group.mirror_uv ?? false,
        visibility: group.visibility ?? true,
        autouv: group.autouv ?? 0,
        isOpen: group.isOpen ?? true,
        primary_selected: group.primary_selected ?? false
      };
    });
    const allGroupUuidsForOutliner = new Set(allProjectGroups.map((g) => g.uuid));
    const allElementUuidsForOutliner = new Set(allElements.map((e) => e.uuid));
    const childGroups = /* @__PURE__ */ new Set();
    for (const g of allProjectGroups)
      for (const c of g.children || [])
        if (allGroupUuidsForOutliner.has(c))
          childGroups.add(c);
    const rootGroups = allProjectGroups.filter((g) => !childGroups.has(g.uuid));
    function buildNode(group) {
      const children = [];
      for (const childUuid of group.children || []) {
        if (allElementUuidsForOutliner.has(childUuid))
          children.push(childUuid);
        else if (allGroupUuidsForOutliner.has(childUuid)) {
          const sub = allProjectGroups.find((gg) => gg.uuid === childUuid);
          if (sub)
            children.push(buildNode(sub));
        }
      }
      return { ...group, children };
    }
    const outliner = rootGroups.map(buildNode);
    const inGroup = /* @__PURE__ */ new Set();
    for (const g of allProjectGroups)
      for (const c of g.children || [])
        if (allElementUuidsForOutliner.has(c))
          inGroup.add(c);
    const rootElems = allElements.filter((e) => !inGroup.has(e.uuid)).map((e) => e.uuid);
    const fullOutliner = [...outliner, ...rootElems];
    const textures = Texture.all.filter((t) => collection.texture === t.uuid || t.group && t.group === collection.name).map((tex) => ({
      uuid: tex.uuid,
      name: tex.name,
      path: tex.path || "",
      mode: tex.mode || "bitmap",
      source: tex.source
    }));
    const bbmodelContent = {
      meta: { format_version: "5.0", model_format: "bedrock", box_uv: false },
      name: collection.name,
      resolution: { width: collection.layer_uv_width || 64, height: collection.layer_uv_height || 64 },
      elements: allElements,
      groups: allProjectGroups,
      outliner: fullOutliner,
      textures,
      animations: []
    };
    try {
      if (fs.existsSync(filePath)) {
        const existing = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        bbmodelContent.animations = existing.animations || [];
        bbmodelContent.meta = existing.meta || bbmodelContent.meta;
        bbmodelContent.name = existing.name || collection.name;
        bbmodelContent.resolution = existing.resolution || bbmodelContent.resolution;
      }
      fs.writeFileSync(filePath, JSON.stringify(bbmodelContent, null, 2), "utf-8");
      const fileName = PathModule ? PathModule.basename(filePath) : filePath.split(/[\\/]/).pop();
      Blockbench.showQuickMessage(`Saved to ${fileName} (${allElements.length} elements, ${allProjectGroups.length} groups)`);
    } catch (e) {
      console.error("[Layers] Error saving layer to file:", e);
      Blockbench.showQuickMessage(`Error: ${e.message || "Unknown error"}`, 3e3);
    }
  }
  function injectSaveButtons() {
    const panelNode = Panels.collections?.node;
    if (!panelNode)
      return;
    const items = panelNode.querySelectorAll("li");
    for (const item of items) {
      if (item.querySelector(".animorph-layer-save"))
        continue;
      const nameEl = item.querySelector("label, .collection_name, span");
      if (!nameEl)
        continue;
      const name = nameEl.textContent?.trim();
      if (!name)
        continue;
      const collection = Collection.all.find(
        (c) => c.export_codec === "animorph_layer" && c.name === name
      );
      if (!collection || !collection.export_path)
        continue;
      const visBtn = item.querySelector(".in_list_button");
      if (!visBtn || !visBtn.parentNode)
        continue;
      const saveBtn = document.createElement("div");
      saveBtn.className = "in_list_button animorph-layer-save";
      saveBtn.title = "Save Layer";
      saveBtn.innerHTML = '<i class="material-icons icon">save</i>';
      saveBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        saveLayer(collection);
      });
      visBtn.parentNode.insertBefore(saveBtn, visBtn);
    }
  }
  function setupSaveButtonObserver() {
    const panelNode = Panels.collections?.node;
    if (!panelNode) {
      setTimeout(setupSaveButtonObserver, 500);
      return;
    }
    injectSaveButtons();
    layerSaveObserver = new MutationObserver(() => {
      injectSaveButtons();
    });
    layerSaveObserver.observe(panelNode, { childList: true, subtree: true });
    debugLog("[Layers] Save button observer started");
  }
  function teardownSaveButtonObserver() {
    if (layerSaveObserver) {
      layerSaveObserver.disconnect();
      layerSaveObserver = null;
    }
    document.querySelectorAll(".animorph-layer-save").forEach((el) => el.remove());
  }
  function setupCtrlSHook() {
    ctrlSHandler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        setTimeout(() => {
          for (const collection of Collection.all) {
            if (collection.export_codec === "animorph_layer" && collection.export_path) {
              saveLayer(collection);
            }
          }
        }, 50);
      }
    };
    document.addEventListener("keydown", ctrlSHandler, true);
    debugLog("[Layers] Ctrl+S hook registered");
  }
  function teardownCtrlSHook() {
    if (ctrlSHandler) {
      document.removeEventListener("keydown", ctrlSHandler, true);
      ctrlSHandler = null;
    }
  }
  function getLayerBoneNames() {
    const names = /* @__PURE__ */ new Set();
    for (const collection of Collection.all) {
      if (collection.export_codec !== "animorph_layer")
        continue;
      const uuids = new Set(collection.layer_elements || []);
      for (const group of Group.all) {
        if (uuids.has(group.uuid)) {
          names.add(group.name);
        }
      }
    }
    return names;
  }
  function filterLayerBonesCompileBedrock({ model }) {
    const geometry = model["minecraft:geometry"]?.[0];
    if (!geometry?.bones)
      return;
    filterLayerBones(geometry);
  }
  function filterLayerBonesCompile({ model }) {
    if (!model?.bones)
      return;
    filterLayerBones(model);
  }
  function filterLayerBones(geometry) {
    const layerBoneNames = getLayerBoneNames();
    if (layerBoneNames.size === 0)
      return;
    geometry.bones = geometry.bones.filter((bone) => !layerBoneNames.has(bone.name));
    debugLog(`[Layers] Filtered ${layerBoneNames.size} layer bones from export`);
  }
  function setupCompileFilters() {
    const codecIds = ["bedrock", "geckolib_model", "animated_entity_model"];
    const oldCodecIds = ["bedrock_old"];
    for (const id of codecIds) {
      const codec = Codecs[id];
      if (codec) {
        codec.on("compile", filterLayerBonesCompileBedrock);
        compileFilterHandlers.push({ codec, handler: filterLayerBonesCompileBedrock });
      }
    }
    for (const id of oldCodecIds) {
      const codec = Codecs[id];
      if (codec) {
        codec.on("compile", filterLayerBonesCompile);
        compileFilterHandlers.push({ codec, handler: filterLayerBonesCompile });
      }
    }
    debugLog("[Layers] Compile filters registered");
  }
  function teardownCompileFilters() {
    for (const { codec, handler } of compileFilterHandlers) {
      if (codec.events?.compile) {
        const idx = codec.events.compile.indexOf(handler);
        if (idx > -1)
          codec.events.compile.splice(idx, 1);
      }
    }
    compileFilterHandlers.length = 0;
  }
  function filterLayerAnimCompile(data) {
    if (!data.json?.bones)
      return;
    const layerBoneInfo = /* @__PURE__ */ new Map();
    for (const collection of Collection.all) {
      if (collection.export_codec !== "animorph_layer")
        continue;
      const prefix = collection.name + LAYER_SEPARATOR2;
      const uuids = new Set(collection.layer_elements || []);
      for (const group of Group.all) {
        if (uuids.has(group.uuid)) {
          const name = group.name || "";
          const exportName = name.startsWith(prefix) ? name.substring(prefix.length) : name;
          layerBoneInfo.set(name, { layerName: collection.name, collection, exportName });
        }
      }
    }
    console.log(`[Layers:AnimCompile] Animation: "${data.animation?.name}"`);
    console.log(`[Layers:AnimCompile] Bones in compiled JSON:`, Object.keys(data.json.bones));
    console.log(`[Layers:AnimCompile] Layer bone map keys:`, [...layerBoneInfo.keys()]);
    if (layerBoneInfo.size === 0)
      return;
    const boneNames = Object.keys(data.json.bones);
    const layerBones = boneNames.filter((n) => layerBoneInfo.has(n));
    const nonLayerBones = boneNames.filter((n) => !layerBoneInfo.has(n));
    console.log(`[Layers:AnimCompile] layerBones: [${layerBones.join(", ")}]`);
    console.log(`[Layers:AnimCompile] nonLayerBones: [${nonLayerBones.join(", ")}]`);
    if (nonLayerBones.length === 0 && layerBones.length > 0) {
      console.log(`[Layers:AnimCompile] ALL layer bones \u2192 stripping prefixes`);
      for (const boneName of layerBones) {
        const info = layerBoneInfo.get(boneName);
        if (info.exportName !== boneName) {
          data.json.bones[info.exportName] = data.json.bones[boneName];
          delete data.json.bones[boneName];
        }
      }
    } else if (layerBones.length > 0) {
      const animName = data.animation?.name || "unknown";
      console.log(`[Layers:AnimCompile] MIXED \u2192 extracting ${layerBones.length} layer bones from "${animName}"`);
      for (const boneName of layerBones) {
        const info = layerBoneInfo.get(boneName);
        const boneData = data.json.bones[boneName];
        console.log(`[Layers:AnimCompile] Extracting bone "${boneName}" \u2192 "${info.exportName}" for layer "${info.layerName}":`, JSON.stringify(boneData));
        if (!layerAnimBuffer.has(info.layerName)) {
          layerAnimBuffer.set(info.layerName, /* @__PURE__ */ new Map());
        }
        const layerAnims = layerAnimBuffer.get(info.layerName);
        if (!layerAnims.has(animName)) {
          layerAnims.set(animName, {
            bones: {},
            length: data.json.animation_length || data.animation?.length || 0,
            loop: data.json.loop
          });
        }
        layerAnims.get(animName).bones[info.exportName] = boneData;
        delete data.json.bones[boneName];
      }
      console.log(`[Layers:AnimCompile] Buffer state after extraction:`, [...layerAnimBuffer.entries()].map(
        ([name, anims]) => `${name}: ${[...anims.entries()].map(([a, d]) => `${a}(${Object.keys(d.bones).length} bones)`).join(", ")}`
      ));
      if (compileFlushTimer)
        clearTimeout(compileFlushTimer);
      compileFlushTimer = setTimeout(() => flushLayerAnimBuffer(), 0);
    } else {
      console.log(`[Layers:AnimCompile] No layer bones found in this animation`);
    }
  }
  function flushLayerAnimBuffer() {
    compileFlushTimer = null;
    console.log(`[Layers:Flush] Called. Buffer size: ${layerAnimBuffer.size}, isApp: ${isApp}`);
    if (!isApp || layerAnimBuffer.size === 0)
      return;
    const fs = requireNativeModule("fs");
    for (const [layerName, animsMap] of layerAnimBuffer) {
      console.log(`[Layers:Flush] Processing layer "${layerName}" with ${animsMap.size} animations`);
      const collection = Collection.all.find(
        (c) => c.export_codec === "animorph_layer" && c.name === layerName
      );
      if (!collection?.export_path) {
        console.log(`[Layers:Flush] No collection/export_path found for layer "${layerName}"`);
        continue;
      }
      const mergedAnims = {};
      for (const [animName, animData] of animsMap) {
        console.log(`[Layers:Flush] Merging animation "${animName}" with ${Object.keys(animData.bones).length} bones:`, Object.keys(animData.bones));
        if (!mergedAnims[animName]) {
          mergedAnims[animName] = { bones: {} };
        }
        Object.assign(mergedAnims[animName].bones, animData.bones);
        if (animData.length)
          mergedAnims[animName].animation_length = animData.length;
        if (animData.loop !== void 0)
          mergedAnims[animName].loop = animData.loop;
      }
      if (isBBModelLayer(collection.export_path)) {
        try {
          const bbmodelContent = JSON.parse(fs.readFileSync(collection.export_path, "utf-8"));
          if (!bbmodelContent.animations) {
            bbmodelContent.animations = [];
          }
          for (const [animName, animJson] of Object.entries(mergedAnims)) {
            let bbAnim = bbmodelContent.animations.find((a) => a.name === animName);
            if (!bbAnim) {
              bbAnim = {
                uuid: guid(),
                name: animName,
                loop: "once",
                override: false,
                length: 0,
                snapping: 24,
                animators: {}
              };
              bbmodelContent.animations.push(bbAnim);
            }
            if (animJson.animation_length)
              bbAnim.length = animJson.animation_length;
            if (animJson.loop === true)
              bbAnim.loop = "loop";
            else if (animJson.loop === "hold_on_last_frame")
              bbAnim.loop = "hold";
            else if (animJson.loop !== void 0)
              bbAnim.loop = "once";
            if (!bbAnim.animators)
              bbAnim.animators = {};
            for (const [boneName, boneData] of Object.entries(animJson.bones)) {
              const boneUuid = findBoneUuidInBBModel(bbmodelContent, boneName);
              const animatorKey = boneUuid || boneName;
              const keyframes = [];
              for (const channel of ["rotation", "position", "scale"]) {
                if (!boneData[channel])
                  continue;
                for (const [timeStr, val] of Object.entries(boneData[channel])) {
                  const values = Array.isArray(val) ? val : val?.vector || [0, 0, 0];
                  keyframes.push({
                    channel,
                    data_points: [{ x: values[0], y: values[1], z: values[2] }],
                    uuid: guid(),
                    time: parseFloat(timeStr),
                    color: -1,
                    interpolation: val?.lerp_mode || "linear"
                  });
                }
              }
              bbAnim.animators[animatorKey] = {
                name: boneName,
                type: "bone",
                keyframes
              };
            }
          }
          fs.writeFileSync(collection.export_path, JSON.stringify(bbmodelContent, null, 2), "utf-8");
          Blockbench.showQuickMessage(`Layer animations saved into: ${PathModule.basename(collection.export_path)}`);
          debugLog(`[Layers] Flushed animations into bbmodel: ${collection.export_path}`);
        } catch (e) {
          console.error("[Layers] Error writing animations to bbmodel:", e);
        }
      } else {
        const animPath = getLayerAnimPath(collection.export_path);
        console.log(`[Layers:Flush] Animation file path: ${animPath}`);
        let existing = { format_version: "1.8.0", animations: {} };
        try {
          if (fs.existsSync(animPath)) {
            existing = JSON.parse(fs.readFileSync(animPath, "utf-8"));
            console.log(`[Layers:Flush] Loaded existing file with animations: [${Object.keys(existing.animations).join(", ")}]`);
          }
        } catch (e) {
        }
        for (const [animName, animJson] of Object.entries(mergedAnims)) {
          if (!existing.animations[animName]) {
            existing.animations[animName] = { bones: {} };
          }
          Object.assign(existing.animations[animName].bones, animJson.bones);
          if (animJson.length)
            existing.animations[animName].animation_length = animJson.length;
          if (animJson.loop !== void 0)
            existing.animations[animName].loop = animJson.loop;
        }
        console.log(`[Layers:Flush] Final file content:`, JSON.stringify(existing, null, 2));
        try {
          fs.writeFileSync(animPath, JSON.stringify(existing, null, 2), "utf-8");
          Blockbench.showQuickMessage(`Layer animations saved: ${layerName}`);
          debugLog(`[Layers] Flushed animations to: ${animPath}`);
        } catch (e) {
          console.error("[Layers] Error writing layer animations:", e);
        }
      }
    }
    layerAnimBuffer.clear();
  }
  function setupAnimCompileFilter() {
    animCompileFilterHandler = filterLayerAnimCompile;
    Blockbench.on("compile_bedrock_animation", animCompileFilterHandler);
    debugLog("[Layers] Animation compile filter registered");
  }
  function teardownAnimCompileFilter() {
    if (animCompileFilterHandler) {
      Blockbench.removeListener("compile_bedrock_animation", animCompileFilterHandler);
      animCompileFilterHandler = null;
    }
  }
  function serializeLayerAnimations(collection) {
    const layerName = collection.name;
    const prefix = layerName + LAYER_SEPARATOR2;
    const elementUuids = new Set(collection.layer_elements || []);
    const uuidToExportName = /* @__PURE__ */ new Map();
    const nameToExportName = /* @__PURE__ */ new Map();
    for (const group of Group.all) {
      if (elementUuids.has(group.uuid)) {
        const name = group.name || "";
        const exportName = name.startsWith(prefix) ? name.substring(prefix.length) : name;
        uuidToExportName.set(group.uuid, exportName);
        nameToExportName.set(name, exportName);
      }
    }
    if (uuidToExportName.size === 0) {
      return null;
    }
    const animations = {};
    let hasAnimations = false;
    for (const anim of Animation.all) {
      if (!anim.animators)
        continue;
      for (const k in anim.animators) {
        const a = anim.animators[k];
        const kfCount = a?.keyframes?.length || 0;
        const uMatch = uuidToExportName.has(k);
        const nMatch = a?.name ? nameToExportName.has(a.name) : false;
      }
      const bones = {};
      let hasBones = false;
      for (const key in anim.animators) {
        const animator = anim.animators[key];
        if (!animator?.keyframes || animator.keyframes.length === 0)
          continue;
        let exportName = uuidToExportName.get(key);
        if (exportName === void 0 && animator.name) {
          exportName = nameToExportName.get(animator.name);
        }
        if (exportName === void 0)
          continue;
        const channels = {};
        for (const kf of animator.keyframes) {
          const ch = kf.channel || "rotation";
          if (!channels[ch])
            channels[ch] = [];
          const entry = {
            timestamp: kf.time,
            values: kf.data_points?.[0] ? [kf.data_points[0].x, kf.data_points[0].y, kf.data_points[0].z] : [0, 0, 0]
          };
          if (kf.interpolation && kf.interpolation !== "linear") {
            entry.lerp_mode = kf.interpolation;
          }
          channels[ch].push(entry);
        }
        const boneAnim = {};
        for (const [channel, keyframes] of Object.entries(channels)) {
          const kfObj = {};
          for (const kf of keyframes) {
            const timeStr = String(kf.timestamp);
            const val = { vector: kf.values };
            if (kf.lerp_mode)
              val.lerp_mode = kf.lerp_mode;
            kfObj[timeStr] = kf.lerp_mode ? val : kf.values;
          }
          boneAnim[channel] = kfObj;
        }
        bones[exportName] = boneAnim;
        hasBones = true;
      }
      if (hasBones) {
        const animJson = {
          animation_length: anim.length,
          bones
        };
        if (anim.loop && anim.loop !== "once") {
          animJson.loop = anim.loop === "loop" ? true : anim.loop;
        }
        animations[anim.name] = animJson;
        hasAnimations = true;
      }
    }
    if (!hasAnimations) {
      debugLog(`[Layers] No animations found for layer "${layerName}"`);
      return null;
    }
    return {
      format_version: "1.8.0",
      animations
    };
  }
  function loadLayerAnimations(animFilePath) {
    if (!isApp || !animFilePath)
      return;
    const fs = requireNativeModule("fs");
    if (!fs.existsSync(animFilePath))
      return;
    try {
      const content = fs.readFileSync(animFilePath, "utf-8");
      Animator.importFile({
        name: PathModule.basename(animFilePath),
        path: animFilePath,
        content
      });
      debugLog(`[Layers] Loaded layer animations from: ${animFilePath}`);
    } catch (e) {
      console.error("[Layers] Error loading layer animations:", e);
    }
  }
  function loadAnimationsFromBBModel(bbmodelJson, layerName) {
    if (!bbmodelJson.animations || !Array.isArray(bbmodelJson.animations) || bbmodelJson.animations.length === 0) {
      debugLog(`[Layers] No animations found in bbmodel for layer "${layerName}"`);
      return;
    }
    const bedrockAnims = {};
    for (const bbAnim of bbmodelJson.animations) {
      if (!bbAnim.name || !bbAnim.animators)
        continue;
      const bones = {};
      for (const [_key, animator] of Object.entries(bbAnim.animators)) {
        if (!animator?.name || animator.type !== "bone")
          continue;
        if (!animator.keyframes || animator.keyframes.length === 0)
          continue;
        const boneAnim = {};
        for (const kf of animator.keyframes) {
          const channel = kf.channel || "rotation";
          if (!boneAnim[channel])
            boneAnim[channel] = {};
          const dp = kf.data_points?.[0];
          const values = dp ? [
            parseFloat(dp.x) || 0,
            parseFloat(dp.y) || 0,
            parseFloat(dp.z) || 0
          ] : [0, 0, 0];
          const timeStr = String(kf.time);
          if (kf.interpolation && kf.interpolation !== "linear") {
            boneAnim[channel][timeStr] = { vector: values, lerp_mode: kf.interpolation };
          } else {
            boneAnim[channel][timeStr] = values;
          }
        }
        bones[animator.name] = boneAnim;
      }
      if (Object.keys(bones).length === 0)
        continue;
      const animJson = { bones };
      if (bbAnim.length)
        animJson.animation_length = bbAnim.length;
      if (bbAnim.loop === "loop")
        animJson.loop = true;
      else if (bbAnim.loop === "hold")
        animJson.loop = "hold_on_last_frame";
      bedrockAnims[bbAnim.name] = animJson;
    }
    if (Object.keys(bedrockAnims).length === 0)
      return;
    const bedrockJson = {
      format_version: "1.8.0",
      animations: bedrockAnims
    };
    try {
      Animator.importFile({
        name: `${layerName}.animation.json`,
        path: "",
        content: JSON.stringify(bedrockJson)
      });
      debugLog(`[Layers] Loaded ${Object.keys(bedrockAnims).length} animations from bbmodel for layer "${layerName}"`);
    } catch (e) {
      console.error("[Layers] Error loading animations from bbmodel:", e);
    }
  }
  function isBBModelLayer(filePath) {
    return filePath.toLowerCase().endsWith(".bbmodel");
  }
  function getLayerAnimPath(geoPath) {
    if (isBBModelLayer(geoPath)) {
      return geoPath.replace(/\.bbmodel$/i, ".animation.json");
    }
    const ext = geoPath.match(/\.\w+$/)?.[0] || ".json";
    return geoPath.replace(ext, `.animation${ext}`);
  }
  function exportLayerAnimations(collection) {
    if (!collection || collection.export_codec !== "animorph_layer")
      return;
    const layerName = collection.name;
    const prefix = layerName + LAYER_SEPARATOR2;
    const elementUuids = new Set(collection.layer_elements || []);
    const nameMap = /* @__PURE__ */ new Map();
    for (const group of Group.all) {
      if (elementUuids.has(group.uuid)) {
        const name = group.name || "";
        const exportName = name.startsWith(prefix) ? name.substring(prefix.length) : name;
        nameMap.set(name, exportName);
      }
    }
    if (nameMap.size === 0) {
      Blockbench.showQuickMessage("No layer bones found", 2e3);
      return;
    }
    if (animCompileFilterHandler) {
      Blockbench.removeListener("compile_bedrock_animation", animCompileFilterHandler);
    }
    try {
      const allAnims = {};
      for (const anim of Animation.all) {
        const animJson = {
          loop: anim.loop === "loop" ? true : anim.loop === "hold" ? "hold_on_last_frame" : false,
          animation_length: anim.length || void 0
        };
        if (anim.override) {
          animJson.override_previous_animation = true;
        }
        const bones = {};
        if (anim.animators) {
          for (const uuid in anim.animators) {
            const animator = anim.animators[uuid];
            if (!animator || animator.type !== "bone" || !animator.keyframes?.length)
              continue;
            const boneName = animator.name;
            const boneData = {};
            for (const kf of animator.keyframes) {
              const channel = kf.channel;
              if (!channel)
                continue;
              if (!boneData[channel]) {
                boneData[channel] = {};
              }
              const timeKey = kf.time.toString();
              const dp = kf.data_points?.[0];
              if (!dp)
                continue;
              const values = [
                typeof dp.x === "number" ? dp.x : parseFloat(dp.x) || 0,
                typeof dp.y === "number" ? dp.y : parseFloat(dp.y) || 0,
                typeof dp.z === "number" ? dp.z : parseFloat(dp.z) || 0
              ];
              if (kf.interpolation === "linear" || !kf.interpolation) {
                boneData[channel][timeKey] = values;
              } else if (kf.interpolation === "catmullrom") {
                boneData[channel][timeKey] = { vector: values, lerp_mode: "catmullrom" };
              } else {
                boneData[channel][timeKey] = values;
              }
            }
            bones[boneName] = boneData;
          }
        }
        if (Object.keys(bones).length > 0) {
          animJson.bones = bones;
        }
        allAnims[anim.name] = animJson;
      }
      const fullJson = {
        format_version: "1.8.0",
        animations: allAnims
      };
      if (!fullJson?.animations || Object.keys(fullJson.animations).length === 0) {
        Blockbench.showQuickMessage("No animations found", 2e3);
        return;
      }
      const filteredAnims = {};
      for (const [animName, animData] of Object.entries(fullJson.animations)) {
        if (!animData.bones)
          continue;
        const filteredBones = {};
        for (const [boneName, boneData] of Object.entries(animData.bones)) {
          if (nameMap.has(boneName)) {
            filteredBones[nameMap.get(boneName)] = boneData;
          }
        }
        if (Object.keys(filteredBones).length > 0) {
          filteredAnims[animName] = { ...animData, bones: filteredBones };
        }
      }
      if (Object.keys(filteredAnims).length === 0) {
        Blockbench.showQuickMessage("No animations found for this layer", 2e3);
        return;
      }
      const exportJson = {
        format_version: fullJson.format_version || "1.8.0",
        animations: filteredAnims
      };
      const defaultName = layerName + ".animation.json";
      Blockbench.export({
        type: "JSON Animation",
        extensions: ["json"],
        name: defaultName,
        content: JSON.stringify(exportJson, null, 2),
        savetype: "text"
      }, (path) => {
        Blockbench.showQuickMessage(`Exported layer animations: ${PathModule.basename(path.path || path)}`);
        debugLog(`[Layers] Exported layer animations to: ${path.path || path}`);
      });
    } catch (e) {
      console.error("[Layers] Error exporting layer animations:", e);
      Blockbench.showQuickMessage("Error exporting layer animations", 2e3);
    } finally {
      if (animCompileFilterHandler) {
        Blockbench.on("compile_bedrock_animation", animCompileFilterHandler);
      }
    }
  }
  function findLayerTexture(collection) {
    const textureGroup = TextureGroup.all.find((tg) => tg.name === collection.name);
    if (textureGroup) {
      const tex = Texture.all.find((t) => t.group === textureGroup.uuid);
      if (tex)
        return tex;
    }
    if (collection.texture) {
      const tex = Texture.all.find((t) => t.uuid === collection.texture);
      if (tex)
        return tex;
    }
    return Texture.all.find(
      (t) => t.name && (t.name === collection.name || t.name.startsWith(collection.name + "_") || t.name.startsWith(collection.name + "."))
    ) ?? null;
  }
  function doRestoreLayersAfterLoad() {
    const layerCollections = Collection.all.filter(
      (c) => c.export_codec === "animorph_layer"
    );
    if (layerCollections.length === 0)
      return;
    const coldLayers = layerCollections.filter(
      (c) => !c.layer_elements || c.layer_elements.length === 0
    );
    if (coldLayers.length === 0)
      return;
    debugLog(`[Layers] Cold-open restore: ${coldLayers.length} layer(s)`);
    const fs = isApp ? requireNativeModule("fs") : null;
    if (fs && isApp) {
      for (const collection of layerCollections) {
        if (!collection.export_path) {
          debugLog(`[Layers] Layer "${collection.name}" has no export_path on cold open`);
        } else if (collection.export_path) {
          try {
            if (!fs.existsSync(collection.export_path)) {
              debugLog(`[Layers] Layer "${collection.name}" export_path does not exist: ${collection.export_path}`);
              collection.export_path = void 0;
            }
          } catch (e) {
          }
        }
      }
    }
    enableMultiTextures();
    for (const collection of coldLayers) {
      collection.layer_elements = [...collection.children || []];
      const layerTexture = findLayerTexture(collection);
      if (layerTexture) {
        collection.texture = layerTexture.uuid;
        for (const uuid of collection.layer_elements) {
          const cube = Cube.all.find((c) => c.uuid === uuid);
          if (cube)
            applyTextureToLayerCube(cube, layerTexture);
        }
        debugLog(`[Layers] Restored "${collection.name}" \u2192 "${layerTexture.name}", ${collection.layer_elements.length} elements`);
      } else {
        debugLog(`[Layers] No texture found for "${collection.name}"`);
      }
    }
    reapplyMainTexture();
    Canvas.updateAll();
  }
  function restoreLayersAfterLoad() {
    setTimeout(doRestoreLayersAfterLoad, 200);
    debugLog("[Layers] Project selected/restored, checking for file path info...");
  }
  function registerLayerActions() {
    importLayerAction = new Action("animorph_import_layer", {
      name: "Import Model Layer",
      icon: "layers",
      description: "Import a model file as a visual reference layer",
      condition: () => supportsLayers() && Modes.edit,
      click: () => {
        Blockbench.import({
          resource_id: "animorph_layer_model",
          extensions: ["json", "bbmodel"],
          type: "Model Files",
          multiple: true,
          readtype: "text"
        }, (files) => {
          Undo.initEdit({ outliner: true, textures: [], collections: [] });
          for (const file of files) {
            try {
              importLayer(file);
            } catch (e) {
              console.error("[Layers] Error importing layer:", e);
            }
          }
          Undo.finishEdit("Import layers");
        });
      }
    });
    reloadLayerAction = new Action("animorph_reload_layer", {
      name: "Reload Layer",
      icon: "refresh",
      description: "Reload this layer from its source file",
      condition: () => {
        return Collection.selected.length > 0 && Collection.selected.some((c) => c.export_codec === "animorph_layer");
      },
      click: () => {
        for (const collection of Collection.selected) {
          if (collection.export_codec === "animorph_layer") {
            reloadLayer(collection);
          }
        }
      }
    });
    saveLayerAction = new Action("animorph_save_layer", {
      name: "Save Layer",
      icon: "save",
      description: "Save this layer's changes back to its source file",
      condition: () => {
        return Collection.selected.length > 0 && Collection.selected.some((c) => c.export_codec === "animorph_layer");
      },
      click: () => {
        for (const collection of Collection.selected) {
          if (collection.export_codec === "animorph_layer") {
            saveLayer(collection);
          }
        }
      }
    });
    reloadAllLayersAction = new Action("animorph_reload_all_layers", {
      name: "Reload All Layers",
      icon: "sync",
      description: "Reload all layers from their source files",
      condition: () => supportsLayers() && Collection.all.some((c) => c.export_codec === "animorph_layer"),
      click: () => {
        for (const collection of Collection.all) {
          if (collection.export_codec === "animorph_layer" && collection.export_path) {
            reloadLayer(collection);
          }
        }
      }
    });
    toggleVisibilityAction = new Action("animorph_toggle_layer_visibility", {
      name: "Toggle Layer Visibility",
      icon: "visibility",
      description: "Toggle visibility of all elements in this layer",
      condition: () => {
        return Collection.selected.length > 0 && Collection.selected.some((c) => c.export_codec === "animorph_layer");
      },
      click: () => {
        for (const collection of Collection.selected) {
          if (collection.export_codec === "animorph_layer") {
            const elementUuids = collection.layer_elements || [];
            let currentlyVisible = true;
            if (elementUuids.length > 0) {
              const firstUuid = elementUuids[0];
              const element = Group.all.find((g) => g.uuid === firstUuid) || Cube.all.find((c) => c.uuid === firstUuid);
              if (element) {
                currentlyVisible = element.visibility !== false;
              }
            }
            setLayerVisibility(collection, !currentlyVisible);
          }
        }
      }
    });
    exportLayerAnimAction = new Action("animorph_export_layer_animations", {
      name: "Export Layer Animations",
      icon: "movie_filter",
      description: "Export this layer's animations as a separate .animation.json file",
      condition: () => {
        return Collection.selected.length > 0 && Collection.selected.some((c) => c.export_codec === "animorph_layer");
      },
      click: () => {
        for (const collection of Collection.selected) {
          if (collection.export_codec === "animorph_layer") {
            exportLayerAnimations(collection);
          }
        }
      }
    });
    exportLayerModelAction = new Action("animorph_export_layer_model", {
      name: "Export Layer Model",
      icon: "file_upload",
      description: "Export this layer's geometry to a Bedrock geo.json file",
      condition: () => {
        return Collection.selected.length > 0 && Collection.selected.some((c) => c.export_codec === "animorph_layer");
      },
      click: () => {
        for (const collection of Collection.selected) {
          if (collection.export_codec === "animorph_layer") {
            exportLayerModel(collection);
          }
        }
      }
    });
    saveLayerToFileAction = new Action("animorph_save_layer_to_file", {
      name: "Save Layer with Hierarchy",
      icon: "account_tree",
      description: "Save this layer with the full bone hierarchy (main model bones + layer geometry)",
      condition: () => {
        return Collection.selected.length > 0 && Collection.selected.some((c) => c.export_codec === "animorph_layer" && c.export_path);
      },
      click: () => {
        for (const collection of Collection.selected) {
          if (collection.export_codec === "animorph_layer") {
            saveLayerToFile(collection);
          }
        }
      }
    });
    reloadMainModelAction = new Action("animorph_reload_main_model", {
      name: "Reload Model",
      icon: "refresh",
      description: "Reload the current model from file (opens file dialog)",
      condition: () => isApp,
      click: () => {
        if (!isApp) {
          Blockbench.showQuickMessage("Reload Model is only available in the desktop app", 2e3);
          return;
        }
        Blockbench.import({
          resource_id: "reload_model_file",
          extensions: ["bbmodel"],
          type: "Blockbench Model",
          multiple: false,
          readtype: "text"
        }, (files) => {
          if (files && files.length > 0) {
            currentProjectPath = files[0].path;
            Blockbench.showQuickMessage("Model reloaded", 1500);
          }
        });
      }
    });
    deleteHandler = SharedActions.add("delete", {
      subject: "animorph_layer_collection",
      priority: 1,
      condition: () => {
        return Prop.active_panel === "collections" && supportsLayers() && Collection.selected.some((c) => c.export_codec === "animorph_layer");
      },
      run() {
        const collections = Collection.selected.filter((c) => c.export_codec === "animorph_layer");
        Undo.initEdit({
          collections: collections.slice(),
          outliner: true,
          elements: [],
          textures: []
        });
        for (const collection of collections) {
          deleteLayerElements(collection);
          Collection.all.remove(collection);
        }
        Collection.selected.empty();
        updateSelection();
        updateMultiTexturesState();
        Undo.finishEdit("Delete layer");
        Canvas.updateAll();
      }
    });
    const toolbar = Panels.collections?.toolbars?.[0];
    if (toolbar) {
      toolbar.add(importLayerAction);
      toolbar.add(reloadAllLayersAction);
    }
    function injectReloadModelButton() {
      const modeSelector = document.getElementById("mode_selector");
      if (modeSelector && !document.getElementById("mode_reload_btn")) {
        const li = document.createElement("li");
        li.id = "mode_reload_btn";
        li.title = "Reload Model from file";
        li.innerHTML = '<i class="material-icons notranslate icon">refresh</i>\n		Reload';
        li.addEventListener("click", () => {
          if (reloadMainModelAction)
            reloadMainModelAction.click();
        });
        const firstLi = modeSelector.querySelector("li");
        if (firstLi) {
          modeSelector.insertBefore(li, firstLi);
        } else {
          modeSelector.appendChild(li);
        }
        debugLog("[Layers] Injected Reload Model button into mode_selector");
      }
    }
    setTimeout(injectReloadModelButton, 500);
    setTimeout(injectReloadModelButton, 2e3);
    setTimeout(injectReloadModelButton, 5e3);
    Blockbench.on("select_project", injectReloadModelButton);
    if (Collection.prototype.menu) {
      Collection.prototype.menu.addAction(saveLayerAction, 10);
      Collection.prototype.menu.addAction(saveLayerToFileAction, 10.5);
      Collection.prototype.menu.addAction(exportLayerModelAction, 20);
      Collection.prototype.menu.addAction(exportLayerAnimAction, 21);
      Collection.prototype.menu.addAction(reloadLayerAction, 22);
      Collection.prototype.menu.addAction(toggleVisibilityAction, 23);
    }
    setupSaveButtonObserver();
    setupCtrlSHook();
    setupCompileFilters();
    setupAnimCompileFilter();
    selectProjectHandler = restoreLayersAfterLoad;
    Blockbench.on("select_project", selectProjectHandler);
    const trackProjectPath = () => {
      setTimeout(() => {
        if (Project?.save_path) {
          currentProjectPath = Project.save_path;
        } else if (Project?.export_path) {
          currentProjectPath = Project.export_path;
        } else {
          const layerCollections = Collection.all.filter((c) => c.export_codec === "animorph_layer");
          for (const lc of layerCollections) {
            if (lc.export_path) {
              currentProjectPath = lc.export_path;
              break;
            }
          }
        }
        debugLog(`[Layers] Project path tracked: ${currentProjectPath || "unknown"}`);
      }, 200);
    };
    Blockbench.on("select_project", trackProjectPath);
    Blockbench.on("open_project", trackProjectPath);
    Blockbench.on("save_project", trackProjectPath);
    debugLog("\u2713 Layer actions registered");
  }
  function unregisterLayerActions() {
    const toolbar = Panels.collections?.toolbars?.[0];
    if (toolbar) {
      if (importLayerAction)
        toolbar.remove(importLayerAction);
      if (reloadAllLayersAction)
        toolbar.remove(reloadAllLayersAction);
    }
    if (Collection.prototype.menu) {
      Collection.prototype.menu.removeAction("animorph_save_layer");
      Collection.prototype.menu.removeAction("animorph_export_layer_model");
      Collection.prototype.menu.removeAction("animorph_save_layer_to_file");
      Collection.prototype.menu.removeAction("animorph_export_layer_animations");
      Collection.prototype.menu.removeAction("animorph_reload_layer");
      Collection.prototype.menu.removeAction("animorph_toggle_layer_visibility");
    }
    if (importLayerAction) {
      importLayerAction.delete();
      importLayerAction = null;
    }
    if (reloadLayerAction) {
      reloadLayerAction.delete();
      reloadLayerAction = null;
    }
    if (reloadAllLayersAction) {
      reloadAllLayersAction.delete();
      reloadAllLayersAction = null;
    }
    if (saveLayerAction) {
      saveLayerAction.delete();
      saveLayerAction = null;
    }
    if (toggleVisibilityAction) {
      toggleVisibilityAction.delete();
      toggleVisibilityAction = null;
    }
    if (exportLayerModelAction) {
      exportLayerModelAction.delete();
      exportLayerModelAction = null;
    }
    if (saveLayerToFileAction) {
      saveLayerToFileAction.delete();
      saveLayerToFileAction = null;
    }
    if (reloadMainModelAction) {
      reloadMainModelAction.delete();
      reloadMainModelAction = null;
    }
    const reloadBtn = document.getElementById("mode_reload_btn");
    if (reloadBtn) {
      reloadBtn.remove();
      debugLog("[Layers] Removed injected Reload Model button");
    }
    if (exportLayerAnimAction) {
      exportLayerAnimAction.delete();
      exportLayerAnimAction = null;
    }
    if (deleteHandler) {
      deleteHandler.delete();
      deleteHandler = null;
    }
    teardownSaveButtonObserver();
    teardownCtrlSHook();
    teardownCompileFilters();
    teardownAnimCompileFilter();
    if (selectProjectHandler) {
      Blockbench.removeListener("select_project", selectProjectHandler);
      selectProjectHandler = null;
    }
    debugLog("\u2713 Layer actions unregistered");
  }

  // src/texture-layers/index.ts
  var TEXTURE_LAYER_CODEC = "animorph_texture_layer";
  var OVERLAY_INFLATE = 0.05;
  var SUPPORTED_FORMATS2 = [
    "animated_entity_model",
    "geckolib_model",
    "bedrock",
    "bedrock_old"
  ];
  var importTextureLayerAction = null;
  var deleteTextureLayerAction = null;
  var toggleTextureLayerVisAction = null;
  var reloadTextureLayerAction = null;
  var soloButtonObserver = null;
  var soloCollection = null;
  var soloHiddenCubes = [];
  var compileFilterHandlers2 = [];
  function supportsTextureLayers() {
    if (!Format)
      return false;
    if (SUPPORTED_FORMATS2.includes(Format.id))
      return true;
    const formatName = (Format.name || "").toLowerCase();
    const formatId = (Format.id || "").toLowerCase();
    if (formatName.includes("gecko") || formatId.includes("gecko"))
      return true;
    if (formatName.includes("bedrock") || formatId.includes("bedrock"))
      return true;
    if (formatName.includes("entity") || formatId.includes("entity"))
      return true;
    return false;
  }
  function isTextureLayerCollection(collection) {
    return collection && collection.export_codec === TEXTURE_LAYER_CODEC;
  }
  function addTextureBypass2(texture) {
    if (!texture.uuid) {
      texture.uuid = Blockbench.guid();
    }
    if (!Texture.all.includes(texture)) {
      Texture.all.push(texture);
    }
    if (Project && Project.textures && !Project.textures.includes(texture)) {
      Project.textures.push(texture);
    }
  }
  function enableMultiTextures2() {
    for (const fmtId of SUPPORTED_FORMATS2) {
      if (Formats[fmtId]) {
        Formats[fmtId].single_texture = false;
      }
    }
  }
  function discoverTexturesForGeo(filePath, modelName) {
    if (!isApp)
      return [];
    const fs = requireNativeModule("fs");
    const dirname = PathModule.dirname(filePath);
    const paths = [];
    try {
      const dirFiles = fs.readdirSync(dirname);
      for (const f of dirFiles) {
        if (f.match(/\.png$/i) && (f.startsWith(modelName) || f === "texture.png")) {
          paths.push(PathModule.join(dirname, f));
        }
      }
      const sub = PathModule.join(dirname, `${modelName}_textures`);
      if (fs.existsSync(sub) && fs.statSync(sub).isDirectory()) {
        for (const f of fs.readdirSync(sub)) {
          if (f.match(/\.png$/i))
            paths.push(PathModule.join(sub, f));
        }
      }
    } catch (e) {
      console.error("[TextureLayers] Error discovering textures:", e);
    }
    return [...new Set(paths)];
  }
  function extractTexturesFromBBModel(json, layerName) {
    const textures = [];
    if (!json.textures || !Array.isArray(json.textures))
      return textures;
    for (const texData of json.textures) {
      const src = texData.source || "";
      if (!src)
        continue;
      const texture = new Texture({
        name: texData.name || `${layerName}_texture`,
        saved: false
      });
      if (src.startsWith("data:image/png;base64,")) {
        texture.fromDataURL(src);
      }
      addTextureBypass2(texture);
      textures.push(texture);
    }
    return textures;
  }
  function loadTexturesFromGeoFile(filePath, layerName) {
    if (!isApp || !filePath)
      return [];
    const modelName = PathModule.basename(filePath).replace(/\.\w+$/, "").replace(/\.geo$/, "");
    const texturePaths = discoverTexturesForGeo(filePath, modelName);
    const textures = [];
    for (const texPath of texturePaths) {
      const texture = new Texture({
        name: PathModule.basename(texPath, ".png"),
        saved: true
      });
      texture.fromPath(texPath);
      addTextureBypass2(texture);
      textures.push(texture);
    }
    return textures;
  }
  function loadTextureFromPNG(filePath, layerName) {
    if (!isApp || !filePath)
      return [];
    const texture = new Texture({ name: layerName, saved: true });
    texture.fromPath(filePath);
    addTextureBypass2(texture);
    return [texture];
  }
  function getBaseCubes() {
    const layerCubeUuids = /* @__PURE__ */ new Set();
    for (const col of Collection.all) {
      if (col.export_codec === "animorph_layer" && col.layer_elements) {
        for (const uuid of col.layer_elements)
          layerCubeUuids.add(uuid);
      }
      if (col.export_codec === TEXTURE_LAYER_CODEC && col.texture_layer_elements) {
        for (const uuid of col.texture_layer_elements)
          layerCubeUuids.add(uuid);
      }
    }
    return Cube.all.filter((c) => !layerCubeUuids.has(c.uuid));
  }
  function createOverlayCubes(layerName, texture) {
    const baseCubes = getBaseCubes();
    const createdCubes = [];
    const createdGroups = [];
    const allElements = [];
    const overlayToBase = {};
    const overlayGroup = new Group({
      name: `TL.${layerName}`,
      origin: [0, 0, 0]
    });
    overlayGroup.init();
    overlayGroup.addTo();
    createdGroups.push(overlayGroup);
    allElements.push(overlayGroup);
    for (const baseCube of baseCubes) {
      const clonedCube = new Cube({
        name: `TL.${layerName}.${baseCube.name}`,
        from: [
          baseCube.from[0] - OVERLAY_INFLATE,
          baseCube.from[1] - OVERLAY_INFLATE,
          baseCube.from[2] - OVERLAY_INFLATE
        ],
        to: [
          baseCube.to[0] + OVERLAY_INFLATE,
          baseCube.to[1] + OVERLAY_INFLATE,
          baseCube.to[2] + OVERLAY_INFLATE
        ],
        origin: baseCube.origin ? [...baseCube.origin] : [0, 0, 0],
        rotation: baseCube.rotation ? [...baseCube.rotation] : void 0,
        inflate: (baseCube.inflate || 0) + OVERLAY_INFLATE
      });
      clonedCube.init();
      if (baseCube.faces) {
        for (const faceKey in baseCube.faces) {
          if (clonedCube.faces[faceKey] && baseCube.faces[faceKey]) {
            const baseFace = baseCube.faces[faceKey];
            clonedCube.faces[faceKey].uv = baseFace.uv ? [...baseFace.uv] : [0, 0, 0, 0];
            clonedCube.faces[faceKey].texture = texture.uuid;
            if (baseFace.rotation !== void 0) {
              clonedCube.faces[faceKey].rotation = baseFace.rotation;
            }
          }
        }
      }
      const parent = baseCube.parent;
      if (parent && parent !== "root" && parent.uuid) {
        clonedCube.addTo(parent);
      } else {
        clonedCube.addTo(overlayGroup);
      }
      overlayToBase[clonedCube.uuid] = baseCube.uuid;
      createdCubes.push(clonedCube);
      allElements.push(clonedCube);
    }
    setTimeout(() => {
      if (texture.getMaterial) {
        const material = texture.getMaterial();
        for (const cube of createdCubes) {
          if (cube.mesh && material) {
            cube.mesh.material = material;
          }
        }
      }
      Canvas.updateAll();
    }, 100);
    return { cubes: createdCubes, groups: createdGroups, allElements, overlayToBase };
  }
  function importTextureLayer(file) {
    const fileName = file.name || "";
    const filePath = file.path || "";
    const layerName = fileName.replace(/\.\w+$/, "").replace(/\.geo$/, "");
    let textures = [];
    if (fileName.match(/\.png$/i)) {
      textures = loadTextureFromPNG(filePath, layerName);
    } else if (fileName.match(/\.bbmodel$/i)) {
      const json = typeof file.content === "string" ? JSON.parse(file.content) : file.content;
      textures = extractTexturesFromBBModel(json, layerName);
    } else if (fileName.match(/\.json$/i)) {
      textures = loadTexturesFromGeoFile(filePath, layerName);
    }
    if (textures.length === 0) {
      Blockbench.showQuickMessage(`No textures found for: ${layerName}`, 2e3);
      return;
    }
    const textureGroup = new TextureGroup({ name: `TL: ${layerName}` });
    textureGroup.folded = true;
    textureGroup.add();
    for (const tex of textures) {
      tex.group = textureGroup.uuid;
    }
    const primaryTexture = textures[0];
    const { allElements, overlayToBase } = createOverlayCubes(layerName, primaryTexture);
    const collection = new Collection({
      name: `TL: ${layerName}`,
      children: allElements.map((e) => e.uuid),
      export_codec: TEXTURE_LAYER_CODEC
    });
    collection.texture_layer_textures = textures.map((t) => t.uuid);
    collection.texture_layer_elements = allElements.map((e) => e.uuid);
    collection.texture_layer_overlay_map = overlayToBase;
    collection.texture_layer_source = filePath;
    collection.texture_layer_visible = true;
    collection.add();
    enableMultiTextures2();
    Canvas.updateAll();
    const cubeCount = Object.keys(overlayToBase).length;
    Blockbench.showQuickMessage(
      `Imported texture layer: ${layerName} (${textures.length} texture${textures.length > 1 ? "s" : ""}, ${cubeCount} overlay cubes)`,
      2e3
    );
    debugLog(`[TextureLayers] Imported: ${layerName} with ${textures.length} textures, ${cubeCount} overlay cubes`);
  }
  function deleteTextureLayerContents(collection) {
    if (!isTextureLayerCollection(collection))
      return;
    const elementUuids = collection.texture_layer_elements || [];
    const elementsToDelete = [];
    for (const uuid of elementUuids) {
      const group = Group.all.find((g) => g.uuid === uuid);
      if (group) {
        elementsToDelete.push(group);
        continue;
      }
      const cube = Cube.all.find((c) => c.uuid === uuid);
      if (cube)
        elementsToDelete.push(cube);
    }
    for (const element of elementsToDelete.reverse()) {
      if (element && element.remove)
        element.remove();
    }
    const textureUuids = collection.texture_layer_textures || [];
    for (const uuid of textureUuids) {
      const tex = Texture.all.find((t) => t.uuid === uuid);
      if (tex) {
        const idx = Texture.all.indexOf(tex);
        if (idx > -1)
          Texture.all.splice(idx, 1);
        if (Project && Project.textures) {
          const pIdx = Project.textures.indexOf(tex);
          if (pIdx > -1)
            Project.textures.splice(pIdx, 1);
        }
      }
    }
    const textureGroup = TextureGroup.all.find((tg) => tg.name === collection.name);
    if (textureGroup) {
      const remaining = Texture.all.filter((t) => t.group === textureGroup.uuid);
      for (const tex of remaining) {
        const idx = Texture.all.indexOf(tex);
        if (idx > -1)
          Texture.all.splice(idx, 1);
        if (Project && Project.textures) {
          const pIdx = Project.textures.indexOf(tex);
          if (pIdx > -1)
            Project.textures.splice(pIdx, 1);
        }
      }
      textureGroup.remove();
    }
  }
  function reloadTextureLayer(collection) {
    if (!isTextureLayerCollection(collection) || !collection.texture_layer_source)
      return;
    if (!isApp)
      return;
    const fs = requireNativeModule("fs");
    const filePath = collection.texture_layer_source;
    if (!fs.existsSync(filePath)) {
      Blockbench.showQuickMessage(`Source file not found: ${filePath}`, 2e3);
      return;
    }
    const wasVisible = collection.texture_layer_visible !== false;
    const collectionName = collection.name;
    deleteTextureLayerContents(collection);
    const fileName = PathModule.basename(filePath);
    const layerName = collectionName.replace(/^TL: /, "");
    let textures = [];
    if (fileName.match(/\.png$/i)) {
      textures = loadTextureFromPNG(filePath, layerName);
    } else if (fileName.match(/\.bbmodel$/i)) {
      const content = fs.readFileSync(filePath, "utf8");
      const json = JSON.parse(content);
      textures = extractTexturesFromBBModel(json, layerName);
    } else if (fileName.match(/\.json$/i)) {
      textures = loadTexturesFromGeoFile(filePath, layerName);
    }
    if (textures.length === 0) {
      Blockbench.showQuickMessage(`No textures found during reload: ${layerName}`, 2e3);
      return;
    }
    const textureGroup = new TextureGroup({ name: collectionName });
    textureGroup.folded = true;
    textureGroup.add();
    for (const tex of textures) {
      tex.group = textureGroup.uuid;
    }
    const primaryTexture = textures[0];
    const { allElements, overlayToBase } = createOverlayCubes(layerName, primaryTexture);
    collection.texture_layer_textures = textures.map((t) => t.uuid);
    collection.texture_layer_elements = allElements.map((e) => e.uuid);
    collection.texture_layer_overlay_map = overlayToBase;
    collection.children = allElements.map((e) => e.uuid);
    collection.texture_layer_visible = wasVisible;
    if (!wasVisible) {
      setTextureLayerVisibility(collection, false);
    }
    Canvas.updateAll();
    Blockbench.showQuickMessage(`Reloaded texture layer: ${layerName}`, 2e3);
    debugLog(`[TextureLayers] Reloaded: ${layerName}`);
  }
  function setTextureLayerVisibility(collection, visible) {
    if (!isTextureLayerCollection(collection))
      return;
    const elementUuids = collection.texture_layer_elements || [];
    for (const uuid of elementUuids) {
      const group = Group.all.find((g) => g.uuid === uuid);
      if (group) {
        group.visibility = visible;
        continue;
      }
      const cube = Cube.all.find((c) => c.uuid === uuid);
      if (cube)
        cube.visibility = visible;
    }
    collection.texture_layer_visible = visible;
    Canvas.updateAll();
  }
  function filterTextureLayerBonesCompile(e) {
    if (!e.model || !e.model["minecraft:geometry"])
      return;
    const overlayUuids = /* @__PURE__ */ new Set();
    for (const col of Collection.all) {
      if (col.export_codec !== TEXTURE_LAYER_CODEC)
        continue;
      if (col.texture_layer_elements) {
        for (const uuid of col.texture_layer_elements)
          overlayUuids.add(uuid);
      }
    }
    if (overlayUuids.size === 0)
      return;
    const overlayNames = /* @__PURE__ */ new Set();
    for (const uuid of overlayUuids) {
      const group = Group.all.find((g) => g.uuid === uuid);
      if (group) {
        overlayNames.add(group.name);
        continue;
      }
      const cube = Cube.all.find((c) => c.uuid === uuid);
      if (cube)
        overlayNames.add(cube.name);
    }
    for (const geo of e.model["minecraft:geometry"]) {
      if (!geo.bones)
        continue;
      geo.bones = geo.bones.filter((bone) => !overlayNames.has(bone.name));
      for (const bone of geo.bones) {
        if (!bone.cubes)
          continue;
        bone.cubes = bone.cubes.filter((cube) => {
          if (cube._name && overlayNames.has(cube._name))
            return false;
          return true;
        });
      }
    }
  }
  function setupCompileFilters2() {
    const codecs = ["bedrock", "geckolib_model", "animated_entity_model", "bedrock_old"];
    const Codecs2 = window.Codecs;
    if (!Codecs2)
      return;
    for (const codecName of codecs) {
      const codec = Codecs2[codecName];
      if (!codec || !codec.on)
        continue;
      const handler = (e) => filterTextureLayerBonesCompile(e);
      codec.on("compile", handler);
      compileFilterHandlers2.push({ codec, handler });
    }
  }
  function teardownCompileFilters2() {
    for (const { codec, handler } of compileFilterHandlers2) {
      if (codec && codec.removeListener) {
        codec.removeListener("compile", handler);
      }
    }
    compileFilterHandlers2.length = 0;
  }
  function enterSoloMode(collection) {
    if (!isTextureLayerCollection(collection))
      return;
    if (soloCollection) {
      exitSoloMode();
    }
    const overlayToBase = collection.texture_layer_overlay_map || {};
    const baseCubeUuids = new Set(Object.values(overlayToBase));
    if (baseCubeUuids.size === 0)
      return;
    soloHiddenCubes = [];
    for (const baseUuid of baseCubeUuids) {
      const cube = Cube.all.find((c) => c.uuid === baseUuid);
      if (cube && cube.visibility !== false) {
        cube.visibility = false;
        soloHiddenCubes.push(cube.uuid);
      }
    }
    setTextureLayerVisibility(collection, true);
    soloCollection = collection;
    Canvas.updateAll();
    Blockbench.showQuickMessage(`Solo: ${collection.name}`, 1500);
    debugLog(`[TextureLayers] Solo mode ON: ${collection.name} (${soloHiddenCubes.length} base cubes hidden)`);
  }
  function exitSoloMode() {
    if (!soloCollection)
      return;
    for (const uuid of soloHiddenCubes) {
      const cube = Cube.all.find((c) => c.uuid === uuid);
      if (cube)
        cube.visibility = true;
    }
    soloHiddenCubes = [];
    const name = soloCollection.name;
    soloCollection = null;
    Canvas.updateAll();
    Blockbench.showQuickMessage(`Solo OFF: ${name}`, 1500);
    debugLog(`[TextureLayers] Solo mode OFF`);
  }
  function toggleSoloMode(collection) {
    if (soloCollection === collection) {
      exitSoloMode();
    } else {
      enterSoloMode(collection);
    }
  }
  function injectSoloButtons() {
    const panelNode = Panels.collections?.node;
    if (!panelNode)
      return;
    const items = panelNode.querySelectorAll("li");
    for (const item of items) {
      if (item.querySelector(".animorph-tl-solo"))
        continue;
      const nameEl = item.querySelector("label, .collection_name, span");
      if (!nameEl)
        continue;
      const name = nameEl.textContent?.trim();
      if (!name)
        continue;
      const collection = Collection.all.find(
        (c) => c.export_codec === TEXTURE_LAYER_CODEC && c.name === name
      );
      if (!collection)
        continue;
      const visBtn = item.querySelector(".in_list_button");
      if (!visBtn || !visBtn.parentNode)
        continue;
      const soloBtn = document.createElement("div");
      soloBtn.className = "in_list_button animorph-tl-solo";
      soloBtn.title = "Solo \u2014 Show only this texture layer (hide base cubes underneath)";
      soloBtn.innerHTML = '<i class="material-icons icon">filter_center_focus</i>';
      soloBtn.style.cursor = "pointer";
      soloBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleSoloMode(collection);
        updateSoloButtonStates();
      });
      visBtn.parentNode.insertBefore(soloBtn, visBtn);
    }
    updateSoloButtonStates();
  }
  function updateSoloButtonStates() {
    const buttons = document.querySelectorAll(".animorph-tl-solo");
    for (const btn of buttons) {
      const icon = btn.querySelector("i");
      if (!icon)
        continue;
      const li = btn.closest("li");
      if (!li)
        continue;
      const nameEl = li.querySelector("label, .collection_name, span");
      const name = nameEl?.textContent?.trim();
      if (!name)
        continue;
      const collection = Collection.all.find(
        (c) => c.export_codec === TEXTURE_LAYER_CODEC && c.name === name
      );
      if (soloCollection && soloCollection === collection) {
        icon.style.color = "#f5a623";
      } else {
        icon.style.color = "";
      }
    }
  }
  function setupSoloButtonObserver() {
    const panelNode = Panels.collections?.node;
    if (!panelNode) {
      setTimeout(setupSoloButtonObserver, 500);
      return;
    }
    injectSoloButtons();
    soloButtonObserver = new MutationObserver(() => {
      injectSoloButtons();
    });
    soloButtonObserver.observe(panelNode, { childList: true, subtree: true });
    debugLog("[TextureLayers] Solo button observer started");
  }
  function teardownSoloButtonObserver() {
    if (soloButtonObserver) {
      soloButtonObserver.disconnect();
      soloButtonObserver = null;
    }
    document.querySelectorAll(".animorph-tl-solo").forEach((el) => el.remove());
  }
  function registerTextureLayerActions() {
    importTextureLayerAction = new Action("animorph_import_texture_layer", {
      name: "Import Texture Layer",
      icon: "texture",
      description: "Import a texture (PNG) or extract from a model file as an overlay layer",
      condition: () => supportsTextureLayers() && Modes.edit,
      click: () => {
        Blockbench.import({
          resource_id: "animorph_texture_layer",
          extensions: ["png", "json", "bbmodel"],
          type: "Texture or Model Files",
          multiple: true,
          readtype: "text"
        }, (files) => {
          Undo.initEdit({ outliner: true, textures: [], collections: [] });
          for (const file of files) {
            try {
              importTextureLayer(file);
            } catch (e) {
              console.error("[TextureLayers] Error importing texture layer:", e);
            }
          }
          Undo.finishEdit("Import texture layers");
        });
      }
    });
    reloadTextureLayerAction = new Action("animorph_reload_texture_layer", {
      name: "Reload Texture Layer",
      icon: "refresh",
      description: "Reload this texture layer from its source file",
      condition: () => {
        return Collection.selected.length > 0 && Collection.selected.some((c) => isTextureLayerCollection(c));
      },
      click: () => {
        for (const collection of Collection.selected) {
          if (isTextureLayerCollection(collection)) {
            reloadTextureLayer(collection);
          }
        }
      }
    });
    toggleTextureLayerVisAction = new Action("animorph_toggle_texture_layer_vis", {
      name: "Toggle Texture Layer Visibility",
      icon: "visibility",
      description: "Toggle visibility of this texture layer overlay",
      condition: () => {
        return Collection.selected.length > 0 && Collection.selected.some((c) => isTextureLayerCollection(c));
      },
      click: () => {
        for (const collection of Collection.selected) {
          if (isTextureLayerCollection(collection)) {
            const visible = collection.texture_layer_visible !== false;
            setTextureLayerVisibility(collection, !visible);
          }
        }
      }
    });
    deleteTextureLayerAction = SharedActions.add("delete", {
      subject: "animorph_texture_layer_collection",
      priority: 1,
      condition: () => {
        return Prop.active_panel === "collections" && supportsTextureLayers() && Collection.selected.some((c) => isTextureLayerCollection(c));
      },
      run() {
        const collections = Collection.selected.filter((c) => isTextureLayerCollection(c));
        Undo.initEdit({
          collections: collections.slice(),
          outliner: true,
          elements: [],
          textures: []
        });
        for (const collection of collections) {
          deleteTextureLayerContents(collection);
          Collection.all.remove(collection);
        }
        Collection.selected.empty();
        updateSelection();
        Undo.finishEdit("Delete texture layer");
        Canvas.updateAll();
      }
    });
    const toolbar = Panels.collections?.toolbars?.[0];
    if (toolbar) {
      toolbar.add(importTextureLayerAction);
    }
    if (Collection.prototype.menu) {
      Collection.prototype.menu.addAction(reloadTextureLayerAction, 12);
      Collection.prototype.menu.addAction(toggleTextureLayerVisAction, 13);
    }
    setupCompileFilters2();
    setupSoloButtonObserver();
    debugLog("\u2713 Texture Layer actions registered");
  }
  function unregisterTextureLayerActions() {
    const toolbar = Panels.collections?.toolbars?.[0];
    if (toolbar) {
      if (importTextureLayerAction)
        toolbar.remove(importTextureLayerAction);
    }
    if (Collection.prototype.menu) {
      Collection.prototype.menu.removeAction("animorph_reload_texture_layer");
      Collection.prototype.menu.removeAction("animorph_toggle_texture_layer_vis");
    }
    if (importTextureLayerAction) {
      importTextureLayerAction.delete();
      importTextureLayerAction = null;
    }
    if (reloadTextureLayerAction) {
      reloadTextureLayerAction.delete();
      reloadTextureLayerAction = null;
    }
    if (toggleTextureLayerVisAction) {
      toggleTextureLayerVisAction.delete();
      toggleTextureLayerVisAction = null;
    }
    if (deleteTextureLayerAction) {
      deleteTextureLayerAction.delete();
      deleteTextureLayerAction = null;
    }
    if (soloCollection)
      exitSoloMode();
    teardownSoloButtonObserver();
    teardownCompileFilters2();
    debugLog("\u2713 Texture Layer actions unregistered");
  }

  // src/emote-config/types.ts
  var DEFAULT_PROPERTIES = {
    freeze: false,
    stopOnDeath: false,
    stopOnHurt: false,
    controllerExceptions: [],
    layerEmotes: {}
  };
  function cloneProperties(props) {
    return {
      freeze: props.freeze,
      stopOnDeath: props.stopOnDeath,
      stopOnHurt: props.stopOnHurt,
      controllerExceptions: [...props.controllerExceptions],
      layerEmotes: { ...props.layerEmotes }
    };
  }

  // src/emote-config/storage.ts
  var STORAGE_PREFIX = "animorph_emote_config_";
  function getAnimationFileName(path) {
    const fileName = path.split(/[/\\]/).pop() || "unknown";
    return fileName.replace(/\.animation\.json$/i, "").replace(/\.json$/i, "");
  }
  function ensureAnimationExtension(fileName) {
    if (/\.animation\.json$/i.test(fileName))
      return fileName;
    const base = fileName.replace(/\.json$/i, "");
    return `${base}.animation.json`;
  }
  function getAnimationsByFile() {
    const groups = {};
    for (const anim of Animation.all) {
      const path = anim.path || "untitled.animation.json";
      if (!groups[path])
        groups[path] = [];
      groups[path].push(anim);
    }
    return groups;
  }
  function storageKey(filePath) {
    const name = getAnimationFileName(filePath);
    return STORAGE_PREFIX + name;
  }
  function saveEmoteConfig(filePath, config) {
    try {
      localStorage.setItem(storageKey(filePath), JSON.stringify(config));
      debugLog(`[EmoteConfig] Saved config for ${filePath}`);
    } catch (e) {
      console.error("[EmoteConfig] Error saving config:", e);
    }
  }
  function loadEmoteConfig(filePath) {
    try {
      const raw = localStorage.getItem(storageKey(filePath));
      if (raw) {
        const parsed = JSON.parse(raw);
        return parsed;
      }
    } catch (e) {
      console.error("[EmoteConfig] Error loading config:", e);
    }
    return createDefaultConfig(filePath);
  }
  function createDefaultConfig(filePath) {
    const animations = {};
    const groups = getAnimationsByFile();
    const anims = groups[filePath] || [];
    for (const anim of anims) {
      animations[anim.name] = {
        useGlobal: true,
        properties: cloneProperties(DEFAULT_PROPERTIES)
      };
    }
    return {
      animationFile: filePath.split(/[/\\]/).pop() || "unknown.animation.json",
      globalProperties: cloneProperties(DEFAULT_PROPERTIES),
      animations
    };
  }

  // src/emote-config/yaml-export.ts
  function serializeProperties(props, indent) {
    let yaml = "";
    yaml += `${indent}freeze: ${props.freeze}
`;
    yaml += `${indent}stop:
`;
    yaml += `${indent}  on_death: ${props.stopOnDeath}
`;
    yaml += `${indent}  on_hurt: ${props.stopOnHurt}
`;
    if (props.controllerExceptions.length > 0) {
      yaml += `${indent}controller_exceptions:
`;
      for (const exception of props.controllerExceptions) {
        yaml += `${indent}  - ${exception}
`;
      }
    } else {
      yaml += `${indent}controller_exceptions: []
`;
    }
    const layerKeys = Object.keys(props.layerEmotes);
    if (layerKeys.length > 0) {
      yaml += `${indent}layer_emotes:
`;
      for (const key of layerKeys) {
        yaml += `${indent}  ${key}: "${props.layerEmotes[key]}"
`;
      }
    }
    return yaml;
  }
  function generateYaml(config) {
    let yaml = "";
    const animFile = ensureAnimationExtension(config.animationFile);
    yaml += `animation: ${animFile}
`;
    yaml += `properties:
`;
    yaml += serializeProperties(config.globalProperties, "  ");
    const personalAnimations = Object.entries(config.animations).filter(([_, animConfig]) => !animConfig.useGlobal);
    if (personalAnimations.length > 0) {
      yaml += `emotes:
`;
      for (const [animName, animConfig] of personalAnimations) {
        yaml += `  ${animName}:
`;
        yaml += `    properties:
`;
        yaml += serializeProperties(animConfig.properties, "      ");
      }
    }
    return yaml;
  }
  function exportYaml(config, filePath) {
    const yaml = generateYaml(config);
    const baseName = getAnimationFileName(filePath);
    const fileName = `${baseName}.yml`;
    Blockbench.export({
      type: "YAML File",
      extensions: ["yml"],
      name: fileName,
      content: yaml,
      savetype: "text"
    });
  }
  function parseYamlValue(raw) {
    const trimmed = raw.trim();
    if (trimmed === "true")
      return true;
    if (trimmed === "false")
      return false;
    if (trimmed === "[]")
      return [];
    if (/^-?\d+(\.\d+)?$/.test(trimmed))
      return Number(trimmed);
    if (trimmed.startsWith('"') && trimmed.endsWith('"') || trimmed.startsWith("'") && trimmed.endsWith("'")) {
      return trimmed.slice(1, -1);
    }
    return trimmed;
  }
  function parsePropertiesFromYamlObj(obj) {
    const props = cloneProperties(DEFAULT_PROPERTIES);
    if (!obj)
      return props;
    if (obj.freeze !== void 0)
      props.freeze = !!obj.freeze;
    if (obj.stop) {
      if (obj.stop.on_death !== void 0)
        props.stopOnDeath = !!obj.stop.on_death;
      if (obj.stop.on_hurt !== void 0)
        props.stopOnHurt = !!obj.stop.on_hurt;
    }
    if (obj.controller_exceptions) {
      if (Array.isArray(obj.controller_exceptions)) {
        props.controllerExceptions = obj.controller_exceptions.map((s) => String(s).trim()).filter((s) => s.length > 0);
      }
    }
    if (obj.layer_emotes && typeof obj.layer_emotes === "object") {
      props.layerEmotes = {};
      for (const key of Object.keys(obj.layer_emotes)) {
        props.layerEmotes[key] = String(obj.layer_emotes[key]);
      }
    }
    return props;
  }
  function parseSimpleYaml(content) {
    const lines = content.split(/\r?\n/);
    const root = {};
    const stack = [{ indent: -1, obj: root, key: null }];
    for (const rawLine of lines) {
      const commentIdx = rawLine.indexOf("#");
      const line = commentIdx >= 0 ? rawLine.slice(0, commentIdx) : rawLine;
      if (line.trim() === "")
        continue;
      const indent = line.length - line.trimStart().length;
      const trimmed = line.trim();
      while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
        stack.pop();
      }
      const parent = stack[stack.length - 1].obj;
      if (trimmed.startsWith("- ")) {
        const val = trimmed.slice(2).trim();
        const parentKey = stack[stack.length - 1].key;
        if (parentKey && Array.isArray(parent[parentKey])) {
          parent[parentKey].push(parseYamlValue(val));
        } else if (parentKey && parent[parentKey] === void 0) {
          parent[parentKey] = [parseYamlValue(val)];
        } else {
          const keys = Object.keys(parent);
          const lastKey = keys[keys.length - 1];
          if (lastKey !== void 0) {
            if (!Array.isArray(parent[lastKey])) {
              parent[lastKey] = [];
            }
            parent[lastKey].push(parseYamlValue(val));
          }
        }
        continue;
      }
      const colonIdx = trimmed.indexOf(":");
      if (colonIdx === -1)
        continue;
      const key = trimmed.slice(0, colonIdx).trim();
      const valueStr = trimmed.slice(colonIdx + 1).trim();
      if (valueStr === "" || valueStr === "") {
        parent[key] = {};
        stack.push({ indent, obj: parent[key], key: null });
      } else if (valueStr === "[]") {
        parent[key] = [];
        stack.push({ indent, obj: parent, key });
      } else {
        parent[key] = parseYamlValue(valueStr);
      }
    }
    return root;
  }
  function importYaml(filePath) {
    Blockbench.import({
      resource_id: "animorph_emote_yml",
      extensions: ["yml", "yaml"],
      type: "YAML Emote Properties",
      readtype: "text"
    }, (files) => {
      if (!files || files.length === 0)
        return;
      const file = files[0];
      try {
        const parsed = parseSimpleYaml(file.content);
        const config = yamlObjToConfig(parsed);
        const targetFile = findAnimationFile(config.animationFile, filePath);
        if (targetFile) {
          saveEmoteConfig(targetFile, config);
          Blockbench.showQuickMessage(`Emote properties imported from ${file.name}`, 2e3);
          debugLog(`[EmoteConfig] Imported config from ${file.name} \u2192 ${targetFile}`);
        } else {
          saveEmoteConfig(config.animationFile, config);
          Blockbench.showQuickMessage(`Emote properties imported (file not loaded: ${config.animationFile})`, 2500);
          debugLog(`[EmoteConfig] Imported config from ${file.name} (animation file not found in project)`);
        }
      } catch (e) {
        console.error("[EmoteConfig] Error importing YAML:", e);
        Blockbench.showQuickMessage("Error importing emote properties", 2e3);
      }
    });
  }
  function yamlObjToConfig(obj) {
    const animationFile = obj.animation || "unknown.animation.json";
    const globalProperties = parsePropertiesFromYamlObj(obj.properties);
    const animations = {};
    const emotesObj = obj.emotes || obj.animations;
    if (emotesObj) {
      for (const animName of Object.keys(emotesObj)) {
        const animObj = emotesObj[animName];
        const props = animObj?.properties ? parsePropertiesFromYamlObj(animObj.properties) : cloneProperties(DEFAULT_PROPERTIES);
        animations[animName] = {
          useGlobal: false,
          properties: props
        };
      }
    }
    return { animationFile, globalProperties, animations };
  }
  function findAnimationFile(animFileName, contextFilePath) {
    if (contextFilePath)
      return contextFilePath;
    const groups = getAnimationsByFile();
    for (const path of Object.keys(groups)) {
      const fileName = path.split(/[/\\]/).pop() || "";
      if (fileName === animFileName)
        return path;
      if (getAnimationFileName(path) === getAnimationFileName(animFileName))
        return path;
    }
    return null;
  }

  // src/emote-config/dialog.ts
  function layerEmotesToEntries(map) {
    if (!map || Object.keys(map).length === 0)
      return [];
    return Object.entries(map).map(([layerId, emoteRef]) => ({ layerId, emoteRef }));
  }
  function entriesToLayerEmotes(entries) {
    const result = {};
    for (const e of entries) {
      const id = e.layerId.trim();
      const ref = e.emoteRef.trim();
      if (id && ref)
        result[id] = ref;
    }
    return result;
  }
  function formatLayerEmotesPreview(map) {
    if (!map || Object.keys(map).length === 0)
      return "(none)";
    return Object.entries(map).map(([k, v]) => `${k} \u2192 ${v}`).join(", ");
  }
  var LAYER_EMOTES_TEMPLATE = `
  <div style="border: 1px solid rgba(255,255,255,0.08); border-radius: 4px; padding: 8px; background: rgba(0,0,0,0.15);">
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
      <span style="font-size: 11px; opacity: 0.8;" title="Mapeo de emotes por layer de modelo. Usa 'default' como Layer ID para aplicar a todos los layers">Layer Emotes</span>
      <button class="material-button" @click="onAddLayerEmote(target)"
        style="padding: 2px 8px; font-size: 11px; min-height: 0; line-height: 1.4;">+ Add</button>
    </div>
    <div v-if="target.length === 0" style="font-size: 11px; opacity: 0.4; text-align: center; padding: 4px 0;">
      No layer emotes configured
    </div>
    <div v-for="(entry, idx) in target" :key="idx"
      style="display: flex; gap: 4px; align-items: center; margin-bottom: 4px;">
      <input type="text" class="dark_bordered" v-model="entry.layerId"
        placeholder="Layer ID (or default)"
        style="flex: 1; font-size: 11px; padding: 3px 6px; box-sizing: border-box;">
      <span style="opacity: 0.4; font-size: 11px;">\u2192</span>
      <input type="text" class="dark_bordered" v-model="entry.emoteRef"
        placeholder="emoteFile:animName"
        style="flex: 1.5; font-size: 11px; padding: 3px 6px; box-sizing: border-box;">
      <button class="material-button" @click="onRemoveLayerEmote(target, idx)"
        style="padding: 2px 6px; font-size: 11px; min-height: 0; line-height: 1.4; color: var(--color-close);">\u2715</button>
    </div>
  </div>
`;
  var LAYER_EMOTE_METHODS = {
    onAddLayerEmote(target) {
      target.push({ layerId: "", emoteRef: "" });
    },
    onRemoveLayerEmote(target, idx) {
      target.splice(idx, 1);
    }
  };
  function openFileEmoteConfigDialog(filePath) {
    if (!filePath) {
      Blockbench.showQuickMessage("No animation file selected", 1500);
      return;
    }
    const config = loadEmoteConfig(filePath);
    const groups = getAnimationsByFile();
    const animations = groups[filePath] || [];
    const baseName = getAnimationFileName(filePath);
    syncAnimations(config, animations);
    const animNames = animations.map((a) => a.name);
    const animData = buildAnimData(config, animNames);
    const dialog = new Dialog({
      id: "animorph_emote_file_config",
      title: "Emote Properties - " + baseName,
      width: 620,
      component: {
        data: {
          currentFile: filePath,
          globalFreeze: config.globalProperties.freeze,
          globalStopOnDeath: config.globalProperties.stopOnDeath,
          globalStopOnHurt: config.globalProperties.stopOnHurt,
          globalControllerExceptions: config.globalProperties.controllerExceptions.join(", "),
          globalLayerEmotes: layerEmotesToEntries(config.globalProperties.layerEmotes),
          animNames,
          animData
        },
        methods: {
          ...LAYER_EMOTE_METHODS,
          onSave() {
            const builtConfig = this.buildConfig();
            saveEmoteConfig(this.currentFile, builtConfig);
            Blockbench.showQuickMessage("Emote properties saved", 1500);
          },
          onExport() {
            const builtConfig = this.buildConfig();
            saveEmoteConfig(this.currentFile, builtConfig);
            exportYaml(builtConfig, this.currentFile);
          },
          onImport() {
            const currentFile = this.currentFile;
            importYaml(currentFile);
            setTimeout(() => {
              dialog.hide().delete();
              openFileEmoteConfigDialog(currentFile);
            }, 500);
          },
          buildConfig() {
            const globalProps = {
              freeze: this.globalFreeze,
              stopOnDeath: this.globalStopOnDeath,
              stopOnHurt: this.globalStopOnHurt,
              controllerExceptions: parseExceptionList(this.globalControllerExceptions),
              layerEmotes: entriesToLayerEmotes(this.globalLayerEmotes)
            };
            const anims = {};
            for (const name of this.animNames) {
              const ad = this.animData[name];
              anims[name] = {
                useGlobal: ad.useGlobal,
                properties: {
                  freeze: ad.freeze,
                  stopOnDeath: ad.stopOnDeath,
                  stopOnHurt: ad.stopOnHurt,
                  controllerExceptions: parseExceptionList(ad.controllerExceptions),
                  layerEmotes: entriesToLayerEmotes(ad.layerEmotes)
                }
              };
            }
            const rawFileName = this.currentFile.split(/[/\\]/).pop() || "unknown.animation.json";
            const fileName = ensureAnimationExtension(rawFileName);
            return {
              animationFile: fileName,
              globalProperties: globalProps,
              animations: anims
            };
          }
        },
        template: `
        <div style="padding: 4px 0 8px; max-height: 500px; overflow-y: auto;">
          <!-- Global Properties -->
          <div style="border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 12px; margin-bottom: 12px;">
            <div style="font-weight: 600; margin-bottom: 10px; font-size: 13px; color: var(--color-accent);">
              Global Properties
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 10px;">
              <label style="display: flex; align-items: center; gap: 6px; font-size: 12px;" title="Si es true, el jugador no podr\xE1 moverse mientras se reproduce el emote">
                <input type="checkbox" v-model="globalFreeze"> Freeze
              </label>
              <label style="display: flex; align-items: center; gap: 6px; font-size: 12px;" title="Si es true, el emote se detendr\xE1 cuando el jugador muera">
                <input type="checkbox" v-model="globalStopOnDeath"> Stop on Death
              </label>
              <label style="display: flex; align-items: center; gap: 6px; font-size: 12px;" title="Si es true, el emote se detendr\xE1 cuando el jugador reciba da\xF1o">
                <input type="checkbox" v-model="globalStopOnHurt"> Stop on Hurt
              </label>
            </div>
            <div style="margin-bottom: 10px;">
              <label style="font-size: 12px; opacity: 0.8; display: block; margin-bottom: 4px;" title="Lista de controladores de animaci\xF3n que no ser\xE1n afectados por el emote">Controller Exceptions (comma separated)</label>
              <input type="text" class="dark_bordered" v-model="globalControllerExceptions"
                placeholder="idle, walk, run" style="width: 100%; box-sizing: border-box;">
            </div>
            ${LAYER_EMOTES_TEMPLATE.replace(/target/g, "globalLayerEmotes")}
          </div>

          <!-- Per-Emote Overrides -->
          <div v-if="animNames.length > 0" style="margin-top: 4px;">
            <div style="font-weight: 600; margin-bottom: 8px; font-size: 13px; opacity: 0.8;">
              Per-Emote Overrides
            </div>

            <div v-for="name in animNames" :key="name"
              style="border: 1px solid rgba(255,255,255,0.07); border-radius: 5px; padding: 10px; margin-bottom: 8px;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                <span style="font-weight: 500; font-size: 12px;">{{ name }}</span>
                <label style="display: flex; align-items: center; gap: 5px; font-size: 11px; opacity: 0.7;">
                  <input type="checkbox" v-model="animData[name].useGlobal"> Use Global
                </label>
              </div>

              <div v-if="!animData[name].useGlobal" style="padding-left: 8px; border-left: 2px solid var(--color-accent); margin-top: 6px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; margin-bottom: 8px;">
                  <label style="display: flex; align-items: center; gap: 5px; font-size: 11px;">
                    <input type="checkbox" v-model="animData[name].freeze"> Freeze
                  </label>
                  <label style="display: flex; align-items: center; gap: 5px; font-size: 11px;">
                    <input type="checkbox" v-model="animData[name].stopOnDeath"> Stop on Death
                  </label>
                  <label style="display: flex; align-items: center; gap: 5px; font-size: 11px;">
                    <input type="checkbox" v-model="animData[name].stopOnHurt"> Stop on Hurt
                  </label>
                </div>
                <div style="margin-bottom: 8px;">
                  <label style="font-size: 11px; opacity: 0.7; display: block; margin-bottom: 3px;">Controller Exceptions</label>
                  <input type="text" class="dark_bordered" v-model="animData[name].controllerExceptions"
                    placeholder="idle, walk" style="width: 100%; box-sizing: border-box; font-size: 11px;">
                </div>
                ${LAYER_EMOTES_TEMPLATE.replace(/target/g, "animData[name].layerEmotes")}
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div style="display: flex; gap: 8px; margin-top: 12px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 12px;">
            <button class="material-button" @click="onSave" style="flex: 1;">Save</button>
            <button class="material-button" @click="onExport" style="flex: 1;">Export .yml</button>
            <button class="material-button" @click="onImport" style="flex: 1;">Import .yml</button>
          </div>
        </div>
      `
      },
      onConfirm() {
        const builtConfig = dialog.component.buildConfig();
        if (builtConfig) {
          saveEmoteConfig(filePath, builtConfig);
          debugLog("[EmoteConfig] Config saved on confirm");
        }
      },
      onCancel() {
        dialog.hide().delete();
      }
    });
    dialog.show();
  }
  function openAnimationEmoteConfigDialog(animation) {
    if (!animation)
      return;
    const filePath = animation.path || "untitled.animation.json";
    const animName = animation.name;
    const config = loadEmoteConfig(filePath);
    const groups = getAnimationsByFile();
    const animations = groups[filePath] || [];
    syncAnimations(config, animations);
    const animConfig = config.animations[animName] || {
      useGlobal: true,
      properties: cloneProperties(DEFAULT_PROPERTIES)
    };
    const dialog = new Dialog({
      id: "animorph_emote_anim_config",
      title: "Emote Properties - " + animName,
      width: 500,
      component: {
        data: {
          animName,
          useGlobal: animConfig.useGlobal,
          freeze: animConfig.properties.freeze,
          stopOnDeath: animConfig.properties.stopOnDeath,
          stopOnHurt: animConfig.properties.stopOnHurt,
          controllerExceptions: animConfig.properties.controllerExceptions.join(", "),
          layerEmotes: layerEmotesToEntries(animConfig.properties.layerEmotes),
          // Global preview
          globalFreeze: config.globalProperties.freeze,
          globalStopOnDeath: config.globalProperties.stopOnDeath,
          globalStopOnHurt: config.globalProperties.stopOnHurt,
          globalControllerExceptions: config.globalProperties.controllerExceptions.join(", ") || "(none)",
          globalLayerEmotesPreview: formatLayerEmotesPreview(config.globalProperties.layerEmotes)
        },
        methods: {
          ...LAYER_EMOTE_METHODS,
          onSave() {
            config.animations[animName] = {
              useGlobal: this.useGlobal,
              properties: {
                freeze: this.freeze,
                stopOnDeath: this.stopOnDeath,
                stopOnHurt: this.stopOnHurt,
                controllerExceptions: parseExceptionList(this.controllerExceptions),
                layerEmotes: entriesToLayerEmotes(this.layerEmotes)
              }
            };
            saveEmoteConfig(filePath, config);
            Blockbench.showQuickMessage("Animation emote properties saved", 1500);
          }
        },
        template: `
        <div style="padding: 4px 0 8px;">
          <div style="margin-bottom: 12px;">
            <label style="display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600;">
              <input type="checkbox" v-model="useGlobal"> Use Global Properties
            </label>
          </div>

          <!-- Global preview -->
          <div v-if="useGlobal" style="border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 10px; opacity: 0.6;">
            <div style="font-size: 11px; font-weight: 500; margin-bottom: 6px; opacity: 0.7;">Global Properties (read-only)</div>
            <div style="font-size: 11px; line-height: 1.6;">
              Freeze: <strong>{{ globalFreeze }}</strong><br>
              Stop on Death: <strong>{{ globalStopOnDeath }}</strong><br>
              Stop on Hurt: <strong>{{ globalStopOnHurt }}</strong><br>
              Controller Exceptions: <strong>{{ globalControllerExceptions }}</strong><br>
              Layer Emotes: <strong>{{ globalLayerEmotesPreview }}</strong>
            </div>
          </div>

          <!-- Per-animation properties -->
          <div v-if="!useGlobal" style="border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 12px;">
            <div style="font-weight: 600; margin-bottom: 10px; font-size: 13px; color: var(--color-accent);">
              {{ animName }} Properties
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 10px;">
              <label style="display: flex; align-items: center; gap: 6px; font-size: 12px;">
                <input type="checkbox" v-model="freeze"> Freeze
              </label>
              <label style="display: flex; align-items: center; gap: 6px; font-size: 12px;">
                <input type="checkbox" v-model="stopOnDeath"> Stop on Death
              </label>
              <label style="display: flex; align-items: center; gap: 6px; font-size: 12px;">
                <input type="checkbox" v-model="stopOnHurt"> Stop on Hurt
              </label>
            </div>
            <div style="margin-bottom: 10px;">
              <label style="font-size: 12px; opacity: 0.8; display: block; margin-bottom: 4px;">Controller Exceptions (comma separated)</label>
              <input type="text" class="dark_bordered" v-model="controllerExceptions"
                placeholder="idle, walk, run" style="width: 100%; box-sizing: border-box;">
            </div>
            ${LAYER_EMOTES_TEMPLATE.replace(/target/g, "layerEmotes")}
          </div>

          <!-- Save Button -->
          <div style="margin-top: 12px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 12px;">
            <button class="material-button" @click="onSave" style="width: 100%;">Save</button>
          </div>
        </div>
      `
      },
      onConfirm() {
        const data = dialog.component.data;
        config.animations[animName] = {
          useGlobal: data.useGlobal,
          properties: {
            freeze: data.freeze,
            stopOnDeath: data.stopOnDeath,
            stopOnHurt: data.stopOnHurt,
            controllerExceptions: parseExceptionList(data.controllerExceptions),
            layerEmotes: entriesToLayerEmotes(data.layerEmotes)
          }
        };
        saveEmoteConfig(filePath, config);
        debugLog("[EmoteConfig] Animation config saved on confirm");
      },
      onCancel() {
        dialog.hide().delete();
      }
    });
    dialog.show();
  }
  function syncAnimations(config, animations) {
    for (const anim of animations) {
      if (!config.animations[anim.name]) {
        config.animations[anim.name] = {
          useGlobal: true,
          properties: cloneProperties(DEFAULT_PROPERTIES)
        };
      }
    }
    for (const name of Object.keys(config.animations)) {
      if (!animations.find((a) => a.name === name)) {
        delete config.animations[name];
      }
    }
  }
  function buildAnimData(config, animNames) {
    const animData = {};
    for (const name of animNames) {
      const ac = config.animations[name];
      animData[name] = {
        useGlobal: ac.useGlobal,
        freeze: ac.properties.freeze,
        stopOnDeath: ac.properties.stopOnDeath,
        stopOnHurt: ac.properties.stopOnHurt,
        controllerExceptions: ac.properties.controllerExceptions.join(", "),
        layerEmotes: layerEmotesToEntries(ac.properties.layerEmotes)
      };
    }
    return animData;
  }
  function parseExceptionList(input) {
    if (!input || !input.trim())
      return [];
    return input.split(",").map((s) => s.trim()).filter((s) => s.length > 0);
  }

  // src/emote-config/index.ts
  var fileMenuAction = null;
  var fileImportAction = null;
  var animMenuAction = null;
  function registerEmoteConfig() {
    fileMenuAction = {
      name: "Emote Properties",
      icon: "tune",
      click(filePath) {
        openFileEmoteConfigDialog(filePath);
      }
    };
    fileImportAction = {
      name: "Import Emote Properties",
      icon: "file_upload",
      click(filePath) {
        importYaml(filePath);
      }
    };
    animMenuAction = {
      name: "Emote Properties",
      icon: "tune",
      click(animation) {
        openAnimationEmoteConfigDialog(animation);
      }
    };
    if (Animation.prototype.file_menu?.structure) {
      Animation.prototype.file_menu.structure.push("_", fileMenuAction, fileImportAction);
    }
    if (Animation.prototype.menu?.structure) {
      Animation.prototype.menu.structure.push("_", animMenuAction);
    }
    debugLog("\u2713 Emote config context menus registered");
  }
  function unregisterEmoteConfig() {
    if (Animation.prototype.file_menu?.structure) {
      const structure = Animation.prototype.file_menu.structure;
      for (const action of [fileImportAction, fileMenuAction]) {
        if (!action)
          continue;
        const idx = structure.indexOf(action);
        if (idx > -1)
          structure.splice(idx, 1);
      }
      const lastIdx = structure.length - 1;
      if (structure[lastIdx] === "_")
        structure.splice(lastIdx, 1);
      for (let i = structure.length - 1; i >= 0; i--) {
        if (structure[i] === "_" && (i === structure.length - 1 || structure[i + 1] === "_")) {
          structure.splice(i, 1);
        }
      }
    }
    if (Animation.prototype.menu?.structure && animMenuAction) {
      const idx = Animation.prototype.menu.structure.indexOf(animMenuAction);
      if (idx > -1) {
        const sepIdx = Animation.prototype.menu.structure.indexOf("_", idx - 1);
        if (sepIdx === idx - 1) {
          Animation.prototype.menu.structure.splice(sepIdx, 2);
        } else {
          Animation.prototype.menu.structure.splice(idx, 1);
        }
      }
    }
    fileMenuAction = null;
    fileImportAction = null;
    animMenuAction = null;
    debugLog("\u2713 Emote config context menus unregistered");
  }

  // src/sync/connection.ts
  var SyncConnection = class {
    constructor(config) {
      this.ws = null;
      this.state = "disconnected" /* DISCONNECTED */;
      this.reconnectAttempts = 0;
      this.maxReconnectAttempts = 5;
      this.reconnectDelay = 2e3;
      this.reconnectTimer = null;
      this.pingInterval = null;
      this.listeners = /* @__PURE__ */ new Map();
      this.config = config;
    }
    /**
     * Conecta al servidor WebSocket
     */
    connect() {
      return new Promise((resolve, reject) => {
        if (this.state === "connected" /* CONNECTED */) {
          resolve();
          return;
        }
        if (this.state === "connecting" /* CONNECTING */) {
          reject(new Error("Already connecting"));
          return;
        }
        this.setState("connecting" /* CONNECTING */);
        const url = `ws://${this.config.host}:${this.config.port}`;
        debugLog(`[Sync] Connecting to ${url}...`);
        try {
          this.ws = new WebSocket(url);
          this.ws.onopen = () => {
            debugLog("[Sync] Connected successfully");
            this.setState("connected" /* CONNECTED */);
            this.reconnectAttempts = 0;
            this.startPingInterval();
            this.emit("connected");
            resolve();
          };
          this.ws.onmessage = (event) => {
            try {
              const message = JSON.parse(event.data);
              this.handleMessage(message);
            } catch (error) {
              console.error("[Sync] Error parsing message:", error);
            }
          };
          this.ws.onerror = (error) => {
            console.error("[Sync] WebSocket error:", error);
            this.setState("error" /* ERROR */);
            this.emit("error", error);
            reject(error);
          };
          this.ws.onclose = () => {
            debugLog("[Sync] Connection closed");
            this.setState("disconnected" /* DISCONNECTED */);
            this.stopPingInterval();
            this.emit("disconnected");
            if (this.config.autoConnect && this.reconnectAttempts < this.maxReconnectAttempts) {
              this.scheduleReconnect();
            }
          };
        } catch (error) {
          console.error("[Sync] Error creating WebSocket:", error);
          this.setState("error" /* ERROR */);
          reject(error);
        }
      });
    }
    /**
     * Desconecta del servidor
     */
    disconnect() {
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
      this.stopPingInterval();
      if (this.ws) {
        this.ws.close();
        this.ws = null;
      }
      this.setState("disconnected" /* DISCONNECTED */);
    }
    /**
     * Envía un mensaje al servidor
     */
    send(message) {
      if (this.state !== "connected" /* CONNECTED */ || !this.ws) {
        console.warn("[Sync] Cannot send message: not connected");
        return false;
      }
      try {
        this.ws.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error("[Sync] Error sending message:", error);
        return false;
      }
    }
    /**
     * Obtiene el estado actual de la conexión
     */
    getState() {
      return this.state;
    }
    /**
     * Verifica si está conectado
     */
    isConnected() {
      return this.state === "connected" /* CONNECTED */;
    }
    /**
     * Actualiza la configuración
     */
    updateConfig(config) {
      this.config = { ...this.config, ...config };
    }
    /**
     * Obtiene la configuración actual
     */
    getConfig() {
      return { ...this.config };
    }
    /**
     * Registra un listener para eventos
     */
    on(event, callback) {
      if (!this.listeners.has(event)) {
        this.listeners.set(event, /* @__PURE__ */ new Set());
      }
      this.listeners.get(event).add(callback);
    }
    /**
     * Remueve un listener
     */
    off(event, callback) {
      const listeners = this.listeners.get(event);
      if (listeners) {
        listeners.delete(callback);
      }
    }
    /**
     * Emite un evento
     */
    emit(event, data) {
      const listeners = this.listeners.get(event);
      if (listeners) {
        listeners.forEach((callback) => callback(data));
      }
    }
    /**
     * Maneja mensajes entrantes
     */
    handleMessage(message) {
      debugLog(`[Sync] Received message type: ${message.type}`);
      switch (message.type) {
        case "pong":
          break;
        default:
          this.emit("message", message);
          this.emit(message.type, message.data);
          break;
      }
    }
    /**
     * Cambia el estado de la conexión
     */
    setState(state) {
      if (this.state !== state) {
        this.state = state;
        this.emit("stateChange", state);
        debugLog(`[Sync] State changed to: ${state}`);
      }
    }
    /**
     * Programa un intento de reconexión
     */
    scheduleReconnect() {
      if (this.reconnectTimer)
        return;
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * this.reconnectAttempts;
      debugLog(`[Sync] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      this.reconnectTimer = window.setTimeout(() => {
        this.reconnectTimer = null;
        this.connect().catch(() => {
        });
      }, delay);
    }
    /**
     * Inicia el intervalo de ping para mantener la conexión viva
     */
    startPingInterval() {
      this.stopPingInterval();
      this.pingInterval = window.setInterval(() => {
        this.send({
          type: "ping",
          timestamp: Date.now()
        });
      }, 3e4);
    }
    /**
     * Detiene el intervalo de ping
     */
    stopPingInterval() {
      if (this.pingInterval) {
        clearInterval(this.pingInterval);
        this.pingInterval = null;
      }
    }
  };
  var syncConnection = null;
  function getSyncConnection() {
    if (!syncConnection) {
      const savedConfig = loadSyncConfig();
      syncConnection = new SyncConnection(savedConfig);
    }
    return syncConnection;
  }
  function loadSyncConfig() {
    try {
      const saved = localStorage.getItem("animorph_sync_config");
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error("[Sync] Error loading config:", error);
    }
    return {
      host: "localhost",
      port: 8765,
      autoConnect: false
    };
  }
  function saveSyncConfig(config) {
    try {
      localStorage.setItem("animorph_sync_config", JSON.stringify(config));
      debugLog("[Sync] Config saved");
    } catch (error) {
      console.error("[Sync] Error saving config:", error);
    }
  }

  // src/sync/animation-transformer.ts
  function transformAnimation(blockbenchAnim, isEmote = false) {
    const bedrockAnim = {
      animation_length: blockbenchAnim.length,
      bones: {}
    };
    if (blockbenchAnim.loop !== "once") {
      bedrockAnim.loop = blockbenchAnim.loop === "loop" ? true : blockbenchAnim.loop;
    }
    const soundEffects = {};
    for (const uuid in blockbenchAnim.animators) {
      const animator = blockbenchAnim.animators[uuid];
      if (animator.type === "effect") {
        processSoundEffects(animator, soundEffects);
        continue;
      }
      if (animator.type !== "bone") {
        continue;
      }
      const boneName = animator.name;
      if (!bedrockAnim.bones[boneName]) {
        bedrockAnim.bones[boneName] = {};
      }
      const channelGroups = groupKeyframesByChannel(animator.keyframes);
      for (const channel in channelGroups) {
        const keyframes = channelGroups[channel];
        const bedrockChannel = {};
        for (const kf of keyframes) {
          const values = kf.data_points.map((dp) => [
            parseFloat(dp.x.toString()),
            parseFloat(dp.y.toString()),
            parseFloat(dp.z.toString())
          ])[0];
          const timeStr = formatTime2(kf.time);
          bedrockChannel[timeStr] = values;
        }
        if (channel === "rotation") {
          bedrockAnim.bones[boneName].rotation = bedrockChannel;
        } else if (channel === "position") {
          bedrockAnim.bones[boneName].position = bedrockChannel;
        } else if (channel === "scale") {
          bedrockAnim.bones[boneName].scale = bedrockChannel;
        }
      }
    }
    if (Object.keys(soundEffects).length > 0) {
      bedrockAnim.sound_effects = soundEffects;
    }
    let animName = blockbenchAnim.name;
    const isAnimEmote = blockbenchAnim.anim_type === "emote" || isEmote;
    if (isAnimEmote) {
      if (!animName.startsWith("emote.")) {
        animName = `emote.${animName}`;
      }
    } else {
      if (animName.startsWith("emote.")) {
        animName = animName.substring(6);
      }
      if (!animName.startsWith("animation.")) {
        animName = `animation.${animName}`;
      }
    }
    const bedrockFile = {
      format_version: "1.8.0",
      animations: {
        [animName]: bedrockAnim
      }
    };
    debugLog(`[Transformer] Transformed animation: ${animName} (type: ${blockbenchAnim.anim_type || "model"})`);
    return bedrockFile;
  }
  function groupKeyframesByChannel(keyframes) {
    const groups = {};
    for (const kf of keyframes) {
      if (!groups[kf.channel]) {
        groups[kf.channel] = [];
      }
      groups[kf.channel].push(kf);
    }
    for (const channel in groups) {
      groups[channel].sort((a, b) => a.time - b.time);
    }
    return groups;
  }
  function processSoundEffects(animator, soundEffects) {
    for (const kf of animator.keyframes) {
      if (kf.channel === "sound") {
        const timeStr = formatTime2(kf.time);
        const effectName = "sound_effect.mp3";
        soundEffects[timeStr] = {
          effect: effectName
        };
      }
    }
  }
  function formatTime2(time) {
    const rounded = Math.round(time * 1e4) / 1e4;
    let str = rounded.toString();
    if (!str.includes(".")) {
      str += ".0";
    }
    return str;
  }
  function transformAnimations(animations, isEmote = false) {
    const result = {
      format_version: "1.8.0",
      animations: {}
    };
    for (const anim of animations) {
      const transformed = transformAnimation(anim, isEmote);
      Object.assign(result.animations, transformed.animations);
    }
    debugLog(`[Transformer] Transformed ${animations.length} animations`);
    return result;
  }

  // src/sync/serializer.ts
  function serializeGeometry() {
    if (!Project)
      return null;
    try {
      let codec = null;
      if (typeof Blockbench !== "undefined" && Blockbench.export) {
        const formatId = Format?.id;
        if (formatId === "bedrock" || formatId === "bedrock_block") {
          if (Format.codec) {
            codec = Format.codec;
          }
        }
      }
      if (!codec || !codec.compile) {
        debugLog("[Sync] Using manual compilation");
        return compileGeometryManual();
      }
      const options = {};
      let compiled = codec.compile(options);
      if (typeof compiled === "string") {
        try {
          compiled = JSON.parse(compiled);
        } catch (e) {
          console.warn("[Sync] Could not parse codec output, using manual compilation");
          return compileGeometryManual();
        }
      }
      debugLog("[Sync] Serialized geometry using codec");
      return compiled;
    } catch (error) {
      console.error("[Sync] Error serializing geometry:", error);
      try {
        return compileGeometryManual();
      } catch (fallbackError) {
        console.error("[Sync] Manual compilation also failed:", fallbackError);
        return null;
      }
    }
  }
  function compileGeometryManual() {
    if (!Project)
      return null;
    const bones = [];
    function processGroup(group, parentPath = []) {
      const bone = {
        name: group.name || "bone",
        pivot: group.origin || [0, 0, 0],
        rotation: group.rotation || [0, 0, 0],
        cubes: []
      };
      if (group.parent && group.parent.name) {
        bone.parent = group.parent.name;
      }
      if (group.children) {
        for (const child of group.children) {
          if (child.type === "cube") {
            const cube = {
              origin: child.from || [0, 0, 0],
              size: [
                (child.to ? child.to[0] : 0) - (child.from ? child.from[0] : 0),
                (child.to ? child.to[1] : 0) - (child.from ? child.from[1] : 0),
                (child.to ? child.to[2] : 0) - (child.from ? child.from[2] : 0)
              ],
              pivot: child.origin || [0, 0, 0],
              rotation: child.rotation || [0, 0, 0],
              uv: child.uv_offset ? [child.uv_offset[0], child.uv_offset[1]] : [0, 0]
            };
            if (child.inflate) {
              cube.inflate = child.inflate;
            }
            if (child.mirror_uv) {
              cube.mirror = true;
            }
            bone.cubes.push(cube);
          }
        }
      }
      bones.push(bone);
      if (group.children) {
        for (const child of group.children) {
          if (child.type === "group") {
            processGroup(child, [...parentPath, group.name]);
          }
        }
      }
    }
    if (typeof Group !== "undefined" && Group.all) {
      for (const group of Group.all) {
        if (!group.parent || group.parent.type !== "group") {
          processGroup(group);
        }
      }
    }
    if (typeof Cube !== "undefined" && Cube.all) {
      const orphanCubes = [];
      for (const cube of Cube.all) {
        if (!cube.parent || cube.parent.type !== "group") {
          orphanCubes.push({
            origin: cube.from || [0, 0, 0],
            size: [
              (cube.to ? cube.to[0] : 0) - (cube.from ? cube.from[0] : 0),
              (cube.to ? cube.to[1] : 0) - (cube.from ? cube.from[1] : 0),
              (cube.to ? cube.to[2] : 0) - (cube.from ? cube.from[2] : 0)
            ],
            pivot: cube.origin || [0, 0, 0],
            rotation: cube.rotation || [0, 0, 0],
            uv: cube.uv_offset ? [cube.uv_offset[0], cube.uv_offset[1]] : [0, 0]
          });
        }
      }
      if (orphanCubes.length > 0) {
        bones.push({
          name: "root",
          pivot: [0, 0, 0],
          cubes: orphanCubes
        });
      }
    }
    const geometry = {
      format_version: "1.12.0",
      "minecraft:geometry": [
        {
          description: {
            identifier: `geometry.${Project.name || "model"}`,
            texture_width: Project.texture_width || 64,
            texture_height: Project.texture_height || 64,
            visible_bounds_width: 2,
            visible_bounds_height: 2,
            visible_bounds_offset: [0, 1, 0]
          },
          bones
        }
      ]
    };
    return geometry;
  }
  function serializeTextures() {
    const textures = [];
    if (!Texture || !Texture.all) {
      return textures;
    }
    for (const texture of Texture.all) {
      try {
        const textureData = {
          id: texture.uuid,
          name: texture.name,
          path: texture.path || "",
          width: texture.width || 0,
          height: texture.height || 0
        };
        if (texture.source && texture.source.startsWith("data:")) {
          textureData.base64 = texture.source;
        } else if (texture.img && texture.img.src) {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = texture.width;
            canvas.height = texture.height;
            const ctx = canvas.getContext("2d");
            if (ctx && texture.img.complete) {
              ctx.drawImage(texture.img, 0, 0);
              textureData.base64 = canvas.toDataURL("image/png");
            }
          } catch (e) {
            console.warn("[Sync] Could not convert texture to base64:", texture.name);
          }
        }
        textures.push(textureData);
      } catch (error) {
        console.error("[Sync] Error serializing texture:", error);
      }
    }
    debugLog(`[Sync] Serialized ${textures.length} textures`);
    return textures;
  }
  function serializeAnimationsAsBedrock() {
    if (!Animation || !Animation.all) {
      return { format_version: "1.8.0", animations: {} };
    }
    const blockbenchAnimations = Animation.all.map((anim) => {
      const cleanedAnimators = {};
      if (anim.animators) {
        for (const uuid in anim.animators) {
          const animator = anim.animators[uuid];
          cleanedAnimators[uuid] = {
            name: animator.name,
            type: animator.type,
            keyframes: animator.keyframes.map((kf) => {
              const cleanKeyframe = {
                time: kf.time,
                channel: kf.channel,
                interpolation: kf.interpolation
              };
              if (kf.data_points && Array.isArray(kf.data_points)) {
                cleanKeyframe.data_points = kf.data_points.map((dp) => {
                  if (typeof dp === "object" && dp !== null) {
                    return {
                      x: dp.x !== void 0 ? dp.x : 0,
                      y: dp.y !== void 0 ? dp.y : 0,
                      z: dp.z !== void 0 ? dp.z : 0
                    };
                  }
                  return dp;
                });
              }
              return cleanKeyframe;
            })
          };
        }
      }
      const animType = anim.extend?.anim_type || anim.anim_type;
      return {
        uuid: anim.uuid,
        name: anim.name,
        loop: anim.loop || "once",
        override: anim.override || false,
        length: anim.length || 0,
        snapping: anim.snapping || 24,
        ...animType && { anim_type: animType },
        animators: cleanedAnimators
      };
    });
    const bedrockFormat = transformAnimations(blockbenchAnimations, false);
    debugLog(`[Sync] Serialized ${blockbenchAnimations.length} animations as Bedrock format`);
    return bedrockFormat;
  }

  // src/sync/project-config.ts
  function resolvePathForType(config, type) {
    const overrideMap = {
      model: config.model_path,
      animation: config.animation_path,
      texture: config.texture_path
    };
    const override = overrideMap[type];
    return override && override.trim() ? override.trim() : config.asset_path;
  }
  function getProjectConfig() {
    if (!Project) {
      return {
        asset_path: "entity/model"
      };
    }
    try {
      const projectKey = `animorph_project_sync_${Project.uuid}`;
      const saved = localStorage.getItem(projectKey);
      if (saved) {
        const config = JSON.parse(saved);
        debugLog(`[ProjectConfig] Loaded config for project ${Project.name}:`, config);
        return config;
      }
    } catch (error) {
      console.error("[ProjectConfig] Error loading config:", error);
    }
    return {
      asset_path: `entity/${Project.name || "model"}`
    };
  }
  function setProjectConfig(config) {
    if (!Project) {
      console.warn("[ProjectConfig] No project active");
      return;
    }
    try {
      const projectKey = `animorph_project_sync_${Project.uuid}`;
      localStorage.setItem(projectKey, JSON.stringify(config));
      debugLog(`[ProjectConfig] Saved config for project ${Project.name}:`, config);
    } catch (error) {
      console.error("[ProjectConfig] Error saving config:", error);
    }
  }
  function getSafeProjectConfig() {
    const config = getProjectConfig();
    return {
      asset_path: config.asset_path || "entity/model",
      model_path: config.model_path,
      animation_path: config.animation_path,
      texture_path: config.texture_path
    };
  }

  // src/sync/manager.ts
  function getModelName() {
    return typeof Project !== "undefined" && Project?.name ? Project.name : "untitled";
  }
  var SyncManager = class {
    constructor() {
      this.lastSyncTime = 0;
    }
    /**
     * Envía una sincronización completa (modelo + animaciones + texturas)
     * Cada tipo se envía con su carpeta destino correspondiente
     */
    syncFull() {
      const connection = getSyncConnection();
      if (!connection.isConnected()) {
        console.warn("[SyncManager] Cannot sync: not connected");
        return;
      }
      this.syncModel();
      this.syncAnimations();
      this.syncTextures();
      this.lastSyncTime = Date.now();
      debugLog("[SyncManager] Full sync sent (model + animations + textures)");
    }
    /**
     * Envía solo la geometría del modelo
     * Destino: models/{asset_path o model_path override}
     */
    syncModel() {
      const connection = getSyncConnection();
      if (!connection.isConnected()) {
        return;
      }
      const geometry = serializeGeometry();
      if (!geometry) {
        return;
      }
      const projectConfig = getSafeProjectConfig();
      const assetPath = resolvePathForType(projectConfig, "model");
      const message = {
        type: "model",
        timestamp: Date.now(),
        asset_path: assetPath,
        data: { model: getModelName(), geometry }
      };
      connection.send(message);
      this.lastSyncTime = Date.now();
      debugLog(`[SyncManager] Model sent \u2192 ${assetPath}`);
    }
    /**
     * Envía las animaciones en formato Bedrock
     * Destino: animations/{asset_path o animation_path override}
     */
    syncAnimations() {
      const connection = getSyncConnection();
      if (!connection.isConnected()) {
        return;
      }
      const bedrockAnimations = serializeAnimationsAsBedrock();
      const projectConfig = getSafeProjectConfig();
      const assetPath = resolvePathForType(projectConfig, "animation");
      const message = {
        type: "animation",
        timestamp: Date.now(),
        asset_path: assetPath,
        data: {
          model: getModelName(),
          ...bedrockAnimations
        }
      };
      connection.send(message);
      this.lastSyncTime = Date.now();
      debugLog(`[SyncManager] Animations sent \u2192 ${assetPath}`);
    }
    /**
     * Envía las texturas
     * Destino: textures/{asset_path o texture_path override}
     */
    syncTextures() {
      const connection = getSyncConnection();
      if (!connection.isConnected()) {
        return;
      }
      const textures = serializeTextures();
      const projectConfig = getSafeProjectConfig();
      const assetPath = resolvePathForType(projectConfig, "texture");
      const message = {
        type: "texture",
        timestamp: Date.now(),
        asset_path: assetPath,
        data: { model: getModelName(), textures }
      };
      connection.send(message);
      this.lastSyncTime = Date.now();
      debugLog(`[SyncManager] Textures sent \u2192 ${assetPath}`);
    }
    /**
     * Obtiene el tiempo desde la última sincronización
     */
    getTimeSinceLastSync() {
      return Date.now() - this.lastSyncTime;
    }
  };
  var syncManager = null;
  function getSyncManager() {
    if (!syncManager) {
      syncManager = new SyncManager();
    }
    return syncManager;
  }

  // src/sync/dialog.ts
  function openSyncDialog() {
    const connection = getSyncConnection();
    const manager = getSyncManager();
    const config = connection.getConfig();
    const projectConfig = getProjectConfig();
    const dialog = new Dialog({
      id: "animorph_sync_dialog",
      title: "Remote Sync",
      width: 500,
      form: {
        host: {
          label: "Host",
          type: "text",
          value: config.host,
          placeholder: "localhost"
        },
        port: {
          label: "Port",
          type: "number",
          value: config.port,
          min: 1,
          max: 65535
        },
        separator: "_",
        autoConnect: {
          label: "Auto-connect on startup",
          type: "checkbox",
          value: config.autoConnect
        },
        separator2: "_",
        asset_path: {
          label: "Asset Path (global)",
          type: "text",
          value: projectConfig.asset_path,
          placeholder: "entity/player"
        },
        separator3: "_",
        model_path: {
          label: "Model Path (override)",
          type: "text",
          value: projectConfig.model_path || "",
          placeholder: "Leave empty to use global"
        },
        animation_path: {
          label: "Animation Path (override)",
          type: "text",
          value: projectConfig.animation_path || "",
          placeholder: "Leave empty to use global"
        },
        texture_path: {
          label: "Texture Path (override)",
          type: "text",
          value: projectConfig.texture_path || "",
          placeholder: "Leave empty to use global"
        }
      },
      component: {
        data: {
          state: connection.getState(),
          projectAssetPath: projectConfig.asset_path,
          projectModelPath: projectConfig.model_path || "",
          projectAnimationPath: projectConfig.animation_path || "",
          projectTexturePath: projectConfig.texture_path || ""
        },
        computed: {
          resolvedModelPath() {
            const formData = dialog.getFormResult();
            const mp = formData.model_path?.trim();
            return mp || formData.asset_path || "entity/model";
          },
          resolvedAnimationPath() {
            const formData = dialog.getFormResult();
            const ap = formData.animation_path?.trim();
            return ap || formData.asset_path || "entity/model";
          },
          resolvedTexturePath() {
            const formData = dialog.getFormResult();
            const tp = formData.texture_path?.trim();
            return tp || formData.asset_path || "entity/model";
          }
        },
        methods: {
          async onConnect() {
            if (connection.getState() === "connecting" /* CONNECTING */)
              return;
            const formData = dialog.getFormResult();
            const newConfig = {
              host: formData.host || "localhost",
              port: parseInt(formData.port) || 8765,
              autoConnect: formData.autoConnect || false
            };
            connection.updateConfig(newConfig);
            saveSyncConfig(newConfig);
            this.state = connection.getState();
            try {
              await connection.connect();
              this.state = connection.getState();
              Blockbench.showQuickMessage("Connected to sync server", 2e3);
            } catch {
              this.state = connection.getState();
              Blockbench.showMessageBox({
                title: "Connection Failed",
                message: "Could not connect to sync server.\n\nMake sure your Fabric mod is running with the WebSocket server active on the specified port."
              });
            }
          },
          onDisconnect() {
            connection.disconnect();
            this.state = connection.getState();
            Blockbench.showQuickMessage("Disconnected from sync server", 2e3);
          },
          onSaveProjectConfig() {
            this._saveConfig();
            Blockbench.showQuickMessage("Project config saved", 1500);
          },
          onSendModel() {
            if (!connection.isConnected()) {
              Blockbench.showQuickMessage("Not connected to sync server", 1500);
              return;
            }
            this._saveConfig();
            manager.syncModel();
            Blockbench.showQuickMessage("Model sent", 2e3);
          },
          onSendAnimations() {
            if (!connection.isConnected()) {
              Blockbench.showQuickMessage("Not connected to sync server", 1500);
              return;
            }
            this._saveConfig();
            manager.syncAnimations();
            Blockbench.showQuickMessage("Animations sent", 2e3);
          },
          onSendTextures() {
            if (!connection.isConnected()) {
              Blockbench.showQuickMessage("Not connected to sync server", 1500);
              return;
            }
            this._saveConfig();
            manager.syncTextures();
            Blockbench.showQuickMessage("Textures sent", 2e3);
          },
          onSendAll() {
            if (!connection.isConnected()) {
              Blockbench.showQuickMessage("Not connected to sync server", 1500);
              return;
            }
            this._saveConfig();
            manager.syncFull();
            Blockbench.showQuickMessage("All sent (model + animations + textures)", 2e3);
          },
          _saveConfig() {
            const formData = dialog.getFormResult();
            const newProjectConfig = {
              asset_path: formData.asset_path || "entity/model",
              model_path: formData.model_path?.trim() || void 0,
              animation_path: formData.animation_path?.trim() || void 0,
              texture_path: formData.texture_path?.trim() || void 0
            };
            setProjectConfig(newProjectConfig);
            this.projectAssetPath = newProjectConfig.asset_path;
            this.projectModelPath = newProjectConfig.model_path || "";
            this.projectAnimationPath = newProjectConfig.animation_path || "";
            this.projectTexturePath = newProjectConfig.texture_path || "";
          }
        },
        template: `
        <div style="padding: 4px 0 8px;">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;">
            <span style="opacity:0.7;">Status</span>
            <span :style="{ color: state === 'connected' ? '#4caf50' : state === 'connecting' ? '#ff9800' : state === 'error' ? '#f44336' : '#aaa', fontWeight: '600' }">
              {{ state === 'connected' ? '\u25CF Connected' : state === 'connecting' ? '\u25D0 Connecting...' : state === 'error' ? '\u2715 Error' : '\u25CB Disconnected' }}
            </span>
          </div>
          <div style="display:flex; gap:8px; margin-bottom:15px;">
            <button class="material-button" @click="onConnect" :disabled="state === 'connecting' || state === 'connected'">Connect</button>
            <button class="material-button" @click="onDisconnect" :disabled="state !== 'connected'">Disconnect</button>
          </div>

          <div style="border-top: 1px solid rgba(0,0,0,0.2); padding-top:12px; margin-top:12px;">
            <div style="font-weight: 600; margin-bottom:6px; font-size:12px; opacity:0.8;">Resolved Paths</div>
            <div style="margin-bottom:8px; font-size:11px; opacity:0.5; line-height:1.6;">
              Model: <span style="font-weight:500;">{{ resolvedModelPath }}</span><br/>
              Animation: <span style="font-weight:500;">{{ resolvedAnimationPath }}</span><br/>
              Texture: <span style="font-weight:500;">{{ resolvedTexturePath }}</span>
            </div>
            <button class="material-button" @click="onSaveProjectConfig" style="width: 100%; margin-bottom:12px;">Save Project Config</button>
          </div>

          <div style="border-top: 1px solid rgba(0,0,0,0.2); padding-top:12px; margin-top:4px;">
            <div style="font-weight: 600; margin-bottom:8px; font-size:12px; opacity:0.8;">Send Changes</div>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px;">
              <button class="material-button" @click="onSendModel" :disabled="state !== 'connected'" style="width:100%;">
                Send Model
              </button>
              <button class="material-button" @click="onSendAnimations" :disabled="state !== 'connected'" style="width:100%;">
                Send Animations
              </button>
              <button class="material-button" @click="onSendTextures" :disabled="state !== 'connected'" style="width:100%;">
                Send Textures
              </button>
              <button class="material-button" @click="onSendAll" :disabled="state !== 'connected'" style="width:100%;">
                Send All
              </button>
            </div>
          </div>
        </div>
      `
      },
      onConfirm(formData) {
        const newConfig = {
          host: formData.host || "localhost",
          port: parseInt(formData.port) || 8765,
          autoConnect: formData.autoConnect || false
        };
        connection.updateConfig(newConfig);
        saveSyncConfig(newConfig);
        const newProjectConfig = {
          asset_path: formData.asset_path || "entity/model",
          model_path: formData.model_path?.trim() || void 0,
          animation_path: formData.animation_path?.trim() || void 0,
          texture_path: formData.texture_path?.trim() || void 0
        };
        setProjectConfig(newProjectConfig);
        debugLog("[Sync] Configuration saved");
      },
      onCancel() {
        dialog.hide().delete();
      }
    });
    const updateProjectConfig = () => {
      const currentProjectConfig = getProjectConfig();
      dialog.component.projectAssetPath = currentProjectConfig.asset_path;
      dialog.component.projectModelPath = currentProjectConfig.model_path || "";
      dialog.component.projectAnimationPath = currentProjectConfig.animation_path || "";
      dialog.component.projectTexturePath = currentProjectConfig.texture_path || "";
    };
    Blockbench.on("select_project", updateProjectConfig);
    dialog.show();
  }
  function updateStatusBar() {
    const connection = getSyncConnection();
    const state = connection.getState();
    let icon = "cloud_off";
    let color = "#999";
    let tooltip2 = "Remote Sync: Disconnected";
    if (state === "connected" /* CONNECTED */) {
      icon = "cloud_done";
      color = "#4caf50";
      tooltip2 = "Remote Sync: Connected";
    } else if (state === "connecting" /* CONNECTING */) {
      icon = "cloud_sync";
      color = "#ff9800";
      tooltip2 = "Remote Sync: Connecting...";
    }
    const statusBarElement = document.getElementById("animorph_sync_status");
    if (statusBarElement) {
      statusBarElement.innerHTML = `<i class="material-icons" style="color: ${color}; vertical-align: middle;">${icon}</i>`;
      statusBarElement.title = tooltip2;
    }
  }

  // src/sync/index.ts
  var syncDialogAction = null;
  function initializeSync() {
    const connection = getSyncConnection();
    registerSyncActions();
    connection.on("stateChange", (_state) => {
      updateStatusBar();
    });
    if (connection.getConfig().autoConnect) {
      debugLog("[Sync] Auto-connecting...");
      connection.connect().catch((error) => {
        console.error("[Sync] Auto-connect failed:", error);
      });
    }
    debugLog("\u2713 Remote sync initialized");
  }
  function cleanupSync() {
    const connection = getSyncConnection();
    connection.disconnect();
    unregisterSyncActions();
    debugLog("\u2713 Remote sync cleaned up");
  }
  function registerSyncActions() {
    syncDialogAction = new Action("animorph_sync_config", {
      name: "Remote Sync",
      icon: "settings_ethernet",
      description: "Configure and manage remote sync with Minecraft",
      click: () => {
        openSyncDialog();
      }
    });
    MenuBar.addAction(syncDialogAction, "tools");
    debugLog("\u2713 Sync actions registered");
  }
  function unregisterSyncActions() {
    if (syncDialogAction) {
      MenuBar.removeAction(syncDialogAction.id);
      syncDialogAction.delete();
      syncDialogAction = null;
    }
    debugLog("\u2713 Sync actions unregistered");
  }

  // src/model-config/types.ts
  var DEFAULT_FIRST_PERSON = {
    show_equipment: false,
    model: {
      show: false,
      offset: { x: 0, y: 0, z: 0 }
    },
    custom_arms: {
      show: false,
      custom_render_items: false,
      both_hands: false
    }
  };
  var DEFAULT_EQUIPMENT = {
    head: "",
    chest: "",
    legs: "",
    feet: "",
    cape: "",
    elytra: ""
  };
  function createDefaultModelConfig(projectName) {
    return {
      display_name: projectName || "model",
      animation: `${projectName || "model"}.animation.json`,
      properties: {
        first_person: { ...DEFAULT_FIRST_PERSON, model: { ...DEFAULT_FIRST_PERSON.model, offset: { x: 0, y: 0, z: 0 } }, custom_arms: { ...DEFAULT_FIRST_PERSON.custom_arms } },
        animation_controllers: [],
        fp_animation_controllers: [],
        texts: {}
      },
      equipment: { ...DEFAULT_EQUIPMENT },
      layers: {}
    };
  }

  // src/model-config/storage.ts
  var STORAGE_PREFIX2 = "animorph_model_config_";
  function storageKey2() {
    const uuid = Project?.uuid || "default";
    return STORAGE_PREFIX2 + uuid;
  }
  function saveModelConfig(config) {
    try {
      localStorage.setItem(storageKey2(), JSON.stringify(config));
      debugLog("[ModelConfig] Saved");
    } catch (e) {
      console.error("[ModelConfig] Error saving:", e);
    }
  }
  function loadModelConfig() {
    try {
      const raw = localStorage.getItem(storageKey2());
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error("[ModelConfig] Error loading:", e);
    }
    return createDefaultModelConfig(Project?.name || "model");
  }

  // src/model-config/yaml-export.ts
  function generateModelYaml(config) {
    let yml = "";
    yml += `display_name: ${config.display_name}
`;
    yml += `animation: ${config.animation}
`;
    yml += `properties:
`;
    const fp = config.properties.first_person;
    yml += `  first_person:
`;
    yml += `    show_equipment: ${fp.show_equipment}
`;
    yml += `    model:
`;
    yml += `      show: ${fp.model.show}
`;
    yml += `      offset:
`;
    yml += `        x: ${fp.model.offset.x}
`;
    yml += `        y: ${fp.model.offset.y}
`;
    yml += `        z: ${fp.model.offset.z}
`;
    yml += `    custom_arms:
`;
    yml += `      show: ${fp.custom_arms.show}
`;
    yml += `      custom_render_items: ${fp.custom_arms.custom_render_items}
`;
    yml += `      both_hands: ${fp.custom_arms.both_hands}
`;
    if (config.properties.animation_controllers.length > 0) {
      yml += `  animation_controllers:
`;
      for (const ac of config.properties.animation_controllers) {
        yml += `  - ${ac}
`;
      }
    } else {
      yml += `  animation_controllers: []
`;
    }
    if (config.properties.fp_animation_controllers.length > 0) {
      yml += `  fp_animation_controllers:
`;
      for (const ac of config.properties.fp_animation_controllers) {
        yml += `  - ${ac}
`;
      }
    }
    const textKeys = Object.keys(config.properties.texts);
    if (textKeys.length > 0) {
      yml += `  texts:
`;
      for (const key of textKeys) {
        yml += `    '${key}': '${config.properties.texts[key]}'
`;
      }
    }
    const eq = config.equipment;
    const hasEquipment = eq.head || eq.chest || eq.legs || eq.feet || eq.cape || eq.elytra;
    if (hasEquipment) {
      yml += `equipment:
`;
      if (eq.head)
        yml += `  head: ${eq.head}
`;
      if (eq.chest)
        yml += `  chest: ${eq.chest}
`;
      if (eq.legs)
        yml += `  legs: ${eq.legs}
`;
      if (eq.feet)
        yml += `  feet: ${eq.feet}
`;
      if (eq.cape)
        yml += `  cape: ${eq.cape}
`;
      if (eq.elytra)
        yml += `  elytra: ${eq.elytra}
`;
    }
    const layerNames = Object.keys(config.layers);
    if (layerNames.length > 0) {
      yml += `layers:
`;
      for (const name of layerNames) {
        const layer = config.layers[name];
        yml += `  ${name}:
`;
        yml += `    type: ${layer.type}
`;
        if (layer.type === "model" && layer.model) {
          yml += `    model: ${layer.model}
`;
        }
        if (layer.type === "texture" && layer.texture) {
          yml += `    texture: ${layer.texture}
`;
        }
        yml += `    show_first_person: ${layer.show_first_person}
`;
        if (layer.hide_bones.length > 0) {
          yml += `    hide_bones:
`;
          for (const bone of layer.hide_bones) {
            yml += `    - ${bone}
`;
          }
        }
        if (layer.texture_layers.length > 0) {
          yml += `    texture_layers:
`;
          for (const tl2 of layer.texture_layers) {
            yml += `    - ${tl2}
`;
          }
        }
      }
    }
    return yml;
  }
  function exportModelYaml(config) {
    const yml = generateModelYaml(config);
    const fileName = (config.display_name || "model").replace(/\s+/g, "_") + ".yml";
    Blockbench.export({
      type: "YAML File",
      extensions: ["yml"],
      name: fileName,
      content: yml,
      savetype: "text"
    }, (result) => {
      const path = result?.path || result;
      Blockbench.showQuickMessage(`Model config exported: ${typeof path === "string" ? path.split(/[/\\]/).pop() : fileName}`, 2e3);
    });
  }

  // src/model-config/dialog.ts
  function textsToEntries(map) {
    return Object.entries(map).map(([key, value]) => ({ key, value }));
  }
  function entriesToTexts(entries) {
    const result = {};
    for (const e of entries) {
      const k = e.key.trim();
      const v = e.value.trim();
      if (k)
        result[k] = v;
    }
    return result;
  }
  function layersToEntries(layers) {
    return Object.entries(layers).map(([name, l]) => ({
      name,
      type: l.type,
      model: l.model || "",
      texture: l.texture || "",
      show_first_person: l.show_first_person,
      hide_bones: l.hide_bones.join(", "),
      texture_layers: l.texture_layers.join(", ")
    }));
  }
  function entriesToLayers(entries) {
    const result = {};
    for (const e of entries) {
      const name = e.name.trim();
      if (!name)
        continue;
      result[name] = {
        type: e.type,
        model: e.type === "model" ? e.model.trim() || void 0 : void 0,
        texture: e.type === "texture" ? e.texture.trim() || void 0 : void 0,
        show_first_person: e.show_first_person,
        hide_bones: parseList(e.hide_bones),
        texture_layers: parseList(e.texture_layers)
      };
    }
    return result;
  }
  function parseList(input) {
    if (!input || !input.trim())
      return [];
    return input.split(",").map((s) => s.trim()).filter((s) => s.length > 0);
  }
  function detectLayers() {
    const entries = [];
    if (typeof Collection === "undefined" || !Collection.all)
      return entries;
    for (const col of Collection.all) {
      if (col.export_codec === "animorph_layer") {
        entries.push({
          name: col.name,
          type: "model",
          model: col.name,
          texture: "",
          show_first_person: true,
          hide_bones: "",
          texture_layers: ""
        });
      } else if (col.export_codec === "animorph_texture_layer") {
        const texName = col.texture_layer_source ? col.texture_layer_source.split(/[/\\]/).pop() || col.name + ".png" : col.name + ".png";
        entries.push({
          name: col.name,
          type: "texture",
          model: "",
          texture: texName,
          show_first_person: true,
          hide_bones: "",
          texture_layers: ""
        });
      }
    }
    return entries;
  }
  function openModelConfigDialog() {
    const config = loadModelConfig();
    const detectedLayers = detectLayers();
    const savedLayerNames = new Set(Object.keys(config.layers));
    for (const detected of detectedLayers) {
      if (!savedLayerNames.has(detected.name)) {
        config.layers[detected.name] = {
          type: detected.type,
          model: detected.type === "model" ? detected.model : void 0,
          texture: detected.type === "texture" ? detected.texture : void 0,
          show_first_person: true,
          hide_bones: [],
          texture_layers: []
        };
      }
    }
    const fp = config.properties.first_person;
    const dialog = new Dialog({
      id: "animorph_model_config",
      title: "Model Config (.yml)",
      width: 650,
      component: {
        data: {
          display_name: config.display_name,
          animation: config.animation,
          // First person
          fp_show_equipment: fp.show_equipment,
          fp_model_show: fp.model.show,
          fp_offset_x: fp.model.offset.x,
          fp_offset_y: fp.model.offset.y,
          fp_offset_z: fp.model.offset.z,
          fp_arms_show: fp.custom_arms.show,
          fp_arms_render_items: fp.custom_arms.custom_render_items,
          fp_arms_both_hands: fp.custom_arms.both_hands,
          // Controllers
          animation_controllers: config.properties.animation_controllers.join(", "),
          fp_animation_controllers: config.properties.fp_animation_controllers.join(", "),
          // Texts
          texts: textsToEntries(config.properties.texts),
          // Equipment
          eq_head: config.equipment.head,
          eq_chest: config.equipment.chest,
          eq_legs: config.equipment.legs,
          eq_feet: config.equipment.feet,
          eq_cape: config.equipment.cape,
          eq_elytra: config.equipment.elytra,
          // Layers
          layers: layersToEntries(config.layers)
        },
        methods: {
          onAddText() {
            this.texts.push({ key: "", value: "" });
          },
          onRemoveText(idx) {
            this.texts.splice(idx, 1);
          },
          onAddLayer() {
            this.layers.push({
              name: "",
              type: "model",
              model: "",
              texture: "",
              show_first_person: true,
              hide_bones: "",
              texture_layers: ""
            });
          },
          onRemoveLayer(idx) {
            this.layers.splice(idx, 1);
          },
          onDetectLayers() {
            const detected = detectLayers();
            const existing = new Set(this.layers.map((l) => l.name));
            let added = 0;
            for (const d of detected) {
              if (!existing.has(d.name)) {
                this.layers.push(d);
                added++;
              }
            }
            Blockbench.showQuickMessage(added > 0 ? `Added ${added} layer(s)` : "No new layers found", 1500);
          },
          buildConfig() {
            return {
              display_name: this.display_name,
              animation: this.animation,
              properties: {
                first_person: {
                  show_equipment: this.fp_show_equipment,
                  model: {
                    show: this.fp_model_show,
                    offset: {
                      x: parseFloat(this.fp_offset_x) || 0,
                      y: parseFloat(this.fp_offset_y) || 0,
                      z: parseFloat(this.fp_offset_z) || 0
                    }
                  },
                  custom_arms: {
                    show: this.fp_arms_show,
                    custom_render_items: this.fp_arms_render_items,
                    both_hands: this.fp_arms_both_hands
                  }
                },
                animation_controllers: parseList(this.animation_controllers),
                fp_animation_controllers: parseList(this.fp_animation_controllers),
                texts: entriesToTexts(this.texts)
              },
              equipment: {
                head: this.eq_head.trim(),
                chest: this.eq_chest.trim(),
                legs: this.eq_legs.trim(),
                feet: this.eq_feet.trim(),
                cape: this.eq_cape.trim(),
                elytra: this.eq_elytra.trim()
              },
              layers: entriesToLayers(this.layers)
            };
          },
          onSave() {
            saveModelConfig(this.buildConfig());
            Blockbench.showQuickMessage("Model config saved", 1500);
          },
          onExport() {
            const cfg = this.buildConfig();
            saveModelConfig(cfg);
            exportModelYaml(cfg);
          }
        },
        template: `
        <div style="padding: 4px 0 8px; max-height: 550px; overflow-y: auto;">

          <!-- Basic Info -->
          <div style="border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 12px; margin-bottom: 10px;">
            <div style="font-weight: 600; margin-bottom: 8px; font-size: 13px; color: var(--color-accent);">General</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              <div>
                <label style="font-size: 11px; opacity: 0.7; display: block; margin-bottom: 3px;">Display Name</label>
                <input type="text" class="dark_bordered" v-model="display_name" style="width: 100%; box-sizing: border-box;">
              </div>
              <div>
                <label style="font-size: 11px; opacity: 0.7; display: block; margin-bottom: 3px;">Animation File</label>
                <input type="text" class="dark_bordered" v-model="animation" placeholder="model.animation.json" style="width: 100%; box-sizing: border-box;">
              </div>
            </div>
          </div>

          <!-- First Person -->
          <div style="border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 12px; margin-bottom: 10px;">
            <div style="font-weight: 600; margin-bottom: 8px; font-size: 13px; color: var(--color-accent);">First Person</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; margin-bottom: 8px;">
              <label style="display: flex; align-items: center; gap: 5px; font-size: 11px;">
                <input type="checkbox" v-model="fp_show_equipment"> Show Equipment
              </label>
              <label style="display: flex; align-items: center; gap: 5px; font-size: 11px;">
                <input type="checkbox" v-model="fp_model_show"> Show Model
              </label>
              <label style="display: flex; align-items: center; gap: 5px; font-size: 11px;">
                <input type="checkbox" v-model="fp_arms_show"> Show Arms
              </label>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 8px;">
              <label style="display: flex; align-items: center; gap: 5px; font-size: 11px;">
                <input type="checkbox" v-model="fp_arms_render_items"> Custom Render Items
              </label>
              <label style="display: flex; align-items: center; gap: 5px; font-size: 11px;">
                <input type="checkbox" v-model="fp_arms_both_hands"> Both Hands
              </label>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px;">
              <div>
                <label style="font-size: 10px; opacity: 0.6; display: block; margin-bottom: 2px;">Offset X</label>
                <input type="number" class="dark_bordered" v-model="fp_offset_x" step="0.1" style="width: 100%; box-sizing: border-box; font-size: 11px;">
              </div>
              <div>
                <label style="font-size: 10px; opacity: 0.6; display: block; margin-bottom: 2px;">Offset Y</label>
                <input type="number" class="dark_bordered" v-model="fp_offset_y" step="0.1" style="width: 100%; box-sizing: border-box; font-size: 11px;">
              </div>
              <div>
                <label style="font-size: 10px; opacity: 0.6; display: block; margin-bottom: 2px;">Offset Z</label>
                <input type="number" class="dark_bordered" v-model="fp_offset_z" step="0.1" style="width: 100%; box-sizing: border-box; font-size: 11px;">
              </div>
            </div>
          </div>

          <!-- Animation Controllers -->
          <div style="border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 12px; margin-bottom: 10px;">
            <div style="font-weight: 600; margin-bottom: 8px; font-size: 13px; color: var(--color-accent);">Animation Controllers</div>
            <div style="margin-bottom: 6px;">
              <label style="font-size: 11px; opacity: 0.7; display: block; margin-bottom: 3px;">Controllers (comma separated)</label>
              <input type="text" class="dark_bordered" v-model="animation_controllers" placeholder="idle, simple_pose, emote, arms" style="width: 100%; box-sizing: border-box;">
            </div>
            <div>
              <label style="font-size: 11px; opacity: 0.7; display: block; margin-bottom: 3px;">FP Controllers (comma separated)</label>
              <input type="text" class="dark_bordered" v-model="fp_animation_controllers" placeholder="fp_gun" style="width: 100%; box-sizing: border-box;">
            </div>
          </div>

          <!-- Texts -->
          <div style="border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 12px; margin-bottom: 10px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
              <span style="font-weight: 600; font-size: 13px; color: var(--color-accent);">Texts</span>
              <button class="material-button" @click="onAddText" style="padding: 2px 8px; font-size: 11px; min-height: 0; line-height: 1.4;">+ Add</button>
            </div>
            <div v-if="texts.length === 0" style="font-size: 11px; opacity: 0.4; text-align: center; padding: 4px 0;">No texts configured</div>
            <div v-for="(entry, idx) in texts" :key="idx" style="display: flex; gap: 4px; align-items: center; margin-bottom: 4px;">
              <input type="text" class="dark_bordered" v-model="entry.key" placeholder="{placeholder}" style="flex: 1; font-size: 11px; padding: 3px 6px; box-sizing: border-box;">
              <span style="opacity: 0.4; font-size: 11px;">:</span>
              <input type="text" class="dark_bordered" v-model="entry.value" placeholder="value or %placeholder%" style="flex: 1.5; font-size: 11px; padding: 3px 6px; box-sizing: border-box;">
              <button class="material-button" @click="onRemoveText(idx)" style="padding: 2px 6px; font-size: 11px; min-height: 0; line-height: 1.4; color: var(--color-close);">\u2715</button>
            </div>
          </div>

          <!-- Equipment -->
          <div style="border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 12px; margin-bottom: 10px;">
            <div style="font-weight: 600; margin-bottom: 8px; font-size: 13px; color: var(--color-accent);">Equipment</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
              <div>
                <label style="font-size: 10px; opacity: 0.6; display: block; margin-bottom: 2px;">Head</label>
                <input type="text" class="dark_bordered" v-model="eq_head" placeholder="equipment/head.geo.json" style="width: 100%; box-sizing: border-box; font-size: 11px;">
              </div>
              <div>
                <label style="font-size: 10px; opacity: 0.6; display: block; margin-bottom: 2px;">Chest</label>
                <input type="text" class="dark_bordered" v-model="eq_chest" placeholder="equipment/chest.geo.json" style="width: 100%; box-sizing: border-box; font-size: 11px;">
              </div>
              <div>
                <label style="font-size: 10px; opacity: 0.6; display: block; margin-bottom: 2px;">Legs</label>
                <input type="text" class="dark_bordered" v-model="eq_legs" placeholder="equipment/legs.geo.json" style="width: 100%; box-sizing: border-box; font-size: 11px;">
              </div>
              <div>
                <label style="font-size: 10px; opacity: 0.6; display: block; margin-bottom: 2px;">Feet</label>
                <input type="text" class="dark_bordered" v-model="eq_feet" placeholder="equipment/feet.geo.json" style="width: 100%; box-sizing: border-box; font-size: 11px;">
              </div>
              <div>
                <label style="font-size: 10px; opacity: 0.6; display: block; margin-bottom: 2px;">Cape</label>
                <input type="text" class="dark_bordered" v-model="eq_cape" placeholder="equipment/cape.geo.json" style="width: 100%; box-sizing: border-box; font-size: 11px;">
              </div>
              <div>
                <label style="font-size: 10px; opacity: 0.6; display: block; margin-bottom: 2px;">Elytra</label>
                <input type="text" class="dark_bordered" v-model="eq_elytra" placeholder="equipment/elytra.geo.json" style="width: 100%; box-sizing: border-box; font-size: 11px;">
              </div>
            </div>
          </div>

          <!-- Layers -->
          <div style="border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 12px; margin-bottom: 10px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
              <span style="font-weight: 600; font-size: 13px; color: var(--color-accent);">Layers</span>
              <div style="display: flex; gap: 4px;">
                <button class="material-button" @click="onDetectLayers" style="padding: 2px 8px; font-size: 11px; min-height: 0; line-height: 1.4;">Detect</button>
                <button class="material-button" @click="onAddLayer" style="padding: 2px 8px; font-size: 11px; min-height: 0; line-height: 1.4;">+ Add</button>
              </div>
            </div>

            <div v-if="layers.length === 0" style="font-size: 11px; opacity: 0.4; text-align: center; padding: 4px 0;">No layers configured</div>

            <div v-for="(layer, idx) in layers" :key="idx"
              style="border: 1px solid rgba(255,255,255,0.07); border-radius: 5px; padding: 8px; margin-bottom: 6px;">
              <div style="display: flex; gap: 4px; align-items: center; margin-bottom: 6px;">
                <input type="text" class="dark_bordered" v-model="layer.name" placeholder="layer_name" style="flex: 1; font-size: 11px; padding: 3px 6px; box-sizing: border-box;">
                <select class="dark_bordered" v-model="layer.type" style="font-size: 11px; padding: 3px 4px;">
                  <option value="model">model</option>
                  <option value="texture">texture</option>
                </select>
                <label style="display: flex; align-items: center; gap: 3px; font-size: 10px; white-space: nowrap;">
                  <input type="checkbox" v-model="layer.show_first_person"> FP
                </label>
                <button class="material-button" @click="onRemoveLayer(idx)" style="padding: 2px 6px; font-size: 11px; min-height: 0; line-height: 1.4; color: var(--color-close);">\u2715</button>
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
                <div v-if="layer.type === 'model'">
                  <input type="text" class="dark_bordered" v-model="layer.model" placeholder="model name" style="width: 100%; box-sizing: border-box; font-size: 10px; padding: 2px 5px;">
                </div>
                <div v-if="layer.type === 'texture'">
                  <input type="text" class="dark_bordered" v-model="layer.texture" placeholder="texture.png" style="width: 100%; box-sizing: border-box; font-size: 10px; padding: 2px 5px;">
                </div>
                <div>
                  <input type="text" class="dark_bordered" v-model="layer.hide_bones" placeholder="hide_bones (comma sep)" style="width: 100%; box-sizing: border-box; font-size: 10px; padding: 2px 5px;">
                </div>
                <div>
                  <input type="text" class="dark_bordered" v-model="layer.texture_layers" placeholder="texture_layers (comma sep)" style="width: 100%; box-sizing: border-box; font-size: 10px; padding: 2px 5px;">
                </div>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div style="display: flex; gap: 8px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 10px;">
            <button class="material-button" @click="onSave" style="flex: 1;">Save</button>
            <button class="material-button" @click="onExport" style="flex: 1;">Export .yml</button>
          </div>
        </div>
      `
      },
      onConfirm() {
        try {
          const vue = dialog.content_vue || dialog.component;
          if (vue && typeof vue.buildConfig === "function") {
            const cfg = vue.buildConfig();
            saveModelConfig(cfg);
            debugLog("[ModelConfig] Saved on confirm");
          }
        } catch (e) {
          console.error("[ModelConfig] Error saving on confirm:", e);
        }
      },
      onCancel() {
        dialog.hide().delete();
      }
    });
    dialog.show();
  }

  // src/model-config/index.ts
  var modelConfigAction = null;
  function registerModelConfig() {
    modelConfigAction = new Action("animorph_model_config", {
      name: "Model Config (.yml)",
      icon: "description",
      description: "Configure and export model .yml config file",
      click() {
        openModelConfigDialog();
      }
    });
    MenuBar.addAction(modelConfigAction, "file.export");
    debugLog("[ModelConfig] Registered");
  }
  function unregisterModelConfig() {
    if (modelConfigAction) {
      modelConfigAction.delete();
      modelConfigAction = null;
    }
    debugLog("[ModelConfig] Unregistered");
  }

  // src/first-person/index.ts
  var FP_FOV = 70;
  var DEFAULT_EYE_POS = { x: 0, y: 24.68, z: 0 };
  var ARM_BONE_NAMES = [
    "left_arm",
    "right_arm",
    "left_arm2",
    "right_arm2",
    "left_hand",
    "right_hand",
    "left_sleeve",
    "right_sleeve",
    "left_sleeve_hand",
    "right_sleeve_hand",
    "left_hand_item",
    "right_hand_item"
  ];
  var fpAction = null;
  var resetViewAction = null;
  var isFirstPerson = false;
  var savedCameraState = null;
  var hiddenMeshes = /* @__PURE__ */ new Map();
  var cameraPos = { ...DEFAULT_EYE_POS };
  function findBone(name) {
    const groups = typeof getAllGroups === "function" ? getAllGroups() : [];
    const lower = name.toLowerCase();
    return groups.find((g) => g.name.toLowerCase() === lower) || null;
  }
  function isArmBone(name) {
    const lower = name.toLowerCase();
    return ARM_BONE_NAMES.some((n) => lower === n);
  }
  function isChildOfArm(group) {
    let parent = group.parent;
    while (parent && parent.name) {
      if (isArmBone(parent.name))
        return true;
      parent = parent.parent;
    }
    return false;
  }
  var CAMERA_PULLBACK = 14.5;
  function readCameraPosition() {
    const headBone = findBone("head");
    if (headBone && headBone.origin) {
      cameraPos.x = headBone.origin[0];
      cameraPos.y = headBone.origin[1];
      cameraPos.z = headBone.origin[2] + CAMERA_PULLBACK;
      debugLog(`FP camera from head bone: [${cameraPos.x}, ${cameraPos.y}, ${cameraPos.z}]`);
    } else {
      cameraPos = { ...DEFAULT_EYE_POS };
      cameraPos.z += CAMERA_PULLBACK;
      debugLog("FP camera using default eye position");
    }
  }
  function getPreview() {
    const preview = Preview.selected;
    if (!preview || !preview.camera)
      return null;
    return { camera: preview.camera, controls: preview.controls };
  }
  function elementBelongsToArm(element) {
    if (!element.parent)
      return false;
    const parentName = element.parent.name;
    if (parentName && isArmBone(parentName))
      return true;
    if (element.parent && isChildOfArm(element.parent))
      return true;
    return false;
  }
  function hideNonArmElements() {
    hiddenMeshes.clear();
    const elements = typeof Outliner !== "undefined" && Outliner.elements ? Outliner.elements : [];
    for (const element of elements) {
      if (!element.mesh)
        continue;
      if (elementBelongsToArm(element))
        continue;
      hiddenMeshes.set(element.mesh, element.mesh.visible);
      element.mesh.visible = false;
    }
  }
  function restoreAllElements() {
    for (const [mesh, wasVisible] of hiddenMeshes) {
      mesh.visible = wasVisible;
    }
    hiddenMeshes.clear();
  }
  function saveCameraState() {
    const p = getPreview();
    if (!p)
      return;
    savedCameraState = {
      position: p.camera.position.clone(),
      rotation: p.camera.rotation.clone(),
      fov: p.camera.fov,
      near: p.camera.near,
      controlsEnabled: p.controls ? p.controls.enabled : true,
      controlsTarget: p.controls && p.controls.target ? p.controls.target.clone() : null
    };
  }
  function resetCameraToCenter() {
    const p = getPreview();
    if (!p || !p.controls)
      return;
    const elements = typeof Outliner !== "undefined" && Outliner.elements ? Outliner.elements : [];
    if (elements.length === 0)
      return;
    const box = new THREE.Box3();
    for (const element of elements) {
      if (element.mesh) {
        box.expandByObject(element.mesh);
      }
    }
    if (!box.isEmpty()) {
      const center = new THREE.Vector3();
      box.getCenter(center);
      p.controls.target.copy(center);
      const size = new THREE.Vector3();
      box.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z);
      const distance = maxDim * 2;
      p.camera.position.set(center.x, center.y + maxDim * 0.3, center.z + distance);
      p.camera.lookAt(center);
    }
    p.controls.enabled = true;
    if (p.controls.update)
      p.controls.update();
  }
  function restoreCameraState() {
    const p = getPreview();
    if (!p || !savedCameraState)
      return;
    p.camera.position.copy(savedCameraState.position);
    p.camera.rotation.copy(savedCameraState.rotation);
    p.camera.fov = savedCameraState.fov;
    p.camera.near = savedCameraState.near;
    p.camera.updateProjectionMatrix();
    if (p.controls) {
      if (p.controls.target && savedCameraState.controlsTarget) {
        p.controls.target.copy(savedCameraState.controlsTarget);
      }
      p.controls.enabled = true;
      if (p.controls.update)
        p.controls.update();
    }
    savedCameraState = null;
  }
  function onRenderFrame2() {
    if (!isFirstPerson)
      return;
    const p = getPreview();
    if (!p)
      return;
    const lookTarget = new THREE.Vector3(cameraPos.x, cameraPos.y, cameraPos.z - 100);
    p.camera.position.set(cameraPos.x, cameraPos.y, cameraPos.z);
    p.camera.up.set(0, 1, 0);
    p.camera.lookAt(lookTarget);
    if (p.controls) {
      p.controls.enabled = false;
      if (p.controls.target) {
        p.controls.target.copy(lookTarget);
      }
    }
    if (p.camera.fov !== FP_FOV || p.camera.near !== 0.5) {
      p.camera.fov = FP_FOV;
      p.camera.near = 0.5;
      p.camera.updateProjectionMatrix();
    }
    const elements = typeof Outliner !== "undefined" && Outliner.elements ? Outliner.elements : [];
    for (const element of elements) {
      if (!element.mesh)
        continue;
      if (elementBelongsToArm(element))
        continue;
      element.mesh.visible = false;
    }
  }
  function toggleFirstPerson() {
    if (isFirstPerson) {
      isFirstPerson = false;
      restoreAllElements();
      restoreCameraState();
      if (fpAction)
        fpAction.setIcon("visibility");
      Blockbench.showQuickMessage("First Person View: OFF", 1500);
      debugLog("First person view disabled");
    } else {
      readCameraPosition();
      saveCameraState();
      hideNonArmElements();
      isFirstPerson = true;
      if (fpAction)
        fpAction.setIcon("person");
      Blockbench.showQuickMessage("First Person View: ON", 1500);
      debugLog("First person view enabled");
      onRenderFrame2();
    }
  }
  function forceExitFirstPerson() {
    if (isFirstPerson) {
      isFirstPerson = false;
      restoreAllElements();
      restoreCameraState();
      if (fpAction)
        fpAction.setIcon("visibility");
    }
  }
  function registerFirstPerson() {
    fpAction = new Action("first_person_view", {
      name: "First Person View",
      icon: "visibility",
      description: "Toggle first-person camera to preview FP arm animations",
      click: toggleFirstPerson
    });
    resetViewAction = new Action("reset_view_center", {
      name: "Reset View",
      icon: "center_focus_strong",
      description: "Reset camera to center on the model",
      click: () => {
        resetCameraToCenter();
        Blockbench.showQuickMessage("View reset to center", 1e3);
      }
    });
    MenuBar.addAction(fpAction, "view");
    MenuBar.addAction(resetViewAction, "view");
    Blockbench.on("render_frame", onRenderFrame2);
    Blockbench.on("select_project", forceExitFirstPerson);
    debugLog("First Person View module registered");
  }
  function unregisterFirstPerson() {
    forceExitFirstPerson();
    Blockbench.removeListener("render_frame", onRenderFrame2);
    Blockbench.removeListener("select_project", forceExitFirstPerson);
    if (fpAction) {
      MenuBar.removeAction(fpAction.id);
      fpAction.delete();
      fpAction = null;
    }
    if (resetViewAction) {
      MenuBar.removeAction(resetViewAction.id);
      resetViewAction.delete();
      resetViewAction = null;
    }
    debugLog("First Person View module unregistered");
  }

  // src/camera-preview/index.ts
  var CAMERA_BONE_NAME = "camera";
  var camAction = null;
  var isActive = false;
  var restPos = null;
  var restRot = null;
  var _curPos = new THREE.Vector3();
  var _curQuat = new THREE.Quaternion();
  var _restQInv = new THREE.Quaternion();
  var _rotDelta = new THREE.Quaternion();
  var _tempEuler = new THREE.Euler();
  function getPreview2() {
    const preview = Preview.selected;
    return preview?.camera ? preview : null;
  }
  function findCameraBone() {
    const groups = typeof getAllGroups === "function" ? getAllGroups() : [];
    return groups.find((g) => g.name?.toLowerCase() === CAMERA_BONE_NAME) ?? null;
  }
  var _frameCount = 0;
  function onRenderFrame3() {
    if (!isActive || !restPos || !restRot)
      return;
    const p = getPreview2();
    if (!p)
      return;
    const bone = findCameraBone();
    if (!bone?.mesh)
      return;
    _curPos.copy(bone.mesh.position);
    _curQuat.setFromEuler(bone.mesh.rotation);
    const dx = _curPos.x - restPos.x;
    const dy = _curPos.y - restPos.y;
    const dz = _curPos.z - restPos.z;
    _restQInv.copy(restRot).invert();
    _rotDelta.copy(_curQuat).multiply(_restQInv);
    _frameCount++;
    if (_frameCount % 30 === 0) {
      _tempEuler.setFromQuaternion(_rotDelta);
      console.log(
        `[CT] bone local pos=(${_curPos.x.toFixed(3)}, ${_curPos.y.toFixed(3)}, ${_curPos.z.toFixed(3)})`,
        `rot=(${THREE.MathUtils.radToDeg(bone.mesh.rotation.x).toFixed(1)}\xB0, ${THREE.MathUtils.radToDeg(bone.mesh.rotation.y).toFixed(1)}\xB0, ${THREE.MathUtils.radToDeg(bone.mesh.rotation.z).toFixed(1)}\xB0)`
      );
      console.log(
        `[CT] pos delta=(${dx.toFixed(3)}, ${dy.toFixed(3)}, ${dz.toFixed(3)})`,
        `rot delta=(${THREE.MathUtils.radToDeg(_tempEuler.x).toFixed(1)}\xB0, ${THREE.MathUtils.radToDeg(_tempEuler.y).toFixed(1)}\xB0, ${THREE.MathUtils.radToDeg(_tempEuler.z).toFixed(1)}\xB0)`
      );
    }
    p.camera.position.x += dx;
    p.camera.position.y += dy;
    p.camera.position.z += dz;
    p.camera.quaternion.premultiply(_rotDelta);
    p.camera.updateProjectionMatrix();
  }
  function enable() {
    const bone = findCameraBone();
    if (!bone?.mesh) {
      Blockbench.showQuickMessage(`No "${CAMERA_BONE_NAME}" bone found in model`, 2e3);
      return;
    }
    restPos = bone.mesh.position.clone();
    restRot = new THREE.Quaternion().setFromEuler(bone.mesh.rotation);
    _frameCount = 0;
    isActive = true;
    camAction?.setIcon("videocam");
    Blockbench.showQuickMessage("Camera Transform: ON", 1500);
    console.log(
      `[CameraTransform] ON \u2014 rest pos: (${restPos.x.toFixed(3)}, ${restPos.y.toFixed(3)}, ${restPos.z.toFixed(3)})`,
      `rest rot: (${THREE.MathUtils.radToDeg(bone.mesh.rotation.x).toFixed(1)}\xB0, ${THREE.MathUtils.radToDeg(bone.mesh.rotation.y).toFixed(1)}\xB0, ${THREE.MathUtils.radToDeg(bone.mesh.rotation.z).toFixed(1)}\xB0)`
    );
    debugLog("[CameraTransform] ON");
  }
  function disable() {
    isActive = false;
    restPos = null;
    restRot = null;
    camAction?.setIcon("videocam_off");
    Blockbench.showQuickMessage("Camera Transform: OFF", 1500);
    debugLog("[CameraTransform] OFF");
  }
  function toggle() {
    isActive ? disable() : enable();
  }
  function forceExitCameraPreview() {
    if (isActive)
      disable();
  }
  function registerCameraPreview() {
    camAction = new Action("camera_transform_toggle", {
      name: "Camera Transform",
      icon: "videocam_off",
      description: `Apply the "${CAMERA_BONE_NAME}" bone's transform as an offset to the current view`,
      click: toggle,
      keybind: new Blockbench.Keybind({ key: "p", ctrl: true, shift: true }),
      condition: () => false
      // Disabled — not ready yet
    });
    MenuBar.addAction(camAction, "view");
    Blockbench.on("render_frame", onRenderFrame3);
    Blockbench.on("select_project", forceExitCameraPreview);
    debugLog("[CameraTransform] Registered");
  }
  function unregisterCameraPreview() {
    Blockbench.removeListener("render_frame", onRenderFrame3);
    Blockbench.removeListener("select_project", forceExitCameraPreview);
    if (camAction) {
      MenuBar.removeAction("camera_transform_toggle");
      camAction.delete();
      camAction = null;
    }
    isActive = false;
    restPos = null;
    restRot = null;
    debugLog("[CameraTransform] Unregistered");
  }

  // src/index.ts
  var loopStartProperty = null;
  function onLoad() {
    startChangelogInjector();
    loopStartProperty = new Property(Animation, "number", PROPERTY_NAME, {
      default: PROPERTY_DEFAULT
    });
    Blockbench.on("compile_bedrock_animation", onCompileAnimation);
    Blockbench.on("parse_bedrock_animation", onParseBedrock);
    Blockbench.on("select_animation", onAnimationSelect);
    Blockbench.on("timeline_zoom", onTimelineZoom);
    Blockbench.on("remove_animation", onRemoveAnimation);
    if (Timeline.vue) {
      Timeline.vue.$watch("size", onTimelineZoom);
    }
    installTimelineLoop();
    installPropertiesDialog();
    interceptAnimationImport();
    createMarkerStyles();
    createTooltip();
    createLoopStartMarker();
    updateLoopStartMarker();
    installMeshSupport();
    registerTextDisplayType();
    registerTextDisplayActions();
    installTextDisplayIO();
    registerLayerActions();
    registerTextureLayerActions();
    registerEmoteConfig();
    registerModelConfig();
    initializeSync();
    registerFirstPerson();
    registerCameraPreview();
    debugLog(`\u2713 ${PLUGIN_NAME} v${PLUGIN_VERSION} loaded`);
  }
  function onUnload() {
    stopChangelogInjector();
    Blockbench.removeListener("compile_bedrock_animation", onCompileAnimation);
    Blockbench.removeListener("parse_bedrock_animation", onParseBedrock);
    Blockbench.removeListener("select_animation", onAnimationSelect);
    Blockbench.removeListener("timeline_zoom", onTimelineZoom);
    Blockbench.removeListener("remove_animation", onRemoveAnimation);
    restoreTimelineLoop();
    restorePropertiesDialog();
    restoreAnimationImport();
    if (loopStartProperty) {
      loopStartProperty.delete();
    }
    removeLoopStartMarker();
    removeTooltip();
    removeMarkerStyles();
    uninstallMeshSupport();
    unregisterTextDisplayActions();
    uninstallTextDisplayIO();
    unregisterTextDisplayType();
    unregisterLayerActions();
    unregisterTextureLayerActions();
    unregisterEmoteConfig();
    unregisterModelConfig();
    cleanupSync();
    unregisterFirstPerson();
    unregisterCameraPreview();
    debugLog(`\u2713 ${PLUGIN_NAME} unloaded`);
  }
  Plugin.register(PLUGIN_ID, {
    title: PLUGIN_NAME,
    author: "feeldev",
    icon: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMiAzMiI+CiAgPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iNyIgZmlsbD0iIzRhZGU4MCIvPgogIDx0ZXh0IHg9IjE2IiB5PSIyMyIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9InN5c3RlbS11aSxzYW5zLXNlcmlmIiBmb250LXdlaWdodD0iODAwIiBmb250LXNpemU9IjIyIiBmaWxsPSIjMGYxMjE5Ij5BPC90ZXh0Pgo8L3N2Zz4K",
    description: "Animorph's Blockbench plugin \u2014 build, sync and preview your mod assets in real time.",
    about: "## Animorph Tools\n\nA toolkit for Minecraft Bedrock & GeckoLib mod development.\n\n### Features\n\n**Loop Start** \u2014 Add GeckoLib's `loop_start` property directly from the animation properties dialog, with a visual marker in the timeline.\n\n**Poly Mesh** \u2014 Export and import meshes as `poly_mesh` for Bedrock geometry files.\n\n**Text Display** \u2014 Create 3D text elements rendered as in-world cubes, with full font and style control.\n\n**Reference Layers** \u2014 Load reference models as overlay layers to compare against your current model.\n\n**Texture Layers** \u2014 Manage and preview texture layers inside Blockbench.\n\n**Emote Config** \u2014 Configure and export emote definitions to YAML for use in your mod.\n\n**Model Config** \u2014 Per-model configuration with YAML export for Bedrock/GeckoLib entity definitions.\n\n**Remote Sync** \u2014 Live WebSocket sync with a running Fabric mod. Push animations and model data directly into Minecraft without reloading.\n\n**First Person View** \u2014 Preview your model from a first-person camera perspective inside Blockbench.\n\n**Reset View** \u2014 Reset camera to center on the model with one click.\n\n**Camera Transform** \u2014 Apply the `camera` bone transform as an offset to the current view. _(Coming soon)_\n\n### Links\n\n[Wiki & Documentation](https://animorph.crewved.com/) \u2014 [Discord](https://discord.com/invite/uHMY5hxeK4)",
    has_changelog: true,
    version: PLUGIN_VERSION,
    variant: "both",
    tags: ["Minecraft: Bedrock Edition", "GeckoLib", "Animations", "Mesh", "Text Display", "Layers", "Emote", "Remote Sync"],
    onload: onLoad,
    onunload: onUnload
  });
})();
