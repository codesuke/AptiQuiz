"use client";

import { type College, collegeSearchResultSchema } from "@aptiquiz/contracts";
import { Check, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type SaveStatus = "idle" | "saving" | "saved" | "failed";

const SEARCH_DEBOUNCE_MS = 200;

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
  const visibleColleges = loading || failed ? [] : colleges;

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
      {homeCollege ? (
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#f1c6a9] bg-[#fff4e9] px-5 py-4">
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#a44100]">
              Your Home College
            </p>
            <p className="mt-1 font-semibold text-[#111827]">{homeCollege.name}</p>
          </div>
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#b84700] text-white">
            <Check aria-hidden="true" className="size-5" />
          </span>
        </div>
      ) : null}
      <label className="mb-3 block text-base font-semibold text-[#111827]" htmlFor="college-search">
        Search Colleges
      </label>
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-5 top-1/2 size-5 -translate-y-1/2 text-[#6b7280]"
        />
        <input
          autoComplete="off"
          className="min-h-14 w-full rounded-xl border border-[#d8d7d3] bg-[#fdfbf7] py-3 pl-14 pr-5 text-[#111827] outline-none transition-colors placeholder:text-[#8b8f96] hover:border-[#a9a8a3] focus-visible:border-[#b84700] focus-visible:ring-3 focus-visible:ring-[#e65c00]/20"
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
      <p aria-live="polite" className="mt-3 min-h-5 text-sm text-[#59616e]" role="status">
        {status === "saving" ? "Saving your Home College…" : null}
        {status === "saved" ? "Home College saved." : null}
        {status === "failed" ? "We could not save your College. Try again." : null}
        {failed ? "Colleges could not be loaded. Try again." : null}
        {loading && status === "idle" ? "Loading Colleges…" : null}
      </p>
      <div className="mt-3 flex items-center justify-between border-b border-[#e9e6df] pb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#78716c]">
        <span>Choose a College</span>
        {!loading && !failed ? <span>{visibleColleges.length} shown</span> : null}
      </div>
      <ul aria-busy={loading} className="mt-3 grid max-h-[360px] gap-2 overflow-y-auto pr-1">
        {visibleColleges.map((college) => {
          const isHome = college.id === homeCollege?.id;
          return (
            <li key={college.id}>
              <button
                aria-pressed={isHome}
                className="flex min-h-16 w-full items-center justify-between gap-4 rounded-xl border border-[#e4e2dc] bg-white px-4 py-3 text-left transition-colors hover:border-[#c9743d] hover:bg-[#fffaf5] aria-pressed:border-[#e65c00] aria-pressed:bg-[#fff5eb] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#e65c00] disabled:cursor-wait disabled:opacity-70 sm:px-5"
                disabled={status === "saving"}
                onClick={() => choose(college)}
                type="button"
              >
                <span className="font-medium text-[#111827]">{college.name}</span>
                {isHome ? (
                  <span className="flex shrink-0 items-center gap-3 text-[#a44100]">
                    <span className="hidden rounded-full bg-[#ffe9d8] px-3 py-1 text-xs font-semibold sm:inline">
                      Your Home College
                    </span>
                    <Check aria-label="Home College" className="size-5" />
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
      {!loading && !failed && visibleColleges.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[#d8d7d3] px-5 py-8 text-center text-sm text-[#59616e]">
          No Colleges match that search. Try another name.
        </p>
      ) : null}
    </div>
  );
}
