import { useQuery } from "@tanstack/react-query";

export type MensaLocation = {
  enum_name: string;
  name: string;
  canteen_id: string;
  location: { address: string; latitude: number; longitude: number };
};

export type MensaDish = {
  name: string;
  dish_type: string;
  labels: string[];
  prices: {
    students?: { base_price: number; price_per_unit: number; unit: string };
    staff?: { base_price: number; price_per_unit: number; unit: string };
    guests?: { base_price: number; price_per_unit: number; unit: string };
  };
};

export type MensaMenu = {
  location: string;
  date: string;
  isToday: boolean;
  dishes: MensaDish[];
  error?: string;
};

export function useMensaLocations() {
  return useQuery<MensaLocation[]>({
    queryKey: ["mensa", "locations"],
    queryFn: async () => {
      const res = await fetch("/api/mensa/locations");
      return res.json();
    },
    staleTime: 24 * 60 * 60 * 1000,
  });
}

export function useMensaMenu(location: string) {
  return useQuery<MensaMenu>({
    queryKey: ["mensa", "menu", location],
    queryFn: async () => {
      const res = await fetch(`/api/mensa/menu?location=${encodeURIComponent(location)}`);
      return res.json();
    },
    staleTime: 30 * 60 * 1000,
  });
}

export type MensaAnnotation = { name: string; emoji: string; highlight: boolean };

export function useMensaAnnotations(dishes: MensaDish[], preference: string) {
  const key = dishes.map((d) => d.name).join("|");
  return useQuery<{ annotations: MensaAnnotation[] }>({
    queryKey: ["mensa", "annotations", key, preference],
    queryFn: async () => {
      const res = await fetch("/api/mensa/annotate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dishes: dishes.map((d) => ({ name: d.name, labels: d.labels })),
          preference: preference || undefined,
        }),
      });
      return res.json();
    },
    enabled: dishes.length > 0,
    staleTime: 30 * 60 * 1000,
  });
}
