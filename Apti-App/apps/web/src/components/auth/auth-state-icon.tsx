interface AuthStateIconProps {
  tone: "success" | "error";
}

const toneClassName = {
  success: "bg-[#ffeadb] text-[#b84700]",
  error: "bg-[#fef2f2] text-[#b91c1c]",
} as const;

const toneSymbol = { success: "✓", error: "!" } as const;

export function AuthStateIcon({ tone }: AuthStateIconProps) {
  return (
    <div
      aria-hidden="true"
      className={`mt-8 grid size-14 place-items-center rounded-full text-[28px] font-semibold ${toneClassName[tone]}`}
    >
      {toneSymbol[tone]}
    </div>
  );
}
