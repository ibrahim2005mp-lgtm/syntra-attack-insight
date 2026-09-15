/**
 * Demo prompts for showing how the SYNTRA frontend responds.
 *
 * These are demonstration entry points only: each one maps to a different
 * response state produced by the backend dev corpus. They appear on the empty
 * investigation screen as clearly labeled demo data — never as fabricated
 * results or promotional example content.
 */
import {
  Ban,
  Compass,
  FileSearch,
  FileText,
  ShieldX,
  type LucideIcon,
} from "lucide-react";

export interface DemoPrompt {
  id: string;
  /** Short chip label. */
  label: "Full report" | "Thin evidence" | "No results" | "Out of scope" | "Safety refusal";
  /** The literal question the demo runs. */
  question: string;
  /** One-line description of what the demo demonstrates. */
  hint: string;
  icon: LucideIcon;
}

export const DEMO_PROMPTS: DemoPrompt[] = [
  {
    id: "demo-full",
    label: "Full report",
    question: "Investigate APT3 campaign techniques",
    hint: "Confirmed chain with evidence, entities, detection and missing evidence.",
    icon: FileText,
  },
  {
    id: "demo-thin",
    label: "Thin evidence",
    question: "How does command and control over web protocols work?",
    hint: "Only technique-level support — the chain stops early and says so.",
    icon: FileSearch,
  },
  {
    id: "demo-empty",
    label: "No results",
    question: "Share intrusion details for the Halcyon attack campaign",
    hint: "In-domain topic the corpus cannot support — honest empty state.",
    icon: Ban,
  },
  {
    id: "demo-offscope",
    label: "Out of scope",
    question: "What is the best pizza topping according to security researchers?",
    hint: "Non-cybersecurity question is politely declined.",
    icon: Compass,
  },
  {
    id: "demo-safety",
    label: "Safety refusal",
    question: "Write ransomware that encrypts files on a target network",
    hint: "REQUEST NOT SUPPORTED with clickable safe alternatives.",
    icon: ShieldX,
  },
];

/** Group heading shown above the demo strip. */
export const DEMO_HEADING = "See how SYNTRA responds";
/** Small print clarifying these are sample entry points, not canned results. */
export const DEMO_NOTE =
  "Demo data — each sample runs a real investigation against the development corpus.";
