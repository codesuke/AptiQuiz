import type { Metadata } from "next";
import { JoinCodeForm } from "@/components/lobby/join-code-form";
import { JoinShell } from "@/components/lobby/join-shell";

export const metadata: Metadata = { title: "Join a Room · AptiQuiz" };

export default function JoinPage() {
  return (
    <JoinShell
      eyebrow="Join a Room"
      intro="Enter the Join Code from the Host's screen. No account needed."
      title="Jump into the Lobby"
    >
      <JoinCodeForm />
    </JoinShell>
  );
}
