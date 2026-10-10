"use client";

import type { LockedAnswer, RoundView } from "@aptiquiz/contracts";
import { useCallback, useRef, useState } from "react";
import { createIdempotencyKey } from "@/components/lobby/join-key";
import type { AnswerFailure } from "@/lib/room-errors";
import { emitRoundAnswer, type SendRoundAnswer } from "@/lib/room-socket";
import { answerKeyFor, lockedAnswerFor } from "./answer-state";
import { useLiveSound } from "./live-sound-provider";

interface AnswerAttempt {
  readonly questionIndex: number;
  readonly pending: boolean;
  readonly accepted: LockedAnswer | null;
  readonly failure: AnswerFailure | null;
}

const NO_ATTEMPT = { pending: false, accepted: null, failure: null } as const;

/** Sends this Participant's Answer for the open Question and tracks its outcome. */
export function useRoundAnswer(view: RoundView, send: SendRoundAnswer) {
  const { emit } = useLiveSound();
  const keysRef = useRef(new Map<string, string>());
  const pendingRef = useRef(false);
  const [attempt, setAttempt] = useState<AnswerAttempt | null>(null);
  const current = attempt?.questionIndex === view.questionIndex ? attempt : NO_ATTEMPT;
  const locked = lockedAnswerFor(view, current.accepted);

  const submit = useCallback(
    async (optionId: string) => {
      if (pendingRef.current) return;
      const { roomId, questionIndex } = view;
      const idempotencyKey = answerKeyFor(keysRef.current, view, createIdempotencyKey);

      pendingRef.current = true;
      setAttempt({ questionIndex, ...NO_ATTEMPT, pending: true });
      const result = await emitRoundAnswer(send, {
        roomId,
        questionIndex,
        optionId,
        idempotencyKey,
      });
      pendingRef.current = false;
      if (result.ok) emit("lock", `${roomId}:QUESTION_OPEN:${questionIndex}:lock`);
      setAttempt({
        questionIndex,
        pending: false,
        accepted: result.ok ? result.answer : null,
        failure: result.ok ? null : result.error,
      });
    },
    [view, send, emit],
  );

  return { locked, pending: current.pending, failure: current.failure, submit };
}
