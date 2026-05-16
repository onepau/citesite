import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const C = {
  cyan: "#06b6d4",
  blue: "#3b82f6",
  dark: "#0f172a",
  slate: "#1e293b",
  muted: "#64748b",
  light: "#f8fafc",
  border: "#e2e8f0",
  white: "#ffffff",
  green: "#10b981",
  amber: "#f59e0b",
  red: "#ef4444",
};

const scoreColor = (n) => {
  if (n >= 86) return C.green;
  if (n >= 61) return C.blue;
  if (n >= 31) return C.amber;
  return C.red;
};

const scoreLabel = (n) => {
  if (n >= 86) return "Excellent";
  if (n >= 61) return "Good";
  if (n >= 31) return "Needs Work";
  return "Critical";
};

const effortImpactColor = (level) => {
  const v = String(level || "").toLowerCase();
  if (v === "low") return C.green;
  if (v === "medium") return C.amber;
  if (v === "high") return C.red;
  return C.muted;
};

const s = StyleSheet.create({
  page: {
    backgroundColor: C.white,
    paddingHorizontal: 48,
    paddingTop: 40,
    paddingBottom: 60,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: C.slate,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 28,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  brand: { fontSize: 11, fontFamily: "Helvetica-Bold", color: C.cyan },
  pageNum: { fontSize: 8, color: C.muted },
  footer: {
    position: "absolute",
    bottom: 22,
    left: 48,
    right: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  footerText: { fontSize: 8, color: C.muted },
  title: { fontSize: 22, fontFamily: "Helvetica-Bold", marginBottom: 6 },
  accent: {
    width: 32,
    height: 3,
    backgroundColor: C.cyan,
    borderRadius: 2,
    marginBottom: 16,
  },
  subtitle: { fontSize: 9, color: C.muted, marginBottom: 20 },
  label: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: C.muted,
    letterSpacing: 1,
    marginBottom: 8,
  },
  body: { fontSize: 10, lineHeight: 1.7, color: C.slate },
  para: { fontSize: 10, lineHeight: 1.65, color: C.slate, marginBottom: 8 },
  scoreRow: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
  badge: {
    width: 52,
    height: 52,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  badgeNum: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: C.white,
    textAlign: "center",
  },
  badgeSub: {
    fontSize: 7,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
  },
  barTrack: { flex: 1, height: 6, backgroundColor: C.border, borderRadius: 3 },
  barFill: { height: 6, borderRadius: 3 },
  statusText: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    width: 52,
    textAlign: "right",
    marginLeft: 10,
  },
  infoRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 8 },
  infoKey: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: C.muted,
    width: 110,
  },
  infoVal: { fontSize: 9, flex: 1, color: C.slate, lineHeight: 1.5 },
  chip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 4,
    marginBottom: 4,
  },
  chipText: { fontSize: 8, fontFamily: "Helvetica-Bold" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 8 },
  obsItem: {
    flexDirection: "row",
    marginBottom: 7,
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: C.cyan,
  },
  obsText: { fontSize: 9, lineHeight: 1.6, flex: 1, color: C.slate },
  checkRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  checkDot: { width: 6, height: 6, borderRadius: 3, marginRight: 8 },
  checkLabel: { fontSize: 9, flex: 1, color: C.slate },
  checkScore: { fontSize: 9, fontFamily: "Helvetica-Bold", color: C.muted },
  issueBox: {
    backgroundColor: C.light,
    padding: 12,
    borderRadius: 6,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: C.red,
  },
  issueTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
    color: C.slate,
  },
  issueBody: { fontSize: 9, lineHeight: 1.6, color: C.muted, marginBottom: 4 },
  codeBlock: {
    backgroundColor: "#1e293b",
    padding: 10,
    borderRadius: 4,
    marginTop: 6,
  },
  codeText: {
    fontSize: 8,
    color: "#67e8f9",
    fontFamily: "Courier",
    lineHeight: 1.5,
  },
  improveBox: {
    flexDirection: "row",
    backgroundColor: C.light,
    padding: 10,
    borderRadius: 6,
    marginBottom: 8,
  },
  improveRank: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: C.cyan,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    flexShrink: 0,
  },
  improveRankText: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: C.white,
  },
  sigBox: {
    backgroundColor: "#ecfeff",
    padding: 14,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: C.cyan,
  },
  sigTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: C.cyan,
    marginBottom: 6,
  },
  statRow: { flexDirection: "row", marginBottom: 16 },
  statBox: {
    flex: 1,
    backgroundColor: C.light,
    padding: 12,
    borderRadius: 8,
    marginRight: 8,
  },
  statNum: { fontSize: 22, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  statLabel: { fontSize: 7, color: C.muted, fontFamily: "Helvetica-Bold" },
  // New styles for STEP 5 sections
  quickWinBox: {
    backgroundColor: "#ecfeff",
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
    marginTop: 4,
  },
  quickWinItem: { flexDirection: "row", marginBottom: 4 },
  quickWinDot: {
    fontSize: 9,
    color: C.cyan,
    marginRight: 6,
    fontFamily: "Helvetica-Bold",
  },
  quickWinText: { fontSize: 9, lineHeight: 1.55, flex: 1, color: C.slate },
  actionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: C.light,
    padding: 8,
    borderRadius: 4,
    marginBottom: 5,
  },
  actionText: {
    fontSize: 9,
    flex: 1,
    lineHeight: 1.5,
    color: C.slate,
    marginRight: 8,
  },
  actionPills: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
    maxWidth: 140,
  },
  actionPill: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
    marginLeft: 3,
    marginBottom: 2,
  },
  actionPillText: { fontSize: 7, fontFamily: "Helvetica-Bold" },
  benchmarkCallout: {
    backgroundColor: "#ecfeff",
    borderLeftWidth: 4,
    borderLeftColor: C.cyan,
    padding: 12,
    borderRadius: 4,
    marginBottom: 16,
  },
  benchmarkText: {
    fontSize: 11,
    color: C.slate,
    fontStyle: "italic",
    lineHeight: 1.6,
  },
  gapRow: {
    flexDirection: "row",
    backgroundColor: C.light,
    padding: 10,
    borderRadius: 6,
    marginBottom: 8,
  },
  gapNum: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: C.cyan,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    flexShrink: 0,
  },
  gapNumText: { fontSize: 9, fontFamily: "Helvetica-Bold", color: C.white },
  gapText: { fontSize: 9, flex: 1, lineHeight: 1.5, color: C.slate },
  roadmapPhase: {
    marginBottom: 16,
    borderTopWidth: 3,
    borderTopColor: C.cyan,
    backgroundColor: C.light,
    padding: 12,
    borderRadius: 4,
  },
  roadmapPhaseTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  roadmapItem: { flexDirection: "row", marginBottom: 6 },
  roadmapBullet: { fontSize: 9, color: C.cyan, marginRight: 6 },
  roadmapText: { fontSize: 9, flex: 1, lineHeight: 1.55, color: C.slate },
  checklistItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  checkbox: {
    width: 10,
    height: 10,
    borderWidth: 1,
    borderColor: C.muted,
    borderRadius: 2,
    marginRight: 8,
    marginTop: 1,
    flexShrink: 0,
  },
  checklistDimLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: C.cyan,
    width: 56,
    marginRight: 6,
    marginTop: 2,
  },
  checklistText: {
    fontSize: 9,
    flex: 1,
    lineHeight: 1.5,
    color: C.slate,
    marginTop: 1,
  },
  toolRow: {
    flexDirection: "row",
    backgroundColor: C.light,
    padding: 10,
    borderRadius: 6,
    marginBottom: 6,
  },
  toolBullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.cyan,
    marginRight: 10,
    marginTop: 6,
  },
  toolText: { fontSize: 9, flex: 1, lineHeight: 1.5, color: C.slate },
  disclaimer: {
    marginTop: 18,
    padding: 10,
    backgroundColor: C.light,
    borderRadius: 4,
    fontSize: 8,
    color: C.muted,
    lineHeight: 1.6,
    fontStyle: "italic",
  },
});

const PageHeader = ({ pageNum, totalPages }) => (
  <View style={s.header}>
    <Text style={s.brand}>CITESITE</Text>
    <Text style={s.pageNum}>
      PAGE {pageNum} OF {totalPages}
    </Text>
  </View>
);

const PageFooter = ({ url, date }) => (
  <View style={s.footer}>
    <Text style={s.footerText}>{url}</Text>
    <Text style={s.footerText}>{date}</Text>
    <Text style={s.footerText}>CiteSite — Confidential</Text>
  </View>
);

const ScoreBar = ({ score }) => (
  <View style={s.barTrack}>
    <View
      style={{
        ...s.barFill,
        width: `${score}%`,
        backgroundColor: scoreColor(score),
      }}
    />
  </View>
);

const ActionPill = ({ label, level }) => (
  <View
    style={{
      ...s.actionPill,
      backgroundColor: `${effortImpactColor(level)}20`,
    }}
  >
    <Text style={{ ...s.actionPillText, color: effortImpactColor(level) }}>
      {label}: {level}
    </Text>
  </View>
);

const DimensionPage = ({ pageNum, totalPages, url, date, dim }) => {
  const hasNarrative = !!dim.narrative;
  const hasQuickWins = Array.isArray(dim.quickWins) && dim.quickWins.length > 0;
  const hasActions =
    Array.isArray(dim.prioritizedActions) && dim.prioritizedActions.length > 0;

  return (
    <Page size="A4" style={s.page} wrap>
      <PageHeader pageNum={pageNum} totalPages={totalPages} />

      <Text style={s.title}>
        {dim.dimension}. {dim.name}
      </Text>
      <View style={s.accent} />
      <Text style={s.subtitle}>
        Weight: {dim.weight * 100}% · Confidence: {dim.confidence || "—"}
      </Text>

      <View style={s.scoreRow}>
        <View style={{ ...s.badge, backgroundColor: scoreColor(dim.score) }}>
          <Text style={s.badgeNum}>{dim.score}</Text>
          <Text style={s.badgeSub}>/ 100</Text>
        </View>
        <ScoreBar score={dim.score} />
        <Text style={{ ...s.statusText, color: scoreColor(dim.score) }}>
          {scoreLabel(dim.score)}
        </Text>
      </View>

      {/* Narrative analysis (new) */}
      {hasNarrative && (
        <View style={{ marginBottom: 14 }}>
          <Text style={s.label}>NARRATIVE ANALYSIS</Text>
          {(Array.isArray(dim.narrative)
            ? dim.narrative.map(String)
            : String(dim.narrative).split(/\n\n+/)
          ).map((p, i) => (
            <Text key={i} style={s.para}>
              {p}
            </Text>
          ))}
        </View>
      )}

      {dim.observations?.length > 0 && (
        <View style={{ marginBottom: 14 }} wrap={false}>
          <Text style={s.label}>OBSERVATIONS</Text>
          {dim.observations.map((obs, i) => (
            <View key={i} style={s.obsItem}>
              <Text style={s.obsText}>{obs}</Text>
            </View>
          ))}
        </View>
      )}

      {dim.checks?.length > 0 && (
        <View style={{ marginBottom: 14 }} wrap={false}>
          <Text style={s.label}>INDIVIDUAL CHECKS</Text>
          {dim.checks.map((c) => {
            const pct =
              c.score != null && c.maxPoints ? c.score / c.maxPoints : null;
            const col =
              pct == null
                ? C.muted
                : pct >= 0.7
                  ? C.green
                  : pct >= 0.4
                    ? C.amber
                    : C.red;
            return (
              <View key={c.id} style={s.checkRow}>
                <View style={{ ...s.checkDot, backgroundColor: col }} />
                <Text style={s.checkLabel}>{c.name}</Text>
                <Text style={s.checkScore}>
                  {c.score != null ? `${c.score}/${c.maxPoints}` : "—"}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Quick Wins (new) */}
      {hasQuickWins && (
        <View style={{ marginBottom: 12 }} wrap={false}>
          <Text style={s.label}>QUICK WINS · UNDER 1 WORKING DAY</Text>
          <View style={s.quickWinBox}>
            {dim.quickWins.map((w, i) => (
              <View key={i} style={s.quickWinItem}>
                <Text style={s.quickWinDot}>✓</Text>
                <Text style={s.quickWinText}>
                  {typeof w === "string" ? w : JSON.stringify(w)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Prioritised actions (new) */}
      {hasActions && (
        <View style={{ marginBottom: 8 }}>
          <Text style={s.label}>PRIORITISED ACTIONS</Text>
          {dim.prioritizedActions.map((a, i) => (
            <View key={i} style={s.actionRow} wrap={false}>
              <Text style={s.actionText}>{a.action}</Text>
              <View style={s.actionPills}>
                <ActionPill label="Effort" level={a.effort} />
                <ActionPill label="Impact" level={a.impact} />
                {a.estimatedTrafficLift && (
                  <View
                    style={{ ...s.actionPill, backgroundColor: `${C.cyan}20` }}
                  >
                    <Text style={{ ...s.actionPillText, color: C.cyan }}>
                      {a.estimatedTrafficLift}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      <PageFooter url={url} date={date} />
    </Page>
  );
};

export function AuditPDFDocument({ auditData, url }) {
  const date = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const {
    dimensions = [],
    overallScore = 0,
    inspection = {},
    criticalIssues = [],
    improvements = [],
    signatureRecommendation,
    executiveSummary,
    competitorInsights,
    roadmap,
    toolRecommendations,
  } = auditData || {};

  // Aggregate quick wins across all dimensions for the checklist page
  const allQuickWins = dimensions.flatMap((d) =>
    (d.quickWins || []).map((w) => ({ dim: d.shortName || d.name, win: w })),
  );

  // Compute total page count for headers
  const totalPages =
    1 /* cover */ +
    1 /* exec summary */ +
    1 /* inspection */ +
    dimensions.length /* per-dimension */ +
    1 /* findings + improvements */ +
    (competitorInsights ? 1 : 0) +
    (roadmap ? 1 : 0) +
    (allQuickWins.length > 0 ? 1 : 0) +
    (toolRecommendations?.length ? 1 : 0);

  let p = 0;
  const nextPage = () => ++p;

  return (
    <Document title={`CiteSite Audit — ${url}`} author="CiteSite">
      {/* ── Page 1: Cover ── */}
      <Page size="A4" style={s.page}>
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 200,
            backgroundColor: C.dark,
          }}
        />
        <View style={{ marginTop: 44 }}>
          <Text
            style={{
              fontSize: 16,
              fontFamily: "Helvetica-Bold",
              color: C.cyan,
            }}
          >
            CITESITE
          </Text>
          <Text
            style={{
              fontSize: 9,
              color: "rgba(255,255,255,0.6)",
              marginTop: 4,
            }}
          >
            SEO + GEO + AIO Audit Report
          </Text>
        </View>
        <View style={{ alignItems: "center", marginTop: 28, marginBottom: 28 }}>
          <View
            style={{
              width: 110,
              height: 110,
              borderRadius: 55,
              backgroundColor: C.white,
              justifyContent: "center",
              alignItems: "center",
              marginBottom: 24,
              borderWidth: 4,
              borderColor: scoreColor(overallScore),
            }}
          >
            <Text
              style={{
                fontSize: 44,
                fontFamily: "Helvetica-Bold",
                color: scoreColor(overallScore),
                textAlign: "center",
              }}
            >
              {overallScore}
            </Text>
            <Text style={{ fontSize: 8, color: C.muted, textAlign: "center" }}>
              Overall Score
            </Text>
          </View>
          <Text
            style={{
              fontSize: 24,
              fontFamily: "Helvetica-Bold",
              textAlign: "center",
              marginBottom: 6,
            }}
          >
            GEO-SEO AUDIT REPORT
          </Text>
          <Text
            style={{
              fontSize: 10,
              color: C.muted,
              textAlign: "center",
              marginBottom: 4,
            }}
          >
            {url}
          </Text>
          <Text style={{ fontSize: 8, color: C.muted, textAlign: "center" }}>
            Generated {date}
          </Text>
        </View>
        <View style={s.statRow}>
          {dimensions.slice(0, 3).map((d) => (
            <View key={d.id} style={s.statBox}>
              <Text style={{ ...s.statNum, color: scoreColor(d.score) }}>
                {d.score}
              </Text>
              <Text style={s.statLabel}>
                {(d.shortName || d.name).toUpperCase()}
              </Text>
            </View>
          ))}
        </View>
        <View style={s.statRow}>
          {dimensions.slice(3, 6).map((d) => (
            <View key={d.id} style={{ ...s.statBox, marginRight: 0 }}>
              <Text style={{ ...s.statNum, color: scoreColor(d.score) }}>
                {d.score}
              </Text>
              <Text style={s.statLabel}>
                {(d.shortName || d.name).toUpperCase()}
              </Text>
            </View>
          ))}
        </View>
        <PageFooter url={url} date={date} />
        {nextPage()}
      </Page>

      {/* ── Page 2: Executive Summary ── */}
      <Page size="A4" style={s.page} wrap>
        <PageHeader pageNum={nextPage()} totalPages={totalPages} />
        <Text style={s.title}>Executive Summary</Text>
        <View style={s.accent} />
        <Text style={s.subtitle}>
          Weighted performance across six GEO-SEO dimensions
        </Text>

        <Text style={s.label}>OVERALL SCORE</Text>
        <View style={{ ...s.scoreRow, marginBottom: 18 }}>
          <View
            style={{
              ...s.badge,
              width: 62,
              height: 62,
              backgroundColor: scoreColor(overallScore),
            }}
          >
            <Text style={{ ...s.badgeNum, fontSize: 24 }}>{overallScore}</Text>
            <Text style={s.badgeSub}>/ 100</Text>
          </View>
          <ScoreBar score={overallScore} />
          <Text
            style={{
              ...s.statusText,
              color: scoreColor(overallScore),
              fontSize: 10,
            }}
          >
            {scoreLabel(overallScore)}
          </Text>
        </View>

        {/* Narrative summary if present, else dimension list as-before */}
        {executiveSummary && (
          <View style={{ marginBottom: 18 }}>
            <Text style={s.label}>NARRATIVE</Text>
            {(Array.isArray(executiveSummary)
              ? executiveSummary.map(String)
              : String(executiveSummary).split(/\n\n+/)
            ).map((para, i) => (
              <Text key={i} style={s.para}>
                {para}
              </Text>
            ))}
          </View>
        )}

        <Text style={s.label}>DIMENSION SCORES</Text>
        {dimensions.map((d) => (
          <View
            key={d.id}
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 8,
            }}
            wrap={false}
          >
            <Text
              style={{ fontSize: 9, width: 8, color: C.muted, marginRight: 6 }}
            >
              {d.dimension}.
            </Text>
            <Text style={{ fontSize: 9, width: 140 }}>
              {d.shortName || d.name}
            </Text>
            <View
              style={{
                flex: 1,
                height: 5,
                backgroundColor: C.border,
                borderRadius: 3,
              }}
            >
              <View
                style={{
                  height: 5,
                  borderRadius: 3,
                  width: `${d.score}%`,
                  backgroundColor: scoreColor(d.score),
                }}
              />
            </View>
            <Text
              style={{
                fontSize: 9,
                fontFamily: "Helvetica-Bold",
                width: 26,
                textAlign: "right",
                marginLeft: 6,
                color: scoreColor(d.score),
              }}
            >
              {d.score}
            </Text>
          </View>
        ))}

        {!executiveSummary && improvements.length > 0 && (
          <View style={{ marginTop: 16 }}>
            <Text style={s.label}>TOP RECOMMENDATIONS</Text>
            {improvements.slice(0, 3).map((item, i) => (
              <View
                key={i}
                style={{
                  flexDirection: "row",
                  marginBottom: 8,
                  backgroundColor: C.light,
                  padding: 10,
                  borderRadius: 6,
                }}
              >
                <View
                  style={{
                    ...s.improveRank,
                    width: 18,
                    height: 18,
                    borderRadius: 9,
                    marginRight: 8,
                  }}
                >
                  <Text style={{ ...s.improveRankText, fontSize: 8 }}>
                    {i + 1}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 9,
                      fontFamily: "Helvetica-Bold",
                      marginBottom: 2,
                    }}
                  >
                    {item.title}
                  </Text>
                  <Text style={{ fontSize: 8, color: C.muted }}>
                    {item.description}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <PageFooter url={url} date={date} />
      </Page>

      {/* ── Page 3: Technical Inspection ── */}
      <Page size="A4" style={s.page}>
        <PageHeader pageNum={nextPage()} totalPages={totalPages} />
        <Text style={s.title}>Technical Inspection</Text>
        <View style={s.accent} />
        <Text style={s.subtitle}>
          Page-level findings from Step 1 of the audit
        </Text>

        <View style={{ marginBottom: 18 }}>
          <Text style={s.label}>PAGE METADATA</Text>
          <View style={s.infoRow}>
            <Text style={s.infoKey}>Content Type</Text>
            <Text style={s.infoVal}>{inspection.contentType || "—"}</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoKey}>Rendering</Text>
            <Text style={s.infoVal}>
              {inspection.rendering?.toUpperCase() || "—"}
            </Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoKey}>HTTPS</Text>
            <Text style={s.infoVal}>{inspection.https ? "✓ Yes" : "✗ No"}</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoKey}>Canonical URL</Text>
            <Text style={s.infoVal}>{inspection.canonical || "Not set"}</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoKey}>Mobile Viewport</Text>
            <Text style={s.infoVal}>
              {inspection.mobileViewport ? "✓ Present" : "✗ Missing"}
            </Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoKey}>robots.txt</Text>
            <Text style={s.infoVal}>
              {inspection.robotsTxt ? "✓ Found" : "✗ Not found"}
            </Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoKey}>XML Sitemap</Text>
            <Text style={s.infoVal}>
              {inspection.sitemap ? "✓ Found" : "✗ Not found"}
            </Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoKey}>llms.txt</Text>
            <Text style={s.infoVal}>
              {inspection.llmsTxt ? "✓ Found" : "✗ Not found"}
            </Text>
          </View>
        </View>

        {inspection.schemas?.length > 0 && (
          <View style={{ marginBottom: 18 }}>
            <Text style={s.label}>SCHEMA TYPES DETECTED</Text>
            <View style={s.chipRow}>
              {inspection.schemas.map((sc, i) => (
                <View
                  key={i}
                  style={{ ...s.chip, backgroundColor: `${C.cyan}20` }}
                >
                  <Text style={{ ...s.chipText, color: C.cyan }}>
                    {sc.type}
                  </Text>
                </View>
              ))}
            </View>
            {inspection.schemas.map(
              (sc, i) =>
                sc.summary && (
                  <View key={i} style={s.infoRow}>
                    <Text style={s.infoKey}>{sc.type}</Text>
                    <Text style={s.infoVal}>{sc.summary}</Text>
                  </View>
                ),
            )}
          </View>
        )}

        {inspection.criticalBlocker && (
          <View style={{ ...s.issueBox, borderLeftColor: C.red }}>
            <Text style={{ ...s.issueTitle, color: C.red }}>
              ⚠ Critical Blocker
            </Text>
            <Text style={s.body}>{inspection.criticalBlocker}</Text>
          </View>
        )}

        <PageFooter url={url} date={date} />
      </Page>

      {/* ── Per-dimension deep dives ── */}
      {dimensions.map((dim) => (
        <DimensionPage
          key={dim.id}
          pageNum={nextPage()}
          totalPages={totalPages}
          url={url}
          date={date}
          dim={dim}
        />
      ))}

      {/* ── Findings + Improvements + Signature Rec ── */}
      <Page size="A4" style={s.page} wrap>
        <PageHeader pageNum={nextPage()} totalPages={totalPages} />
        <Text style={s.title}>Findings & Recommendations</Text>
        <View style={s.accent} />
        <Text style={s.subtitle}>
          Critical issues, prioritised improvements, and signature
          recommendation
        </Text>

        {criticalIssues.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            <Text style={s.label}>CRITICAL ISSUES</Text>
            {criticalIssues.slice(0, 3).map((issue, i) => (
              <View key={i} style={s.issueBox} wrap={false}>
                <Text style={s.issueTitle}>{issue.title}</Text>
                <Text style={s.issueBody}>{issue.description}</Text>
                {issue.fix && (
                  <Text style={{ ...s.issueBody, color: C.slate }}>
                    {issue.fix}
                  </Text>
                )}
                {issue.codeSnippet && (
                  <View style={s.codeBlock}>
                    <Text style={s.codeText}>
                      {issue.codeSnippet.slice(0, 400)}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {improvements.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            <Text style={s.label}>PRIORITISED IMPROVEMENTS</Text>
            {improvements.slice(0, 5).map((item, i) => (
              <View key={i} style={s.improveBox} wrap={false}>
                <View style={s.improveRank}>
                  <Text style={s.improveRankText}>{item.rank || i + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 9,
                      fontFamily: "Helvetica-Bold",
                      marginBottom: 2,
                    }}
                  >
                    {item.title}
                  </Text>
                  <Text
                    style={{ fontSize: 8, color: C.muted, lineHeight: 1.5 }}
                  >
                    {item.description}
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      marginTop: 4,
                      flexWrap: "wrap",
                    }}
                  >
                    {item.impact && (
                      <Text
                        style={{ fontSize: 7, color: C.muted, marginRight: 8 }}
                      >
                        Impact: {item.impact}
                      </Text>
                    )}
                    {item.effort && (
                      <Text
                        style={{ fontSize: 7, color: C.muted, marginRight: 8 }}
                      >
                        Effort: {item.effort}
                      </Text>
                    )}
                    {item.estimatedTrafficLift && (
                      <Text
                        style={{
                          fontSize: 7,
                          color: C.cyan,
                          fontFamily: "Helvetica-Bold",
                        }}
                      >
                        {item.estimatedTrafficLift}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {signatureRecommendation && !signatureRecommendation.locked && (
          <View style={s.sigBox} wrap={false}>
            <Text style={s.sigTitle}>★ Signature Recommendation</Text>
            <Text
              style={{
                fontSize: 10,
                fontFamily: "Helvetica-Bold",
                marginBottom: 4,
              }}
            >
              {signatureRecommendation.title}
            </Text>
            <Text style={{ ...s.body, fontSize: 9 }}>
              {signatureRecommendation.description}
            </Text>
            {signatureRecommendation.codeSnippet && (
              <View style={{ ...s.codeBlock, marginTop: 8 }}>
                <Text style={s.codeText}>
                  {signatureRecommendation.codeSnippet.slice(0, 400)}
                </Text>
              </View>
            )}
          </View>
        )}

        <PageFooter url={url} date={date} />
      </Page>

      {/* ── Competitor Gap Analysis (new) ── */}
      {competitorInsights && (
        <Page size="A4" style={s.page} wrap>
          <PageHeader pageNum={nextPage()} totalPages={totalPages} />
          <Text style={s.title}>Competitor Gap Analysis</Text>
          <View style={s.accent} />
          <Text style={s.subtitle}>
            How this page compares to the industry benchmark
          </Text>

          <Text style={s.label}>INDUSTRY BENCHMARK</Text>
          <View style={s.benchmarkCallout}>
            <Text style={s.benchmarkText}>{competitorInsights.benchmark}</Text>
          </View>

          <Text style={s.label}>IDENTIFIED GAPS VERSUS BENCHMARK</Text>
          {(competitorInsights.gaps || []).map((gap, i) => (
            <View key={i} style={s.gapRow} wrap={false}>
              <View style={s.gapNum}>
                <Text style={s.gapNumText}>{i + 1}</Text>
              </View>
              <Text style={s.gapText}>
                {typeof gap === "string" ? gap : JSON.stringify(gap)}
              </Text>
            </View>
          ))}

          <PageFooter url={url} date={date} />
        </Page>
      )}

      {/* ── 30/60/90 Day Roadmap (new) ── */}
      {roadmap && (
        <Page size="A4" style={s.page} wrap>
          <PageHeader pageNum={nextPage()} totalPages={totalPages} />
          <Text style={s.title}>30 / 60 / 90 Day Roadmap</Text>
          <View style={s.accent} />
          <Text style={s.subtitle}>
            Phased action plan, ordered by priority
          </Text>

          {[
            { label: "0–30 DAYS", items: roadmap.thirtyDay, color: C.cyan },
            { label: "31–60 DAYS", items: roadmap.sixtyDay, color: C.amber },
            { label: "61–90 DAYS", items: roadmap.ninetyDay, color: C.green },
          ].map((phase) => (
            <View
              key={phase.label}
              style={{ ...s.roadmapPhase, borderTopColor: phase.color }}
              wrap={false}
            >
              <Text style={{ ...s.roadmapPhaseTitle, color: phase.color }}>
                {phase.label}
              </Text>
              {(phase.items || []).map((item, i) => (
                <View key={i} style={s.roadmapItem}>
                  <Text style={{ ...s.roadmapBullet, color: phase.color }}>
                    ▸
                  </Text>
                  <Text style={s.roadmapText}>
                    {typeof item === "string" ? item : JSON.stringify(item)}
                  </Text>
                </View>
              ))}
            </View>
          ))}

          <PageFooter url={url} date={date} />
        </Page>
      )}

      {/* ── Aggregate Quick Wins Checklist (new) ── */}
      {allQuickWins.length > 0 && (
        <Page size="A4" style={s.page} wrap>
          <PageHeader pageNum={nextPage()} totalPages={totalPages} />
          <Text style={s.title}>Quick Wins Checklist</Text>
          <View style={s.accent} />
          <Text style={s.subtitle}>
            Each item below is implementable in under one working day. Tick them
            off as you ship.
          </Text>

          {allQuickWins.map((item, i) => (
            <View key={i} style={s.checklistItem} wrap={false}>
              <View style={s.checkbox} />
              <Text style={s.checklistDimLabel}>{item.dim?.toUpperCase()}</Text>
              <Text style={s.checklistText}>
                {typeof item.win === "string"
                  ? item.win
                  : JSON.stringify(item.win)}
              </Text>
            </View>
          ))}

          <PageFooter url={url} date={date} />
        </Page>
      )}

      {/* ── Tool Recommendations + Disclaimer (new) ── */}
      {toolRecommendations?.length > 0 && (
        <Page size="A4" style={s.page} wrap>
          <PageHeader pageNum={nextPage()} totalPages={totalPages} />
          <Text style={s.title}>Recommended Tools</Text>
          <View style={s.accent} />
          <Text style={s.subtitle}>
            Specialist tooling tied to issues found on this page
          </Text>

          {toolRecommendations.map((tool, i) => {
            if (typeof tool === "string") {
              return (
                <View key={i} style={s.toolRow} wrap={false}>
                  <View style={s.toolBullet} />
                  <Text style={s.toolText}>{tool}</Text>
                </View>
              );
            }
            const toolName =
              tool.name || tool.tool || tool.toolName || tool.title || "";
            const toolDesc =
              tool.description || tool.purpose || tool.why || tool.reason || "";
            return (
              <View key={i} style={s.toolRow} wrap={false}>
                <View style={s.toolBullet} />
                <View style={{ flex: 1 }}>
                  <Text style={{ ...s.toolText, fontFamily: "Helvetica-Bold" }}>
                    {toolName}
                  </Text>
                  {toolDesc ? (
                    <Text
                      style={{ ...s.toolText, color: C.muted, fontSize: 9 }}
                    >
                      {toolDesc}
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          })}

          <View style={s.disclaimer}>
            <Text>
              This report was generated by CiteSite using AI-assisted analysis.
              Findings are indicative and should be validated with specialist
              tooling and human judgement before making significant technical or
              content changes. Domain Authority, backlink and traffic estimates
              require dedicated link-graph and analytics platforms for
              verification.
            </Text>
          </View>

          <PageFooter url={url} date={date} />
        </Page>
      )}
    </Document>
  );
}
