import { useEffect, useState } from "react";
import { useMensaLocations, useMensaMenu, type MensaDish } from "../hooks/useMensa";

const STORAGE_KEY = "mensa.location";
const DEFAULT_LOCATION = "mensa-garching";

const LABEL_CHIP: Record<string, { emoji: string; text: string }> = {
  VEGAN: { emoji: "🌱", text: "Vegan" },
  VEGETARIAN: { emoji: "🥬", text: "Vegetarian" },
  GLUTEN: { emoji: "🌾", text: "Gluten" },
  WHEAT: { emoji: "🌾", text: "Wheat" },
  MILK: { emoji: "🥛", text: "Milk" },
  LACTOSE: { emoji: "🥛", text: "Lactose" },
  EGG: { emoji: "🥚", text: "Egg" },
  SOY: { emoji: "🫘", text: "Soy" },
  FISH: { emoji: "🐟", text: "Fish" },
  PORK: { emoji: "🐷", text: "Pork" },
  BEEF: { emoji: "🐄", text: "Beef" },
  POULTRY: { emoji: "🐔", text: "Poultry" },
  PEANUTS: { emoji: "🥜", text: "Peanuts" },
  MUSTARD: { emoji: "🟡", text: "Mustard" },
  CELERY: { emoji: "🥬", text: "Celery" },
  SESAME: { emoji: "🫘", text: "Sesame" },
  CEREAL: { emoji: "🌾", text: "Cereal" },
  ALCOHOL: { emoji: "🍷", text: "Alcohol" },
  ANTIOXIDANTS: { emoji: "🧪", text: "Antioxidants" },
  COLORANTS: { emoji: "🎨", text: "Colorants" },
  FLAVOR_ENHANCER: { emoji: "🧂", text: "Flavor enhancer" },
  PRESERVATIVES: { emoji: "🧪", text: "Preservatives" },
  SWEETENERS: { emoji: "🍬", text: "Sweeteners" },
};

function labelChip(l: string): { emoji: string; text: string } {
  return LABEL_CHIP[l] ?? { emoji: "📋", text: l.replace(/_/g, " ").toLowerCase() };
}

type DietFilter = "all" | "vegan" | "vegetarian" | "meat";

const FILTERS: { id: DietFilter; label: string; emoji: string }[] = [
  { id: "all", label: "All", emoji: "🍽️" },
  { id: "vegan", label: "Vegan", emoji: "🌱" },
  { id: "vegetarian", label: "Vegetarian", emoji: "🥗" },
  { id: "meat", label: "Meat", emoji: "🥩" },
];

function dishEmoji(d: MensaDish): string {
  const l = d.labels;
  if (l.includes("VEGAN")) return "🌱";
  if (l.includes("VEGETARIAN")) return "🥗";
  if (l.includes("FISH")) return "🐟";
  if (l.includes("POULTRY")) return "🐔";
  if (l.includes("PORK")) return "🥓";
  if (l.includes("BEEF")) return "🥩";
  return "🍴";
}

function matchesFilter(d: MensaDish, f: DietFilter): boolean {
  if (f === "all") return true;
  if (f === "vegan") return d.labels.includes("VEGAN");
  if (f === "vegetarian") return d.labels.includes("VEGETARIAN") || d.labels.includes("VEGAN");
  return !d.labels.includes("VEGETARIAN") && !d.labels.includes("VEGAN");
}

function formatPrice(d: MensaDish): string | null {
  const p = d.prices.students;
  if (!p) return null;
  if (p.base_price > 0 && p.price_per_unit === 0) {
    return `€${p.base_price.toFixed(2)}`;
  }
  if (p.price_per_unit > 0) {
    const base = p.base_price > 0 ? `€${p.base_price.toFixed(2)} + ` : "";
    return `${base}€${p.price_per_unit.toFixed(2)}/${p.unit}`;
  }
  return null;
}

export function MensaWidget() {
  const [location, setLocation] = useState<string>(() => {
    if (typeof window === "undefined") return DEFAULT_LOCATION;
    return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_LOCATION;
  });
  const [open, setOpen] = useState(false);
  const [picking, setPicking] = useState(false);
  const [filter, setFilter] = useState<DietFilter>("all");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, location);
  }, [location]);

  const { data: locations } = useMensaLocations();
  const { data: menu, isLoading } = useMensaMenu(location);

  const currentName =
    locations?.find((l) => l.canteen_id === location)?.name ?? location;

  const allDishes = menu?.dishes ?? [];
  const dishes = allDishes.filter((d) => matchesFilter(d, filter));

  const dateLabel = menu?.date
    ? new Date(menu.date + "T00:00:00").toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
      })
    : "";

  return (
    <>
      <div className="bg-surface border border-border rounded-(--radius-lg) p-5 hover:border-accent/50 transition-colors">
        <div className="flex items-center justify-between mb-3 gap-2">
          <h3 className="text-(--text-xs) font-mono uppercase tracking-widest text-ink-muted truncate">
            <span className="mr-1.5">🍽️</span>
            {currentName} · {menu?.isToday ? "today" : dateLabel} · {dishes.length}/{allDishes.length} dish{allDishes.length !== 1 ? "es" : ""}
          </h3>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setPicking(true);
            }}
            className="text-(--text-xs) font-mono text-ink-muted hover:text-accent transition-colors flex-shrink-0"
          >
            change
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-2">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={(e) => {
                e.stopPropagation();
                setFilter(f.id);
              }}
              className={`text-(--text-xs) font-medium px-2.5 py-1 rounded-full border transition-colors flex items-center gap-1 ${
                filter === f.id
                  ? "bg-accent/10 border-accent/40 text-accent"
                  : "bg-surface border-border-subtle text-ink-muted hover:bg-surface-hover"
              }`}
            >
              <span>{f.emoji}</span>
              <span>{f.label}</span>
            </button>
          ))}
        </div>

        <button
          onClick={() => dishes.length > 0 && setOpen(true)}
          disabled={dishes.length === 0}
          className="w-full text-left"
        >
          {isLoading ? (
            <p className="text-(--text-xs) font-mono text-ink-faint animate-pulse">Loading menu…</p>
          ) : menu?.error ? (
            <p className="text-(--text-xs) font-mono text-red-400">{menu.error}</p>
          ) : allDishes.length === 0 ? (
            <p className="text-(--text-sm) font-mono text-ink-faint">No menu available.</p>
          ) : dishes.length === 0 ? (
            <p className="text-(--text-sm) font-mono text-ink-faint">No dishes match this filter.</p>
          ) : (
            <div className="relative overflow-hidden max-h-[5.5rem]">
              <div className="flex flex-wrap gap-2">
                {dishes.map((d, i) => (
                    <span
                      key={i}
                      className="text-(--text-sm) rounded-full px-3 py-1.5 flex items-center gap-1.5 max-w-[260px] border bg-surface-hover border-border-subtle text-ink"
                      title={d.name}
                    >
                      <span className="flex-shrink-0">{dishEmoji(d)}</span>
                      <span className="truncate">{d.name}</span>
                    </span>
                ))}
              </div>
              {dishes.length > 6 && (
                <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-surface to-transparent flex items-end justify-end pr-1">
                  <span className="text-(--text-sm) text-ink-muted font-mono leading-none">…</span>
                </div>
              )}
            </div>
          )}
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-surface border border-border rounded-(--radius-lg) w-[640px] max-h-[75vh] flex flex-col shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
              <div>
                <h3 className="text-(--text-sm) font-semibold text-ink">{currentName}</h3>
                <p className="text-(--text-xs) font-mono text-ink-muted mt-0.5">
                  {menu?.isToday ? "Today" : dateLabel} · {dishes.length}/{allDishes.length} dish{allDishes.length !== 1 ? "es" : ""}
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-ink-muted hover:text-ink-secondary w-8 h-8 flex items-center justify-center rounded-(--radius-sm) hover:bg-surface-hover transition-colors"
                aria-label="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4.5 h-4.5">
                  <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" />
                </svg>
              </button>
            </div>
            <div className="px-5 pt-3 flex flex-wrap gap-1 border-b border-border-subtle pb-3 flex-shrink-0">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`text-(--text-xs) font-medium px-3 py-1.5 rounded-full border transition-colors flex items-center gap-1.5 ${
                    filter === f.id
                      ? "bg-accent/10 border-accent/40 text-accent"
                      : "bg-surface border-border-subtle text-ink-muted hover:bg-surface-hover"
                  }`}
                >
                  <span>{f.emoji}</span>
                  <span>{f.label}</span>
                </button>
              ))}
            </div>
            <div className="px-5 py-4 overflow-y-auto space-y-4">
              {dishes.length === 0 && (
                <p className="text-(--text-sm) font-mono text-ink-faint">No dishes match this filter.</p>
              )}
              {dishes.map((d, i) => {
                const price = formatPrice(d);
                return (
                  <div
                    key={i}
                    className="pb-4 border-b border-border-subtle last:border-0 last:pb-0"
                  >
                    <div className="flex items-baseline justify-between gap-3 mb-1">
                      <p className="text-(--text-sm) font-medium text-ink flex items-center gap-2">
                        <span className="text-base leading-none">{dishEmoji(d)}</span>
                        <span>{d.name}</span>
                      </p>
                      {price && (
                        <span className="text-(--text-xs) font-mono text-ink-muted flex-shrink-0">{price}</span>
                      )}
                    </div>
                    <p className="text-(--text-xs) font-mono uppercase tracking-wider text-ink-faint mb-2 ml-7">
                      {d.dish_type}
                    </p>
                    {d.labels.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 ml-7">
                        {d.labels.map((l) => {
                          const chip = labelChip(l);
                          return (
                            <span
                              key={l}
                              className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-surface-hover border border-border-subtle text-ink-secondary flex items-center gap-1"
                            >
                              <span>{chip.emoji}</span>
                              {chip.text}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {picking && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setPicking(false)}
        >
          <div
            className="bg-surface border border-border rounded-(--radius-lg) w-[440px] max-h-[70vh] flex flex-col shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
              <h3 className="text-(--text-sm) font-semibold text-ink">Choose mensa</h3>
              <button
                onClick={() => setPicking(false)}
                className="text-ink-muted hover:text-ink-secondary w-8 h-8 flex items-center justify-center rounded-(--radius-sm) hover:bg-surface-hover transition-colors"
                aria-label="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4.5 h-4.5">
                  <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto py-2">
              {(locations ?? []).map((l) => (
                <button
                  key={l.canteen_id}
                  onClick={() => {
                    setLocation(l.canteen_id);
                    setPicking(false);
                  }}
                  className={`w-full text-left px-5 py-2 hover:bg-surface-hover transition-colors ${
                    l.canteen_id === location ? "bg-surface-hover" : ""
                  }`}
                >
                  <p className="text-(--text-sm) font-medium text-ink">{l.name}</p>
                  <p className="text-(--text-xs) font-mono text-ink-faint">{l.location.address}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
