"use client";

import { Check, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { authInputClassName, authLabelClassName } from "@/components/auth/form-styles";

interface College {
  id: string;
  name: string;
}

type SaveStatus = "idle" | "saving" | "saved" | "failed";

const SEARCH_DEBOUNCE_MS = 200;

function useCollegeSearch(query: string) {
  const [colleges, setColleges] = useState<College[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/colleges?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("search failed");
        const body = (await response.json()) as { colleges: College[] };
        setColleges(body.colleges);
        setFailed(false);
      } catch {
        if (!controller.signal.aborted) setFailed(true);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return { colleges, failed };
}

export function HomeCollegePicker({ current }: Readonly<{ current: College | null }>) {
  const [query, setQuery] = useState("");
  const [homeCollege, setHomeCollege] = useState(current);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const { colleges, failed } = useCollegeSearch(query);

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
    } catch {
      setStatus("failed");
    }
  }

  return (
    <div>
      <p aria-live="polite" className="min-h-6 text-sm text-stone-600" role="status">
        {status === "saved" ? "Home College saved." : null}
        {status === "failed" ? "We could not save your College. Try again." : null}
      </p>
      <label className={authLabelClassName} htmlFor="college-search">
        Search Colleges
      </label>
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-stone-400"
        />
        <input
          autoComplete="off"
          className={`${authInputClassName} pl-11`}
          id="college-search"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Try “technology bombay”"
          type="search"
          value={query}
        />
      </div>
      {failed ? (
        <p className="mt-3 text-sm text-red-700">Colleges could not be loaded. Try again.</p>
      ) : null}
      <ul className="mt-3 grid gap-2">
        {colleges.map((college) => {
          const isHome = college.id === homeCollege?.id;
          return (
            <li key={college.id}>
              <button
                aria-pressed={isHome}
                className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white/70 px-4 text-left transition hover:border-stone-400 aria-pressed:border-[#b84700] aria-pressed:bg-[#fff5e6] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#e65c00] disabled:opacity-70"
                disabled={status === "saving"}
                onClick={() => choose(college)}
                type="button"
              >
                <span>{college.name}</span>
                {isHome ? (
                  <Check aria-label="Home College" className="size-4 text-[#b84700]" />
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
