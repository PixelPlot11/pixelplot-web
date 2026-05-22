import { CROPS, getLevelData, getSellBonus } from "./gameData";

// ── Local command parser (fallback when AI backend is down) ──
export function parseCommand(input) {
  const raw = input.trim().toLowerCase()
    .replace(/[?.!,]/g, "")
    .replace(/\s+/g, " ")
    .replace(/\b(please|can you|could you|on my farm|for me|now)\b/g, "")
    .trim();

  // Help
  if (/^(help|commands|what can you|what do you do|how to)/.test(raw)) {
    return { action: "help" };
  }

  // Status
  if (/^(status|stats|farm status|my farm|overview|info|what'?s? my farm)/.test(raw)) {
    return { action: "status" };
  }

  // Harvest
  if (/^(harvest|reap|collect|gather)/.test(raw)) {
    const plotMatch = raw.match(/plot\s*#?(\d+)/);
    if (plotMatch) {
      return { action: "harvest", target: "single", plotIndex: parseInt(plotMatch[1]) - 1 };
    }
    return { action: "harvest", target: "all" };
  }

  // Water
  if (/^(water|irrigate|wet)/.test(raw)) {
    const plotMatch = raw.match(/plot\s*#?(\d+)/);
    if (plotMatch) {
      return { action: "water", target: "single", plotIndex: parseInt(plotMatch[1]) - 1 };
    }
    return { action: "water", target: "all" };
  }

  // Plant
  if (/^(plant|sow|grow|seed|put)/.test(raw)) {
    // Check for "best" / "most profitable"
    if (/best|most\s*profit|optimal|highest\s*profit/.test(raw)) {
      return { action: "plant", crop: "best", target: "all" };
    }

    // Extract crop name
    const afterPlant = raw.replace(/^(plant|sow|grow|seed|put)\s*/, "");
    const cropKeys = Object.keys(CROPS);
    let foundCrop = null;

    for (const key of cropKeys) {
      const name = CROPS[key].name.toLowerCase();
      if (afterPlant.includes(key) || afterPlant.includes(name)) {
        foundCrop = key;
        break;
      }
    }

    if (!foundCrop) {
      return { action: "unknown", raw: input.trim(), error: "Which crop? Try 'plant wheat' or 'plant best'" };
    }

    const plotMatch = raw.match(/plot\s*#?(\d+)/);
    if (plotMatch) {
      return { action: "plant", crop: foundCrop, target: "single", plotIndex: parseInt(plotMatch[1]) - 1 };
    }

    return { action: "plant", crop: foundCrop, target: "all" };
  }

  return { action: "unknown", raw: input.trim() };
}

// Execute a parsed action against game state
export async function executeParsedCommand(parsed, ctx) {
  const { action } = parsed;

  switch (action) {
    case "plant":
      return await executePlant(parsed, ctx);
    case "water":
      return await executeWater(parsed, ctx);
    case "harvest":
      return await executeHarvest(parsed, ctx);
    case "status":
      return executeStatus(ctx);
    case "help":
      return executeHelp();
    default:
      return [{ text: "Unknown command. Type 'help' for available commands.", color: "#e04040" }];
  }
}

// ── Plant ──────────────────────────────────────────
async function executePlant(parsed, ctx) {
  const { crop: cropKey, target, plotIndex } = parsed;
  const { grid, energy, level, activePlots, inventory, onProgress } = ctx;

  // Resolve crop
  let resolvedCrop = cropKey;
  if (cropKey === "best") {
    resolvedCrop = findBestCrop(level, inventory);
    if (!resolvedCrop) {
      return [{ text: "No seeds available. Visit the Market to buy seeds.", color: "#e04040" }];
    }
  }

  const crop = CROPS[resolvedCrop];
  if (!crop) {
    return [{ text: `Unknown crop: ${resolvedCrop}`, color: "#e04040" }];
  }

  if (crop.unlockLevel > level) {
    return [{ text: `${crop.name} requires Level ${crop.unlockLevel}. You're Level ${level}.`, color: "#e04040" }];
  }

  // Find target plots
  let targetIndices = [];
  if (target === "single" && plotIndex !== undefined) {
    if (plotIndex < 0 || plotIndex >= activePlots) {
      return [{ text: `Plot ${plotIndex + 1} is locked or invalid.`, color: "#e04040" }];
    }
    if (grid[plotIndex]?.crop) {
      return [{ text: `Plot ${plotIndex + 1} is already occupied.`, color: "#e04040" }];
    }
    targetIndices = [plotIndex];
  } else {
    // All empty plots
    for (let i = 0; i < activePlots; i++) {
      if (!grid[i]?.crop) targetIndices.push(i);
    }
  }

  if (targetIndices.length === 0) {
    return [{ text: "No empty plots to plant on.", color: "#f0c060" }];
  }

  // Check resources
  const seedsAvailable = inventory[resolvedCrop] || 0;
  const energyNeeded = crop.eP;
  const canPlant = Math.min(targetIndices.length, seedsAvailable, Math.floor(energy / energyNeeded));

  if (canPlant === 0) {
    if (seedsAvailable === 0) return [{ text: `No ${crop.name} seeds. Buy from Market.`, color: "#e04040" }];
    return [{ text: `Not enough energy. Need ${energyNeeded}⚡, have ${Math.floor(energy)}⚡.`, color: "#e04040" }];
  }

  // Plant sequentially
  let planted = 0;
  let totalEnergy = 0;

  for (let i = 0; i < canPlant; i++) {
    const idx = targetIndices[i];

    // Update grid
    ctx.setGrid(prev => {
      const n = [...prev];
      n[idx] = { crop: resolvedCrop, progress: 0, ready: false, watered: false };
      return n;
    });

    // Deduct energy
    ctx.setEnergy(e => e - energyNeeded);
    totalEnergy += energyNeeded;

    // Spend seed (optimistic)
    ctx.spendSeed(resolvedCrop);

    // Sync to backend
    const ok = await ctx.spendSeedOnBackend(resolvedCrop);
    if (!ok) {
      ctx.addLog(`❌ Backend rejected ${crop.name} seed spend`);
      break;
    }

    ctx.addLog(`🌱 Planted ${crop.name} [−${energyNeeded}⚡]`);
    planted++;

    if (onProgress && planted < canPlant) {
      onProgress(`Planted ${planted}/${canPlant} ${crop.name}...`);
    }
  }

  const msgs = [];
  if (planted > 0) {
    msgs.push({
      text: `Planted ${crop.name} on ${planted} plot${planted > 1 ? "s" : ""}. −${totalEnergy}⚡ −${planted} seeds.`,
      color: "#4caf50"
    });
  }
  if (planted < targetIndices.length) {
    const skipped = targetIndices.length - planted;
    if (seedsAvailable < targetIndices.length) {
      msgs.push({ text: `Skipped ${skipped} plot${skipped > 1 ? "s" : ""} — not enough seeds.`, color: "#f0c060" });
    } else if (energy < crop.eP * targetIndices.length) {
      msgs.push({ text: `Skipped ${skipped} plot${skipped > 1 ? "s" : ""} — not enough energy.`, color: "#f0c060" });
    }
  }

  return msgs;
}

// ── Water ──────────────────────────────────────────
async function executeWater(parsed, ctx) {
  const { target, plotIndex } = parsed;
  const { grid, energy, activePlots, onProgress } = ctx;

  let targetIndices = [];
  if (target === "single" && plotIndex !== undefined) {
    if (plotIndex < 0 || plotIndex >= activePlots) {
      return [{ text: `Plot ${plotIndex + 1} is locked or invalid.`, color: "#e04040" }];
    }
    const p = grid[plotIndex];
    if (!p?.crop || p.watered || p.ready) {
      return [{ text: `Plot ${plotIndex + 1} can't be watered.`, color: "#f0c060" }];
    }
    targetIndices = [plotIndex];
  } else {
    for (let i = 0; i < activePlots; i++) {
      const p = grid[i];
      if (p?.crop && !p.watered && !p.ready) targetIndices.push(i);
    }
  }

  if (targetIndices.length === 0) {
    return [{ text: "All growing crops are already watered.", color: "#f0c060" }];
  }

  let watered = 0;
  let totalEnergy = 0;

  for (const idx of targetIndices) {
    const crop = CROPS[grid[idx].crop];
    if (energy - totalEnergy < crop.eW) {
      ctx.addLog(`💧 Ran out of energy while watering`);
      break;
    }

    ctx.setGrid(prev => {
      const n = [...prev];
      n[idx] = { ...n[idx], watered: true };
      return n;
    });

    ctx.setEnergy(e => e - crop.eW);
    totalEnergy += crop.eW;
    ctx.addLog(`💧 Watered ${crop.name} [−${crop.eW}⚡ +30% speed]`);
    watered++;

    if (onProgress && watered < targetIndices.length) {
      onProgress(`Watered ${watered}/${targetIndices.length}...`);
    }
  }

  const msgs = [];
  if (watered > 0) {
    msgs.push({
      text: `Watered ${watered} crop${watered > 1 ? "s" : ""}. −${totalEnergy}⚡ +30% growth speed.`,
      color: "#4a90d9"
    });
  }
  if (watered < targetIndices.length) {
    msgs.push({ text: `Skipped ${targetIndices.length - watered} — not enough energy.`, color: "#f0c060" });
  }

  return msgs;
}

// ── Harvest ────────────────────────────────────────
async function executeHarvest(parsed, ctx) {
  const { target, plotIndex } = parsed;
  const { grid, energy, activePlots, onProgress } = ctx;

  let targetIndices = [];
  if (target === "single" && plotIndex !== undefined) {
    if (plotIndex < 0 || plotIndex >= activePlots) {
      return [{ text: `Plot ${plotIndex + 1} is locked or invalid.`, color: "#e04040" }];
    }
    const p = grid[plotIndex];
    if (!p?.crop || !p.ready) {
      return [{ text: `Plot ${plotIndex + 1} has nothing to harvest.`, color: "#f0c060" }];
    }
    targetIndices = [plotIndex];
  } else {
    for (let i = 0; i < activePlots; i++) {
      const p = grid[i];
      if (p?.crop && p.ready) targetIndices.push(i);
    }
  }

  if (targetIndices.length === 0) {
    return [{ text: "No crops are ready to harvest.", color: "#f0c060" }];
  }

  let harvested = 0;
  let totalEarned = 0;
  let totalExp = 0;
  let totalEnergy = 0;

  for (const idx of targetIndices) {
    const cropKey = grid[idx].crop;
    const crop = CROPS[cropKey];

    if (energy - totalEnergy < crop.eH) {
      ctx.addLog(`🌾 Ran out of energy while harvesting`);
      break;
    }

    // Clear plot
    ctx.setGrid(prev => {
      const n = [...prev];
      n[idx] = { crop: null, progress: 0, ready: false, watered: false };
      return n;
    });

    ctx.setEnergy(e => e - crop.eH);
    totalEnergy += crop.eH;

    // Harvest on backend
    const result = await ctx.harvestOffChain(cropKey);
    if (result) {
      totalEarned += result.earned;
      totalExp += result.expGain;
      ctx.onHarvest(cropKey, result.earned, result.expGain, result.pendingEarnings);
      ctx.addLog(`🌾 Harvested ${crop.name}! +${result.earned} $PLOT +${result.expGain}xp`);
    } else {
      ctx.addLog(`❌ Failed to harvest ${crop.name}`);
    }

    harvested++;

    if (onProgress && harvested < targetIndices.length) {
      onProgress(`Harvested ${harvested}/${targetIndices.length}...`);
    }
  }

  if (harvested > 0) {
    return [{
      text: `Harvested ${harvested} crop${harvested > 1 ? "s" : ""}! +${totalEarned} $PLOT +${totalExp}xp −${totalEnergy}⚡`,
      color: "#4caf50"
    }];
  }

  return [{ text: "Failed to harvest any crops.", color: "#e04040" }];
}

// ── Status ─────────────────────────────────────────
function executeStatus(ctx) {
  const { grid, energy, level, activePlots, inventory, profile } = ctx;

  const { cur } = getLevelData(profile?.exp || 0);
  const sellBonus = getSellBonus(level);

  let empty = 0, growing = 0, ready = 0, watered = 0;
  for (let i = 0; i < activePlots; i++) {
    const p = grid[i];
    if (!p?.crop) { empty++; continue; }
    if (p.ready) { ready++; continue; }
    growing++;
    if (p.watered) watered++;
  }

  const locked = 20 - activePlots;

  const seedLines = Object.entries(inventory)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => `${CROPS[k]?.emoji || "🌱"} ${CROPS[k]?.name || k}: ${v}`)
    .join("\n");

  const lines = [
    `📊 Farm Status — Lv.${level} ${cur.title}`,
    `⚡ Energy: ${Math.floor(energy)}/1000`,
    `🏡 Plots: ${activePlots}/20 (${empty} empty, ${growing} growing, ${ready} ready)`,
    `💧 Watered: ${watered} crops`,
    sellBonus > 1 ? `💰 Sell bonus: +${Math.round((sellBonus - 1) * 100)}%` : null,
    `📈 Exp: ${profile?.exp || 0}`,
    `🏦 Pending: ${profile?.pending_earnings || 0} $PLOT`,
    seedLines ? `\n🌱 Seeds:\n${seedLines}` : "\n🌱 No seeds — visit Market!",
  ].filter(Boolean);

  return [{ text: lines.join("\n"), color: "#e8d5a3" }];
}

// ── Help ───────────────────────────────────────────
function executeHelp() {
  return [{
    text: `🤖 PixelPlot AI Commands:

plant <crop> — plant on all empty plots
plant best — plant most profitable crop
water — water all growing crops
harvest — harvest all ready crops
status — show farm overview
help — show this message

Examples:
"plant wheat on all empty"
"plant best"
"water everything"
"harvest all ready crops"`,
    color: "#f0c060"
  }];
}

// ── Helpers ────────────────────────────────────────
function findBestCrop(level, inventory) {
  const available = Object.entries(CROPS)
    .filter(([key, c]) => c.unlockLevel <= level && (inventory[key] || 0) > 0)
    .sort(([, a], [, b]) => (b.sellPrice - b.seedCost) - (a.sellPrice - a.seedCost));

  return available.length > 0 ? available[0][0] : null;
}
