import { AuthShell } from "@/components/auth/auth-shell";
import { EmailAuthForm } from "@/components/auth/email-auth-form";

export default function SignInPage() {
  return (
    <AuthShell
      alternateAction="Create account"
      alternateHref="/sign-up"
      alternatePrompt="New here?"
      eyebrow="Let’s get you back in"
      subtitle="Sign in to your next Round."
      title="Welcome back."
    >
      <EmailAuthForm mode="sign-in" />
    </AuthShell>
  );
}
