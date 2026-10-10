import type { Metadata } from "next";
import { ForgotPasswordFlow } from "@/components/auth/forgot-password-flow";

export const metadata: Metadata = { title: "Forgot your password? — AptiQuiz" };

export default function ForgotPasswordPage() {
  return <ForgotPasswordFlow />;
}
