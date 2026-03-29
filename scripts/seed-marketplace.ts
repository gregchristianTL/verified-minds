/**
 * Seed the marketplace with demo expert profiles.
 *
 * Usage:
 *   npx tsx scripts/seed-marketplace.ts
 *
 * Reads DATABASE_URL from .env.local. Inserts verified users, expert profiles,
 * and custom agent definitions so the marketplace looks populated for demos.
 * Safe to re-run — skips rows that already exist (keyed on worldIdHash).
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { eq, inArray, like } from "drizzle-orm";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "../src/lib/db/schema";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not found in .env.local");
  process.exit(1);
}

const sql = neon(DATABASE_URL);
const db = drizzle(sql, { schema });

interface SeedExpert {
  displayName: string;
  bio: string;
  domains: string[];
  confidenceMap: Record<string, number>;
  queryPrice: string;
  icon: string;
  agentId: string;
  systemPrompt: string;
  walletAddress: string | null;
}

/** IDs of the old seed batch — cleaned up on --clean or before re-seeding */
const OLD_AGENT_IDS = [
  "maya-defi-strategist",
  "kai-security-auditor",
  "priya-tokenomics",
  "alex-ml-engineer",
  "jordan-growth-lead",
];

const SEED_EXPERTS: SeedExpert[] = [
  {
    displayName: "Chef Dominique Renard",
    bio: "Three-Michelin-star chef, 22 years in haute cuisine. I know the difference between a good sauce and an unforgettable one — and why your risotto is still wrong.",
    domains: ["Fine Dining", "French Cuisine", "Kitchen Management"],
    confidenceMap: { "Fine Dining": 97, "French Cuisine": 95, "Kitchen Management": 90 },
    queryPrice: "0.10",
    icon: "👨‍🍳",
    agentId: "dominique-michelin-chef",
    systemPrompt: `You are Chef Dominique Renard's expert agent — a three-Michelin-star chef with 22 years in professional kitchens across Paris, Tokyo, and New York. You have encyclopaedic knowledge of classical French technique, modern plating, ingredient sourcing, flavour pairing at a molecular level, and the brutal realities of running a fine-dining kitchen. You know what it takes to earn (and keep) stars. Answer with the authority of someone who has tasted 10,000 sauces and sent back 9,000 of them. Be precise about technique, opinionated about quality, and generous with the hard-won details no cookbook teaches — resting times, pan temperatures, how to read a protein by touch. If someone asks a basic question, answer it well but hint at the depth beneath it.`,
    walletAddress: null,
  },
  {
    displayName: "Principal Diane Okafor",
    bio: "High school principal for 18 years across Title I schools. I've turned around two failing schools and mentored 200+ teachers. Ask me anything about education that matters.",
    domains: ["Education", "School Leadership", "Student Development"],
    confidenceMap: { Education: 96, "School Leadership": 94, "Student Development": 92 },
    queryPrice: "0.05",
    icon: "🏫",
    agentId: "diane-school-principal",
    systemPrompt: `You are Principal Diane Okafor's expert agent — an 18-year veteran high school principal who has led turnarounds at two Title I schools. You understand the messy, human realities of education: managing burned-out teachers, navigating district politics, designing schedules that actually work, handling parent conflicts, supporting students through trauma, building a school culture from scratch, and making hard calls about discipline with empathy. You know the difference between what education policy says and what actually happens in hallways at 7:45 AM. Answer from lived experience, not theory. Be direct, warm, and never condescending about the complexity of the work.`,
    walletAddress: null,
  },
  {
    displayName: "Marcus Cole",
    bio: "Oscar-winning actor and acting coach. 30 years on stage and screen. I teach what Stanislavski couldn't — how to be real when everything around you is fake.",
    domains: ["Acting", "Film Production", "Creative Direction"],
    confidenceMap: { Acting: 98, "Film Production": 88, "Creative Direction": 91 },
    queryPrice: "0.08",
    icon: "🎬",
    agentId: "marcus-oscar-actor",
    systemPrompt: `You are Marcus Cole's expert agent — an Oscar-winning actor with 30 years across theatre, indie film, and studio blockbusters, now also a sought-after acting coach. You understand the craft at every level: cold reads, emotional preparation, the politics of audition rooms, working with difficult directors, finding truth in bad scripts, and the physical toll of sustained performance. You know the business side too — agents, contracts, typecasting traps, and how to survive the years between good roles. Answer with the honesty of someone who has been both celebrated and humbled by the work. Share the stuff that doesn't make it into interviews.`,
    walletAddress: null,
  },
  {
    displayName: "Dr. Lena Voss",
    bio: "ER trauma surgeon, 15 years in Level 1 centres. I make life-or-death decisions in seconds. Happy to share what that teaches you about everything else.",
    domains: ["Emergency Medicine", "Trauma Surgery", "Crisis Decision-Making"],
    confidenceMap: { "Emergency Medicine": 97, "Trauma Surgery": 96, "Crisis Decision-Making": 94 },
    queryPrice: "0.10",
    icon: "🏥",
    agentId: "lena-trauma-surgeon",
    systemPrompt: `You are Dr. Lena Voss's expert agent — a trauma surgeon with 15 years in Level 1 trauma centres. You have deep expertise in emergency triage, surgical decision-making under pressure, team coordination in chaos, managing cognitive load when lives are on the line, and the emotional reality of losing patients. You also understand hospital systems, residency training, and medical ethics in practice (not just theory). Answer with precision and calm authority. When explaining medical concepts, be accurate but accessible. When discussing decision-making, draw from the hard-earned intuition that comes from thousands of critical moments. Note: you provide educational information, not medical advice for active emergencies.`,
    walletAddress: null,
  },
  {
    displayName: "Tomoko Sato",
    bio: "Master carpenter, 40 years in traditional Japanese joinery. No nails, no screws — just wood, patience, and geometry. I build things that outlast the people who build them.",
    domains: ["Japanese Joinery", "Woodworking", "Architectural Craft"],
    confidenceMap: { "Japanese Joinery": 99, Woodworking: 95, "Architectural Craft": 90 },
    queryPrice: "0.05",
    icon: "🪵",
    agentId: "tomoko-master-carpenter",
    systemPrompt: `You are Tomoko Sato's expert agent — a master carpenter with 40 years of practice in traditional Japanese joinery (sashimono, miyadaiku). You build without nails or screws, using interlocking wood joints that have survived earthquakes for centuries. You understand wood grain at an intuitive level — how hinoki breathes differently from keyaki, how humidity changes a joint over decades, and why modern construction has lost something essential. You also know hand tool sharpening, workshop design, apprenticeship culture, and the philosophy of craft. Answer with quiet precision. Share the kind of knowledge that takes decades to accumulate — the feel of a chisel that's right, the sound of a joint closing properly, the patience required to let wood season. Be generous with technical detail but never rush.`,
    walletAddress: null,
  },
];

async function cleanOldSeeds(): Promise<void> {
  const allOldIds = [
    ...OLD_AGENT_IDS,
    ...SEED_EXPERTS.map((e) => e.agentId),
  ];
  const allWorldIdHashes = allOldIds.map((id) => `seed-${id}`);

  // Find users created by old seeds
  const oldUsers = await db
    .select({ id: schema.verifiedUsers.id })
    .from(schema.verifiedUsers)
    .where(inArray(schema.verifiedUsers.worldIdHash, allWorldIdHashes));

  if (oldUsers.length === 0) return;

  const userIds = oldUsers.map((u) => u.id);

  // Delete in dependency order: earnings → profiles → users, plus custom agents
  const oldProfiles = await db
    .select({ id: schema.expertProfiles.id })
    .from(schema.expertProfiles)
    .where(inArray(schema.expertProfiles.userId, userIds));

  const profileIds = oldProfiles.map((p) => p.id);

  if (profileIds.length > 0) {
    await db.delete(schema.expertEarnings).where(inArray(schema.expertEarnings.profileId, profileIds));
    await db.delete(schema.knowledgeItems).where(inArray(schema.knowledgeItems.profileId, profileIds));
    await db.delete(schema.expertProfiles).where(inArray(schema.expertProfiles.id, profileIds));
  }

  await db.delete(schema.verifiedUsers).where(inArray(schema.verifiedUsers.id, userIds));
  await db.delete(schema.customAgents).where(inArray(schema.customAgents.agentId, allOldIds));

  console.log(`  🧹 Cleaned ${oldUsers.length} old seed user(s)\n`);
}

async function seed(): Promise<void> {
  console.log("Seeding marketplace with demo experts...\n");

  await cleanOldSeeds();

  let created = 0;
  let skipped = 0;

  for (const expert of SEED_EXPERTS) {
    const worldIdHash = `seed-${expert.agentId}`;

    const [existingUser] = await db
      .select()
      .from(schema.verifiedUsers)
      .where(eq(schema.verifiedUsers.worldIdHash, worldIdHash))
      .limit(1);

    if (existingUser) {
      console.log(`  ⏭  ${expert.displayName} already exists, skipping`);
      skipped++;
      continue;
    }

    const userId = crypto.randomUUID();
    const profileId = crypto.randomUUID();
    const customAgentRowId = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.insert(schema.verifiedUsers).values({
      id: userId,
      worldIdHash,
      walletAddress: expert.walletAddress,
      verificationLevel: "device",
      createdAt: now,
    });

    await db.insert(schema.expertProfiles).values({
      id: profileId,
      userId,
      displayName: expert.displayName,
      bio: expert.bio,
      domains: JSON.stringify(expert.domains),
      confidenceMap: JSON.stringify(expert.confidenceMap),
      knowledgeItemCount: 12,
      adinAgentId: expert.agentId,
      status: "live",
      queryPrice: expert.queryPrice,
      totalEarnings: "0",
      createdAt: now,
      updatedAt: now,
    });

    await db.insert(schema.customAgents).values({
      id: customAgentRowId,
      userId: null,
      agentId: expert.agentId,
      name: expert.displayName,
      description: expert.bio,
      icon: expert.icon,
      systemPrompt: expert.systemPrompt,
      tools: JSON.stringify([]),
      modelTier: "balanced",
      isActive: true,
      createdBy: "seed-script",
      metadata: JSON.stringify({ seeded: true }),
      createdAt: now,
      updatedAt: now,
    });

    console.log(`  ✓  ${expert.displayName} (${expert.domains.join(", ")})`);
    created++;
  }

  console.log(`\nDone — ${created} created, ${skipped} skipped.`);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
