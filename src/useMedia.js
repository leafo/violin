import { useEffect, useState } from "react";

export const NARROW = "(max-width: 600px)";

export function useMedia(query) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const list = window.matchMedia(query);
    const onChange = (e) => setMatches(e.matches);
    onChange(list);
    list.addEventListener("change", onChange);
    return () => list.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}
