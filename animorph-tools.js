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
  var PLUGIN_VERSION = "1.0.0";
  var PROPERTY_NAME = "loop_start";
  var PROPERTY_DEFAULT = 0;
  var MARKER_ID = "timeline_loop_start_marker";
  var TOOLTIP_ID = "loop_start_tooltip";
  var MARKER_COLOR = "var(--color-accent)";
  var SETTING_NORMALIZED_UVS = "animorph_normalized_mesh_uvs";
  var SETTING_SKIP_NORMALS = "animorph_skip_mesh_normals";

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
  function interceptAnimationImport() {
    if (Animator && Animator.importFile) {
      debugLog("\u2713 Interceptando Animator.importFile");
      originalAnimationImport = Animator.importFile;
      Animator.importFile = function(file) {
        if (!isBedrockFormat()) {
          return originalAnimationImport.call(this, file);
        }
        debugLog("=== ANIMATOR IMPORT FILE (Bedrock/GeckoLib) ===");
        if (file && file.content) {
          try {
            const jsonContent = JSON.parse(file.content);
            window._tempAnimationJson = jsonContent;
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
  function restoreAnimationImport() {
    if (originalAnimationImport && Animator) {
      Animator.importFile = originalAnimationImport;
      debugLog("\u2713 Restaurado Animator.importFile");
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
    if (!isBedrockFormat())
      return;
    debugLog("=== PARSE BEDROCK LLAMADO ===");
    debugLog("  Animation:", data.animation?.name);
    debugLog("  loop_start en JSON:", data.json?.loop_start);
    if (data.json && data.json.loop_start !== void 0) {
      data.animation.loop_start = data.json.loop_start;
      debugLog(`\u2713 Loop start asignado: ${data.json.loop_start}s`);
      if (Animation.selected === data.animation) {
        updateLoopStartMarker();
      }
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
    const undoOptions = {
      outliner: true,
      elements: [],
      selection: true
    };
    Undo.initEdit(undoOptions);
    const cube = new Cube({
      name: data.name || "text_display",
      from: data.from || [-4, 0, -0.5],
      to: data.to || [4, 4, 0.5],
      origin: data.origin || [0, 0, 0],
      rotation: data.rotation || [0, 0, 0],
      visibility: true
    });
    cube.text_content = data.content ?? TEXT_DISPLAY_DEFAULT_CONTENT;
    cube.text_color = colorToHex(data.text_color ?? TEXT_DISPLAY_DEFAULT_COLOR);
    cube.text_background = colorToHex(data.background_color ?? TEXT_DISPLAY_DEFAULT_BACKGROUND);
    cube.text_background_enabled = data.background_enabled ?? TEXT_DISPLAY_DEFAULT_BACKGROUND_ENABLED;
    cube.text_alignment = data.alignment ?? TEXT_DISPLAY_DEFAULT_ALIGNMENT;
    cube.text_padding = data.padding ?? TEXT_DISPLAY_DEFAULT_PADDING;
    cube.is_text_display = true;
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
  function updateTextMeshFromCube(cube) {
    const mesh = textMeshes.get(cube.uuid);
    if (!mesh)
      return;
    mesh.visible = cube.visibility !== false;
    const from = cube.from || [0, 0, 0];
    const to = cube.to || [1, 1, 1];
    const rotation = cube.rotation || [0, 0, 0];
    const origin = cube.origin || [0, 0, 0];
    const sizeX = Math.abs(to[0] - from[0]);
    const sizeY = Math.abs(to[1] - from[1]);
    const centerX = (from[0] + to[0]) / 2;
    const centerY = (from[1] + to[1]) / 2;
    const centerZ = (from[2] + to[2]) / 2;
    mesh.scale.set(sizeX, sizeY, 1);
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
    mesh.position.set(
      origin[0] + pos.x,
      origin[1] + pos.y,
      origin[2] + pos.z
    );
    mesh.rotation.set(
      THREE.MathUtils.degToRad(-rotation[0]),
      THREE.MathUtils.degToRad(rotation[1] + 180),
      THREE.MathUtils.degToRad(rotation[2]),
      "ZYX"
    );
    if (!mesh.parent) {
      if (Project?.model_3d) {
        Project.model_3d.add(mesh);
      }
    }
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
      if (cube && cube.is_text_display && cube.mesh) {
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
    debugLog("\u2713 TextDisplay actions unregistered");
  }

  // src/layers/index.ts
  var LAYER_SEPARATOR = ".";
  var autoEnabledMultiTextures = false;
  var importLayerAction = null;
  var reloadLayerAction = null;
  var reloadAllLayersAction = null;
  var deleteHandler = null;
  var toggleVisibilityAction = null;
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
    for (const cube of Cube.all) {
      if (layerCubeUuids.has(cube.uuid))
        continue;
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
      const prefixedName = `${layerName}${LAYER_SEPARATOR}${bone.name}`;
      const group = new Group({
        name: prefixedName,
        origin: bone.pivot ? [bone.pivot[0], bone.pivot[1], bone.pivot[2]] : [0, 0, 0],
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
        const uvOffset = cubeData.uv || [0, 0];
        const w = size[0];
        const h = size[1];
        const d = size[2];
        const ox = uvOffset[0];
        const oy = uvOffset[1];
        const cube = new Cube({
          name: `${layerName}${LAYER_SEPARATOR}${bone.name}`,
          from: [origin[0], origin[1], origin[2]],
          to: [origin[0] + size[0], origin[1] + size[1], origin[2] + size[2]],
          origin: [pivot[0], pivot[1], pivot[2]],
          rotation: [-rotation[0], -rotation[1], rotation[2]],
          inflate: cubeData.inflate || 0,
          box_uv: false,
          faces: {
            north: { uv: scaleUVToProject([ox + d, oy + d, ox + d + w, oy + d + h], uvWidth, uvHeight) },
            south: { uv: scaleUVToProject([ox + d + w + d, oy + d, ox + d + w + d + w, oy + d + h], uvWidth, uvHeight) },
            east: { uv: scaleUVToProject([ox, oy + d, ox + d, oy + d + h], uvWidth, uvHeight) },
            west: { uv: scaleUVToProject([ox + d + w, oy + d, ox + d + w + d, oy + d + h], uvWidth, uvHeight) },
            up: { uv: scaleUVToProject([ox + d, oy, ox + d + w, oy + d], uvWidth, uvHeight) },
            down: { uv: scaleUVToProject([ox + d + w, oy, ox + d + w + w, oy + d], uvWidth, uvHeight) }
          }
        });
        cube.layer_uv_width = uvWidth;
        cube.layer_uv_height = uvHeight;
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
            name: `${layerName}${LAYER_SEPARATOR}${elemData.name || "cube"}`,
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
        const prefixedName = `${layerName}${LAYER_SEPARATOR}${originalName}`;
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
  function importLayer(file) {
    const json = typeof file.content === "string" ? JSON.parse(file.content) : file.content;
    const layerName = file.name.replace(/\.\w+$/, "").replace(/\.geo$/, "");
    const { groups, cubes, allElements, rootGroups, textures, uvWidth, uvHeight } = parseModelFile(json, layerName, file.path);
    if (allElements.length === 0) {
      Blockbench.showQuickMessage(`No geometry found in: ${layerName}`, 2e3);
      return;
    }
    const collection = new Collection({
      name: layerName,
      children: rootGroups.map((g) => g.uuid),
      export_codec: "animorph_layer"
    });
    collection.layer_elements = allElements.map((e) => e.uuid);
    collection.add();
    collection.export_path = file.path;
    collection.layer_uv_width = uvWidth;
    collection.layer_uv_height = uvHeight;
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
    Blockbench.showQuickMessage(`Imported layer: ${layerName} (UV: ${uvWidth}x${uvHeight})`);
    debugLog(`[Layers] Imported layer: ${layerName} with ${groups.length} groups, ${cubes.length} cubes, UV: ${uvWidth}x${uvHeight}`);
  }
  function reloadLayer(collection, preserveVisibility = true) {
    if (!collection.export_path || collection.export_codec !== "animorph_layer")
      return;
    if (!isApp)
      return;
    const fs = requireNativeModule("fs");
    try {
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
      const content = fs.readFileSync(collection.export_path, "utf-8");
      const json = JSON.parse(content);
      const { groups, cubes, allElements, rootGroups, textures, uvWidth, uvHeight } = parseModelFile(json, collection.name, collection.export_path);
      collection.children = rootGroups.map((g) => g.uuid);
      collection.layer_elements = allElements.map((e) => e.uuid);
      collection.layer_uv_width = uvWidth;
      collection.layer_uv_height = uvHeight;
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
  function registerLayerActions() {
    importLayerAction = new Action("animorph_import_layer", {
      name: "Import Layer",
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
    if (Collection.prototype.menu) {
      Collection.prototype.menu.addAction(reloadLayerAction, 10);
      Collection.prototype.menu.addAction(toggleVisibilityAction, 11);
    }
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
    if (toggleVisibilityAction) {
      toggleVisibilityAction.delete();
      toggleVisibilityAction = null;
    }
    if (deleteHandler) {
      deleteHandler.delete();
      deleteHandler = null;
    }
    debugLog("\u2713 Layer actions unregistered");
  }

  // src/index.ts
  var loopStartProperty = null;
  function onLoad() {
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
    debugLog(`\u2713 ${PLUGIN_NAME} v${PLUGIN_VERSION} loaded`);
  }
  function onUnload() {
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
    debugLog(`\u2713 ${PLUGIN_NAME} unloaded`);
  }
  Plugin.register(PLUGIN_ID, {
    title: PLUGIN_NAME,
    author: "feeldev",
    icon: "pets",
    description: "Animorph tools: loop_start support, mesh export, text display, and reference layers for Bedrock/GeckoLib",
    version: PLUGIN_VERSION,
    variant: "both",
    tags: ["Minecraft: Bedrock Edition", "GeckoLib", "Animations", "Mesh", "Text Display", "Layers"],
    onload: onLoad,
    onunload: onUnload
  });
})();
