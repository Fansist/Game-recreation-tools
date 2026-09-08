/**
 * Real tool handlers — wires select WorldForge tools to actual z-ai-web-dev-sdk calls.
 * ---------------------------------------------------------------------------
 * When a tool is registered here, the MCP server returns a REAL AI-generated
 * response (LLM text, TTS audio, generated image, web search results) instead
 * of the simulated summary.
 *
 * The Try-It-Live UI in the browser hits these handlers via POST /api/mcp-call
 * → http://localhost:3030/call → executeTool() → realHandler (if registered).
 *
 * Add new handlers by extending `realHandlers` below. Each handler:
 *   - Receives the parsed args object.
 *   - Returns a string (or { text, imageBase64?, audioBase64? } for rich output).
 *   - Should handle errors gracefully (try/catch → return error string).
 */

import ZAI from "z-ai-web-dev-sdk";

let _zaiPromise: Promise<ZAI> | null = null;
async function getZai(): Promise<ZAI> {
  if (!_zaiPromise) _zaiPromise = ZAI.create();
  return _zaiPromise;
}

export interface RealHandlerResult {
  text: string;
  /** Optional base64-encoded image to display in the Try-It UI. */
  imageBase64?: string;
  /** Optional base64-encoded audio (mp3) for TTS results. */
  audioBase64?: string;
  /** Optional metadata. */
  meta?: Record<string, unknown>;
}

export type RealHandler = (
  args: Record<string, unknown>,
) => Promise<RealHandlerResult | string>;

/** Builds the standard header for a real-handler response. */
function header(title: string, category: string, mode: string): string {
  return [
    `🛠️  ${title}`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `Category: ${category}`,
    `Mode: 🟢 REAL ${mode} (z-ai-web-dev-sdk)`,
    ``,
  ].join("\n");
}

/* ------------------------------------------------------------------ */
/* LLM-backed handlers (chat completions)                              */
/* ------------------------------------------------------------------ */

async function llmGenerate(
  args: Record<string, unknown>,
  opts: {
    title: string;
    category: string;
    systemPrompt: string;
    userPromptBuilder: (args: Record<string, unknown>) => string;
    maxTokens?: number;
  },
): Promise<RealHandlerResult> {
  const zai = await getZai();
  const userPrompt = opts.userPromptBuilder(args);
  const res = await zai.chat.completions.create({
    messages: [
      { role: "system", content: opts.systemPrompt },
      { role: "user", content: userPrompt },
    ],
    ...(opts.maxTokens ? { max_tokens: opts.maxTokens } : {}),
  });
  const text: string =
    res?.choices?.[0]?.message?.content ??
    res?.choices?.[0]?.text ??
    JSON.stringify(res?.choices?.[0] ?? res).slice(0, 500);
  return {
    text: `${header(opts.title, opts.category, "LLM (glm-4-plus)")}\n📥 Prompt:\n${userPrompt.slice(0, 600)}\n\n📤 Generated:\n${text}`,
    meta: { model: res?.model || "glm-4-plus", tokens: res?.usage },
  };
}

/* ------------------------------------------------------------------ */
/* Image-generation handlers                                           */
/* ------------------------------------------------------------------ */

async function imageGenerate(
  args: Record<string, unknown>,
  opts: {
    title: string;
    category: string;
    promptBuilder: (args: Record<string, unknown>) => string;
    size?: "1024x1024" | "768x1344" | "864x1152" | "1344x768" | "1152x864" | "1440x720" | "720x1440";
  },
): Promise<RealHandlerResult> {
  const zai = await getZai();
  const prompt = opts.promptBuilder(args);
  const res = await zai.images.generations.create({
    prompt,
    size: opts.size || "1024x1024",
  });
  const b64: string | undefined = res?.data?.[0]?.base64;
  return {
    text: `${header(opts.title, opts.category, "IMAGE GEN")}\n📥 Prompt:\n${prompt}\n\n📤 Generated image: ${b64 ? `${b64.length} chars base64 (displayed below)` : "no image returned"}`,
    imageBase64: b64,
    meta: { created: res?.created },
  };
}

/* ------------------------------------------------------------------ */
/* TTS handlers                                                        */
/* ------------------------------------------------------------------ */

async function ttsGenerate(
  args: Record<string, unknown>,
  opts: {
    title: string;
    category: string;
    text: string;
    voice?: string;
    speed?: number;
  },
): Promise<RealHandlerResult> {
  const zai = await getZai();
  const res = await zai.audio.tts.create({
    input: opts.text,
    voice: opts.voice || "default",
    ...(opts.speed ? { speed: opts.speed } : {}),
  });
  // The SDK returns the audio as base64 in res.data (b64_json) or as a buffer.
  let audioB64: string | undefined;
  if (typeof res === "string") {
    audioB64 = res;
  } else if (res?.data?.[0]?.base64) {
    audioB64 = res.data[0].base64;
  } else if (res?.b64_json) {
    audioB64 = res.b64_json;
  } else if (res?.audio) {
    audioB64 = res.audio;
  } else {
    // Last resort: stringify
    audioB64 = typeof res === "string" ? res : JSON.stringify(res).slice(0, 200);
  }
  return {
    text: `${header(opts.title, opts.category, "TTS")}\n📥 Text:\n${opts.text.slice(0, 400)}\n\n📤 Audio: ${audioB64 ? `${audioB64.length} chars base64 (playable below)` : "no audio returned"}`,
    audioBase64: typeof audioB64 === "string" && !audioB64.startsWith("{") ? audioB64 : undefined,
    meta: { voice: opts.voice, length: opts.text.length },
  };
}

/* ------------------------------------------------------------------ */
/* Web-search handlers                                                 */
/* ------------------------------------------------------------------ */

async function webSearchHandler(
  args: Record<string, unknown>,
  opts: {
    title: string;
    category: string;
    query: string;
    num?: number;
  },
): Promise<RealHandlerResult> {
  const zai = await getZai();
  const results = await zai.functions.invoke("web_search", {
    query: opts.query,
    num: opts.num || 5,
  });
  const formatted = (results || [])
    .map(
      (r: any, i: number) =>
        `${i + 1}. ${r.name}\n   ${r.url}\n   ${r.snippet?.slice(0, 200) ?? ""}`,
    )
    .join("\n\n");
  return {
    text: `${header(opts.title, opts.category, "WEB SEARCH")}\n📥 Query: ${opts.query}\n\n📤 Top ${results?.length || 0} results:\n${formatted || "(no results)"}`,
    meta: { count: results?.length },
  };
}

/* ------------------------------------------------------------------ */
/* Registry: tool name → real handler                                  */
/* ------------------------------------------------------------------ */

export const realHandlers: Record<string, RealHandler> = {
  /* ---------- LLM (chat completions) ---------- */
  "code_scripts_generate_script": async (args) => {
    const description = String(args.description || "a game feature");
    const language = String(args.language || "typescript");
    const framework = String(args.framework || "custom");
    const withComments = args.with_comments !== false;
    return llmGenerate(args, {
      title: "Generate Game Script",
      category: "Code Generation - Game Scripts",
      systemPrompt:
        "You are a senior game developer. Generate clean, production-ready code for the requested feature. Use modern syntax, add a brief header comment, and include explanatory inline comments. Output ONLY the code in a fenced block — no extra prose.",
      userPromptBuilder: () =>
        `Generate ${language} code for ${framework} that implements:\n${description}\n\nRequirements:\n- Language: ${language}\n- Framework: ${framework}\n- Include comments: ${withComments}\n- Return only the code in a single fenced block.`,
      maxTokens: 1500,
    });
  },

  "code_scripts_refactor_script": async (args) => {
    const sourceCode = String(args.source_code || "");
    const refactorType = String(args.refactor_type || "modernize");
    return llmGenerate(args, {
      title: "Refactor Existing Script",
      category: "Code Generation - Game Scripts",
      systemPrompt:
        "You are a senior code reviewer. Refactor the provided code per the requested transformation. Preserve exact behavior. Output ONLY the refactored code in a fenced block.",
      userPromptBuilder: () =>
        `Refactor this code using: ${refactorType}\n\n\`\`\`\n${sourceCode.slice(0, 4000)}\n\`\`\``,
      maxTokens: 1500,
    });
  },

  "code_scripts_generate_documentation": async (args) => {
    const sourceCode = String(args.source_code || "");
    const format = String(args.format || "jsdoc");
    const includeExamples = args.include_examples !== false;
    return llmGenerate(args, {
      title: "Generate Code Documentation",
      category: "Code Generation - Game Scripts",
      systemPrompt:
        "You are a technical writer. Generate clear documentation for the provided code. Output ONLY the documented code (or docstring text) — no extra prose.",
      userPromptBuilder: () =>
        `Document this code using ${format} format.${includeExamples ? " Include usage examples." : ""}\n\n\`\`\`\n${sourceCode.slice(0, 4000)}\n\`\`\``,
      maxTokens: 1200,
    });
  },

  "npc_dialog_chat_with_npc": async (args) => {
    const message = String(args.message || "Hello");
    const npcId = String(args.npc_id || "npc_001");
    const temperature = Number(args.temperature ?? 0.7);
    return llmGenerate(args, {
      title: "Chat With NPC",
      category: "NPC Dialogue AI",
      systemPrompt:
        "You are an NPC in an open-world game. Respond in-character, concisely (1-3 sentences). Stay consistent with your established persona. Don't break the fourth wall.",
      userPromptBuilder: () =>
        `NPC ID: ${npcId}\n\nPlayer says: "${message}"\n\nRespond in-character:`,
      maxTokens: 200,
    });
  },

  "npc_dialog_bark_reaction": async (args) => {
    const event = String(args.event || "spotted_enemy");
    return llmGenerate(args, {
      title: "Generate Bark / Reaction Line",
      category: "NPC Dialogue AI",
      systemPrompt:
        "You write short, punchy NPC barks for video games. Keep them under 80 characters. Match the requested event tone. Output ONLY the bark text (1 line), no quotes, no explanation.",
      userPromptBuilder: () =>
        `Write a single NPC bark line for the event: ${event}.\nTone: in-the-moment, urgent, characterful.\nMax 80 chars.`,
      maxTokens: 60,
    });
  },

  "narrative_narrate_action": async (args) => {
    const actionDesc = String(args.action_desc || "the hero enters the warehouse");
    const tone = String(args.tone || "noir");
    const lengthWords = Number(args.length_words || 50);
    return llmGenerate(args, {
      title: "Narrate Action",
      category: "Story & Narrative Design",
      systemPrompt:
        "You are a noir-style game narrator. Write immersive, atmospheric narration. Match the requested tone. Don't address the player directly — describe the scene in third person, present tense.",
      userPromptBuilder: () =>
        `Narrate this action in ${tone} tone, ~${lengthWords} words:\n\n${actionDesc}`,
      maxTokens: Math.min(800, lengthWords * 3),
    });
  },

  "narrative_create_story_arc": async (args) => {
    const title = String(args.title || "Untitled");
    const structure = String(args.structure || "three_act");
    const themes = Array.isArray(args.themes) ? args.themes.join(", ") : "redemption";
    return llmGenerate(args, {
      title: "Create Story Arc",
      category: "Story & Narrative Design",
      systemPrompt:
        "You are a narrative designer. Generate a tight beat sheet for a game story arc. Output as a numbered list of beats with a one-line description each. Don't add preamble.",
      userPromptBuilder: () =>
        `Create a ${structure} story arc titled "${title}".\nThemes: ${themes}\n\nOutput 10-15 beats as a numbered list.`,
      maxTokens: 800,
    });
  },

  "quests_create_quest": async (args) => {
    const title = String(args.title || "Untitled Quest");
    const type = String(args.type || "side");
    const difficulty = Number(args.difficulty ?? 5);
    return llmGenerate(args, {
      title: "Create Quest",
      category: "Quests & Missions",
      systemPrompt:
        "You are a quest designer. Output a structured quest definition with: Synopsis, Giver NPC, 3-5 Objectives (in order), Branches (if any), Rewards. Use markdown headings.",
      userPromptBuilder: () =>
        `Design a ${type} quest titled "${title}".\nDifficulty: ${difficulty}/10.\n\nOutput as markdown with sections: ## Synopsis, ## Giver, ## Objectives, ## Branches, ## Rewards.`,
      maxTokens: 600,
    });
  },

  "dialogs_create_dialog_tree": async (args) => {
    const name = String(args.name || "dialog_tree");
    const npcId = String(args.npc_id || "npc_001");
    const rootText = String(args.root_text || "Hello there.");
    return llmGenerate(args, {
      title: "Create Dialog Tree",
      category: "Dialog Systems",
      systemPrompt:
        "You are a dialog designer. Output a JSON dialog tree with 5-8 nodes. Each node: {id, text, speaker, choices: [{text, next_node_id}]}. The root node id is 'root'. Output ONLY the JSON, no prose.",
      userPromptBuilder: () =>
        `Create a dialog tree named "${name}" for NPC ${npcId}.\nRoot line: "${rootText}"\n\nOutput a valid JSON dialog tree with 5-8 nodes. Root node id = "root".`,
      maxTokens: 1000,
    });
  },

  /* ---------- Image generation ---------- */
  "characters_generate_hero": async (args) => {
    const name = String(args.name || "Hero");
    const style = String(args.style || "realistic");
    const gender = String(args.gender || "neutral");
    const heightCm = Number(args.height_cm ?? 180);
    return imageGenerate(args, {
      title: "Generate Hero Character",
      category: "3D Character Models",
      promptBuilder: () =>
        `Full-body character portrait of ${name}, a ${style}-style ${gender} hero, ${heightCm}cm tall, wearing tactical urban clothing. Cinematic lighting, game character concept art, highly detailed, neutral background.`,
    });
  },

  "characters_generate_villain": async (args) => {
    const name = String(args.name || "Villain");
    const archetype = String(args.archetype || "mastermind");
    const menace = Number(args.menace_level ?? 8);
    return imageGenerate(args, {
      title: "Generate Antagonist Villain",
      category: "3D Character Models",
      promptBuilder: () =>
        `Full-body character portrait of ${name}, a ${archetype} villain with menace level ${menace}/10. Dark menacing attire, dramatic lighting, game character concept art, highly detailed, dark background.`,
    });
  },

  "characters_generate_creature": async (args) => {
    const creatureType = String(args.creature_type || "wolf");
    const scale = Number(args.scale ?? 1);
    return imageGenerate(args, {
      title: "Generate Creature / Monster",
      category: "3D Character Models",
      promptBuilder: () =>
        `Creature concept art: a ${creatureType} at ${scale}x scale, detailed anatomy, atmospheric lighting, dark fantasy game style, neutral background.`,
    });
  },

  "vehicles_generate_sedan": async (args) => {
    const make = String(args.make || "Vortex");
    const model = String(args.model || "Civic-X");
    const color = String(args.color || "red");
    const year = Number(args.year ?? 2024);
    return imageGenerate(args, {
      title: "Generate Sedan Car",
      category: "Vehicles & Transportation",
      promptBuilder: () =>
        `3/4 front view of a ${year} ${make} ${model} sedan in ${color}, photorealistic, urban background, dramatic lighting, game vehicle concept art.`,
    });
  },

  "vehicles_generate_sports_car": async (args) => {
    const name = String(args.name || "Velocity");
    return imageGenerate(args, {
      title: "Generate Sports Car",
      category: "Vehicles & Transportation",
      promptBuilder: () =>
        `3/4 front view of a high-performance sports car named ${name}, sleek aerodynamic design, dramatic studio lighting, photorealistic, dark background.`,
    });
  },

  "buildings_generate_landmark": async (args) => {
    const name = String(args.name || "Freedom Statue");
    const landmarkType = String(args.landmark_type || "statue");
    const heightM = Number(args.height_m ?? 50);
    return imageGenerate(args, {
      title: "Generate Landmark Building",
      category: "Buildings & Architecture",
      promptBuilder: () =>
        `A ${landmarkType} landmark named "${name}", ${heightM}m tall, dramatic golden-hour lighting, urban skyline background, photorealistic game concept art.`,
    });
  },

  "props_generate_weapon_prop": async (args) => {
    const weaponClass = String(args.weapon_class || "rifle");
    const name = String(args.name || "Reaver");
    return imageGenerate(args, {
      title: "Generate Weapon Prop",
      category: "Props & Objects",
      promptBuilder: () =>
        `A ${weaponClass} named "${name}" game weapon prop, detailed mechanical design, isolated on dark background, studio lighting, photorealistic concept art.`,
    });
  },

  /* ---------- TTS ---------- */
  "audio_voice_generate_npc_voice": async (args) => {
    const text = String(args.text || "Hello, traveler.");
    const voiceId = String(args.voice_id || "neutral_m");
    const speed = Number(args.speed ?? 1);
    return ttsGenerate(args, {
      title: "Generate NPC Voice Line",
      category: "Voice Synthesis",
      text,
      voice: voiceId.includes("_f") ? "female" : "male",
      speed,
    });
  },

  "audio_voice_narrate_text": async (args) => {
    const text = String(args.text || "The rain hammered down on the city streets.");
    return ttsGenerate(args, {
      title: "Narrate Long Text",
      category: "Voice Synthesis",
      text,
      voice: "male",
    });
  },

  /* ---------- Web search ---------- */
  "code_scripts_generate_input_bindings": async (args) => {
    const language = String(args.language || "typescript");
    const actions = Array.isArray(args.actions) ? args.actions : ["jump", "fire", "aim"];
    return llmGenerate(args, {
      title: "Generate Input Bindings Script",
      category: "Code Generation - Game Scripts",
      systemPrompt:
        "You are a game input engineer. Output clean, complete input binding code with action map. Output ONLY the code in a fenced block.",
      userPromptBuilder: () =>
        `Generate ${language} input bindings for these actions: ${actions.join(", ")}.\nSupport gamepad: ${args.support_gamepad !== false}.\nSupport touch: ${args.support_touch === true}.\n\nOutput only the code in a fenced block.`,
      maxTokens: 800,
    });
  },

  /* ---------- NPC behavior (LLM-generated behavior trees / state machines) ---------- */
  "npc_behavior_create_behavior_tree": async (args) => {
    const name = String(args.name || "guard_patrol");
    return llmGenerate(args, {
      title: "Create Behavior Tree",
      category: "NPC Behavior Trees",
      systemPrompt:
        "You are a game AI designer. Output a JSON behavior tree with selector/sequence/action nodes. Use this node shape: {id, type, children?, action?, decorator?}. Output ONLY valid JSON, no prose.",
      userPromptBuilder: () =>
        `Create a behavior tree named "${name}" for a guard NPC that patrols, investigates disturbances, and engages in combat when threatened.\n\nOutput a valid JSON behavior tree.`,
      maxTokens: 800,
    });
  },

  "npc_behavior_create_state_machine": async (args) => {
    const npcId = String(args.npc_id || "npc_001");
    return llmGenerate(args, {
      title: "Create Finite State Machine",
      category: "NPC Behavior Trees",
      systemPrompt:
        "You are a game AI designer. Output a JSON finite state machine with: states[], transitions[], initial_state. Output ONLY valid JSON, no prose.",
      userPromptBuilder: () =>
        `Create an FSM for NPC ${npcId} with states like idle, patrol, alert, chase, attack, flee.\n\nOutput valid JSON: {states: [...], transitions: [{from, to, condition}], initial_state: "idle"}.`,
      maxTokens: 800,
    });
  },

  /* ---------- World / city / story generators (LLM) ---------- */
  "world_cities_generate_city": async (args) => {
    const cityStyle = String(args.city_style || "modern_american");
    const areaKm2 = Number(args.area_km2 ?? 25);
    return llmGenerate(args, {
      title: "Generate Procedural City",
      category: "City Generation",
      systemPrompt:
        "You are a world designer for an open-world game. Output a JSON city layout with: name, districts[] (each with type, area_sqkm, vibe, landmarks), population, notable_features. Output ONLY valid JSON.",
      userPromptBuilder: () =>
        `Generate a ${cityStyle} city, ${areaKm2} km², with 4-6 districts.\n\nOutput valid JSON with: name, districts[], population, notable_features.`,
      maxTokens: 1200,
    });
  },

  "world_neighborhoods_create_neighborhood": async (args) => {
    const name = String(args.name || "Riverside");
    const vibe = String(args.vibe || "middle_class");
    return llmGenerate(args, {
      title: "Create Neighborhood",
      category: "Neighborhoods & Districts",
      systemPrompt:
        "You are a world designer. Output a JSON neighborhood profile with: name, vibe, population, demographics, landmarks[], businesses[], mood. Output ONLY valid JSON.",
      userPromptBuilder: () =>
        `Create a ${vibe} neighborhood named "${name}".\n\nOutput valid JSON: {name, vibe, population, demographics, landmarks, businesses, mood}.`,
      maxTokens: 600,
    });
  },

  "narrative_create_character_arc": async (args) => {
    const characterId = String(args.character_id || "hero");
    const arcType = String(args.arc_type || "positive");
    return llmGenerate(args, {
      title: "Create Character Arc",
      category: "Story & Narrative Design",
      systemPrompt:
        "You are a narrative designer. Output a JSON character arc with: start_state, end_state, key_moments[] (each with beat, description, emotion). Output ONLY valid JSON.",
      userPromptBuilder: () =>
        `Create a ${arcType} character arc for "${characterId}".\n\nOutput valid JSON: {start_state, end_state, key_moments: [{beat, description, emotion}]}.`,
      maxTokens: 800,
    });
  },

  "quests_create_dynamic_event": async (args) => {
    const eventType = String(args.event_type || "ambush");
    return llmGenerate(args, {
      title: "Create Dynamic Event",
      category: "Quests & Missions",
      systemPrompt:
        "You are a quest designer. Output a JSON dynamic event spec with: type, trigger, location_hint, participants[], rewards[], escalation. Output ONLY valid JSON.",
      userPromptBuilder: () =>
        `Create a ${eventType} dynamic event suitable for an open-world game.\n\nOutput valid JSON: {type, trigger, location_hint, participants, rewards, escalation}.`,
      maxTokens: 600,
    });
  },

  "dialogs_skill_check_dialog": async (args) => {
    const skill = String(args.skill || "persuade");
    const difficulty = Number(args.difficulty ?? 5);
    return llmGenerate(args, {
      title: "Dialog Skill Check",
      category: "Dialog Systems",
      systemPrompt:
        "You are a dialog designer. Output a JSON skill-check dialog node with: skill, difficulty, success_node {text, response}, failure_node {text, response}. Output ONLY valid JSON.",
      userPromptBuilder: () =>
        `Create a ${skill} skill check (DC ${difficulty}) dialog node.\n\nOutput valid JSON: {skill, difficulty, success_node: {text, response}, failure_node: {text, response}}.`,
      maxTokens: 400,
    });
  },

  /* ---------- Audio SFX via TTS (sound-effect-style prompts) ---------- */
  "audio_sfx_generate_gunshot_sfx": async (args) => {
    const weaponClass = String(args.weapon_class || "rifle");
    return ttsGenerate(args, {
      title: "Generate Gunshot SFX",
      category: "SFX Generation",
      text: `Bang! A sharp ${weaponClass} gunshot rings out, followed by a brief echo. Pew pew.`,
      voice: "male",
    });
  },

  "audio_sfx_generate_explosion_sfx": async (args) => {
    const explosionType = String(args.explosion_type || "grenade");
    return ttsGenerate(args, {
      title: "Generate Explosion SFX",
      category: "SFX Generation",
      text: `Boom! A loud ${explosionType} explosion with debris and a low rumble. Kaboom!`,
      voice: "male",
    });
  },

  "audio_sfx_generate_impact_sfx": async (args) => {
    const impactType = String(args.impact_type || "glass_break");
    return ttsGenerate(args, {
      title: "Generate Impact SFX",
      category: "SFX Generation",
      text: `Crash! ${impactType.replace(/_/g, " ")} — sharp shards and a resonating thud. Smash.`,
      voice: "male",
    });
  },

  "audio_sfx_generate_ui_click": async (args) => {
    const uiEvent = String(args.ui_event || "click");
    return ttsGenerate(args, {
      title: "Generate UI Click SFX",
      category: "SFX Generation",
      text: `${uiEvent}. A clean digital click. Tap.`,
      voice: "male",
    });
  },

  /* ---------- More image gen ---------- */
  "characters_generate_npc_pedestrian": async (args) => {
    const bodyType = String(args.body_type || "average");
    const clothingStyle = String(args.clothing_style || "casual");
    return imageGenerate(args, {
      title: "Generate NPC Pedestrian",
      category: "3D Character Models",
      promptBuilder: () =>
        `Full-body portrait of a ${bodyType}-built pedestrian NPC wearing ${clothingStyle} clothing, urban game character concept art, neutral background, photorealistic.`,
    });
  },

  "vehicles_generate_motorcycle": async (args) => {
    const style = String(args.style || "sport");
    return imageGenerate(args, {
      title: "Generate Motorcycle",
      category: "Vehicles & Transportation",
      promptBuilder: () =>
        `3/4 front view of a ${style} motorcycle, photorealistic game vehicle concept art, urban background, dramatic lighting.`,
    });
  },

  "buildings_generate_house": async (args) => {
    const houseStyle = String(args.house_style || "suburban");
    return imageGenerate(args, {
      title: "Generate Residential House",
      category: "Buildings & Architecture",
      promptBuilder: () =>
        `A ${houseStyle} residential house, game architectural concept art, golden-hour lighting, photorealistic, detailed facade.`,
    });
  },

  "terrain_generate_mountain_range": async (args) => {
    const peakCount = Number(args.peak_count ?? 15);
    return imageGenerate(args, {
      title: "Generate Mountain Range",
      category: "Terrain & Landscape",
      promptBuilder: () =>
        `A sweeping mountain range with ${peakCount} peaks, alpine snow line, dramatic clouds, game environment concept art, photorealistic.`,
      size: "1440x720",
    });
  },

  "environment_generate_skybox": async (args) => {
    const timeOfDay = String(args.time_of_day || "noon");
    return imageGenerate(args, {
      title: "Generate Skybox",
      category: "Environment & Atmosphere",
      promptBuilder: () =>
        `A seamless ${timeOfDay} skybox texture, atmospheric scattering, soft clouds, game skybox, no horizon, equirectangular.`,
      size: "1440x720",
    });
  },

  /* ---------- More LLM handlers ---------- */
  "cutscenes_create_cutscene": async (args) => {
    const name = String(args.name || "intro_cutscene");
    const durationS = Number(args.duration_s ?? 30);
    return llmGenerate(args, {
      title: "Create Cutscene",
      category: "Cutscenes & Cinematics",
      systemPrompt:
        "You are a cinematic director for games. Output a JSON cutscene shot list with: name, duration_s, shots[] (each with: shot_type, start_s, duration_s, target, camera_move, dialog?). Output ONLY valid JSON.",
      userPromptBuilder: () =>
        `Create a cutscene named "${name}", ~${durationS}s long, with 4-6 shots.\n\nOutput valid JSON: {name, duration_s, shots: [{shot_type, start_s, duration_s, target, camera_move, dialog?}]}.`,
      maxTokens: 800,
    });
  },

  "camera_systems_create_third_person_camera": async (args) => {
    const targetId = String(args.target_id || "player");
    const distanceM = Number(args.distance_m ?? 5);
    return llmGenerate(args, {
      title: "Create Third-Person Camera",
      category: "Camera Systems",
      systemPrompt:
        "You are a gameplay engineer. Output a JSON camera config with: type, target, distance_m, height_m, damping, fov_deg, collision, follow_rotation_speed. Output ONLY valid JSON.",
      userPromptBuilder: () =>
        `Create a third-person camera config for target "${targetId}", distance ${distanceM}m.\n\nOutput valid JSON: {type, target, distance_m, height_m, damping, fov_deg, collision, follow_rotation_speed}.`,
      maxTokens: 400,
    });
  },

  "physics_rigid_add_rigid_box": async (args) => {
    const widthM = Number(args.width_m ?? 1);
    const heightM = Number(args.height_m ?? 1);
    const depthM = Number(args.depth_m ?? 1);
    const massKg = Number(args.mass_kg ?? 1);
    return llmGenerate(args, {
      title: "Add Rigid Box",
      category: "Rigid Body Physics",
      systemPrompt:
        "You are a physics engineer. Output a JSON rigid body config with: id, shape, dimensions {w,h,d}, mass_kg, friction, restitution, collider_type. Output ONLY valid JSON.",
      userPromptBuilder: () =>
        `Create a rigid box: ${widthM}x${heightM}x${depthM}m, ${massKg}kg.\n\nOutput valid JSON: {id, shape: "box", dimensions: {w, h, d}, mass_kg, friction, restitution, collider_type}.`,
      maxTokens: 300,
    });
  },

  "physics_joints_add_hinge_joint": async (args) => {
    const bodyA = String(args.body_a || "body_001");
    const bodyB = String(args.body_b || "body_002");
    return llmGenerate(args, {
      title: "Add Hinge Joint",
      category: "Joints & Constraints",
      systemPrompt:
        "You are a physics engineer. Output a JSON hinge joint config with: id, body_a, body_b, anchor, axis, min_angle, max_angle, motor, max_torque. Output ONLY valid JSON.",
      userPromptBuilder: () =>
        `Create a hinge joint between ${bodyA} and ${bodyB}.\n\nOutput valid JSON: {id, body_a, body_b, anchor: [x,y,z], axis: [x,y,z], min_angle, max_angle, motor: {enabled, target_velocity, max_torque}}.`,
      maxTokens: 400,
    });
  },

  "animation_skeletal_create_animation_state_machine": async (args) => {
    const characterId = String(args.character_id || "hero");
    return llmGenerate(args, {
      title: "Create Animation State Machine",
      category: "Skeletal Animation",
      systemPrompt:
        "You are a gameplay animator. Output a JSON animation state machine with: states[] (name, animation_id, loop), transitions[] (from, to, condition, fade_s), initial_state. Output ONLY valid JSON.",
      userPromptBuilder: () =>
        `Create an animation state machine for character "${characterId}" with states: idle, walk, run, jump, attack.\n\nOutput valid JSON: {states: [{name, animation_id, loop}], transitions: [{from, to, condition, fade_s}], initial_state}.`,
      maxTokens: 600,
    });
  },

  "npc_pathfinding_build_navmesh": async (args) => {
    const agentRadius = Number(args.agent_radius_m ?? 0.4);
    const maxSlope = Number(args.max_slope_deg ?? 45);
    return llmGenerate(args, {
      title: "Build NavMesh",
      category: "Pathfinding & NavMesh",
      systemPrompt:
        "You are an AI navigation engineer. Output a JSON navmesh build config with: agent_radius_m, agent_height_m, max_slope_deg, step_height_m, voxel_size, region_count. Output ONLY valid JSON.",
      userPromptBuilder: () =>
        `Generate a navmesh build config for agent radius ${agentRadius}m, max slope ${maxSlope}°.\n\nOutput valid JSON: {agent_radius_m, agent_height_m, max_slope_deg, step_height_m, voxel_size, region_count}.`,
      maxTokens: 300,
    });
  },

  "combat_weapons_create_weapon": async (args) => {
    const name = String(args.name || "Reaver");
    const weaponClass = String(args.class || "rifle");
    const damage = Number(args.damage ?? 30);
    return llmGenerate(args, {
      title: "Create Weapon Definition",
      category: "Weapons Systems",
      systemPrompt:
        "You are a weapons designer. Output a JSON weapon definition with: name, class, damage, fire_rate_rpm, magazine_size, reload_time_s, range_m, recoil_pattern, ammo_type, attachments. Output ONLY valid JSON.",
      userPromptBuilder: () =>
        `Create a ${weaponClass} weapon named "${name}", ${damage} damage.\n\nOutput valid JSON: {name, class, damage, fire_rate_rpm, magazine_size, reload_time_s, range_m, recoil_pattern, ammo_type, attachments: []}.`,
      maxTokens: 500,
    });
  },

  "economy_create_shop": async (args) => {
    const name = String(args.name || "General Store");
    return llmGenerate(args, {
      title: "Create Shop",
      category: "Economy & Trade",
      systemPrompt:
        "You are a game economy designer. Output a JSON shop definition with: name, owner_npc_id, items[] (id, price, stock), buy_price_modifier, sell_price_modifier, restock_interval_hours. Output ONLY valid JSON.",
      userPromptBuilder: () =>
        `Create a shop named "${name}" with 5-8 items.\n\nOutput valid JSON: {name, owner_npc_id, items: [{id, price, stock}], buy_price_modifier, sell_price_modifier, restock_interval_hours}.`,
      maxTokens: 600,
    });
  },

  "inventory_create_inventory": async (args) => {
    const ownerId = String(args.owner_id || "player");
    const maxSlots = Number(args.max_slots ?? 30);
    return llmGenerate(args, {
      title: "Create Inventory",
      category: "Inventory Systems",
      systemPrompt:
        "You are an inventory system designer. Output a JSON inventory config with: owner_id, type, max_slots, max_weight_kg, stackable, equipment_slots[], hotbar_slots. Output ONLY valid JSON.",
      userPromptBuilder: () =>
        `Create an inventory for "${ownerId}", ${maxSlots} slots.\n\nOutput valid JSON: {owner_id, type, max_slots, max_weight_kg, stackable, equipment_slots: [...], hotbar_slots: N}.`,
      maxTokens: 400,
    });
  },

  "ui_hud_create_health_bar": async (args) => {
    const targetId = String(args.target_id || "player");
    return llmGenerate(args, {
      title: "Create Health Bar",
      category: "UI & HUD",
      systemPrompt:
        "You are a UI designer. Output a JSON health bar widget config with: target_id, position, width_px, height_px, show_numbers, damage_flash, color_zones. Output ONLY valid JSON.",
      userPromptBuilder: () =>
        `Create a health bar widget for "${targetId}".\n\nOutput valid JSON: {target_id, position, width_px, height_px, show_numbers, damage_flash, color_zones: [{threshold, color}]}.`,
      maxTokens: 300,
    });
  },

  "ui_hud_create_minimap": async (args) => {
    const sizePx = Number(args.size_px ?? 200);
    const zoomM = Number(args.zoom_m ?? 200);
    return llmGenerate(args, {
      title: "Create Minimap",
      category: "UI & HUD",
      systemPrompt:
        "You are a UI designer. Output a JSON minimap widget config with: position, size_px, zoom_m, rotate_with_player, tracked_layers, blip_icons. Output ONLY valid JSON.",
      userPromptBuilder: () =>
        `Create a minimap widget, ${sizePx}px, ${zoomM}m zoom.\n\nOutput valid JSON: {position, size_px, zoom_m, rotate_with_player, tracked_layers: [...], blip_icons: [{type, color}]}.`,
      maxTokens: 400,
    });
  },

  "materials_pbr_create_pbr_material": async (args) => {
    const name = String(args.name || "concrete");
    const roughness = Number(args.roughness ?? 0.5);
    const metallic = Number(args.metallic ?? 0);
    return llmGenerate(args, {
      title: "Create PBR Material",
      category: "PBR Materials",
      systemPrompt:
        "You are a materials artist. Output a JSON PBR material config with: name, albedo_hex, roughness, metallic, normal_strength, transparent, ior, emission. Output ONLY valid JSON.",
      userPromptBuilder: () =>
        `Create a PBR material named "${name}", roughness ${roughness}, metallic ${metallic}.\n\nOutput valid JSON: {name, albedo_hex, roughness, metallic, normal_strength, transparent, ior, emission: {color_hex, intensity}}.`,
      maxTokens: 300,
    });
  },

  "shaders_create_vertex_shader": async (args) => {
    const name = String(args.name || "vertex_shader");
    const features = Array.isArray(args.features) ? args.features : ["skinning"];
    return llmGenerate(args, {
      title: "Create Vertex Shader",
      category: "Shaders & GLSL",
      systemPrompt:
        "You are a graphics engineer. Output a complete GLSL vertex shader in a fenced code block. Include features as requested. No prose, just the shader code.",
      userPromptBuilder: () =>
        `Generate a GLSL 300 ES vertex shader named "${name}" with features: ${features.join(", ")}.\n\nOutput only the shader code in a \`\`\`glsl block.`,
      maxTokens: 800,
    });
  },

  "shaders_create_fragment_shader": async (args) => {
    const name = String(args.name || "fragment_shader");
    const features = Array.isArray(args.features) ? args.features : ["pbr"];
    return llmGenerate(args, {
      title: "Create Fragment Shader",
      category: "Shaders & GLSL",
      systemPrompt:
        "You are a graphics engineer. Output a complete GLSL fragment shader in a fenced code block. Include features as requested. No prose, just the shader code.",
      userPromptBuilder: () =>
        `Generate a GLSL 300 ES fragment shader named "${name}" with features: ${features.join(", ")}.\n\nOutput only the shader code in a \`\`\`glsl block.`,
      maxTokens: 1000,
    });
  },

  "vegetation_generate_tree": async (args) => {
    const species = String(args.species || "oak");
    const heightM = Number(args.height_m ?? 12);
    return imageGenerate(args, {
      title: "Generate Tree",
      category: "Vegetation & Flora",
      promptBuilder: () =>
        `A ${species} tree, ${heightM}m tall, full foliage, game vegetation concept art, photorealistic, neutral background, isolated.`,
    });
  },

  "vegetation_generate_forest": async (args) => {
    const forestType = String(args.forest_type || "temperate");
    return imageGenerate(args, {
      title: "Generate Forest Area",
      category: "Vegetation & Flora",
      promptBuilder: () =>
        `A dense ${forestType} forest, game environment concept art, atmospheric fog, photorealistic, wide shot.`,
      size: "1440x720",
    });
  },

  "weather_set_storm": async (args) => {
    const windSpeed = Number(args.wind_speed_ms ?? 20);
    return llmGenerate(args, {
      title: "Set Storm System",
      category: "Weather & Climate",
      systemPrompt:
        "You are a weather FX designer. Output a JSON storm config with: wind_speed_ms, lightning_frequency_s, thunder_delay_s, rain_intensity, cloud_coverage, fog_density. Output ONLY valid JSON.",
      userPromptBuilder: () =>
        `Create a storm system with wind ${windSpeed} m/s.\n\nOutput valid JSON: {wind_speed_ms, lightning_frequency_s, thunder_delay_s, rain_intensity, cloud_coverage, fog_density}.`,
      maxTokens: 300,
    });
  },

  "performance_generate_lod_chain": async (args) => {
    const lodCount = Number(args.lod_count ?? 4);
    return llmGenerate(args, {
      title: "Generate LOD Chain",
      category: "Performance Optimization",
      systemPrompt:
        "You are a performance engineer. Output a JSON LOD chain config with: source_mesh, lod_levels[] (level, triangle_count, screen_size_threshold), preserve_silhouette. Output ONLY valid JSON.",
      userPromptBuilder: () =>
        `Generate a ${lodCount}-level LOD chain config.\n\nOutput valid JSON: {source_mesh, lod_levels: [{level, triangle_count, screen_size_threshold}], preserve_silhouette}.`,
      maxTokens: 400,
    });
  },

  "debug_profiling_show_fps_overlay": async (args) => {
    const metrics = Array.isArray(args.metrics) ? args.metrics : ["fps", "frame_ms"];
    return llmGenerate(args, {
      title: "Show FPS Overlay",
      category: "Debug & Profiling",
      systemPrompt:
        "You are a tools engineer. Output a JSON debug overlay config with: position, metrics[], update_rate_hz, show_graph, graph_history_samples. Output ONLY valid JSON.",
      userPromptBuilder: () =>
        `Create an FPS overlay config with metrics: ${metrics.join(", ")}.\n\nOutput valid JSON: {position, metrics, update_rate_hz, show_graph, graph_history_samples}.`,
      maxTokens: 300,
    });
  },

  /* ---------- Additional real handlers (round 5) ---------- */
  "audio_music_generate_ambient_track": async (args) => {
    const mood = String(args.mood || "calm");
    const durationMin = Number(args.duration_minutes ?? 5);
    return llmGenerate(args, {
      title: "Generate Ambient Music Track",
      category: "Music Generation",
      systemPrompt:
        "You are a game audio composer. Output a JSON ambient track spec with: mood, tempo_bpm, key, instruments[], structure[], duration_minutes. Output ONLY valid JSON.",
      userPromptBuilder: () =>
        `Create an ambient music track, mood: ${mood}, ~${durationMin} min.\n\nOutput valid JSON: {mood, tempo_bpm, key, instruments, structure: [{section, duration_s}], duration_minutes}.`,
      maxTokens: 400,
    });
  },

  "audio_music_generate_action_track": async (args) => {
    const style = String(args.style || "electronic");
    const tempoBpm = Number(args.tempo_bpm ?? 140);
    return llmGenerate(args, {
      title: "Generate Action Music Track",
      category: "Music Generation",
      systemPrompt:
        "You are a game audio composer. Output a JSON action track spec with: style, tempo_bpm, key, energy_curve, stem_layers[], loop_points. Output ONLY valid JSON.",
      userPromptBuilder: () =>
        `Create an action music track, style: ${style}, ${tempoBpm} BPM.\n\nOutput valid JSON: {style, tempo_bpm, key, energy_curve, stem_layers, loop_points}.`,
      maxTokens: 400,
    });
  },

  "npc_decision_create_goap_planner": async (args) => {
    return llmGenerate(args, {
      title: "Create GOAP Planner",
      category: "NPC Decision Making",
      systemPrompt:
        "You are a game AI engineer. Output a JSON GOAP planner config with: actions[] (name, cost, preconditions, effects), max_plan_depth, max_plan_time_ms. Output ONLY valid JSON.",
      userPromptBuilder: () =>
        `Create a GOAP planner for an NPC with 6-8 actions (patrol, investigate, attack, flee, seek_cover, reload, heal, alert_allies).\n\nOutput valid JSON: {actions: [{name, cost, preconditions, effects}], max_plan_depth, max_plan_time_ms}.`,
      maxTokens: 800,
    });
  },

  "npc_combat_combat_engage_target": async (args) => {
    const stance = String(args.stance || "balanced");
    return llmGenerate(args, {
      title: "Engage Combat Target",
      category: "NPC Combat AI",
      systemPrompt:
        "You are a combat AI designer. Output a JSON combat engagement plan with: stance, approach_strategy, cover_usage, fire_pattern, flank_probability, retreat_threshold_hp. Output ONLY valid JSON.",
      userPromptBuilder: () =>
        `Create a combat engagement plan for stance: ${stance}.\n\nOutput valid JSON: {stance, approach_strategy, cover_usage, fire_pattern, flank_probability, retreat_threshold_hp}.`,
      maxTokens: 400,
    });
  },

  "combat_ballistics_fire_projectile": async (args) => {
    const projectileType = String(args.projectile_type || "bullet");
    const speedMs = Number(args.speed_ms ?? 800);
    return llmGenerate(args, {
      title: "Fire Projectile",
      category: "Ballistics & Damage",
      systemPrompt:
        "You are a ballistics engineer. Output a JSON projectile config with: type, speed_ms, mass_kg, drag_coefficient, gravity_scale, lifetime_s, damage, penetration. Output ONLY valid JSON.",
      userPromptBuilder: () =>
        `Create a ${projectileType} projectile, ${speedMs} m/s.\n\nOutput valid JSON: {type, speed_ms, mass_kg, drag_coefficient, gravity_scale, lifetime_s, damage, penetration}.`,
      maxTokens: 300,
    });
  },

  "combat_melee_light_attack": async (args) => {
    const direction = String(args.direction || "front");
    return llmGenerate(args, {
      title: "Light Attack",
      category: "Melee Combat",
      systemPrompt:
        "You are a combat designer. Output a JSON melee attack config with: type, direction, damage, windup_s, active_s, recovery_s, hitbox, knockback. Output ONLY valid JSON.",
      userPromptBuilder: () =>
        `Create a light melee attack, direction: ${direction}.\n\nOutput valid JSON: {type, direction, damage, windup_s, active_s, recovery_s, hitbox: {size, offset}, knockback}.`,
      maxTokens: 300,
    });
  },

  "post_processing_set_bloom": async (args) => {
    const intensity = Number(args.intensity ?? 1);
    return llmGenerate(args, {
      title: "Set Bloom Effect",
      category: "Post-Processing Effects",
      systemPrompt:
        "You are a graphics engineer. Output a JSON bloom post-FX config with: intensity, threshold, radius, quality, iterations. Output ONLY valid JSON.",
      userPromptBuilder: () =>
        `Create a bloom config, intensity ${intensity}.\n\nOutput valid JSON: {intensity, threshold, radius, quality, iterations}.`,
      maxTokens: 200,
    });
  },

  "post_processing_set_depth_of_field": async (args) => {
    const focalDistance = Number(args.focal_distance_m ?? 5);
    return llmGenerate(args, {
      title: "Set Depth of Field",
      category: "Post-Processing Effects",
      systemPrompt:
        "You are a graphics engineer. Output a JSON DOF config with: focal_distance_m, aperture, bokeh_quality, autofocus, blur_amount. Output ONLY valid JSON.",
      userPromptBuilder: () =>
        `Create a DOF config, focus at ${focalDistance}m.\n\nOutput valid JSON: {focal_distance_m, aperture, bokeh_quality, autofocus, blur_amount}.`,
      maxTokens: 200,
    });
  },

  "physics_collision_set_collision_layer": async (args) => {
    const layerName = String(args.layer_name || "player");
    return llmGenerate(args, {
      title: "Set Collision Layer",
      category: "Collision Detection",
      systemPrompt:
        "You are a physics engineer. Output a JSON collision layer config with: layer_name, layer_id, collides_with[], description. Output ONLY valid JSON.",
      userPromptBuilder: () =>
        `Create a collision layer named "${layerName}".\n\nOutput valid JSON: {layer_name, layer_id, collides_with: [...], description}.`,
      maxTokens: 200,
    });
  },

  "animation_procedural_add_head_look_at": async (args) => {
    return llmGenerate(args, {
      title: "Add Head Look-At",
      category: "Procedural Animation",
      systemPrompt:
        "You are an animation engineer. Output a JSON head look-at config with: max_yaw_deg, max_pitch_deg, track_speed, spine_follow, eye_dart. Output ONLY valid JSON.",
      userPromptBuilder: () =>
        `Create a head look-at procedural anim config.\n\nOutput valid JSON: {max_yaw_deg, max_pitch_deg, track_speed, spine_follow, eye_dart}.`,
      maxTokens: 200,
    });
  },

  "vehicle_dynamics_set_engine_torque_curve": async (args) => {
    return llmGenerate(args, {
      title: "Set Engine Torque Curve",
      category: "Vehicle Physics & Dynamics",
      systemPrompt:
        "You are a vehicle physics engineer. Output a JSON torque curve with: points[] (rpm, torque_nm), redline_rpm, idle_rpm, peak_torque_rpm. Output ONLY valid JSON.",
      userPromptBuilder: () =>
        `Create an engine torque curve for a V8 engine.\n\nOutput valid JSON: {points: [{rpm, torque_nm}], redline_rpm, idle_rpm, peak_torque_rpm}.`,
      maxTokens: 400,
    });
  },

  "save_load_save_game": async (args) => {
    const slotName = String(args.slot_name || "quicksave");
    return llmGenerate(args, {
      title: "Save Game",
      category: "Save / Load Systems",
      systemPrompt:
        "You are a save system engineer. Output a JSON save slot config with: slot_name, save_type, data_hash, screenshot, world_state_diff, player_state, timestamp. Output ONLY valid JSON.",
      userPromptBuilder: () =>
        `Create a save game config for slot "${slotName}".\n\nOutput valid JSON: {slot_name, save_type, data_hash, screenshot, world_state_diff, player_state, timestamp}.`,
      maxTokens: 400,
    });
  },

  "multiplayer_create_lobby": async (args) => {
    const name = String(args.name || "Open City");
    const maxPlayers = Number(args.max_players ?? 8);
    return llmGenerate(args, {
      title: "Create Multiplayer Lobby",
      category: "Multiplayer / Network",
      systemPrompt:
        "You are a multiplayer engineer. Output a JSON lobby config with: name, max_players, visibility, game_mode, join_code, region, tick_rate_hz. Output ONLY valid JSON.",
      userPromptBuilder: () =>
        `Create a multiplayer lobby named "${name}", max ${maxPlayers} players.\n\nOutput valid JSON: {name, max_players, visibility, game_mode, join_code, region, tick_rate_hz}.`,
      maxTokens: 300,
    });
  },

  "world_roads_generate_road_network": async (args) => {
    const pattern = String(args.pattern || "grid");
    return llmGenerate(args, {
      title: "Generate Road Network",
      category: "Road Networks",
      systemPrompt:
        "You are a world designer. Output a JSON road network config with: pattern, main_road_count, block_size_m, segments[] (id, type, length_m, lanes, connections). Output ONLY valid JSON.",
      userPromptBuilder: () =>
        `Create a ${pattern} road network with 8-12 segments.\n\nOutput valid JSON: {pattern, main_road_count, block_size_m, segments: [{id, type, length_m, lanes, connections}]}.`,
      maxTokens: 600,
    });
  },

  "world_props_placement_scatter_props": async (args) => {
    const distribution = String(args.distribution || "clustered");
    return llmGenerate(args, {
      title: "Scatter Props in Area",
      category: "Procedural Prop Placement",
      systemPrompt:
        "You are a level designer. Output a JSON scatter config with: prop_id, distribution, density_per_sqm, seed, collision, instances[] (x, y, z, rotation, scale). Output ONLY valid JSON.",
      userPromptBuilder: () =>
        `Create a scatter config, distribution: ${distribution}, 10-15 instances.\n\nOutput valid JSON: {prop_id, distribution, density_per_sqm, seed, collision, instances: [{x, y, z, rotation, scale}]}.`,
      maxTokens: 500,
    });
  },

  "code_scripts_generate_trigger_zone": async (args) => {
    const shape = String(args.shape || "box");
    return llmGenerate(args, {
      title: "Generate Trigger Zone Script",
      category: "Code Generation - Game Scripts",
      systemPrompt:
        "You are a game developer. Output TypeScript code for a trigger zone with onEnter/onExit/onStay callbacks. Output ONLY the code in a fenced block.",
      userPromptBuilder: () =>
        `Generate a TypeScript trigger zone script, shape: ${shape}, with on_enter/on_exit/on_stay callback stubs.\n\nOutput only the code in a \`\`\`typescript block.`,
      maxTokens: 600,
    });
  },

  "code_scripts_generate_quest_script": async (args) => {
    return llmGenerate(args, {
      title: "Generate Quest Script",
      category: "Code Generation - Game Scripts",
      systemPrompt:
        "You are a quest designer. Output TypeScript code for a quest with objectives, rewards, and state tracking. Output ONLY the code in a fenced block.",
      userPromptBuilder: () =>
        `Generate a TypeScript quest script with: start, complete, fail, objective tracking, reward granting.\n\nOutput only the code in a \`\`\`typescript block.`,
      maxTokens: 1000,
    });
  },

  "code_shaders_generate_water_shader": async (args) => {
    return llmGenerate(args, {
      title: "Generate Water Shader",
      category: "Code Generation - Shaders",
      systemPrompt:
        "You are a graphics engineer. Output a complete GLSL fragment shader for water with waves, refraction, and foam. Output ONLY the shader code in a fenced block.",
      userPromptBuilder: () =>
        `Generate a GLSL 300 ES water fragment shader with wave animation, refraction, reflection, and foam.\n\nOutput only the shader code in a \`\`\`glsl block.`,
      maxTokens: 1200,
    });
  },

  "lighting_realtime_add_point_light": async (args) => {
    const intensity = Number(args.intensity ?? 800);
    return llmGenerate(args, {
      title: "Add Point Light",
      category: "Realtime Lighting",
      systemPrompt:
        "You are a lighting engineer. Output a JSON point light config with: position, color_hex, intensity, range_m, cast_shadows, falloff. Output ONLY valid JSON.",
      userPromptBuilder: () =>
        `Create a point light config, intensity ${intensity} lumens.\n\nOutput valid JSON: {position: [x,y,z], color_hex, intensity, range_m, cast_shadows, falloff}.`,
      maxTokens: 200,
    });
  },

  "lighting_baked_bake_lightmap": async (args) => {
    const quality = String(args.quality || "high");
    return llmGenerate(args, {
      title: "Bake Lightmap",
      category: "Baked Lighting & Lightmaps",
      systemPrompt:
        "You are a lighting engineer. Output a JSON lightmap bake config with: texels_per_meter, quality, bounces, ambient_occlusion, samples. Output ONLY valid JSON.",
      userPromptBuilder: () =>
        `Create a lightmap bake config, quality: ${quality}.\n\nOutput valid JSON: {texels_per_meter, quality, bounces, ambient_occlusion, samples}.`,
      maxTokens: 200,
    });
  },

  "materials_procedural_noise_material": async (args) => {
    const noiseType = String(args.noise_type || "perlin");
    return llmGenerate(args, {
      title: "Generate Noise Material",
      category: "Procedural Materials",
      systemPrompt:
        "You are a materials artist. Output a JSON noise material config with: noise_type, frequency, octaves, persistence, color_ramp. Output ONLY valid JSON.",
      userPromptBuilder: () =>
        `Create a ${noiseType} noise material.\n\nOutput valid JSON: {noise_type, frequency, octaves, persistence, color_ramp: [{position, color_hex}]}.`,
      maxTokens: 300,
    });
  },

  "environment_set_weather_state": async (args) => {
    const weather = String(args.weather || "rain");
    return llmGenerate(args, {
      title: "Set Weather State",
      category: "Environment & Atmosphere",
      systemPrompt:
        "You are an environment designer. Output a JSON weather config with: weather, transition_seconds, intensity, particle_count, wind_speed_ms, fog_density, ambient_sound. Output ONLY valid JSON.",
      userPromptBuilder: () =>
        `Create a ${weather} weather config.\n\nOutput valid JSON: {weather, transition_seconds, intensity, particle_count, wind_speed_ms, fog_density, ambient_sound}.`,
      maxTokens: 300,
    });
  },

  /* ---------- Round 6: 24 more real handlers (target 100+) ---------- */
  "water_generate_ocean": async (args) => {
    return imageGenerate(args, {
      title: "Generate Ocean Surface",
      category: "Water & Fluids",
      promptBuilder: () =>
        `A vast animated ocean surface with waves, foam, and depth-based color, game environment concept art, photorealistic, wide shot.`,
      size: "1440x720",
    });
  },

  "water_generate_waterfall": async (args) => {
    const heightM = Number(args.height_m ?? 20);
    return imageGenerate(args, {
      title: "Generate Waterfall",
      category: "Water & Fluids",
      promptBuilder: () =>
        `A ${heightM}m waterfall with falling water sheet, mist particles, and splash at base, game environment concept art, photorealistic.`,
    });
  },

  "props_generate_furniture_set": async (args) => {
    const roomType = String(args.room_type || "living");
    return imageGenerate(args, {
      title: "Generate Furniture Set",
      category: "Props & Objects",
      promptBuilder: () =>
        `A coordinated ${roomType} room furniture set, game prop concept art, photorealistic, neutral background, isolated.`,
    });
  },

  "props_generate_consumable": async (args) => {
    const consumableType = String(args.consumable_type || "health");
    return imageGenerate(args, {
      title: "Generate Consumable Item",
      category: "Props & Objects",
      promptBuilder: () =>
        `A ${consumableType} consumable game item with glowing pickup effect, game prop concept art, photorealistic, dark background.`,
    });
  },

  "terrain_generate_cave_system": async (args) => {
    return imageGenerate(args, {
      title: "Generate Cave System",
      category: "Terrain & Landscape",
      promptBuilder: () =>
        `An interconnected cave system with stalactites, stalagmites, and underground pools, game environment concept art, atmospheric lighting, photorealistic.`,
      size: "1440x720",
    });
  },

  "terrain_generate_canyon": async (args) => {
    return imageGenerate(args, {
      title: "Generate Canyon / Gorge",
      category: "Terrain & Landscape",
      promptBuilder: () =>
        `A deep canyon with layered rock walls and a river at the bottom, game environment concept art, golden-hour lighting, photorealistic.`,
      size: "1440x720",
    });
  },

  "buildings_generate_warehouse": async (args) => {
    return imageGenerate(args, {
      title: "Generate Industrial Warehouse",
      category: "Buildings & Architecture",
      promptBuilder: () =>
        `A large industrial warehouse with loading bays, overhead crane, and storage racks, game architectural concept art, photorealistic, dramatic lighting.`,
    });
  },

  "buildings_generate_shop": async (args) => {
    const shopType = String(args.shop_type || "grocery");
    return imageGenerate(args, {
      title: "Generate Shop / Storefront",
      category: "Buildings & Architecture",
      promptBuilder: () =>
        `A ${shopType} shop storefront with illuminated signage, window display, and entrance, game architectural concept art, nighttime, photorealistic.`,
    });
  },

  "vehicles_generate_truck": async (args) => {
    const truckType = String(args.truck_type || "semi_tractor");
    return imageGenerate(args, {
      title: "Generate Truck / Hauler",
      category: "Vehicles & Transportation",
      promptBuilder: () =>
        `3/4 front view of a ${truckType} truck, game vehicle concept art, urban background, dramatic lighting, photorealistic.`,
    });
  },

  "vehicles_generate_plane": async (args) => {
    const planeType = String(args.plane_type || "prop_small");
    return imageGenerate(args, {
      title: "Generate Airplane",
      category: "Vehicles & Transportation",
      promptBuilder: () =>
        `A ${planeType} airplane with retractable landing gear, game vehicle concept art, sky background, photorealistic.`,
    });
  },

  "vehicles_generate_boat": async (args) => {
    const boatType = String(args.boat_type || "speedboat");
    return imageGenerate(args, {
      title: "Generate Boat / Watercraft",
      category: "Vehicles & Transportation",
      promptBuilder: () =>
        `A ${boatType} boat with wake particles, game vehicle concept art, water background, photorealistic.`,
    });
  },

  "characters_generate_companion": async (args) => {
    const name = String(args.name || "Jenna");
    const role = String(args.role || "dps");
    return imageGenerate(args, {
      title: "Build Companion Character",
      category: "3D Character Models",
      promptBuilder: () =>
        `Full-body portrait of ${name}, a ${role} companion character, game character concept art, neutral background, photorealistic, detailed equipment.`,
    });
  },

  "npc_dialog_greet_player": async (args) => {
    const context = String(args.context || "first_meeting");
    return llmGenerate(args, {
      title: "Greet Player",
      category: "NPC Dialogue AI",
      systemPrompt:
        "You are an NPC in an open-world game. Generate a contextual greeting (1-2 sentences) based on the context. Output ONLY the greeting text, no quotes, no explanation.",
      userPromptBuilder: () =>
        `Generate an NPC greeting for context: ${context}. Keep it under 100 chars, in-character, memorable.`,
      maxTokens: 80,
    });
  },

  "npc_dialog_set_dialog_mood": async (args) => {
    const mood = String(args.mood || "angry");
    return llmGenerate(args, {
      title: "Set Dialog Mood",
      category: "NPC Dialogue AI",
      systemPrompt:
        "You are a dialog designer. Output a JSON mood config with: mood, intensity, word_choices, tone_modifier, body_language. Output ONLY valid JSON.",
      userPromptBuilder: () =>
        `Create a dialog mood config for mood: ${mood}.\n\nOutput valid JSON: {mood, intensity, word_choices, tone_modifier, body_language}.`,
      maxTokens: 200,
    });
  },

  "cutscenes_add_camera_shot": async (args) => {
    const shotType = String(args.shot_type || "close_up");
    return llmGenerate(args, {
      title: "Add Camera Shot",
      category: "Cutscenes & Cinematics",
      systemPrompt:
        "You are a cinematic director. Output a JSON camera shot config with: shot_type, start_s, duration_s, target, camera_move, fov_deg, transition. Output ONLY valid JSON.",
      userPromptBuilder: () =>
        `Create a ${shotType} camera shot config.\n\nOutput valid JSON: {shot_type, start_s, duration_s, target: [x,y,z], camera_move, fov_deg, transition}.`,
      maxTokens: 300,
    });
  },

  "camera_systems_create_first_person_camera": async (args) => {
    return llmGenerate(args, {
      title: "Create First-Person Camera",
      category: "Camera Systems",
      systemPrompt:
        "You are a gameplay engineer. Output a JSON first-person camera config with: eye_height_m, fov_deg, view_bob, bob_amount, weapon_sway. Output ONLY valid JSON.",
      userPromptBuilder: () =>
        `Create a first-person camera config.\n\nOutput valid JSON: {eye_height_m, fov_deg, view_bob, bob_amount, weapon_sway}.`,
      maxTokens: 200,
    });
  },

  "physics_soft_create_cloth": async (args) => {
    const fabric = String(args.fabric || "silk");
    return llmGenerate(args, {
      title: "Create Cloth",
      category: "Soft Body Physics",
      systemPrompt:
        "You are a physics engineer. Output a JSON cloth config with: width_m, height_m, resolution, fabric_type, self_collision, wind_response. Output ONLY valid JSON.",
      userPromptBuilder: () =>
        `Create a ${fabric} cloth config.\n\nOutput valid JSON: {width_m, height_m, resolution, fabric_type, self_collision, wind_response}.`,
      maxTokens: 200,
    });
  },

  "physics_particles_create_particle_system": async (args) => {
    return llmGenerate(args, {
      title: "Create Particle System",
      category: "Particle Physics & Effects",
      systemPrompt:
        "You are a VFX engineer. Output a JSON particle system config with: max_particles, lifetime_s, emission_rate, initial_velocity, gravity_scale, color_ramp, size_curve. Output ONLY valid JSON.",
      userPromptBuilder: () =>
        `Create a particle system config for fire effects.\n\nOutput valid JSON: {max_particles, lifetime_s, emission_rate, initial_velocity, gravity_scale, color_ramp, size_curve}.`,
      maxTokens: 300,
    });
  },

  "ui_menus_create_inventory_grid": async (args) => {
    const columns = Number(args.columns ?? 8);
    return llmGenerate(args, {
      title: "Create Inventory Grid",
      category: "Menus & Interfaces",
      systemPrompt:
        "You are a UI designer. Output a JSON inventory grid config with: columns, rows, slot_size_px, show_stack_counts, drag_drop, sort_options. Output ONLY valid JSON.",
      userPromptBuilder: () =>
        `Create an inventory grid with ${columns} columns.\n\nOutput valid JSON: {columns, rows, slot_size_px, show_stack_counts, drag_drop, sort_options}.`,
      maxTokens: 200,
    });
  },

  "ui_menus_create_shop_interface": async (args) => {
    return llmGenerate(args, {
      title: "Create Shop Interface",
      category: "Menus & Interfaces",
      systemPrompt:
        "You are a UI designer. Output a JSON shop interface config with: tabs, items_per_page, show_stats, buyback_enabled, currency_symbol. Output ONLY valid JSON.",
      userPromptBuilder: () =>
        `Create a shop interface config.\n\nOutput valid JSON: {tabs, items_per_page, show_stats, buyback_enabled, currency_symbol}.`,
      maxTokens: 200,
    });
  },

  "economy_set_dynamic_pricing": async (args) => {
    return llmGenerate(args, {
      title: "Set Dynamic Pricing",
      category: "Economy & Trade",
      systemPrompt:
        "You are an economy designer. Output a JSON dynamic pricing config with: enabled, elasticity, base_stock, max_price_multiplier, min_price_multiplier. Output ONLY valid JSON.",
      userPromptBuilder: () =>
        `Create a dynamic pricing config.\n\nOutput valid JSON: {enabled, elasticity, base_stock, max_price_multiplier, min_price_multiplier}.`,
      maxTokens: 200,
    });
  },

  "inventory_add_item": async (args) => {
    return llmGenerate(args, {
      title: "Add Item to Inventory",
      category: "Inventory Systems",
      systemPrompt:
        "You are an inventory system engineer. Output a JSON add-item result with: slot_index, item_id, quantity, stacked, overflow. Output ONLY valid JSON.",
      userPromptBuilder: () =>
        `Simulate adding an item to a 30-slot inventory.\n\nOutput valid JSON: {slot_index, item_id, quantity, stacked, overflow}.`,
      maxTokens: 200,
    });
  },

  "performance_setup_occlusion_culling": async (args) => {
    return llmGenerate(args, {
      title: "Setup Occlusion Culling",
      category: "Performance Optimization",
      systemPrompt:
        "You are a performance engineer. Output a JSON occlusion culling config with: method, occluder_resolution, aggressive, conservative. Output ONLY valid JSON.",
      userPromptBuilder: () =>
        `Create an occlusion culling config.\n\nOutput valid JSON: {method, occluder_resolution, aggressive, conservative}.`,
      maxTokens: 200,
    });
  },

  "world_cities_generate_district": async (args) => {
    const districtType = String(args.district_type || "downtown");
    return llmGenerate(args, {
      title: "Generate District",
      category: "City Generation",
      systemPrompt:
        "You are a world designer. Output a JSON district config with: type, area_sqkm, building_density_pct, landmarks[], vibe, population_density. Output ONLY valid JSON.",
      userPromptBuilder: () =>
        `Create a ${districtType} district config.\n\nOutput valid JSON: {type, area_sqkm, building_density_pct, landmarks, vibe, population_density}.`,
      maxTokens: 400,
    });
  },

  /* ---------- Round 7: 25 more real handlers (target 125+) ---------- */
  "characters_generate_elderly_npc": async (args) => {
    const ageYears = Number(args.age_years ?? 72);
    return imageGenerate(args, {
      title: "Generate Elderly NPC",
      category: "3D Character Models",
      promptBuilder: () =>
        `Full-body portrait of an elderly ${args.gender || "female"} NPC, ${ageYears} years old, with wrinkles and gray hair, game character concept art, neutral background, photorealistic.`,
    });
  },

  "characters_generate_soldier": async (args) => {
    return imageGenerate(args, {
      title: "Generate Soldier NPC",
      category: "3D Character Models",
      promptBuilder: () =>
        `Full-body portrait of a battle-hardened soldier NPC in tactical military gear, game character concept art, neutral background, photorealistic, detailed equipment.`,
    });
  },

  "characters_generate_vendor": async (args) => {
    return imageGenerate(args, {
      title: "Generate Vendor NPC",
      category: "3D Character Models",
      promptBuilder: () =>
        `Full-body portrait of a street vendor NPC with market stall wares, game character concept art, neutral background, photorealistic, characterful.`,
    });
  },

  "characters_rig_skeleton": async (args) => {
    return llmGenerate(args, {
      title: "Auto-Rig Character Skeleton",
      category: "3D Character Models",
      systemPrompt:
        "You are a rigging engineer. Output a JSON skeleton config with: rig_type, bone_count, bones[] (name, parent, position, rotation), ik_chains[]. Output ONLY valid JSON.",
      userPromptBuilder: () =>
        `Generate a humanoid skeleton rig config with 25-30 bones.\n\nOutput valid JSON: {rig_type, bone_count, bones: [{name, parent, position, rotation}], ik_chains}.`,
      maxTokens: 800,
    });
  },

  "characters_apply_morph_targets": async (args) => {
    return llmGenerate(args, {
      title: "Apply Morph Targets (Blendshapes)",
      category: "3D Character Models",
      systemPrompt:
        "You are a facial animation engineer. Output a JSON morph target config with: emotions[] (name, weight, blendshapes[]), visemes[] (name, weight). Output ONLY valid JSON.",
      userPromptBuilder: () =>
        `Generate a morph target config with 6 emotions + 15 visemes.\n\nOutput valid JSON: {emotions: [{name, weight, blendshapes: [{name, value}]}], visemes: [{name, weight}]}.`,
      maxTokens: 600,
    });
  },

  "vehicles_tune_handling": async (args) => {
    const grip = Number(args.grip ?? 0.85);
    return llmGenerate(args, {
      title: "Tune Vehicle Handling",
      category: "Vehicle Physics & Dynamics",
      systemPrompt:
        "You are a vehicle physics engineer. Output a JSON handling config with: grip, suspension_stiffness, mass_kg, brake_force, drift_factor, center_of_mass. Output ONLY valid JSON.",
      userPromptBuilder: () =>
        `Create a vehicle handling config with grip ${grip}.\n\nOutput valid JSON: {grip, suspension_stiffness, mass_kg, brake_force, drift_factor, center_of_mass: [x,y,z]}.`,
      maxTokens: 200,
    });
  },

  "vehicles_apply_paint_job": async (args) => {
    const primaryColor = String(args.primary_color || "red");
    return llmGenerate(args, {
      title: "Apply Paint Job / Livery",
      category: "Vehicles & Transportation",
      systemPrompt:
        "You are a vehicle customization designer. Output a JSON paint job config with: paint_type, primary_color, secondary_color, decals[], metallic, clear_coat. Output ONLY valid JSON.",
      userPromptBuilder: () =>
        `Create a paint job config, primary color: ${primaryColor}.\n\nOutput valid JSON: {paint_type, primary_color, secondary_color, decals, metallic, clear_coat}.`,
      maxTokens: 200,
    });
  },

  "buildings_add_destructible_walls": async (args) => {
    return llmGenerate(args, {
      title: "Add Destructible Walls",
      category: "Buildings & Architecture",
      systemPrompt:
        "You are a destruction physics engineer. Output a JSON destructible wall config with: wall_ids[], material, hp, chunk_count, fracture_pattern. Output ONLY valid JSON.",
      userPromptBuilder: () =>
        `Create a destructible wall config for 5 walls.\n\nOutput valid JSON: {wall_ids, material, hp, chunk_count, fracture_pattern}.`,
      maxTokens: 200,
    });
  },

  "buildings_interior_navigation_graph": async (args) => {
    return llmGenerate(args, {
      title: "Generate Interior Navigation Graph",
      category: "Buildings & Architecture",
      systemPrompt:
        "You are a navigation engineer. Output a JSON interior nav graph with: nodes[] (id, position, connections), doors[] (id, connected_nodes). Output ONLY valid JSON.",
      userPromptBuilder: () =>
        `Generate an interior nav graph for a 3-floor building with 15-20 nodes.\n\nOutput valid JSON: {nodes: [{id, position: [x,y,z], connections: []}], doors: [{id, connected_nodes: []}]}.`,
      maxTokens: 600,
    });
  },

  "props_generate_safe_prop": async (args) => {
    return imageGenerate(args, {
      title: "Generate Safe / Lockbox Prop",
      category: "Props & Objects",
      promptBuilder: () =>
        `A medium-sized safe with combination lock and drillable door, game prop concept art, photorealistic, dark background, isolated.`,
    });
  },

  "props_generate_money_prop": async (args) => {
    return imageGenerate(args, {
      title: "Generate Money / Cash Prop",
      category: "Props & Objects",
      promptBuilder: () =>
        `Stacks of cash money with glowing pickup effect, game prop concept art, photorealistic, dark background, isolated.`,
    });
  },

  "environment_set_fog": async (args) => {
    const fogType = String(args.fog_type || "exponential");
    return llmGenerate(args, {
      title: "Set Fog Configuration",
      category: "Environment & Atmosphere",
      systemPrompt:
        "You are an environment engineer. Output a JSON fog config with: fog_type, color_hex, density, start_distance_m, max_distance_m. Output ONLY valid JSON.",
      userPromptBuilder: () =>
        `Create a ${fogType} fog config.\n\nOutput valid JSON: {fog_type, color_hex, density, start_distance_m, max_distance_m}.`,
      maxTokens: 200,
    });
  },

  "environment_set_time_of_day": async (args) => {
    const startTime = String(args.start_time || "morning");
    return llmGenerate(args, {
      title: "Set Time of Day Cycle",
      category: "Environment & Atmosphere",
      systemPrompt:
        "You are an environment engineer. Output a JSON time-of-day config with: cycle_minutes, start_time, auto_advance, sun_curve, ambient_curve. Output ONLY valid JSON.",
      userPromptBuilder: () =>
        `Create a time-of-day cycle config starting at ${startTime}.\n\nOutput valid JSON: {cycle_minutes, start_time, auto_advance, sun_curve, ambient_curve}.`,
      maxTokens: 200,
    });
  },

  "terrain_generate_heightmap": async (args) => {
    const amplitudeM = Number(args.amplitude_m ?? 500);
    return llmGenerate(args, {
      title: "Generate Procedural Heightmap",
      category: "Terrain & Landscape",
      systemPrompt:
        "You are a terrain engineer. Output a JSON heightmap config with: resolution, amplitude_m, noise_type, erosion_amount, seed, octaves. Output ONLY valid JSON.",
      userPromptBuilder: () =>
        `Generate a heightmap config, amplitude ${amplitudeM}m.\n\nOutput valid JSON: {resolution, amplitude_m, noise_type, erosion_amount, seed, octaves}.`,
      maxTokens: 200,
    });
  },

  "terrain_generate_island": async (args) => {
    const biome = String(args.biome || "tropical");
    return imageGenerate(args, {
      title: "Generate Island",
      category: "Terrain & Landscape",
      promptBuilder: () =>
        `A ${biome} island viewed from above, with coast, beaches, hills, and interior vegetation, game environment concept art, photorealistic.`,
      size: "1440x720",
    });
  },

  "vegetation_generate_bush": async (args) => {
    return imageGenerate(args, {
      title: "Generate Bush / Shrub",
      category: "Vegetation & Flora",
      promptBuilder: () =>
        `A round bush shrub with foliage, game vegetation concept art, photorealistic, neutral background, isolated.`,
    });
  },

  "vegetation_generate_flower_patch": async (args) => {
    return imageGenerate(args, {
      title: "Generate Flower Patch",
      category: "Vegetation & Flora",
      promptBuilder: () =>
        `A colorful flower patch with multiple species, game vegetation concept art, photorealistic, neutral background.`,
    });
  },

  "water_set_water_clarity": async (args) => {
    const clarity = String(args.clarity || "clear");
    return llmGenerate(args, {
      title: "Set Water Clarity",
      category: "Water & Fluids",
      systemPrompt:
        "You are a water FX engineer. Output a JSON water clarity config with: clarity, tint_r, tint_g, tint_b, transparency, murkiness. Output ONLY valid JSON.",
      userPromptBuilder: () =>
        `Create a water clarity config, clarity: ${clarity}.\n\nOutput valid JSON: {clarity, tint_r, tint_g, tint_b, transparency, murkiness}.`,
      maxTokens: 200,
    });
  },

  "lighting_realtime_add_spotlight": async (args) => {
    return llmGenerate(args, {
      title: "Add Spotlight",
      category: "Realtime Lighting",
      systemPrompt:
        "You are a lighting engineer. Output a JSON spotlight config with: position, target, cone_angle_deg, penumbra, color_hex, intensity, cast_shadows. Output ONLY valid JSON.",
      userPromptBuilder: () =>
        `Create a spotlight config.\n\nOutput valid JSON: {position: [x,y,z], target: [x,y,z], cone_angle_deg, penumbra, color_hex, intensity, cast_shadows}.`,
      maxTokens: 200,
    });
  },

  "lighting_realtime_add_directional_light": async (args) => {
    return llmGenerate(args, {
      title: "Add Directional Light",
      category: "Realtime Lighting",
      systemPrompt:
        "You are a lighting engineer. Output a JSON directional light config with: direction, color_hex, intensity, cast_shadows, shadow_distance. Output ONLY valid JSON.",
      userPromptBuilder: () =>
        `Create a directional (sun) light config.\n\nOutput valid JSON: {direction: [x,y,z], color_hex, intensity, cast_shadows, shadow_distance}.`,
      maxTokens: 200,
    });
  },

  "materials_pbr_generate_concrete_material": async (args) => {
    return llmGenerate(args, {
      title: "Generate Concrete Material",
      category: "PBR Materials",
      systemPrompt:
        "You are a materials artist. Output a JSON concrete PBR material config with: concrete_type, crack_density, stain_amount, resolution, albedo_hex, roughness. Output ONLY valid JSON.",
      userPromptBuilder: () =>
        `Create a rough concrete material config.\n\nOutput valid JSON: {concrete_type, crack_density, stain_amount, resolution, albedo_hex, roughness}.`,
      maxTokens: 200,
    });
  },

  "materials_pbr_generate_metal_material": async (args) => {
    const metalType = String(args.metal_type || "steel");
    return llmGenerate(args, {
      title: "Generate Metal Material",
      category: "PBR Materials",
      systemPrompt:
        "You are a materials artist. Output a JSON metal PBR material config with: metal_type, rust_amount, anisotropic, albedo_hex, roughness, metallic. Output ONLY valid JSON.",
      userPromptBuilder: () =>
        `Create a ${metalType} metal material config.\n\nOutput valid JSON: {metal_type, rust_amount, anisotropic, albedo_hex, roughness, metallic}.`,
      maxTokens: 200,
    });
  },

  "materials_pbr_generate_wood_material": async (args) => {
    return llmGenerate(args, {
      title: "Generate Wood Material",
      category: "PBR Materials",
      systemPrompt:
        "You are a materials artist. Output a JSON wood PBR material config with: wood_type, grain_strength, plank_count, with_knots, albedo_hex, roughness. Output ONLY valid JSON.",
      userPromptBuilder: () =>
        `Create an oak wood material config.\n\nOutput valid JSON: {wood_type, grain_strength, plank_count, with_knots, albedo_hex, roughness}.`,
      maxTokens: 200,
    });
  },

  "shaders_create_toon_shader": async (args) => {
    return llmGenerate(args, {
      title: "Create Toon Shader",
      category: "Shaders & GLSL",
      systemPrompt:
        "You are a graphics engineer. Output a complete GLSL fragment shader for cel-shaded toon rendering with stepped lighting and outline. Output ONLY the shader code in a fenced block.",
      userPromptBuilder: () =>
        `Generate a GLSL 300 ES toon fragment shader with 4 cel shading steps and outline.\n\nOutput only the shader code in a \`\`\`glsl block.`,
      maxTokens: 1000,
    });
  },

  "post_processing_set_color_grading": async (args) => {
    const preset = String(args.preset || "teal_orange");
    return llmGenerate(args, {
      title: "Set Color Grading LUT",
      category: "Post-Processing Effects",
      systemPrompt:
        "You are a colorist. Output a JSON color grading config with: preset, intensity, lut_data, shadows_lift, highlights_gain, saturation. Output ONLY valid JSON.",
      userPromptBuilder: () =>
        `Create a ${preset} color grading config.\n\nOutput valid JSON: {preset, intensity, lut_data: [r,g,b values], shadows_lift, highlights_gain, saturation}.`,
      maxTokens: 300,
    });
  },

  "physics_rigid_add_rigid_sphere": async (args) => {
    return llmGenerate(args, {
      title: "Add Rigid Sphere",
      category: "Rigid Body Physics",
      systemPrompt:
        "You are a physics engineer. Output a JSON rigid sphere config with: id, shape, radius_m, mass_kg, friction, restitution, rolling_friction. Output ONLY valid JSON.",
      userPromptBuilder: () =>
        `Create a rigid sphere config.\n\nOutput valid JSON: {id, shape: "sphere", radius_m, mass_kg, friction, restitution, rolling_friction}.`,
      maxTokens: 200,
    });
  },

  "npc_pathfinding_find_path": async (args) => {
    return llmGenerate(args, {
      title: "Find Path (A*)",
      category: "Pathfinding & NavMesh",
      systemPrompt:
        "You are a navigation engineer. Output a JSON pathfinding result with: waypoints[] (x,y,z), total_distance_m, heuristic, found. Output ONLY valid JSON.",
      userPromptBuilder: () =>
        `Simulate an A* pathfinding result between two points.\n\nOutput valid JSON: {waypoints: [{x, y, z}], total_distance_m, heuristic, found}.`,
      maxTokens: 300,
    });
  },

  /* ---------- Round 8: 25 more real handlers (target 150+) ---------- */
  "npc_combat_combat_take_cover": async (args) => {
    return llmGenerate(args, {
      title: "Take Cover",
      category: "NPC Combat AI",
      systemPrompt: "Output JSON cover config with: position, cover_quality, search_radius_m, nav_path. Only JSON.",
      userPromptBuilder: () => `Create a take-cover action config.\n\nOutput valid JSON: {position: [x,y,z], cover_quality, search_radius_m, nav_path: [[x,y,z]]}.`,
      maxTokens: 200,
    });
  },

  "npc_combat_combat_flank": async (args) => {
    return llmGenerate(args, {
      title: "Flank Maneuver",
      category: "NPC Combat AI",
      systemPrompt: "Output JSON flank config with: flank_side, flank_distance_m, path, estimated_time_s. Only JSON.",
      userPromptBuilder: () => `Create a flank maneuver config.\n\nOutput valid JSON: {flank_side, flank_distance_m, path: [[x,y,z]], estimated_time_s}.`,
      maxTokens: 200,
    });
  },

  "npc_behavior_add_sequence_node": async (args) => {
    return llmGenerate(args, {
      title: "Add Sequence Node",
      category: "NPC Behavior Trees",
      systemPrompt: "Output JSON BT sequence node with: id, type, children[], abort_type. Only JSON.",
      userPromptBuilder: () => `Create a behavior tree sequence node with 3 children.\n\nOutput valid JSON: {id, type: \"sequence\", children: [], abort_type}.`,
      maxTokens: 200,
    });
  },

  "npc_behavior_add_action_node": async (args) => {
    return llmGenerate(args, {
      title: "Add Action Node",
      category: "NPC Behavior Trees",
      systemPrompt: "Output JSON BT action node with: id, type, action_name, return_type. Only JSON.",
      userPromptBuilder: () => `Create a BT action node for 'patrol_checkpoint'.\n\nOutput valid JSON: {id, type: \"action\", action_name, return_type}.`,
      maxTokens: 150,
    });
  },

  "npc_decision_perception_sight": async (args) => {
    return llmGenerate(args, {
      title: "Add Sight Perception",
      category: "NPC Decision Making",
      systemPrompt: "Output JSON sight perception config with: fov_deg, range_m, affected_by_light, min_light_lux. Only JSON.",
      userPromptBuilder: () => `Create a sight perception config.\n\nOutput valid JSON: {fov_deg, range_m, affected_by_light, min_light_lux}.`,
      maxTokens: 200,
    });
  },

  "npc_decision_perception_hearing": async (args) => {
    return llmGenerate(args, {
      title: "Add Hearing Perception",
      category: "NPC Decision Making",
      systemPrompt: "Output JSON hearing perception config with: range_m, min_volume_db, attenuate_through_walls, wall_attenuation_db. Only JSON.",
      userPromptBuilder: () => `Create a hearing perception config.\n\nOutput valid JSON: {range_m, min_volume_db, attenuate_through_walls, wall_attenuation_db}.`,
      maxTokens: 200,
    });
  },

  "animation_skeletal_play_animation": async (args) => {
    return llmGenerate(args, {
      title: "Play Animation",
      category: "Skeletal Animation",
      systemPrompt: "Output JSON anim play config with: animation_id, fade_in_s, playback_speed, loop, layer. Only JSON.",
      userPromptBuilder: () => `Create an animation play config.\n\nOutput valid JSON: {animation_id, fade_in_s, playback_speed, loop, layer}.`,
      maxTokens: 150,
    });
  },

  "animation_skeletal_crossfade_animation": async (args) => {
    return llmGenerate(args, {
      title: "Crossfade Between Animations",
      category: "Skeletal Animation",
      systemPrompt: "Output JSON crossfade config with: to_animation_id, fade_s, sync_mode. Only JSON.",
      userPromptBuilder: () => `Create a crossfade config.\n\nOutput valid JSON: {to_animation_id, fade_s, sync_mode}.`,
      maxTokens: 150,
    });
  },

  "animation_blend_create_blend_tree_1d": async (args) => {
    return llmGenerate(args, {
      title: "Create 1D Blend Tree",
      category: "Animation Blend Trees & IK",
      systemPrompt: "Output JSON 1D blend tree with: parameter, min_value, max_value, animations[]. Only JSON.",
      userPromptBuilder: () => `Create a 1D blend tree for 'speed' parameter.\n\nOutput valid JSON: {parameter, min_value, max_value, animations: [{id, threshold}]}.`,
      maxTokens: 200,
    });
  },

  "physics_rigid_apply_force": async (args) => {
    return llmGenerate(args, {
      title: "Apply Force to Body",
      category: "Rigid Body Physics",
      systemPrompt: "Output JSON force application with: body_id, force, application_point, mode. Only JSON.",
      userPromptBuilder: () => `Create a force application config.\n\nOutput valid JSON: {body_id, force: [x,y,z], application_point: [x,y,z], mode}.`,
      maxTokens: 150,
    });
  },

  "physics_rigid_raycast": async (args) => {
    return llmGenerate(args, {
      title: "Raycast",
      category: "Rigid Body Physics",
      systemPrompt: "Output JSON raycast result with: origin, direction, max_distance_m, hit, point, normal, body_id. Only JSON.",
      userPromptBuilder: () => `Simulate a raycast result.\n\nOutput valid JSON: {origin: [x,y,z], direction: [x,y,z], max_distance_m, hit, point: [x,y,z], normal: [x,y,z], body_id}.`,
      maxTokens: 200,
    });
  },

  "physics_joints_add_spring_joint": async (args) => {
    return llmGenerate(args, {
      title: "Add Spring Joint",
      category: "Joints & Constraints",
      systemPrompt: "Output JSON spring joint with: body_a, body_b, stiffness, damping, rest_length_m. Only JSON.",
      userPromptBuilder: () => `Create a spring joint config.\n\nOutput valid JSON: {body_a, body_b, stiffness, damping, rest_length_m}.`,
      maxTokens: 150,
    });
  },

  "physics_collision_set_collision_filter": async (args) => {
    return llmGenerate(args, {
      title: "Set Collision Filter for Body",
      category: "Collision Detection",
      systemPrompt: "Output JSON collision filter with: body_id, layer_id, mask_bits. Only JSON.",
      userPromptBuilder: () => `Create a collision filter config.\n\nOutput valid JSON: {body_id, layer_id, mask_bits}.`,
      maxTokens: 100,
    });
  },

  "post_processing_set_vignette": async (args) => {
    return llmGenerate(args, {
      title: "Set Vignette",
      category: "Post-Processing Effects",
      systemPrompt: "Output JSON vignette config with: intensity, size, softness, color_hex. Only JSON.",
      userPromptBuilder: () => `Create a vignette config.\n\nOutput valid JSON: {intensity, size, softness, color_hex}.`,
      maxTokens: 150,
    });
  },

  "post_processing_set_motion_blur": async (args) => {
    return llmGenerate(args, {
      title: "Set Motion Blur",
      category: "Post-Processing Effects",
      systemPrompt: "Output JSON motion blur config with: intensity, max_blur_pixels, object_blur, camera_blur. Only JSON.",
      userPromptBuilder: () => `Create a motion blur config.\n\nOutput valid JSON: {intensity, max_blur_pixels, object_blur, camera_blur}.`,
      maxTokens: 150,
    });
  },

  "audio_sfx_generate_footstep_sfx": async (args) => {
    const surface = String(args.surface || "concrete");
    return ttsGenerate(args, {
      title: "Generate Footstep SFX",
      category: "SFX Generation",
      text: `Footstep on ${surface}. A solid ${surface} footstep sound. Thud.`,
      voice: "male",
    });
  },

  "audio_sfx_generate_engine_sfx": async (args) => {
    const engineType = String(args.engine_type || "v8");
    return ttsGenerate(args, {
      title: "Generate Vehicle Engine SFX",
      category: "SFX Generation",
      text: `${engineType} engine revving. Vroom vroom. A powerful ${engineType} engine sound.`,
      voice: "male",
    });
  },

  "audio_spatial_play_3d_sound": async (args) => {
    return llmGenerate(args, {
      title: "Play 3D Positioned Sound",
      category: "3D Spatial Audio",
      systemPrompt: "Output JSON 3D sound config with: audio_uri, position, max_distance_m, min_distance_m, rolloff. Only JSON.",
      userPromptBuilder: () => `Create a 3D positioned sound config.\n\nOutput valid JSON: {audio_uri, position: [x,y,z], max_distance_m, min_distance_m, rolloff}.`,
      maxTokens: 150,
    });
  },

  "audio_spatial_add_reverb_zone": async (args) => {
    return llmGenerate(args, {
      title: "Add Reverb Zone",
      category: "3D Spatial Audio",
      systemPrompt: "Output JSON reverb zone with: reverb_preset, position, radius_m, fade_distance_m. Only JSON.",
      userPromptBuilder: () => `Create a reverb zone config.\n\nOutput valid JSON: {reverb_preset, position: [x,y,z], radius_m, fade_distance_m}.`,
      maxTokens: 150,
    });
  },

  "ui_hud_create_crosshair": async (args) => {
    return llmGenerate(args, {
      title: "Create Crosshair / Reticle",
      category: "UI & HUD",
      systemPrompt: "Output JSON crosshair config with: crosshair_type, color_hex, size_px, hit_marker, headshot_indicator. Only JSON.",
      userPromptBuilder: () => `Create a crosshair widget config.\n\nOutput valid JSON: {crosshair_type, color_hex, size_px, hit_marker, headshot_indicator}.`,
      maxTokens: 150,
    });
  },

  "ui_hud_create_objective_marker": async (args) => {
    return llmGenerate(args, {
      title: "Create Objective Marker",
      category: "UI & HUD",
      systemPrompt: "Output JSON objective marker with: position, label, icon, color_hex, show_distance, visible_through_walls. Only JSON.",
      userPromptBuilder: () => `Create an objective marker config.\n\nOutput valid JSON: {position: [x,y,z], label, icon, color_hex, show_distance, visible_through_walls}.`,
      maxTokens: 150,
    });
  },

  "camera_systems_create_orbit_camera": async (args) => {
    return llmGenerate(args, {
      title: "Create Orbit Camera",
      category: "Camera Systems",
      systemPrompt: "Output JSON orbit camera with: target, min_distance_m, max_distance_m, default_distance_m, fov_deg. Only JSON.",
      userPromptBuilder: () => `Create an orbit camera config.\n\nOutput valid JSON: {target: [x,y,z], min_distance_m, max_distance_m, default_distance_m, fov_deg}.`,
      maxTokens: 150,
    });
  },

  "camera_systems_camera_shake": async (args) => {
    return llmGenerate(args, {
      title: "Add Camera Shake",
      category: "Camera Systems",
      systemPrompt: "Output JSON camera shake with: shake_type, amplitude, frequency_hz, duration_s. Only JSON.",
      userPromptBuilder: () => `Create a camera shake config.\n\nOutput valid JSON: {shake_type, amplitude, frequency_hz, duration_s}.`,
      maxTokens: 150,
    });
  },

  "cutscenes_add_subtitle": async (args) => {
    return llmGenerate(args, {
      title: "Add Subtitle",
      category: "Cutscenes & Cinematics",
      systemPrompt: "Output JSON subtitle with: text, start_s, end_s, position, speaker_color_hex. Only JSON.",
      userPromptBuilder: () => `Create a subtitle config.\n\nOutput valid JSON: {text, start_s, end_s, position, speaker_color_hex}.`,
      maxTokens: 150,
    });
  },

  "quests_add_objective": async (args) => {
    return llmGenerate(args, {
      title: "Add Quest Objective",
      category: "Quests & Missions",
      systemPrompt: "Output JSON quest objective with: objective_type, description, quantity, target_position. Only JSON.",
      userPromptBuilder: () => `Create a quest objective config.\n\nOutput valid JSON: {objective_type, description, quantity, target_position: [x,y,z]}.`,
      maxTokens: 150,
    });
  },

  "dialogs_add_dialog_node": async (args) => {
    return llmGenerate(args, {
      title: "Add Dialog Node",
      category: "Dialog Systems",
      systemPrompt: "Output JSON dialog node with: node_id, text, speaker_id, choices[]. Only JSON.",
      userPromptBuilder: () => `Create a dialog node with 3 choices.\n\nOutput valid JSON: {node_id, text, speaker_id, choices: [{text, next_node_id}]}.`,
      maxTokens: 250,
    });
  },

  /* ---------- Round 9: 25 more real handlers (target 175+) ---------- */
  "npc_combat_combat_retreat": async (args) => {
    return llmGenerate(args, {
      title: "Retreat to Safe Position",
      category: "NPC Combat AI",
      systemPrompt: "Output JSON retreat config with: safe_point, retreat_speed_pct, covering_fire, path. Only JSON.",
      userPromptBuilder: () => `Create a retreat action config.\n\nOutput valid JSON: {safe_point: [x,y,z], retreat_speed_pct, covering_fire, path: [[x,y,z]]}.`,
      maxTokens: 200,
    });
  },

  "npc_combat_combat_grenade_throw": async (args) => {
    return llmGenerate(args, {
      title: "Throw Grenade",
      category: "NPC Combat AI",
      systemPrompt: "Output JSON grenade throw with: target, grenade_type, fuse_seconds, throw_arc. Only JSON.",
      userPromptBuilder: () => `Create a grenade throw config.\n\nOutput valid JSON: {target: [x,y,z], grenade_type, fuse_seconds, throw_arc}.`,
      maxTokens: 150,
    });
  },

  "npc_behavior_add_selector_node": async (args) => {
    return llmGenerate(args, {
      title: "Add Selector Node",
      category: "NPC Behavior Trees",
      systemPrompt: "Output JSON BT selector node with: id, type, children[]. Only JSON.",
      userPromptBuilder: () => `Create a selector node with 3 children.\n\nOutput valid JSON: {id, type: \"selector\", children: []}.`,
      maxTokens: 150,
    });
  },

  "npc_behavior_add_decorator_node": async (args) => {
    return llmGenerate(args, {
      title: "Add Decorator Node",
      category: "NPC Behavior Trees",
      systemPrompt: "Output JSON BT decorator with: id, decorator_type, child_id, cooldown_seconds. Only JSON.",
      userPromptBuilder: () => `Create an inverter decorator node.\n\nOutput valid JSON: {id, decorator_type: \"inverter\", child_id, cooldown_seconds}.`,
      maxTokens: 150,
    });
  },

  "npc_behavior_set_blackboard_var": async (args) => {
    return llmGenerate(args, {
      title: "Set Blackboard Variable",
      category: "NPC Behavior Trees",
      systemPrompt: "Output JSON blackboard var with: var_name, value, scope. Only JSON.",
      userPromptBuilder: () => `Create a blackboard variable config.\n\nOutput valid JSON: {var_name, value, scope}.`,
      maxTokens: 100,
    });
  },

  "npc_pathfinding_find_path_smooth": async (args) => {
    return llmGenerate(args, {
      title: "Smooth Path (Funnel)",
      category: "Pathfinding & NavMesh",
      systemPrompt: "Output JSON smoothed path with: waypoints, smoothing_factor, corner_radius_m. Only JSON.",
      userPromptBuilder: () => `Create a smoothed path config.\n\nOutput valid JSON: {waypoints: [[x,y,z]], smoothing_factor, corner_radius_m}.`,
      maxTokens: 200,
    });
  },

  "npc_pathfinding_steering_arrive": async (args) => {
    return llmGenerate(args, {
      title: "Steering: Arrive",
      category: "Pathfinding & NavMesh",
      systemPrompt: "Output JSON arrive steering with: target, slow_radius_m, deceleration. Only JSON.",
      userPromptBuilder: () => `Create an arrive steering config.\n\nOutput valid JSON: {target: [x,y,z], slow_radius_m, deceleration}.`,
      maxTokens: 150,
    });
  },

  "npc_dialog_add_dialog_choice": async (args) => {
    return llmGenerate(args, {
      title: "Add Dialog Choice",
      category: "Dialog Systems",
      systemPrompt: "Output JSON dialog choice with: choice_text, next_node_id, requirement_type, requirement_value. Only JSON.",
      userPromptBuilder: () => `Create a dialog choice with a skill check.\n\nOutput valid JSON: {choice_text, next_node_id, requirement_type: \"skill_check\", requirement_value}.`,
      maxTokens: 150,
    });
  },

  "narrative_add_plot_beat": async (args) => {
    return llmGenerate(args, {
      title: "Add Plot Beat",
      category: "Story & Narrative Design",
      systemPrompt: "Output JSON plot beat with: beat_type, summary, involved_characters[]. Only JSON.",
      userPromptBuilder: () => `Create an inciting_incident plot beat.\n\nOutput valid JSON: {beat_type, summary, involved_characters: []}.`,
      maxTokens: 200,
    });
  },

  "narrative_add_foreshadowing": async (args) => {
    return llmGenerate(args, {
      title: "Add Foreshadowing",
      category: "Story & Narrative Design",
      systemPrompt: "Output JSON foreshadowing with: setup_beat_id, payoff_beat_id, clue, subtlety. Only JSON.",
      userPromptBuilder: () => `Create a foreshadowing link.\n\nOutput valid JSON: {setup_beat_id, payoff_beat_id, clue, subtlety}.`,
      maxTokens: 150,
    });
  },

  "narrative_create_twist": async (args) => {
    return llmGenerate(args, {
      title: "Create Plot Twist",
      category: "Story & Narrative Design",
      systemPrompt: "Output JSON plot twist with: reveal, affected_beats[], impact_level, requires_setup. Only JSON.",
      userPromptBuilder: () => `Create a major plot twist.\n\nOutput valid JSON: {reveal, affected_beats: [], impact_level: 8, requires_setup: true}.`,
      maxTokens: 200,
    });
  },

  "quests_complete_objective": async (args) => {
    return llmGenerate(args, {
      title: "Complete Quest Objective",
      category: "Quests & Missions",
      systemPrompt: "Output JSON objective completion with: objective_id, silent, delay_s, next_objective. Only JSON.",
      userPromptBuilder: () => `Create an objective completion config.\n\nOutput valid JSON: {objective_id, silent, delay_s, next_objective}.`,
      maxTokens: 150,
    });
  },

  "quests_add_quest_reward": async (args) => {
    return llmGenerate(args, {
      title: "Add Quest Reward",
      category: "Quests & Missions",
      systemPrompt: "Output JSON reward with: reward_type, amount, item_id. Only JSON.",
      userPromptBuilder: () => `Create a quest reward config.\n\nOutput valid JSON: {reward_type, amount, item_id}.`,
      maxTokens: 100,
    });
  },

  "cutscenes_add_voice_line": async (args) => {
    return llmGenerate(args, {
      title: "Add Voiced Line",
      category: "Cutscenes & Cinematics",
      systemPrompt: "Output JSON voice line with: character_id, voice_clip_uri, start_s, subtitle_text, animation_id. Only JSON.",
      userPromptBuilder: () => `Create a voiced line config.\n\nOutput valid JSON: {character_id, voice_clip_uri, start_s, subtitle_text, animation_id}.`,
      maxTokens: 200,
    });
  },

  "cutscenes_add_actor_action": async (args) => {
    return llmGenerate(args, {
      title: "Add Actor Action",
      category: "Cutscenes & Cinematics",
      systemPrompt: "Output JSON actor action with: actor_id, action, start_s, action_params. Only JSON.",
      userPromptBuilder: () => `Create an actor walk_to action.\n\nOutput valid JSON: {actor_id, action: \"walk_to\", start_s, action_params: {target: [x,y,z]}}.`,
      maxTokens: 200,
    });
  },

  "physics_particles_emit_smoke": async (args) => {
    return llmGenerate(args, {
      title: "Emit Smoke",
      category: "Particle Physics & Effects",
      systemPrompt: "Output JSON smoke emitter with: position, rate, smoke_color, rise_speed, turbulence. Only JSON.",
      userPromptBuilder: () => `Create a smoke emitter config.\n\nOutput valid JSON: {position: [x,y,z], rate, smoke_color, rise_speed, turbulence}.`,
      maxTokens: 150,
    });
  },

  "physics_particles_emit_fire": async (args) => {
    return llmGenerate(args, {
      title: "Emit Fire",
      category: "Particle Physics & Effects",
      systemPrompt: "Output JSON fire emitter with: position, size_m, intensity, with_smoke. Only JSON.",
      userPromptBuilder: () => `Create a fire emitter config.\n\nOutput valid JSON: {position: [x,y,z], size_m, intensity, with_smoke}.`,
      maxTokens: 150,
    });
  },

  "physics_particles_emit_sparks": async (args) => {
    return llmGenerate(args, {
      title: "Emit Sparks",
      category: "Particle Physics & Effects",
      systemPrompt: "Output JSON spark emitter with: position, rate, speed_ms, color_hex, with_glow. Only JSON.",
      userPromptBuilder: () => `Create a spark emitter config.\n\nOutput valid JSON: {position: [x,y,z], rate, speed_ms, color_hex, with_glow}.`,
      maxTokens: 150,
    });
  },

  "vehicle_dynamics_set_gear_ratios": async (args) => {
    return llmGenerate(args, {
      title: "Set Gear Ratios",
      category: "Vehicle Physics & Dynamics",
      systemPrompt: "Output JSON gearbox config with: ratios[], final_drive, transmission, shift_time_s. Only JSON.",
      userPromptBuilder: () => `Create a 6-speed automatic gearbox config.\n\nOutput valid JSON: {ratios: [3.5, 2.1, 1.4, 1.0, 0.8, -3.5], final_drive, transmission, shift_time_s}.`,
      maxTokens: 200,
    });
  },

  "vehicle_dynamics_set_tire_model": async (args) => {
    return llmGenerate(args, {
      title: "Set Tire Friction Model",
      category: "Vehicle Physics & Dynamics",
      systemPrompt: "Output JSON tire config with: tire_compound, peak_slip, peak_friction, asymptotic_friction. Only JSON.",
      userPromptBuilder: () => `Create a sport tire friction model.\n\nOutput valid JSON: {tire_compound, peak_slip, peak_friction, asymptotic_friction}.`,
      maxTokens: 150,
    });
  },

  "economy_create_currency": async (args) => {
    return llmGenerate(args, {
      title: "Create Currency",
      category: "Economy & Trade",
      systemPrompt: "Output JSON currency config with: name, symbol, starting_amount, max_amount, allow_negative. Only JSON.",
      userPromptBuilder: () => `Create a game currency config.\n\nOutput valid JSON: {name, symbol, starting_amount, max_amount, allow_negative}.`,
      maxTokens: 150,
    });
  },

  "economy_buy_item": async (args) => {
    return llmGenerate(args, {
      title: "Buy Item from Shop",
      category: "Economy & Trade",
      systemPrompt: "Output JSON buy transaction with: shop_id, item_id, quantity, price_paid, remaining_stock. Only JSON.",
      userPromptBuilder: () => `Simulate a buy transaction.\n\nOutput valid JSON: {shop_id, item_id, quantity, price_paid, remaining_stock}.`,
      maxTokens: 150,
    });
  },

  "save_load_load_game": async (args) => {
    return llmGenerate(args, {
      title: "Load Game",
      category: "Save / Load Systems",
      systemPrompt: "Output JSON load result with: slot_id, loaded, player_position, world_state, fade_in_s. Only JSON.",
      userPromptBuilder: () => `Simulate a load game result.\n\nOutput valid JSON: {slot_id, loaded, player_position: [x,y,z], world_state, fade_in_s}.`,
      maxTokens: 200,
    });
  },

  "multiplayer_setup_voice_chat": async (args) => {
    return llmGenerate(args, {
      title: "Setup Voice Chat",
      category: "Multiplayer / Network",
      systemPrompt: "Output JSON voice chat config with: mode, proximity_radius_m, noise_suppression, voice_quality_kbps. Only JSON.",
      userPromptBuilder: () => `Create a voice chat config.\n\nOutput valid JSON: {mode, proximity_radius_m, noise_suppression, voice_quality_kbps}.`,
      maxTokens: 150,
    });
  },

  "performance_setup_instancing": async (args) => {
    return llmGenerate(args, {
      title: "Setup GPU Instancing",
      category: "Performance Optimization",
      systemPrompt: "Output JSON instancing config with: mesh_uri, max_instances, per_instance_attributes, frustum_cull. Only JSON.",
      userPromptBuilder: () => `Create a GPU instancing config.\n\nOutput valid JSON: {mesh_uri, max_instances, per_instance_attributes: [], frustum_cull}.`,
      maxTokens: 200,
    });
  },
};

/** Returns true if a tool has a real (SDK-backed) handler registered. */
export function hasRealHandler(toolName: string): boolean {
  return toolName in realHandlers;
}

/** Runs a real handler, returning the rich result object. */
export async function runRealHandler(
  toolName: string,
  args: Record<string, unknown>,
): Promise<RealHandlerResult | null> {
  const handler = realHandlers[toolName];
  if (!handler) return null;
  const result = await handler(args);
  if (typeof result === "string") return { text: result };
  return result;
}
