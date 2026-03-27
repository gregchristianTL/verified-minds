import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Legal — Verified Minds",
  description: "Terms of use, privacy, and legal information for Verified Minds.",
};

const SECTIONS = [
  {
    title: "Terms of Use",
    paragraphs: [
      "Verified Minds v0.0.1 is an experimental prototype built during a hackathon. The platform is provided \"as is\" without warranties of any kind, express or implied.",
      "By accessing or using Verified Minds you agree to these terms. We reserve the right to modify, suspend, or discontinue any part of the service at any time without notice.",
      "You are solely responsible for any content you submit through the platform, including expertise data used to train AI agents. You retain ownership of your submitted content but grant Verified Minds a non-exclusive license to process it for the purpose of operating the service.",
    ],
  },
  {
    title: "Privacy",
    paragraphs: [
      "Verified Minds uses World ID for identity verification. We do not store your biometric data — World ID provides a zero-knowledge proof of personhood without revealing personal information.",
      "We collect minimal usage data necessary to operate the service. This may include wallet addresses, session identifiers, and interaction logs. We do not sell or share your data with third parties for advertising purposes.",
      "On-chain transactions (e.g. agent creation, marketplace interactions) are publicly visible on the blockchain by nature. Off-chain data is stored securely and access is restricted to authorised personnel.",
    ],
  },
  {
    title: "Intellectual Property",
    paragraphs: [
      "Verified Minds, the Verified Minds logo, and associated branding are the property of Tribute Labs. All rights reserved.",
      "AI agents created on the platform are derived from user-submitted expertise. The resulting agent outputs do not constitute professional advice and should not be relied upon as such.",
    ],
  },
  {
    title: "Limitation of Liability",
    paragraphs: [
      "To the fullest extent permitted by law, Tribute Labs and its contributors shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the platform.",
      "This includes, without limitation, loss of profits, data, or goodwill, whether based on warranty, contract, tort, or any other legal theory.",
    ],
  },
  {
    title: "Contact",
    paragraphs: [
      "For questions about these terms or the platform, reach out to the team at tributelabs.xyz.",
    ],
  },
] as const;

export default function LegalPage(): React.ReactElement {
  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-2xl px-6 py-20">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-12"
        >
          <span aria-hidden>&larr;</span> Back
        </Link>

        {/* Page header */}
        <header className="mb-14">
          <p className="font-mono text-xs tracking-[0.3em] uppercase text-muted-foreground mb-3">
            Verified Minds v0.0.1
          </p>
          <h1 className="font-heading text-3xl sm:text-4xl font-medium tracking-tight">
            Legal
          </h1>
        </header>

        {/* Sections */}
        <div className="space-y-12">
          {SECTIONS.map((section) => (
            <section key={section.title} className="space-y-4">
              <h2 className="font-heading text-lg font-medium">{section.title}</h2>
              {section.paragraphs.map((text, i) => (
                <p key={i} className="text-sm leading-relaxed text-muted-foreground">
                  {text}
                </p>
              ))}
            </section>
          ))}
        </div>

        {/* Footer */}
        <footer className="mt-20 pt-8 border-t border-white/10">
          <p className="font-mono text-xs text-muted-foreground">
            Last updated March 2026 &middot; Built by{" "}
            <a
              href="https://tributelabs.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground/60 hover:text-[#FF00FF] transition-colors"
            >
              Tribute Labs
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}
