"use client";

import { type College, collegeSearchResultSchema } from "@aptiquiz/contracts";
import { ArrowRight, Check, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type SaveStatus = "idle" | "saving" | "saved" | "failed";

const SEARCH_DEBOUNCE_MS = 200;

function collegeMonogram(name: string): string {
  return (name.match(/\p{L}[\p{L}\p{N}]*/gu) ?? [])
    .filter((word) => !["of", "and", "the"].includes(word.toLowerCase()))
    .slice(0, 4)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

function pickerFeedback(status: SaveStatus, loading: boolean, failed: boolean): string {
  if (failed && !loading) return "Colleges could not be loaded. Try again.";
  if (status === "saving") return "Saving your Home College…";
  if (status === "saved") return "Home College saved.";
  if (status === "failed") return "We could not save your College. Try again.";
  return loading ? "Loading Colleges…" : "";
}

function useCollegeSearch(query: string) {
  const [colleges, setColleges] = useState<College[]>([]);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/colleges?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("search failed");
        setColleges(collegeSearchResultSchema.parse(await response.json()).colleges);
        setFailed(false);
        setLoading(false);
      } catch {
        if (!controller.signal.aborted) {
          setFailed(true);
          setLoading(false);
        }
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return { colleges, failed, loading, setLoading };
}

export function HomeCollegePicker({
  current,
  returnTo,
}: Readonly<{ current: College | null; returnTo: string | null }>) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [homeCollege, setHomeCollege] = useState(current);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const { colleges, failed, loading, setLoading } = useCollegeSearch(query);
  const visibleColleges =
    loading || failed
      ? []
      : homeCollege && !query.trim()
        ? [homeCollege, ...colleges.filter((college) => college.id !== homeCollege.id)]
        : colleges;
  const feedback = pickerFeedback(status, loading, failed);

  async function choose(college: College) {
    setStatus("saving");
    try {
      const response = await fetch("/api/home-college", {
        body: JSON.stringify({ collegeId: college.id }),
        headers: { "content-type": "application/json" },
        method: "PUT",
      });
      if (!response.ok) throw new Error("save failed");
      setHomeCollege(college);
      setStatus("saved");
      if (returnTo) router.push(returnTo);
    } catch {
      setStatus("failed");
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <label
          className="text-[11px] font-semibold uppercase tracking-[0.19em] text-[color:var(--aq-ink)]"
          htmlFor="college-search"
        >
          Search Colleges
        </label>
        {!loading && !failed ? (
          <span className="whitespace-nowrap text-sm text-[color:var(--aq-text-muted)]">
            {visibleColleges.length} results
          </span>
        ) : null}
      </div>
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-5 top-1/2 size-5 -translate-y-1/2 text-[color:var(--aq-ink)]"
        />
        <input
          autoComplete="off"
          className="min-h-[60px] w-full rounded-[8px] border border-[color:var(--aq-rule)] bg-white/75 py-3 pl-14 pr-5 text-base text-[color:var(--aq-ink)] outline-none transition-colors placeholder:text-[color:var(--aq-text-muted)] hover:border-[color:var(--aq-text-muted)] focus-visible:border-[color:var(--aq-action)] focus-visible:ring-3 focus-visible:ring-[color:var(--aq-brand-orange)]/20 sm:text-lg"
          id="college-search"
          onChange={(event) => {
            setLoading(true);
            setQuery(event.target.value);
          }}
          placeholder="Try “technology bombay”"
          type="search"
          value={query}
        />
      </div>
      <p
        aria-live="polite"
        className="min-h-5 pt-2 text-sm text-[color:var(--aq-text-muted)]"
        role="status"
      >
        {feedback}
      </p>
      <ul
        aria-busy={loading}
        className="mt-4 grid max-h-[390px] gap-3 overflow-y-auto pr-1 2xl:max-h-[475px]"
      >
        {visibleColleges.map((college) => {
          const isHome = college.id === homeCollege?.id;
          return (
            <li key={college.id}>
              <button
                aria-pressed={isHome}
                className="flex min-h-[82px] w-full items-center gap-4 rounded-[8px] border border-[color:var(--aq-rule)] bg-white/55 px-5 py-3 text-left transition-[border-color,background-color,transform] duration-200 hover:-translate-y-px hover:border-[color:var(--aq-action)] hover:bg-[color:var(--aq-canvas)] aria-pressed:border-[color:var(--aq-brand-orange)] aria-pressed:bg-[color:var(--aq-hero-surface)] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--aq-brand-orange)] disabled:cursor-wait disabled:opacity-70 2xl:min-h-[96px]"
                disabled={status === "saving"}
                onClick={() => choose(college)}
                type="button"
              >
                <span
                  aria-hidden="true"
                  className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[color:var(--aq-surface)] text-sm font-semibold text-[color:var(--aq-ink)] 2xl:size-14 2xl:text-base"
                >
                  {collegeMonogram(college.name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold leading-snug text-[color:var(--aq-ink)] 2xl:text-[15px]">
                    {college.name}
                  </span>
                  <span className="mt-1 block text-xs text-[color:var(--aq-text-muted)] 2xl:text-sm">
                    Approved College
                  </span>
                </span>
                {isHome ? (
                  <span className="flex shrink-0 items-center gap-3">
                    <span className="hidden rounded-full bg-[color:var(--aq-hero-surface)] px-2 py-1 text-[11px] font-medium text-[color:var(--aq-action)] lg:inline">
                      Your Home College
                    </span>
                    <span className="flex size-7 items-center justify-center rounded-full bg-[color:var(--aq-action)] text-white">
                      <Check aria-label="Home College" className="size-4" />
                    </span>
                  </span>
                ) : (
                  <span
                    aria-hidden="true"
                    className="size-7 shrink-0 rounded-full border-2 border-[color:var(--aq-text-muted)]"
                  />
                )}
              </button>
            </li>
          );
        })}
      </ul>
      {!loading && !failed && visibleColleges.length === 0 ? (
        <p className="py-8 text-center text-sm text-[color:var(--aq-text-muted)]">
          No Colleges match that search. Try another name.
        </p>
      ) : null}
      {homeCollege ? (
        <Link
          className="mt-8 flex min-h-16 w-full items-center justify-center gap-3 rounded-[8px] bg-[color:var(--aq-action)] px-5 text-base font-semibold text-white transition-[background-color,transform] duration-200 hover:-translate-y-px hover:bg-[color:var(--aq-action-hover)] focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-[color:var(--aq-brand-orange)] 2xl:min-h-[68px] 2xl:text-lg"
          href={returnTo ?? "/host"}
        >
          Continue to hosting
          <ArrowRight aria-hidden="true" className="size-5" />
        </Link>
      ) : null}
      <p className="mt-3 text-center text-xs text-[color:var(--aq-text-muted)]">
        You can change your Home College here later.
      </p>
    </div>
  );
}
