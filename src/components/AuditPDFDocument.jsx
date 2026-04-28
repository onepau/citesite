import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const C = {
  cyan: '#06b6d4',
  blue: '#3b82f6',
  dark: '#0f172a',
  slate: '#1e293b',
  muted: '#64748b',
  light: '#f8fafc',
  border: '#e2e8f0',
  white: '#ffffff',
  green: '#10b981',
  amber: '#f59e0b',
  red: '#ef4444',
};

const scoreColor = (n) => {
  if (n >= 86) return C.green;
  if (n >= 61) return C.blue;
  if (n >= 31) return C.amber;
  return C.red;
};

const scoreLabel = (n) => {
  if (n >= 86) return 'Excellent';
  if (n >= 61) return 'Good';
  if (n >= 31) return 'Needs Work';
  return 'Critical';
};

const s = StyleSheet.create({
  page: {
    backgroundColor: C.white,
    paddingHorizontal: 48,
    paddingTop: 40,
    paddingBottom: 60,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: C.slate,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  brand: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: C.cyan },
  pageNum: { fontSize: 8, color: C.muted },
  footer: {
    position: 'absolute',
    bottom: 22,
    left: 48,
    right: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  footerText: { fontSize: 8, color: C.muted },
  title: { fontSize: 22, fontFamily: 'Helvetica-Bold', marginBottom: 6 },
  accent: { width: 32, height: 3, backgroundColor: C.cyan, borderRadius: 2, marginBottom: 16 },
  subtitle: { fontSize: 9, color: C.muted, marginBottom: 20 },
  label: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.muted, letterSpacing: 1, marginBottom: 8 },
  body: { fontSize: 10, lineHeight: 1.7, color: C.slate },
  scoreRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  badge: { width: 52, height: 52, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  badgeNum: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: C.white, textAlign: 'center' },
  badgeSub: { fontSize: 7, color: 'rgba(255,255,255,0.8)', textAlign: 'center' },
  barTrack: { flex: 1, height: 6, backgroundColor: C.border, borderRadius: 3 },
  barFill: { height: 6, borderRadius: 3 },
  statusText: { fontSize: 9, fontFamily: 'Helvetica-Bold', width: 52, textAlign: 'right', marginLeft: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  infoKey: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.muted, width: 110 },
  infoVal: { fontSize: 9, flex: 1, color: C.slate, lineHeight: 1.5 },
  chip: {
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
    marginRight: 4, marginBottom: 4,
  },
  chipText: { fontSize: 8, fontFamily: 'Helvetica-Bold' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  obsItem: {
    flexDirection: 'row', marginBottom: 7,
    paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: C.cyan,
  },
  obsText: { fontSize: 9, lineHeight: 1.6, flex: 1, color: C.slate },
  checkRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  checkDot: { width: 6, height: 6, borderRadius: 3, marginRight: 8 },
  checkLabel: { fontSize: 9, flex: 1, color: C.slate },
  checkScore: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.muted },
  issueBox: {
    backgroundColor: C.light, padding: 12, borderRadius: 6,
    marginBottom: 12, borderLeftWidth: 3, borderLeftColor: C.red,
  },
  issueTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', marginBottom: 4, color: C.slate },
  issueBody: { fontSize: 9, lineHeight: 1.6, color: C.muted, marginBottom: 4 },
  codeBlock: {
    backgroundColor: '#1e293b', padding: 10, borderRadius: 4, marginTop: 6,
  },
  codeText: { fontSize: 8, color: '#67e8f9', fontFamily: 'Courier', lineHeight: 1.5 },
  improveBox: {
    flexDirection: 'row', backgroundColor: C.light, padding: 10,
    borderRadius: 6, marginBottom: 8,
  },
  improveRank: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: C.cyan,
    justifyContent: 'center', alignItems: 'center', marginRight: 10, flexShrink: 0,
  },
  improveRankText: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.white },
  sigBox: {
    backgroundColor: '#ecfeff', padding: 14, borderRadius: 8,
    borderLeftWidth: 4, borderLeftColor: C.cyan,
  },
  sigTitle: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: C.cyan, marginBottom: 6 },
  statRow: { flexDirection: 'row', marginBottom: 16 },
  statBox: { flex: 1, backgroundColor: C.light, padding: 12, borderRadius: 8, marginRight: 8 },
  statNum: { fontSize: 22, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  statLabel: { fontSize: 7, color: C.muted, fontFamily: 'Helvetica-Bold' },
});

const PageHeader = ({ pageNum }) => (
  <View style={s.header}>
    <Text style={s.brand}>CITESITE</Text>
    <Text style={s.pageNum}>PAGE {pageNum} OF 10</Text>
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
    <View style={{ ...s.barFill, width: `${score}%`, backgroundColor: scoreColor(score) }} />
  </View>
);

const DimensionPage = ({ pageNum, url, date, dim }) => (
  <Page size="A4" style={s.page}>
    <PageHeader pageNum={pageNum} />

    <Text style={s.title}>{dim.dimension}. {dim.name}</Text>
    <View style={s.accent} />
    <Text style={s.subtitle}>Weight: {dim.weight * 100}% · Confidence: {dim.confidence || '—'}</Text>

    <View style={s.scoreRow}>
      <View style={{ ...s.badge, backgroundColor: scoreColor(dim.score) }}>
        <Text style={s.badgeNum}>{dim.score}</Text>
        <Text style={s.badgeSub}>/ 100</Text>
      </View>
      <ScoreBar score={dim.score} />
      <Text style={{ ...s.statusText, color: scoreColor(dim.score) }}>{scoreLabel(dim.score)}</Text>
    </View>

    {dim.observations?.length > 0 && (
      <View style={{ marginBottom: 18 }}>
        <Text style={s.label}>OBSERVATIONS</Text>
        {dim.observations.map((obs, i) => (
          <View key={i} style={s.obsItem}>
            <Text style={s.obsText}>{obs}</Text>
          </View>
        ))}
      </View>
    )}

    {dim.checks?.length > 0 && (
      <View>
        <Text style={s.label}>INDIVIDUAL CHECKS</Text>
        {dim.checks.map((c) => {
          const pct = c.score != null && c.maxPoints ? c.score / c.maxPoints : null;
          const col = pct == null ? C.muted : pct >= 0.7 ? C.green : pct >= 0.4 ? C.amber : C.red;
          return (
            <View key={c.id} style={s.checkRow}>
              <View style={{ ...s.checkDot, backgroundColor: col }} />
              <Text style={s.checkLabel}>{c.name}</Text>
              <Text style={s.checkScore}>
                {c.score != null ? `${c.score}/${c.maxPoints}` : '—'}
              </Text>
            </View>
          );
        })}
      </View>
    )}

    <PageFooter url={url} date={date} />
  </Page>
);

export function AuditPDFDocument({ auditData, url }) {
  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const { dimensions = [], overallScore = 0, inspection = {}, criticalIssues = [], improvements = [], signatureRecommendation } = auditData;

  return (
    <Document title={`CiteSite Audit — ${url}`} author="CiteSite">

      {/* ── Page 1: Cover ── */}
      <Page size="A4" style={s.page}>
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 200, backgroundColor: C.dark }} />
        <View style={{ marginTop: 44 }}>
          <Text style={{ fontSize: 16, fontFamily: 'Helvetica-Bold', color: C.cyan }}>CITESITE</Text>
          <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>
            SEO + GEO + AIO Audit Report
          </Text>
        </View>
        <View style={{ alignItems: 'center', marginTop: 28, marginBottom: 28 }}>
          <View style={{
            width: 110, height: 110, borderRadius: 55, backgroundColor: C.white,
            justifyContent: 'center', alignItems: 'center', marginBottom: 24,
            borderWidth: 4, borderColor: scoreColor(overallScore),
          }}>
            <Text style={{ fontSize: 44, fontFamily: 'Helvetica-Bold', color: scoreColor(overallScore), textAlign: 'center' }}>
              {overallScore}
            </Text>
            <Text style={{ fontSize: 8, color: C.muted, textAlign: 'center' }}>Overall Score</Text>
          </View>
          <Text style={{ fontSize: 24, fontFamily: 'Helvetica-Bold', textAlign: 'center', marginBottom: 6 }}>
            GEO-SEO AUDIT REPORT
          </Text>
          <Text style={{ fontSize: 10, color: C.muted, textAlign: 'center', marginBottom: 4 }}>{url}</Text>
          <Text style={{ fontSize: 8, color: C.muted, textAlign: 'center' }}>Generated {date}</Text>
        </View>
        <View style={s.statRow}>
          {dimensions.slice(0, 3).map((d) => (
            <View key={d.id} style={s.statBox}>
              <Text style={{ ...s.statNum, color: scoreColor(d.score) }}>{d.score}</Text>
              <Text style={s.statLabel}>{(d.shortName || d.name).toUpperCase()}</Text>
            </View>
          ))}
        </View>
        <View style={s.statRow}>
          {dimensions.slice(3, 6).map((d) => (
            <View key={d.id} style={{ ...s.statBox, marginRight: 0 }}>
              <Text style={{ ...s.statNum, color: scoreColor(d.score) }}>{d.score}</Text>
              <Text style={s.statLabel}>{(d.shortName || d.name).toUpperCase()}</Text>
            </View>
          ))}
        </View>
        <PageFooter url={url} date={date} />
      </Page>

      {/* ── Page 2: Executive Summary ── */}
      <Page size="A4" style={s.page}>
        <PageHeader pageNum={2} />
        <Text style={s.title}>Executive Summary</Text>
        <View style={s.accent} />
        <Text style={s.subtitle}>Weighted performance across six GEO-SEO dimensions</Text>

        <Text style={s.label}>OVERALL SCORE</Text>
        <View style={{ ...s.scoreRow, marginBottom: 22 }}>
          <View style={{ ...s.badge, width: 62, height: 62, backgroundColor: scoreColor(overallScore) }}>
            <Text style={{ ...s.badgeNum, fontSize: 24 }}>{overallScore}</Text>
            <Text style={s.badgeSub}>/ 100</Text>
          </View>
          <ScoreBar score={overallScore} />
          <Text style={{ ...s.statusText, color: scoreColor(overallScore), fontSize: 10 }}>{scoreLabel(overallScore)}</Text>
        </View>

        <Text style={s.label}>DIMENSION SCORES</Text>
        {dimensions.map((d) => (
          <View key={d.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Text style={{ fontSize: 9, width: 8, color: C.muted, marginRight: 6 }}>{d.dimension}.</Text>
            <Text style={{ fontSize: 9, width: 140 }}>{d.shortName || d.name}</Text>
            <View style={{ flex: 1, height: 5, backgroundColor: C.border, borderRadius: 3 }}>
              <View style={{ height: 5, borderRadius: 3, width: `${d.score}%`, backgroundColor: scoreColor(d.score) }} />
            </View>
            <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', width: 26, textAlign: 'right', marginLeft: 6, color: scoreColor(d.score) }}>{d.score}</Text>
          </View>
        ))}

        {improvements.length > 0 && (
          <View style={{ marginTop: 16 }}>
            <Text style={s.label}>TOP RECOMMENDATIONS</Text>
            {improvements.slice(0, 3).map((item, i) => (
              <View key={i} style={{ flexDirection: 'row', marginBottom: 8, backgroundColor: C.light, padding: 10, borderRadius: 6 }}>
                <View style={{ ...s.improveRank, width: 18, height: 18, borderRadius: 9, marginRight: 8 }}>
                  <Text style={{ ...s.improveRankText, fontSize: 8 }}>{i + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', marginBottom: 2 }}>{item.title}</Text>
                  <Text style={{ fontSize: 8, color: C.muted }}>{item.description}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <PageFooter url={url} date={date} />
      </Page>

      {/* ── Page 3: Technical Inspection ── */}
      <Page size="A4" style={s.page}>
        <PageHeader pageNum={3} />
        <Text style={s.title}>Technical Inspection</Text>
        <View style={s.accent} />
        <Text style={s.subtitle}>Page-level findings from Step 1 of the audit</Text>

        <View style={{ marginBottom: 18 }}>
          <Text style={s.label}>PAGE METADATA</Text>
          <View style={s.infoRow}><Text style={s.infoKey}>Content Type</Text><Text style={s.infoVal}>{inspection.contentType || '—'}</Text></View>
          <View style={s.infoRow}><Text style={s.infoKey}>Rendering</Text><Text style={s.infoVal}>{inspection.rendering?.toUpperCase() || '—'}</Text></View>
          <View style={s.infoRow}><Text style={s.infoKey}>HTTPS</Text><Text style={s.infoVal}>{inspection.https ? '✓ Yes' : '✗ No'}</Text></View>
          <View style={s.infoRow}><Text style={s.infoKey}>Canonical URL</Text><Text style={s.infoVal}>{inspection.canonical || 'Not set'}</Text></View>
          <View style={s.infoRow}><Text style={s.infoKey}>Mobile Viewport</Text><Text style={s.infoVal}>{inspection.mobileViewport ? '✓ Present' : '✗ Missing'}</Text></View>
          <View style={s.infoRow}><Text style={s.infoKey}>robots.txt</Text><Text style={s.infoVal}>{inspection.robotsTxt ? '✓ Found' : '✗ Not found'}</Text></View>
          <View style={s.infoRow}><Text style={s.infoKey}>XML Sitemap</Text><Text style={s.infoVal}>{inspection.sitemap ? '✓ Found' : '✗ Not found'}</Text></View>
          <View style={s.infoRow}><Text style={s.infoKey}>llms.txt</Text><Text style={s.infoVal}>{inspection.llmsTxt ? '✓ Found' : '✗ Not found'}</Text></View>
        </View>

        {inspection.schemas?.length > 0 && (
          <View style={{ marginBottom: 18 }}>
            <Text style={s.label}>SCHEMA TYPES DETECTED</Text>
            <View style={s.chipRow}>
              {inspection.schemas.map((sc, i) => (
                <View key={i} style={{ ...s.chip, backgroundColor: `${C.cyan}20` }}>
                  <Text style={{ ...s.chipText, color: C.cyan }}>{sc.type}</Text>
                </View>
              ))}
            </View>
            {inspection.schemas.map((sc, i) => sc.summary && (
              <View key={i} style={s.infoRow}>
                <Text style={s.infoKey}>{sc.type}</Text>
                <Text style={s.infoVal}>{sc.summary}</Text>
              </View>
            ))}
          </View>
        )}

        {inspection.criticalBlocker && (
          <View style={{ ...s.issueBox, borderLeftColor: C.red }}>
            <Text style={{ ...s.issueTitle, color: C.red }}>⚠ Critical Blocker</Text>
            <Text style={s.body}>{inspection.criticalBlocker}</Text>
          </View>
        )}

        <PageFooter url={url} date={date} />
      </Page>

      {/* ── Pages 4–9: One page per dimension ── */}
      {dimensions.map((dim, i) => (
        <DimensionPage key={dim.id} pageNum={4 + i} url={url} date={date} dim={dim} />
      ))}

      {/* ── Page 10: Critical Issues + Improvements + Signature Rec ── */}
      <Page size="A4" style={s.page}>
        <PageHeader pageNum={10} />
        <Text style={s.title}>Findings & Recommendations</Text>
        <View style={s.accent} />
        <Text style={s.subtitle}>Critical issues, prioritised improvements, and signature recommendation</Text>

        {criticalIssues.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            <Text style={s.label}>CRITICAL ISSUES</Text>
            {criticalIssues.slice(0, 2).map((issue, i) => (
              <View key={i} style={s.issueBox}>
                <Text style={s.issueTitle}>{issue.title}</Text>
                <Text style={s.issueBody}>{issue.description}</Text>
                <Text style={{ ...s.issueBody, color: C.slate }}>{issue.fix}</Text>
                {issue.codeSnippet && (
                  <View style={s.codeBlock}>
                    <Text style={s.codeText}>{issue.codeSnippet.slice(0, 300)}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {improvements.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            <Text style={s.label}>PRIORITISED IMPROVEMENTS</Text>
            {improvements.slice(0, 3).map((item, i) => (
              <View key={i} style={s.improveBox}>
                <View style={s.improveRank}><Text style={s.improveRankText}>{item.rank || i + 1}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', marginBottom: 2 }}>{item.title}</Text>
                  <Text style={{ fontSize: 8, color: C.muted, lineHeight: 1.5 }}>{item.description}</Text>
                  {item.impact && <Text style={{ fontSize: 7, color: C.muted, marginTop: 2 }}>Impact: {item.impact} · Effort: {item.effort}</Text>}
                </View>
              </View>
            ))}
          </View>
        )}

        {signatureRecommendation && (
          <View style={s.sigBox}>
            <Text style={s.sigTitle}>★ Signature Recommendation</Text>
            <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', marginBottom: 4 }}>{signatureRecommendation.title}</Text>
            <Text style={{ ...s.body, fontSize: 9 }}>{signatureRecommendation.description}</Text>
            {signatureRecommendation.codeSnippet && (
              <View style={{ ...s.codeBlock, marginTop: 8 }}>
                <Text style={s.codeText}>{signatureRecommendation.codeSnippet.slice(0, 400)}</Text>
              </View>
            )}
          </View>
        )}

        <PageFooter url={url} date={date} />
      </Page>
    </Document>
  );
}
