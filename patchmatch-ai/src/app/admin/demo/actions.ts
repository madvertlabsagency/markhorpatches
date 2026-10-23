"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { assertAdmin } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { DEMO_PASSWORD_DEFAULT } from "@/lib/demo/catalog";
import { assertDemo, demoSimSettings, demoSimSchema, saveDemoSimSettings, DEMO_PRESETS } from "@/lib/demo/settings";
import {
  genApplication, genBuyerRequest, maybeSimulate, resetSimulation, runScenario, seedRfqs, simulateBuyerReply, simulateNoResponse, simulateOrder, simulateQualityClaim, simulateQuote, simulateSellerUnlock,
  SCENARIOS, type DemoResult, type ScenarioKey,
} from "@/lib/demo/engine";
import { seedDemoBaseline, wipeDemoData } from "@/lib/demo/baseline";

const OPS = {
  buyer: () => genBuyerRequest(),
  manufacturer: () => genApplication(),
  unlock: () => simulateSellerUnlock(),
  quote: () => simulateQuote(),
  reply: () => simulateBuyerReply(),
  noResponse: () => simulateNoResponse(),
  claim: () => simulateQualityClaim(),
  order: () => simulateOrder(),
  seed10: () => seedRfqs(10),
  seed50: () => seedRfqs(50),
  tick: async (): Promise<DemoResult> => {
    await prisma.platformSetting.deleteMany({ where: { key: "demo.simTick" } }); // allow an immediate step
    const r = await maybeSimulate();
    return { ok: true, message: r.ran.length ? `Simulation step ran: ${r.ran.join(", ")}.` : "Simulation step ran (nothing was due — is the simulation paused?)." };
  },
  resetSimulated: () => resetSimulation(),
} satisfies Record<string, () => Promise<DemoResult>>;
export type DemoOp = keyof typeof OPS | `scenario:${ScenarioKey}`;

async function guard() {
  assertDemo();
  return assertAdmin("settings:manage");
}

/** Runs one Demo Control Center action. Every op goes through the demo engine (fictional isDemo data only). */
export async function demoControlAction(op: DemoOp): Promise<DemoResult> {
  try {
    const admin = await guard();
    let r: DemoResult;
    if (op.startsWith("scenario:")) {
      const key = op.slice(9) as ScenarioKey;
      if (!(key in SCENARIOS)) return { ok: false, message: "Unknown scenario." };
      r = await runScenario(key);
    } else if (op in OPS) {
      r = await OPS[op as keyof typeof OPS]();
    } else {
      return { ok: false, message: "Unknown demo action." };
    }
    await audit(admin.id, `demo.${op}`, "Demo", null, { ok: r.ok });
    revalidatePath("/admin", "layout");
    return r;
  } catch (e) {
    console.warn("[demo-control]", op, e);
    return { ok: false, message: (e as Error).message || "Demo action failed." };
  }
}

export async function demoSimToggleAction(enabled: boolean): Promise<DemoResult> {
  try {
    const admin = await guard();
    await saveDemoSimSettings({ ...(await demoSimSettings()), enabled });
    await audit(admin.id, `demo.sim.${enabled ? "start" : "pause"}`, "PlatformSetting", "demo.sim");
    revalidatePath("/admin/demo");
    return { ok: true, message: enabled ? "Simulation started." : "Simulation paused — no new simulated activity will be generated." };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

export async function demoRatesAction(input: Record<string, number | string>): Promise<DemoResult> {
  try {
    const admin = await guard();
    const current = await demoSimSettings();
    const preset = typeof input.preset === "string" ? DEMO_PRESETS[input.preset] : undefined;
    const next = demoSimSchema.parse(preset ? { ...current, ...preset.value } : { ...current, ...Object.fromEntries(Object.entries(input).filter(([k]) => k !== "preset").map(([k, v]) => [k, Number(v)])) });
    await saveDemoSimSettings(next);
    await audit(admin.id, "demo.sim.rates", "PlatformSetting", "demo.sim", next);
    revalidatePath("/admin/demo");
    return { ok: true, message: preset ? `Preset applied: ${preset.label}.` : "Simulation rates saved." };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

/** Full reset: deletes every demo record and rebuilds the baseline marketplace (presenter passwords reset to the demo default). */
export async function demoFullResetAction(confirmText: string): Promise<DemoResult> {
  try {
    await guard();
    if (confirmText !== "RESET") return { ok: false, message: "Type RESET to confirm." };
    await wipeDemoData();
    const passwordHash = await bcrypt.hash(process.env.DEMO_PASSWORD ?? DEMO_PASSWORD_DEFAULT, 10);
    const r = await seedDemoBaseline({ passwordHash });
    // The admin who clicked was deleted with the old dataset; their session ends and they sign in again via /demo/admin.
    return { ok: true, message: `Demo rebuilt: ${r.requests} requests, ${r.unlocks} unlocks. Sign in again as the demo admin.`, link: "/demo/admin" };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}
