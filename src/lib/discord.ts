// Notifies a Discord channel via webhook when a part's on-hand stock goes
// negative. No-ops if DISCORD_WEBHOOK_URL isn't set, so this is safe to call
// unconditionally from every write path without requiring setup first.

export function crossedIntoNegative(
  before: number | null | undefined,
  after: number | null | undefined,
): boolean {
  return typeof after === "number" && after < 0 && !(typeof before === "number" && before < 0);
}

async function postToDiscord(embed: Record<string, unknown>) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return;
  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
    });
  } catch (err) {
    console.error("Failed to send Discord notification:", err);
  }
}

export async function notifyNegativeStock(opts: {
  system: "ECOMP" | "JSCPH";
  partLabel: string;
  field: string;
  qty: number;
}) {
  await postToDiscord({
    title: "⚠️ Negative stock detected",
    color: 0xef4444,
    fields: [
      { name: "System", value: opts.system, inline: true },
      { name: "Part", value: opts.partLabel, inline: true },
      { name: opts.field, value: String(opts.qty), inline: true },
    ],
    timestamp: new Date().toISOString(),
  });
}

export interface NegativeStockItem {
  partLabel: string;
  field: string;
  qty: number;
}

const MAX_BATCH_LINES = 20;

/** One summary message for a bulk import, instead of one webhook call per
 * row — avoids spamming the channel (and Discord's webhook rate limit) when
 * an import reveals many already-negative parts at once. */
export async function notifyNegativeStockBatch(system: "ECOMP" | "JSCPH", items: NegativeStockItem[]) {
  if (items.length === 0) return;

  const lines = items.slice(0, MAX_BATCH_LINES).map((i) => `**${i.partLabel}** — ${i.field}: ${i.qty}`);
  if (items.length > MAX_BATCH_LINES) {
    lines.push(`…and ${items.length - MAX_BATCH_LINES} more`);
  }

  await postToDiscord({
    title: `⚠️ ${items.length} part(s) went negative (${system} import)`,
    color: 0xef4444,
    description: lines.join("\n"),
    timestamp: new Date().toISOString(),
  });
}
