export function initialQuestionSetId(
  sets: { id: string; questionCount: number }[],
  requestedId?: string,
) {
  return (
    sets.find((set) => set.id === requestedId && set.questionCount > 0)?.id ??
    sets.find((set) => set.questionCount > 0)?.id ??
    ""
  );
}
