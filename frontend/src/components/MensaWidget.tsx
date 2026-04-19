import { useEffect, useState } from "react";
import { useMensaLocations, useMensaMenu, type MensaDish } from "../hooks/useMensa";

const STORAGE_KEY = "mensa.location";
const DEFAULT_LOCATION = "mensa-garching";

const LABEL_PRETTY: Record<string, string> = {
  VEGAN: "Vegan",
  VEGETARIAN: "Vegetarian",
  GLUTEN: "Gluten",
  WHEAT: "Wheat",
  MILK: "Milk",
  LACTOSE: "Lactose",
  EGG: "Egg",
  SOY: "Soy",
  FISH: "Fish",
  PORK: "Pork",
  BEEF: "Beef",
  POULTRY: "Poultry",
  PEANUTS: "Peanuts",
  MUSTARD: "Mustard",
  CELERY: "Celery",
  SESAME: "Sesame",
  CEREAL: "Cereal",
  ALCOHOL: "Alcohol",
  ANTIOXIDANTS: "Antioxidants",
  COLORANTS: "Colorants",
  FLAVOR_ENHANCER: "Flavor enhancer",
  PRESERVATIVES: "Preservatives",
  SWEETENERS: "Sweeteners",
};

function prettyLabel(l: string) {
  return LABEL_PRETTY[l] ?? l.replace(/_/g, " ").toLowerCase();
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

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, location);
  }, [location]);

  const { data: locations } = useMensaLocations();
  const { data: menu, isLoading } = useMensaMenu(location);

  const currentName =
    locations?.find((l) => l.canteen_id === location)?.name ?? location;

  const dishes = menu?.dishes ?? [];
  const dateLabel = menu?.date
    ? new Date(menu.date + "T00:00:00").toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
      })
    : "";

  return (
    <>
      <div className="bg-surface border border-border rounded-(--radius-lg) p-4 hover:border-accent/50 transition-colors">
        <div className="flex items-center justify-between mb-2 gap-2">
          <h3 className="text-(--text-xs) font-mono uppercase tracking-widest text-ink-muted truncate">
            {currentName} · {menu?.isToday ? "today" : dateLabel} · {dishes.length} dish{dishes.length !== 1 ? "es" : ""}
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

        <button
          onClick={() => dishes.length > 0 && setOpen(true)}
          disabled={dishes.length === 0}
          className="w-full text-left"
        >
          {isLoading ? (
            <p className="text-(--text-xs) font-mono text-ink-faint animate-pulse">Loading menu…</p>
          ) : menu?.error ? (
            <p className="text-(--text-xs) font-mono text-red-400">{menu.error}</p>
          ) : dishes.length === 0 ? (
            <p className="text-(--text-sm) font-mono text-ink-faint">No menu available.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {dishes.map((d, i) => (
                <span
                  key={i}
                  className="text-(--text-xs) text-ink-secondary bg-surface-hover border border-border-subtle rounded-(--radius-sm) px-2 py-1 truncate max-w-[220px]"
                  title={d.name}
                >
                  {d.name}
                </span>
              ))}
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
                  {menu?.isToday ? "Today" : dateLabel} · {dishes.length} dish{dishes.length !== 1 ? "es" : ""}
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
            <div className="px-5 py-4 overflow-y-auto space-y-4">
              {dishes.map((d, i) => {
                const price = formatPrice(d);
                return (
                  <div key={i} className="pb-3 border-b border-border-subtle last:border-0 last:pb-0">
                    <div className="flex items-baseline justify-between gap-3 mb-1">
                      <p className="text-(--text-sm) font-medium text-ink">{d.name}</p>
                      {price && (
                        <span className="text-(--text-xs) font-mono text-ink-muted flex-shrink-0">{price}</span>
                      )}
                    </div>
                    <p className="text-(--text-xs) font-mono uppercase tracking-wider text-ink-faint mb-1.5">
                      {d.dish_type}
                    </p>
                    {d.labels.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {d.labels.map((l) => (
                          <span
                            key={l}
                            className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-hover text-ink-secondary"
                          >
                            {prettyLabel(l)}
                          </span>
                        ))}
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
