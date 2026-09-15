"use strict";
(() => {
  // src/core/debug.ts
  var DEBUG_MODE = false;
  function debugLog(...args) {
    if (DEBUG_MODE) {
      console.log("[Animorph Debug]", ...args);
    }
  }
  function safeModeHook(label, fn) {
    return () => {
      try {
        fn();
      } catch (e) {
        console.error(`[Animorph] ${label} threw \u2014 mode switch may be incomplete:`, e);
      } finally {
        Modes.vue?.$forceUpdate?.();
      }
    };
  }

  // src/core/constants.ts
  var PLUGIN_ID = "animorph-tools";
  var PLUGIN_NAME = "Animorph Tools";
  var PLUGIN_VERSION = "1.1.2-beta";
  var PROPERTY_NAME = "loop_start";
  var PROPERTY_DEFAULT = 0;
  var MARKER_ID = "timeline_loop_start_marker";
  var TOOLTIP_ID = "loop_start_tooltip";
  var MARKER_COLOR = "var(--color-accent)";
  var SETTING_NORMALIZED_UVS = "animorph_normalized_mesh_uvs";
  var SETTING_SKIP_NORMALS = "animorph_skip_mesh_normals";
  var SETTING_SKIN_EDITOR_ENABLED = "animorph_skin_editor_enabled";
  var SETTING_RAGDOLL_ENABLED = "animorph_ragdoll_enabled";
  var SETTING_HITBOX_ENABLED = "animorph_hitbox_enabled";
  var GLTF_METERS_TO_BLOCKBENCH_UNITS = 16;

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
        html += `</ul></div>`;
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
    for (const tab of tabBar.querySelectorAll("li")) {
      if (tab.classList.contains("selected") && tab.textContent?.trim() === "Changelog") {
        return true;
      }
    }
    return false;
  }
  async function fetchChangelog() {
    try {
      const res = await fetch(CHANGELOG_URL);
      if (res.ok)
        return await res.text();
    } catch {
    }
    return null;
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
    } catch {
    }
  }
  async function resolveChangelog() {
    const remote = await fetchChangelog();
    if (remote) {
      const hash = hashStr(remote);
      const cachedHash = localStorage.getItem(CACHE_HASH_KEY);
      if (hash !== cachedHash)
        saveCachedChangelog(remote);
      return { data: JSON.parse(remote), source: "remote" };
    }
    const cached = getCachedChangelog();
    if (cached)
      return { data: JSON.parse(cached), source: "cache" };
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
    if (container.children.length > 0)
      return;
    const result = await resolveChangelog();
    if (result) {
      const { data, source } = result;
      container.innerHTML = buildChangelogHTML(data);
      debugLog(`\u2713 Changelog rendered (source: ${source})`);
    } else {
      container.innerHTML = `<div style="color:#888;text-align:center;padding:40px 20px;"><p>No changelog available. Connect to the internet to fetch.</p></div>`;
    }
  }
  function onTabBarClick() {
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
    if (tabBar)
      tabBar.removeEventListener("click", onTabBarClick);
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
  function normalizeGeckoLibKeyframes(jsonContent) {
    if (!jsonContent?.animations)
      return false;
    let changed = false;
    for (const animName in jsonContent.animations) {
      const anim = jsonContent.animations[animName];
      if (!anim?.bones)
        continue;
      for (const boneName in anim.bones) {
        const bone = anim.bones[boneName];
        for (const channel of ["rotation", "position", "scale"]) {
          const channelData = bone[channel];
          if (!channelData || typeof channelData !== "object" || Array.isArray(channelData))
            continue;
          for (const timestamp in channelData) {
            const kf = channelData[timestamp];
            if (!kf || typeof kf !== "object" || Array.isArray(kf))
              continue;
            if (Array.isArray(kf.vector)) {
              channelData[timestamp] = kf.vector;
              changed = true;
              continue;
            }
            if (kf.pre && typeof kf.pre === "object" && !Array.isArray(kf.pre) && Array.isArray(kf.pre.vector)) {
              kf.pre = kf.pre.vector;
              changed = true;
            }
            if (kf.post && typeof kf.post === "object" && !Array.isArray(kf.post) && Array.isArray(kf.post.vector)) {
              kf.post = kf.post.vector;
              changed = true;
            }
          }
        }
      }
    }
    return changed;
  }
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
            const geckoPatched = normalizeGeckoLibKeyframes(jsonContent);
            const remapped = remapLayerBoneNamesInJson(jsonContent);
            if (geckoPatched || remapped) {
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
                  if (normalizeGeckoLibKeyframes(parsed)) {
                    const serialized = JSON.stringify(parsed);
                    if (file.content !== void 0)
                      file.content = serialized;
                    else if (file.data !== void 0)
                      file.data = serialized;
                  }
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

  // src/skin-editor/armature-import.ts
  function quatToEulerZYX([x, y, z, w]) {
    const quat = new THREE.Quaternion(x, y, z, w);
    const euler = new THREE.Euler().setFromQuaternion(quat, "ZYX");
    const toDeg = 180 / Math.PI;
    return [euler.x * toDeg, euler.y * toDeg, euler.z * toDeg];
  }
  var IDENTITY_CHAIN = {
    pos: [0, 0, 0],
    scale: [GLTF_METERS_TO_BLOCKBENCH_UNITS, GLTF_METERS_TO_BLOCKBENCH_UNITS, GLTF_METERS_TO_BLOCKBENCH_UNITS]
  };
  function advanceChain(parent, node) {
    const lt = node.translation ?? [0, 0, 0];
    const ls = node.scale ?? [1, 1, 1];
    const scale = [
      parent.scale[0] * ls[0],
      parent.scale[1] * ls[1],
      parent.scale[2] * ls[2]
    ];
    const pos = [
      parent.pos[0] + lt[0] * parent.scale[0],
      parent.pos[1] + lt[1] * parent.scale[1],
      parent.pos[2] + lt[2] * parent.scale[2]
    ];
    return { pos, scale };
  }
  function toOrigin(pos, mirrorX) {
    return mirrorX ? [-pos[0], pos[1], pos[2]] : [pos[0], pos[1], pos[2]];
  }
  function toRotation(node) {
    return quatToEulerZYX(node.rotation ?? [0, 0, 0, 1]);
  }
  function importArmature(gltf) {
    if (!gltf.skins?.length || !gltf.nodes?.length) {
      return { boneGroups: /* @__PURE__ */ new Map(), rootJoints: [], boneNames: /* @__PURE__ */ new Map(), chainState: /* @__PURE__ */ new Map(), parentMap: /* @__PURE__ */ new Map() };
    }
    return buildBoneHierarchy(
      gltf.nodes,
      gltf.skins[0].joints,
      /* mirrorX */
      true
    );
  }
  function importAllNodesAsBones(gltf) {
    if (!gltf.nodes?.length) {
      return { boneGroups: /* @__PURE__ */ new Map(), rootJoints: [], boneNames: /* @__PURE__ */ new Map(), chainState: /* @__PURE__ */ new Map(), parentMap: /* @__PURE__ */ new Map() };
    }
    const allIndices = gltf.nodes.map((_, i) => i);
    return buildBoneHierarchy(
      gltf.nodes,
      allIndices,
      /* mirrorX */
      false
    );
  }
  function buildBoneHierarchy(nodes, boneNodeIndices, mirrorX) {
    const jointSet = new Set(boneNodeIndices);
    const parentMap = /* @__PURE__ */ new Map();
    for (let i = 0; i < nodes.length; i++) {
      for (const childIdx of nodes[i].children ?? []) {
        parentMap.set(childIdx, i);
      }
    }
    const rootJoints = boneNodeIndices.filter((ji) => {
      const p = parentMap.get(ji);
      return p === void 0 || !jointSet.has(p);
    });
    const boneGroups = /* @__PURE__ */ new Map();
    const boneNames = /* @__PURE__ */ new Map();
    const chainState = /* @__PURE__ */ new Map();
    const ancestorGroups = /* @__PURE__ */ new Map();
    function ensureAncestorGroup(nodeIdx) {
      const cached = ancestorGroups.get(nodeIdx);
      if (cached)
        return cached;
      const parentIdx = parentMap.get(nodeIdx);
      const parentGroup = parentIdx !== void 0 ? ensureAncestorGroup(parentIdx) : null;
      const parentChain = parentIdx !== void 0 ? chainState.get(parentIdx) ?? IDENTITY_CHAIN : IDENTITY_CHAIN;
      const node = nodes[nodeIdx];
      const chain = advanceChain(parentChain, node);
      chainState.set(nodeIdx, chain);
      const name = (node.name ?? `ancestor_${nodeIdx}`).trim();
      const origin = toOrigin(chain.pos, mirrorX);
      const rotation = toRotation(node);
      const group = new Group({ name });
      group.origin = origin;
      group.rotation = rotation;
      if (parentGroup)
        group.addTo(parentGroup);
      group.init();
      ancestorGroups.set(nodeIdx, group);
      boneNames.set(nodeIdx, name);
      return group;
    }
    const rootParentGroups = /* @__PURE__ */ new Map();
    for (const r of rootJoints) {
      const parentIdx = parentMap.get(r);
      rootParentGroups.set(r, parentIdx !== void 0 ? ensureAncestorGroup(parentIdx) : null);
    }
    const bfsQueue = rootJoints.map((r) => {
      const parentIdx = parentMap.get(r);
      const parentChain = parentIdx !== void 0 ? chainState.get(parentIdx) ?? IDENTITY_CHAIN : IDENTITY_CHAIN;
      return { idx: r, parentChain };
    });
    while (bfsQueue.length > 0) {
      const { idx, parentChain } = bfsQueue.shift();
      const node = nodes[idx];
      const chain = advanceChain(parentChain, node);
      chainState.set(idx, chain);
      const name = (node.name ?? `bone_${idx}`).trim();
      const origin = toOrigin(chain.pos, mirrorX);
      const rotation = toRotation(node);
      const group = new Group({ name });
      group.origin = origin;
      group.rotation = rotation;
      boneGroups.set(idx, group);
      boneNames.set(idx, name);
      for (const childIdx of node.children ?? []) {
        if (jointSet.has(childIdx)) {
          bfsQueue.push({ idx: childIdx, parentChain: chain });
        }
      }
    }
    for (const ji of boneNodeIndices) {
      const parentIdx = parentMap.get(ji);
      if (parentIdx !== void 0 && boneGroups.has(parentIdx)) {
        boneGroups.get(ji).addTo(boneGroups.get(parentIdx));
      } else {
        const rootParent = rootParentGroups.get(ji);
        if (rootParent)
          boneGroups.get(ji).addTo(rootParent);
      }
    }
    const initQueue = [...rootJoints];
    while (initQueue.length > 0) {
      const ji = initQueue.shift();
      boneGroups.get(ji).init();
      for (const childIdx of nodes[ji].children ?? []) {
        if (jointSet.has(childIdx))
          initQueue.push(childIdx);
      }
    }
    return { boneGroups, rootJoints, boneNames, chainState, parentMap };
  }

  // src/skin-editor/weight-store.ts
  var WeightStore = class _WeightStore {
    constructor(vertexCount) {
      this.registeredBones = [];
      // bones known at init time, even before any paint
      // Last-known Blockbench Group uuid per registered bone name — lets
      // reconcileBoneNames() tell "renamed" (uuid still exists, name changed)
      // apart from "actually deleted" (uuid gone). Best-effort only: not part of
      // snapshot()/restore(), so a rename immediately before an undo won't be
      // retroactively detected — acceptable, it just falls back to the old
      // orphan-handling behavior for that one edge case.
      this.boneUuids = /* @__PURE__ */ new Map();
      this.count = vertexCount;
      this.data = /* @__PURE__ */ new Map();
      for (let i = 0; i < vertexCount; i++) {
        this.data.set(`v${i}`, /* @__PURE__ */ new Map());
      }
    }
    static fromPolyMesh(joints, weights) {
      const ws = new _WeightStore(joints.length);
      for (let i = 0; i < joints.length; i++) {
        const map = ws.data.get(`v${i}`);
        for (let s = 0; s < 4; s++) {
          const name = joints[i][s];
          const w = weights[i][s];
          if (name && w > 0)
            map.set(name, w);
        }
      }
      return ws;
    }
    getVertexCount() {
      return this.count;
    }
    getWeightForBone(vk, bone) {
      return this.data.get(vk)?.get(bone) ?? 0;
    }
    setWeight(vk, bone, weight) {
      const map = this.data.get(vk);
      if (!map)
        return;
      if (weight <= 0) {
        map.delete(bone);
      } else {
        map.set(bone, Math.min(1, Math.max(0, weight)));
      }
    }
    /** Sets weight for `bone` and proportionally scales all other bones so the
     *  vertex total stays at 1.0. Used when auto-normalize is active. */
    setWeightNormalized(vk, bone, newWeight) {
      const map = this.data.get(vk);
      if (!map)
        return;
      newWeight = Math.max(0, Math.min(1, newWeight));
      let othersTotal = 0;
      for (const [b, w] of map)
        if (b !== bone)
          othersTotal += w;
      if (othersTotal > 0) {
        const scale = (1 - newWeight) / othersTotal;
        for (const [b, w] of map)
          if (b !== bone)
            map.set(b, Math.max(0, w * scale));
      }
      if (newWeight <= 0)
        map.delete(bone);
      else
        map.set(bone, newWeight);
    }
    removeWeight(vk, bone) {
      this.data.get(vk)?.delete(bone);
    }
    normalize(vk) {
      const map = this.data.get(vk);
      if (!map)
        return;
      const total = Array.from(map.values()).reduce((a, b) => a + b, 0);
      if (total <= 0)
        return;
      for (const [bone, w] of map)
        map.set(bone, w / total);
    }
    normalizeAll() {
      for (const vk of this.data.keys())
        this.normalize(vk);
    }
    /** Resets all weights to 0 — used before a full auto-weight recalculation. */
    clearAll() {
      for (const map of this.data.values())
        map.clear();
    }
    /** Adds a bone to the joint list. No-op if already present. Does not touch any
     *  vertex weights — the new joint starts unpainted (weight 0 everywhere) until
     *  the user brushes/assigns it, matching the normal paint-time normalize() flow. */
    addBone(name) {
      if (!this.registeredBones.includes(name))
        this.registeredBones.push(name);
    }
    /** Removes a bone from the joint list. Refuses (returns false) if any vertex
     *  still has weight assigned to it — the caller must clear those weights first
     *  (e.g. via "Clear Bone") rather than have removal silently redistribute them. */
    removeBone(name) {
      if (this.getInfluencedCount(name) > 0)
        return false;
      this.registeredBones = this.registeredBones.filter((b) => b !== name);
      return true;
    }
    /** Renames a bone across registeredBones and every vertex's weight map —
     *  used when reconcileBoneNames() detects a Group rename (same uuid) rather
     *  than a real deletion, so painted weights survive a plain rename. */
    renameBone(oldName, newName) {
      if (oldName === newName)
        return;
      const idx = this.registeredBones.indexOf(oldName);
      if (idx !== -1)
        this.registeredBones[idx] = newName;
      else if (!this.registeredBones.includes(newName))
        this.registeredBones.push(newName);
      for (const map of this.data.values()) {
        const w = map.get(oldName);
        if (w !== void 0) {
          map.delete(oldName);
          map.set(newName, w);
        }
      }
    }
    /**
     * Detects bones that were RENAMED in the Outliner (same Blockbench Group
     * uuid, different name) rather than deleted, and transparently relinks them
     * (renameBone()) instead of letting them fall through to orphan cleanup.
     * Call this before treating any "name no longer matches a Group" bone as
     * missing — e.g. weight-panel.ts's cleanupOrphanedJoints().
     *
     * Returns bones renamed this call (for a user-facing toast, optional) and
     * bones that are STILL missing after reconciliation (no Group with that
     * name AND no Group with its last-known uuid either — genuinely gone).
     */
    reconcileBoneNames(allGroups) {
      const byName = new Map(allGroups.map((g) => [g.name, g.uuid]));
      const byUuid = new Map(allGroups.map((g) => [g.uuid, g.name]));
      const renamed = [];
      const missing = [];
      for (const name of this.getAllBones()) {
        const currentUuid = byName.get(name);
        if (currentUuid) {
          this.boneUuids.set(name, currentUuid);
          continue;
        }
        const trackedUuid = this.boneUuids.get(name);
        const renamedTo = trackedUuid ? byUuid.get(trackedUuid) : void 0;
        if (renamedTo && renamedTo !== name) {
          this.renameBone(name, renamedTo);
          this.boneUuids.delete(name);
          this.boneUuids.set(renamedTo, trackedUuid);
          renamed.push([name, renamedTo]);
        } else {
          missing.push(name);
        }
      }
      return { renamed, missing };
    }
    getAllBones() {
      const bones2 = new Set(this.registeredBones);
      for (const map of this.data.values()) {
        for (const bone of map.keys())
          bones2.add(bone);
      }
      return Array.from(bones2).sort();
    }
    getInfluencedCount(bone) {
      let count = 0;
      for (const map of this.data.values()) {
        if ((map.get(bone) ?? 0) > 0)
          count++;
      }
      return count;
    }
    getInfluencesForVertex(vk) {
      const map = this.data.get(vk) ?? /* @__PURE__ */ new Map();
      return Array.from(map.entries()).map(([bone, weight]) => ({ bone, weight })).sort((a, b) => b.weight - a.weight);
    }
    /**
     * Zero-allocation accessor for hot per-frame paths (e.g. LBS deform in
     * deform-preview.ts) that don't care about sort order — just the raw
     * bone→weight map for this vertex. Returns the LIVE internal map: callers
     * must treat it as read-only and must not mutate it or hold onto it across
     * a paint stroke (use setWeight()/removeWeight() to mutate).
     */
    getInfluencesMapForVertex(vk) {
      return this.data.get(vk);
    }
    getVertexKeys() {
      return Array.from(this.data.keys());
    }
    /** Deep-copies current state into a plain-data snapshot (see restore()).
     *  Builds the outer array with a single loop instead of
     *  Array.from(entries()).map(...) — same result, one fewer full-size
     *  intermediate array (this runs on every stroke start, i.e. every click). */
    snapshot() {
      const data = [];
      for (const [vk, m] of this.data) {
        data.push([vk, Array.from(m.entries())]);
      }
      return { data, registeredBones: [...this.registeredBones] };
    }
    /** Replaces current state with a previously captured snapshot (undo/redo).
     *  Builds the Map with a single loop instead of snap.data.map(...) feeding
     *  the Map constructor — same result, skips the intermediate array. */
    restore(snap) {
      this.data = /* @__PURE__ */ new Map();
      for (const [vk, entries] of snap.data) {
        this.data.set(vk, new Map(entries));
      }
      this.registeredBones = [...snap.registeredBones];
    }
    /** Creates an empty store from explicit vertex keys (any format — "v{i}" or UUID).
     *  Remembers boneNames so getAllBones() returns them even before any paint. */
    static fromVertexKeys(keys, boneNames) {
      const ws = new _WeightStore(keys.length);
      ws.data.clear();
      for (const k of keys)
        ws.data.set(k, /* @__PURE__ */ new Map());
      ws.registeredBones = [...boneNames];
      return ws;
    }
    toPolyMeshArrays() {
      const joints = [];
      const weights = [];
      for (const map of this.data.values()) {
        const topBones = ["", "", "", ""];
        const topWeights = [0, 0, 0, 0];
        for (const [bone, weight] of map) {
          for (let i = 0; i < 4; i++) {
            if (weight > topWeights[i]) {
              for (let j = 3; j > i; j--) {
                topBones[j] = topBones[j - 1];
                topWeights[j] = topWeights[j - 1];
              }
              topBones[i] = bone;
              topWeights[i] = weight;
              break;
            }
          }
        }
        joints.push(topBones);
        weights.push(topWeights);
      }
      return { joints, weights };
    }
  };
  var _store = null;
  var _group = null;
  function initWeightStore(joints, weights, group) {
    _store = WeightStore.fromPolyMesh(joints, weights);
    _group = group;
    return _store;
  }
  function initWeightStoreFrom(vertexKeys, boneNames, group, polyMeshBase) {
    const store = WeightStore.fromVertexKeys(vertexKeys, boneNames);
    _store = store;
    _group = group;
    const { joints, weights } = store.toPolyMeshArrays();
    const poly = polyMeshBase ?? {};
    poly.joints = joints;
    poly.weights = weights;
    _group.poly_mesh = poly;
    return store;
  }
  function restoreWeightStore(keys, joints, weights, boneNames, group) {
    const store = WeightStore.fromVertexKeys(keys, boneNames);
    for (let i = 0; i < keys.length && i < joints.length; i++) {
      for (let s = 0; s < 4; s++) {
        const bone = joints[i][s];
        const w = weights[i]?.[s] ?? 0;
        if (bone && w > 0)
          store.setWeight(keys[i], bone, w);
      }
    }
    _store = store;
    _group = group;
    return store;
  }
  function getCurrentWeightStore() {
    return _store;
  }
  function getCurrentMeshGroup() {
    return _group;
  }
  function clearWeightStore() {
    _store = null;
    _group = null;
  }
  function flushWeightsToPoly() {
    if (!_store || !_group?.poly_mesh)
      return;
    const { joints, weights } = _store.toPolyMeshArrays();
    _group.poly_mesh.joints = joints;
    _group.poly_mesh.weights = weights;
  }

  // src/skin-editor/auto-weight.ts
  function T() {
    return window.THREE;
  }
  function getBoneWorldPos(group, TH) {
    if (group.mesh?.matrixWorld) {
      const m = group.mesh.matrixWorld.elements;
      return new TH.Vector3(m[12], m[13], m[14]);
    }
    const o = group.origin ?? group.pivot ?? [0, 0, 0];
    return new TH.Vector3(o[0], o[1], o[2]);
  }
  function autoWeightFromGroups(store, meshEl, boneGroups, power = 2) {
    const TH = T();
    if (!TH || boneGroups.length === 0)
      return;
    store.clearAll();
    const mat = meshEl.mesh?.matrixWorld ?? null;
    const bonePositions = boneGroups.map((g) => ({
      name: g.name,
      pos: getBoneWorldPos(g, TH)
    }));
    const tmp = new TH.Vector3();
    for (const [vk, p] of Object.entries(meshEl.vertices ?? {})) {
      tmp.set(p[0], p[1], p[2]);
      if (mat)
        tmp.applyMatrix4(mat);
      const raw = bonePositions.map((b) => {
        const d = Math.max(tmp.distanceTo(b.pos), 1e-3);
        return 1 / Math.pow(d, power);
      });
      const total = raw.reduce((a, b) => a + b, 0);
      if (total <= 0)
        continue;
      for (let i = 0; i < bonePositions.length; i++) {
        const w = raw[i] / total;
        if (w > 1e-3)
          store.setWeight(vk, bonePositions[i].name, w);
      }
    }
  }

  // src/skin-editor/mesh-triangulate.ts
  function triangulateFace(verts) {
    const tris = [];
    for (let i = 1; i + 1 < verts.length; i++) {
      tris.push([verts[0], verts[i + 1], verts[i]]);
    }
    return tris;
  }
  function normalizeFaceUV(uv) {
    const texWidth = Project?.texture_width || 1;
    const texHeight = Project?.texture_height || 1;
    const [u, v] = uv ?? [0, 0];
    return [u / texWidth, (texHeight - v) / texHeight];
  }

  // src/skin-editor/deform-preview.ts
  function T2() {
    return window.THREE;
  }
  function getScene() {
    return window.Preview?.selected?.scene ?? window.scene;
  }
  var projectStates = /* @__PURE__ */ new Map();
  var activeKey = null;
  var _frozen = false;
  var _onFrame = null;
  var _onModeChange = null;
  var DEFORM_MODES = /* @__PURE__ */ new Set(["animate"]);
  var _v = null;
  var _d = null;
  var _m = null;
  function ensureTemps(TH) {
    if (!_v) {
      _v = new TH.Vector3();
      _d = new TH.Vector3();
      _m = new TH.Matrix4();
    }
  }
  function projectKey() {
    const p = window.Project;
    return p?.uuid ?? "__default__";
  }
  function activeState() {
    return activeKey ? projectStates.get(activeKey) ?? null : null;
  }
  function restoreToRestPose() {
    const st = activeState();
    if (!st)
      return;
    setOverlayVisible(st, false);
  }
  function initDeformPreview(store, meshEl, boneGroups) {
    teardownDeformPreview();
    const TH = T2();
    if (!TH || !meshEl?.vertices)
      return;
    const key = projectKey();
    let st = projectStates.get(key);
    const reusable = !!st && st.meshEl === meshEl && st.captured;
    if (reusable) {
      st.store = store;
      for (const g of boneGroups) {
        const existing = st.boneDataMap.get(g.name);
        st.boneDataMap.set(g.name, { group: g, restMatInv: existing?.restMatInv ?? null });
      }
    } else {
      st = {
        store,
        meshEl,
        boneDataMap: /* @__PURE__ */ new Map(),
        captured: false,
        skinnedMesh: null,
        skeleton: null,
        boneList: [],
        overlayScene: null,
        showingOverlay: false,
        originalMeshWasVisible: true
      };
      for (const g of boneGroups) {
        st.boneDataMap.set(g.name, { group: g, restMatInv: null });
      }
      projectStates.set(key, st);
    }
    activeKey = key;
    _onFrame = () => onFrame();
    Blockbench?.on?.("render_frame", _onFrame);
    _onModeChange = () => {
      const modeId = window.Modes?.id ?? "";
      if (!DEFORM_MODES.has(modeId))
        restoreToRestPose();
    };
    Blockbench?.on?.("select_mode", _onModeChange);
  }
  function teardownDeformPreview() {
    if (_onFrame) {
      Blockbench?.removeListener?.("render_frame", _onFrame);
      _onFrame = null;
    }
    if (_onModeChange) {
      Blockbench?.removeListener?.("select_mode", _onModeChange);
      _onModeChange = null;
    }
    const st = activeState();
    if (st)
      setOverlayVisible(st, false);
    activeKey = null;
    _frozen = false;
  }
  function disposeDeformPreview() {
    teardownDeformPreview();
    for (const st of projectStates.values())
      disposeSkinnedMesh(st);
    projectStates.clear();
  }
  function renameBoneInActiveState(oldName, newName) {
    const st = activeState();
    if (!st || oldName === newName)
      return;
    const data = st.boneDataMap.get(oldName);
    if (data) {
      st.boneDataMap.delete(oldName);
      st.boneDataMap.set(newName, data);
    }
    const idx = st.boneList.indexOf(oldName);
    if (idx !== -1)
      st.boneList[idx] = newName;
  }
  function unfreezeDeform(recaptureRest = false) {
    const st = activeState();
    if (!st?.meshEl)
      return;
    _frozen = false;
    if (recaptureRest) {
      st.captured = false;
      disposeSkinnedMesh(st);
    }
  }
  function computeLBSWorldPosition(vk, restWorldPos, out) {
    const st = activeState();
    const TH = T2();
    if (!st || !TH || !st.captured)
      return false;
    const infs = st.store.getInfluencesMapForVertex(vk);
    if (!infs || infs.size === 0)
      return false;
    ensureTemps(TH);
    _d.set(0, 0, 0);
    let wSum = 0;
    for (const [bone, weight] of infs) {
      const data = st.boneDataMap.get(bone);
      if (!data?.group?.mesh?.matrixWorld || !data.restMatInv)
        continue;
      _m.copy(data.group.mesh.matrixWorld).multiply(data.restMatInv);
      _v.set(restWorldPos[0], restWorldPos[1], restWorldPos[2]).applyMatrix4(_m);
      _d.addScaledVector(_v, weight);
      wSum += weight;
    }
    if (wSum < 0.05)
      return false;
    if (Math.abs(wSum - 1) > 1e-3)
      _d.divideScalar(wSum);
    out.copy(_d);
    return true;
  }
  function onFrame() {
    try {
      const st = activeState();
      if (!st)
        return;
      const modeId = window.Modes?.id ?? "";
      const inDeformMode = DEFORM_MODES.has(modeId);
      if (!inDeformMode) {
        const TH = T2();
        if (!st.captured && st.meshEl && TH) {
          ensureTemps(TH);
          captureRest(st, TH);
          st.captured = true;
        }
        if (st.captured && !st.skinnedMesh && st.meshEl) {
          const TH2 = T2();
          if (TH2)
            rebuildSkinnedMesh(st, TH2);
        }
        setOverlayVisible(st, false);
        return;
      }
      if (_frozen || !st.captured || !st.skinnedMesh) {
        setOverlayVisible(st, false);
        return;
      }
      syncSkeletonBones(st);
      setOverlayVisible(st, true);
    } catch {
    }
  }
  function captureRest(st, TH) {
    for (const [, data] of st.boneDataMap) {
      const bMat = data.group?.mesh?.matrixWorld;
      if (bMat)
        data.restMatInv = bMat.clone().invert();
    }
  }
  function syncSkeletonBones(st) {
    if (!st.skeleton)
      return;
    for (let i = 0; i < st.boneList.length; i++) {
      const data = st.boneDataMap.get(st.boneList[i]);
      const mw = data?.group?.mesh?.matrixWorld;
      if (mw)
        st.skeleton.bones[i].matrixWorld.copy(mw);
    }
    st.skeleton.update?.();
  }
  function rebuildSkinnedMesh(st, TH) {
    disposeSkinnedMesh(st);
    const meshEl = st.meshEl;
    if (!meshEl?.faces || !meshEl?.vertices || !meshEl.mesh)
      return;
    const boneList = Array.from(st.boneDataMap.entries()).filter(([, data]) => !!data.restMatInv).map(([name]) => name);
    if (boneList.length === 0)
      return;
    const bones2 = [];
    const boneInverses = [];
    for (const name of boneList) {
      const bone = new TH.Bone();
      bone.name = name;
      bone.matrixAutoUpdate = false;
      bones2.push(bone);
      boneInverses.push(st.boneDataMap.get(name).restMatInv.clone());
    }
    const skeleton = new TH.Skeleton(bones2, boneInverses);
    const boneIndexOf = new Map(boneList.map((n, i) => [n, i]));
    const vertices = meshEl.vertices;
    const mat4 = meshEl.mesh.matrixWorld;
    const tmp = new TH.Vector3();
    const positions = [];
    const uvs = [];
    const skinIndex = [];
    const skinWeight = [];
    const unknownBones = /* @__PURE__ */ new Set();
    for (const face of Object.values(meshEl.faces)) {
      const faceVerts = face.vertices ?? [];
      if (faceVerts.length < 3)
        continue;
      for (const [a, b, c] of triangulateFace(faceVerts)) {
        for (const vk of [a, b, c]) {
          const p = vertices[vk] ?? [0, 0, 0];
          tmp.set(p[0], p[1], p[2]).applyMatrix4(mat4);
          positions.push(tmp.x, tmp.y, tmp.z);
          const [u, v] = normalizeFaceUV(face.uv?.[vk]);
          uvs.push(u, v);
          const infs = st.store.getInfluencesForVertex(vk).slice(0, 4);
          const resolvedIdx = [];
          const resolvedW = [];
          let wSum = 0;
          for (const inf of infs) {
            const idx = boneIndexOf.get(inf.bone);
            if (idx === void 0) {
              unknownBones.add(inf.bone);
              continue;
            }
            resolvedIdx.push(idx);
            resolvedW.push(inf.weight);
            wSum += inf.weight;
          }
          for (let s = 0; s < 4; s++) {
            skinIndex.push(resolvedIdx[s] ?? 0);
            skinWeight.push(resolvedW[s] && wSum > 0 ? resolvedW[s] / wSum : 0);
          }
        }
      }
    }
    if (unknownBones.size > 0) {
      console.warn(
        `[deform-preview] ${unknownBones.size} bone(s) referenced by paint weights have no matching Group/rest capture \u2014 their weight is dropped instead of misassigned: ${Array.from(unknownBones).join(", ")}`
      );
    }
    if (positions.length === 0)
      return;
    const geo = new TH.BufferGeometry();
    geo.setAttribute("position", new TH.BufferAttribute(new Float32Array(positions), 3));
    geo.setAttribute("uv", new TH.BufferAttribute(new Float32Array(uvs), 2));
    geo.setAttribute("skinIndex", new TH.BufferAttribute(new Float32Array(skinIndex), 4));
    geo.setAttribute("skinWeight", new TH.BufferAttribute(new Float32Array(skinWeight), 4));
    geo.computeVertexNormals();
    const srcMaterial = meshEl.mesh.material;
    const baseMat = Array.isArray(srcMaterial) ? srcMaterial[0] : srcMaterial;
    const texture = baseMat?.map ?? baseMat?.uniforms?.map?.value ?? null;
    const material = new TH.MeshBasicMaterial({
      map: texture,
      side: TH.DoubleSide,
      transparent: true,
      alphaTest: 0.05
    });
    const skinnedMesh = new TH.SkinnedMesh(geo, material);
    skinnedMesh.bind(skeleton, new TH.Matrix4());
    skinnedMesh.visible = false;
    st.skinnedMesh = skinnedMesh;
    st.skeleton = skeleton;
    st.boneList = boneList;
  }
  function disposeSkinnedMesh(st) {
    if (st.skinnedMesh) {
      st.overlayScene?.remove(st.skinnedMesh);
      st.skinnedMesh.geometry?.dispose();
      st.skinnedMesh.material?.dispose?.();
    }
    st.skinnedMesh = null;
    st.skeleton = null;
    st.boneList = [];
    st.overlayScene = null;
  }
  function setOverlayVisible(st, visible) {
    if (visible === st.showingOverlay)
      return;
    if (visible) {
      if (!st.skinnedMesh)
        return;
      const scene = getScene();
      if (!scene)
        return;
      if (st.skinnedMesh.parent !== scene)
        scene.add(st.skinnedMesh);
      st.overlayScene = scene;
      st.skinnedMesh.visible = true;
      if (st.meshEl?.mesh) {
        st.originalMeshWasVisible = st.meshEl.mesh.visible;
        st.meshEl.mesh.visible = false;
      }
    } else {
      if (st.skinnedMesh)
        st.skinnedMesh.visible = false;
      if (st.meshEl?.mesh)
        st.meshEl.mesh.visible = st.originalMeshWasVisible ?? true;
    }
    st.showingOverlay = visible;
  }

  // src/skin-editor/weight-overlay.ts
  function T3() {
    return window.THREE;
  }
  function getScene2() {
    return window.Preview?.selected?.scene ?? window.scene;
  }
  function weightToRGB(w) {
    const t = Math.max(0, Math.min(1, w));
    if (t < 0.25) {
      const s2 = t / 0.25;
      return [0, s2, 1];
    }
    if (t < 0.5) {
      const s2 = (t - 0.25) / 0.25;
      return [0, 1, 1 - s2];
    }
    if (t < 0.75) {
      const s2 = (t - 0.5) / 0.25;
      return [s2, 1, 0];
    }
    const s = (t - 0.75) / 0.25;
    return [1, 1 - s, 0];
  }
  var overlayMesh = null;
  var overlayGeo = null;
  var overlayMat = null;
  var overlayScene = null;
  var indexToVk = [];
  var vkToIndices = /* @__PURE__ */ new Map();
  function triangulateFace2(verts) {
    const tris = [];
    for (let i = 1; i + 1 < verts.length; i++) {
      tris.push([verts[0], verts[i + 1], verts[i]]);
    }
    return tris;
  }
  function updateWeightOverlay(store, activeBone, meshGroup) {
    removeWeightOverlay();
    const TH = T3();
    const scene = getScene2();
    if (!TH || !scene)
      return;
    const meshChild = (meshGroup?.children ?? []).find((c) => c.type === "mesh");
    if (!meshChild?.vertices || !meshChild?.faces || !meshChild.mesh)
      return;
    const vertices = meshChild.vertices;
    const faces = meshChild.faces;
    const mat4 = meshChild.mesh.matrixWorld;
    const tmp = new TH.Vector3();
    const positions = [];
    const colors = [];
    indexToVk = [];
    vkToIndices = /* @__PURE__ */ new Map();
    for (const face of Object.values(faces)) {
      const faceVerts = face.vertices;
      if (!faceVerts || faceVerts.length < 3)
        continue;
      for (const [a, b, c] of triangulateFace2(faceVerts)) {
        for (const vk of [a, b, c]) {
          const geoIdx = indexToVk.length;
          indexToVk.push(vk);
          if (!vkToIndices.has(vk))
            vkToIndices.set(vk, []);
          vkToIndices.get(vk).push(geoIdx);
          const p = vertices[vk] ?? [0, 0, 0];
          tmp.set(p[0], p[1], p[2]).applyMatrix4(mat4);
          positions.push(tmp.x, tmp.y, tmp.z);
          const w = store.getWeightForBone(vk, activeBone);
          const [r, g, b2] = weightToRGB(w);
          colors.push(r, g, b2);
        }
      }
    }
    if (indexToVk.length === 0)
      return;
    overlayGeo = new TH.BufferGeometry();
    overlayGeo.setAttribute("position", new TH.BufferAttribute(new Float32Array(positions), 3));
    overlayGeo.setAttribute("color", new TH.BufferAttribute(new Float32Array(colors), 3));
    overlayMat = new TH.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.65,
      depthTest: true,
      depthWrite: false,
      // don't occlude things behind the overlay itself
      polygonOffset: true,
      polygonOffsetFactor: -1,
      // shift overlay slightly toward camera to avoid
      polygonOffsetUnits: -4,
      // z-fighting with the underlying BB mesh
      side: TH.FrontSide
    });
    overlayMesh = new TH.Mesh(overlayGeo, overlayMat);
    overlayMesh.renderOrder = 998;
    overlayScene = scene;
    overlayScene.add(overlayMesh);
  }
  function syncWeightOverlayPositions(meshGroup) {
    if (!overlayMesh || !overlayGeo)
      return;
    const TH = T3();
    if (!TH)
      return;
    const meshChild = (meshGroup?.children ?? []).find((c) => c.type === "mesh");
    if (!meshChild?.vertices || !meshChild.mesh)
      return;
    const vertices = meshChild.vertices;
    const mat4 = meshChild.mesh.matrixWorld;
    const posAttr = overlayGeo.getAttribute("position");
    if (!posAttr || posAttr.count !== indexToVk.length)
      return;
    const tmp = new TH.Vector3();
    for (let i = 0; i < indexToVk.length; i++) {
      const p = vertices[indexToVk[i]] ?? [0, 0, 0];
      tmp.set(p[0], p[1], p[2]).applyMatrix4(mat4);
      posAttr.setXYZ(i, tmp.x, tmp.y, tmp.z);
    }
    posAttr.needsUpdate = true;
  }
  function syncWeightOverlayColors(store, activeBone, _meshGroup) {
    if (!overlayGeo)
      return;
    const colAttr = overlayGeo.getAttribute("color");
    if (!colAttr)
      return;
    for (const [vk, indices] of vkToIndices) {
      const w = store.getWeightForBone(vk, activeBone);
      const [r, g, b] = weightToRGB(w);
      for (const idx of indices) {
        colAttr.setXYZ(idx, r, g, b);
      }
    }
    colAttr.needsUpdate = true;
    const p = window.Preview?.selected;
    if (p?.renderer && p.scene && p.camera) {
      requestAnimationFrame(() => p.renderer.render(p.scene, p.camera));
    }
  }
  function removeWeightOverlay() {
    if (!overlayMesh)
      return;
    overlayScene?.remove(overlayMesh);
    overlayGeo?.dispose();
    overlayMat?.dispose();
    overlayGeo = null;
    overlayMat = null;
    overlayMesh = null;
    overlayScene = null;
    indexToVk = [];
    vkToIndices = /* @__PURE__ */ new Map();
  }

  // src/skin-editor/joint-overlay.ts
  function T4() {
    return window.THREE;
  }
  function getPreview() {
    return window.Preview?.selected;
  }
  function getScene3() {
    return getPreview()?.scene ?? window.scene;
  }
  function getCamera() {
    return getPreview()?.camera;
  }
  function getCanvas() {
    return getPreview()?.renderer?.domElement ?? getPreview()?.canvas ?? null;
  }
  function isSkinEditorMode() {
    return window.Modes?.id === "animorph_skin_editor";
  }
  function getAllBBGroups() {
    const fn = window.getAllGroups;
    if (typeof fn === "function")
      return fn();
    const results = [];
    function walk(children) {
      for (const c of children ?? []) {
        if (c.type === "group")
          results.push(c);
        walk(c.children ?? []);
      }
    }
    walk(window.Outliner?.root ?? []);
    return results;
  }
  var boneEntries = [];
  var groupCache = /* @__PURE__ */ new Map();
  var boneNameSet = /* @__PURE__ */ new Set();
  var threeParent = null;
  var clickHandler = null;
  var onSelect = null;
  var sharedStickGeo = null;
  var sharedHeadGeo = null;
  var defaultBoneLen = 8;
  var _jointsMenuOn = true;
  function setJointsMenuOn(val) {
    _jointsMenuOn = val;
  }
  function isJointsMenuOn() {
    return _jointsMenuOn;
  }
  var _lastBuildParams = null;
  var COLOR_ACTIVE = 16766720;
  var COLOR_INACTIVE = 16777215;
  var COLOR_HEAD = 16777215;
  function createBoneGeometry(TH) {
    const r = 0.15, s = 0.2;
    const pos = new Float32Array([
      0,
      0,
      0,
      // 0 — head tip
      -r,
      s,
      -r,
      // 1
      r,
      s,
      -r,
      // 2
      r,
      s,
      r,
      // 3
      -r,
      s,
      r,
      // 4
      0,
      1,
      0
      // 5 — tail tip
    ]);
    const idx = [
      0,
      2,
      1,
      0,
      3,
      2,
      0,
      4,
      3,
      0,
      1,
      4,
      // head pyramid
      5,
      1,
      2,
      5,
      2,
      3,
      5,
      3,
      4,
      5,
      4,
      1
      // tail pyramid
    ];
    const geo = new TH.BufferGeometry();
    geo.setAttribute("position", new TH.BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return geo;
  }
  function computeHeadTail(group, TH) {
    try {
      if (!group?.mesh)
        return null;
      const head = new TH.Vector3().setFromMatrixPosition(group.mesh.matrixWorld);
      for (const child of group.children ?? []) {
        if (child.type !== "group" || !boneNameSet.has(child.name) || !child.mesh)
          continue;
        const tail = new TH.Vector3().setFromMatrixPosition(child.mesh.matrixWorld);
        if (head.distanceTo(tail) > 1e-3)
          return { head, tail };
      }
      const yDir = new TH.Vector3(0, 1, 0).transformDirection(group.mesh.matrixWorld).normalize();
      return { head, tail: head.clone().addScaledVector(yDir, defaultBoneLen) };
    } catch {
      return null;
    }
  }
  function computeDefaultLen(meshGroup) {
    const meshChild = (meshGroup?.children ?? []).find((c) => c.type === "mesh");
    if (!meshChild?.vertices)
      return 8;
    let minY = Infinity, maxY = -Infinity;
    for (const p of Object.values(meshChild.vertices)) {
      if (p[1] < minY)
        minY = p[1];
      if (p[1] > maxY)
        maxY = p[1];
    }
    const span = maxY - minY;
    return span > 0 ? span * 0.2 : 8;
  }
  var _UP = new function deferUp() {
  }();
  function screenSpaceSize(pos, targetPx) {
    const camera = getCamera();
    const canvas = getCanvas();
    if (!camera || !canvas)
      return defaultBoneLen * 0.12;
    const vH = canvas.clientHeight || 600;
    if (camera.isOrthographicCamera) {
      const frustumH = Math.abs((camera.top ?? 100) - (camera.bottom ?? -100));
      return targetPx * frustumH / vH;
    }
    if (!camera.fov)
      return defaultBoneLen * 0.12;
    const dist = camera.position.distanceTo(pos);
    return targetPx * Math.tan(camera.fov * Math.PI / 360) * 2 * dist / vH;
  }
  var STICK_HALF_W = 0.15;
  function applyBoneTransform(stickObj, headObj, head, tail, TH, widthScale, headScale) {
    const dir = tail.clone().sub(head);
    const len = dir.length();
    if (len < 1e-3)
      return;
    dir.divideScalar(len);
    stickObj.position.copy(head);
    stickObj.scale.set(widthScale ?? len, len, widthScale ?? len);
    const up = new TH.Vector3(0, 1, 0);
    const dot = dir.dot(up);
    if (dot > -0.9999) {
      stickObj.quaternion.setFromUnitVectors(up, dir);
    } else {
      stickObj.quaternion.setFromAxisAngle(new TH.Vector3(1, 0, 0), Math.PI);
    }
    if (headObj) {
      headObj.position.copy(head);
      if (headScale !== void 0)
        headObj.scale.setScalar(headScale);
    }
  }
  function rebuildJointsView() {
    if (!_lastBuildParams)
      return;
    const { store, boneNames, active: active2, meshGroup, onSelect: sel } = _lastBuildParams;
    updateJointOverlay(store, boneNames, active2, meshGroup, sel);
  }
  function updateJointOverlay(_store2, boneNames, active2, meshGroup, onBoneSelect) {
    _lastBuildParams = { store: _store2, boneNames, active: active2, meshGroup, onSelect: onBoneSelect };
    removeJointOverlay();
    const TH = T4();
    if (!TH || boneNames.length === 0)
      return;
    const allGroups = getAllBBGroups();
    for (const name of boneNames) {
      const g = allGroups.find((g2) => g2.name === name);
      if (g)
        groupCache.set(name, g);
    }
    boneNameSet = new Set(boneNames);
    threeParent = getScene3();
    onSelect = onBoneSelect;
    defaultBoneLen = computeDefaultLen(meshGroup);
    const headRadius = defaultBoneLen * 0.08;
    sharedStickGeo = createBoneGeometry(TH);
    sharedHeadGeo = new TH.SphereGeometry(1, 8, 6);
    for (const boneName of boneNames) {
      const isActive3 = boneName === active2;
      const stickMat = new TH.MeshBasicMaterial({
        color: isActive3 ? COLOR_ACTIVE : COLOR_INACTIVE,
        transparent: true,
        opacity: isActive3 ? 0.9 : 0.65,
        depthTest: false,
        side: TH.DoubleSide
      });
      const stickObj = new TH.Mesh(sharedStickGeo, stickMat);
      stickObj.renderOrder = 999;
      const headMat = new TH.MeshBasicMaterial({
        color: isActive3 ? COLOR_ACTIVE : COLOR_HEAD,
        transparent: true,
        opacity: 1,
        depthTest: false
      });
      const headObj = new TH.Mesh(sharedHeadGeo, headMat);
      headObj.scale.setScalar(headRadius);
      headObj.renderOrder = 1e3;
      const group = groupCache.get(boneName);
      if (group) {
        const ht = computeHeadTail(group, TH);
        if (ht) {
          const boneLen = ht.tail.clone().sub(ht.head).length();
          const ws = Math.min(boneLen, screenSpaceSize(ht.head, 9) / STICK_HALF_W);
          const hs = screenSpaceSize(ht.head, 10);
          applyBoneTransform(stickObj, headObj, ht.head, ht.tail, TH, ws, hs);
        }
      }
      threeParent.add(stickObj);
      threeParent.add(headObj);
      boneEntries.push({ stickObj, headObj, boneName });
    }
    const canvas = getCanvas();
    if (!canvas)
      return;
    clickHandler = (e) => {
      if (e.button !== 0)
        return;
      const TH2 = T4();
      const cam = getCamera();
      const cvs = getCanvas();
      if (!TH2 || !cam || !cvs || boneEntries.length === 0)
        return;
      const rect = cvs.getBoundingClientRect();
      const ray = new TH2.Raycaster();
      ray.setFromCamera(new TH2.Vector2(
        (e.clientX - rect.left) / rect.width * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      ), cam);
      const hits = ray.intersectObjects(boneEntries.map((b) => b.headObj), false);
      if (hits.length === 0)
        return;
      const entry = boneEntries.find((b) => b.headObj === hits[0].object);
      if (!entry)
        return;
      e.stopImmediatePropagation();
      if (!isSkinEditorMode()) {
        const group = groupCache.get(entry.boneName);
        if (group?.select) {
          group.select();
          window.Canvas?.updateView?.({
            elements: [group],
            element_aspects: { transform: true }
          });
        }
        return;
      }
      onSelect?.(entry.boneName);
    };
    canvas.addEventListener("mousedown", clickHandler);
  }
  function setActiveBoneInJointOverlay(active2) {
    for (const { stickObj, headObj, boneName } of boneEntries) {
      const isActive3 = boneName === active2;
      stickObj.material.color.set(isActive3 ? COLOR_ACTIVE : COLOR_INACTIVE);
      stickObj.material.opacity = isActive3 ? 0.9 : 0.65;
      headObj.material.color.set(isActive3 ? COLOR_ACTIVE : COLOR_HEAD);
    }
  }
  function syncJointSpherePositions(_store2, _meshGroup) {
    if (boneEntries.length === 0)
      return;
    const TH = T4();
    if (!TH)
      return;
    for (const { stickObj, headObj, boneName } of boneEntries) {
      const group = groupCache.get(boneName);
      if (!group)
        continue;
      const ht = computeHeadTail(group, TH);
      if (!ht)
        continue;
      const dir = ht.tail.clone().sub(ht.head);
      const len = dir.length();
      const ws = Math.min(len, screenSpaceSize(ht.head, 9) / STICK_HALF_W);
      const hs = screenSpaceSize(ht.head, 10);
      applyBoneTransform(stickObj, headObj, ht.head, ht.tail, TH, ws, hs);
    }
  }
  function hitTestJointHeads(e) {
    if (boneEntries.length === 0 || !isSkinEditorMode())
      return false;
    const TH = T4();
    const cam = getCamera();
    const cvs = getCanvas();
    if (!TH || !cam || !cvs)
      return false;
    const rect = cvs.getBoundingClientRect();
    const ray = new TH.Raycaster();
    ray.setFromCamera(new TH.Vector2(
      (e.clientX - rect.left) / rect.width * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    ), cam);
    return ray.intersectObjects(boneEntries.map((b) => b.headObj), false).length > 0;
  }
  function removeJointOverlay() {
    if (threeParent) {
      for (const { stickObj, headObj } of boneEntries) {
        threeParent.remove(stickObj);
        threeParent.remove(headObj);
        stickObj.material?.dispose();
        headObj.material?.dispose();
      }
    }
    sharedStickGeo?.dispose();
    sharedStickGeo = null;
    sharedHeadGeo?.dispose();
    sharedHeadGeo = null;
    boneEntries = [];
    groupCache = /* @__PURE__ */ new Map();
    boneNameSet = /* @__PURE__ */ new Set();
    threeParent = null;
    onSelect = null;
    const canvas = getCanvas();
    if (canvas && clickHandler)
      canvas.removeEventListener("mousedown", clickHandler);
    clickHandler = null;
  }

  // src/skin-editor/skin-setup.ts
  var BB_STORE_EVENT = "animorph:weight_store_changed";
  function findMeshElements() {
    const BBMesh = window.Mesh;
    if (Array.isArray(BBMesh?.all) && BBMesh.all.length > 0)
      return [...BBMesh.all];
    const results = [];
    function traverse(children) {
      for (const child of children ?? []) {
        if (child.type === "mesh")
          results.push(child);
        traverse(child.children ?? []);
      }
    }
    const root = window.Outliner?.root;
    traverse(Array.isArray(root) ? root : []);
    return results;
  }
  function findAllGroups() {
    const fn = window.getAllGroups;
    if (typeof fn === "function")
      return fn();
    const results = [];
    function traverse(children) {
      for (const child of children ?? []) {
        if (child.type === "group")
          results.push(child);
        traverse(child.children ?? []);
      }
    }
    const root = window.Outliner?.root;
    traverse(Array.isArray(root) ? root : []);
    return results;
  }
  function showInitSkinningDialog(onComplete) {
    const meshElements = findMeshElements();
    if (meshElements.length === 0) {
      Blockbench.showMessageBox({
        title: "Initialize Skinning",
        message: "No mesh elements found in the project.\nCreate or import a mesh first.",
        buttons: ["OK"]
      });
      return;
    }
    const allGroups = findAllGroups();
    if (allGroups.length === 0) {
      Blockbench.showMessageBox({
        title: "Initialize Skinning",
        message: "No groups (bones) found.\nCreate at least one group to use as a bone.",
        buttons: ["OK"]
      });
      return;
    }
    const state = {
      meshUuid: meshElements[0].uuid,
      selectedBones: new Set(allGroups.map((g) => g.name)),
      autoWeight: true
    };
    const dialog = new Dialog({
      id: "animorph_init_skinning",
      title: "Initialize Skinning",
      buttons: ["dialog.confirm", "dialog.cancel"],
      width: 460,
      onConfirm() {
        const meshEl = meshElements.find((m) => m.uuid === state.meshUuid);
        if (!meshEl)
          return;
        const rawParent = meshEl.parent ?? meshEl.group;
        const parentGroup = rawParent && typeof rawParent === "object" && rawParent.type === "group" ? rawParent : null;
        if (!parentGroup) {
          Blockbench.showMessageBox({
            title: "Initialize Skinning",
            message: "The mesh element must be inside a Group.\nPlace it inside a group and try again.",
            buttons: ["OK"]
          });
          return;
        }
        const boneNames = Array.from(state.selectedBones);
        if (boneNames.length === 0) {
          Blockbench.showMessageBox({
            title: "Initialize Skinning",
            message: "Please select at least one bone.",
            buttons: ["OK"]
          });
          return;
        }
        let polyMeshBase = null;
        try {
          polyMeshBase = compileMesh(null, meshEl);
        } catch {
        }
        if (!polyMeshBase) {
          polyMeshBase = parentGroup.poly_mesh ?? null;
        }
        const vertexKeys = Object.keys(meshEl.vertices ?? {});
        const store = initWeightStoreFrom(vertexKeys, boneNames, parentGroup, polyMeshBase);
        const boneGroups = allGroups.filter((g) => boneNames.includes(g.name));
        if (state.autoWeight) {
          autoWeightFromGroups(store, meshEl, boneGroups);
          const { joints, weights } = store.toPolyMeshArrays();
          if (parentGroup.poly_mesh) {
            parentGroup.poly_mesh.joints = joints;
            parentGroup.poly_mesh.weights = weights;
          }
        }
        initDeformPreview(store, meshEl, boneGroups);
        Blockbench?.dispatchEvent?.(BB_STORE_EVENT);
        onComplete();
      },
      component: {
        name: "animorph-init-skinning",
        data() {
          return {
            meshUuid: state.meshUuid,
            boneStates: Object.fromEntries(allGroups.map((g) => [g.name, true])),
            meshOpts: meshElements.map((m) => ({
              value: m.uuid,
              label: m.name || `Mesh (${m.uuid.slice(0, 6)})`
            })),
            autoWeight: true
          };
        },
        computed: {
          selectedCount() {
            return Object.values(this.boneStates).filter(Boolean).length;
          },
          totalCount() {
            return Object.keys(this.boneStates).length;
          }
        },
        methods: {
          onMeshChange(uuid) {
            state.meshUuid = uuid;
            this.meshUuid = uuid;
          },
          toggleBone(name) {
            const vm = this;
            vm.boneStates[name] = !vm.boneStates[name];
            if (vm.boneStates[name])
              state.selectedBones.add(name);
            else
              state.selectedBones.delete(name);
          },
          selectAll() {
            const vm = this;
            for (const k of Object.keys(vm.boneStates)) {
              vm.$set(vm.boneStates, k, true);
              state.selectedBones.add(k);
            }
          },
          selectNone() {
            const vm = this;
            for (const k of Object.keys(vm.boneStates)) {
              vm.$set(vm.boneStates, k, false);
            }
            state.selectedBones.clear();
          },
          onAutoWeightChange() {
            state.autoWeight = this.autoWeight;
          }
        },
        template: `
        <div style="font-size:12px; padding:2px 0;">

          <!-- Mesh selector (only shown when multiple meshes exist) -->
          <div v-if="meshOpts.length > 1" style="margin-bottom:14px;">
            <label style="font-size:10px; opacity:0.6; display:block; margin-bottom:5px;">
              Mesh to skin
            </label>
            <select :value="meshUuid" @change="onMeshChange($event.target.value)"
                    class="dark_bordered"
                    style="width:100%; box-sizing:border-box; font-size:11px;">
              <option v-for="o in meshOpts" :key="o.value" :value="o.value">
                {{ o.label }}
              </option>
            </select>
          </div>

          <!-- Bone list -->
          <div style="margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
            <label style="font-size:10px; opacity:0.6;">
              Bones \u2014 {{ selectedCount }} / {{ totalCount }} selected
            </label>
            <div style="display:flex; gap:10px;">
              <span @click="selectAll"
                    style="font-size:10px; cursor:pointer; opacity:0.7;
                           text-decoration:underline;">All</span>
              <span @click="selectNone"
                    style="font-size:10px; cursor:pointer; opacity:0.7;
                           text-decoration:underline;">None</span>
            </div>
          </div>

          <div style="max-height:280px; overflow-y:auto;
                      border:1px solid rgba(255,255,255,0.1); border-radius:3px; padding:2px;">
            <label v-for="(checked, name) in boneStates" :key="name"
                   @click.prevent="toggleBone(name)"
                   style="display:flex; align-items:center; gap:8px; padding:4px 8px;
                          cursor:pointer; border-radius:2px; user-select:none;"
                   :style="{ background: checked ? 'rgba(255,255,255,0.06)' : 'transparent' }">
              <input type="checkbox" :checked="checked" @click.stop="toggleBone(name)"
                     style="cursor:pointer; accent-color:var(--color-accent); margin:0;">
              <span style="font-size:11px; opacity:0.9; font-family:monospace;">{{ name }}</span>
            </label>
          </div>

          <!-- Auto-weight option -->
          <label @click.prevent="autoWeight = !autoWeight; onAutoWeightChange()"
                 style="display:flex; align-items:center; gap:8px; margin-top:12px;
                        cursor:pointer; user-select:none;">
            <input type="checkbox" :checked="autoWeight"
                   @click.stop="autoWeight = !autoWeight; onAutoWeightChange()"
                   style="cursor:pointer; accent-color:var(--color-accent); margin:0;">
            <span style="font-size:11px;">
              Auto-assign weights from bone positions
            </span>
          </label>
          <div style="margin-top:5px; font-size:10px; opacity:0.4; line-height:1.5;
                      padding-left:22px;">
            Uses each bone's pivot position to calculate influence by proximity
            (1/dist\xB2). Uncheck to start with all weights at 0.
          </div>

        </div>
      `
      }
    });
    dialog.show();
  }

  // src/skin-editor/brush.ts
  function T5() {
    return window.THREE;
  }
  function getPreview2() {
    return window.Preview?.selected;
  }
  function getCamera2() {
    return getPreview2()?.camera;
  }
  function getRenderer() {
    return getPreview2()?.renderer;
  }
  function getScene4() {
    return getPreview2()?.scene ?? window.scene;
  }
  function getCanvas2() {
    return getPreview2()?.renderer?.domElement ?? getPreview2()?.canvas ?? null;
  }
  var brushRadius = 50;
  var brushStrength = 0.5;
  var brushMode = "mix";
  var targetWeight = 1;
  var autoNormalize = true;
  var xrayMode = false;
  var isPainting = false;
  var isActive = false;
  var _getMeshGroup = () => null;
  var _getStore = () => null;
  var _getActiveBone = () => "";
  var _onPainted = () => {
  };
  var _onStrokeStart = () => {
  };
  var _onMousedown = null;
  var _onMousemove = null;
  var _onMouseup = null;
  var _onMouseleave = null;
  var _docMouseup = null;
  var pendingMoveEvent = null;
  var rafScheduled = false;
  function scheduleHandleEvent(e) {
    pendingMoveEvent = e;
    if (rafScheduled)
      return;
    rafScheduled = true;
    requestAnimationFrame(() => {
      rafScheduled = false;
      if (pendingMoveEvent)
        handleEvent(pendingMoveEvent);
    });
  }
  var _ndc = null;
  var _ray = null;
  var _tmpW = null;
  var _tmpN = null;
  function ensureBrushTemps(TH) {
    if (_ray)
      return;
    _ndc = new TH.Vector2();
    _ray = new TH.Raycaster();
    _tmpW = new TH.Vector3();
    _tmpN = new TH.Vector3();
  }
  var brushCircleEl = null;
  var adjacencyCache = null;
  function getAdjacency(meshChild) {
    if (adjacencyCache)
      return adjacencyCache;
    const adj = /* @__PURE__ */ new Map();
    for (const vk of Object.keys(meshChild.vertices ?? {}))
      adj.set(vk, /* @__PURE__ */ new Set());
    for (const face of Object.values(meshChild.faces ?? {})) {
      const verts = face.vertices ?? [];
      for (let i = 0; i < verts.length; i++) {
        for (let j = 0; j < verts.length; j++) {
          if (i !== j)
            adj.get(verts[i])?.add(verts[j]);
        }
      }
    }
    adjacencyCache = /* @__PURE__ */ new Map();
    for (const [vk, set] of adj)
      adjacencyCache.set(vk, Array.from(set));
    return adjacencyCache;
  }
  function clearAdjacencyCache() {
    adjacencyCache = null;
  }
  var UNPACK_DOWNSCALE = 255 / 256;
  var UNPACK_X = UNPACK_DOWNSCALE / (256 * 256 * 256);
  var UNPACK_Y = UNPACK_DOWNSCALE / (256 * 256);
  var UNPACK_Z = UNPACK_DOWNSCALE / 256;
  var UNPACK_W = UNPACK_DOWNSCALE;
  var DEPTH_EPSILON = 15e-4;
  var _depthTarget = null;
  var _depthMaterial = null;
  var _depthTargetW = 0;
  var _depthTargetH = 0;
  function disposeDepthPicking() {
    _depthTarget?.dispose();
    _depthTarget = null;
    _depthMaterial?.dispose();
    _depthMaterial = null;
    _depthTargetW = 0;
    _depthTargetH = 0;
  }
  function ensureDepthTarget(TH, width, height) {
    if (!_depthMaterial) {
      _depthMaterial = new TH.MeshDepthMaterial({ depthPacking: TH.RGBADepthPacking });
    }
    if (_depthTarget && (_depthTargetW !== width || _depthTargetH !== height)) {
      _depthTarget.dispose();
      _depthTarget = null;
    }
    if (!_depthTarget) {
      _depthTarget = new TH.WebGLRenderTarget(width, height);
      _depthTargetW = width;
      _depthTargetH = height;
    }
  }
  function unpackDepth(buf, i) {
    return buf[i] / 255 * UNPACK_X + buf[i + 1] / 255 * UNPACK_Y + buf[i + 2] / 255 * UNPACK_Z + buf[i + 3] / 255 * UNPACK_W;
  }
  function isolateForRender(scene, target) {
    const keep = /* @__PURE__ */ new Set();
    for (let cur = target; cur; cur = cur.parent)
      keep.add(cur);
    const hidden = [];
    function walk(node) {
      for (const child of node.children ?? []) {
        if (keep.has(child))
          walk(child);
        else if (child.visible) {
          hidden.push(child);
          child.visible = false;
        }
      }
    }
    walk(scene);
    return hidden;
  }
  function captureDepthAroundCursor(TH, renderer, scene, camera, meshObj, canvasWidth, canvasHeight, cursorX, cursorY, regionPx) {
    if (!renderer?.setRenderTarget || typeof renderer.readRenderTargetPixels !== "function")
      return null;
    if (!scene || canvasWidth < 1 || canvasHeight < 1)
      return null;
    ensureDepthTarget(TH, Math.round(canvasWidth), Math.round(canvasHeight));
    const hiddenObjs = isolateForRender(scene, meshObj);
    const origMaterial = meshObj.material;
    meshObj.material = _depthMaterial;
    const prevClearColor = new TH.Color();
    renderer.getClearColor?.(prevClearColor);
    const prevClearAlpha = renderer.getClearAlpha?.() ?? 1;
    renderer.setClearColor?.(16777215, 1);
    const prevTarget = renderer.getRenderTarget?.();
    let buffer = null;
    let readX = 0, readY = 0, readW = 0, readH = 0;
    try {
      renderer.setRenderTarget(_depthTarget);
      renderer.render(scene, camera);
      const size = Math.max(2, Math.ceil(regionPx * 2));
      readX = Math.max(0, Math.round(cursorX - regionPx));
      readY = Math.max(0, Math.round(canvasHeight - (cursorY + regionPx)));
      readW = Math.min(size, canvasWidth - readX);
      readH = Math.min(size, canvasHeight - readY);
      if (readW > 0 && readH > 0) {
        buffer = new Uint8Array(readW * readH * 4);
        renderer.readRenderTargetPixels(_depthTarget, readX, readY, readW, readH, buffer);
      }
    } finally {
      renderer.setRenderTarget(prevTarget ?? null);
      renderer.setClearColor?.(prevClearColor, prevClearAlpha);
      meshObj.material = origMaterial;
      for (const obj of hiddenObjs)
        obj.visible = true;
    }
    if (!buffer)
      return null;
    const bw = readW, bh = readH;
    const buf = buffer;
    return {
      read(screenX, screenY) {
        const px = Math.round(screenX) - readX;
        const py = canvasHeight - Math.round(screenY) - readY;
        if (px < 0 || px >= bw || py < 0 || py >= bh)
          return 1;
        return unpackDepth(buf, (py * bw + px) * 4);
      }
    };
  }
  function isVertexVisibleDepth(screenX, screenY, ndcZ, depthReader) {
    if (!depthReader)
      return true;
    const expected = (ndcZ + 1) / 2;
    const actual = depthReader.read(screenX, screenY);
    if (actual >= 0.9999)
      return true;
    return expected <= actual + DEPTH_EPSILON;
  }
  function createBrushCircle() {
    brushCircleEl = document.createElement("div");
    brushCircleEl.style.cssText = [
      "position:fixed",
      "border:1.5px solid rgba(255,255,255,0.85)",
      "border-radius:50%",
      "pointer-events:none",
      "z-index:99999",
      "display:none",
      "box-sizing:border-box",
      "mix-blend-mode:difference"
    ].join(";");
    document.body.appendChild(brushCircleEl);
  }
  function destroyBrushCircle() {
    brushCircleEl?.remove();
    brushCircleEl = null;
  }
  function hideBrushCircle() {
    if (brushCircleEl)
      brushCircleEl.style.display = "none";
  }
  function positionBrushCircle(clientX, clientY, painting) {
    if (!brushCircleEl)
      return;
    const screenR = Math.max(4, brushRadius);
    const isSmooth = brushMode === "smooth";
    const borderColor = painting ? isSmooth ? "rgba(100,200,255,0.9)" : "rgba(255,180,0,0.9)" : "rgba(255,255,255,0.85)";
    brushCircleEl.style.display = "block";
    brushCircleEl.style.width = `${screenR * 2}px`;
    brushCircleEl.style.height = `${screenR * 2}px`;
    brushCircleEl.style.left = `${clientX - screenR}px`;
    brushCircleEl.style.top = `${clientY - screenR}px`;
    brushCircleEl.style.borderColor = borderColor;
  }
  function handleEvent(e) {
    const TH = T5();
    const camera = getCamera2();
    const canvas = getCanvas2();
    const store = _getStore();
    if (!TH || !camera || !canvas || !store)
      return;
    const boneName = _getActiveBone();
    if (!boneName)
      return;
    const meshGroup = _getMeshGroup();
    const meshChild = (meshGroup?.children ?? []).find((c) => c.type === "mesh");
    if (!meshChild?.mesh || !meshChild.vertices)
      return;
    ensureBrushTemps(TH);
    const rect = canvas.getBoundingClientRect();
    _ndc.set(
      (e.clientX - rect.left) / rect.width * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    _ray.setFromCamera(_ndc, camera);
    const rayHits = _ray.intersectObject(meshChild.mesh, true);
    if (rayHits.length === 0) {
      hideBrushCircle();
      return;
    }
    positionBrushCircle(e.clientX, e.clientY, isPainting);
    if (!isPainting)
      return;
    const cursorX = e.clientX - rect.left;
    const cursorY = e.clientY - rect.top;
    const mat4 = meshChild.mesh.matrixWorld;
    const tmpW = _tmpW;
    const tmpN = _tmpN;
    let changed = false;
    let lastSx = 0;
    let lastSy = 0;
    const depthReader = !xrayMode ? captureDepthAroundCursor(
      TH,
      getRenderer(),
      getScene4(),
      camera,
      meshChild.mesh,
      rect.width,
      rect.height,
      cursorX,
      cursorY,
      brushRadius
    ) : null;
    const vertices = meshChild.vertices;
    function screenDist() {
      tmpN.copy(tmpW).project(camera);
      if (tmpN.z > 1)
        return Infinity;
      lastSx = (tmpN.x + 1) / 2 * rect.width;
      lastSy = (1 - tmpN.y) / 2 * rect.height;
      return Math.sqrt((lastSx - cursorX) ** 2 + (lastSy - cursorY) ** 2);
    }
    if (brushMode === "smooth") {
      const adj = getAdjacency(meshChild);
      for (const vk in vertices) {
        const p = vertices[vk];
        tmpW.set(p[0], p[1], p[2]).applyMatrix4(mat4);
        const sd = screenDist();
        if (sd >= brushRadius)
          continue;
        if (!isVertexVisibleDepth(lastSx, lastSy, tmpN.z, depthReader))
          continue;
        const neighbors = adj.get(vk);
        if (!neighbors || neighbors.length === 0)
          continue;
        let sum = 0;
        for (const nvk of neighbors)
          sum += store.getWeightForBone(nvk, boneName);
        const avg = sum / neighbors.length;
        const t = 1 - sd / brushRadius;
        const influence = brushStrength * t * t;
        const current = store.getWeightForBone(vk, boneName);
        store.setWeight(vk, boneName, Math.max(0, Math.min(1, current + (avg - current) * influence)));
        changed = true;
      }
    } else {
      for (const vk in vertices) {
        const p = vertices[vk];
        tmpW.set(p[0], p[1], p[2]).applyMatrix4(mat4);
        const sd = screenDist();
        if (sd >= brushRadius)
          continue;
        if (!isVertexVisibleDepth(lastSx, lastSy, tmpN.z, depthReader))
          continue;
        const t = 1 - sd / brushRadius;
        const influence = brushStrength * t * t;
        const current = store.getWeightForBone(vk, boneName);
        let newW;
        if (brushMode === "add") {
          newW = current + influence;
        } else if (brushMode === "subtract") {
          newW = current - influence;
        } else {
          newW = current + (targetWeight - current) * influence;
        }
        if (autoNormalize)
          store.setWeightNormalized(vk, boneName, Math.max(0, Math.min(1, newW)));
        else
          store.setWeight(vk, boneName, Math.max(0, Math.min(1, newW)));
        changed = true;
      }
    }
    if (changed)
      _onPainted();
  }
  function activateBrush(meshGroupGetter, storeGetter, activeBoneGetter, onPainted, onStrokeStart = () => {
  }) {
    if (isActive)
      return;
    isActive = true;
    _getMeshGroup = meshGroupGetter;
    _getStore = storeGetter;
    _getActiveBone = activeBoneGetter;
    _onPainted = onPainted;
    _onStrokeStart = onStrokeStart;
    createBrushCircle();
    const canvas = getCanvas2();
    if (!canvas)
      return;
    canvas.style.cursor = "none";
    _onMousedown = (e) => {
      if (e.button !== 0)
        return;
      if (hitTestJointHeads(e))
        return;
      const TH = T5();
      const cam = getCamera2();
      const cvs = getCanvas2();
      const group = _getMeshGroup();
      const meshChild = (group?.children ?? []).find((c) => c.type === "mesh");
      if (!TH || !cam || !cvs || !meshChild?.mesh)
        return;
      const rect = cvs.getBoundingClientRect();
      const ray = new TH.Raycaster();
      ray.setFromCamera(new TH.Vector2(
        (e.clientX - rect.left) / rect.width * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      ), cam);
      if (ray.intersectObject(meshChild.mesh, true).length === 0)
        return;
      isPainting = true;
      _onStrokeStart();
      handleEvent(e);
    };
    _onMousemove = (e) => {
      if (!(e.buttons & 1)) {
        isPainting = false;
        if (e.buttons !== 0) {
          hideBrushCircle();
          return;
        }
      }
      scheduleHandleEvent(e);
    };
    _onMouseup = () => {
      isPainting = false;
    };
    _onMouseleave = () => {
      isPainting = false;
      hideBrushCircle();
    };
    _docMouseup = () => {
      isPainting = false;
    };
    canvas.addEventListener("mousedown", _onMousedown);
    canvas.addEventListener("mousemove", _onMousemove);
    canvas.addEventListener("mouseup", _onMouseup);
    canvas.addEventListener("mouseleave", _onMouseleave);
    document.addEventListener("mouseup", _docMouseup);
  }
  function deactivateBrush() {
    if (!isActive)
      return;
    isActive = false;
    isPainting = false;
    pendingMoveEvent = null;
    const canvas = getCanvas2();
    if (canvas) {
      canvas.style.cursor = "";
      if (_onMousedown)
        canvas.removeEventListener("mousedown", _onMousedown);
      if (_onMousemove)
        canvas.removeEventListener("mousemove", _onMousemove);
      if (_onMouseup)
        canvas.removeEventListener("mouseup", _onMouseup);
      if (_onMouseleave)
        canvas.removeEventListener("mouseleave", _onMouseleave);
    }
    if (_docMouseup)
      document.removeEventListener("mouseup", _docMouseup);
    _onMousedown = null;
    _onMousemove = null;
    _onMouseup = null;
    _onMouseleave = null;
    _docMouseup = null;
    destroyBrushCircle();
    clearAdjacencyCache();
    disposeDepthPicking();
  }
  function setBrushRadius(r) {
    brushRadius = r;
  }
  function setBrushStrength(s) {
    brushStrength = s;
  }
  function setBrushMode(m) {
    brushMode = m;
  }
  function setBrushTargetWeight(w) {
    targetWeight = w;
  }
  function setAutoNormalize(v) {
    autoNormalize = v;
  }
  function setXrayMode(v) {
    xrayMode = v;
  }

  // src/skin-editor/weight-history.ts
  var MAX_HISTORY = 50;
  var historyOwner = null;
  var undoStack = [];
  var redoStack = [];
  function currentOwnedStore() {
    const store = getCurrentWeightStore();
    if (store !== historyOwner) {
      historyOwner = store;
      undoStack = [];
      redoStack = [];
    }
    return store;
  }
  function recordUndoPoint() {
    const store = currentOwnedStore();
    if (!store)
      return;
    undoStack.push(store.snapshot());
    if (undoStack.length > MAX_HISTORY)
      undoStack.shift();
    redoStack = [];
  }
  function canUndo() {
    return currentOwnedStore() !== null && undoStack.length > 0;
  }
  function canRedo() {
    return currentOwnedStore() !== null && redoStack.length > 0;
  }
  function undoWeightEdit() {
    const store = currentOwnedStore();
    if (!store || undoStack.length === 0)
      return false;
    redoStack.push(store.snapshot());
    store.restore(undoStack.pop());
    return true;
  }
  function redoWeightEdit() {
    const store = currentOwnedStore();
    if (!store || redoStack.length === 0)
      return false;
    undoStack.push(store.snapshot());
    store.restore(redoStack.pop());
    return true;
  }

  // src/skin-editor/weight-panel.ts
  var WEIGHT_PANEL_ID = "animorph_weight_paint";
  var BB_STORE_EVENT2 = "animorph:weight_store_changed";
  function isSkinEditorModeActive() {
    return window.Modes?.id === "animorph_skin_editor";
  }
  var weightPanel = null;
  var _onStoreChanged = null;
  var _onRenderFrame = null;
  var _onSticksFrame = null;
  function reconcileBoneNamesAndSync(store, vm) {
    const allGroups = window.getAllGroups?.() ?? [];
    const { renamed, missing } = store.reconcileBoneNames(allGroups);
    if (renamed.length > 0) {
      flushWeightsToPoly();
      for (const [from, to] of renamed)
        renameBoneInActiveState(from, to);
      if (vm?.activeBone && renamed.some(([from]) => from === vm.activeBone)) {
        vm.activeBone = renamed.find(([from]) => from === vm.activeBone)[1];
      }
    }
    return missing;
  }
  function activateSkinEditor() {
    if (_onRenderFrame)
      return;
    restoreToRestPose();
    unfreezeDeform(true);
    weightPanel?.vue?.refresh();
    activateBrush(
      () => getCurrentMeshGroup(),
      () => getCurrentWeightStore(),
      () => weightPanel?.vue?.activeBone ?? "",
      () => {
        const store = getCurrentWeightStore();
        const group = getCurrentMeshGroup();
        const bone = weightPanel?.vue?.activeBone;
        if (store && group && bone) {
          syncWeightOverlayColors(store, bone, group);
          flushWeightsToPoly();
        }
        weightPanel?.vue?.updateStats();
      },
      // One undo point per stroke (not per mousemove tick) — recorded right before
      // the stroke's first weight change is applied.
      () => recordUndoPoint()
    );
    _onStoreChanged = () => weightPanel?.vue?.refresh();
    Blockbench?.on?.(BB_STORE_EVENT2, _onStoreChanged);
    _onRenderFrame = () => {
      try {
        const store = getCurrentWeightStore();
        const group = getCurrentMeshGroup();
        if (!store || !group)
          return;
        syncWeightOverlayPositions(group);
        syncJointSpherePositions(store, group);
      } catch {
      }
    };
    Blockbench?.on?.("render_frame", _onRenderFrame);
    if (_onSticksFrame) {
      Blockbench?.removeListener?.("render_frame", _onSticksFrame);
      _onSticksFrame = null;
    }
  }
  function deactivateSkinEditor() {
    deactivateBrush();
    if (_onStoreChanged) {
      Blockbench?.removeListener?.(BB_STORE_EVENT2, _onStoreChanged);
      _onStoreChanged = null;
    }
    if (_onRenderFrame) {
      Blockbench?.removeListener?.("render_frame", _onRenderFrame);
      _onRenderFrame = null;
    }
    removeWeightOverlay();
    if (isJointsMenuOn()) {
      startSticksSync();
    } else {
      removeJointOverlay();
    }
  }
  function startSticksSync() {
    if (_onSticksFrame || _onRenderFrame)
      return;
    _onSticksFrame = () => {
      try {
        const store = getCurrentWeightStore();
        const group = getCurrentMeshGroup();
        if (store && group)
          syncJointSpherePositions(store, group);
      } catch {
      }
    };
    Blockbench?.on?.("render_frame", _onSticksFrame);
  }
  function stopSticksSync() {
    if (_onSticksFrame) {
      Blockbench?.removeListener?.("render_frame", _onSticksFrame);
      _onSticksFrame = null;
    }
  }
  function teardownAllOverlays() {
    stopSticksSync();
    removeWeightOverlay();
    removeJointOverlay();
  }
  function getSelectedVertexKeys() {
    const selected = Outliner?.selected ?? [];
    const keys = [];
    for (const el of selected) {
      if (!el || el.type !== "mesh")
        continue;
      const verts = el.vertices;
      if (!verts)
        continue;
      const sel = el.selected?.vertices ?? el.selected_vertices ?? {};
      for (const vk of Object.keys(verts)) {
        if (sel[vk])
          keys.push(vk);
      }
    }
    return keys;
  }
  function allVertexKeys(store) {
    return store?.getVertexKeys() ?? [];
  }
  function makePanelComponent() {
    return {
      name: "animorph-weight-panel",
      data() {
        return {
          storeLoaded: false,
          activeBone: "",
          weightValue: 1,
          bones: [],
          stats: "",
          // Brush
          brushRadius: 50,
          brushStrength: 0.5,
          brushMode: "mix",
          autoNormalize: true,
          xrayMode: false,
          brushModes: [
            { id: "mix", label: "Mix" },
            { id: "add", label: "Add" },
            { id: "subtract", label: "Sub" },
            { id: "smooth", label: "Smooth" }
          ],
          newJointCandidate: ""
        };
      },
      computed: {
        // Groups in the project not yet registered as a paintable joint.
        availableGroupsToAdd() {
          const vm = this;
          const allGroups = window.getAllGroups?.() ?? [];
          return allGroups.map((g) => g.name).filter((n) => !vm.bones.includes(n)).sort();
        }
      },
      mounted() {
        const vm = this;
        const store = getCurrentWeightStore();
        vm.storeLoaded = store !== null;
        vm.bones = store ? store.getAllBones() : [];
        if (vm.bones.length > 0 && !vm.bones.includes(vm.activeBone))
          vm.activeBone = vm.bones[0];
        vm.updateStats();
      },
      beforeDestroy() {
      },
      methods: {
        // Sets the active bone for weight painting and highlights it in the overlay.
        // Does NOT select the BB Group in the Outliner — the user does that manually
        // from Edit mode while the joint sticks remain visible as a spatial guide.
        selectBone(bone) {
          const vm = this;
          vm.activeBone = bone;
          vm.updateStats();
          vm.triggerOverlay();
          setActiveBoneInJointOverlay(bone);
        },
        // Full refresh: UI state + overlays. Called when mode enters or store changes.
        refresh() {
          const vm = this;
          const store = getCurrentWeightStore();
          if (store)
            reconcileBoneNamesAndSync(store, vm);
          vm.storeLoaded = store !== null;
          vm.bones = store ? store.getAllBones() : [];
          if (vm.bones.length > 0 && !vm.bones.includes(vm.activeBone)) {
            vm.activeBone = vm.bones[0];
          }
          vm.updateStats();
          vm.triggerOverlay();
          if (isJointsMenuOn() && store && vm.bones.length > 0) {
            updateJointOverlay(
              store,
              vm.bones,
              vm.activeBone,
              getCurrentMeshGroup(),
              (bone) => vm.selectBone(bone)
            );
          } else {
            removeJointOverlay();
          }
        },
        updateStats() {
          const vm = this;
          const store = getCurrentWeightStore();
          if (!store || !vm.activeBone) {
            vm.stats = "";
            return;
          }
          const influenced = store.getInfluencedCount(vm.activeBone);
          const total = store.getVertexCount();
          vm.stats = `${influenced} / ${total} vertices`;
        },
        // Weight-paint color overlay is a Skin Editor-only visualization. refresh()
        // (which calls this) is reachable from OUTSIDE Skin Editor mode too — e.g.
        // refreshWeightPanel() is called directly right after a GLTF import, while
        // whatever mode the user happens to be in (Edit, etc.) is still active —
        // so this must re-check the mode itself rather than trust callers to only
        // ever invoke it from within Skin Editor.
        triggerOverlay() {
          const vm = this;
          const store = getCurrentWeightStore();
          if (store && vm.activeBone && isSkinEditorModeActive()) {
            updateWeightOverlay(store, vm.activeBone, getCurrentMeshGroup());
          } else {
            removeWeightOverlay();
          }
        },
        // Detects joints whose Group was deleted from the Outliner (e.g. from Edit
        // mode, which has no knowledge of the Skin Editor's joint list). A joint
        // with no remaining weight is silently dropped (pure list hygiene, no data
        // lost). A joint that still has weight is left in place and the user is
        // warned — same "explicit, no silent redistribution" rule as Remove Joint.
        //
        // Before treating a "name no longer matches a Group" bone as deleted,
        // reconcileBoneNamesAndSync() checks whether it was just RENAMED (same
        // Group uuid, new name) — if so it's transparently relinked (weights AND
        // deform-preview.ts's separate bone tracking both survive) instead of
        // falling into this removal/warning path at all.
        cleanupOrphanedJoints() {
          const vm = this;
          const store = getCurrentWeightStore();
          if (!store)
            return;
          const missing = reconcileBoneNamesAndSync(store, vm);
          if (missing.length === 0)
            return;
          const blocked = [];
          for (const bone of missing) {
            if (store.getInfluencedCount(bone) === 0) {
              store.removeBone(bone);
            } else {
              blocked.push(bone);
            }
          }
          if (blocked.length > 0) {
            Blockbench.showMessageBox({
              title: "Joint bone deleted",
              message: `The group for joint "${blocked.join('", "')}" was deleted from the Outliner, but vertices still have weight assigned to it.

Select it as Active Bone and use "Clear Bone" to remove its weight, or undo the deletion in Edit mode.`,
              buttons: ["OK"]
            });
          }
        },
        rebuildOverlays() {
          const vm = this;
          const store = getCurrentWeightStore();
          const group = getCurrentMeshGroup();
          if (!store || !group)
            return;
          clearAdjacencyCache();
          vm.cleanupOrphanedJoints();
          vm.bones = store.getAllBones();
          if (vm.bones.length > 0 && !vm.bones.includes(vm.activeBone))
            vm.activeBone = vm.bones[0];
          if (isSkinEditorModeActive() && vm.activeBone)
            updateWeightOverlay(store, vm.activeBone, group);
          if (isJointsMenuOn() && vm.bones.length > 0) {
            updateJointOverlay(
              store,
              vm.bones,
              vm.activeBone,
              group,
              (bone) => vm.selectBone(bone)
            );
          } else {
            removeJointOverlay();
          }
        },
        initializeSkinning() {
          const vm = this;
          showInitSkinningDialog(() => {
            vm.refresh();
          });
        },
        // ── Joint list management ─────────────────────────────────────────────
        addJoint() {
          const vm = this;
          const store = getCurrentWeightStore();
          const group = getCurrentMeshGroup();
          if (!store || !group || !vm.newJointCandidate)
            return;
          recordUndoPoint();
          store.addBone(vm.newJointCandidate);
          vm.newJointCandidate = "";
          const meshEl = (group.children ?? []).find((c) => c.type === "mesh");
          if (meshEl) {
            const allGroups = window.getAllGroups?.() ?? [];
            const boneNames = store.getAllBones();
            const boneGroups = allGroups.filter((g) => boneNames.includes(g.name));
            initDeformPreview(store, meshEl, boneGroups);
          }
          vm.refresh();
        },
        removeJoint() {
          const vm = this;
          const store = getCurrentWeightStore();
          const group = getCurrentMeshGroup();
          if (!store || !group || !vm.activeBone)
            return;
          const bone = vm.activeBone;
          const influenced = store.getInfluencedCount(bone);
          if (influenced > 0) {
            Blockbench.showMessageBox({
              title: "Remove Joint",
              message: `"${bone}" still has weight on ${influenced} vertex${influenced === 1 ? "" : "es"}.
Clear its weights first (Clear Bone) before removing it.`,
              buttons: ["OK"]
            });
            return;
          }
          Blockbench.showMessageBox({
            title: "Remove Joint",
            message: `Remove "${bone}" from the joint list?`,
            buttons: ["dialog.cancel", "dialog.confirm"]
          }, (result) => {
            if (result !== 1)
              return;
            recordUndoPoint();
            store.removeBone(bone);
            flushWeightsToPoly();
            vm.activeBone = "";
            const meshEl = (group.children ?? []).find((c) => c.type === "mesh");
            if (meshEl) {
              const allGroups = window.getAllGroups?.() ?? [];
              const boneNames = store.getAllBones();
              const boneGroups = allGroups.filter((g) => boneNames.includes(g.name));
              initDeformPreview(store, meshEl, boneGroups);
            }
            vm.refresh();
          });
        },
        onBoneChange() {
          const vm = this;
          vm.updateStats();
          vm.triggerOverlay();
          setActiveBoneInJointOverlay(vm.activeBone);
        },
        onWeightChange() {
          setBrushTargetWeight(this.weightValue);
        },
        onBrushModeChange() {
          setBrushMode(this.brushMode);
        },
        onBrushRadiusChange() {
          setBrushRadius(this.brushRadius);
        },
        onBrushStrengthChange() {
          setBrushStrength(this.brushStrength);
        },
        onNormalizeChange() {
          setAutoNormalize(this.autoNormalize);
        },
        onXrayModeChange() {
          setXrayMode(this.xrayMode);
        },
        // ── Manual vertex operations ──────────────────────────────────────────
        assign() {
          const vm = this;
          const store = getCurrentWeightStore();
          if (!store || !vm.activeBone)
            return;
          const keys = getSelectedVertexKeys();
          if (keys.length === 0) {
            Blockbench.showMessageBox({ title: "Weight Paint", message: "No vertices selected.\nSelect vertices in Mesh Edit mode first.", buttons: ["OK"] });
            return;
          }
          recordUndoPoint();
          for (const vk of keys)
            store.setWeight(vk, vm.activeBone, vm.weightValue);
          flushWeightsToPoly();
          vm.updateStats();
          vm.triggerOverlay();
        },
        remove() {
          const vm = this;
          const store = getCurrentWeightStore();
          if (!store || !vm.activeBone)
            return;
          const keys = getSelectedVertexKeys();
          if (keys.length === 0) {
            Blockbench.showMessageBox({ title: "Weight Paint", message: "No vertices selected.\nSelect vertices in Mesh Edit mode first.", buttons: ["OK"] });
            return;
          }
          recordUndoPoint();
          for (const vk of keys)
            store.removeWeight(vk, vm.activeBone);
          flushWeightsToPoly();
          vm.updateStats();
          vm.triggerOverlay();
        },
        assignAll() {
          const vm = this;
          const store = getCurrentWeightStore();
          if (!store || !vm.activeBone)
            return;
          recordUndoPoint();
          for (const vk of allVertexKeys(store))
            store.setWeight(vk, vm.activeBone, vm.weightValue);
          flushWeightsToPoly();
          vm.updateStats();
          vm.triggerOverlay();
        },
        clearBone() {
          const vm = this;
          const store = getCurrentWeightStore();
          if (!store || !vm.activeBone)
            return;
          recordUndoPoint();
          for (const vk of allVertexKeys(store))
            store.removeWeight(vk, vm.activeBone);
          flushWeightsToPoly();
          vm.updateStats();
          vm.triggerOverlay();
        },
        recalculateAutoWeights() {
          const vm = this;
          const store = getCurrentWeightStore();
          const group = getCurrentMeshGroup();
          if (!store || !group)
            return;
          const meshEl = (group.children ?? []).find((c) => c.type === "mesh");
          if (!meshEl) {
            Blockbench.showMessageBox({ title: "Auto-Weights", message: "No mesh element found in the skin group.", buttons: ["OK"] });
            return;
          }
          const boneNames = store.getAllBones();
          const allGroups = window.getAllGroups?.() ?? [];
          const boneGroups = allGroups.filter((g) => boneNames.includes(g.name));
          recordUndoPoint();
          autoWeightFromGroups(store, meshEl, boneGroups);
          flushWeightsToPoly();
          initDeformPreview(store, meshEl, boneGroups);
          vm.updateStats();
          vm.triggerOverlay();
          if (isJointsMenuOn()) {
            updateJointOverlay(store, vm.bones, vm.activeBone, group, (bone) => {
              vm.activeBone = bone;
              vm.updateStats();
              vm.triggerOverlay();
              setActiveBoneInJointOverlay(bone);
            });
          } else {
            removeJointOverlay();
          }
        },
        normalizeAll() {
          const store = getCurrentWeightStore();
          if (!store)
            return;
          recordUndoPoint();
          store.normalizeAll();
          flushWeightsToPoly();
          Blockbench.showMessageBox({ title: "Weight Paint", message: "All vertex weights normalized.", buttons: ["OK"] });
        },
        // ── Undo / redo ────────────────────────────────────────────────────────
        undoAction() {
          const vm = this;
          if (!undoWeightEdit())
            return;
          vm.afterHistoryChange();
        },
        redoAction() {
          const vm = this;
          if (!redoWeightEdit())
            return;
          vm.afterHistoryChange();
        },
        // Shared refresh after undo/redo — the bone list itself may have changed
        // (Add/Remove Joint are also undoable), so re-sync everything that depends
        // on it, same as after recalculateAutoWeights().
        afterHistoryChange() {
          const vm = this;
          const store = getCurrentWeightStore();
          const group = getCurrentMeshGroup();
          if (!store || !group)
            return;
          flushWeightsToPoly();
          const meshEl = (group.children ?? []).find((c) => c.type === "mesh");
          if (meshEl) {
            const allGroups = window.getAllGroups?.() ?? [];
            const boneNames = store.getAllBones();
            const boneGroups = allGroups.filter((g) => boneNames.includes(g.name));
            initDeformPreview(store, meshEl, boneGroups);
          }
          vm.refresh();
        },
        canUndoNow() {
          return canUndo();
        },
        canRedoNow() {
          return canRedo();
        },
        resetSkinning() {
          const vm = this;
          Blockbench.showMessageBox({
            title: "Reset Skinning",
            message: "This will remove ALL bones and clear ALL vertex weights.\nThe skin data on the group will also be erased.\n\nThis cannot be undone.",
            buttons: ["dialog.cancel", "dialog.confirm"]
          }, (result) => {
            if (result !== 1)
              return;
            const group = getCurrentMeshGroup();
            if (group?.poly_mesh) {
              group.poly_mesh.joints = [];
              group.poly_mesh.weights = [];
            }
            teardownDeformPreview();
            removeWeightOverlay();
            removeJointOverlay();
            clearWeightStore();
            vm.storeLoaded = false;
            vm.bones = [];
            vm.activeBone = "";
            vm.stats = "";
          });
        }
      },
      template: `
      <div style="font-size:12px; padding:10px;">

        <div v-if="!storeLoaded"
             style="text-align:center; margin-top:24px; padding:0 8px;">
          <div style="opacity:0.45; font-size:11px; line-height:1.8; margin-bottom:16px;">
            No skin data loaded.<br>
            Import a GLTF with skinning or initialize<br>
            from the groups already in this project.
          </div>
          <button class="material-button" @click="initializeSkinning"
                  style="width:100%; padding:7px 0; font-size:11px; cursor:pointer;">
            Initialize Skinning...
          </button>
          <div style="margin-top:8px; opacity:0.3; font-size:10px;">
            or use Animorph \u2192 Import GLTF Model
          </div>
        </div>

        <template v-else>

          <!-- \u2500\u2500 Undo / redo \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 -->
          <div style="display:flex; gap:6px; margin-bottom:10px;">
            <button class="material-button" @click="undoAction" :disabled="!canUndoNow()"
                    style="flex:1; padding:5px 0; font-size:11px; cursor:pointer;">
              \u21B6 Undo
            </button>
            <button class="material-button" @click="redoAction" :disabled="!canRedoNow()"
                    style="flex:1; padding:5px 0; font-size:11px; cursor:pointer;">
              \u21B7 Redo
            </button>
          </div>

          <!-- \u2500\u2500 Bone selector \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 -->
          <div style="margin-bottom:10px;">
            <label style="font-size:10px; opacity:0.6; display:block; margin-bottom:4px;">
              Active Bone
            </label>
            <div style="display:flex; gap:6px;">
              <select v-model="activeBone" class="dark_bordered"
                      @change="onBoneChange"
                      style="flex:1; box-sizing:border-box; font-size:11px;">
                <option v-for="bone in bones" :key="bone" :value="bone">{{ bone }}</option>
              </select>
              <button class="material-button" @click="removeJoint" :disabled="!activeBone"
                      title="Remove the active bone from the joint list"
                      style="padding:0 9px; font-size:12px; cursor:pointer;">
                &times;
              </button>
            </div>
            <div style="font-size:9px; opacity:0.4; margin-top:3px;">{{ stats }}</div>
          </div>

          <!-- \u2500\u2500 Add joint \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 -->
          <div style="margin-bottom:10px;" v-if="availableGroupsToAdd.length > 0">
            <label style="font-size:10px; opacity:0.6; display:block; margin-bottom:4px;">
              Add Joint
            </label>
            <div style="display:flex; gap:6px;">
              <select v-model="newJointCandidate" class="dark_bordered"
                      style="flex:1; box-sizing:border-box; font-size:11px;">
                <option value="" disabled>Select a group\u2026</option>
                <option v-for="name in availableGroupsToAdd" :key="name" :value="name">{{ name }}</option>
              </select>
              <button class="material-button" @click="addJoint" :disabled="!newJointCandidate"
                      style="padding:0 10px; font-size:11px; cursor:pointer;">
                Add
              </button>
            </div>
          </div>

          <!-- \u2500\u2500 Weight value \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 -->
          <div style="margin-bottom:12px;">
            <label style="font-size:10px; opacity:0.6; display:block; margin-bottom:4px;">
              Weight (0 \u2013 1)
            </label>
            <div style="display:flex; gap:8px; align-items:center;">
              <input type="range" v-model.number="weightValue"
                     min="0" max="1" step="0.01"
                     @input="onWeightChange"
                     style="flex:1; cursor:pointer; accent-color:var(--color-accent);">
              <input type="number" v-model.number="weightValue"
                     class="dark_bordered"
                     min="0" max="1" step="0.01"
                     @input="onWeightChange"
                     style="width:52px; font-size:11px; box-sizing:border-box;">
            </div>
          </div>

          <!-- \u2500\u2500 Brush \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 -->
          <div style="margin-bottom:12px;">
            <div style="display:flex; justify-content:space-between; align-items:center;
                        margin-bottom:6px;">
              <div style="font-size:10px; opacity:0.45;
                          text-transform:uppercase; letter-spacing:0.06em;">
                Brush
              </div>
              <!-- Normalize toggle \u2014 hidden when smooth mode (not applicable) -->
              <div style="display:flex; gap:10px; align-items:center;">
                <label v-if="brushMode !== 'smooth'"
                       style="display:flex; align-items:center; gap:4px;
                              font-size:10px; opacity:0.7; cursor:pointer; user-select:none;">
                  <input type="checkbox" v-model="autoNormalize" @change="onNormalizeChange"
                         style="margin:0; cursor:pointer; accent-color:var(--color-accent);">
                  Normalize
                </label>
                <label style="display:flex; align-items:center; gap:4px;
                              font-size:10px; opacity:0.7; cursor:pointer; user-select:none;"
                       title="When ON, the brush paints through the mesh (affects back faces too)">
                  <input type="checkbox" v-model="xrayMode" @change="onXrayModeChange"
                         style="margin:0; cursor:pointer; accent-color:var(--color-accent);">
                  X-Ray
                </label>
              </div>
            </div>

            <!-- Mode buttons: 2\xD72 grid -->
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:4px; margin-bottom:8px;">
              <button v-for="m in brushModes" :key="m.id"
                      class="material-button"
                      @click="brushMode = m.id; onBrushModeChange()"
                      :style="{
                        padding: '4px 0',
                        fontSize: '11px',
                        cursor: 'pointer',
                        opacity: brushMode === m.id ? 1 : 0.45,
                        borderBottom: brushMode === m.id
                          ? '2px solid var(--color-accent)'
                          : '2px solid transparent',
                      }">
                {{ m.label }}
              </button>
            </div>

            <!-- Radius -->
            <div style="margin-bottom:6px;">
              <div style="display:flex; justify-content:space-between; margin-bottom:3px;">
                <label style="font-size:10px; opacity:0.6;">Radius</label>
                <span style="font-size:10px; opacity:0.5;">{{ brushRadius }}px</span>
              </div>
              <input type="range" v-model.number="brushRadius"
                     min="5" max="300" step="1"
                     @input="onBrushRadiusChange"
                     style="width:100%; cursor:pointer; accent-color:var(--color-accent);">
            </div>

            <!-- Strength -->
            <div>
              <div style="display:flex; justify-content:space-between; margin-bottom:3px;">
                <label style="font-size:10px; opacity:0.6;">Strength</label>
                <span style="font-size:10px; opacity:0.5;">{{ Math.round(brushStrength * 100) }}%</span>
              </div>
              <input type="range" v-model.number="brushStrength"
                     min="0.01" max="1" step="0.01"
                     @input="onBrushStrengthChange"
                     style="width:100%; cursor:pointer; accent-color:var(--color-accent);">
            </div>
          </div>

          <!-- \u2500\u2500 Selected vertices \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 -->
          <div style="margin-bottom:10px;">
            <div style="font-size:10px; opacity:0.45; margin-bottom:5px;
                        text-transform:uppercase; letter-spacing:0.06em;">
              Selected vertices
            </div>
            <div style="display:flex; gap:6px;">
              <button class="material-button" @click="assign"
                      style="flex:1; padding:5px 0; font-size:11px; cursor:pointer;">
                Assign
              </button>
              <button class="material-button" @click="remove"
                      style="flex:1; padding:5px 0; font-size:11px; cursor:pointer;">
                Remove
              </button>
            </div>
          </div>

          <!-- \u2500\u2500 All vertices \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 -->
          <div style="margin-bottom:10px;">
            <div style="font-size:10px; opacity:0.45; margin-bottom:5px;
                        text-transform:uppercase; letter-spacing:0.06em;">
              All vertices
            </div>
            <div style="display:flex; gap:6px;">
              <button class="material-button" @click="assignAll"
                      style="flex:1; padding:5px 0; font-size:11px; cursor:pointer;">
                Assign All
              </button>
              <button class="material-button" @click="clearBone"
                      style="flex:1; padding:5px 0; font-size:11px; cursor:pointer;">
                Clear Bone
              </button>
            </div>
          </div>

          <!-- \u2500\u2500 Auto-weight & Normalize \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 -->
          <div style="margin-top:12px; border-top:1px solid rgba(255,255,255,0.08);
                      padding-top:10px; display:flex; flex-direction:column; gap:5px;">
            <button class="material-button" @click="recalculateAutoWeights"
                    style="width:100%; padding:6px 0; font-size:11px; cursor:pointer;"
                    title="Recalculate weights from each bone's pivot position (1/dist\xB2). Move your bone groups first, then hit this.">
              Recalculate Auto-Weights
            </button>
            <button class="material-button" @click="normalizeAll"
                    style="width:100%; padding:6px 0; font-size:11px; cursor:pointer; opacity:0.7;">
              Normalize All Vertices
            </button>
            <button class="material-button" @click="resetSkinning"
                    style="width:100%; padding:6px 0; font-size:11px; cursor:pointer;
                           opacity:0.55; color:var(--color-danger, #e06c75);"
                    title="Remove all bones and clear all weights. Returns panel to empty state.">
              Reset Skinning
            </button>
          </div>

        </template>
      </div>
    `
    };
  }
  function registerWeightPanel() {
    if (weightPanel)
      return;
    weightPanel = new Panel({
      id: WEIGHT_PANEL_ID,
      name: "Weight Paint",
      icon: "fas.fa-weight-hanging",
      condition: { modes: ["animorph_skin_editor"] },
      expand_button: true,
      growable: true,
      default_side: "right",
      default_position: {
        slot: "right_bar",
        height: 420
      },
      component: makePanelComponent()
    });
  }
  function refreshWeightPanel() {
    if (weightPanel?.vue?.refresh)
      weightPanel.vue.refresh();
    Blockbench?.dispatchEvent?.(BB_STORE_EVENT2);
    weightPanel?.fold?.(false);
  }
  function syncOverlaysAfterExternalEdit() {
    weightPanel?.vue?.rebuildOverlays();
  }
  function unregisterWeightPanel() {
    weightPanel?.delete();
    weightPanel = null;
  }

  // src/mesh/import-gltf.ts
  function readSiblingFileBytes(sourceDir, relativeUri) {
    if (!isApp || !sourceDir)
      return null;
    try {
      const fs = requireNativeModule("fs");
      const decodedUri = decodeURIComponent(relativeUri);
      const fullPath = PathModule.join(sourceDir, decodedUri);
      if (!fs.existsSync(fullPath))
        return null;
      return new Uint8Array(fs.readFileSync(fullPath));
    } catch (e) {
      console.warn(`[import-gltf] Failed to read sibling file "${relativeUri}":`, e);
      return null;
    }
  }
  function normalizeBoneName(raw) {
    return raw.trim();
  }
  function toArrayBuffer(data) {
    if (data instanceof ArrayBuffer)
      return data;
    return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  }
  function parseGlb(arrayBuffer) {
    const view = new DataView(arrayBuffer);
    const magic = view.getUint32(0, true);
    const version = view.getUint32(4, true);
    if (magic !== 1179937895)
      throw new Error("Not a valid GLB file (bad magic).");
    if (version !== 2)
      throw new Error(`Unsupported GLB version: ${version}. Only glTF 2.0 is supported.`);
    let offset = 12;
    let json = null;
    let bin = null;
    while (offset < arrayBuffer.byteLength) {
      const chunkLength = view.getUint32(offset, true);
      const chunkType = view.getUint32(offset + 4, true);
      offset += 8;
      if (chunkType === 1313821514) {
        const jsonBytes = arrayBuffer.slice(offset, offset + chunkLength);
        json = JSON.parse(new TextDecoder("utf-8").decode(jsonBytes));
      } else if (chunkType === 5130562) {
        bin = arrayBuffer.slice(offset, offset + chunkLength);
      }
      offset += chunkLength;
    }
    if (!json)
      throw new Error("GLB file contains no JSON chunk.");
    return { json, bin };
  }
  function decodeDataUri(uri) {
    const commaIdx = uri.indexOf(",");
    const base64 = commaIdx >= 0 ? uri.slice(commaIdx + 1) : uri;
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++)
      bytes[i] = binaryString.charCodeAt(i);
    return bytes.buffer;
  }
  function guessMimeTypeFromExtension(fileName) {
    const ext = fileName.slice(fileName.lastIndexOf(".") + 1).toLowerCase();
    if (ext === "jpg" || ext === "jpeg")
      return "image/jpeg";
    if (ext === "webp")
      return "image/webp";
    return "image/png";
  }
  function extractPrimitiveTextureImage(gltf, bin, primitive, sourceDir, externalImages) {
    if (primitive.material === void 0)
      return null;
    const material = gltf.materials?.[primitive.material];
    const texRef = material?.pbrMetallicRoughness?.baseColorTexture;
    if (!texRef)
      return null;
    const texture = gltf.textures?.[texRef.index];
    if (!texture || texture.source === void 0)
      return null;
    const image = gltf.images?.[texture.source];
    if (!image)
      return null;
    if (image.bufferView !== void 0) {
      const bufferView = gltf.bufferViews?.[image.bufferView];
      if (!bufferView || !bin)
        return null;
      const offset = bufferView.byteOffset ?? 0;
      return {
        bytes: new Uint8Array(bin, offset, bufferView.byteLength).slice(),
        mimeType: image.mimeType ?? "image/png"
      };
    }
    if (image.uri?.startsWith("data:")) {
      const commaIdx = image.uri.indexOf(",");
      const meta = image.uri.slice(5, commaIdx);
      return {
        bytes: new Uint8Array(decodeDataUri(image.uri)),
        mimeType: meta.split(";")[0] || image.mimeType || "image/png"
      };
    }
    if (image.uri) {
      const diskBytes = readSiblingFileBytes(sourceDir, image.uri);
      if (diskBytes)
        return { bytes: diskBytes, mimeType: image.mimeType ?? guessMimeTypeFromExtension(image.uri) };
      const basename = image.uri.split(/[\\/]/).pop().toLowerCase();
      const bytes = externalImages?.get(basename);
      if (bytes)
        return { bytes, mimeType: image.mimeType ?? guessMimeTypeFromExtension(basename) };
    }
    return null;
  }
  function parsePngDimensions(bytes) {
    if (bytes.length < 24)
      return null;
    const isPng = bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71;
    if (!isPng)
      return null;
    const width = (bytes[16] << 24 | bytes[17] << 16 | bytes[18] << 8 | bytes[19]) >>> 0;
    const height = (bytes[20] << 24 | bytes[21] << 16 | bytes[22] << 8 | bytes[23]) >>> 0;
    return { width, height };
  }
  function bytesToDataUrl(bytes, mimeType) {
    let binary = "";
    for (let i = 0; i < bytes.length; i++)
      binary += String.fromCharCode(bytes[i]);
    return `data:${mimeType};base64,${btoa(binary)}`;
  }
  function importPrimitiveTexture(gltf, bin, primitive, meshName, sourceDir, externalImages) {
    const img = extractPrimitiveTextureImage(gltf, bin, primitive, sourceDir, externalImages);
    if (!img) {
      debugLog("[import-gltf] No embedded/inline base color texture found \u2014 importing without one.");
      return false;
    }
    const dims = parsePngDimensions(img.bytes);
    const tex = new Texture({ name: `${meshName}_texture` });
    tex.fromDataURL(bytesToDataUrl(img.bytes, img.mimeType));
    if (!tex.uuid)
      tex.uuid = Blockbench.guid();
    if (Array.isArray(Texture.all) && !Texture.all.includes(tex))
      Texture.all.push(tex);
    if (Project?.textures && !Project.textures.includes(tex))
      Project.textures.push(tex);
    Blockbench?.dispatchEvent?.("add_texture", { texture: tex });
    if (dims) {
      Project.texture_width = dims.width;
      Project.texture_height = dims.height;
    }
    return true;
  }
  function loadGltfFromBuffer(fileName, content, sourceDir, externalBin) {
    const ab = toArrayBuffer(content);
    if (fileName.toLowerCase().endsWith(".glb")) {
      return parseGlb(ab);
    }
    const json = JSON.parse(new TextDecoder("utf-8").decode(ab));
    let bin = null;
    const bufferUri = json.buffers?.[0]?.uri;
    if (bufferUri?.startsWith("data:")) {
      bin = decodeDataUri(bufferUri);
    } else if (bufferUri) {
      const diskBytes = readSiblingFileBytes(sourceDir, bufferUri);
      bin = diskBytes ? toArrayBuffer(diskBytes) : externalBin ? toArrayBuffer(externalBin) : null;
    } else if (externalBin) {
      bin = toArrayBuffer(externalBin);
    }
    return { json, bin };
  }
  var COMPONENT_SIZE = {
    5120: 1,
    // byte
    5121: 1,
    // ubyte
    5122: 2,
    // short
    5123: 2,
    // ushort
    5125: 4,
    // uint
    5126: 4
    // float
  };
  var TYPE_COUNT = {
    SCALAR: 1,
    VEC2: 2,
    VEC3: 3,
    VEC4: 4,
    MAT2: 4,
    MAT3: 9,
    MAT4: 16
  };
  function decodeAccessor(gltf, bufferData, accessorIndex) {
    const accessors = gltf.accessors;
    const bufferViews = gltf.bufferViews;
    const accessor = accessors[accessorIndex];
    const bufferView = bufferViews[accessor.bufferView];
    const componentCount = TYPE_COUNT[accessor.type] ?? 1;
    const componentType = accessor.componentType;
    const componentBytes = COMPONENT_SIZE[componentType] ?? 4;
    const stride = bufferView.byteStride ?? componentCount * componentBytes;
    const viewOffset = bufferView.byteOffset ?? 0;
    const accOffset = accessor.byteOffset ?? 0;
    if (!bufferData) {
      throw new Error(
        "Binary buffer required but not found. For a plain .gltf, select its .bin file alongside it in the import dialog (or use .glb / glTF Embedded format)."
      );
    }
    const dataView = new DataView(bufferData, viewOffset + accOffset);
    const result = [];
    for (let i = 0; i < accessor.count; i++) {
      const element = [];
      const base = i * stride;
      for (let c = 0; c < componentCount; c++) {
        const bytePos = base + c * componentBytes;
        let value;
        switch (componentType) {
          case 5120:
            value = dataView.getInt8(bytePos);
            break;
          case 5121:
            value = dataView.getUint8(bytePos);
            break;
          case 5122:
            value = dataView.getInt16(bytePos, true);
            break;
          case 5123:
            value = dataView.getUint16(bytePos, true);
            break;
          case 5125:
            value = dataView.getUint32(bytePos, true);
            break;
          case 5126:
            value = dataView.getFloat32(bytePos, true);
            break;
          default:
            value = 0;
        }
        element.push(value);
      }
      result.push(element);
    }
    return result;
  }
  function buildJointNameMap(gltf) {
    const skin = gltf.skins[0];
    const map = /* @__PURE__ */ new Map();
    for (let i = 0; i < skin.joints.length; i++) {
      const nodeIndex = skin.joints[i];
      if (nodeIndex < 0 || nodeIndex >= (gltf.nodes?.length ?? 0)) {
        console.warn(
          `[import-gltf] Joint index ${nodeIndex} (skin slot ${i}) is out of range (${gltf.nodes?.length ?? 0} nodes). Using empty bone name.`
        );
        map.set(i, "");
        continue;
      }
      const node = gltf.nodes[nodeIndex];
      const rawName = node.name ?? "";
      map.set(i, normalizeBoneName(rawName));
    }
    return map;
  }
  function extractSkinData(gltf, bin, primitive, jointNameMap) {
    const jointsAccessorIdx = primitive.attributes["JOINTS_0"];
    const weightsAccessorIdx = primitive.attributes["WEIGHTS_0"];
    if (jointsAccessorIdx === void 0 || weightsAccessorIdx === void 0) {
      return null;
    }
    const rawJoints = decodeAccessor(gltf, bin, jointsAccessorIdx);
    const rawWeights = decodeAccessor(gltf, bin, weightsAccessorIdx);
    const result = [];
    for (let v = 0; v < rawJoints.length; v++) {
      const influences = [];
      for (let slot = 0; slot < 4; slot++) {
        const jointIdx = Math.round(rawJoints[v][slot] ?? 0);
        const weight = rawWeights[v][slot] ?? 0;
        if (weight <= 0)
          continue;
        const name = jointNameMap.get(jointIdx) ?? "";
        influences.push({ name, weight });
      }
      influences.sort((a, b) => b.weight - a.weight);
      if (influences.length > 4) {
        const dropped = influences.splice(4);
        console.warn(
          `[import-gltf] Vertex ${v} has ${dropped.length + 4} influences; clamped to top 4, dropped: ${dropped.map((d) => d.name).join(", ")}`
        );
      }
      const sumWeights = influences.reduce((acc, inf) => acc + inf.weight, 0);
      if (sumWeights > 0) {
        for (const inf of influences) {
          inf.weight /= sumWeights;
        }
      }
      while (influences.length < 4)
        influences.push({ name: "", weight: 0 });
      result.push({
        joints: [influences[0].name, influences[1].name, influences[2].name, influences[3].name],
        weights: [influences[0].weight, influences[1].weight, influences[2].weight, influences[3].weight]
      });
    }
    return result;
  }
  function extractGeometry(gltf, bin, primitive, axisScale) {
    const posAccessorIdx = primitive.attributes["POSITION"];
    const uvAccessorIdx = primitive.attributes["TEXCOORD_0"];
    if (posAccessorIdx === void 0) {
      throw new Error("Primitive has no POSITION attribute.");
    }
    const rawPositions = decodeAccessor(gltf, bin, posAccessorIdx);
    const rawUvs = uvAccessorIdx !== void 0 ? decodeAccessor(gltf, bin, uvAccessorIdx) : rawPositions.map(() => [0, 0]);
    const isRigidPath = axisScale !== void 0;
    const [sx, sy, sz] = axisScale ?? [GLTF_METERS_TO_BLOCKBENCH_UNITS, GLTF_METERS_TO_BLOCKBENCH_UNITS, GLTF_METERS_TO_BLOCKBENCH_UNITS];
    const xSign = isRigidPath ? 1 : -1;
    const positions = rawPositions.map((p) => [
      xSign * p[0] * sx,
      p[1] * sy,
      p[2] * sz
    ]);
    const uvs = rawUvs.map((uv) => [uv[0], uv[1]]);
    let triangles;
    if (primitive.indices !== void 0) {
      const indexData = decodeAccessor(gltf, bin, primitive.indices);
      triangles = [];
      for (let i = 0; i + 2 < indexData.length; i += 3) {
        triangles.push([
          indexData[i][0],
          indexData[i + 1][0],
          indexData[i + 2][0]
        ]);
      }
    } else {
      triangles = [];
      for (let i = 0; i + 2 < positions.length; i += 3) {
        triangles.push([i, i + 1, i + 2]);
      }
    }
    return { positions, uvs, triangles };
  }
  function buildMeshFromGeometry(geo, meshName) {
    const mesh = new Mesh({
      name: meshName,
      autouv: 0,
      color: 0,
      vertices: {}
    });
    for (let i = 0; i < geo.positions.length; i++) {
      mesh.vertices[`v${i}`] = [...geo.positions[i]];
    }
    for (let t = 0; t < geo.triangles.length; t++) {
      const [i0, i1, i2] = geo.triangles[t];
      const vertexKeys = [`v${i0}`, `v${i1}`, `v${i2}`];
      const uv = {};
      const Project_ref = typeof Project !== "undefined" ? Project : null;
      const tw = Project_ref?.texture_width ?? 64;
      const th = Project_ref?.texture_height ?? 64;
      uv[`v${i0}`] = [geo.uvs[i0][0] * tw, geo.uvs[i0][1] * th];
      uv[`v${i1}`] = [geo.uvs[i1][0] * tw, geo.uvs[i1][1] * th];
      uv[`v${i2}`] = [geo.uvs[i2][0] * tw, geo.uvs[i2][1] * th];
      mesh.addFaces(new MeshFace(mesh, { uv, vertices: vertexKeys }));
    }
    return mesh;
  }
  function importGltfMesh(geo, groupName, skinData) {
    const mesh = buildMeshFromGeometry(geo, groupName);
    const group = new Group({ name: groupName });
    group.children.push(mesh);
    group.init();
    mesh.addTo(group).init();
    const skinByVertexKey = /* @__PURE__ */ new Map();
    if (skinData) {
      for (let i = 0; i < geo.positions.length; i++) {
        const key = `v${i}`;
        if (skinData[i]) {
          skinByVertexKey.set(key, skinData[i]);
        }
      }
    }
    return { group, skinByVertexKey };
  }
  function buildSkinnedPolyMesh(group, meshObj, geo, skinByVertexKey) {
    const compiled = compileMesh(null, meshObj);
    if (compiled.positions.length !== geo.positions.length) {
      throw new Error(
        `[import-gltf] Vertex order coupling violation: compileMesh produced ${compiled.positions.length} positions but GLTF has ${geo.positions.length} positions. Skin data cannot be safely applied.`
      );
    }
    const joints = [];
    const weights = [];
    for (let i = 0; i < compiled.positions.length; i++) {
      const skin = skinByVertexKey.get(`v${i}`);
      if (skin) {
        joints.push([...skin.joints]);
        weights.push([...skin.weights]);
      } else {
        joints.push(["", "", "", ""]);
        weights.push([0, 0, 0, 0]);
      }
    }
    return {
      normalized_uvs: compiled.normalized_uvs,
      positions: compiled.positions,
      normals: compiled.normals,
      uvs: compiled.uvs,
      polys: compiled.polys,
      joints,
      weights
    };
  }
  function findSkinnedMeshNodes(gltf) {
    const result = [];
    if (!gltf.nodes || !gltf.meshes)
      return result;
    for (let nodeIndex = 0; nodeIndex < gltf.nodes.length; nodeIndex++) {
      const node = gltf.nodes[nodeIndex];
      if (node.mesh === void 0)
        continue;
      const primitive = gltf.meshes[node.mesh]?.primitives?.[0];
      if (!primitive)
        continue;
      if (primitive.attributes["JOINTS_0"] === void 0 || primitive.attributes["WEIGHTS_0"] === void 0)
        continue;
      const name = normalizeBoneName(node.name || `mesh_${node.mesh}`);
      result.push({ nodeIndex, meshIndex: node.mesh, name, primitive });
    }
    return result;
  }
  function findAllMeshNodes(gltf) {
    const result = [];
    if (!gltf.nodes || !gltf.meshes)
      return result;
    for (let nodeIndex = 0; nodeIndex < gltf.nodes.length; nodeIndex++) {
      const node = gltf.nodes[nodeIndex];
      if (node.mesh === void 0)
        continue;
      const primitive = gltf.meshes[node.mesh]?.primitives?.[0];
      if (!primitive)
        continue;
      const name = normalizeBoneName(node.name || `mesh_${node.mesh}`);
      result.push({ nodeIndex, meshIndex: node.mesh, name, primitive });
    }
    return result;
  }
  function resolvePrimitiveImageIndex(gltf, primitive) {
    if (primitive.material === void 0)
      return void 0;
    const texRef = gltf.materials?.[primitive.material]?.pbrMetallicRoughness?.baseColorTexture;
    if (!texRef)
      return void 0;
    return gltf.textures?.[texRef.index]?.source;
  }
  function loadImageElement(dataUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Failed to decode image for texture atlas."));
      img.src = dataUrl;
    });
  }
  async function buildTextureAtlas(images) {
    const entries = Array.from(images.entries());
    let atlasWidth = 0;
    for (const [, img] of entries)
      atlasWidth = Math.max(atlasWidth, img.width);
    const rects = /* @__PURE__ */ new Map();
    let y = 0;
    for (const [imageIndex, img] of entries) {
      rects.set(imageIndex, { x: 0, y, w: img.width, h: img.height });
      y += img.height;
    }
    const atlasHeight = y;
    const canvas = document.createElement("canvas");
    canvas.width = atlasWidth;
    canvas.height = atlasHeight;
    const ctx = canvas.getContext("2d");
    for (const [imageIndex, img] of entries) {
      const rect = rects.get(imageIndex);
      const imgEl = await loadImageElement(bytesToDataUrl(img.bytes, img.mimeType));
      ctx.drawImage(imgEl, rect.x, rect.y, rect.w, rect.h);
    }
    return { dataUrl: canvas.toDataURL("image/png"), width: atlasWidth, height: atlasHeight, rects };
  }
  function mergeGeometries(entries, atlasRects, atlasSize) {
    const positions = [];
    const uvs = [];
    const triangles = [];
    const skin = [];
    let vertexOffset = 0;
    for (const entry of entries) {
      const rect = atlasRects && entry.imageIndex !== void 0 ? atlasRects.get(entry.imageIndex) : void 0;
      const remapUv = rect && atlasSize ? ([u, v]) => [(u * rect.w + rect.x) / atlasSize.width, (v * rect.h + rect.y) / atlasSize.height] : (uv) => uv;
      for (const p of entry.geo.positions)
        positions.push(p);
      for (const uv of entry.geo.uvs)
        uvs.push(remapUv(uv));
      for (const [a, b, c] of entry.geo.triangles)
        triangles.push([a + vertexOffset, b + vertexOffset, c + vertexOffset]);
      if (entry.skin) {
        for (const s of entry.skin)
          skin.push(s);
      } else {
        for (let i = 0; i < entry.geo.positions.length; i++)
          skin.push({ joints: ["", "", "", ""], weights: [0, 0, 0, 0] });
      }
      vertexOffset += entry.geo.positions.length;
    }
    return { geo: { positions, uvs, triangles }, skin };
  }
  function showMeshSelectionDialog(candidates, onConfirm) {
    const state = {
      selected: new Set(candidates.map((c) => c.name)),
      groupName: candidates[0]?.name ?? "imported_mesh"
    };
    const dialog = new Dialog({
      id: "animorph_gltf_mesh_select",
      title: "Import GLTF Skin \u2014 Select Meshes",
      buttons: ["dialog.confirm", "dialog.cancel"],
      width: 460,
      onConfirm() {
        const chosen = candidates.filter((c) => state.selected.has(c.name));
        if (chosen.length === 0) {
          Blockbench.showMessageBox({ title: "Import GLTF Skin", message: "Select at least one mesh.", buttons: ["OK"] });
          return;
        }
        onConfirm(chosen, state.groupName.trim() || "imported_mesh");
      },
      component: {
        name: "animorph-gltf-mesh-select",
        data() {
          return {
            meshStates: Object.fromEntries(candidates.map((c) => [c.name, true])),
            groupName: state.groupName,
            groupNameTouched: false
            // once the user types their own name, stop auto-updating it
          };
        },
        computed: {
          selectedCount() {
            return Object.values(this.meshStates).filter(Boolean).length;
          },
          totalCount() {
            return Object.keys(this.meshStates).length;
          }
        },
        methods: {
          // Defaults the group name to the FIRST SELECTED candidate (in file order),
          // not just candidates[0] — otherwise it'd always show e.g. "Object_131"
          // even when the user unchecked that one and picked completely different
          // meshes, which is confusing (name doesn't reflect what was chosen).
          refreshDefaultName() {
            const vm = this;
            if (vm.groupNameTouched)
              return;
            const firstSelected = candidates.find((c) => state.selected.has(c.name));
            vm.groupName = state.groupName = firstSelected?.name ?? "imported_mesh";
          },
          toggleMesh(name) {
            const vm = this;
            vm.meshStates[name] = !vm.meshStates[name];
            if (vm.meshStates[name])
              state.selected.add(name);
            else
              state.selected.delete(name);
            vm.refreshDefaultName();
          },
          selectAll() {
            const vm = this;
            for (const k of Object.keys(vm.meshStates)) {
              vm.$set(vm.meshStates, k, true);
              state.selected.add(k);
            }
            vm.refreshDefaultName();
          },
          selectNone() {
            const vm = this;
            for (const k of Object.keys(vm.meshStates))
              vm.$set(vm.meshStates, k, false);
            state.selected.clear();
            vm.refreshDefaultName();
          },
          onGroupNameChange() {
            const vm = this;
            vm.groupNameTouched = true;
            state.groupName = vm.groupName;
          }
        },
        template: `
        <div style="font-size:12px; padding:2px 0;">
          <div style="margin-bottom:10px;">
            <label style="font-size:10px; opacity:0.6; display:block; margin-bottom:5px;">
              Group name
            </label>
            <input type="text" v-model="groupName" @input="onGroupNameChange"
                   class="dark_bordered" style="width:100%; box-sizing:border-box; font-size:11px;">
          </div>

          <div style="margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
            <label style="font-size:10px; opacity:0.6;">
              Meshes to import \u2014 {{ selectedCount }} / {{ totalCount }} selected
            </label>
            <div style="display:flex; gap:10px;">
              <span @click="selectAll"
                    style="font-size:10px; cursor:pointer; opacity:0.7; text-decoration:underline;">All</span>
              <span @click="selectNone"
                    style="font-size:10px; cursor:pointer; opacity:0.7; text-decoration:underline;">None</span>
            </div>
          </div>

          <div style="max-height:280px; overflow-y:auto;
                      border:1px solid rgba(255,255,255,0.1); border-radius:3px; padding:2px;">
            <label v-for="(checked, name) in meshStates" :key="name"
                   @click.prevent="toggleMesh(name)"
                   style="display:flex; align-items:center; gap:8px; padding:4px 8px;
                          cursor:pointer; border-radius:2px; user-select:none;"
                   :style="{ background: checked ? 'rgba(255,255,255,0.06)' : 'transparent' }">
              <input type="checkbox" :checked="checked" @click.stop="toggleMesh(name)"
                     style="cursor:pointer; accent-color:var(--color-accent); margin:0;">
              <span style="font-size:11px; opacity:0.9; font-family:monospace;">{{ name }}</span>
            </label>
          </div>

          <div style="margin-top:8px; font-size:10px; opacity:0.4; line-height:1.5;">
            Meshes sharing the same texture stay 1:1; meshes with different
            textures are combined into one atlas automatically. Parts meant to
            stay independently toggleable at runtime (an outfit, a censor
            patch) should be imported separately instead \u2014 pick just that one
            mesh, run the import again for the rest.
          </div>
        </div>
      `
      }
    });
    dialog.show();
  }
  function formatBedrockTime(t) {
    return String(Math.round(t * 1e4) / 1e4);
  }
  function makeEulerContinuous(currentDegree, previousDegree) {
    let diff = currentDegree - previousDegree;
    while (diff > 180)
      diff -= 360;
    while (diff < -180)
      diff += 360;
    return previousDegree + diff;
  }
  function decodeSampler(gltf, bin, sampler) {
    const times = decodeAccessor(gltf, bin, sampler.input).map((v) => v[0]);
    const values = decodeAccessor(gltf, bin, sampler.output);
    return { times, values, interpolation: sampler.interpolation ?? "LINEAR" };
  }
  function samplerValueAt(sampler, keyframeIndex) {
    if (sampler.interpolation === "CUBICSPLINE")
      return sampler.values[keyframeIndex * 3 + 1];
    return sampler.values[keyframeIndex];
  }
  function bedrockLerpMode(interpolation) {
    if (interpolation === "STEP")
      return "step";
    if (interpolation === "CUBICSPLINE")
      return "catmullrom";
    return void 0;
  }
  function buildBoneChannelKeyframes(gltf, channel, sampler, nodeIndex, chainState, parentMap, mirrorX) {
    const node = gltf.nodes[nodeIndex];
    const keyframes = {};
    const lerpMode = bedrockLerpMode(sampler.interpolation);
    const xSign = mirrorX ? -1 : 1;
    if (channel.target.path === "translation") {
      const rest = node.translation ?? [0, 0, 0];
      const parentIdx = parentMap.get(nodeIndex);
      const parentChain = parentIdx !== void 0 ? chainState.get(parentIdx) ?? IDENTITY_CHAIN : IDENTITY_CHAIN;
      for (let i = 0; i < sampler.times.length; i++) {
        const v = samplerValueAt(sampler, i);
        const deltaBB = [
          xSign * (v[0] - rest[0]) * parentChain.scale[0],
          (v[1] - rest[1]) * parentChain.scale[1],
          (v[2] - rest[2]) * parentChain.scale[2]
        ];
        keyframes[formatBedrockTime(sampler.times[i])] = lerpMode ? { vector: deltaBB, lerp_mode: lerpMode } : deltaBB;
      }
      return { channelKey: "position", keyframes };
    }
    if (channel.target.path === "rotation") {
      const restEuler = quatToEulerZYX(node.rotation ?? [0, 0, 0, 1]);
      let prevEuler = restEuler;
      for (let i = 0; i < sampler.times.length; i++) {
        let euler = quatToEulerZYX(samplerValueAt(sampler, i));
        euler = [
          makeEulerContinuous(euler[0], prevEuler[0]),
          makeEulerContinuous(euler[1], prevEuler[1]),
          makeEulerContinuous(euler[2], prevEuler[2])
        ];
        prevEuler = euler;
        const delta = [
          -(euler[0] - restEuler[0]),
          -(euler[1] - restEuler[1]),
          euler[2] - restEuler[2]
        ];
        keyframes[formatBedrockTime(sampler.times[i])] = lerpMode ? { vector: delta, lerp_mode: lerpMode } : delta;
      }
      return { channelKey: "rotation", keyframes };
    }
    if (channel.target.path === "scale") {
      const rest = node.scale ?? [1, 1, 1];
      for (let i = 0; i < sampler.times.length; i++) {
        const v = samplerValueAt(sampler, i);
        const delta = [v[0] / (rest[0] || 1), v[1] / (rest[1] || 1), v[2] / (rest[2] || 1)];
        keyframes[formatBedrockTime(sampler.times[i])] = lerpMode ? { vector: delta, lerp_mode: lerpMode } : delta;
      }
      return { channelKey: "scale", keyframes };
    }
    return null;
  }
  function importGltfAnimations(gltf, bin, boneNames, chainState, parentMap, fileLabel, mirrorX) {
    if (!gltf.animations || gltf.animations.length === 0)
      return;
    const bedrockAnims = {};
    const animationDefs = gltf.animations;
    for (let animIdx = 0; animIdx < animationDefs.length; animIdx++) {
      const anim = animationDefs[animIdx];
      const bones2 = {};
      let maxTime = 0;
      for (const channel of anim.channels) {
        const nodeIndex = channel.target.node;
        if (nodeIndex === void 0)
          continue;
        const boneName = boneNames.get(nodeIndex);
        if (!boneName) {
          console.warn(`[import-gltf] Animation "${anim.name ?? animIdx}" targets node ${nodeIndex}, which has no imported bone \u2014 skipping channel.`);
          continue;
        }
        const sampler = decodeSampler(gltf, bin, anim.samplers[channel.sampler]);
        if (sampler.times.length === 0)
          continue;
        maxTime = Math.max(maxTime, sampler.times[sampler.times.length - 1]);
        const built = buildBoneChannelKeyframes(gltf, channel, sampler, nodeIndex, chainState, parentMap, mirrorX);
        if (!built)
          continue;
        bones2[boneName] = { ...bones2[boneName] ?? {}, [built.channelKey]: built.keyframes };
      }
      if (Object.keys(bones2).length === 0)
        continue;
      const name = anim.name?.trim() || `animation.${animIdx}`;
      bedrockAnims[name] = {
        loop: true,
        // glTF has no native loop flag — see section header
        ...maxTime > 0 ? { animation_length: Math.round(maxTime * 1e4) / 1e4 } : {},
        bones: bones2
      };
    }
    if (Object.keys(bedrockAnims).length === 0) {
      debugLog("[import-gltf] gltf.animations present but produced no usable Bedrock channels.");
      return;
    }
    try {
      Animator.importFile({
        name: `${fileLabel}.animation.json`,
        path: "",
        content: JSON.stringify({ format_version: "1.8.0", animations: bedrockAnims })
      });
      debugLog(`[import-gltf] Imported ${Object.keys(bedrockAnims).length} animation(s) from "${fileLabel}".`);
    } catch (e) {
      console.error("[import-gltf] Failed to import glTF animations:", e);
      Blockbench.showMessageBox({
        title: "Import GLTF Model \u2014 Warning",
        message: `Geometry imported, but animations failed to import:
${e.message ?? String(e)}`,
        buttons: ["OK"]
      });
    }
  }
  function findPassthroughWrapperNodes(gltf) {
    const animatedNodeIndices = /* @__PURE__ */ new Set();
    for (const anim of gltf.animations ?? []) {
      for (const channel of anim.channels) {
        if (channel.target.node !== void 0)
          animatedNodeIndices.add(channel.target.node);
      }
    }
    const result = /* @__PURE__ */ new Set();
    const nodes = gltf.nodes ?? [];
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (node.mesh !== void 0)
        continue;
      if ((node.children?.length ?? 0) !== 1)
        continue;
      if (animatedNodeIndices.has(i))
        continue;
      result.add(i);
    }
    return result;
  }
  function importRigidMeshNode(gltf, bin, candidate, chainState, atlasRects, atlasSize, imageIndex, group) {
    const axisScale = chainState.get(candidate.nodeIndex)?.scale;
    const geo = extractGeometry(gltf, bin, candidate.primitive, axisScale);
    const rect = atlasRects && imageIndex !== void 0 ? atlasRects.get(imageIndex) : void 0;
    if (rect && atlasSize) {
      geo.uvs = geo.uvs.map(([u, v]) => [(u * rect.w + rect.x) / atlasSize.width, (v * rect.h + rect.y) / atlasSize.height]);
    }
    const mesh = buildMeshFromGeometry(geo, candidate.name);
    mesh.origin = [...group.origin];
    mesh.addTo(group).init();
  }
  async function performRigidImport(gltf, bin, sourceDir, externalImages, fileLabel) {
    const candidates = findAllMeshNodes(gltf);
    const { boneGroups, boneNames, chainState, parentMap } = importAllNodesAsBones(gltf);
    const wrapperNodes = findPassthroughWrapperNodes(gltf);
    for (const nodeIdx of wrapperNodes) {
      const group = boneGroups.get(nodeIdx);
      if (group)
        group.rotation = [0, 0, 0];
    }
    let importedTexture = false;
    if (candidates.length > 0) {
      let totalVertexCount = 0;
      for (const c of candidates) {
        const posIdx = c.primitive.attributes["POSITION"];
        if (posIdx !== void 0)
          totalVertexCount += gltf.accessors?.[posIdx]?.count ?? 0;
      }
      if (totalVertexCount > 2e4) {
        console.warn(`[import-gltf] Rigid import: ${totalVertexCount} total vertices across ${candidates.length} meshes.`);
      }
      const resolved = await resolveCandidateTextures(gltf, bin, candidates, fileLabel, sourceDir, externalImages, "Import GLTF Model");
      importedTexture = resolved.importedTexture;
      for (const c of candidates) {
        const group = boneGroups.get(c.nodeIndex);
        if (!group)
          continue;
        try {
          importRigidMeshNode(gltf, bin, c, chainState, resolved.atlasRects, resolved.atlasSize, resolved.imageIndexByCandidate.get(c), group);
        } catch (e) {
          console.error(`[import-gltf] Failed to import mesh for node "${c.name}":`, e);
        }
      }
    }
    importGltfAnimations(
      gltf,
      bin,
      boneNames,
      chainState,
      parentMap,
      fileLabel,
      /* mirrorX */
      false
    );
    debugLog(`[import-gltf] Rigid import "${fileLabel}": ${candidates.length} mesh node(s), ${boneGroups.size} bone(s), ${gltf.animations?.length ?? 0} animation(s).`);
    if (typeof Canvas?.updateAll === "function")
      Canvas.updateAll();
    Blockbench.showMessageBox({
      title: "Import GLTF Model",
      message: `Successfully imported "${fileLabel}".
Meshes: ${candidates.length} | Bones: ${boneGroups.size}
Texture: ${importedTexture ? "imported" : "not found \u2014 add one manually"}
Animations: ${gltf.animations?.length ? `${gltf.animations.length} imported` : "none in file"}

The model has been added to the current project.`,
      buttons: ["OK"]
    });
  }
  function importGltfWithSkinning() {
    Blockbench.import(
      {
        resource_id: "animorph_gltf_skin",
        extensions: ["gltf", "glb", "bin", "png", "jpg", "jpeg"],
        type: "GLTF Model",
        readtype: "buffer",
        multiple: true
      },
      (files) => {
        if (!files || files.length === 0)
          return;
        const mainFile = files.find((f) => /\.(gltf|glb)$/i.test(f.name));
        if (!mainFile) {
          Blockbench.showMessageBox({
            title: "Import GLTF Model",
            message: "Select a .gltf or .glb file. Its .bin and textures are found automatically if they're in the same folder.",
            buttons: ["OK"]
          });
          return;
        }
        const binFile = files.find((f) => f !== mainFile && /\.bin$/i.test(f.name));
        const externalImages = /* @__PURE__ */ new Map();
        for (const f of files) {
          if (f === mainFile || f === binFile)
            continue;
          if (/\.(png|jpe?g|webp)$/i.test(f.name))
            externalImages.set(f.name.toLowerCase(), f.content);
        }
        const sourceDir = mainFile.path ? PathModule.dirname(mainFile.path) : null;
        _processImport(mainFile.name, mainFile.content, sourceDir, binFile?.content ?? null, externalImages);
      }
    );
  }
  function _processImport(fileName, content, sourceDir, externalBin, externalImages = /* @__PURE__ */ new Map()) {
    let gltfData;
    try {
      gltfData = loadGltfFromBuffer(fileName, content, sourceDir, externalBin);
    } catch (e) {
      Blockbench.showMessageBox({
        title: "Import GLTF Skin \u2014 Error",
        message: `Failed to load file:
${e.message ?? String(e)}`,
        buttons: ["OK"]
      });
      return;
    }
    const { json: gltf, bin } = gltfData;
    if (!gltf.skins || gltf.skins.length === 0) {
      const label = fileName.replace(/\.(gltf|glb)$/i, "");
      void performRigidImport(gltf, bin, sourceDir, externalImages, label);
      return;
    }
    const jointNameMap = buildJointNameMap(gltf);
    const candidates = findSkinnedMeshNodes(gltf);
    if (candidates.length === 0) {
      Blockbench.showMessageBox({
        title: "Import GLTF Skin",
        message: "No JOINTS_0 / WEIGHTS_0 attributes found in any mesh.\nThis file has no skinned meshes. Use regular import instead.",
        buttons: ["OK"]
      });
      return;
    }
    if (candidates.length === 1) {
      void performImport(gltf, bin, candidates, candidates[0].name, jointNameMap, sourceDir, externalImages);
      return;
    }
    showMeshSelectionDialog(candidates, (chosen, groupName) => {
      void performImport(gltf, bin, chosen, groupName, jointNameMap, sourceDir, externalImages);
    });
  }
  async function resolveCandidateTextures(gltf, bin, chosen, meshName, sourceDir, externalImages, errorTitle) {
    const imageIndexByCandidate = /* @__PURE__ */ new Map();
    const imageByIndex = /* @__PURE__ */ new Map();
    for (const c of chosen) {
      const imgIndex = resolvePrimitiveImageIndex(gltf, c.primitive);
      imageIndexByCandidate.set(c, imgIndex);
      if (imgIndex === void 0 || imageByIndex.has(imgIndex))
        continue;
      const img = extractPrimitiveTextureImage(gltf, bin, c.primitive, sourceDir, externalImages);
      if (!img)
        continue;
      const dims = parsePngDimensions(img.bytes);
      if (!dims)
        continue;
      imageByIndex.set(imgIndex, { ...img, ...dims });
    }
    let importedTexture = false;
    let atlasRects = null;
    let atlasSize = null;
    if (imageByIndex.size >= 2) {
      try {
        const atlas = await buildTextureAtlas(imageByIndex);
        const tex = new Texture({ name: `${meshName}_atlas` });
        tex.fromDataURL(atlas.dataUrl);
        if (!tex.uuid)
          tex.uuid = Blockbench.guid();
        if (Array.isArray(Texture.all) && !Texture.all.includes(tex))
          Texture.all.push(tex);
        if (Project?.textures && !Project.textures.includes(tex))
          Project.textures.push(tex);
        Blockbench?.dispatchEvent?.("add_texture", { texture: tex });
        Project.texture_width = atlas.width;
        Project.texture_height = atlas.height;
        atlasRects = atlas.rects;
        atlasSize = { width: atlas.width, height: atlas.height };
        importedTexture = true;
      } catch (e) {
        console.warn("[import-gltf] Failed to build texture atlas:", e);
        Blockbench.showMessageBox({
          title: `${errorTitle} \u2014 Warning`,
          message: `Failed to build the combined texture atlas:
${e.message ?? String(e)}

Import will continue without a texture.`,
          buttons: ["OK"]
        });
      }
    } else if (imageByIndex.size === 1) {
      const withImage = chosen.find((c) => imageIndexByCandidate.get(c) !== void 0);
      if (withImage) {
        try {
          importedTexture = importPrimitiveTexture(gltf, bin, withImage.primitive, meshName, sourceDir, externalImages);
        } catch (e) {
          console.warn("[import-gltf] Failed to import base color texture:", e);
        }
      }
    }
    return { importedTexture, atlasRects, atlasSize, imageIndexByCandidate };
  }
  async function performImport(gltf, bin, chosen, meshName, jointNameMap, sourceDir, externalImages) {
    let totalVertexCount = 0;
    for (const c of chosen) {
      const posIdx = c.primitive.attributes["POSITION"];
      if (posIdx !== void 0)
        totalVertexCount += gltf.accessors?.[posIdx]?.count ?? 0;
    }
    if (totalVertexCount > 2e3) {
      console.warn(
        `[import-gltf] Merged vertex count ${totalVertexCount} exceeds 2000 \u2014 consider reducing geometry for CPU skinning performance.`
      );
      Blockbench.showMessageBox({
        title: "Import GLTF Skin \u2014 Warning",
        message: `Warning: ${totalVertexCount} vertices found across ${chosen.length} mesh${chosen.length === 1 ? "" : "es"}. CPU skinning may impact performance.

Import will continue.`,
        buttons: ["OK"]
      });
    }
    const { importedTexture, atlasRects, atlasSize, imageIndexByCandidate } = await resolveCandidateTextures(
      gltf,
      bin,
      chosen,
      meshName,
      sourceDir,
      externalImages,
      "Import GLTF Skin"
    );
    const mergeEntries = [];
    for (const c of chosen) {
      let geo2;
      try {
        geo2 = extractGeometry(gltf, bin, c.primitive);
      } catch (e) {
        Blockbench.showMessageBox({
          title: "Import GLTF Skin \u2014 Error",
          message: `Failed to extract geometry for "${c.name}":
${e.message ?? String(e)}`,
          buttons: ["OK"]
        });
        return;
      }
      const skin = extractSkinData(gltf, bin, c.primitive, jointNameMap);
      mergeEntries.push({ geo: geo2, skin, imageIndex: imageIndexByCandidate.get(c) });
    }
    const { geo, skin: skinData } = mergeGeometries(mergeEntries, atlasRects, atlasSize);
    let skinnedPolyMesh;
    let bbGroup;
    try {
      const { group, skinByVertexKey } = importGltfMesh(geo, meshName, skinData);
      bbGroup = group;
      const meshChild = group.children.find((c) => c instanceof Mesh);
      if (!meshChild)
        throw new Error("No Mesh child found in imported group.");
      skinnedPolyMesh = buildSkinnedPolyMesh(group, meshChild, geo, skinByVertexKey);
    } catch (e) {
      Blockbench.showMessageBox({
        title: "Import GLTF Skin \u2014 Error",
        message: `Failed to compile mesh:
${e.message ?? String(e)}`,
        buttons: ["OK"]
      });
      return;
    }
    bbGroup.poly_mesh = skinnedPolyMesh;
    const armature = importArmature(gltf);
    initWeightStore(skinnedPolyMesh.joints, skinnedPolyMesh.weights, bbGroup);
    flushWeightsToPoly();
    refreshWeightPanel();
    importGltfAnimations(
      gltf,
      bin,
      armature.boneNames,
      armature.chainState,
      armature.parentMap,
      meshName,
      /* mirrorX */
      true
    );
    debugLog(
      `[import-gltf] Imported "${meshName}" (${chosen.map((c) => c.name).join(", ")}): ${skinnedPolyMesh.positions.length} verts, ${skinnedPolyMesh.polys.length} polys, ${gltf.skins[0].joints.length} joints`
    );
    if (typeof Canvas?.updateAll === "function")
      Canvas.updateAll();
    Blockbench.showMessageBox({
      title: "Import GLTF Skin",
      message: `Successfully imported "${meshName}" (${chosen.map((c) => c.name).join(", ")}).
Vertices: ${skinnedPolyMesh.positions.length} | Polys: ${skinnedPolyMesh.polys.length} | Joints: ${gltf.skins[0].joints.length}
Texture: ${importedTexture ? "imported" : "not found \u2014 add one manually"}
Animations: ${gltf.animations?.length ? `${gltf.animations.length} imported` : "none in file"}

The group has been added to the current project.`,
      buttons: ["OK"]
    });
  }
  var importGltfAction = null;
  function registerImportGltfAction() {
    if (importGltfAction)
      return;
    importGltfAction = new Action("animorph_import_gltf_skin", {
      name: "Import GLTF Model",
      description: "Import any .gltf or .glb file \u2014 skinned or rigid, with animations if present \u2014 into the current project.",
      icon: "fas.fa-bone",
      click() {
        importGltfWithSkinning();
      }
    });
    debugLog("[import-gltf] Action registered");
  }
  function getImportGltfAction() {
    return importGltfAction;
  }
  function unregisterImportGltfAction() {
    if (importGltfAction) {
      importGltfAction.delete();
      importGltfAction = null;
    }
  }

  // src/skin-editor/index.ts
  var SKIN_EDITOR_MODE_ID = "animorph_skin_editor";
  var skinEditorMode = null;
  var skinEditorSetting = null;
  var _skinEditorActive = false;
  var _onProjectSwitch = null;
  var _jointsViewAction = null;
  var _onAnyEditRename = null;
  function registerSkinEditor() {
    if (!skinEditorSetting) {
      skinEditorSetting = new Setting(SETTING_SKIN_EDITOR_ENABLED, {
        id: SETTING_SKIN_EDITOR_ENABLED,
        name: "Skin Editor Tab",
        description: "Show the Skin Editor mode tab in the mode bar.",
        category: "animorph",
        value: true,
        plugin: PLUGIN_ID,
        onChange(value) {
          if (value)
            setupSkinEditor();
          else
            teardownSkinEditor();
        }
      });
    }
    if (settings[SETTING_SKIN_EDITOR_ENABLED]?.value !== false)
      setupSkinEditor();
  }
  function setupSkinEditor() {
    if (skinEditorMode)
      return;
    registerWeightPanel();
    _onAnyEditRename = () => {
      const store = getCurrentWeightStore();
      if (store)
        syncOverlaysAfterExternalEdit();
    };
    Blockbench?.on?.("finish_edit", _onAnyEditRename);
    skinEditorMode = new Mode({
      id: SKIN_EDITOR_MODE_ID,
      name: "Skin Editor",
      icon: "fas.fa-weight-hanging",
      onSelect: safeModeHook("Skin Editor onSelect", () => {
        _skinEditorActive = true;
        activateSkinEditor();
      }),
      onUnselect: safeModeHook("Skin Editor onUnselect", () => {
        _skinEditorActive = false;
        deactivateSkinEditor();
      })
    });
    _onProjectSwitch = () => {
      teardownDeformPreview();
      teardownAllOverlays();
      clearWeightStore();
      tryRestoreFromProject();
      if (_skinEditorActive) {
        deactivateSkinEditor();
        activateSkinEditor();
      }
    };
    Blockbench?.on?.("select_project", _onProjectSwitch);
    Blockbench?.on?.("close_project", _onProjectSwitch);
    tryRestoreFromProject();
    if (_skinEditorActive) {
      deactivateSkinEditor();
      activateSkinEditor();
    }
    const BBAction = window.Action;
    if (typeof BBAction !== "undefined") {
      _jointsViewAction = new BBAction("animorph_toggle_joints", {
        name: "Show Joints",
        icon: "fas.fa-check-square",
        description: "Toggle joint visualization overlay in the 3D viewport",
        click() {
          const newPref = !isJointsMenuOn();
          setJointsMenuOn(newPref);
          _jointsViewAction?.setIcon(newPref ? "fas.fa-check-square" : "far.fa-square");
          const inSkinEditor = window.Modes?.id === SKIN_EDITOR_MODE_ID;
          if (inSkinEditor) {
            if (newPref) {
              rebuildJointsView();
            } else {
              removeJointOverlay();
            }
          } else {
            if (newPref) {
              rebuildJointsView();
              startSticksSync();
            } else {
              stopSticksSync();
              removeJointOverlay();
            }
          }
        }
      });
    }
    Modes.vue?.$forceUpdate?.();
  }
  function getJointsViewAction() {
    return _jointsViewAction;
  }
  function tryRestoreFromProject() {
    const getAllGroupsFn = window.getAllGroups;
    const allGroups = typeof getAllGroupsFn === "function" ? getAllGroupsFn() : [];
    const skinnedGroup = allGroups.find(
      (g) => Array.isArray(g.poly_mesh?.joints) && g.poly_mesh.joints.length > 0
    );
    if (!skinnedGroup)
      return;
    let meshEl = null;
    for (const child of skinnedGroup.children ?? []) {
      if (child.type === "mesh") {
        meshEl = child;
        break;
      }
    }
    if (!meshEl) {
      const BBMesh = window.Mesh;
      if (Array.isArray(BBMesh?.all)) {
        meshEl = BBMesh.all.find((m) => (m.parent ?? m.group) === skinnedGroup);
      }
    }
    if (!meshEl)
      return;
    const vertexKeys = Object.keys(meshEl.vertices ?? {});
    const joints = skinnedGroup.poly_mesh.joints;
    const weights = skinnedGroup.poly_mesh.weights ?? [];
    const boneNameSet2 = /* @__PURE__ */ new Set();
    for (const row of joints)
      for (const b of row)
        if (b)
          boneNameSet2.add(b);
    const boneNames = Array.from(boneNameSet2);
    const store = restoreWeightStore(vertexKeys, joints, weights, boneNames, skinnedGroup);
    const boneGroups = allGroups.filter((g) => boneNameSet2.has(g.name));
    initDeformPreview(store, meshEl, boneGroups);
    if (!_skinEditorActive && isJointsMenuOn()) {
      syncOverlaysAfterExternalEdit();
      startSticksSync();
    }
  }
  function teardownSkinEditor() {
    if (!skinEditorMode)
      return;
    if (typeof Modes !== "undefined" && Modes.id === SKIN_EDITOR_MODE_ID)
      Modes.set("edit");
    if (_onProjectSwitch) {
      Blockbench?.removeListener?.("select_project", _onProjectSwitch);
      Blockbench?.removeListener?.("close_project", _onProjectSwitch);
      _onProjectSwitch = null;
    }
    if (_onAnyEditRename) {
      Blockbench?.removeListener?.("finish_edit", _onAnyEditRename);
      _onAnyEditRename = null;
    }
    _jointsViewAction?.delete?.();
    _jointsViewAction = null;
    disposeDeformPreview();
    deactivateSkinEditor();
    teardownAllOverlays();
    skinEditorMode?.delete();
    skinEditorMode = null;
    _skinEditorActive = false;
    unregisterWeightPanel();
    clearWeightStore();
    Modes.vue?.$forceUpdate?.();
  }
  function unregisterSkinEditor() {
    teardownSkinEditor();
    settings[SETTING_SKIN_EDITOR_ENABLED]?.delete();
    skinEditorSetting = null;
  }

  // src/mesh/handlers.ts
  var COMPILE_HANDLER_NAME = "animorphMeshCompile";
  var COMPILE_BEDROCK_HANDLER_NAME = "animorphMeshCompileBedrock";
  var PARSE_HANDLER_NAME = "animorphMeshParse";
  var PROJECT_COMPILE_HANDLER_NAME = "animorphProjectCompile";
  var PROJECT_PARSE_HANDLER_NAME = "animorphProjectParse";
  function refreshSkinnedPolyMeshGeometry(g) {
    if (!g?.poly_mesh?.joints)
      return g?.poly_mesh ?? null;
    let fresh = null;
    for (const obj of g.children) {
      if (obj instanceof Mesh) {
        fresh = compileMesh(fresh, obj);
      }
    }
    if (fresh === null) {
      return g.poly_mesh;
    }
    fresh.joints = g.poly_mesh.joints;
    fresh.weights = g.poly_mesh.weights;
    return fresh;
  }
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
      if (g.poly_mesh?.joints) {
        bone.poly_mesh = refreshSkinnedPolyMeshGeometry(g);
        continue;
      }
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
    const bones2 = model["minecraft:geometry"]?.[0]?.bones ?? model.bones;
    if (!bones2)
      return;
    setTimeout(() => {
      for (let i = 0; i < bones2.length; i++) {
        const bone = bones2[i];
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
        if (bone.poly_mesh.joints) {
          group.poly_mesh = bone.poly_mesh;
        }
      }
    }, 50);
  }
  function animorphProjectCompile({ model }) {
    const groups = typeof getAllGroups === "function" ? getAllGroups() : [];
    const byUuid = /* @__PURE__ */ new Map();
    for (const g of groups)
      if (g.uuid)
        byUuid.set(g.uuid, g);
    function inject(outliner) {
      for (const entry of outliner) {
        if (!entry || typeof entry !== "object" || !entry.uuid)
          continue;
        const g = byUuid.get(entry.uuid);
        if (g?.poly_mesh?.joints)
          entry.animorph_poly_mesh = refreshSkinnedPolyMeshGeometry(g);
        if (Array.isArray(entry.children))
          inject(entry.children);
      }
    }
    if (Array.isArray(model.outliner))
      inject(model.outliner);
  }
  function animorphProjectParse({ model }) {
    const byUuid = /* @__PURE__ */ new Map();
    function collect(outliner) {
      for (const entry of outliner) {
        if (!entry || typeof entry !== "object")
          continue;
        if (entry.uuid && entry.animorph_poly_mesh?.joints) {
          byUuid.set(entry.uuid, entry.animorph_poly_mesh);
        }
        if (Array.isArray(entry.children))
          collect(entry.children);
      }
    }
    if (Array.isArray(model.outliner))
      collect(model.outliner);
    if (byUuid.size === 0)
      return;
    setTimeout(() => {
      const groups = typeof getAllGroups === "function" ? getAllGroups() : [];
      for (const g of groups) {
        const pm = byUuid.get(g.uuid);
        if (pm)
          g.poly_mesh = pm;
      }
      tryRestoreFromProject();
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
        if (handlerNames.includes(events[i]?.name))
          events.splice(i, 1);
      }
    }
  }
  function purgeProjectEvents(codec) {
    const handlerNames = [PROJECT_COMPILE_HANDLER_NAME, PROJECT_PARSE_HANDLER_NAME];
    for (const eventType of ["parsed", "compile"]) {
      const events = codec.events?.[eventType];
      if (!events)
        continue;
      for (let i = events.length - 1; i >= 0; i--) {
        if (handlerNames.includes(events[i]?.name))
          events.splice(i, 1);
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
    const projectCodec = Codecs["project"];
    if (projectCodec) {
      purgeProjectEvents(projectCodec);
      projectCodec.on("compile", animorphProjectCompile);
      projectCodec.on("parsed", animorphProjectParse);
    }
    registerImportGltfAction();
    registerSkinEditor();
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
      if (codec)
        purgeEvents(codec);
    }
    const projectCodec = Codecs["project"];
    if (projectCodec)
      purgeProjectEvents(projectCodec);
    unregisterImportGltfAction();
    unregisterSkinEditor();
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
    const bones2 = geometry?.bones ?? model.bones;
    if (!bones2)
      return;
    const textDisplayData2 = /* @__PURE__ */ new Map();
    for (const bone of bones2) {
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
  var layerSaveObserver = null;
  var layerSaveStateInterval = null;
  var ctrlSHandler = null;
  var layerSaveBaselines = /* @__PURE__ */ new Map();
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
    return typeof Collection !== "undefined" && Array.isArray(Collection.all) && Collection.all.some((c) => c.export_codec === "animorph_layer");
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
    markLayerAsClean(collection);
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
        markLayerAsClean(collection);
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
      markLayerAsClean(collection);
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
    const bones2 = [];
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
      bones2.push(bone);
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
        bones: bones2
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
            inflate: cube.inflate ?? 0,
            origin: [...cube.origin || [0, 0, 0]],
            rotation: [...cube.rotation || [0, 0, 0]],
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
        const liveLayerElementNames = new Set(
          Cube.all.filter((c) => layerElementUuids.has(c.uuid)).map((c) => stripPrefix2(c.name))
        );
        const otherElements = (bbmodelContent.elements || []).filter(
          (e) => !layerElementUuids.has(e.uuid) && !liveLayerElementNames.has(e.name)
        );
        bbmodelContent.elements = [...otherElements, ...elements];
        debugLog(`[Layers] Merged elements: ${otherElements.length} other + ${elements.length} layer = ${bbmodelContent.elements.length} total`);
        const layerGroupUuids = new Set(
          Group.all.filter((g) => g.name.startsWith(prefix)).map((g) => g.uuid)
        );
        const originalLayerGroups = (bbmodelContent.groups || []).filter(
          (g) => layerGroupUuids.has(g.uuid) || g.name.startsWith(prefix) || Group.all.some((lg) => layerGroupUuids.has(lg.uuid) && lg.name === prefix + g.name)
        );
        debugLog(`[Layers] Found ${originalLayerGroups.length} original layer groups in bbmodel`);
        const handledLiveUuids = /* @__PURE__ */ new Set();
        const updatedGroups = originalLayerGroups.map((origGroup) => {
          const liveGroup = Group.all.find((g) => g.uuid === origGroup.uuid) || Group.all.find((g) => layerGroupUuids.has(g.uuid) && g.name === prefix + origGroup.name);
          if (liveGroup) {
            handledLiveUuids.add(liveGroup.uuid);
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
        const newGroups = Group.all.filter((g) => g.name.startsWith(prefix) && !handledLiveUuids.has(g.uuid)).map((group) => ({
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
          const isLayerGroup = layerGroupUuids.has(origGroup.uuid) || origGroup.name?.startsWith(prefix) || allLayerGroups.some((lg) => lg.uuid === origGroup.uuid);
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
        markLayerAsClean(collection);
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
        markLayerAsClean(collection);
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
        inflate: cube.inflate ?? 0,
        origin: [...cube.origin || [0, 0, 0]],
        rotation: [...cube.rotation || [0, 0, 0]],
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
      markLayerAsClean(collection);
      const fileName = PathModule ? PathModule.basename(filePath) : filePath.split(/[\\/]/).pop();
      Blockbench.showQuickMessage(`Saved to ${fileName} (${allElements.length} elements, ${allProjectGroups.length} groups)`);
    } catch (e) {
      console.error("[Layers] Error saving layer to file:", e);
      Blockbench.showQuickMessage(`Error: ${e.message || "Unknown error"}`, 3e3);
    }
  }
  function getLayerCollectionKey(collection) {
    return String(collection?.uuid || collection?.name || "unknown");
  }
  function sortObjectDeep(value) {
    if (Array.isArray(value)) {
      return value.map(sortObjectDeep);
    }
    if (value && typeof value === "object") {
      const sortedEntries = Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, sortObjectDeep(v)]);
      return Object.fromEntries(sortedEntries);
    }
    return value;
  }
  function computeLayerFingerprint(collection) {
    if (!collection || collection.export_codec !== "animorph_layer")
      return "";
    const elementUuids = new Set(collection.layer_elements || []);
    const faceNames = ["north", "east", "south", "west", "up", "down"];
    const cubes = Cube.all.filter((c) => elementUuids.has(c.uuid)).map((cube) => {
      const faces = {};
      for (const fn of faceNames) {
        const f = cube.faces?.[fn];
        if (!f)
          continue;
        faces[fn] = {
          uv: f.uv ? [...f.uv] : void 0,
          texture: f.texture,
          rotation: f.rotation || 0
        };
      }
      return {
        uuid: cube.uuid,
        name: cube.name,
        from: [...cube.from || [0, 0, 0]],
        to: [...cube.to || [0, 0, 0]],
        origin: [...cube.origin || [0, 0, 0]],
        rotation: [...cube.rotation || [0, 0, 0]],
        inflate: cube.inflate || 0,
        color: cube.color || 0,
        faces
      };
    }).sort((a, b) => String(a.uuid).localeCompare(String(b.uuid)));
    const groups = Group.all.filter((g) => elementUuids.has(g.uuid)).map((group) => ({
      uuid: group.uuid,
      name: group.name,
      origin: [...group.origin || [0, 0, 0]],
      rotation: [...group.rotation || [0, 0, 0]],
      children: (group.children || []).map((c) => typeof c === "string" ? c : c.uuid).sort()
    })).sort((a, b) => String(a.uuid).localeCompare(String(b.uuid)));
    const layerAnims = serializeLayerAnimations(collection);
    const anims = sortObjectDeep(layerAnims?.animations || {});
    return JSON.stringify({ cubes, groups, anims });
  }
  function isLayerDirty(collection) {
    if (!collection || collection.export_codec !== "animorph_layer")
      return false;
    if (!collection.export_path)
      return true;
    const key = getLayerCollectionKey(collection);
    const current = computeLayerFingerprint(collection);
    const baseline = layerSaveBaselines.get(key);
    if (baseline === void 0) {
      layerSaveBaselines.set(key, current);
      return false;
    }
    return baseline !== current;
  }
  function markLayerAsClean(collection) {
    if (!collection || collection.export_codec !== "animorph_layer")
      return;
    const key = getLayerCollectionKey(collection);
    layerSaveBaselines.set(key, computeLayerFingerprint(collection));
  }
  function applySaveButtonState(button, dirty) {
    button.style.opacity = dirty ? "1" : "0.45";
    button.style.pointerEvents = dirty ? "auto" : "none";
    button.setAttribute("aria-disabled", dirty ? "false" : "true");
    const baseTitle = button.title && button.title.toLowerCase().includes("save layer") ? "Save Layer" : button.title || "Save Layer";
    button.title = dirty ? baseTitle : `${baseTitle} (no changes)`;
  }
  function injectSaveButtons() {
    const panelNode = Panels.collections?.node;
    if (!panelNode)
      return;
    const items = panelNode.querySelectorAll("li");
    for (const item of items) {
      const nameEl = item.querySelector("label, .collection_name, span");
      if (!nameEl)
        continue;
      const name = nameEl.textContent?.trim();
      if (!name)
        continue;
      if (!Array.isArray(Collection?.all))
        continue;
      const collection = Collection.all.find(
        (c) => c.export_codec === "animorph_layer" && c.name === name
      );
      if (!collection || !collection.export_path)
        continue;
      const rowButtons = Array.from(item.querySelectorAll(".in_list_button"));
      const nativeSaveBtn = rowButtons.find((btn) => {
        if (btn.classList.contains("animorph-layer-save"))
          return false;
        const title = (btn.getAttribute("title") || "").toLowerCase();
        if (title.includes("save"))
          return true;
        const icon = btn.querySelector("i, .material-icons");
        const iconText = (icon?.textContent || "").trim().toLowerCase();
        return iconText === "save";
      });
      if (nativeSaveBtn) {
        nativeSaveBtn.title = "Save Layer";
        if (!nativeSaveBtn.dataset.animorphLayerSaveBound) {
          nativeSaveBtn.dataset.animorphLayerSaveBound = "1";
          nativeSaveBtn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (typeof e.stopImmediatePropagation === "function") {
              e.stopImmediatePropagation();
            }
            if (!isLayerDirty(collection))
              return;
            saveLayer(collection);
          }, true);
        }
        applySaveButtonState(nativeSaveBtn, isLayerDirty(collection));
        continue;
      }
      const visBtn = item.querySelector(".in_list_button");
      if (!visBtn || !visBtn.parentNode)
        continue;
      let saveBtn = item.querySelector(".animorph-layer-save");
      if (!saveBtn) {
        saveBtn = document.createElement("div");
        saveBtn.className = "in_list_button animorph-layer-save";
        saveBtn.title = "Save Layer";
        saveBtn.innerHTML = '<i class="material-icons icon">save</i>';
        saveBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          if (!isLayerDirty(collection))
            return;
          saveLayer(collection);
        });
        visBtn.parentNode.insertBefore(saveBtn, visBtn);
      }
      applySaveButtonState(saveBtn, isLayerDirty(collection));
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
    if (layerSaveStateInterval)
      clearInterval(layerSaveStateInterval);
    layerSaveStateInterval = setInterval(() => {
      injectSaveButtons();
    }, 700);
    debugLog("[Layers] Save button observer started");
  }
  function teardownSaveButtonObserver() {
    if (layerSaveObserver) {
      layerSaveObserver.disconnect();
      layerSaveObserver = null;
    }
    if (layerSaveStateInterval) {
      clearInterval(layerSaveStateInterval);
      layerSaveStateInterval = null;
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
          layerBoneInfo.set(name, { layerName: collection.name, exportName });
        }
      }
    }
    const boneNames = Object.keys(data.json.bones);
    const layerBones = boneNames.filter((n) => layerBoneInfo.has(n) || n.includes(LAYER_SEPARATOR2));
    if (layerBones.length === 0)
      return;
    const animName = data.animation?.name || "unknown";
    let buffered = false;
    for (const boneName of layerBones) {
      const info = layerBoneInfo.get(boneName);
      const boneData = data.json.bones[boneName];
      if (info) {
        if (!layerAnimBuffer.has(info.layerName))
          layerAnimBuffer.set(info.layerName, /* @__PURE__ */ new Map());
        const layerAnims = layerAnimBuffer.get(info.layerName);
        if (!layerAnims.has(animName)) {
          layerAnims.set(animName, {
            bones: {},
            length: data.json.animation_length || data.animation?.length || 0,
            loop: data.json.loop
          });
        }
        layerAnims.get(animName).bones[info.exportName] = boneData;
        buffered = true;
        delete data.json.bones[boneName];
      }
    }
    if (buffered) {
      if (compileFlushTimer)
        clearTimeout(compileFlushTimer);
      compileFlushTimer = setTimeout(() => flushLayerAnimBuffer(), 0);
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
      const bones2 = {};
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
          if (kf.easing) {
            entry.easing = kf.easing;
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
            if (kf.easing)
              val.easing = kf.easing;
            kfObj[timeStr] = kf.lerp_mode || kf.easing ? val : kf.values;
          }
          boneAnim[channel] = kfObj;
        }
        bones2[exportName] = boneAnim;
        hasBones = true;
      }
      if (hasBones) {
        const animJson = {
          animation_length: anim.length,
          bones: bones2
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
      const bones2 = {};
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
          const hasLerpMode = !!(kf.interpolation && kf.interpolation !== "linear");
          const hasEasing = !!kf.easing;
          if (hasLerpMode || hasEasing) {
            const entry = { vector: values };
            if (hasLerpMode)
              entry.lerp_mode = kf.interpolation;
            if (hasEasing)
              entry.easing = kf.easing;
            boneAnim[channel][timeStr] = entry;
          } else {
            boneAnim[channel][timeStr] = values;
          }
        }
        bones2[animator.name] = boneAnim;
      }
      if (Object.keys(bones2).length === 0)
        continue;
      const animJson = { bones: bones2 };
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
  function escapeHtmlForLayer(str) {
    return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function compileAnimationToBedrock(anim) {
    const readVec = (dp) => {
      if (Array.isArray(dp))
        return [dp[0] ?? 0, dp[1] ?? 0, dp[2] ?? 0];
      return [
        typeof dp.x === "number" ? dp.x : parseFloat(dp.x) || 0,
        typeof dp.y === "number" ? dp.y : parseFloat(dp.y) || 0,
        typeof dp.z === "number" ? dp.z : parseFloat(dp.z) || 0
      ];
    };
    const toBedrockRot = (v) => [-v[0], -v[1], v[2]];
    const toBedrockPos = (v) => [-v[0], v[1], v[2]];
    const formatTime3 = (t) => {
      const s = String(Math.round(t * 1e4) / 1e4);
      return s.includes(".") ? s : s + ".0";
    };
    const meta = {
      loop: anim.loop === "loop" ? true : anim.loop === "hold" ? "hold_on_last_frame" : false
    };
    if (anim.length)
      meta.animation_length = anim.length;
    if (anim.override)
      meta.override_previous_animation = true;
    if (anim.loop_start)
      meta.loop_start = anim.loop_start;
    const bones2 = {};
    for (const uuid in anim.animators ?? {}) {
      const animator = anim.animators[uuid];
      if (!animator || animator.type !== "bone" || !animator.keyframes?.length)
        continue;
      const boneData = {};
      const sortedKeyframes = [...animator.keyframes].sort((a, b) => {
        const ta = typeof a?.time === "number" ? a.time : parseFloat(a?.time) || 0;
        const tb = typeof b?.time === "number" ? b.time : parseFloat(b?.time) || 0;
        return ta - tb;
      });
      for (const kf of sortedKeyframes) {
        if (!kf.channel)
          continue;
        const dp0 = kf.data_points?.[0];
        if (dp0 == null)
          continue;
        if (!boneData[kf.channel])
          boneData[kf.channel] = {};
        const timeKey = formatTime3(kf.time);
        let v0 = readVec(dp0);
        if (kf.channel === "rotation")
          v0 = toBedrockRot(v0);
        else if (kf.channel === "position")
          v0 = toBedrockPos(v0);
        if (kf.interpolation === "catmullrom") {
          const dp1 = kf.data_points?.[1];
          let v1 = dp1 ? readVec(dp1) : null;
          if (v1 && kf.channel === "rotation")
            v1 = toBedrockRot(v1);
          else if (v1 && kf.channel === "position")
            v1 = toBedrockPos(v1);
          const entry = { post: { vector: v0 }, lerp_mode: "catmullrom" };
          if (kf.easing)
            entry.easing = kf.easing;
          if (v1) {
            entry.pre = { vector: v1 };
          }
          boneData[kf.channel][timeKey] = entry;
        } else if (kf.interpolation === "step") {
          const entry = { post: { vector: v0 } };
          if (kf.easing)
            entry.easing = kf.easing;
          boneData[kf.channel][timeKey] = entry;
        } else {
          const entry = { vector: v0 };
          if (kf.easing)
            entry.easing = kf.easing;
          boneData[kf.channel][timeKey] = entry;
        }
      }
      for (const ch of Object.keys(boneData)) {
        if (Object.keys(boneData[ch]).length === 0)
          delete boneData[ch];
      }
      if (Object.keys(boneData).length > 0)
        bones2[animator.name] = boneData;
    }
    return { meta, bones: bones2 };
  }
  function sortAnimationChannelsByTime(bones2) {
    const out = {};
    for (const [boneName, boneData] of Object.entries(bones2 || {})) {
      const sortedBone = {};
      for (const [channel, channelData] of Object.entries(boneData)) {
        if (!channelData || typeof channelData !== "object" || Array.isArray(channelData)) {
          sortedBone[channel] = channelData;
          continue;
        }
        const orderedEntries = Object.entries(channelData).sort(([ta], [tb]) => {
          const na = parseFloat(ta);
          const nb = parseFloat(tb);
          const va = Number.isNaN(na) ? Number.POSITIVE_INFINITY : na;
          const vb = Number.isNaN(nb) ? Number.POSITIVE_INFINITY : nb;
          return va - vb;
        });
        sortedBone[channel] = Object.fromEntries(orderedEntries);
      }
      out[boneName] = sortedBone;
    }
    return out;
  }
  function openExportForLayerDialog(preSelected) {
    const layers = Collection.all.filter((c) => c.export_codec === "animorph_layer");
    if (layers.length === 0) {
      Blockbench.showQuickMessage("No layers found in this project", 2e3);
      return;
    }
    const rows = layers.map((layer) => {
      const checked = !preSelected || preSelected.has(layer.name) ? "checked" : "";
      return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
          <input type="checkbox" class="animlayer-check" data-name="${escapeHtmlForLayer(layer.name)}" ${checked}
                 style="flex-shrink:0;margin:0;cursor:pointer">
          <span style="color:var(--color-text,#eee);font-size:13px">${escapeHtmlForLayer(layer.name)}</span>
        </div>`;
    }).join("");
    const dialog = new Dialog({
      id: "animorph_export_anim_for_layer_dialog",
      title: "Export Animations for Layer",
      lines: [
        `<p style="margin:0 0 8px;color:var(--color-text-subtle,#aaa);font-size:12px">
        Animations that contain bones from the selected layers will be exported, with layer prefixes stripped.
      </p>
      <div style="display:flex;gap:8px;margin-bottom:8px">
        <button class="btn animlayer-select-all">Select All</button>
        <button class="btn animlayer-select-none">Select None</button>
      </div>
      <div style="max-height:200px;overflow-y:auto;padding-right:4px">${rows}</div>`
      ],
      onConfirm() {
        const root = dialog.object instanceof Element ? dialog.object : dialog.object?.[0] ?? document.querySelector(`[data-id="animorph_export_anim_for_layer_dialog"]`) ?? document.body;
        const selectedNames = /* @__PURE__ */ new Set();
        root.querySelectorAll(".animlayer-check").forEach((cb) => {
          if (cb.checked) {
            const n = cb.getAttribute("data-name");
            if (n)
              selectedNames.add(n);
          }
        });
        if (selectedNames.size === 0) {
          Blockbench.showQuickMessage("No layers selected", 2e3);
          return;
        }
        doExportAnimForLayers(selectedNames);
      }
    });
    dialog.show();
    requestAnimationFrame(() => {
      const root = dialog.object instanceof Element ? dialog.object : dialog.object?.[0] ?? document.querySelector(`[data-id="animorph_export_anim_for_layer_dialog"]`) ?? document.body;
      root.querySelector(".animlayer-select-all")?.addEventListener("click", () => {
        root.querySelectorAll(".animlayer-check").forEach((cb) => cb.checked = true);
      });
      root.querySelector(".animlayer-select-none")?.addEventListener("click", () => {
        root.querySelectorAll(".animlayer-check").forEach((cb) => cb.checked = false);
      });
    });
  }
  function doExportAnimForLayers(selectedLayerNames) {
    const nameMap = /* @__PURE__ */ new Map();
    for (const collection of Collection.all) {
      if (collection.export_codec !== "animorph_layer")
        continue;
      if (!selectedLayerNames.has(collection.name))
        continue;
      const prefix = collection.name + LAYER_SEPARATOR2;
      const elementUuids = new Set(collection.layer_elements || []);
      for (const group of Group.all) {
        if (!elementUuids.has(group.uuid))
          continue;
        const name = group.name || "";
        const exportName = name.startsWith(prefix) ? name.substring(prefix.length) : name;
        nameMap.set(name, exportName);
      }
    }
    if (nameMap.size === 0) {
      Blockbench.showQuickMessage("No layer bones found for selected layers", 2e3);
      return;
    }
    if (animCompileFilterHandler) {
      Blockbench.removeListener("compile_bedrock_animation", animCompileFilterHandler);
    }
    const captured = /* @__PURE__ */ new Map();
    const captureHandler = (data) => {
      const name = data.animation?.name;
      if (!name || !data.json)
        return;
      captured.set(name, {
        meta: {
          loop: data.json.loop,
          animation_length: data.json.animation_length,
          override_previous_animation: data.json.override_previous_animation,
          loop_start: data.json.loop_start
        },
        bones: data.json.bones ? JSON.parse(JSON.stringify(data.json.bones)) : {}
      });
    };
    Blockbench.on("compile_bedrock_animation", captureHandler);
    try {
      for (const anim of Animation.all) {
        const { meta, bones: bones2 } = compileAnimationToBedrock(anim);
        const eventData = { animation: anim, json: { ...meta, bones: bones2 } };
        Blockbench.dispatchEvent("compile_bedrock_animation", eventData);
        if (!captured.has(anim.name) && Object.keys(bones2).length > 0) {
          captured.set(anim.name, { meta, bones: bones2 });
        }
      }
    } finally {
      Blockbench.removeListener("compile_bedrock_animation", captureHandler);
      if (animCompileFilterHandler) {
        Blockbench.on("compile_bedrock_animation", animCompileFilterHandler);
      }
    }
    if (captured.size === 0) {
      Blockbench.showQuickMessage("No animations to export", 2e3);
      return;
    }
    const filteredAnims = {};
    for (const [animName, { meta, bones: bones2 }] of captured) {
      const hasLayerBone = Object.keys(bones2).some((b) => nameMap.has(b));
      if (!hasLayerBone)
        continue;
      const renamedBones = {};
      for (const [boneName, boneData] of Object.entries(bones2)) {
        const exportName = nameMap.has(boneName) ? nameMap.get(boneName) : boneName;
        renamedBones[exportName] = boneData;
      }
      const normalizedBones = sortAnimationChannelsByTime(renamedBones);
      const animJson = {};
      if (meta.loop !== void 0)
        animJson.loop = meta.loop;
      if (meta.animation_length !== void 0)
        animJson.animation_length = meta.animation_length;
      if (meta.override_previous_animation)
        animJson.override_previous_animation = true;
      if (meta.loop_start !== void 0)
        animJson.loop_start = meta.loop_start;
      animJson.bones = normalizedBones;
      filteredAnims[animName] = animJson;
    }
    if (Object.keys(filteredAnims).length === 0) {
      Blockbench.showQuickMessage("No animations contain bones from the selected layers", 2e3);
      return;
    }
    const exportContent = JSON.stringify({ format_version: "1.8.0", animations: filteredAnims }, null, "	");
    const defaultName = selectedLayerNames.size === 1 ? `${[...selectedLayerNames][0]}.animation.json` : "layers.animation.json";
    Blockbench.export(
      {
        type: "JSON Animation",
        extensions: ["json"],
        name: defaultName,
        content: exportContent,
        savetype: "text"
      },
      (path) => {
        const fileName = PathModule.basename(path?.path ?? path ?? defaultName);
        Blockbench.showQuickMessage(`Exported: ${fileName}`, 2e3);
        debugLog(`[Layers] Exported layer animations to: ${path?.path ?? path}`);
      }
    );
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
      description: "Export all animations that contain bones from this layer into a single .animation.json file",
      condition: () => Collection.selected.length > 0 && Collection.selected.some((c) => c.export_codec === "animorph_layer"),
      click: () => {
        const preSelected = new Set(
          Collection.selected.filter((c) => c.export_codec === "animorph_layer").map((c) => c.name)
        );
        openExportForLayerDialog(preSelected);
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
          layerSaveBaselines.delete(getLayerCollectionKey(collection));
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
    layerSaveBaselines.clear();
    debugLog("\u2713 Layer actions unregistered");
  }

  // src/menu/index.ts
  var animorphBarMenu = null;
  var tabsMenuAction = null;
  var registeredActions = [];
  var CHECKED_ICON = "fas.fa-check-square";
  var UNCHECKED_ICON = "far.fa-square";
  function checkboxIcon(settingId) {
    return settings[settingId]?.value !== false ? CHECKED_ICON : UNCHECKED_ICON;
  }
  function getTabsMenuAction() {
    if (tabsMenuAction)
      return tabsMenuAction;
    const BBAction = window.Action;
    if (typeof BBAction === "undefined")
      return null;
    tabsMenuAction = new BBAction("animorph_tabs_menu", {
      name: "Tabs",
      icon: "tab",
      description: "Show or hide the Skin Editor, Ragdoll and Hitbox mode tabs",
      children: () => [
        {
          name: "Skin Editor",
          icon: checkboxIcon(SETTING_SKIN_EDITOR_ENABLED),
          click: () => settings[SETTING_SKIN_EDITOR_ENABLED]?.trigger()
        },
        {
          name: "Ragdoll",
          icon: checkboxIcon(SETTING_RAGDOLL_ENABLED),
          click: () => settings[SETTING_RAGDOLL_ENABLED]?.trigger()
        },
        {
          name: "Hitbox",
          icon: checkboxIcon(SETTING_HITBOX_ENABLED),
          click: () => settings[SETTING_HITBOX_ENABLED]?.trigger()
        }
      ]
    });
    return tabsMenuAction;
  }
  function getTabsMenuSeparator() {
    return new MenuSeparator("animorph_tabs_separator");
  }
  function createAnimorphMenu() {
    if (animorphBarMenu)
      return;
    animorphBarMenu = new BarMenu("animorph", [...registeredActions], { name: "Animorph" });
    if (animorphBarMenu.label) {
      animorphBarMenu.label.textContent = "Animorph";
    }
    if (MenuBar.update)
      MenuBar.update();
    debugLog("[AnimorphMenu] Menu created with", registeredActions.length, "actions");
  }
  function addToAnimorphMenu(action) {
    if (!action) {
      console.warn("[AnimorphMenu] addToAnimorphMenu: received null/undefined action");
      return;
    }
    registeredActions.push(action);
    debugLog("[AnimorphMenu] Action registered:", action.id ?? action.name ?? action);
  }
  function destroyAnimorphMenu() {
    if (!animorphBarMenu)
      return;
    if (MenuBar.menus) {
      delete MenuBar.menus["animorph"];
    }
    if (MenuBar.update)
      MenuBar.update();
    animorphBarMenu = null;
    registeredActions.length = 0;
    tabsMenuAction?.delete?.();
    tabsMenuAction = null;
    debugLog("[AnimorphMenu] Menu removed");
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
      if (!Array.isArray(Collection?.all))
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
      <span @click="onAddLayerEmote(target)" style="cursor:pointer; color:var(--color-accent); font-size:11px; user-select:none;">+ Add</span>
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
      <span @click="onRemoveLayerEmote(target, idx)" style="cursor:pointer; color:var(--color-close); font-size:15px; opacity:0.7; user-select:none; padding:0 3px; line-height:1;">\xD7</span>
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

        </div>
      `
      },
      buttons: ["Export .yml", "Import .yml", "Save", "Cancel"],
      onButton(index) {
        if (index === 3)
          return;
        const vue = dialog.content_vue || dialog.component;
        const cfg = vue.buildConfig();
        saveEmoteConfig(filePath, cfg);
        if (index === 0) {
          exportYaml(cfg, filePath);
        } else if (index === 1) {
          importYaml(filePath);
          setTimeout(() => openFileEmoteConfigDialog(filePath), 500);
        } else {
          Blockbench.showQuickMessage("Emote properties saved", 1500);
        }
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
          ...LAYER_EMOTE_METHODS
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

        </div>
      `
      },
      buttons: ["Save", "Cancel"],
      onButton(index) {
        if (index === 1)
          return;
        const vue = dialog.content_vue || dialog.component;
        config.animations[animName] = {
          useGlobal: vue.useGlobal,
          properties: {
            freeze: vue.freeze,
            stopOnDeath: vue.stopOnDeath,
            stopOnHurt: vue.stopOnHurt,
            controllerExceptions: parseExceptionList(vue.controllerExceptions),
            layerEmotes: entriesToLayerEmotes(vue.layerEmotes)
          }
        };
        saveEmoteConfig(filePath, config);
        Blockbench.showQuickMessage("Animation emote properties saved", 1500);
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
  var emoteConfigMenuAction = null;
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
    emoteConfigMenuAction = new Action("animorph_emote_config_menu", {
      name: "Emote Config (.yml)",
      icon: "queue_music",
      description: "Configure and export emote .yml config file",
      click() {
        const firstFile = Animation.all?.find((a) => a.path)?.path;
        openFileEmoteConfigDialog(firstFile || "untitled.animation.json");
      }
    });
    debugLog("\u2713 Emote config registered");
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
    if (emoteConfigMenuAction) {
      emoteConfigMenuAction.delete();
      emoteConfigMenuAction = null;
    }
    fileMenuAction = null;
    fileImportAction = null;
    animMenuAction = null;
    debugLog("\u2713 Emote config unregistered");
  }
  function getEmoteConfigMenuAction() {
    return emoteConfigMenuAction;
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
      ...blockbenchAnim.length > 0 && { animation_length: blockbenchAnim.length },
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
          const timeStr = formatTime2(kf.time);
          bedrockChannel[timeStr] = buildKeyframeValue(kf);
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
  function parseValueOrMolang(v) {
    if (typeof v === "number")
      return v;
    if (/[a-zA-Z]/.test(v))
      return v;
    const n = parseFloat(v);
    return isNaN(n) ? v : n;
  }
  function parseDataPoint(dp) {
    return [parseValueOrMolang(dp.x), parseValueOrMolang(dp.y), parseValueOrMolang(dp.z)];
  }
  function buildKeyframeValue(kf) {
    if (kf.interpolation === "catmullrom") {
      const pre = parseDataPoint(kf.data_points[0]);
      const post = kf.data_points.length > 1 ? parseDataPoint(kf.data_points[1]) : pre;
      return { lerp_mode: "catmullrom", pre, post };
    }
    return parseDataPoint(kf.data_points[0]);
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
      let codecSource = "none";
      const formatId = Format?.id;
      console.log(`[Sync:geo] format="${formatId}" | Format.codec.id="${Format?.codec?.id ?? "none"}" | Codecs keys:`, Object.keys(Codecs ?? {}));
      if (formatId === "bedrock" || formatId === "bedrock_block") {
        codec = Format?.codec;
        codecSource = "Format.codec (bedrock)";
      } else if (formatId === "geckolib_model" || formatId === "bedrock_old") {
        if (Codecs?.[formatId]?.compile) {
          codec = Codecs[formatId];
          codecSource = `Codecs["${formatId}"]`;
        } else if (Codecs?.["bedrock"]?.compile) {
          codec = Codecs["bedrock"];
          codecSource = 'Codecs["bedrock"] (fallback \u2014 geckolib codec not found)';
        }
      } else if (Format?.codec?.compile) {
        codec = Format.codec;
        codecSource = `Format.codec (${formatId})`;
      }
      console.log(`[Sync:geo] chosen codec: ${codecSource}`);
      if (!codec?.compile) {
        console.warn("[Sync:geo] No codec found \u2014 falling back to manual compilation");
        return compileGeometryManual();
      }
      let compiled = codec.compile({});
      console.log(`[Sync:geo] compile() output type: ${typeof compiled} | top-level keys:`, typeof compiled === "object" ? Object.keys(compiled ?? {}) : compiled?.slice?.(0, 120));
      if (typeof compiled === "string") {
        try {
          compiled = JSON.parse(compiled);
        } catch (e) {
          console.warn("[Sync:geo] Could not parse codec output \u2014 falling back to manual compilation");
          return compileGeometryManual();
        }
      }
      if (compiled?.meta?.model_format || !compiled?.["minecraft:geometry"]) {
        console.warn(`[Sync:geo] Codec output is not geometry JSON (meta.model_format="${compiled?.meta?.model_format}") \u2014 falling back to manual compilation`);
        return compileGeometryManual();
      }
      if (formatId === "geckolib_model") {
        const desc = compiled["minecraft:geometry"]?.[0]?.description;
        if (desc) {
          const modelId = Project.model_identifier || Project.name;
          console.log(`[Sync:geo] patching identifier: "${desc.identifier}" \u2192 "geometry.${modelId}"`);
          desc.identifier = `geometry.${modelId}`;
        }
      }
      debugLog(`[Sync:geo] geometry serialized via ${codecSource}`);
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
    const bones2 = [];
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
      bones2.push(bone);
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
        bones2.push({
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
          bones: bones2
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
    if (!Animation?.all || Animation.all.length === 0) {
      return { format_version: "1.8.0", animations: {} };
    }
    try {
      const codec = AnimationCodec?.getCodec?.() ?? AnimationCodec?.codecs?.bedrock;
      if (codec?.compileFile) {
        const result = codec.compileFile(Animation.all);
        if (result?.animations && Object.keys(result.animations).length > 0) {
          debugLog(`[Sync:anim] Native codec serialized ${Animation.all.length} animations`);
          return result;
        }
        debugLog(`[Sync:anim] Native codec returned empty animations, falling back`);
      } else {
        debugLog(`[Sync:anim] AnimationCodec.compileFile not available, falling back`);
      }
    } catch (e) {
      debugLog(`[Sync:anim] Native codec error: ${e}`);
    }
    debugLog(`[Sync:anim] Using manual transformer fallback`);
    return serializeAnimationsManual();
  }
  function serializeAnimationsManual() {
    const blockbenchAnimations = Animation.all.map((anim) => {
      const cleanedAnimators = {};
      if (anim.animators) {
        for (const uuid in anim.animators) {
          const animator = anim.animators[uuid];
          if (!animator.keyframes || animator.keyframes.length === 0)
            continue;
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
                    return { x: dp.x ?? 0, y: dp.y ?? 0, z: dp.z ?? 0 };
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
    debugLog(`[Sync:anim] Manual transformer serialized ${blockbenchAnimations.length} animations`);
    return bedrockFormat;
  }

  // src/sync/project-config.ts
  var DEFAULT_HITBOX_PATH = "hitboxes";
  function resolvePathForType(config, type) {
    const overrideMap = {
      model: config.model_path,
      animation: config.animation_path,
      texture: config.texture_path,
      hitbox: config.hitbox_path
    };
    const override = overrideMap[type];
    if (override && override.trim())
      return override.trim();
    return type === "hitbox" ? DEFAULT_HITBOX_PATH : config.asset_path;
  }
  function getProjectConfig() {
    if (!Project) {
      return {
        asset_path: "entity/model"
      };
    }
    try {
      const projectKey2 = `animorph_project_sync_${Project.uuid}`;
      const saved = localStorage.getItem(projectKey2);
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
      const projectKey2 = `animorph_project_sync_${Project.uuid}`;
      localStorage.setItem(projectKey2, JSON.stringify(config));
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
      texture_path: config.texture_path,
      hitbox_path: config.hitbox_path
    };
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
        is_layer: false,
        first_person: { ...DEFAULT_FIRST_PERSON, model: { ...DEFAULT_FIRST_PERSON.model, offset: { x: 0, y: 0, z: 0 } }, custom_arms: { ...DEFAULT_FIRST_PERSON.custom_arms } },
        animation_controllers: [{ id: "idle", transition_time: 0, animation_transitions: {} }],
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

  // src/ragdoll-config/yaml-export.ts
  function generateRagdollYaml(config) {
    if (!config)
      return "";
    const names = Object.keys(config.bones);
    if (names.length === 0)
      return "";
    let yml = "ragdoll:\n  bones:\n";
    for (const name of names) {
      yml += `    ${name}:
      weight: ${config.bones[name].weight.toFixed(2)}
`;
    }
    return yml;
  }

  // src/model-config/yaml-export.ts
  function exportControllerEntry(entry, indent) {
    const transitions = Object.entries(entry.animation_transitions);
    let yml = `${indent}${entry.id}:
`;
    yml += `${indent}  transition_time: ${entry.transition_time}
`;
    if (entry.file)
      yml += `${indent}  file: ${entry.file}
`;
    if (transitions.length > 0) {
      yml += `${indent}  animation_transitions:
`;
      for (const [anim, time] of transitions) {
        yml += `${indent}    ${anim}: ${time}
`;
      }
    }
    return yml;
  }
  function generateModelYaml(config) {
    let yml = "";
    yml += `display_name: ${config.display_name}
`;
    if (config.model_path) {
      yml += `model:
`;
      yml += `  default: ${config.model_path}
`;
    }
    yml += `animation: ${config.animation}
`;
    if (config.texture) {
      yml += `texture: ${config.texture}
`;
    }
    let propsYml = "";
    if (config.properties.is_layer)
      propsYml += `  is_layer: true
`;
    const fp = config.properties.first_person;
    const hasOffset = fp.model.offset.x !== 0 || fp.model.offset.y !== 0 || fp.model.offset.z !== 0;
    const hasModelBlock = fp.model.show || hasOffset;
    const hasCustomArms = fp.custom_arms.show || fp.custom_arms.custom_render_items || fp.custom_arms.both_hands;
    const hasFp = fp.show_equipment || hasModelBlock || hasCustomArms;
    if (hasFp) {
      propsYml += `  first_person:
`;
      if (fp.show_equipment)
        propsYml += `    show_equipment: true
`;
      if (hasModelBlock) {
        propsYml += `    model:
`;
        if (fp.model.show)
          propsYml += `      show: true
`;
        if (hasOffset) {
          propsYml += `      offset:
`;
          propsYml += `        x: ${fp.model.offset.x}
`;
          propsYml += `        y: ${fp.model.offset.y}
`;
          propsYml += `        z: ${fp.model.offset.z}
`;
        }
      }
      if (hasCustomArms) {
        propsYml += `    custom_arms:
`;
        if (fp.custom_arms.show)
          propsYml += `      show: true
`;
        if (fp.custom_arms.custom_render_items)
          propsYml += `      custom_render_items: true
`;
        if (fp.custom_arms.both_hands)
          propsYml += `      both_hands: true
`;
      }
    }
    if (config.properties.animation_controllers.length > 0) {
      propsYml += `  animation_controllers:
`;
      for (const ac of config.properties.animation_controllers) {
        propsYml += exportControllerEntry(ac, "    ");
      }
    }
    if (config.properties.fp_animation_controllers.length > 0) {
      propsYml += `  fp_animation_controllers:
`;
      for (const ac of config.properties.fp_animation_controllers) {
        propsYml += exportControllerEntry(ac, "    ");
      }
    }
    const textKeys = Object.keys(config.properties.texts);
    if (textKeys.length > 0) {
      propsYml += `  texts:
`;
      for (const key of textKeys) {
        propsYml += `    '${key}': '${config.properties.texts[key]}'
`;
      }
    }
    yml += propsYml ? `properties:
${propsYml}` : `properties: {}
`;
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
        if (layer.default_enabled) {
          yml += `    default_enabled: true
`;
        }
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
    const hitboxEntries = config.hitboxes ? Object.entries(config.hitboxes) : [];
    if (hitboxEntries.length > 0) {
      yml += `hitboxes:
`;
      for (const [pose, path] of hitboxEntries) {
        yml += `  ${pose}: ${path}
`;
      }
    }
    const ragdollYml = generateRagdollYaml(config.ragdoll);
    if (ragdollYml)
      yml += ragdollYml;
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

  // src/hitbox-generator/generator.ts
  var ALL_POSES = [
    "standing",
    "crouching",
    "swimming",
    "fall_flying",
    "spin_attack",
    "sleeping",
    "dying"
  ];
  function buildHitboxYamlPaths(hitboxAssetPath) {
    const paths = {};
    for (const pose of ALL_POSES) {
      paths[pose] = `${hitboxAssetPath}/${pose}.geo.json`;
    }
    return paths;
  }
  function r2(n) {
    return Math.round(n * 100) / 100;
  }
  function computeDefaultPoses(standingW, standingH, eyeRatio) {
    const standingEye = r2(standingH * eyeRatio);
    const crouchH = r2(standingH * (24 / 28.8));
    const crouchEye = r2(crouchH * (20.32 / 24));
    const swimH = r2(standingW);
    const swimEye = r2(swimH * (6.4 / 9.6));
    const smallW = r2(standingW / 3);
    return {
      standing: { width: standingW, height: standingH, eyeHeight: standingEye },
      crouching: { width: standingW, height: crouchH, eyeHeight: crouchEye },
      swimming: { width: standingW, height: swimH, eyeHeight: swimEye },
      fall_flying: { width: standingW, height: swimH, eyeHeight: swimEye },
      spin_attack: { width: standingW, height: swimH, eyeHeight: swimEye },
      // sleeping: eye follows the hitbox (top of the compact box)
      // dying: eye stays at the full standing eye height
      sleeping: { width: smallW, height: smallW, eyeHeight: smallW },
      dying: { width: smallW, height: smallW, eyeHeight: standingEye }
    };
  }
  function generateHitboxGeo(pose) {
    const W = r2(pose.width);
    const H = r2(pose.height);
    const eyeH = r2(pose.eyeHeight);
    const halfW = r2(W / 2);
    const geo = {
      format_version: "1.12.0",
      "minecraft:geometry": [
        {
          description: {
            identifier: "geometry.unknown",
            texture_width: 64,
            texture_height: 64,
            visible_bounds_width: 4,
            visible_bounds_height: 3.5,
            visible_bounds_offset: [0, 1.25, 0]
          },
          bones: [
            {
              name: "hitbox",
              pivot: [0, 0, 0],
              cubes: [
                { origin: [-halfW, 0, -halfW], size: [W, H, W], uv: [-14, -7] }
              ]
            },
            {
              name: "eye_height",
              pivot: [0.7, r2(eyeH + 1), -0.7],
              cubes: [
                // cube origin Y is what ModelHitboxAdapter reads as eye height (pixels / 16 = blocks)
                { origin: [-halfW, eyeH, -halfW], size: [W, 0.5, W], uv: [-14, -7] }
              ]
            }
          ]
        }
      ]
    };
    return JSON.stringify(geo, null, "	");
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
     * Envía el model config (.yml) del proyecto actual
     * Destino: models/{asset_path}.yml
     */
    syncModelConfig() {
      const connection = getSyncConnection();
      if (!connection.isConnected())
        return;
      const projectConfig = getSafeProjectConfig();
      const modelAssetPath = resolvePathForType(projectConfig, "model");
      const animAssetPath = resolvePathForType(projectConfig, "animation");
      const hitboxAssetPath = resolvePathForType(projectConfig, "hitbox");
      const hitboxes = buildHitboxYamlPaths(hitboxAssetPath);
      const config = loadModelConfig();
      const syncConfig = {
        ...config,
        model_path: `${modelAssetPath}.geo.json`,
        animation: `${animAssetPath}.animation.json`,
        hitboxes
      };
      const yaml = generateModelYaml(syncConfig);
      const message = {
        type: "model_config",
        timestamp: Date.now(),
        asset_path: modelAssetPath,
        data: { content: yaml }
      };
      connection.send(message);
      this.lastSyncTime = Date.now();
      debugLog(`[SyncManager] Model config sent \u2192 ${modelAssetPath}.yml`);
    }
    /**
     * Envía el emote config (.yml) para el archivo de animación del proyecto actual
     * Destino: animations/{asset_path}.yml
     */
    syncEmoteConfig() {
      const connection = getSyncConnection();
      if (!connection.isConnected())
        return;
      const projectConfig = getSafeProjectConfig();
      const assetPath = resolvePathForType(projectConfig, "animation");
      const animFilePath = assetPath + ".animation.json";
      const config = loadEmoteConfig(animFilePath);
      const yaml = generateYaml(config);
      const message = {
        type: "emote_config",
        timestamp: Date.now(),
        asset_path: assetPath,
        data: { content: yaml }
      };
      connection.send(message);
      this.lastSyncTime = Date.now();
      debugLog(`[SyncManager] Emote config sent \u2192 ${assetPath}.yml`);
    }
    /**
     * Envía las 7 poses de hitbox como archivos .geo.json
     * Destino: models/{asset_path o hitbox_path override}/<pose>.geo.json
     */
    syncHitboxes(poses) {
      const connection = getSyncConnection();
      if (!connection.isConnected())
        return;
      const projectConfig = getSafeProjectConfig();
      const hitboxAssetPath = resolvePathForType(projectConfig, "hitbox");
      for (const [pose, config] of Object.entries(poses)) {
        const message = {
          type: "hitbox",
          timestamp: Date.now(),
          asset_path: `${hitboxAssetPath}/${pose}`,
          data: { content: generateHitboxGeo(config) }
        };
        connection.send(message);
      }
      this.lastSyncTime = Date.now();
      debugLog(`[SyncManager] Hitboxes sent \u2192 models/${hitboxAssetPath}/`);
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
        },
        hitbox_path: {
          label: "Hitbox Path (override, folder)",
          type: "text",
          value: projectConfig.hitbox_path || "",
          placeholder: "Leave empty to use shared 'hitboxes' folder"
        }
      },
      component: {
        data: {
          state: connection.getState(),
          projectAssetPath: projectConfig.asset_path,
          projectModelPath: projectConfig.model_path || "",
          projectAnimationPath: projectConfig.animation_path || "",
          projectTexturePath: projectConfig.texture_path || "",
          projectHitboxPath: projectConfig.hitbox_path || ""
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
          },
          resolvedHitboxPath() {
            const formData = dialog.getFormResult();
            const hp = formData.hitbox_path?.trim();
            return hp || "hitboxes";
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
          onSendModelConfig() {
            if (!connection.isConnected()) {
              Blockbench.showQuickMessage("Not connected to sync server", 1500);
              return;
            }
            this._saveConfig();
            manager.syncModelConfig();
            Blockbench.showQuickMessage("Model config sent", 2e3);
          },
          onSendEmoteConfig() {
            if (!connection.isConnected()) {
              Blockbench.showQuickMessage("Not connected to sync server", 1500);
              return;
            }
            this._saveConfig();
            manager.syncEmoteConfig();
            Blockbench.showQuickMessage("Emote config sent", 2e3);
          },
          _saveConfig() {
            const formData = dialog.getFormResult();
            const newProjectConfig = {
              asset_path: formData.asset_path || "entity/model",
              model_path: formData.model_path?.trim() || void 0,
              animation_path: formData.animation_path?.trim() || void 0,
              texture_path: formData.texture_path?.trim() || void 0,
              hitbox_path: formData.hitbox_path?.trim() || void 0
            };
            setProjectConfig(newProjectConfig);
            this.projectAssetPath = newProjectConfig.asset_path;
            this.projectModelPath = newProjectConfig.model_path || "";
            this.projectAnimationPath = newProjectConfig.animation_path || "";
            this.projectTexturePath = newProjectConfig.texture_path || "";
            this.projectHitboxPath = newProjectConfig.hitbox_path || "";
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
              Texture: <span style="font-weight:500;">{{ resolvedTexturePath }}</span><br/>
              Hitbox: <span style="font-weight:500;">{{ resolvedHitboxPath }}</span>
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
              <button class="material-button" @click="onSendModelConfig" :disabled="state !== 'connected'" style="width:100%;">
                Send Model Config
              </button>
              <button class="material-button" @click="onSendEmoteConfig" :disabled="state !== 'connected'" style="width:100%;">
                Send Emote Config
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
          texture_path: formData.texture_path?.trim() || void 0,
          hitbox_path: formData.hitbox_path?.trim() || void 0
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
      dialog.component.projectHitboxPath = currentProjectConfig.hitbox_path || "";
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
    debugLog("\u2713 Sync actions registered");
  }
  function unregisterSyncActions() {
    if (syncDialogAction) {
      syncDialogAction.delete();
      syncDialogAction = null;
    }
    debugLog("\u2713 Sync actions unregistered");
  }
  function getSyncDialogAction() {
    return syncDialogAction;
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
      default_enabled: l.default_enabled ?? false,
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
        default_enabled: e.default_enabled,
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
          default_enabled: false,
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
          default_enabled: false,
          hide_bones: "",
          texture_layers: ""
        });
      }
    }
    return entries;
  }
  function animTransitionsToEntries(map) {
    return Object.entries(map).map(([anim, time]) => ({ anim, time }));
  }
  function entriesToAnimTransitions(entries) {
    const result = {};
    for (const e of entries) {
      const key = e.anim.trim();
      if (key)
        result[key] = e.time || 0;
    }
    return result;
  }
  function controllerEntryToConfig(e) {
    return {
      id: e.id.trim(),
      file: e.file.trim() || void 0,
      transition_time: e.transition_time || 0,
      animation_transitions: entriesToAnimTransitions(e.anim_transitions)
    };
  }
  function configToControllerEntry(c) {
    if (typeof c === "string") {
      return { id: c, file: "", transition_time: 0, anim_transitions: [] };
    }
    return {
      id: c.id || "",
      file: c.file || "",
      transition_time: c.transition_time || 0,
      anim_transitions: animTransitionsToEntries(c.animation_transitions || {})
    };
  }
  function emptyController() {
    return { id: "", file: "", transition_time: 0, anim_transitions: [] };
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
          default_enabled: false,
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
          texture: config.texture || "",
          is_layer: config.properties.is_layer ?? false,
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
          animation_controllers: (config.properties.animation_controllers || []).map(configToControllerEntry),
          fp_animation_controllers: (config.properties.fp_animation_controllers || []).map(configToControllerEntry),
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
              default_enabled: false,
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
          onAddController() {
            this.animation_controllers.push(emptyController());
          },
          onRemoveController(idx) {
            this.animation_controllers.splice(idx, 1);
          },
          onAddAnimTransition(ac) {
            ac.anim_transitions.push({ anim: "", time: 0 });
          },
          onRemoveAnimTransition(ac, idx) {
            ac.anim_transitions.splice(idx, 1);
          },
          onAddFpController() {
            this.fp_animation_controllers.push(emptyController());
          },
          onRemoveFpController(idx) {
            this.fp_animation_controllers.splice(idx, 1);
          },
          onAddFpAnimTransition(ac) {
            ac.anim_transitions.push({ anim: "", time: 0 });
          },
          onRemoveFpAnimTransition(ac, idx) {
            ac.anim_transitions.splice(idx, 1);
          },
          buildConfig() {
            return {
              display_name: this.display_name,
              animation: this.animation,
              texture: this.texture.trim() || void 0,
              properties: {
                is_layer: this.is_layer,
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
                animation_controllers: this.animation_controllers.map(controllerEntryToConfig).filter((c) => !!c.id),
                fp_animation_controllers: this.fp_animation_controllers.map(controllerEntryToConfig).filter((c) => !!c.id),
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
          }
        },
        template: `
        <div style="padding: 4px 0 8px; max-height: 550px; overflow-y: auto;">

          <!-- Basic Info -->
          <div style="border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 12px; margin-bottom: 10px;">
            <div style="font-weight: 600; margin-bottom: 8px; font-size: 13px; color: var(--color-accent);">General</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
              <div>
                <label style="font-size: 11px; opacity: 0.7; display: block; margin-bottom: 3px;">Display Name</label>
                <input type="text" class="dark_bordered" v-model="display_name" style="width: 100%; box-sizing: border-box;">
              </div>
              <div>
                <label style="font-size: 11px; opacity: 0.7; display: block; margin-bottom: 3px;">Animation File</label>
                <input type="text" class="dark_bordered" v-model="animation" placeholder="model.animation.json" style="width: 100%; box-sizing: border-box;">
              </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr auto; gap: 8px; align-items: end;">
              <div>
                <label style="font-size: 11px; opacity: 0.7; display: block; margin-bottom: 3px;">Texture File</label>
                <input type="text" class="dark_bordered" v-model="texture" placeholder="texture.png" style="width: 100%; box-sizing: border-box;">
              </div>
              <label style="display: flex; align-items: center; gap: 5px; font-size: 11px; white-space: nowrap; padding-bottom: 4px;">
                <input type="checkbox" v-model="is_layer"> Is Layer
              </label>
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

            <!-- Regular controllers -->
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
              <span style="font-size: 11px; opacity: 0.7;">Third Person</span>
              <span @click="onAddController" style="cursor:pointer; color:var(--color-accent); font-size:11px; user-select:none;">+ Add</span>
            </div>
            <div v-if="animation_controllers.length === 0" style="font-size: 11px; opacity: 0.4; text-align: center; padding: 4px 0; margin-bottom: 8px;">No controllers</div>
            <div v-for="(ac, idx) in animation_controllers" :key="'ac'+idx"
              style="border: 1px solid rgba(255,255,255,0.07); border-radius: 5px; padding: 8px; margin-bottom: 6px;">
              <div style="display: flex; gap: 4px; align-items: center; margin-bottom: 5px;">
                <input type="text" class="dark_bordered" v-model="ac.id" placeholder="controller_id" style="flex: 1; font-size: 11px; padding: 3px 6px; box-sizing: border-box;">
                <input type="number" class="dark_bordered" v-model.number="ac.transition_time" placeholder="0" min="0" style="width: 54px; font-size: 11px; padding: 3px 5px; box-sizing: border-box;">
                <span style="font-size: 10px; opacity: 0.5; white-space: nowrap;">ms</span>
                <span @click="onRemoveController(idx)" style="cursor:pointer; color:var(--color-close); font-size:15px; opacity:0.7; user-select:none; padding:0 3px; line-height:1;">\xD7</span>
              </div>
              <div style="margin-bottom: 5px;">
                <input type="text" class="dark_bordered" v-model="ac.file" placeholder="file (optional)" style="width: 100%; box-sizing: border-box; font-size: 10px; padding: 2px 5px;">
              </div>
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
                <span style="font-size: 10px; opacity: 0.5;">Animation transitions</span>
                <span @click="onAddAnimTransition(ac)" style="cursor:pointer; color:var(--color-accent); font-size:10px; user-select:none;">+ Add</span>
              </div>
              <div v-for="(tr, ti) in ac.anim_transitions" :key="'tr'+ti"
                style="display: flex; gap: 4px; align-items: center; margin-bottom: 3px;">
                <input type="text" class="dark_bordered" v-model="tr.anim" placeholder="animation_name" style="flex: 1; font-size: 10px; padding: 2px 5px; box-sizing: border-box;">
                <input type="number" class="dark_bordered" v-model.number="tr.time" placeholder="0" min="0" style="width: 54px; font-size: 10px; padding: 2px 5px; box-sizing: border-box;">
                <span style="font-size: 10px; opacity: 0.5; white-space: nowrap;">ms</span>
                <span @click="onRemoveAnimTransition(ac, ti)" style="cursor:pointer; color:var(--color-close); font-size:14px; opacity:0.7; user-select:none; padding:0 2px; line-height:1;">\xD7</span>
              </div>
            </div>

            <!-- FP controllers -->
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; margin-top: 8px;">
              <span style="font-size: 11px; opacity: 0.7;">First Person</span>
              <span @click="onAddFpController" style="cursor:pointer; color:var(--color-accent); font-size:11px; user-select:none;">+ Add</span>
            </div>
            <div v-if="fp_animation_controllers.length === 0" style="font-size: 11px; opacity: 0.4; text-align: center; padding: 4px 0;">No FP controllers</div>
            <div v-for="(ac, idx) in fp_animation_controllers" :key="'fac'+idx"
              style="border: 1px solid rgba(255,255,255,0.07); border-radius: 5px; padding: 8px; margin-bottom: 6px;">
              <div style="display: flex; gap: 4px; align-items: center; margin-bottom: 5px;">
                <input type="text" class="dark_bordered" v-model="ac.id" placeholder="controller_id" style="flex: 1; font-size: 11px; padding: 3px 6px; box-sizing: border-box;">
                <input type="number" class="dark_bordered" v-model.number="ac.transition_time" placeholder="0" min="0" style="width: 54px; font-size: 11px; padding: 3px 5px; box-sizing: border-box;">
                <span style="font-size: 10px; opacity: 0.5; white-space: nowrap;">ms</span>
                <span @click="onRemoveFpController(idx)" style="cursor:pointer; color:var(--color-close); font-size:15px; opacity:0.7; user-select:none; padding:0 3px; line-height:1;">\xD7</span>
              </div>
              <div style="margin-bottom: 5px;">
                <input type="text" class="dark_bordered" v-model="ac.file" placeholder="file (optional)" style="width: 100%; box-sizing: border-box; font-size: 10px; padding: 2px 5px;">
              </div>
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
                <span style="font-size: 10px; opacity: 0.5;">Animation transitions</span>
                <span @click="onAddFpAnimTransition(ac)" style="cursor:pointer; color:var(--color-accent); font-size:10px; user-select:none;">+ Add</span>
              </div>
              <div v-for="(tr, ti) in ac.anim_transitions" :key="'ftr'+ti"
                style="display: flex; gap: 4px; align-items: center; margin-bottom: 3px;">
                <input type="text" class="dark_bordered" v-model="tr.anim" placeholder="animation_name" style="flex: 1; font-size: 10px; padding: 2px 5px; box-sizing: border-box;">
                <input type="number" class="dark_bordered" v-model.number="tr.time" placeholder="0" min="0" style="width: 54px; font-size: 10px; padding: 2px 5px; box-sizing: border-box;">
                <span style="font-size: 10px; opacity: 0.5; white-space: nowrap;">ms</span>
                <span @click="onRemoveFpAnimTransition(ac, ti)" style="cursor:pointer; color:var(--color-close); font-size:14px; opacity:0.7; user-select:none; padding:0 2px; line-height:1;">\xD7</span>
              </div>
            </div>
          </div>

          <!-- Texts -->
          <div style="border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 12px; margin-bottom: 10px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
              <span style="font-weight: 600; font-size: 13px; color: var(--color-accent);">Texts</span>
              <span @click="onAddText" style="cursor:pointer; color:var(--color-accent); font-size:11px; user-select:none;">+ Add</span>
            </div>
            <div v-if="texts.length === 0" style="font-size: 11px; opacity: 0.4; text-align: center; padding: 4px 0;">No texts configured</div>
            <div v-for="(entry, idx) in texts" :key="idx" style="display: flex; gap: 4px; align-items: center; margin-bottom: 4px;">
              <input type="text" class="dark_bordered" v-model="entry.key" placeholder="{placeholder}" style="flex: 1; font-size: 11px; padding: 3px 6px; box-sizing: border-box;">
              <span style="opacity: 0.4; font-size: 11px;">:</span>
              <input type="text" class="dark_bordered" v-model="entry.value" placeholder="value or %placeholder%" style="flex: 1.5; font-size: 11px; padding: 3px 6px; box-sizing: border-box;">
              <span @click="onRemoveText(idx)" style="cursor:pointer; color:var(--color-close); font-size:15px; opacity:0.7; user-select:none; padding:0 3px; line-height:1;">\xD7</span>
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
              <div style="display: flex; gap: 10px;">
                <span @click="onDetectLayers" style="cursor:pointer; color:var(--color-accent); font-size:11px; user-select:none; opacity:0.75;">Detect</span>
                <span @click="onAddLayer" style="cursor:pointer; color:var(--color-accent); font-size:11px; user-select:none;">+ Add</span>
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
                <label style="display: flex; align-items: center; gap: 3px; font-size: 10px; white-space: nowrap;">
                  <input type="checkbox" v-model="layer.default_enabled"> Default ON
                </label>
                <span @click="onRemoveLayer(idx)" style="cursor:pointer; color:var(--color-close); font-size:15px; opacity:0.7; user-select:none; padding:0 3px; line-height:1;">\xD7</span>
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

        </div>
      `
      },
      buttons: ["Export .yml", "Save", "Cancel"],
      onButton(index) {
        if (index === 2)
          return;
        try {
          const vue = dialog.content_vue || dialog.component;
          const cfg = vue.buildConfig();
          saveModelConfig(cfg);
          if (index === 0) {
            const hitboxAssetPath = resolvePathForType(getSafeProjectConfig(), "hitbox");
            exportModelYaml({ ...cfg, hitboxes: buildHitboxYamlPaths(hitboxAssetPath) });
          } else {
            Blockbench.showQuickMessage("Model config saved", 1500);
          }
        } catch (e) {
          console.error("[ModelConfig] Error:", e);
        }
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
  function getModelConfigAction() {
    return modelConfigAction;
  }

  // src/first-person/arm-overlay.ts
  function T6() {
    return window.THREE;
  }
  function getScene5() {
    return window.Preview?.selected?.scene ?? window.scene;
  }
  function computeDominantBonePerFace(faces, store, boneExists, fallbackBone) {
    const referencedBones = /* @__PURE__ */ new Set();
    for (const vk of store.getVertexKeys()) {
      for (const inf of store.getInfluencesForVertex(vk))
        referencedBones.add(inf.bone);
    }
    if (referencedBones.size <= 1)
      return null;
    const result = /* @__PURE__ */ new Map();
    for (const [key, face] of Object.entries(faces)) {
      const verts = face.vertices ?? [];
      const weightPerBone = /* @__PURE__ */ new Map();
      for (const vk of verts) {
        for (const { bone, weight } of store.getInfluencesForVertex(vk)) {
          weightPerBone.set(bone, (weightPerBone.get(bone) ?? 0) + weight);
        }
      }
      let dominant = fallbackBone;
      let best = -1;
      for (const [bone, w] of weightPerBone) {
        if (w > best && boneExists(bone)) {
          best = w;
          dominant = bone;
        }
      }
      result.set(key, dominant);
    }
    return result;
  }
  var overlay = null;
  function buildArmOverlay(meshChild, faceDominant, isFaceArm) {
    removeArmOverlay();
    const TH = T6();
    const scene = getScene5();
    if (!TH || !scene || !meshChild?.faces || !meshChild?.vertices || !meshChild.mesh)
      return;
    meshChild.mesh.updateMatrixWorld(true);
    const vertices = meshChild.vertices;
    const mat4 = meshChild.mesh.matrixWorld;
    const tmp = new TH.Vector3();
    const positions = [];
    const uvs = [];
    const indexToVk2 = [];
    const restWorldPositions = [];
    for (const [key, face] of Object.entries(meshChild.faces)) {
      const dominant = faceDominant.get(key);
      if (!dominant || !isFaceArm(dominant))
        continue;
      const faceVerts = face.vertices ?? [];
      if (faceVerts.length < 3)
        continue;
      for (const [a, b, c] of triangulateFace(faceVerts)) {
        for (const vk of [a, b, c]) {
          indexToVk2.push(vk);
          const p = vertices[vk] ?? [0, 0, 0];
          tmp.set(p[0], p[1], p[2]).applyMatrix4(mat4);
          positions.push(tmp.x, tmp.y, tmp.z);
          restWorldPositions.push([tmp.x, tmp.y, tmp.z]);
          const [u, v] = normalizeFaceUV(face.uv?.[vk]);
          uvs.push(u, v);
        }
      }
    }
    if (indexToVk2.length === 0)
      return;
    const geo = new TH.BufferGeometry();
    geo.setAttribute("position", new TH.BufferAttribute(new Float32Array(positions), 3));
    geo.setAttribute("uv", new TH.BufferAttribute(new Float32Array(uvs), 2));
    geo.computeVertexNormals();
    const srcMaterial = meshChild.mesh.material;
    const material = Array.isArray(srcMaterial) ? srcMaterial[0] : srcMaterial;
    const mesh = new TH.Mesh(geo, material);
    mesh.renderOrder = meshChild.mesh.renderOrder ?? 0;
    scene.add(mesh);
    overlay = { mesh, geo, scene, indexToVk: indexToVk2, restWorldPositions };
  }
  function syncArmOverlayPositions() {
    if (!overlay)
      return;
    const TH = T6();
    if (!TH)
      return;
    const posAttr = overlay.geo.getAttribute("position");
    if (!posAttr || posAttr.count !== overlay.indexToVk.length)
      return;
    const out = new TH.Vector3();
    for (let i = 0; i < overlay.indexToVk.length; i++) {
      const vk = overlay.indexToVk[i];
      const rest = overlay.restWorldPositions[i];
      if (computeLBSWorldPosition(vk, rest, out)) {
        posAttr.setXYZ(i, out.x, out.y, out.z);
      } else {
        posAttr.setXYZ(i, rest[0], rest[1], rest[2]);
      }
    }
    posAttr.needsUpdate = true;
    overlay.geo.computeVertexNormals();
  }
  function hasArmOverlay() {
    return overlay !== null;
  }
  function removeArmOverlay() {
    if (!overlay)
      return;
    overlay.scene?.remove(overlay.mesh);
    overlay.geo?.dispose();
    overlay = null;
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
  var armOverlaySyncHandler = null;
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
  function getPreview3() {
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
  function setupArmOverlay() {
    const store = getCurrentWeightStore();
    const group = getCurrentMeshGroup();
    if (!store || !group)
      return;
    const meshChild = (group.children ?? []).find((c) => c.type === "mesh");
    if (!meshChild?.faces)
      return;
    const boneExists = (name) => !!findBone(name);
    const faceDominant = computeDominantBonePerFace(meshChild.faces, store, boneExists, group.name);
    if (!faceDominant)
      return;
    const isFaceArm = (bone) => {
      if (isArmBone(bone))
        return true;
      const grp = findBone(bone);
      return !!grp && isChildOfArm(grp);
    };
    if (meshChild.mesh) {
      if (!hiddenMeshes.has(meshChild.mesh)) {
        hiddenMeshes.set(meshChild.mesh, meshChild.mesh.visible);
      }
      meshChild.mesh.visible = false;
    }
    buildArmOverlay(meshChild, faceDominant, isFaceArm);
    if (!hasArmOverlay())
      return;
    armOverlaySyncHandler = () => syncArmOverlayPositions();
    Blockbench?.on?.("render_frame", armOverlaySyncHandler);
  }
  function teardownArmOverlay() {
    if (armOverlaySyncHandler) {
      Blockbench?.removeListener?.("render_frame", armOverlaySyncHandler);
      armOverlaySyncHandler = null;
    }
    removeArmOverlay();
  }
  function saveCameraState() {
    const p = getPreview3();
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
    const p = getPreview3();
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
    const p = getPreview3();
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
    const p = getPreview3();
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
      teardownArmOverlay();
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
      setupArmOverlay();
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
      teardownArmOverlay();
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
      keybind: new Keybind({ key: "f", ctrl: true, shift: true }),
      click: toggleFirstPerson
    });
    resetViewAction = new Action("reset_view_center", {
      name: "Reset View",
      icon: "center_focus_strong",
      description: "Reset camera to center on the model",
      keybind: new Keybind({ key: "r", ctrl: true, shift: true }),
      click: () => {
        resetCameraToCenter();
        Blockbench.showQuickMessage("View reset to center", 1e3);
      }
    });
    Blockbench.on("render_frame", onRenderFrame2);
    Blockbench.on("select_project", forceExitFirstPerson);
    debugLog("First Person View module registered");
  }
  function getFirstPersonViewAction() {
    return fpAction;
  }
  function getResetViewAction() {
    return resetViewAction;
  }
  function unregisterFirstPerson() {
    forceExitFirstPerson();
    Blockbench.removeListener("render_frame", onRenderFrame2);
    Blockbench.removeListener("select_project", forceExitFirstPerson);
    if (fpAction) {
      fpAction.delete();
      fpAction = null;
    }
    if (resetViewAction) {
      resetViewAction.delete();
      resetViewAction = null;
    }
    debugLog("First Person View module unregistered");
  }

  // src/camera-preview/index.ts
  var CAMERA_BONE_NAME = "camera";
  var camAction = null;
  var isActive2 = false;
  var restPos = null;
  var restRot = null;
  var _curPos = new THREE.Vector3();
  var _curQuat = new THREE.Quaternion();
  var _restQInv = new THREE.Quaternion();
  var _rotDelta = new THREE.Quaternion();
  var _tempEuler = new THREE.Euler();
  function getPreview4() {
    const preview = Preview.selected;
    return preview?.camera ? preview : null;
  }
  function findCameraBone() {
    const groups = typeof getAllGroups === "function" ? getAllGroups() : [];
    return groups.find((g) => g.name?.toLowerCase() === CAMERA_BONE_NAME) ?? null;
  }
  var _frameCount = 0;
  function onRenderFrame3() {
    if (!isActive2 || !restPos || !restRot)
      return;
    const p = getPreview4();
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
    isActive2 = true;
    camAction?.setIcon("videocam");
    Blockbench.showQuickMessage("Camera Transform: ON", 1500);
    console.log(
      `[CameraTransform] ON \u2014 rest pos: (${restPos.x.toFixed(3)}, ${restPos.y.toFixed(3)}, ${restPos.z.toFixed(3)})`,
      `rest rot: (${THREE.MathUtils.radToDeg(bone.mesh.rotation.x).toFixed(1)}\xB0, ${THREE.MathUtils.radToDeg(bone.mesh.rotation.y).toFixed(1)}\xB0, ${THREE.MathUtils.radToDeg(bone.mesh.rotation.z).toFixed(1)}\xB0)`
    );
    debugLog("[CameraTransform] ON");
  }
  function disable() {
    isActive2 = false;
    restPos = null;
    restRot = null;
    camAction?.setIcon("videocam_off");
    Blockbench.showQuickMessage("Camera Transform: OFF", 1500);
    debugLog("[CameraTransform] OFF");
  }
  function toggle() {
    isActive2 ? disable() : enable();
  }
  function forceExitCameraPreview() {
    if (isActive2)
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
    isActive2 = false;
    restPos = null;
    restRot = null;
    debugLog("[CameraTransform] Unregistered");
  }

  // src/ragdoll-config/types.ts
  var DEFAULT_BONE_WEIGHT = 1;
  var DEFAULT_RAGDOLL_PHYSICS = {
    gravity: 0.12,
    stiffness: 0.7
  };

  // src/ragdoll-config/preview.ts
  var gravity = DEFAULT_RAGDOLL_PHYSICS.gravity;
  var stiffness = DEFAULT_RAGDOLL_PHYSICS.stiffness;
  var POS_DAMPING = 0.992;
  var FRICTION = 0.35;
  var FLOOR_Y = 0;
  var DRAG_SCALE = 6e-3;
  var PBD_ITERS = 8;
  function THREE2() {
    return window.THREE;
  }
  function allBones() {
    const all = typeof getAllGroups === "function" ? getAllGroups() : [];
    return all.filter((g) => g.type === "group" && g.name);
  }
  var active = false;
  var bones = [];
  var _v1 = null;
  var _v2 = null;
  var _v3 = null;
  var _q1 = null;
  var _q2 = null;
  var _m1 = null;
  var jointPairs = [];
  var jointLineGeo = null;
  var jointLineObj = null;
  var dragBone = null;
  var lastMX = 0;
  var lastMY = 0;
  var onDown = null;
  var onMove = null;
  var onUp = null;
  function buildSim(config) {
    const T8 = THREE2();
    bones = [];
    jointPairs = [];
    if (!T8) {
      console.warn("[ragdoll] THREE not available");
      return;
    }
    gravity = config.physics?.gravity ?? DEFAULT_RAGDOLL_PHYSICS.gravity;
    stiffness = Math.min(Math.max(config.physics?.stiffness ?? DEFAULT_RAGDOLL_PHYSICS.stiffness, 0), 1);
    _v1 = new T8.Vector3();
    _v2 = new T8.Vector3();
    _v3 = new T8.Vector3();
    _q1 = new T8.Quaternion();
    _q2 = new T8.Quaternion();
    _m1 = new T8.Matrix4();
    const allG = allBones().filter((g) => g.mesh);
    const nameSet = new Set(allG.map((g) => g.name));
    const groupByName = new Map(allG.map((g) => [g.name, g]));
    const jointParentOf = /* @__PURE__ */ new Map();
    (config.joints ?? []).forEach((j) => {
      if (!nameSet.has(j.parent) || !nameSet.has(j.child))
        return;
      jointParentOf.set(j.child, j.parent);
    });
    const activeNames = /* @__PURE__ */ new Set();
    for (const j of config.joints ?? []) {
      if (nameSet.has(j.parent))
        activeNames.add(j.parent);
      if (nameSet.has(j.child))
        activeNames.add(j.child);
    }
    function realParentGroup(g) {
      let p = g.parent;
      while (p && p.type === "group") {
        if (nameSet.has(p.name))
          return groupByName.get(p.name);
        p = p.parent;
      }
      return null;
    }
    const boneByName = /* @__PURE__ */ new Map();
    function resolveBone(g) {
      const existing = boneByName.get(g.name);
      if (existing)
        return existing;
      const isRigid = !!config.bones[g.name]?.rigid;
      let parentBone = null;
      const jointParentName = jointParentOf.get(g.name);
      if (jointParentName) {
        const pg = groupByName.get(jointParentName);
        if (pg)
          parentBone = resolveBone(pg);
      } else {
        const pg = realParentGroup(g);
        if (pg)
          parentBone = resolveBone(pg);
      }
      const weight = config.bones[g.name]?.weight ?? DEFAULT_BONE_WEIGHT;
      const worldPos = new T8.Vector3();
      g.mesh.getWorldPosition(worldPos);
      const worldQuat = new T8.Quaternion();
      g.mesh.getWorldQuaternion(worldQuat);
      const isActive3 = activeNames.has(g.name) && !isRigid && weight > 0;
      const particle = {
        wx: worldPos.x,
        wy: worldPos.y,
        wz: worldPos.z,
        pwx: worldPos.x,
        pwy: worldPos.y,
        pwz: worldPos.z,
        im: isActive3 ? 1 : 0
      };
      let restLength = 0;
      let restWorldDir = new T8.Vector3(0, -1, 0);
      let restLocalPos = new T8.Vector3();
      let restLocalQuat = new T8.Quaternion();
      if (parentBone) {
        const diff = worldPos.clone().sub(parentBone.currentWorldPos);
        restLength = diff.length();
        restWorldDir = restLength > 1e-6 ? diff.clone().normalize() : new T8.Vector3(0, -1, 0);
        const parentInvQuat = parentBone.restWorldQuat.clone().invert();
        restLocalPos = diff.clone().applyQuaternion(parentInvQuat);
        restLocalQuat = parentInvQuat.clone().multiply(worldQuat);
      }
      const bone = {
        group: g,
        particle,
        physicsParent: parentBone,
        restLength,
        restWorldDir,
        restWorldQuat: worldQuat.clone(),
        restLocalPos,
        restLocalQuat,
        currentWorldPos: worldPos.clone(),
        currentWorldQuat: worldQuat.clone(),
        savedLocalPos: g.mesh.position.clone(),
        savedLocalQuat: g.mesh.quaternion.clone()
      };
      bones.push(bone);
      boneByName.set(g.name, bone);
      return bone;
    }
    for (const g of allG)
      resolveBone(g);
    (config.joints ?? []).forEach((j) => {
      const pb = boneByName.get(j.parent), cb = boneByName.get(j.child);
      if (pb && cb)
        jointPairs.push([pb, cb]);
    });
    console.log(`[ragdoll-pbd] ${bones.length} bones, ${jointPairs.length} joints, ${activeNames.size} active`);
  }
  function stepPBD() {
    for (const bone of bones) {
      const p = bone.particle;
      if (p.im === 0)
        continue;
      const vx = (p.wx - p.pwx) * POS_DAMPING;
      const vy = (p.wy - p.pwy) * POS_DAMPING;
      const vz = (p.wz - p.pwz) * POS_DAMPING;
      p.pwx = p.wx;
      p.pwy = p.wy;
      p.pwz = p.wz;
      p.wx += vx;
      p.wy += vy - gravity;
      p.wz += vz;
    }
    for (let iter = 0; iter < PBD_ITERS; iter++) {
      for (const bone of bones) {
        if (!bone.physicsParent || bone.restLength < 1e-6)
          continue;
        if (bone.particle.im === 0)
          continue;
        const p = bone.particle;
        const pp = bone.physicsParent.particle;
        const dx = p.wx - pp.wx;
        const dy = p.wy - pp.wy;
        const dz = p.wz - pp.wz;
        const dist2 = dx * dx + dy * dy + dz * dz;
        if (dist2 < 1e-10)
          continue;
        const dist = Math.sqrt(dist2);
        const C = dist - bone.restLength;
        const n = 1 / dist;
        const wSum = p.im + pp.im;
        if (wSum === 0)
          continue;
        const k = C * n / wSum * stiffness;
        if (p.im > 0) {
          p.wx -= dx * k * p.im;
          p.wy -= dy * k * p.im;
          p.wz -= dz * k * p.im;
        }
        if (pp.im > 0) {
          pp.wx += dx * k * pp.im;
          pp.wy += dy * k * pp.im;
          pp.wz += dz * k * pp.im;
        }
      }
      for (const bone of bones) {
        const p = bone.particle;
        if (p.im === 0 || p.wy >= FLOOR_Y)
          continue;
        const vy = p.wy - p.pwy;
        p.pwy = p.wy - vy * 0;
        p.pwx = p.wx - (p.wx - p.pwx) * (1 - FRICTION);
        p.pwz = p.wz - (p.wz - p.pwz) * (1 - FRICTION);
        p.wy = FLOOR_Y;
      }
    }
    for (const bone of bones) {
      if (bone.particle.im === 0 && bone.physicsParent) {
        const pp = bone.physicsParent;
        _v1.copy(bone.restLocalPos).applyQuaternion(pp.currentWorldQuat);
        bone.currentWorldPos.copy(pp.currentWorldPos).add(_v1);
        bone.currentWorldQuat.copy(pp.currentWorldQuat).multiply(bone.restLocalQuat);
        bone.particle.wx = bone.currentWorldPos.x;
        bone.particle.wy = bone.currentWorldPos.y;
        bone.particle.wz = bone.currentWorldPos.z;
        bone.particle.pwx = bone.particle.wx;
        bone.particle.pwy = bone.particle.wy;
        bone.particle.pwz = bone.particle.wz;
      } else {
        bone.currentWorldPos.set(bone.particle.wx, bone.particle.wy, bone.particle.wz);
        computeBoneQuat(bone);
      }
      applyWorldTransform(bone);
    }
    updateJointLines();
  }
  function computeBoneQuat(bone) {
    if (!bone.physicsParent) {
      bone.currentWorldQuat.copy(bone.restWorldQuat);
      return;
    }
    const pp = bone.physicsParent.particle;
    const p = bone.particle;
    _v1.set(p.wx - pp.wx, p.wy - pp.wy, p.wz - pp.wz);
    const len = _v1.length();
    if (len < 1e-6) {
      bone.currentWorldQuat.copy(bone.restWorldQuat);
      return;
    }
    _v1.multiplyScalar(1 / len);
    _q1.setFromUnitVectors(bone.restWorldDir, _v1);
    bone.currentWorldQuat.copy(_q1).multiply(bone.restWorldQuat);
  }
  function applyWorldTransform(bone) {
    const mesh = bone.group.mesh;
    const threeParent2 = mesh.parent;
    if (threeParent2) {
      mesh.position.copy(bone.currentWorldPos).applyMatrix4(_m1.copy(threeParent2.matrixWorld).invert());
      threeParent2.getWorldQuaternion(_q2);
      mesh.quaternion.copy(_q2.invert()).multiply(bone.currentWorldQuat);
    } else {
      mesh.position.copy(bone.currentWorldPos);
      mesh.quaternion.copy(bone.currentWorldQuat);
    }
    mesh.updateMatrix();
    mesh.updateMatrixWorld(true);
  }
  function buildJointLines() {
    const T8 = THREE2();
    if (!T8 || jointPairs.length === 0)
      return;
    const positions = new Float32Array(jointPairs.length * 6);
    jointLineGeo = new T8.BufferGeometry();
    jointLineGeo.setAttribute("position", new T8.BufferAttribute(positions, 3));
    jointLineObj = new T8.LineSegments(
      jointLineGeo,
      new T8.LineBasicMaterial({ color: 4906624, depthTest: false, transparent: true, opacity: 0.6 })
    );
    const scene = window.Preview?.selected?.scene ?? window.scene;
    if (scene)
      scene.add(jointLineObj);
  }
  function updateJointLines() {
    if (!jointLineObj || !jointLineGeo || jointPairs.length === 0)
      return;
    const pos = jointLineGeo.attributes.position.array;
    jointPairs.forEach(([pb, cb], i) => {
      pos[i * 6 + 0] = pb.currentWorldPos.x;
      pos[i * 6 + 1] = pb.currentWorldPos.y;
      pos[i * 6 + 2] = pb.currentWorldPos.z;
      pos[i * 6 + 3] = cb.currentWorldPos.x;
      pos[i * 6 + 4] = cb.currentWorldPos.y;
      pos[i * 6 + 5] = cb.currentWorldPos.z;
    });
    jointLineGeo.attributes.position.needsUpdate = true;
  }
  function removeJointLines() {
    if (!jointLineObj)
      return;
    const scene = window.Preview?.selected?.scene ?? window.scene;
    if (scene)
      scene.remove(jointLineObj);
    jointLineObj = null;
    jointLineGeo = null;
  }
  function step() {
    if (!active)
      return;
    stepPBD();
  }
  function findBoneAt(clientX, clientY) {
    const T8 = THREE2();
    const preview = window.Preview?.selected;
    if (!T8 || !preview?.camera)
      return null;
    const canvas = preview.canvas ?? document.querySelector("#preview canvas");
    if (!canvas)
      return null;
    const rect = canvas.getBoundingClientRect();
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom)
      return null;
    const nx = (clientX - rect.left) / rect.width * 2 - 1;
    const ny = (clientY - rect.top) / rect.height * -2 + 1;
    const ray = new T8.Raycaster();
    ray.setFromCamera({ x: nx, y: ny }, preview.camera);
    const meshes = [];
    const meshToBone = /* @__PURE__ */ new Map();
    bones.forEach((b) => {
      if (b.particle.im === 0)
        return;
      if (b.group.mesh)
        b.group.mesh.traverse((o) => {
          if (o.isMesh || o.isLineSegments) {
            meshes.push(o);
            meshToBone.set(o, b);
          }
        });
    });
    const hits = ray.intersectObjects(meshes, false);
    if (!hits.length)
      return null;
    let obj = hits[0].object;
    while (obj && !meshToBone.has(obj))
      obj = obj.parent;
    return obj ? meshToBone.get(obj) ?? null : null;
  }
  function previewCanvas() {
    const preview = window.Preview?.selected;
    return preview?.canvas ?? document.querySelector("#preview canvas");
  }
  function inCanvas(e) {
    const c = previewCanvas();
    if (!c)
      return false;
    const r = c.getBoundingClientRect();
    return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
  }
  function installMouse() {
    onDown = (e) => {
      if (!active || !inCanvas(e))
        return;
      dragBone = findBoneAt(e.clientX, e.clientY);
      if (dragBone) {
        lastMX = e.clientX;
        lastMY = e.clientY;
        e.stopPropagation();
      }
    };
    onMove = (e) => {
      if (!active || !dragBone)
        return;
      const T8 = THREE2();
      const preview = window.Preview?.selected;
      if (!T8 || !preview?.camera)
        return;
      const dx = e.clientX - lastMX;
      const dy = e.clientY - lastMY;
      lastMX = e.clientX;
      lastMY = e.clientY;
      const cam = preview.camera;
      const right = new T8.Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
      const up = new T8.Vector3().setFromMatrixColumn(cam.matrixWorld, 1);
      const wp = dragBone.particle;
      wp.wx += (right.x * dx - up.x * dy) * DRAG_SCALE;
      wp.wy += (right.y * dx - up.y * dy) * DRAG_SCALE;
      wp.wz += (right.z * dx - up.z * dy) * DRAG_SCALE;
      wp.pwx = wp.wx;
      wp.pwy = wp.wy;
      wp.pwz = wp.wz;
      e.stopPropagation();
    };
    onUp = (e) => {
      if (dragBone)
        e.stopPropagation();
      dragBone = null;
    };
    document.addEventListener("mousedown", onDown, true);
    document.addEventListener("mousemove", onMove, true);
    document.addEventListener("mouseup", onUp, true);
  }
  function removeMouse() {
    if (onDown)
      document.removeEventListener("mousedown", onDown, true);
    if (onMove)
      document.removeEventListener("mousemove", onMove, true);
    if (onUp)
      document.removeEventListener("mouseup", onUp, true);
    onDown = onMove = onUp = null;
  }
  var EDITOR_SPHERE_R = 1.2;
  var EC_DEFAULT = 5609983;
  var EC_CHILD = 2280550;
  var EC_PARENT = 8974011;
  var EC_CHAIN = 16768256;
  var EC_SELECTED = 16746496;
  var EC_HOVER = 16777215;
  var editorActive = false;
  var editorJoints = [];
  var editorOnCreate = null;
  var editorOnRemove = null;
  var editorOnSel = null;
  var editorOnHov = null;
  var editorSelPivot = null;
  var editorHovPivot = null;
  var editorPivots = [];
  var editorAllSpheres = [];
  var editorPivGeo = null;
  var editorRigidGeo = null;
  var editorLineGeo = null;
  var editorLineObj = null;
  var editorSceneRef = null;
  var onEditorDown = null;
  var onEditorMove = null;
  function editorGetScene() {
    return window.Preview?.selected?.scene ?? window.scene;
  }
  function editorGetCamera() {
    return window.Preview?.selected?.camera;
  }
  function editorGetCanvas() {
    const p = window.Preview?.selected;
    return p?.canvas ?? document.querySelector("#preview canvas");
  }
  function pivotColor(name) {
    if (editorSelPivot === name)
      return EC_SELECTED;
    const isChild = editorJoints.some((j) => j.child === name);
    const isParent = editorJoints.some((j) => j.parent === name);
    if (isChild && isParent)
      return EC_CHAIN;
    if (isChild)
      return EC_CHILD;
    if (isParent)
      return EC_PARENT;
    return EC_DEFAULT;
  }
  function setPivotColor(name, hex) {
    editorPivots.find((p) => p.name === name)?.sphere.material.color.setHex(hex);
  }
  function refreshAllPivotColors() {
    for (const po of editorPivots) {
      const c = po.name === editorHovPivot && po.name !== editorSelPivot ? EC_HOVER : pivotColor(po.name);
      po.sphere.material.color.setHex(c);
    }
  }
  function buildEditorLinesMesh() {
    const T8 = THREE2();
    const sc = editorGetScene();
    if (!T8 || !sc || editorJoints.length === 0)
      return;
    const allG = allBones();
    const byName = new Map(allG.map((g) => [g.name, g]));
    const pos = new Float32Array(editorJoints.length * 6);
    const wp = new T8.Vector3();
    editorJoints.forEach((j, i) => {
      const pg = byName.get(j.parent), cg = byName.get(j.child);
      if (pg?.mesh) {
        pg.mesh.getWorldPosition(wp);
        pos[i * 6] = wp.x;
        pos[i * 6 + 1] = wp.y;
        pos[i * 6 + 2] = wp.z;
      }
      if (cg?.mesh) {
        cg.mesh.getWorldPosition(wp);
        pos[i * 6 + 3] = wp.x;
        pos[i * 6 + 4] = wp.y;
        pos[i * 6 + 5] = wp.z;
      }
    });
    editorLineGeo = new T8.BufferGeometry();
    editorLineGeo.setAttribute("position", new T8.BufferAttribute(pos, 3));
    editorLineObj = new T8.LineSegments(
      editorLineGeo,
      new T8.LineBasicMaterial({ color: 4906624, depthTest: false, transparent: true, opacity: 0.75 })
    );
    editorLineObj.renderOrder = 998;
    sc.add(editorLineObj);
  }
  function removeEditorLinesMesh() {
    if (editorSceneRef && editorLineObj)
      editorSceneRef.remove(editorLineObj);
    editorLineGeo?.dispose();
    editorLineGeo = editorLineObj = null;
  }
  function rebuildEditorLines() {
    removeEditorLinesMesh();
    buildEditorLinesMesh();
  }
  function buildEditorObjects(config) {
    const T8 = THREE2();
    const sc = editorGetScene();
    if (!T8 || !sc)
      return;
    editorSceneRef = sc;
    const SphereGeo = T8.SphereGeometry ?? T8.SphereBufferGeometry;
    editorPivGeo = new SphereGeo(EDITOR_SPHERE_R, 8, 6);
    editorRigidGeo = new SphereGeo(EDITOR_SPHERE_R * 0.55, 6, 4);
    const wp = new T8.Vector3();
    for (const g of allBones()) {
      if (!g.mesh)
        continue;
      g.mesh.updateMatrixWorld(true);
      const isRigid = config.bones[g.name]?.rigid ?? false;
      const mat = new T8.MeshBasicMaterial({
        color: isRigid ? 4473924 : pivotColor(g.name),
        depthTest: false,
        transparent: true,
        opacity: isRigid ? 0.25 : 0.85
      });
      const sphere = new T8.Mesh(isRigid ? editorRigidGeo : editorPivGeo, mat);
      g.mesh.getWorldPosition(wp);
      sphere.position.copy(wp);
      sphere.renderOrder = 999;
      sc.add(sphere);
      editorAllSpheres.push(sphere);
      if (!isRigid)
        editorPivots.push({ name: g.name, sphere });
    }
    buildEditorLinesMesh();
  }
  function removeEditorObjects() {
    if (editorSceneRef) {
      for (const s of editorAllSpheres)
        editorSceneRef.remove(s);
      if (editorLineObj)
        editorSceneRef.remove(editorLineObj);
    }
    for (const s of editorAllSpheres)
      s.material.dispose();
    editorPivGeo?.dispose();
    editorRigidGeo?.dispose();
    editorLineGeo?.dispose();
    editorPivots = [];
    editorAllSpheres = [];
    editorPivGeo = editorRigidGeo = editorLineGeo = editorLineObj = editorSceneRef = null;
  }
  var PICK_RADIUS_PX = 22;
  function pickEditorPivot(e) {
    const T8 = THREE2();
    const canvas = editorGetCanvas();
    const camera = editorGetCamera();
    if (!T8 || !canvas || !camera || editorPivots.length === 0)
      return null;
    const rect = canvas.getBoundingClientRect();
    if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom)
      return null;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const tmp = new T8.Vector3();
    let best = null;
    let bestDist = PICK_RADIUS_PX;
    for (const po of editorPivots) {
      tmp.copy(po.sphere.position).project(camera);
      if (tmp.z > 1)
        continue;
      const sx = (tmp.x + 1) / 2 * rect.width;
      const sy = (1 - tmp.y) / 2 * rect.height;
      const d = Math.hypot(mx - sx, my - sy);
      if (d < bestDist) {
        bestDist = d;
        best = po.name;
      }
    }
    return best;
  }
  function wouldCreateCycle(newParent, newChild) {
    const visited = /* @__PURE__ */ new Set();
    const queue = [newChild];
    while (queue.length > 0) {
      const node = queue.shift();
      if (node === newParent)
        return true;
      if (visited.has(node))
        continue;
      visited.add(node);
      for (const j of editorJoints) {
        if (j.parent === node)
          queue.push(j.child);
      }
    }
    return false;
  }
  function installEditorMouse() {
    onEditorMove = (e) => {
      if (!editorActive)
        return;
      const newHov = pickEditorPivot(e);
      if (newHov === editorHovPivot)
        return;
      if (editorHovPivot)
        setPivotColor(editorHovPivot, pivotColor(editorHovPivot));
      if (newHov && newHov !== editorSelPivot)
        setPivotColor(newHov, EC_HOVER);
      editorHovPivot = newHov;
      const hovCurrentParent = editorSelPivot && newHov ? editorJoints.find((j) => j.child === newHov)?.parent ?? null : null;
      editorOnHov?.(newHov, hovCurrentParent);
    };
    onEditorDown = (e) => {
      if (!editorActive || e.button !== 0)
        return;
      const canvas = editorGetCanvas();
      if (!canvas)
        return;
      const rect = canvas.getBoundingClientRect();
      if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom)
        return;
      const hitName = pickEditorPivot(e);
      if (!hitName)
        return;
      e.stopPropagation();
      if (editorSelPivot === null) {
        editorSelPivot = hitName;
        editorOnSel?.(hitName);
        refreshAllPivotColors();
      } else if (editorSelPivot === hitName) {
        editorSelPivot = null;
        editorOnSel?.(null);
        refreshAllPivotColors();
      } else {
        const parent = editorSelPivot;
        const child = hitName;
        const existing = editorJoints.findIndex((j) => j.parent === parent && j.child === child);
        if (existing >= 0) {
          editorSelPivot = null;
          editorOnSel?.(null);
          refreshAllPivotColors();
          return;
        }
        if (wouldCreateCycle(parent, child)) {
          editorSelPivot = null;
          editorOnSel?.(null);
          refreshAllPivotColors();
          return;
        }
        const oldIdx = editorJoints.findIndex((j) => j.child === child);
        if (oldIdx >= 0) {
          const removed = editorJoints.splice(oldIdx, 1)[0];
          editorOnRemove?.(removed.parent, removed.child);
        }
        editorJoints.push({ parent, child });
        editorOnCreate?.(parent, child);
        editorSelPivot = null;
        editorOnSel?.(null);
        refreshAllPivotColors();
        rebuildEditorLines();
      }
    };
    document.addEventListener("mousemove", onEditorMove, true);
    document.addEventListener("mousedown", onEditorDown, true);
  }
  function removeEditorMouse() {
    if (onEditorMove)
      document.removeEventListener("mousemove", onEditorMove, true);
    if (onEditorDown)
      document.removeEventListener("mousedown", onEditorDown, true);
    onEditorMove = onEditorDown = null;
  }
  function startEditor(config, onCreate, onRemove, onSelChange, onHovChange) {
    if (editorActive)
      stopEditor();
    editorActive = true;
    editorJoints = [...config.joints ?? []];
    editorOnCreate = onCreate;
    editorOnRemove = onRemove;
    editorOnSel = onSelChange ?? null;
    editorOnHov = onHovChange ?? null;
    editorSelPivot = null;
    editorHovPivot = null;
    buildEditorObjects(config);
    installEditorMouse();
  }
  function stopEditor() {
    if (!editorActive)
      return;
    editorActive = false;
    editorSelPivot = editorHovPivot = null;
    editorOnCreate = editorOnRemove = editorOnSel = editorOnHov = null;
    removeEditorMouse();
    removeEditorObjects();
    editorJoints = [];
  }
  function isEditorActive() {
    return editorActive;
  }
  function updateEditorConfig(config) {
    if (!editorActive)
      return;
    editorJoints = [...config.joints ?? []];
    refreshAllPivotColors();
    rebuildEditorLines();
  }
  var pivotMarkerRoot = null;
  var pivotMarkerScene = null;
  function showPivotMarker(boneName) {
    hidePivotMarker();
    if (!boneName)
      return;
    const T8 = THREE2();
    const sc = window.Preview?.selected?.scene ?? window.scene;
    if (!T8 || !sc)
      return;
    const g = allBones().find((b) => b.name === boneName);
    if (!g?.mesh)
      return;
    g.mesh.updateMatrixWorld(true);
    const wp = new T8.Vector3();
    g.mesh.getWorldPosition(wp);
    const root = new T8.Group();
    root.position.copy(wp);
    const axes = new T8.AxesHelper(4);
    if (Array.isArray(axes.material)) {
      axes.material.forEach((m) => {
        m.depthTest = false;
        m.transparent = true;
        m.opacity = 0.85;
      });
    } else if (axes.material) {
      axes.material.depthTest = false;
      axes.material.transparent = true;
      axes.material.opacity = 0.85;
    }
    axes.renderOrder = 1e3;
    root.add(axes);
    const SphereGeo = T8.SphereGeometry ?? T8.SphereBufferGeometry;
    const dot = new T8.Mesh(
      new SphereGeo(0.5, 8, 6),
      new T8.MeshBasicMaterial({ color: 16777215, depthTest: false, transparent: true, opacity: 0.95 })
    );
    dot.renderOrder = 1001;
    root.add(dot);
    sc.add(root);
    pivotMarkerRoot = root;
    pivotMarkerScene = sc;
  }
  function hidePivotMarker() {
    if (pivotMarkerScene && pivotMarkerRoot) {
      pivotMarkerScene.remove(pivotMarkerRoot);
      pivotMarkerRoot.traverse((child) => {
        child.geometry?.dispose();
        if (Array.isArray(child.material))
          child.material.forEach((m) => m.dispose());
        else
          child.material?.dispose();
      });
    }
    pivotMarkerRoot = null;
    pivotMarkerScene = null;
  }
  function startPreview(config) {
    if (active)
      stopPreview();
    buildSim(config);
    if (!bones.length) {
      console.warn("[ragdoll] no bones to simulate");
      return;
    }
    active = true;
    installMouse();
    buildJointLines();
    Blockbench.on("render_frame", step);
  }
  function stopPreview() {
    if (!active && bones.length === 0)
      return;
    active = false;
    dragBone = null;
    Blockbench.removeListener("render_frame", step);
    removeMouse();
    removeJointLines();
    for (const bone of bones) {
      if (bone.group.mesh) {
        bone.group.mesh.position.copy(bone.savedLocalPos);
        bone.group.mesh.quaternion.copy(bone.savedLocalQuat);
        bone.group.mesh.updateMatrix();
        bone.group.mesh.updateMatrixWorld(true);
      }
    }
    bones = [];
    jointPairs = [];
  }

  // src/ragdoll-config/dialog.ts
  function vueSet(obj, key, val) {
    const V = typeof Vue !== "undefined" ? Vue : window.Vue;
    if (V?.set)
      V.set(obj, key, val);
    else
      obj[key] = val;
  }
  var MODE_ID = "animorph_ragdoll";
  var RIGID_BTN_ID = "animorph_rigid";
  function buildBoneList(savedBones, savedJoints) {
    const all = typeof getAllGroups === "function" ? getAllGroups() : [];
    const groups = all.filter((g) => g.type === "group" && g.name);
    const roots = groups.filter((g) => !g.parent || g.parent.type !== "group");
    const result = [];
    const jointParentOf = new Map(savedJoints.map((j) => [j.child, j.parent]));
    function traverse(g, depth) {
      result.push({
        uuid: g.uuid || g.name,
        name: g.name,
        depth,
        weight: savedBones[g.name]?.weight ?? DEFAULT_BONE_WEIGHT,
        rigid: savedBones[g.name]?.rigid ?? false,
        physicsParentName: jointParentOf.get(g.name) ?? null
      });
      if (g.children) {
        for (const child of g.children) {
          if (child.type === "group")
            traverse(child, depth + 1);
        }
      }
    }
    for (const root of roots)
      traverse(root, 0);
    return result;
  }
  var ragdollMode = null;
  var ragdollPanel = null;
  var ragdollSetting = null;
  function makePanelComponent2() {
    return {
      name: "animorph-ragdoll-panel",
      data() {
        return {
          bones: [],
          isPreviewing: false,
          hasModel: false,
          editorSelectedBone: null,
          editorHoverBone: null,
          editorHoverParent: null,
          gravity: DEFAULT_RAGDOLL_PHYSICS.gravity,
          stiffness: DEFAULT_RAGDOLL_PHYSICS.stiffness
        };
      },
      mounted() {
        this.reload();
        this.enterEditMode();
        Blockbench.on("finished_edit", this.onBBFinishedEdit);
      },
      beforeDestroy() {
        Blockbench.removeListener("finished_edit", this.onBBFinishedEdit);
      },
      methods: {
        // ── data ───────────────────────────────────────────────────────────────
        reload() {
          const all = typeof getAllGroups === "function" ? getAllGroups() : [];
          this.hasModel = all.some((g) => g.type === "group");
          if (!this.hasModel) {
            this.bones = [];
            stopEditor();
            return;
          }
          const cfg = loadModelConfig();
          this.bones = buildBoneList(cfg.ragdoll?.bones ?? {}, cfg.ragdoll?.joints ?? []);
          this.gravity = cfg.ragdoll?.physics?.gravity ?? DEFAULT_RAGDOLL_PHYSICS.gravity;
          this.stiffness = cfg.ragdoll?.physics?.stiffness ?? DEFAULT_RAGDOLL_PHYSICS.stiffness;
          const groupMap = new Map(all.map((g) => [g.name, g]));
          for (const b of this.bones) {
            const g = groupMap.get(b.name);
            if (g)
              vueSet(g, RIGID_BTN_ID, b.rigid);
          }
          if (!this.isPreviewing)
            this.enterEditMode();
        },
        enterEditMode() {
          if (Modes.id !== MODE_ID)
            return;
          if (this.isPreviewing || !this.hasModel || !this.bones.length)
            return;
          stopEditor();
          startEditor(
            this.buildConfig(),
            (parent, child) => {
              const b = this.bones.find((b2) => b2.name === child);
              if (b && !b.rigid)
                b.physicsParentName = parent;
              updateEditorConfig(this.buildConfig());
              this.persist();
            },
            (parent, child) => {
              const b = this.bones.find((b2) => b2.name === child);
              if (b && b.physicsParentName === parent)
                b.physicsParentName = null;
              updateEditorConfig(this.buildConfig());
              this.persist();
            },
            (name) => {
              this.editorSelectedBone = name;
            },
            (name, currentParent) => {
              this.editorHoverBone = name;
              this.editorHoverParent = currentParent;
            }
          );
        },
        unlinkBone(bone) {
          if (!bone.physicsParentName)
            return;
          bone.physicsParentName = null;
          if (isEditorActive())
            updateEditorConfig(this.buildConfig());
          this.persist();
        },
        // Silently writes the current panel state to the model config. Called
        // after every mutation (weight, rigid, joints) so leaving and
        // re-entering Ragdoll mode — which reload()s from storage — never
        // discards unsaved work. The explicit "Save" button still exists as a
        // manual confirm/toast, but nothing depends on the user remembering it.
        persist() {
          const cfg = loadModelConfig();
          cfg.ragdoll = this.buildConfig();
          saveModelConfig(cfg);
        },
        buildConfig() {
          const all = typeof getAllGroups === "function" ? getAllGroups() : [];
          const groupMap = new Map(all.map((g) => [g.name, g]));
          const bones2 = {};
          const joints = [];
          for (const b of this.bones) {
            const rigid = groupMap.get(b.name)?.[RIGID_BTN_ID] ?? b.rigid;
            bones2[b.name] = { weight: parseFloat(b.weight.toFixed(2)), ...rigid ? { rigid: true } : {} };
            if (!rigid && b.physicsParentName)
              joints.push({ parent: b.physicsParentName, child: b.name });
          }
          return { bones: bones2, joints, physics: { gravity: this.gravity, stiffness: this.stiffness } };
        },
        // Physics sliders changed — re-persist and, if the sim is already
        // running, apply immediately instead of waiting for a Stop/Start cycle.
        onPhysicsChange() {
          this.persist();
          if (this.isPreviewing)
            startPreview(this.buildConfig());
        },
        weightColor(w) {
          if (w === 0)
            return "#6b7280";
          return w <= 1 ? "#4ade80" : "#facc15";
        },
        // ── bone actions ────────────────────────────────────────────────────────
        // Called by Blockbench's 'finished_edit' event — syncs group.animorph_rigid → bone.rigid.
        onBBFinishedEdit() {
          if (Modes.id !== MODE_ID)
            return;
          const all = typeof getAllGroups === "function" ? getAllGroups() : [];
          const groupMap = new Map(all.map((g) => [g.name, g]));
          let changed = false;
          for (const b of this.bones) {
            const newRigid = groupMap.get(b.name)?.[RIGID_BTN_ID] ?? b.rigid;
            if (b.rigid !== newRigid) {
              b.rigid = newRigid;
              if (b.rigid)
                b.physicsParentName = null;
              changed = true;
            }
          }
          if (changed) {
            if (this.isPreviewing)
              this.stopSim();
            if (isEditorActive())
              this.enterEditMode();
            this.persist();
          }
        },
        // Toggles rigid inline from the bone list — mirrors the Outliner lock
        // button (same underlying group property, kept in sync via vueSet) so
        // the user isn't forced to leave this panel to mark a bone rigid.
        toggleRigid(bone) {
          const rigid = !bone.rigid;
          bone.rigid = rigid;
          if (rigid)
            bone.physicsParentName = null;
          const all = typeof getAllGroups === "function" ? getAllGroups() : [];
          const g = all.find((x) => x.name === bone.name);
          if (g)
            vueSet(g, RIGID_BTN_ID, rigid);
          if (isEditorActive())
            this.enterEditMode();
          if (this.isPreviewing)
            startPreview(this.buildConfig());
          this.persist();
        },
        resetJoints() {
          for (const b of this.bones)
            b.physicsParentName = null;
          if (isEditorActive())
            updateEditorConfig(this.buildConfig());
          if (this.isPreviewing)
            startPreview(this.buildConfig());
          this.persist();
          Blockbench.showQuickMessage("All joints cleared", 1500);
        },
        resetWeights() {
          for (const b of this.bones)
            b.weight = DEFAULT_BONE_WEIGHT;
          if (this.isPreviewing)
            startPreview(this.buildConfig());
          this.persist();
        },
        freezeAll() {
          for (const b of this.bones)
            b.weight = 0;
          if (this.isPreviewing)
            startPreview(this.buildConfig());
          this.persist();
        },
        // ── preview ─────────────────────────────────────────────────────────────
        togglePreview() {
          if (this.isPreviewing) {
            this.stopSim();
            return;
          }
          stopEditor();
          this.isPreviewing = true;
          startPreview(this.buildConfig());
        },
        stopSim() {
          stopPreview();
          this.isPreviewing = false;
          this.enterEditMode();
        },
        // ── persistence ─────────────────────────────────────────────────────────
        // Everything already auto-persists via persist() as you edit — this
        // button is just an explicit confirm/toast for peace of mind.
        save() {
          this.persist();
          Blockbench.showQuickMessage("Ragdoll config saved", 1500);
        },
        exportYaml() {
          this.stopSim();
          const cfg = loadModelConfig();
          cfg.ragdoll = this.buildConfig();
          saveModelConfig(cfg);
          const hitboxAssetPath = resolvePathForType(getSafeProjectConfig(), "hitbox");
          exportModelYaml({ ...cfg, hitboxes: buildHitboxYamlPaths(hitboxAssetPath) });
        }
      },
      template: `
      <div style="display:flex; flex-direction:column; height:100%; font-size:12px; user-select:none;">

        <!-- \u2500\u2500 preview \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 -->
        <div style="padding:12px 14px 10px; border-bottom:1px solid rgba(255,255,255,0.08);">
          <button @click="togglePreview"
                  :style="{
                    width:'100%', padding:'8px 0', fontSize:'13px', fontWeight:600,
                    borderRadius:'5px', cursor:'pointer', letterSpacing:'0.02em',
                    background: isPreviewing ? 'rgba(239,68,68,0.15)' : 'rgba(74,222,128,0.12)',
                    border:     isPreviewing ? '1px solid rgba(239,68,68,0.45)'
                                            : '1px solid rgba(74,222,128,0.35)',
                    color:      isPreviewing ? '#ef4444' : '#4ade80',
                  }">
            {{ isPreviewing ? '\u25A0  Stop Preview' : '\u25B6  Start Ragdoll Preview' }}
          </button>
          <p style="margin:7px 0 0; font-size:10px; opacity:0.4; line-height:1.5;">
            <template v-if="isPreviewing">
              Drag any bone to throw it. Green lines = active joints.
            </template>
            <template v-else>
              Model goes limp and falls.
              <span style="color:#6b7280;">\u25A0</span> 0 = frozen &nbsp;
              <span style="color:#4ade80;">\u25A0</span> 1 = normal &nbsp;
              <span style="color:#facc15;">\u25A0</span> 2 = heavy
            </template>
          </p>

          <!-- physics tuning \u2014 per-model, affects the whole preview -->
          <div style="display:flex; flex-direction:column; gap:5px; margin-top:9px;">
            <div style="display:flex; align-items:center; gap:6px;">
              <span style="flex:0 0 52px; font-size:10px; opacity:0.55;" title="How hard gravity pulls">Gravity</span>
              <input type="range" v-model.number="gravity" @change="onPhysicsChange"
                     min="0.02" max="0.6" step="0.01"
                     style="flex:1; height:12px; cursor:pointer;">
              <span style="flex:0 0 30px; font-size:10px; font-family:monospace; text-align:right; opacity:0.65;">
                {{ Number(gravity).toFixed(2) }}
              </span>
            </div>
            <div style="display:flex; align-items:center; gap:6px;">
              <span style="flex:0 0 52px; font-size:10px; opacity:0.55;" title="How tightly bones stay attached to the body">Stiffness</span>
              <input type="range" v-model.number="stiffness" @change="onPhysicsChange"
                     min="0.05" max="1" step="0.05"
                     style="flex:1; height:12px; cursor:pointer;">
              <span style="flex:0 0 30px; font-size:10px; font-family:monospace; text-align:right; opacity:0.65;">
                {{ Number(stiffness).toFixed(2) }}
              </span>
            </div>
          </div>
        </div>

        <!-- \u2500\u2500 toolbar \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 -->
        <div style="display:flex; flex-wrap:wrap; gap:4px; padding:8px 10px;
                    border-bottom:1px solid rgba(255,255,255,0.08);">
          <button class="material-button" @click="reload"
                  title="Reload bones from the current model"
                  style="flex:1; min-width:52px; padding:4px 6px; font-size:11px; min-height:0;">
            \u21BA Refresh
          </button>
          <button class="material-button" @click="resetWeights"
                  title="Reset all weights to 1.0"
                  style="flex:1; min-width:44px; padding:4px 6px; font-size:11px; min-height:0;">
            Reset
          </button>
          <button class="material-button" @click="freezeAll"
                  style="flex:1; min-width:44px; padding:4px 6px; font-size:11px; min-height:0;">
            Freeze
          </button>
          <button class="material-button" @click="resetJoints"
                  title="Remove ALL physics joints (start fresh)"
                  style="flex:1; min-width:52px; padding:4px 6px; font-size:11px; min-height:0;
                         color:rgba(248,113,113,0.85);">
            \u2715 Joints
          </button>
        </div>

        <!-- \u2500\u2500 editor hint \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 -->
        <div v-if="!isPreviewing && bones.length > 0"
             style="padding:8px 12px 7px; border-bottom:1px solid rgba(255,255,255,0.08); font-size:10px; line-height:1.6;">

          <!-- selected-bone state: show hover target info while waiting for child click -->
          <template v-if="editorSelectedBone">
            <div style="color:#ff8800; font-weight:600; margin-bottom:2px;">
              \u2B21 &nbsp;{{ editorSelectedBone }} &mdash; now click the child bone
              <span style="font-weight:400; opacity:0.7;"> (click again to cancel)</span>
            </div>
            <!-- reparent warning -->
            <div v-if="editorHoverBone && editorHoverParent && editorHoverParent !== editorSelectedBone"
                 style="color:#facc15; font-size:9px; margin-bottom:2px;">
              \u26A0 {{ editorHoverBone }} is currently child of <strong>{{ editorHoverParent }}</strong> \u2014 click will reparent it
            </div>
            <!-- already connected hint -->
            <div v-else-if="editorHoverBone && editorHoverParent === editorSelectedBone"
                 style="color:#4ade80; font-size:9px; margin-bottom:2px;">
              \u2713 {{ editorHoverBone }} is already connected to {{ editorSelectedBone }}
            </div>
          </template>

          <!-- hover label when nothing is selected -->
          <div v-else-if="editorHoverBone"
               style="color:#ffffff; font-weight:600; opacity:0.75; margin-bottom:3px;">
            \u2B21 &nbsp;{{ editorHoverBone }}
          </div>

          <!-- idle hint -->
          <div v-else style="opacity:0.38; margin-bottom:3px;">
            Click a <strong style="opacity:0.8;">parent bone</strong> (turns orange), then click the child.
            To disconnect, use \u2715 in the list below.
          </div>

          <!-- color legend -->
          <div style="display:flex; gap:8px; flex-wrap:wrap; opacity:0.55; margin-top:2px;">
            <span><span style="color:#5599ff;">\u25CF</span> free</span>
            <span><span style="color:#88eebb;">\u25CF</span> parent</span>
            <span><span style="color:#22cc66;">\u25CF</span> child</span>
            <span><span style="color:#ffdd00;">\u25CF</span> chain</span>
            <span><span style="color:#ff8800;">\u25CF</span> selected</span>
          </div>
        </div>

        <!-- \u2500\u2500 bone list \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 -->
        <div style="flex:1; overflow-y:auto; padding:8px 10px;">

          <!-- empty state -->
          <div v-if="!hasModel || bones.length === 0"
               style="padding:32px 0; text-align:center; opacity:0.3; font-size:11px; line-height:1.7;">
            {{ hasModel ? 'No bones found.' : 'Open a model first.' }}<br>
            Then click \u21BA Refresh.
          </div>

          <!-- column headers -->
          <div v-if="bones.length > 0"
               style="display:flex; align-items:center; gap:6px; padding:0 2px 6px;
                      font-size:10px; opacity:0.35; border-bottom:1px solid rgba(255,255,255,0.06);
                      margin-bottom:6px;">
            <span style="flex:1;">Bone</span>
            <span style="flex:1; text-align:right;">Weight</span>
          </div>

          <!-- bone entries -->
          <div v-for="bone in bones" :key="bone.uuid"
               :style="{
                 marginBottom: '5px',
                 padding: '6px 6px 7px',
                 borderRadius: '5px',
                 background: 'rgba(255,255,255,0.025)',
                 opacity: bone.rigid ? 0.4 : 1,
               }">

            <!-- row 1: name + parent label + rigid toggle -->
            <div style="display:flex; align-items:center; gap:4px; margin-bottom:4px;">
              <span :style="{
                      paddingLeft: (bone.depth * 8) + 'px',
                      flex: '1',
                      fontSize: '11px',
                      fontWeight: 600,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }"
                    :title="bone.name">{{ bone.name }}</span>

              <span v-if="!bone.rigid && bone.physicsParentName"
                    style="display:flex; align-items:center; gap:1px; flex-shrink:0;">
                <span :title="'Hangs from: ' + bone.physicsParentName"
                      style="font-size:9px; opacity:0.4; max-width:64px;
                             overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                  \u2191{{ bone.physicsParentName }}
                </span>
                <button @click.stop="unlinkBone(bone)"
                        title="Disconnect from parent"
                        style="background:transparent; border:none; cursor:pointer; padding:0 2px;
                               font-size:11px; line-height:1; color:rgba(255,80,80,0.55); min-height:0;">\u2715</button>
              </span>

              <button @click="toggleRigid(bone)"
                      :title="bone.rigid ? 'Rigid \u2014 follows parent, no physics. Click to enable physics.' : 'Physics \u2014 click to make rigid (follows parent, no physics)'"
                      :style="{
                        flex: '0 0 16px', width: '16px', height: '16px',
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        padding: '0', margin: '0', minWidth: '0', minHeight: '0',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        opacity: bone.rigid ? 0.9 : 0.35,
                      }">
                <i class="material-icons" style="font-size: 14px; line-height: 1;">{{ bone.rigid ? 'lock' : 'lock_open' }}</i>
              </button>
            </div>

            <!-- row 2: weight slider (physics bones only) -->
            <div v-if="!bone.rigid"
                 style="display:flex; align-items:center; gap:6px; padding-left:10px;">
              <input type="range" v-model.number="bone.weight" @change="persist"
                     min="0" max="2" step="0.05"
                     :style="{
                       flex: '1', height: '12px', cursor: 'pointer',
                       accentColor: weightColor(bone.weight),
                     }">
              <span style="flex:0 0 32px; font-size:10px; font-family:monospace;
                           text-align:right; opacity:0.65;">
                {{ Number(bone.weight).toFixed(2) }}
              </span>
            </div>

          </div>
        </div>

        <!-- \u2500\u2500 footer \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 -->
        <div style="display:flex; gap:6px; padding:8px 10px 12px;
                    border-top:1px solid rgba(255,255,255,0.08);">
          <button class="material-button" @click="save"
                  style="flex:1; padding:6px 0; font-size:11px; font-weight:600;">
            Save
          </button>
          <button class="material-button" @click="exportYaml"
                  style="flex:1; padding:6px 0; font-size:11px;">
            Export .yml
          </button>
        </div>

      </div>
    `
    };
  }
  function patchOutlinerForRagdoll() {
    const outliner = (typeof Panels !== "undefined" ? Panels : window.Panels)?.outliner;
    if (!outliner || "_animorph_orig_cond" in outliner)
      return;
    const orig = outliner.condition;
    outliner._animorph_orig_cond = orig;
    if (orig && typeof orig === "object" && Array.isArray(orig.modes)) {
      outliner.condition = { ...orig, modes: [...orig.modes, MODE_ID] };
    } else if (typeof orig === "function") {
      outliner.condition = () => Modes.id === MODE_ID || orig();
    } else {
      outliner.condition = { modes: ["edit", "paint", "animate", "vertex_paint", MODE_ID] };
    }
  }
  function restoreOutliner() {
    const outliner = (typeof Panels !== "undefined" ? Panels : window.Panels)?.outliner;
    if (!outliner || !("_animorph_orig_cond" in outliner))
      return;
    outliner.condition = outliner._animorph_orig_cond;
    delete outliner._animorph_orig_cond;
  }
  var RAGDOLL_HIDDEN_TYPES = ["cube", "mesh", "locator", "null_object", "texture_mesh"];
  function applyOutlinerFilter() {
    if (!ragdollMode)
      return;
    ragdollMode.hidden_node_types = RAGDOLL_HIDDEN_TYPES;
    (typeof Outliner !== "undefined" ? Outliner : window.Outliner)?.updateNodeDisplayRules?.();
  }
  function removeOutlinerFilter() {
    if (!ragdollMode)
      return;
    delete ragdollMode.hidden_node_types;
    (typeof Outliner !== "undefined" ? Outliner : window.Outliner)?.updateNodeDisplayRules?.();
  }
  function onOutlinerSelectionChange() {
    if (Modes.id !== MODE_ID) {
      hidePivotMarker();
      return;
    }
    const BB_Group = typeof Group !== "undefined" ? Group : window.Group;
    const sel = BB_Group?.selected;
    const first = Array.isArray(sel) ? sel.find((g) => g?.type === "group") : null;
    showPivotMarker(first?.name ?? null);
  }
  function registerRagdollPanel() {
    if (!ragdollSetting) {
      ragdollSetting = new Setting(SETTING_RAGDOLL_ENABLED, {
        id: SETTING_RAGDOLL_ENABLED,
        name: "Ragdoll Tab",
        description: "Show the Ragdoll mode tab in the mode bar.",
        category: "animorph",
        value: true,
        plugin: PLUGIN_ID,
        onChange(value) {
          if (value)
            setupRagdollPanel();
          else
            teardownRagdollPanel();
        }
      });
    }
    if (settings[SETTING_RAGDOLL_ENABLED]?.value !== false)
      setupRagdollPanel();
  }
  function setupRagdollPanel() {
    if (ragdollMode)
      return;
    ragdollMode = new Mode({
      id: MODE_ID,
      name: "Ragdoll",
      icon: "accessibility_new",
      onSelect: safeModeHook("Ragdoll onSelect", () => {
        if (ragdollPanel?.vue)
          ragdollPanel.vue.reload();
        applyOutlinerFilter();
        Blockbench.on("update_selection", onOutlinerSelectionChange);
      }),
      onUnselect: safeModeHook("Ragdoll onUnselect", () => {
        Blockbench.removeListener("update_selection", onOutlinerSelectionChange);
        hidePivotMarker();
        removeOutlinerFilter();
        stopPreview();
        stopEditor();
        if (ragdollPanel?.vue) {
          ragdollPanel.vue.isPreviewing = false;
          ragdollPanel.vue.editorSelectedBone = null;
        }
      })
    });
    ragdollPanel = new Panel({
      id: "animorph_ragdoll_config",
      name: "Ragdoll Config",
      icon: "accessibility_new",
      condition: { modes: [MODE_ID] },
      default_side: "left",
      expand_button: false,
      growable: true,
      default_position: {
        slot: "left_bar",
        height: 700
      },
      component: makePanelComponent2()
    });
    patchOutlinerForRagdoll();
    Modes.vue?.$forceUpdate?.();
  }
  function openRagdollPanel() {
    if (!ragdollMode) {
      Blockbench.showQuickMessage("Ragdoll tab is disabled \u2014 enable it in Preferences", 2500);
      return;
    }
    if (typeof Modes !== "undefined")
      Modes.set(MODE_ID);
  }
  function teardownRagdollPanel() {
    if (!ragdollMode)
      return;
    if (typeof Modes !== "undefined" && Modes.id === MODE_ID)
      Modes.set("edit");
    Blockbench.removeListener("update_selection", onOutlinerSelectionChange);
    hidePivotMarker();
    stopPreview();
    stopEditor();
    removeOutlinerFilter();
    restoreOutliner();
    ragdollPanel?.delete();
    ragdollPanel = null;
    ragdollMode?.delete();
    ragdollMode = null;
    Modes.vue?.$forceUpdate?.();
  }
  function unregisterRagdollPanel() {
    teardownRagdollPanel();
    settings[SETTING_RAGDOLL_ENABLED]?.delete();
    ragdollSetting = null;
  }

  // src/ragdoll-config/index.ts
  var ragdollAction = null;
  function registerRagdollConfig() {
    registerRagdollPanel();
    ragdollAction = new Action("animorph_ragdoll_config", {
      name: "Ragdoll Config",
      icon: "accessibility_new",
      description: "Configure per-bone ragdoll physics with live viewport preview",
      click() {
        openRagdollPanel();
      }
    });
  }
  function unregisterRagdollConfig() {
    stopPreview();
    unregisterRagdollPanel();
    if (ragdollAction) {
      ragdollAction.delete();
      ragdollAction = null;
    }
  }
  function getRagdollConfigAction() {
    return ragdollAction;
  }

  // src/hitbox-generator/preview.ts
  function T7() {
    return window.THREE;
  }
  function getScene6() {
    return window.Preview?.selected?.scene ?? window.scene;
  }
  function getCamera3() {
    return window.Preview?.selected?.camera;
  }
  function getCanvas3() {
    const p = window.Preview?.selected;
    return p?.canvas ?? document.querySelector("#preview canvas");
  }
  var sceneRef = null;
  var boxObj = null;
  var eyeObj = null;
  var handleW = null;
  var handleH = null;
  var handleE = null;
  var handleGeo = null;
  var currentPose = { width: 9.6, height: 28.8, eyeHeight: 25.92 };
  var onChange = null;
  var dragging = null;
  var lastMX2 = 0;
  var lastMY2 = 0;
  var onMouseDown = null;
  var onMouseMove = null;
  var onMouseUp = null;
  var HANDLE_R = 1.5;
  var DRAG_SCALE2 = 6e-3;
  var PICK_RADIUS = 20;
  function buildBoxPositions(W, H) {
    const hw = W / 2;
    return new Float32Array([
      // bottom square
      -hw,
      0,
      -hw,
      hw,
      0,
      -hw,
      hw,
      0,
      -hw,
      hw,
      0,
      hw,
      hw,
      0,
      hw,
      -hw,
      0,
      hw,
      -hw,
      0,
      hw,
      -hw,
      0,
      -hw,
      // top square
      -hw,
      H,
      -hw,
      hw,
      H,
      -hw,
      hw,
      H,
      -hw,
      hw,
      H,
      hw,
      hw,
      H,
      hw,
      -hw,
      H,
      hw,
      -hw,
      H,
      hw,
      -hw,
      H,
      -hw,
      // verticals
      -hw,
      0,
      -hw,
      -hw,
      H,
      -hw,
      hw,
      0,
      -hw,
      hw,
      H,
      -hw,
      hw,
      0,
      hw,
      hw,
      H,
      hw,
      -hw,
      0,
      hw,
      -hw,
      H,
      hw
    ]);
  }
  function buildEyePositions(W, eyeH) {
    const hw = W / 2;
    return new Float32Array([
      // cross
      -hw,
      eyeH,
      0,
      hw,
      eyeH,
      0,
      0,
      eyeH,
      -hw,
      0,
      eyeH,
      hw,
      // perimeter
      -hw,
      eyeH,
      -hw,
      hw,
      eyeH,
      -hw,
      hw,
      eyeH,
      -hw,
      hw,
      eyeH,
      hw,
      hw,
      eyeH,
      hw,
      -hw,
      eyeH,
      hw,
      -hw,
      eyeH,
      hw,
      -hw,
      eyeH,
      -hw
    ]);
  }
  function posW(p) {
    return { x: p.width / 2 + HANDLE_R * 2, y: p.height / 2, z: 0 };
  }
  function posH(p) {
    return { x: 0, y: p.height + HANDLE_R * 2, z: 0 };
  }
  function posE(p) {
    return { x: p.width / 2 + HANDLE_R * 2, y: p.eyeHeight, z: 0 };
  }
  function makeLinesObj(positions, color, opacity) {
    const TH = T7();
    if (!TH)
      return null;
    const geo = new TH.BufferGeometry();
    geo.setAttribute("position", new TH.BufferAttribute(positions, 3));
    const obj = new TH.LineSegments(
      geo,
      new TH.LineBasicMaterial({ color, depthTest: false, transparent: true, opacity })
    );
    obj.renderOrder = 999;
    return obj;
  }
  function makeHandleSphere(color) {
    const TH = T7();
    if (!TH)
      return null;
    const SphereGeo = TH.SphereGeometry ?? TH.SphereBufferGeometry;
    if (!handleGeo)
      handleGeo = new SphereGeo(HANDLE_R, 8, 6);
    return new TH.Mesh(
      handleGeo,
      new TH.MeshBasicMaterial({ color, depthTest: false, transparent: true, opacity: 0.85 })
    );
  }
  function inCanvas2(e) {
    const c = getCanvas3();
    if (!c)
      return false;
    const r = c.getBoundingClientRect();
    return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
  }
  function pickHandle(e) {
    const TH = T7();
    const cam = getCamera3();
    const canvas = getCanvas3();
    if (!TH || !cam || !canvas)
      return null;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const candidates = [
      ["width", handleW],
      ["height", handleH],
      ["eyeHeight", handleE]
    ];
    let best = null;
    let bestDist = PICK_RADIUS;
    for (const [target, obj] of candidates) {
      if (!obj)
        continue;
      const tmp = obj.position.clone().project(cam);
      if (tmp.z > 1)
        continue;
      const sx = (tmp.x + 1) / 2 * rect.width;
      const sy = (1 - tmp.y) / 2 * rect.height;
      const d = Math.hypot(mx - sx, my - sy);
      if (d < bestDist) {
        bestDist = d;
        best = target;
      }
    }
    return best;
  }
  function screenToWorldDelta(dx, dy) {
    const TH = T7();
    const cam = getCamera3();
    if (!TH || !cam)
      return { x: 0, y: 0 };
    const dist = cam.position.length() || 100;
    const scale = dist * DRAG_SCALE2;
    const right = new TH.Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
    const up = new TH.Vector3().setFromMatrixColumn(cam.matrixWorld, 1);
    return {
      x: (right.x * dx - up.x * dy) * scale,
      y: (right.y * dx - up.y * dy) * scale
    };
  }
  function addToScene(obj) {
    if (sceneRef && obj)
      sceneRef.add(obj);
  }
  function removeFromScene(obj) {
    if (sceneRef && obj)
      sceneRef.remove(obj);
  }
  function applyHandlePositions(p) {
    const pw = posW(p), ph = posH(p), pe = posE(p);
    if (handleW)
      handleW.position.set(pw.x, pw.y, pw.z);
    if (handleH)
      handleH.position.set(ph.x, ph.y, ph.z);
    if (handleE)
      handleE.position.set(pe.x, pe.y, pe.z);
  }
  function installMouse2() {
    onMouseDown = (e) => {
      if (!inCanvas2(e))
        return;
      const hit = pickHandle(e);
      if (!hit)
        return;
      dragging = hit;
      lastMX2 = e.clientX;
      lastMY2 = e.clientY;
      e.stopPropagation();
    };
    onMouseMove = (e) => {
      const canvas = getCanvas3();
      if (canvas && !dragging) {
        const hit = pickHandle(e);
        canvas.style.cursor = hit === "width" ? "ew-resize" : hit ? "ns-resize" : "";
      }
      if (!dragging)
        return;
      e.stopPropagation();
      const dx = e.clientX - lastMX2;
      const dy = e.clientY - lastMY2;
      lastMX2 = e.clientX;
      lastMY2 = e.clientY;
      const w = screenToWorldDelta(dx, dy);
      const p = { ...currentPose };
      if (dragging === "width") {
        p.width = Math.max(1, r22(p.width + w.x * 2));
      } else if (dragging === "height") {
        p.height = Math.max(1, r22(p.height + w.y));
      } else if (dragging === "eyeHeight") {
        p.eyeHeight = Math.max(0, r22(p.eyeHeight + w.y));
      }
      currentPose = p;
      _applyPoseToScene(p);
      onChange?.(dragging, p[dragging]);
    };
    onMouseUp = (e) => {
      if (dragging)
        e.stopPropagation();
      dragging = null;
      const canvas = getCanvas3();
      if (canvas)
        canvas.style.cursor = "";
    };
    document.addEventListener("mousedown", onMouseDown, true);
    document.addEventListener("mousemove", onMouseMove, true);
    document.addEventListener("mouseup", onMouseUp, true);
  }
  function removeMouse2() {
    if (onMouseDown)
      document.removeEventListener("mousedown", onMouseDown, true);
    if (onMouseMove)
      document.removeEventListener("mousemove", onMouseMove, true);
    if (onMouseUp)
      document.removeEventListener("mouseup", onMouseUp, true);
    onMouseDown = onMouseMove = onMouseUp = null;
    const canvas = getCanvas3();
    if (canvas)
      canvas.style.cursor = "";
  }
  function r22(n) {
    return Math.round(n * 100) / 100;
  }
  function _applyPoseToScene(p) {
    if (boxObj) {
      const pos = buildBoxPositions(p.width, p.height);
      boxObj.geometry.attributes.position.array.set(pos);
      boxObj.geometry.attributes.position.needsUpdate = true;
    }
    if (eyeObj) {
      const pos = buildEyePositions(p.width, p.eyeHeight);
      eyeObj.geometry.attributes.position.array.set(pos);
      eyeObj.geometry.attributes.position.needsUpdate = true;
    }
    applyHandlePositions(p);
  }
  function showPreview(pose, onDrag) {
    hidePreview();
    const scene = getScene6();
    const TH = T7();
    if (!scene || !TH)
      return;
    sceneRef = scene;
    currentPose = { ...pose };
    onChange = onDrag;
    boxObj = makeLinesObj(buildBoxPositions(pose.width, pose.height), 4906624, 0.75);
    eyeObj = makeLinesObj(buildEyePositions(pose.width, pose.eyeHeight), 16498468, 0.9);
    handleW = makeHandleSphere(6333946);
    handleH = makeHandleSphere(4906624);
    handleE = makeHandleSphere(16498468);
    applyHandlePositions(pose);
    if (handleW)
      handleW.renderOrder = 1001;
    if (handleH)
      handleH.renderOrder = 1001;
    if (handleE)
      handleE.renderOrder = 1001;
    addToScene(boxObj);
    addToScene(eyeObj);
    addToScene(handleW);
    addToScene(handleH);
    addToScene(handleE);
    installMouse2();
  }
  function updatePreview(pose) {
    currentPose = { ...pose };
    if (!boxObj)
      return;
    _applyPoseToScene(pose);
  }
  function hidePreview() {
    removeMouse2();
    removeFromScene(boxObj);
    removeFromScene(eyeObj);
    removeFromScene(handleW);
    removeFromScene(handleH);
    removeFromScene(handleE);
    boxObj?.geometry?.dispose();
    eyeObj?.geometry?.dispose();
    boxObj = eyeObj = handleW = handleH = handleE = sceneRef = null;
    onChange = null;
    dragging = null;
  }
  var refSceneRef = null;
  var refBoxObj = null;
  var refHandleW = null;
  var refHandleH = null;
  var refDragging = null;
  var refLastMX = 0;
  var refLastMY = 0;
  var refW = 9.6;
  var refH = 28.8;
  var onRefChange = null;
  var onRefDown = null;
  var onRefMove = null;
  var onRefUp = null;
  function pickRefHandle(e) {
    const TH = T7();
    const cam = getCamera3();
    const canvas = getCanvas3();
    if (!TH || !cam || !canvas)
      return null;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const tmp = new TH.Vector3();
    let best = null;
    let bestDist = PICK_RADIUS;
    for (const [target, obj] of [["width", refHandleW], ["height", refHandleH]]) {
      if (!obj)
        continue;
      tmp.copy(obj.position).project(cam);
      if (tmp.z > 1)
        continue;
      const sx = (tmp.x + 1) / 2 * rect.width;
      const sy = (1 - tmp.y) / 2 * rect.height;
      const d = Math.hypot(mx - sx, my - sy);
      if (d < bestDist) {
        bestDist = d;
        best = target;
      }
    }
    return best;
  }
  function applyRefHandlePositions() {
    const hw = refW / 2;
    if (refHandleW)
      refHandleW.position.set(hw + HANDLE_R * 2, refH / 2, 0);
    if (refHandleH)
      refHandleH.position.set(0, refH + HANDLE_R * 2, 0);
  }
  function applyRefBoxGeometry() {
    if (!refBoxObj)
      return;
    const pos = buildBoxPositions(refW, refH);
    refBoxObj.geometry.attributes.position.array.set(pos);
    refBoxObj.geometry.attributes.position.needsUpdate = true;
    applyRefHandlePositions();
  }
  function installRefMouse() {
    onRefDown = (e) => {
      if (!inCanvas2(e))
        return;
      const hit = pickRefHandle(e);
      if (!hit)
        return;
      refDragging = hit;
      refLastMX = e.clientX;
      refLastMY = e.clientY;
      e.stopPropagation();
    };
    onRefMove = (e) => {
      const canvas = getCanvas3();
      if (canvas && !refDragging) {
        const hit = pickRefHandle(e);
        canvas.style.cursor = hit === "width" ? "ew-resize" : hit === "height" ? "ns-resize" : "";
      }
      if (!refDragging)
        return;
      e.stopPropagation();
      const dx = e.clientX - refLastMX;
      const dy = e.clientY - refLastMY;
      refLastMX = e.clientX;
      refLastMY = e.clientY;
      const w = screenToWorldDelta(dx, dy);
      if (refDragging === "width")
        refW = Math.max(1, r22(refW + w.x * 2));
      if (refDragging === "height")
        refH = Math.max(1, r22(refH + w.y));
      applyRefBoxGeometry();
      onRefChange?.(refDragging, refDragging === "width" ? refW : refH);
    };
    onRefUp = (e) => {
      if (refDragging)
        e.stopPropagation();
      refDragging = null;
      const canvas = getCanvas3();
      if (canvas)
        canvas.style.cursor = "";
    };
    document.addEventListener("mousedown", onRefDown, true);
    document.addEventListener("mousemove", onRefMove, true);
    document.addEventListener("mouseup", onRefUp, true);
  }
  function removeRefMouse() {
    if (onRefDown)
      document.removeEventListener("mousedown", onRefDown, true);
    if (onRefMove)
      document.removeEventListener("mousemove", onRefMove, true);
    if (onRefUp)
      document.removeEventListener("mouseup", onRefUp, true);
    onRefDown = onRefMove = onRefUp = null;
    const canvas = getCanvas3();
    if (canvas)
      canvas.style.cursor = "";
  }
  function showReferenceBox(w, h, onDrag) {
    hideReferenceBox();
    const scene = getScene6();
    const TH = T7();
    if (!scene || !TH)
      return;
    refSceneRef = scene;
    refW = w;
    refH = h;
    onRefChange = onDrag;
    refBoxObj = makeLinesObj(buildBoxPositions(w, h), 16777215, 0.5);
    refHandleW = makeHandleSphere(16777215);
    refHandleH = makeHandleSphere(16777215);
    applyRefHandlePositions();
    if (refBoxObj)
      refBoxObj.renderOrder = 998;
    if (refHandleW)
      refHandleW.renderOrder = 1001;
    if (refHandleH)
      refHandleH.renderOrder = 1001;
    scene.add(refBoxObj);
    scene.add(refHandleW);
    scene.add(refHandleH);
    installRefMouse();
  }
  function hideReferenceBox() {
    removeRefMouse();
    if (refSceneRef) {
      if (refBoxObj)
        refSceneRef.remove(refBoxObj);
      if (refHandleW)
        refSceneRef.remove(refHandleW);
      if (refHandleH)
        refSceneRef.remove(refHandleH);
    }
    refBoxObj?.geometry?.dispose();
    refBoxObj = refHandleW = refHandleH = refSceneRef = null;
    onRefChange = null;
    refDragging = null;
  }

  // src/hitbox-generator/panel.ts
  var MODE_ID2 = "animorph_hitbox";
  var DEFAULT_W = 9.6;
  var DEFAULT_H = 28.8;
  var DEFAULT_EYE_RATIO = 0.9;
  var hitboxMode = null;
  var hitboxPanel = null;
  var hitboxSetting = null;
  function r23(n) {
    return Math.round(n * 100) / 100;
  }
  function initialPoses() {
    return computeDefaultPoses(DEFAULT_W, DEFAULT_H, DEFAULT_EYE_RATIO);
  }
  function isHitboxModeActive() {
    try {
      return Modes?.id === MODE_ID2;
    } catch {
      return false;
    }
  }
  function makePanelComponent3() {
    return {
      name: "animorph-hitbox-panel",
      data() {
        const poses = initialPoses();
        return {
          baseWidth: DEFAULT_W,
          baseHeight: DEFAULT_H,
          eyeRatio: DEFAULT_EYE_RATIO,
          activePose: "standing",
          poseKeys: ALL_POSES,
          isEditingBase: false,
          poses: Object.fromEntries(
            ALL_POSES.map((k) => [k, { ...poses[k] }])
          )
        };
      },
      // Do NOT call refreshPreview in mounted — the panel component may be mounted
      // even when the mode is not active. Preview is driven by Mode.onSelect/onUnselect.
      beforeDestroy() {
        hidePreview();
      },
      computed: {
        current() {
          return this.poses[this.activePose];
        },
        currentBlocks() {
          const c = this.current;
          return {
            w: r23(c.width / 16).toFixed(3),
            h: r23(c.height / 16).toFixed(3),
            eye: r23(c.eyeHeight / 16).toFixed(3)
          };
        }
      },
      methods: {
        selectPose(key) {
          this.activePose = key;
          if (isHitboxModeActive())
            updatePreview(this.current);
        },
        // Called by Mode.onSelect so the preview appears exactly when entering the mode.
        showPreviewForCurrent() {
          const vm = this;
          showPreview(vm.current, (field, value) => {
            vm.poses[vm.activePose][field] = value;
          });
        },
        onValueChange() {
          if (isHitboxModeActive())
            updatePreview(this.current);
        },
        startEditBase() {
          const vm = this;
          vm.isEditingBase = true;
          hidePreview();
          showReferenceBox(vm.baseWidth, vm.baseHeight, (field, value) => {
            if (field === "width")
              vm.baseWidth = value;
            if (field === "height")
              vm.baseHeight = value;
          });
        },
        applyBase() {
          const vm = this;
          vm.isEditingBase = false;
          hideReferenceBox();
          vm.recalculate();
          vm.showPreviewForCurrent();
        },
        cancelEditBase() {
          const vm = this;
          vm.isEditingBase = false;
          hideReferenceBox();
          vm.showPreviewForCurrent();
        },
        recalculate() {
          const w = parseFloat(this.baseWidth) || DEFAULT_W;
          const h = parseFloat(this.baseHeight) || DEFAULT_H;
          const r = Math.min(1, Math.max(0.01, parseFloat(this.eyeRatio) || DEFAULT_EYE_RATIO));
          const computed = computeDefaultPoses(w, h, r);
          for (const key of ALL_POSES) {
            this.poses[key].width = computed[key].width;
            this.poses[key].height = computed[key].height;
            this.poses[key].eyeHeight = computed[key].eyeHeight;
          }
          if (isHitboxModeActive() && !this.isEditingBase)
            updatePreview(this.current);
        },
        exportPose(key) {
          const cfg = this.poses[key];
          Blockbench.export({
            type: "text",
            extensions: ["geo.json"],
            content: generateHitboxGeo(cfg),
            name: key
          });
        },
        exportAll() {
          for (const key of ALL_POSES) {
            this.exportPose(key);
          }
        },
        isSyncConnected() {
          try {
            return getSyncConnection().isConnected();
          } catch {
            return false;
          }
        },
        resolvedHitboxSyncPath() {
          try {
            return resolvePathForType(getSafeProjectConfig(), "hitbox");
          } catch {
            return "hitboxes";
          }
        },
        syncHitboxes() {
          getSyncManager().syncHitboxes(this.poses);
        },
        resetToVanilla() {
          const vm = this;
          vm.baseWidth = DEFAULT_W;
          vm.baseHeight = DEFAULT_H;
          vm.eyeRatio = DEFAULT_EYE_RATIO;
          vm.recalculate();
        }
      },
      template: `
      <div style="display:flex; flex-direction:column; height:100%; font-size:12px;">

        <!-- \u2500\u2500 Pose tabs \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 -->
        <div style="display:flex; flex-wrap:wrap; gap:3px; padding:8px 10px 6px;
                    border-bottom:1px solid rgba(255,255,255,0.08);"
             :style="isEditingBase ? { opacity: '0.35', pointerEvents: 'none' } : {}">
          <button
            v-for="key in poseKeys" :key="key"
            @click="selectPose(key)"
            :style="{
              fontSize: '10px',
              padding: '3px 7px',
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer',
              background: activePose === key ? 'var(--color-accent)' : 'rgba(255,255,255,0.07)',
              color: activePose === key ? '#000' : 'inherit',
              fontWeight: activePose === key ? '700' : '400',
            }">
            {{ key.replace('_', ' ') }}
          </button>
        </div>

        <!-- \u2500\u2500 Current pose \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 -->
        <div style="padding:10px 10px 6px;">
          <div style="font-weight:600; font-size:11px; color:var(--color-accent); margin-bottom:8px; text-transform:uppercase; letter-spacing:0.05em;">
            {{ activePose.replace('_', ' ') }}
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:6px; margin-bottom:4px;">
            <div>
              <label style="font-size:10px; opacity:0.6; display:block; margin-bottom:2px;">Width (px)</label>
              <input type="number" class="dark_bordered"
                v-model.number="poses[activePose].width"
                step="0.1" min="0.1"
                @input="onValueChange"
                style="width:100%; box-sizing:border-box; font-size:11px;">
            </div>
            <div>
              <label style="font-size:10px; opacity:0.6; display:block; margin-bottom:2px;">Height (px)</label>
              <input type="number" class="dark_bordered"
                v-model.number="poses[activePose].height"
                step="0.1" min="0.1"
                @input="onValueChange"
                style="width:100%; box-sizing:border-box; font-size:11px;">
            </div>
            <div>
              <label style="font-size:10px; opacity:0.6; display:block; margin-bottom:2px;">Eye Y (px)</label>
              <input type="number" class="dark_bordered"
                v-model.number="poses[activePose].eyeHeight"
                step="0.1" min="0"
                @input="onValueChange"
                style="width:100%; box-sizing:border-box; font-size:11px;">
            </div>
          </div>

          <!-- blocks conversion -->
          <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:6px; margin-bottom:8px;">
            <div style="font-size:9px; opacity:0.35; text-align:center;">{{ currentBlocks.w }} blk</div>
            <div style="font-size:9px; opacity:0.35; text-align:center;">{{ currentBlocks.h }} blk</div>
            <div style="font-size:9px; opacity:0.35; text-align:center;">{{ currentBlocks.eye }} blk</div>
          </div>

          <!-- legend -->
          <div style="display:flex; gap:10px; font-size:9px; opacity:0.45; margin-bottom:2px;">
            <span><span style="color:#4ade80;">\u25A0</span> hitbox volume</span>
            <span><span style="color:#fbbf24;">\u25A0</span> eye height</span>
          </div>
        </div>

        <!-- \u2500\u2500 Base dimensions \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 -->
        <div style="border-top:1px solid rgba(255,255,255,0.08); padding:10px;">

          <!-- header -->
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
            <div style="font-weight:600; font-size:11px; text-transform:uppercase; letter-spacing:0.05em;"
                 :style="{ color: isEditingBase ? '#fbbf24' : 'rgba(255,255,255,0.6)' }">
              {{ isEditingBase ? '\u25C8 Setting reference\u2026' : 'Base (standing)' }}
            </div>
          </div>

          <!-- editing base: compact live readout + confirm/cancel -->
          <div v-if="isEditingBase">
            <div style="font-size:10px; opacity:0.5; margin-bottom:10px; line-height:1.6;">
              Drag the <span style="color:#fff;">white</span> handles in the viewport to set the reference width and height.<br>
              When ready, click <strong>Generate</strong> to compute all 7 poses.
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-bottom:10px;">
              <div style="background:rgba(255,255,255,0.05); border-radius:4px; padding:6px 8px; text-align:center;">
                <div style="font-size:9px; opacity:0.5; margin-bottom:2px;">Width</div>
                <div style="font-size:14px; font-weight:700; font-family:monospace;">{{ baseWidth }} px</div>
                <div style="font-size:9px; opacity:0.35;">{{ (baseWidth/16).toFixed(3) }} blk</div>
              </div>
              <div style="background:rgba(255,255,255,0.05); border-radius:4px; padding:6px 8px; text-align:center;">
                <div style="font-size:9px; opacity:0.5; margin-bottom:2px;">Height</div>
                <div style="font-size:14px; font-weight:700; font-family:monospace;">{{ baseHeight }} px</div>
                <div style="font-size:9px; opacity:0.35;">{{ (baseHeight/16).toFixed(3) }} blk</div>
              </div>
            </div>
            <div style="display:grid; grid-template-columns:1fr; gap:6px; margin-bottom:6px;">
              <div>
                <label style="font-size:10px; opacity:0.6; display:block; margin-bottom:2px;">Eye height ratio</label>
                <input type="number" class="dark_bordered"
                  v-model.number="eyeRatio"
                  step="0.01" min="0.01" max="1"
                  style="width:100%; box-sizing:border-box; font-size:11px;">
              </div>
            </div>
            <div style="display:flex; gap:6px; margin-top:8px;">
              <button class="material-button" @click="applyBase"
                style="flex:2; padding:6px 0; font-size:11px; font-weight:700; cursor:pointer; background:var(--color-accent); color:#000;">
                \u2713 Generate all poses
              </button>
              <button class="material-button" @click="cancelEditBase"
                style="flex:1; padding:6px 0; font-size:11px; cursor:pointer;">
                Cancel
              </button>
            </div>
          </div>

          <!-- normal mode: show current base values + edit button -->
          <div v-else>
            <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:6px; margin-bottom:8px;">
              <div>
                <label style="font-size:10px; opacity:0.6; display:block; margin-bottom:2px;">Width</label>
                <input type="number" class="dark_bordered"
                  v-model.number="baseWidth"
                  step="0.1" min="0.1"
                  style="width:100%; box-sizing:border-box; font-size:11px;">
              </div>
              <div>
                <label style="font-size:10px; opacity:0.6; display:block; margin-bottom:2px;">Height</label>
                <input type="number" class="dark_bordered"
                  v-model.number="baseHeight"
                  step="0.1" min="0.1"
                  style="width:100%; box-sizing:border-box; font-size:11px;">
              </div>
              <div>
                <label title="Eye height \xF7 standing height. Vanilla MC player = 0.9 (eyes at 90% of total height)."
                       style="font-size:10px; opacity:0.6; display:block; margin-bottom:2px; cursor:help;">
                  Eye ratio \u24D8
                </label>
                <input type="number" class="dark_bordered"
                  v-model.number="eyeRatio"
                  step="0.01" min="0.01" max="1"
                  style="width:100%; box-sizing:border-box; font-size:11px;">
              </div>
            </div>
            <div style="display:flex; gap:6px; margin-bottom:6px;">
              <button class="material-button" @click="startEditBase"
                style="flex:1; padding:5px 0; font-size:11px; cursor:pointer;">
                \u25C8 Set reference in viewport
              </button>
              <button class="material-button" @click="recalculate"
                style="flex:1; padding:5px 0; font-size:11px; cursor:pointer;">
                \u21BA Recalculate all
              </button>
            </div>
            <button class="material-button" @click="resetToVanilla"
              style="width:100%; padding:5px 0; font-size:10px; cursor:pointer; opacity:0.6;">
              \u21BA Reset to vanilla MC player
            </button>
          </div>

        </div>

        <!-- \u2500\u2500 Export \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 -->
        <div style="border-top:1px solid rgba(255,255,255,0.08); padding:10px 10px 12px; margin-top:auto;">
          <div style="display:flex; gap:6px; margin-bottom:6px;">
            <button class="material-button" @click="exportPose(activePose)"
              style="flex:1; padding:6px 0; font-size:11px; font-weight:600;">
              Export pose
            </button>
            <button class="material-button" @click="exportAll"
              style="flex:1; padding:6px 0; font-size:11px;">
              Export all (7)
            </button>
          </div>
          <button class="material-button" @click="syncHitboxes"
            :disabled="!isSyncConnected()"
            :title="isSyncConnected() ? ('Sync all 7 poses \u2192 models/' + resolvedHitboxSyncPath() + '/') : 'Not connected to Minecraft'"
            :style="{
              width: '100%',
              padding: '6px 0',
              fontSize: '11px',
              cursor: isSyncConnected() ? 'pointer' : 'not-allowed',
              opacity: isSyncConnected() ? '1' : '0.35',
            }">
            \u21E1 Sync to Minecraft
          </button>
        </div>

      </div>
    `
    };
  }
  function registerHitboxPanel() {
    if (!hitboxSetting) {
      hitboxSetting = new Setting(SETTING_HITBOX_ENABLED, {
        id: SETTING_HITBOX_ENABLED,
        name: "Hitbox Tab",
        description: "Show the Hitbox mode tab in the mode bar.",
        category: "animorph",
        value: true,
        plugin: PLUGIN_ID,
        onChange(value) {
          if (value)
            setupHitboxPanel();
          else
            teardownHitboxPanel();
        }
      });
    }
    if (settings[SETTING_HITBOX_ENABLED]?.value !== false)
      setupHitboxPanel();
  }
  function setupHitboxPanel() {
    if (hitboxMode)
      return;
    hitboxMode = new Mode({
      id: MODE_ID2,
      name: "Hitbox",
      icon: "crop_free",
      onSelect: safeModeHook("Hitbox onSelect", () => {
        const vue = hitboxPanel?.vue;
        if (vue)
          vue.showPreviewForCurrent();
      }),
      onUnselect: safeModeHook("Hitbox onUnselect", () => {
        hidePreview();
      })
    });
    hitboxPanel = new Panel({
      id: "animorph_hitbox_config",
      name: "Hitbox Generator",
      icon: "crop_free",
      condition: { modes: [MODE_ID2] },
      default_side: "left",
      expand_button: false,
      growable: true,
      default_position: {
        slot: "left_bar",
        height: 600
      },
      component: makePanelComponent3()
    });
    Modes.vue?.$forceUpdate?.();
  }
  function openHitboxMode() {
    if (!hitboxMode) {
      Blockbench.showQuickMessage("Hitbox tab is disabled \u2014 enable it in Preferences", 2500);
      return;
    }
    if (typeof Modes !== "undefined")
      Modes.set(MODE_ID2);
  }
  function teardownHitboxPanel() {
    if (!hitboxMode)
      return;
    if (typeof Modes !== "undefined" && Modes.id === MODE_ID2)
      Modes.set("edit");
    hidePreview();
    hitboxPanel?.delete();
    hitboxPanel = null;
    hitboxMode?.delete();
    hitboxMode = null;
    Modes.vue?.$forceUpdate?.();
  }
  function unregisterHitboxPanel() {
    teardownHitboxPanel();
    settings[SETTING_HITBOX_ENABLED]?.delete();
    hitboxSetting = null;
  }

  // src/hitbox-generator/index.ts
  var hitboxAction = null;
  function registerHitboxGenerator() {
    registerHitboxPanel();
    hitboxAction = new Action("animorph_hitbox_generator", {
      name: "Hitbox Generator",
      icon: "crop_free",
      description: "Generate hitbox .geo.json files with live viewport preview",
      click() {
        openHitboxMode();
      }
    });
  }
  function unregisterHitboxGenerator() {
    unregisterHitboxPanel();
    if (hitboxAction) {
      hitboxAction.delete();
      hitboxAction = null;
    }
  }

  // src/animations/clipboard.ts
  var animationClipboard = [];
  var copyAction = null;
  var pasteAction = null;
  function uniqueAnimName(base) {
    const existing = new Set(Animation.all.map((a) => a.name));
    if (!existing.has(base))
      return base;
    let i = 2;
    while (existing.has(`${base} (${i})`))
      i++;
    return `${base} (${i})`;
  }
  function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function getDialogRoot(dialog) {
    const el = dialog.object instanceof Element ? dialog.object : dialog.object?.[0];
    return el ?? document.querySelector(`[data-id="animorph_copy_animations_dialog"]`) ?? document.body;
  }
  function openCopyDialog() {
    const anims = Animation.all;
    if (anims.length === 0) {
      Blockbench.showQuickMessage("No animations to copy", 2e3);
      return;
    }
    const rows = anims.map(
      (anim) => `<div class="animclip-row" data-uuid="${anim.uuid}" style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
      <input type="checkbox" class="animclip-check" checked style="flex-shrink:0;margin:0;cursor:pointer">
      <input type="text" class="animclip-name" value="${escapeHtml(anim.name)}"
        style="flex:1;background:var(--color-input,#2a2a2a);border:1px solid var(--color-border,#444);
               color:var(--color-text,#eee);padding:3px 6px;border-radius:2px;font-size:13px">
    </div>`
    ).join("");
    const dialog = new Dialog({
      id: "animorph_copy_animations_dialog",
      title: "Copy Animations",
      lines: [
        `<div style="display:flex;gap:8px;margin-bottom:8px">
        <button class="btn animclip-select-all">Select All</button>
        <button class="btn animclip-select-none">Select None</button>
      </div>
      <div class="animclip-list" style="max-height:300px;overflow-y:auto;padding-right:4px">${rows}</div>`
      ],
      onConfirm() {
        const root = getDialogRoot(dialog);
        const selected = [];
        root.querySelectorAll(".animclip-row").forEach((row) => {
          const uuid = row.getAttribute("data-uuid");
          const check = row.querySelector(".animclip-check");
          const nameInput = row.querySelector(".animclip-name");
          if (!uuid || !check?.checked)
            return;
          const anim = anims.find((a) => a.uuid === uuid);
          if (anim)
            selected.push({ anim, name: nameInput?.value.trim() || anim.name });
        });
        if (selected.length === 0) {
          Blockbench.showQuickMessage("No animations selected", 2e3);
          return;
        }
        animationClipboard = selected.map(({ anim, name }) => {
          const copy = anim.getUndoCopy ? anim.getUndoCopy() : JSON.parse(JSON.stringify(anim));
          copy.name = name;
          return copy;
        });
        const count = animationClipboard.length;
        Blockbench.showQuickMessage(`Copied ${count} animation${count !== 1 ? "s" : ""}`, 2e3);
        debugLog(`[AnimClipboard] Copied ${count} animations`);
      }
    });
    dialog.show();
    requestAnimationFrame(() => {
      const root = getDialogRoot(dialog);
      const setAll = (value) => {
        root.querySelectorAll(".animclip-check").forEach((cb) => {
          cb.checked = value;
        });
      };
      root.querySelector(".animclip-select-all")?.addEventListener("click", () => setAll(true));
      root.querySelector(".animclip-select-none")?.addEventListener("click", () => setAll(false));
    });
  }
  function pasteAnimations() {
    if (animationClipboard.length === 0) {
      Blockbench.showQuickMessage("Clipboard is empty", 2e3);
      return;
    }
    const added = [];
    Undo.initEdit({ animations: added });
    for (const data of animationClipboard) {
      const name = uniqueAnimName(data.name || "animation");
      const anim = new Animation();
      anim.extend({ ...data, name }).add();
      added.push(anim);
    }
    Undo.finishEdit("Paste animations");
    const count = added.length;
    Blockbench.showQuickMessage(`Pasted ${count} animation${count !== 1 ? "s" : ""}`, 2e3);
    debugLog(`[AnimClipboard] Pasted ${count} animations`);
  }
  function registerAnimationClipboard() {
    copyAction = new Action("animorph_copy_animations", {
      name: "Copy Animations",
      icon: "content_copy",
      description: "Select and copy animations from this project to the Animorph clipboard",
      click: openCopyDialog
    });
    pasteAction = new Action("animorph_paste_animations", {
      name: "Paste Animations",
      icon: "content_paste",
      description: "Paste copied animations into the current project",
      click: pasteAnimations
    });
  }
  function unregisterAnimationClipboard() {
    if (copyAction) {
      copyAction.delete();
      copyAction = null;
    }
    if (pasteAction) {
      pasteAction.delete();
      pasteAction = null;
    }
    animationClipboard = [];
  }
  function getCopyAnimationsAction() {
    return copyAction;
  }
  function getPasteAnimationsAction() {
    return pasteAction;
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
    registerRagdollConfig();
    registerHitboxGenerator();
    registerAnimationClipboard();
    addToAnimorphMenu(getImportGltfAction());
    addToAnimorphMenu(new MenuSeparator("animorph_menu_sep_view"));
    addToAnimorphMenu(getJointsViewAction());
    addToAnimorphMenu(getFirstPersonViewAction());
    addToAnimorphMenu(getResetViewAction());
    addToAnimorphMenu(new MenuSeparator("animorph_menu_sep_config"));
    addToAnimorphMenu(getModelConfigAction());
    addToAnimorphMenu(getEmoteConfigMenuAction());
    addToAnimorphMenu(getRagdollConfigAction());
    addToAnimorphMenu(new MenuSeparator("animorph_menu_sep_sync"));
    addToAnimorphMenu(getSyncDialogAction());
    addToAnimorphMenu(new MenuSeparator("animorph_menu_sep_animations"));
    addToAnimorphMenu(getCopyAnimationsAction());
    addToAnimorphMenu(getPasteAnimationsAction());
    addToAnimorphMenu(getTabsMenuSeparator());
    addToAnimorphMenu(getTabsMenuAction());
    createAnimorphMenu();
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
    destroyAnimorphMenu();
    unregisterLayerActions();
    unregisterTextureLayerActions();
    unregisterEmoteConfig();
    unregisterModelConfig();
    cleanupSync();
    unregisterFirstPerson();
    unregisterCameraPreview();
    unregisterRagdollConfig();
    unregisterHitboxGenerator();
    unregisterAnimationClipboard();
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
