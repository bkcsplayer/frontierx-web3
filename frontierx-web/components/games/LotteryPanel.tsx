"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { CircleDollarSign, Clock3, Dices, ShieldAlert, Trophy, Users, type LucideIcon } from "lucide-react";
import { zeroAddress } from "viem";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Loading } from "@/components/ui/Loading";
import { ConnectWalletButton } from "@/components/wallet/ConnectWalletButton";
import { CountdownTimer } from "@/components/games/CountdownTimer";
import { useFRXLottery } from "@/lib/contracts/hooks/useFRXLottery";
import { shortenAddress } from "@/lib/utils/format";

export function LotteryPanel() {
  const [entryAmount, setEntryAmount] = useState("10");
  const [actionError, setActionError] = useState<string | undefined>();
  const lottery = useFRXLottery(entryAmount);

  const canApprove =
    lottery.isConnected &&
    lottery.isConfigured &&
    !lottery.inputError &&
    !lottery.readError &&
    !lottery.hasEntryAllowance &&
    !lottery.isApproving &&
    !lottery.isTransacting;
  const canEnter =
    lottery.isConnected &&
    lottery.isConfigured &&
    lottery.hasEntryAllowance &&
    !lottery.inputError &&
    !lottery.readError &&
    !lottery.isTransacting;
  const entryActionReason =
    lottery.inputError ??
    lottery.readError?.message ??
    (!lottery.isConnected
      ? "Connect a wallet before entering the lottery."
      : !lottery.isConfigured
        ? "Configure FRX token and lottery addresses for this chain."
        : !lottery.hasEntryAllowance
          ? "Approve FRX before entering the lottery."
          : "Ready to enter the lottery.");
  const drawActionReason = lottery.canDraw
    ? "Winner draw is ready."
    : "Draw becomes available when the timer reaches zero and at least one entry exists.";

  const runAction = (action: () => void) => {
    try {
      setActionError(undefined);
      action();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Transaction could not be started.");
    }
  };

  return (
    <Card className="overflow-hidden p-6 md:p-8">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-[var(--font-jetbrains-mono)] text-sm uppercase tracking-[0.24em] text-[var(--accent-cyan)]">
            Daily Lottery
          </p>
          <h2 className="mt-3 text-3xl font-bold">Weighted FRX prize pool</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
            Enter with at least {lottery.minEntryFormatted} FRX. Bigger entries receive more weighted tickets.
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-white/[0.03] px-4 py-3 text-sm text-[var(--text-secondary)]">
          FRX Balance:{" "}
          <span className="font-[var(--font-jetbrains-mono)] text-[var(--text-primary)]">
            {Number(lottery.frxBalanceFormatted).toFixed(4)}
          </span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Metric icon={CircleDollarSign} label="Current Pool" value={`${Number(lottery.currentPoolFormatted).toFixed(4)} FRX`} />
        <Metric icon={Users} label="Entries" value={`${lottery.entryCount.toString()} / ${lottery.maxEntries.toString()}`} />
        <Metric icon={Clock3} label="Next Draw" value={<CountdownTimer seconds={lottery.timeUntilDraw} />} />
        <Metric icon={Trophy} label="Round" value={`#${lottery.currentRound.toString()}`} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <div className="rounded-3xl border border-[var(--border-subtle)] bg-white/[0.03] p-5">
          <label className="text-sm font-semibold text-[var(--text-secondary)]" htmlFor="lottery-entry">
            Entry amount
          </label>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <input
              id="lottery-entry"
              value={entryAmount}
              onChange={(event) => setEntryAmount(event.target.value)}
              inputMode="decimal"
              className="h-11 flex-1 rounded-full border border-[var(--border-default)] bg-black/30 px-5 font-[var(--font-jetbrains-mono)] text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-cyan)]"
              aria-describedby="lottery-entry-help"
              aria-invalid={Boolean(lottery.inputError)}
            />
            {!lottery.isConnected ? (
              <ConnectWalletButton />
            ) : !lottery.hasEntryAllowance ? (
              <Button
                disabled={!canApprove}
                aria-describedby="lottery-entry-action-help"
                onClick={() => runAction(lottery.approveEntry)}
              >
                {lottery.isApproving ? <Loading label="Approving" className="text-white" /> : "Approve FRX"}
              </Button>
            ) : (
              <Button disabled={!canEnter} aria-describedby="lottery-entry-action-help" onClick={() => runAction(lottery.enter)}>
                {lottery.isTransacting ? <Loading label="Entering" className="text-white" /> : "Enter lottery"}
              </Button>
            )}
          </div>
          <p id="lottery-entry-help" className="mt-3 text-xs text-[var(--text-muted)]">
            {lottery.inputError ?? `Minimum entry is ${lottery.minEntryFormatted} FRX. Approval is required before entry transfer.`}
          </p>
          <p id="lottery-entry-action-help" className="mt-2 text-xs text-[var(--text-muted)]">
            {entryActionReason}
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <MiniStat label="Your entries" value={`${Number(lottery.userEntryFormatted).toFixed(4)} FRX`} />
            <MiniStat label="Win probability" value={`${lottery.winProbability.toFixed(2)}%`} />
          </div>
        </div>

        <div className="rounded-3xl border border-[var(--border-subtle)] bg-white/[0.03] p-5">
          <div className="flex items-center gap-3">
            <Dices className="h-5 w-5 text-[var(--accent-gold)]" aria-hidden />
            <h3 className="font-semibold">Draw control</h3>
          </div>
          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
            Anyone can draw after the 24-hour interval if the round has entries.
          </p>
          <Button
            className="mt-5 w-full"
            disabled={!lottery.canDraw || lottery.isTransacting}
            aria-describedby="lottery-draw-help"
            onClick={() => runAction(lottery.drawWinner)}
          >
            {lottery.isTransacting ? <Loading label="Drawing" className="text-white" /> : "Draw winner"}
          </Button>
          <p id="lottery-draw-help" className="mt-3 text-xs text-[var(--text-muted)]">
            {drawActionReason}
          </p>
        </div>
      </div>

      <PreviousWinner
        round={lottery.previousRound}
        winner={lottery.previousWinner}
        prize={lottery.previousPrizeFormatted}
      />

      {lottery.inputError ? <Status message={lottery.inputError} /> : null}
      {lottery.readError ? <Status message={lottery.readError.message} /> : null}
      {lottery.txError ? <Status message={lottery.txError.message} /> : null}
      {actionError ? <Status message={actionError} /> : null}
    </Card>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-white/[0.03] p-4">
      <Icon className="mb-4 h-5 w-5 text-[var(--accent-cyan)]" aria-hidden />
      <div className="font-[var(--font-jetbrains-mono)] text-lg font-bold">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">{label}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-black/20 p-4">
      <div className="font-[var(--font-jetbrains-mono)] text-lg font-bold">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">{label}</div>
    </div>
  );
}

function PreviousWinner({
  round,
  winner,
  prize,
}: {
  round: bigint;
  winner?: `0x${string}`;
  prize: string;
}) {
  if (round === BigInt(0) || !winner || winner === zeroAddress) {
    return (
      <div className="mt-8 rounded-3xl border border-[var(--border-subtle)] bg-white/[0.03] p-5">
        <h3 className="font-semibold">Previous winners</h3>
        <p className="mt-3 text-sm text-[var(--text-secondary)]">No completed lottery rounds yet.</p>
      </div>
    );
  }

  return (
    <div className="mt-8 rounded-3xl border border-[var(--border-subtle)] bg-white/[0.03] p-5">
      <h3 className="font-semibold">Previous winners</h3>
      <p className="mt-3 text-sm text-[var(--text-secondary)]">
        Round {round.toString()}:{" "}
        <span className="font-[var(--font-jetbrains-mono)] text-[var(--text-primary)]">
          {shortenAddress(winner)}
        </span>{" "}
        won {Number(prize).toFixed(4)} FRX
      </p>
    </div>
  );
}

function Status({ message }: { message: string }) {
  return (
    <div
      className="mt-5 flex gap-3 rounded-2xl border border-[rgba(239,68,68,0.35)] bg-white/[0.03] p-4 text-sm text-[var(--accent-red)]"
      aria-live="polite"
    >
      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <p className="leading-6">{message}</p>
    </div>
  );
}
