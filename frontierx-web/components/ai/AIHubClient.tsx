"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import {
  BookOpenText,
  Bot,
  CheckCircle2,
  Flame,
  PenLine,
  Search,
  ShieldCheck,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { GlowEffect } from "@/components/ui/GlowEffect";
import { Modal } from "@/components/ui/Modal";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { NFTGate } from "@/components/nft/NFTGate";
import { useAIAgent, type AIAgentPayload, type AIAgentType } from "@/lib/contracts/hooks/useAIAgent";
import { useFRXToken } from "@/lib/contracts/hooks/useFRXToken";
import { formatNumber } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

type AgentConfig = {
  id: AIAgentType;
  titleKey: string;
  descriptionKey: string;
  cost: string;
  actionKey: string;
  icon: LucideIcon;
};

const agents: AgentConfig[] = [
  {
    id: "scout",
    titleKey: "ai.scout.title",
    descriptionKey: "ai.scout.description",
    cost: "10",
    actionKey: "ai.scout.action",
    icon: Search,
  },
  {
    id: "content",
    titleKey: "ai.content.title",
    descriptionKey: "ai.content.description",
    cost: "10",
    actionKey: "ai.content.action",
    icon: PenLine,
  },
  {
    id: "distill",
    titleKey: "ai.distill.title",
    descriptionKey: "ai.distill.description",
    cost: "15",
    actionKey: "ai.distill.action",
    icon: BookOpenText,
  },
];

export function AIHubClient() {
  const { t } = useTranslation();

  return (
    <PageWrapper>
      <div className="grid-overlay absolute inset-0 opacity-30" aria-hidden />
      <GlowEffect className="left-8 top-16 h-[420px] w-[420px]" />
      <GlowEffect className="bottom-12 right-8 h-[360px] w-[360px]" />
      <section className="relative z-10 mx-auto max-w-7xl px-6 py-14 lg:px-8">
        <div className="mb-10 max-w-3xl">
          <p className="font-[var(--font-jetbrains-mono)] text-sm uppercase tracking-[0.32em] text-[var(--accent-cyan)]">
            {t("ai.eyebrow")}
          </p>
          <h1 className="mt-4 font-[var(--font-orbitron)] text-4xl font-bold uppercase tracking-[0.08em] md:text-5xl">
            {t("ai.title")}
          </h1>
          <p className="mt-5 text-lg leading-8 text-[var(--text-secondary)]">
            {t("ai.description")}
          </p>
        </div>

        <NFTGate>
          <AIHubWorkspace />
        </NFTGate>
      </section>
    </PageWrapper>
  );
}

function AIHubWorkspace() {
  const { t } = useTranslation();
  const [activeAgent, setActiveAgent] = useState<AIAgentType>("scout");
  const selectedAgent = agents.find((agent) => agent.id === activeAgent) ?? agents[0];
  const frx = useFRXToken();
  const balanceNumber = Number(frx.balanceFormatted);

  return (
    <div className="space-y-8">
      <Card className="grid gap-5 p-6 md:grid-cols-[1.3fr_1fr] md:items-center">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-[var(--glass-bg)] text-[var(--accent-green)]">
            <ShieldCheck className="h-6 w-6" aria-hidden />
          </div>
          <div>
            <p className="font-[var(--font-jetbrains-mono)] text-xs uppercase tracking-[0.24em] text-[var(--accent-green)]">
              {t("gate.verified")}
            </p>
            <h2 className="mt-2 text-2xl font-bold">{t("ai.verifiedTitle")}</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              {t("ai.verifiedBody")}
            </p>
          </div>
        </div>
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-white/[0.03] p-5">
          <div className="flex items-center gap-3 text-[var(--text-secondary)]">
            <Wallet className="h-5 w-5 text-[var(--accent-cyan)]" aria-hidden />
            <span className="text-sm">{t("ai.balance")}</span>
          </div>
          <p className="mt-3 font-[var(--font-orbitron)] text-3xl font-bold text-[var(--accent-cyan)]">
            {Number.isFinite(balanceNumber) ? formatNumber(balanceNumber, 2) : frx.balanceFormatted}
          </p>
          {frx.readError ? <p className="mt-2 text-xs text-[var(--accent-red)]">{frx.readError.message}</p> : null}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {agents.map((agent) => (
          <AIAgentCard
            key={agent.id}
            agent={agent}
            active={agent.id === activeAgent}
            onLaunch={() => setActiveAgent(agent.id)}
          />
        ))}
      </div>

      <AgentWorkbench key={selectedAgent.id} agent={selectedAgent} />
    </div>
  );
}

function AIAgentCard({
  agent,
  active,
  onLaunch,
}: {
  agent: AgentConfig;
  active: boolean;
  onLaunch: () => void;
}) {
  const { t } = useTranslation();
  const Icon = agent.icon;

  return (
    <Card
      className={cn(
        "p-6 transition",
        active ? "border-[var(--accent-cyan)] shadow-[0_0_52px_rgba(6,182,212,0.14)]" : "hover:border-[var(--accent-cyan)]",
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-[var(--glass-bg)] text-[var(--accent-cyan)]">
        <Icon className="h-6 w-6" aria-hidden />
      </div>
      <h3 className="mt-5 text-xl font-bold">{t(agent.titleKey)}</h3>
      <p className="mt-3 min-h-20 text-sm leading-6 text-[var(--text-secondary)]">{t(agent.descriptionKey)}</p>
      <div className="mt-5 flex items-center justify-between gap-4">
        <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] px-3 py-1 text-xs text-[var(--accent-gold)]">
          <Flame className="h-3.5 w-3.5" aria-hidden />
          {agent.cost} $FRX
        </span>
        <Button variant={active ? "primary" : "secondary"} onClick={onLaunch}>
          {active ? "Selected" : "Launch"}
        </Button>
      </div>
    </Card>
  );
}

function AgentWorkbench({
  agent,
}: {
  agent: AgentConfig;
}) {
  const { t } = useTranslation();
  const ai = useAIAgent(agent.id);
  const [scoutQuery, setScoutQuery] = useState("");
  const [contentTopic, setContentTopic] = useState("");
  const [platform, setPlatform] = useState<AIAgentPayload["content"]["platform"]>("linkedin");
  const [distillText, setDistillText] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const payload = useMemo((): AIAgentPayload[AIAgentType] | undefined => {
    if (agent.id === "scout") {
      const query = scoutQuery.trim();
      return query ? { query } : undefined;
    }

    if (agent.id === "content") {
      const topic = contentTopic.trim();
      return topic ? { topic, platform } : undefined;
    }

    const text = distillText.trim();
    return text ? { text } : undefined;
  }, [agent.id, contentTopic, distillText, platform, scoutQuery]);

  const inputHelp = getInputHelp(agent.id, payload);
  const hasPendingRequest = Boolean(ai.pendingRequest);
  const canSubmit = !ai.isBusy && (hasPendingRequest || (Boolean(payload) && ai.isConfigured && ai.hasEnoughBalance));
  const submitReason =
    hasPendingRequest
      ? "A confirmed burn is waiting for a successful signed API submission. Retry will not burn more FRX."
      : inputHelp ??
    (!ai.isConfigured
      ? "Configure the FRX token address for this chain before launching agents."
      : !ai.hasEnoughBalance
        ? `You need at least ${agent.cost} FRX for this agent.`
        : ai.isBusy
          ? "An AI request is already in progress."
          : `Ready to burn ${agent.cost} FRX and launch ${t(agent.titleKey)}.`);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (hasPendingRequest) {
      void ai.retryPending();
      return;
    }

    if (canSubmit) {
      setConfirmOpen(true);
    }
  };

  const handleConfirm = async () => {
    if (!payload) return;
    setConfirmOpen(false);
    await ai.execute(payload);
  };

  return (
    <Card className="p-6 md:p-8">
      <div className="grid gap-8 lg:grid-cols-[0.92fr_1.08fr]">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <p className="font-[var(--font-jetbrains-mono)] text-xs uppercase tracking-[0.24em] text-[var(--accent-cyan)]">
              {t("ai.expanded")}
            </p>
            <h2 className="mt-2 text-2xl font-bold">{t(agent.titleKey)}</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{t(agent.descriptionKey)}</p>
          </div>

          {agent.id === "scout" ? (
            <Field label={t("ai.scout.label")} help={t("ai.scout.help")}>
              <input
                value={scoutQuery}
                onChange={(event) => setScoutQuery(event.target.value)}
                maxLength={500}
                className="h-12 w-full rounded-2xl border border-[var(--border-subtle)] bg-black/20 px-4 text-sm outline-none transition focus:border-[var(--accent-cyan)]"
                placeholder={t("ai.scout.placeholder")}
              />
            </Field>
          ) : null}

          {agent.id === "content" ? (
            <>
              <Field label={t("ai.content.platform")} help={t("ai.content.platformHelp")}>
                <select
                  value={platform}
                  onChange={(event) => setPlatform(event.target.value as AIAgentPayload["content"]["platform"])}
                  className="h-12 w-full rounded-2xl border border-[var(--border-subtle)] bg-black/20 px-4 text-sm outline-none transition focus:border-[var(--accent-cyan)]"
                >
                  <option value="linkedin">{t("ai.content.platforms.linkedin")}</option>
                  <option value="twitter">{t("ai.content.platforms.twitter")}</option>
                  <option value="wechat">{t("ai.content.platforms.wechat")}</option>
                  <option value="xiaohongshu">{t("ai.content.platforms.xiaohongshu")}</option>
                </select>
              </Field>
              <Field label={t("ai.content.label")} help={t("ai.content.help")}>
                <textarea
                  value={contentTopic}
                  onChange={(event) => setContentTopic(event.target.value)}
                  maxLength={1000}
                  className="min-h-32 w-full resize-y rounded-2xl border border-[var(--border-subtle)] bg-black/20 p-4 text-sm leading-6 outline-none transition focus:border-[var(--accent-cyan)]"
                  placeholder={t("ai.content.placeholder")}
                />
              </Field>
            </>
          ) : null}

          {agent.id === "distill" ? (
            <Field label={t("ai.distill.label")} help={t("ai.distill.help")}>
              <textarea
                value={distillText}
                onChange={(event) => setDistillText(event.target.value)}
                maxLength={8000}
                className="min-h-56 w-full resize-y rounded-2xl border border-[var(--border-subtle)] bg-black/20 p-4 text-sm leading-6 outline-none transition focus:border-[var(--accent-cyan)]"
                placeholder={t("ai.distill.placeholder")}
              />
            </Field>
          ) : null}

          <div className="rounded-2xl border border-[var(--border-subtle)] bg-white/[0.03] p-4">
            <p id="ai-agent-submit-reason" className="text-sm leading-6 text-[var(--text-secondary)]">
              {submitReason}
            </p>
            <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
              {t("ai.privacy")}
            </p>
            {ai.error ? <p className="mt-2 text-sm text-[var(--accent-red)]">{ai.error}</p> : null}
          </div>

          <Button type="submit" disabled={!canSubmit} aria-describedby="ai-agent-submit-reason">
            {hasPendingRequest ? t("ai.retry") : `${t(agent.actionKey)} — Burn ${agent.cost} $FRX`}
          </Button>
        </form>

        <ResultPanel ai={ai} />
      </div>

      <Modal open={confirmOpen} title={t("ai.confirmTitle")} onClose={() => setConfirmOpen(false)}>
        <div className="space-y-5">
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-white/[0.03] p-4">
            <p className="text-sm leading-6 text-[var(--text-secondary)]">
              {t("ai.confirmBody", { cost: agent.cost })}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button className="flex-1" onClick={handleConfirm}>
              {t("ai.burnLaunch")}
            </Button>
            <Button className="flex-1" variant="secondary" onClick={() => setConfirmOpen(false)}>
              {t("ai.cancel")}
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}

function ResultPanel({ ai }: { ai: ReturnType<typeof useAIAgent<AIAgentType>> }) {
  const { t } = useTranslation();
  const status = getStageStatus(ai.stage);

  return (
    <section className="rounded-3xl border border-[var(--border-subtle)] bg-black/20 p-5">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <p className="font-[var(--font-jetbrains-mono)] text-xs uppercase tracking-[0.24em] text-[var(--accent-cyan)]">
            {t("ai.results")}
          </p>
          <h3 className="mt-2 text-xl font-bold">{t("ai.response")}</h3>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] px-3 py-1 text-xs text-[var(--text-secondary)]">
          <status.icon className={cn("h-4 w-4", status.className)} aria-hidden />
          {status.label}
        </span>
      </div>

      {ai.result ? (
        <div className="space-y-4">
          <div className="ai-markdown rounded-2xl border border-[var(--border-subtle)] bg-white/[0.03] p-5">
            <ReactMarkdown>{ai.result.result}</ReactMarkdown>
          </div>
          <div className="grid gap-3 text-xs text-[var(--text-secondary)] sm:grid-cols-3">
            <Meta label="Provider" value={ai.result.provider ?? "AI"} />
            <Meta label="Model" value={ai.result.model ?? "Unknown"} />
            <Meta label="Tokens" value={formatNumber(ai.result.tokensUsed ?? 0, 0)} />
          </div>
        </div>
      ) : (
        <div className="flex min-h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border-subtle)] p-8 text-center">
          <Bot className="mb-4 h-12 w-12 text-[var(--accent-cyan)]" aria-hidden />
          <p className="max-w-sm text-sm leading-6 text-[var(--text-secondary)]">
            {t("ai.emptyResult")}
          </p>
        </div>
      )}
    </section>
  );
}

function Field({ label, help, children }: { label: string; help: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold">{label}</span>
      <span className="mt-1 block text-xs leading-5 text-[var(--text-muted)]">{help}</span>
      <span className="mt-3 block">{children}</span>
    </label>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-white/[0.03] p-3">
      <p className="text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 truncate font-semibold text-[var(--text-primary)]">{value}</p>
    </div>
  );
}

function getInputHelp(agentType: AIAgentType, payload?: AIAgentPayload[AIAgentType]) {
  if (payload) return undefined;
  if (agentType === "scout") return "Enter a business name or website URL before analyzing.";
  if (agentType === "content") return "Enter a topic or key message before generating content.";
  return "Paste source text before distilling knowledge.";
}

function getStageStatus(stage: ReturnType<typeof useAIAgent<AIAgentType>>["stage"]) {
  if (stage === "success") {
    return { label: "Complete", icon: CheckCircle2, className: "text-[var(--accent-green)]" };
  }

  if (stage === "error") {
    return { label: "Needs attention", icon: Flame, className: "text-[var(--accent-red)]" };
  }

  if (stage === "idle") {
    return { label: "Ready", icon: Bot, className: "text-[var(--accent-cyan)]" };
  }

  return { label: stage, icon: Bot, className: "text-[var(--accent-gold)]" };
}
