"use client";

export default function AuthError({
  reset,
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#fdfbf7] p-6 text-center text-[#111827]">
      <div>
        <h1 className="text-3xl font-medium tracking-tight">We could not load that page.</h1>
        <p className="mt-3 text-[#4b5563]">Try again in a moment.</p>
        <button
          className="mt-6 min-h-11 rounded-full bg-[#b84700] px-5 text-white transition hover:bg-[#993a00] focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-[#e65c00]"
          onClick={reset}
          type="button"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
