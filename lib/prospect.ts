// Finds local BUSINESSES (fleets, contractors, dealers, etc.) from Google's public business listings.
// Only business names/phones that businesses publish themselves. No individuals.
export const PROSPECT_CATEGORIES = [
  { key: "landscaping", label: "Landscaping & lawn care", q: "landscaping company" },
  { key: "contractors", label: "Contractors & builders", q: "general contractor" },
  { key: "plumbing", label: "Plumbing, HVAC & electric", q: "plumbing heating air conditioning electrician" },
  { key: "dealers", label: "Used car dealers", q: "used car dealer" },
  { key: "delivery", label: "Delivery & courier", q: "courier delivery service" },
  { key: "property", label: "Property management", q: "property management company" },
  { key: "rental", label: "Rental & equipment", q: "equipment rental" },
  { key: "towing", label: "Towing & small garages", q: "towing service" },
  { key: "cleaning", label: "Cleaning & home services", q: "cleaning service" },
  { key: "farm", label: "Farms & ag services", q: "farm supply agricultural service" },
];

export const AREA_309 = ["Peoria IL", "Bloomington IL", "Normal IL", "East Peoria IL", "Pekin IL", "Morton IL", "Washington IL", "Galesburg IL", "Macomb IL", "Moline IL", "Rock Island IL", "Canton IL", "Lincoln IL", "Eureka IL"];

export type Found = { name: string; phone: string; address: string; website: string; type: string };

export function prospectingEnabled() {
  return Boolean(process.env.GOOGLE_PLACES_KEY);
}

export async function searchBusinesses(category: string, city: string): Promise<{ list: Found[]; error?: string }> {
  const key = process.env.GOOGLE_PLACES_KEY;
  if (!key) return { list: [], error: "nokey" };
  const cat = PROSPECT_CATEGORIES.find((c) => c.key === category);
  if (!cat || !AREA_309.includes(city)) return { list: [], error: "bad" };
  try {
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.primaryTypeDisplayName,places.businessStatus",
      },
      body: JSON.stringify({ textQuery: `${cat.q} in ${city}`, pageSize: 20 }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return { list: [], error: "fail" };
    const j: any = await res.json();
    const list: Found[] = (j.places || [])
      .filter((p: any) => p.businessStatus !== "CLOSED_PERMANENTLY" && p.nationalPhoneNumber)
      .map((p: any) => ({
        name: String(p.displayName?.text || "").slice(0, 120),
        phone: String(p.nationalPhoneNumber || "").slice(0, 40),
        address: String(p.formattedAddress || "").slice(0, 200),
        website: String(p.websiteUri || "").slice(0, 200),
        type: String(p.primaryTypeDisplayName?.text || cat.label).slice(0, 60),
      }))
      .filter((p: Found) => p.name);
    return { list };
  } catch {
    return { list: [], error: "fail" };
  }
}
