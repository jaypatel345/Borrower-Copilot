// ---------------------------------------------------------------------------
// Question flow control. Pure: given the draft profile + which question ids have
// been answered, decide what to ask next and how far along we are.
// ---------------------------------------------------------------------------

import type { BorrowerProfile, DraftProfile } from "../types/borrower";
import {
  QUESTIONS,
  MUST_QUESTIONS,
  ADDITIONAL_QUESTIONS,
  MUST_FIELDS,
  type Question,
} from "./registry";

export type FlowState = {
  answered: string[]; // question ids, in answer order
  draft: DraftProfile;
};

export const emptyFlow = (): FlowState => ({ answered: [], draft: {} });

/** Apply one answer, returning a new immutable FlowState. */
export function answer(state: FlowState, questionId: string, value: unknown): FlowState {
  const q = QUESTIONS.find((x) => x.id === questionId);
  if (!q) return state;
  const patch = q.toProfile(value, state.draft);
  return {
    answered: state.answered.includes(questionId)
      ? state.answered
      : [...state.answered, questionId],
    draft: { ...state.draft, ...patch },
  };
}

function isPending(q: Question, state: FlowState): boolean {
  return !state.answered.includes(q.id) && q.appliesWhen(state.draft);
}

/** The next question to show, or null when the flow can finish. */
export function nextQuestion(state: FlowState): Question | null {
  for (const q of MUST_QUESTIONS) if (isPending(q, state)) return q;
  if (!mustComplete(state.draft)) return null; // shouldn't happen, guard
  for (const q of ADDITIONAL_QUESTIONS) if (isPending(q, state)) return q;
  return null;
}

/** All must-set fields are present on the draft. */
export function mustComplete(draft: DraftProfile): boolean {
  return MUST_FIELDS.every((f) => draft[f] !== undefined);
}

/** The flow has nothing left to ask. */
export function isFinished(state: FlowState): boolean {
  return mustComplete(state.draft) && nextQuestion(state) === null;
}

/**
 * The borrower may stop as soon as the must-set is done — additional questions
 * only tighten ranges (product brief). Returns whether "See my result" is allowed.
 */
export function canFinishEarly(state: FlowState): boolean {
  return mustComplete(state.draft);
}

export type Progress = {
  answered: number;
  mustTotal: number;
  mustAnswered: number;
  /** Additional questions currently applicable (grows/shrinks as answers change). */
  additionalApplicable: number;
  additionalAnswered: number;
  mustComplete: boolean;
  /** 0..1 for a progress bar — must-set weighted, additional is bonus. */
  fraction: number;
};

export function progress(state: FlowState): Progress {
  const mustAnswered = MUST_QUESTIONS.filter((q) => state.answered.includes(q.id)).length;
  const applicableAdditional = ADDITIONAL_QUESTIONS.filter(
    (q) => q.appliesWhen(state.draft) || state.answered.includes(q.id),
  );
  const additionalAnswered = applicableAdditional.filter((q) =>
    state.answered.includes(q.id),
  ).length;
  const done = mustComplete(state.draft);
  const rawFraction = done
    ? applicableAdditional.length === 0
      ? 1
      : 0.6 + 0.4 * (additionalAnswered / applicableAdditional.length)
    : 0.6 * (mustAnswered / MUST_QUESTIONS.length);
  // Show a small sliver on the first question so the bar never looks empty/broken.
  const fraction = done ? rawFraction : Math.max(0.05, rawFraction);

  return {
    answered: state.answered.length,
    mustTotal: MUST_QUESTIONS.length,
    mustAnswered,
    additionalApplicable: applicableAdditional.length,
    additionalAnswered,
    mustComplete: done,
    fraction: Math.min(1, Math.max(0, fraction)),
  };
}

/** Narrow a finished draft to a BorrowerProfile (must-set guaranteed present). */
export function toProfile(state: FlowState): BorrowerProfile {
  if (!mustComplete(state.draft)) {
    throw new Error("toProfile called before the must-set is complete");
  }
  return state.draft as BorrowerProfile;
}
