/**
 * Lead scoring. Deliberately rule-based (not left to the AI) so scores are
 * consistent, explainable in the dashboard, and cannot be talked up by a customer.
 * The AI only reports facts (budget, location, timeline, requests) via tools;
 * this function turns those facts into a 0–100 score and a category.
 */

export type ScoreSignals = {
  has_budget?: boolean;
  has_location?: boolean;
  has_requirement?: boolean;
  requested_details?: boolean;
  site_visit_requested?: boolean;
  callback_requested?: boolean;
  engaged?: boolean;
};

export type Timeline = "immediate" | "1_3_months" | "3_6_months" | "exploring" | null | undefined;

export const SCORE_WEIGHTS = {
  has_budget: 20,
  has_location: 15,
  has_requirement: 10,
  requested_details: 10,
  site_visit_requested: 25,
  callback_requested: 15,
  engaged: 5,
} as const;

export const TIMELINE_POINTS: Record<NonNullable<Exclude<Timeline, null>>, number> = {
  immediate: 30,
  "1_3_months": 20,
  "3_6_months": 10,
  exploring: 0,
};

export type Category = "new" | "hot" | "warm" | "cold";

export function scoreLead(signals: ScoreSignals, timeline: Timeline): { score: number; category: Category } {
  let score = 0;
  for (const [k, w] of Object.entries(SCORE_WEIGHTS)) {
    if (signals[k as keyof ScoreSignals]) score += w;
  }
  if (timeline && timeline in TIMELINE_POINTS) score += TIMELINE_POINTS[timeline as keyof typeof TIMELINE_POINTS];
  score = Math.min(100, score);

  const qualified = signals.has_budget || signals.has_location;
  let category: Category;
  if (score >= 70 || (signals.site_visit_requested && qualified) || (timeline === "immediate" && signals.has_budget && signals.has_location)) {
    category = "hot";
  } else if (score >= 40) {
    category = "warm";
  } else if (score === 0 && !signals.engaged) {
    category = "new";
  } else {
    category = "cold";
  }
  // A customer who is only browsing is never hot unless they asked for a visit or a call.
  if (timeline === "exploring" && category === "hot" && !signals.site_visit_requested && !signals.callback_requested) {
    category = "warm";
  }
  return { score, category };
}
