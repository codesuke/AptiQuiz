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
          className="text-[11px] font-bold uppercase tracking-[0.23em] text-[#15192a]"
          htmlFor="college-search"
        >
          Search Colleges
        </label>
        {!loading && !failed ? (
          <span className="whitespace-nowrap text-sm text-[#777f8d]">
            {visibleColleges.length} results
          </span>
        ) : null}
      </div>
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-5 top-1/2 size-6 -translate-y-1/2 text-[#111827]"
        />
        <input
          autoComplete="off"
          className="min-h-[60px] w-full rounded-[13px] border border-[#cbced3] bg-white/70 py-3 pl-16 pr-5 text-base text-[#111827] outline-none transition-colors placeholder:text-[#8b8f96] hover:border-[#9fa5af] focus-visible:border-[#b84700] focus-visible:ring-3 focus-visible:ring-[#e65c00]/20 sm:text-lg"
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
      <p aria-live="polite" className="text-sm text-[#59616e]" role="status">
        {feedback}
      </p>
      <ul
        aria-busy={loading}
        className="mt-5 grid max-h-[390px] gap-3 overflow-y-auto pr-1 2xl:max-h-[475px]"
      >
        {visibleColleges.map((college) => {
          const isHome = college.id === homeCollege?.id;
          return (
            <li key={college.id}>
              <button
                aria-pressed={isHome}
                className="flex min-h-[82px] w-full items-center gap-3 rounded-xl border border-[#dedfe2] bg-white/65 px-4 py-3 text-left transition-colors hover:border-[#de6a20] hover:bg-[#fffaf5] aria-pressed:border-[#e65c00] aria-pressed:bg-[#fff9f2] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#e65c00] disabled:cursor-wait disabled:opacity-70 2xl:min-h-[104px]"
                disabled={status === "saving"}
                onClick={() => choose(college)}
                type="button"
              >
                <span
                  aria-hidden="true"
                  className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#f1f0ef] text-sm font-semibold text-[#3e475c] 2xl:size-14 2xl:text-base"
                >
                  {collegeMonogram(college.name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold leading-snug text-[#111827] 2xl:text-[15px]">
                    {college.name}
                  </span>
                  <span className="mt-1 block text-xs text-[#71798a] 2xl:text-sm">
                    Approved College
                  </span>
                </span>
                {isHome ? (
                  <span className="flex shrink-0 items-center gap-3">
                    <span className="hidden rounded-full bg-[#ffeadb] px-2 py-1 text-[11px] font-medium text-[#a44100] 2xl:inline">
                      Your Home College
                    </span>
                    <span className="flex size-7 items-center justify-center rounded-full bg-[#e65c00] text-white">
                      <Check aria-label="Home College" className="size-4" />
                    </span>
                  </span>
                ) : (
                  <span
                    aria-hidden="true"
                    className="size-7 shrink-0 rounded-full border-2 border-[#adb2bc]"
                  />
                )}
              </button>
            </li>
          );
        })}
      </ul>
      {!loading && !failed && visibleColleges.length === 0 ? (
        <p className="py-8 text-center text-sm text-[#59616e]">
          No Colleges match that search. Try another name.
        </p>
      ) : null}
      {homeCollege ? (
        <Link
          className="mt-8 flex min-h-16 w-full items-center justify-center gap-3 rounded-xl bg-[#b84700] px-5 text-base font-semibold text-white transition-colors hover:bg-[#993a00] focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-[#e65c00] 2xl:min-h-[68px] 2xl:text-lg"
          href={returnTo ?? "/host"}
        >
          Continue to hosting
          <ArrowRight aria-hidden="true" className="size-5" />
        </Link>
      ) : null}
      <p className="mt-3 text-center text-xs text-[#737b89]">
        You can change your Home College here later.
      </p>
    </div>
  );
}
