/* One "Spend all" for Alliance Contributions, used everywhere it appears (Needs You, the
   Timeline, the Timers tab), so every place updates the same record the same way.
   - The label always shows what will actually be spent right now (the live count).
   - Disabled the instant it's tapped: the spend itself is computed inside the state update from
     the latest record, and spendAll() returns null when nothing is left, so a double tap can
     never spend twice.
   - Immediate confirmation via the shared toast (the row it came from may disappear). */
import React, { useEffect, useState } from "react";
import { useTimeHub } from "../TimeHubContext.jsx";
import { useMinute } from "../hooks/useNow.jsx";
import { success } from "../lib/feedback.js";
import { contribState, spendAll } from "../lib/contributions.js";
import { formatTime, formatSpan } from "../lib/time.js";
import { Btn } from "../components/ui.jsx";

export function SpendAllButton({ accountIds, small = true, onSpent }) {
  const { t, tz, lang, dataFor, updateAccount, notify, accountById } = useTimeHub();
  const now = useMinute();
  const counts = accountIds.map((a) => ({ a, n: contribState(dataFor(a).contrib, now).count }));
  const live = counts.filter((c) => c.n > 0);
  const total = live.reduce((s, c) => s + c.n, 0);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setBusy(false); }, [total]);
  const same = live.length > 0 && live.every((c) => c.n === live[0].n);
  const label = !live.length ? t("nothingToSpend") : same ? t("spendAll", { n: live[0].n }) : t("spendAllPlain");

  const go = () => {
    if (busy || !live.length) return;
    setBusy(true);
    const at = Date.now();
    // feedback from the same pure function the state update uses
    const results = live.map(({ a }) => ({ a, r: spendAll(dataFor(a).contrib, at) })).filter((x) => x.r);
    live.forEach(({ a }) => updateAccount(a, (d) => {
      const r = spendAll(d.contrib, at);
      return r ? { ...d, contrib: r.contrib } : d;
    }));
    success();
    if (results.length) {
      const spent = results.reduce((s, x) => s + x.r.spent, 0);
      const first = results[0].r;
      const who = results.length > 1 ? ` · ${results.map((x) => accountById(x.a)?.name).join(", ")}` : "";
      notify([
        `✓ ${t("contribSpentN", { n: spent })}${who}`,
        [first.nextAt && t("nextAttemptIn", { time: formatSpan(first.nextAt - at, lang) }), first.fullAt && t("fullAgainAround", { time: formatTime(Math.max(...results.map((x) => x.r.fullAt || 0)), tz, lang) })].filter(Boolean).join(" · "),
      ]);
    }
    onSpent?.();
  };
  return (
    <Btn small={small} tone="gold" onClick={go} disabled={busy || !live.length} aria-busy={busy || undefined}>
      {busy ? `✓ ${t("spentShort")}` : label}
    </Btn>
  );
}
