import { AuthShell } from "@/components/auth/auth-shell";
import { EmailAuthForm } from "@/components/auth/email-auth-form";
import { GoogleSignIn } from "@/components/auth/google-sign-in";

interface SignInPageProps {
  searchParams: Promise<{ error?: string | string[] }>;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const { error } = await searchParams;

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
      <GoogleSignIn errorCode={error} errorPath="/sign-in" />
    </AuthShell>
  );
}
