export function getHomeDestinations(signedIn: boolean) {
  return {
    questionSets: signedIn ? "/question-sets" : "/sign-in",
    hosting: "/host",
  } as const;
}
