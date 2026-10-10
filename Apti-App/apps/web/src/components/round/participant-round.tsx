"use client";

import { answerFailureMessage, isTransientAnswerFailure } from "@/lib/room-errors";
import type { SendRoundAnswer } from "@/lib/room-socket";
import type { ReceivedRound } from "@/lib/server-clock";
import { canSubmitAnswer, lockedAnswerLabel } from "./answer-state";
import { RevealedQuestion, RoundFrame } from "./round-question";
import { countdownLabel, roundResultLabel } from "./round-view";
import { useCountdown } from "./use-countdown";
import { useRoundAnswer } from "./use-round-answer";

interface ParticipantRoundProps {
  readonly round: ReceivedRound;
  readonly online: boolean;
  readonly sendAnswer: SendRoundAnswer;
}

/** The current Round: answer buttons while open, the correct option and scores once revealed. */
export function ParticipantRound({ round, online, sendAnswer }: ParticipantRoundProps) {
  const { view } = round;
  switch (view.phase) {
    case "QUESTION_OPEN":
      return <OpenParticipantRound online={online} round={round} sendAnswer={sendAnswer} />;
    case "QUESTION_REVEAL":
      return (
        <RevealedQuestion view={view}>
          <p className="mt-4 font-semibold text-stone-900" role="status">
            {roundResultLabel(view)}
          </p>
        </RevealedQuestion>
      );
  }
}

/** The open Question with one button per option; the first accepted Answer locks the choice. */
function OpenParticipantRound({ round, online, sendAnswer }: ParticipantRoundProps) {
  const secondsLeft = useCountdown(round);
  const { locked, pending, failure, submit } = useRoundAnswer(round.view, sendAnswer);
  const { question } = round.view;
  const enabled = canSubmitAnswer({
    locked: locked !== null,
    pending,
    refused: failure !== null && !isTransientAnswerFailure(failure),
    timeUp: secondsLeft === 0,
    online,
  });

  return (
    <RoundFrame status={countdownLabel(secondsLeft)} view={round.view}>
      <div className="mt-4 grid gap-2">
        {question.options.map((option) => (
          <button
            aria-pressed={locked?.optionId === option.id}
            className="min-h-12 rounded-lg border border-stone-300 px-4 py-3 text-left hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b84700] disabled:cursor-not-allowed disabled:opacity-60 aria-pressed:border-stone-900 aria-pressed:opacity-100"
            disabled={!enabled}
            key={option.id}
            onClick={() => void submit(option.id)}
            type="button"
          >
            {option.text}
          </button>
        ))}
      </div>
      <div aria-live="polite" className="mt-3 min-h-6 text-sm" role="status">
        {locked !== null ? (
          <p className="font-semibold text-stone-900">{lockedAnswerLabel(question, locked)}</p>
        ) : pending ? (
          <p className="text-stone-600">Sending your Answer…</p>
        ) : failure !== null ? (
          <p className="text-red-800">{answerFailureMessage(failure)}</p>
        ) : null}
      </div>
    </RoundFrame>
  );
}
