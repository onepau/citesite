import { AUDIT_DIMENSIONS } from "../config/auditEngine.js";

export const hashUrl = (url) => {
  let h = 0;
  for (let i = 0; i < url.length; i++) {
    h = ((h << 5) - h + url.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
};

export const generateScores = (url) => {
  const h = hashUrl(url);
  return AUDIT_DIMENSIONS.map((dim, di) => {
    const base = 25 + ((h * (di + 7) * 13) % 65);
    const score = Math.min(100, Math.max(5, base));
    const checks = dim.checks.map((check, ci) => {
      const cp = Math.min(
        check.maxPoints,
        Math.max(1, (h * (ci + 3) * (di + 11)) % (check.maxPoints + 1))
      );
      return { ...check, score: cp };
    });
    return { ...dim, score, checks };
  });
};

export const getOverallScore = (dims) =>
  Math.round(dims.reduce((s, d) => s + d.score * d.weight, 0));

export const getScoreColor = (score) => {
  if (score >= 86) return "#10b981";
  if (score >= 61) return "#3b82f6";
  if (score >= 31) return "#f59e0b";
  return "#ef4444";
};

export const getScoreLabel = (score) => {
  if (score >= 86) return "Excellent";
  if (score >= 61) return "Good";
  if (score >= 31) return "Needs Work";
  return "Critical";
};