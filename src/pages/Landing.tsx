import { motion } from "framer-motion";
import {
  ArrowRight,
  Eye,
  GitBranch,
  Radar,
  ShieldCheck,
  Workflow,
} from "lucide-react";
import { SyntraLogo, SyntraMark } from "@/components/Logo";
import { Button } from "@/components/ui/button";

const FEATURES = [
  {
    icon: Eye,
    title: "Evidence before explanation",
    body: "Every claim is backed by an inspectable evidence record — source, passage, provenance. No speculation presented as fact.",
  },
  {
    icon: Workflow,
    title: "Structured attack analysis",
    body: "Summaries, attack chains, entities, relationships, detection and mitigation — organized the way analysts actually work.",
  },
  {
    icon: GitBranch,
    title: "Honest attack chains",
    body: "The chain shows exactly how far the evidence supports the attack — and stops at 'No Verified Evidence' when it doesn't.",
  },
  {
    icon: ShieldCheck,
    title: "Defensive orientation",
    body: "Detection opportunities and mitigations accompany every analysis. Offensive assistance requests are refused with safe alternatives.",
  },
];

const PIPELINE = [
  "Question scoped to cybersecurity sources",
  "Evidence retrieved and ranked",
  "Relationships validated",
  "Supported chain assembled",
  "Defensive guidance attached",
];

export default function Landing() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen"
    >
      {/* Hero */}
      <div className="syn-grid-bg">
        <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5">
          <SyntraLogo size={26} withSubtitle />
          <nav className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" asChild>
              <a href="#how-it-works">How it works</a>
            </Button>
            <Button type="button" size="sm" asChild>
              <a href="/investigate">
                Start Investigating
                <ArrowRight className="size-3.5" />
              </a>
            </Button>
          </nav>
        </header>

        <div className="mx-auto flex w-full max-w-4xl flex-col items-center px-5 pb-20 pt-16 text-center md:pt-24">
          <div className="rounded-xl border border-[color-mix(in_oklab,var(--syntra-orange)_30%,var(--syntra-border))] bg-[var(--syntra-orange-soft)] p-4">
            <SyntraMark size={44} />
          </div>

          <h1 className="mt-7 max-w-2xl text-3xl font-semibold leading-tight tracking-tight text-foreground md:text-5xl">
            Investigate what the evidence{" "}
            <span className="text-[var(--syntra-orange)]">actually</span> supports
          </h1>

          <p className="mt-5 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
            SYNTRA is an offensive cyber attack RAG: ask about an attack, technique,
            campaign or vulnerability, and get an evidence-grounded investigation —
            attack chain, entities, relationships, detection and mitigation, with
            uncertainty stated plainly.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button type="button" size="lg" asChild>
              <a href="/investigate">
                <Radar className="size-4" />
                Start Investigating
              </a>
            </Button>
            <Button type="button" variant="outline" size="lg" asChild>
              <a href="#how-it-works">See how it works</a>
            </Button>
          </div>

          <p className="mt-6 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            MITRE ATT&CK · CAPEC · CVE / CWE · CTI reporting
          </p>
        </div>
      </div>

      {/* Features */}
      <section className="mx-auto w-full max-w-6xl px-5 py-16" aria-label="Capabilities">
        <div className="grid gap-4 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div key={f.title} className="syn-card p-5">
              <f.icon className="size-5 text-[var(--syntra-orange)]" aria-hidden="true" />
              <h2 className="mt-3 text-sm font-semibold text-foreground">{f.title}</h2>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="mx-auto w-full max-w-6xl scroll-mt-8 px-5 pb-16" aria-label="How SYNTRA works">
        <h2 className="syn-section-title justify-center">How an investigation runs</h2>
        <ol className="mt-6 grid gap-3 md:grid-cols-5">
          {PIPELINE.map((step, i) => (
            <li key={step} className="syn-card relative p-4">
              <span className="syn-section-num syn-mono text-xs">
                {String(i + 1).padStart(2, "0")}
              </span>
              <p className="mt-2 text-xs leading-relaxed text-foreground/90">{step}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Closing CTA */}
      <section className="mx-auto w-full max-w-4xl px-5 pb-24">
        <div className="syn-card flex flex-col items-center gap-4 p-8 text-center">
          <SyntraMark size={32} />
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Stop guessing. Start investigating.
          </h2>
          <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
            Ask your first question and see how far the evidence actually goes.
          </p>
          <Button type="button" size="lg" asChild>
            <a href="/investigate">
              <Radar className="size-4" />
              Start Investigating
            </a>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border py-6">
        <p className="text-center text-[11px] text-muted-foreground">
          SYNTRA — Offensive Cyber Attack RAG · Evidence-grounded analysis for defenders
        </p>
      </footer>
    </motion.div>
  );
}
