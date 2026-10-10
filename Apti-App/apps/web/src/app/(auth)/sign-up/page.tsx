import { AuthShell } from "@/components/auth/auth-shell";
import { EmailAuthForm } from "@/components/auth/email-auth-form";
import { GoogleSignIn } from "@/components/auth/google-sign-in";

interface SignUpPageProps {
  searchParams: Promise<{ error?: string | string[] }>;
}

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const { error } = await searchParams;

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
      <GoogleSignIn errorCode={error} errorPath="/sign-up" />
    </AuthShell>
  );
}
