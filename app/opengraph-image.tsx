// Open Graph image — what appears when the URL is shared in Slack,
// iMessage, LinkedIn DMs, X, etc. Editorial layout matching the site:
// big serif-style title, mono metadata strip, single deep-teal accent,
// no gradients / illustrations / decorative elements.
//
// Generated at build time (statically optimized) — Next.js bakes one
// PNG into the deploy.

import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt =
  "AgentRadar — see your store through AI shoppers' eyes. Five real LLMs from five distinct providers run against any Shopify catalog and show the literal transcripts.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#fafafa",
          padding: "72px 80px",
          fontFamily: "system-ui, -apple-system, sans-serif",
          color: "#0a0a0a",
        }}
      >
        {/* Top mono strip */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 18,
            fontFamily: "ui-monospace, Menlo, monospace",
            color: "#0f766e",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}
        >
          <span>agentradar</span>
          <span style={{ color: "#a3a3a3" }}>·</span>
          <span style={{ color: "#525252" }}>agentic-commerce diagnostic</span>
        </div>

        {/* Headline */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 56,
            fontSize: 88,
            fontWeight: 700,
            lineHeight: 1.02,
            letterSpacing: "-0.025em",
          }}
        >
          <span>See your store through</span>
          <span style={{ color: "#0f766e" }}>AI shoppers&apos; eyes.</span>
        </div>

        {/* Subhead */}
        <div
          style={{
            marginTop: 32,
            fontSize: 26,
            color: "#404040",
            lineHeight: 1.4,
            maxWidth: 1000,
          }}
        >
          Five real LLMs · five distinct providers · run against any Shopify
          catalog · readable transcripts · 0–100 score.
        </div>

        {/* Spacer pushes provider strip to bottom */}
        <div style={{ flex: 1 }} />

        {/* Provider strip + URL */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginTop: 40,
            paddingTop: 24,
            borderTop: "1px solid #d4d4d4",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 24,
              fontSize: 16,
              fontFamily: "ui-monospace, Menlo, monospace",
              color: "#525252",
            }}
          >
            <span>Claude Haiku 4.5</span>
            <span style={{ color: "#0f766e" }}>·</span>
            <span>GPT-4o mini</span>
            <span style={{ color: "#0f766e" }}>·</span>
            <span>Llama 3.3 70B</span>
            <span style={{ color: "#0f766e" }}>·</span>
            <span>Gemini 3 Flash</span>
            <span style={{ color: "#0f766e" }}>·</span>
            <span>Mistral Small</span>
          </div>
          <div
            style={{
              fontSize: 16,
              fontFamily: "ui-monospace, Menlo, monospace",
              color: "#0f766e",
            }}
          >
            agent-radar-one.vercel.app
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
