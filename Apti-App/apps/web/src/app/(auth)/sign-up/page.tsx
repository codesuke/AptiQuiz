import { AuthShell } from "@/components/auth/auth-shell";
import { EmailAuthForm } from "@/components/auth/email-auth-form";

export default function SignUpPage() {
  return (
    <AuthShell
      alternateAction="Sign in"
      alternateHref="/sign-in"
      alternatePrompt="Already have an account?"
      eyebrow="Start your next Round"
      subtitle="Create an account to keep your progress."
      title="Build your pace."
    >
      <EmailAuthForm mode="sign-up" />
    </AuthShell>
  );
}
