export function getHomeDestinations(signedIn: boolean) {
  return {
    questionSets: signedIn ? "/question-sets" : "/sign-in",
    hosting: "/host",
    joining: "/join",
    league: "/league",
  } as const;
}
