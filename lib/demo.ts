import { sql } from "./db";
import { addDays, todayLocal } from "./format";

// Everything sample uses a phone starting "(309) 555-01" (fictional numbers), so it can be removed cleanly.
const P = (n: number) => `(309) 555-01${String(n).padStart(2, "0")}`;
const tok = () => crypto.randomUUID().replace(/-/g, "").slice(0, 20);

type J = {
  c: number; name: string; email?: string; veh: [string, string, string, string]; // year, make, model, mileage
  svc: number; // index into services
  day: number; time: string; status: string; paid?: boolean; method?: string;
  concern: string; findings?: string; extra?: [string, number][]; codes?: [string, string, string][];
  address: string; reviewed?: boolean;
};

const JOBS: J[] = [
  // today
  { c: 1, name: "Marcus Reed", veh: ["2017", "Honda", "Accord", "98,400"], svc: 0, day: 0, time: "09:30", status: "diagnosing", concern: "Check engine light on, rough idle when cold", address: "214 Oak St, Peoria IL", codes: [["P0301", "Cylinder 1 misfire detected", "warn"]] },
  { c: 2, name: "Tasha Greene", veh: ["2015", "Ford", "F-150", "141,200"], svc: 1, day: 0, time: "13:00", status: "scheduled", concern: "Truck cranks but will not start", address: "88 Maple Ave, Pekin IL" },
  // waiting requests
  { c: 3, name: "Dale Whitaker", veh: ["2012", "Chevrolet", "Silverado", "176,000"], svc: 0, day: 2, time: "10:00", status: "requested", concern: "Check engine light and loss of power on hills", address: "1402 Hickory Ln, Morton IL" },
  { c: 4, name: "Priya Nair", veh: ["2019", "Toyota", "RAV4", "62,300"], svc: 2, day: 3, time: "15:00", status: "requested", concern: "Buying this used RAV4 Saturday, want it checked first", address: "Dealer lot, Bloomington IL" },
  { c: 5, name: "Cole Henderson", veh: ["2014", "Jeep", "Wrangler", "119,800"], svc: 3, day: 1, time: "17:30", status: "requested", concern: "Battery keeps dying overnight", address: "55 River Rd, East Peoria IL" },
  // upcoming
  { c: 6, name: "Angela Torres", veh: ["2018", "Nissan", "Altima", "84,100"], svc: 0, day: 1, time: "11:00", status: "scheduled", concern: "ABS and traction lights on", address: "720 Pine St, Normal IL" },
  { c: 7, name: "Greg Albrecht", veh: ["2016", "Ram", "1500", "132,500"], svc: 1, day: 2, time: "14:30", status: "scheduled", concern: "Intermittent stalling at stop lights", address: "309 Cedar Ct, Washington IL" },
  // finished, not paid yet
  { c: 8, name: "Monique Bell", veh: ["2013", "Hyundai", "Sonata", "158,900"], svc: 0, day: -1, time: "10:00", status: "complete", concern: "Check engine light, hesitation", findings: "Failed ignition coil on cylinder 3 plus worn plugs. Recommend replacing coil and all four plugs.", extra: [["Parts guidance & quote", 0]], codes: [["P0303", "Cylinder 3 misfire", "critical"]], address: "18 Lakeview Dr, Peoria IL" },
  { c: 9, name: "Hank Dobbs", veh: ["2011", "GMC", "Sierra", "201,400"], svc: 1, day: -3, time: "12:00", status: "complete", concern: "No start, clicking noise", findings: "Weak starter draw and corroded battery cable end. Cable cleaned, starter replacement recommended.", codes: [], address: "9 Quarry Rd, Pekin IL" },
  // paid, past weeks
  { c: 10, name: "Renee Foster", veh: ["2020", "Subaru", "Outback", "44,700"], svc: 0, day: -4, time: "09:00", status: "complete", paid: true, method: "Card", concern: "Check engine light", findings: "Loose gas cap, EVAP leak small. Cleared and verified.", codes: [["P0455", "EVAP large leak", "info"]], address: "412 Elm St, Bloomington IL" },
  { c: 11, name: "Tony Marchetti", veh: ["2018", "Chevrolet", "Equinox", "77,300"], svc: 3, day: -5, time: "16:00", status: "complete", paid: true, method: "Cash", concern: "Slow crank in the morning", findings: "Battery failed load test. Replaced by customer same day.", address: "27 Birch Way, Morton IL" },
  { c: 12, name: "Shawna Pike", veh: ["2016", "Kia", "Sorento", "109,000"], svc: 2, day: -8, time: "11:00", status: "complete", paid: true, method: "Card", concern: "Pre-purchase check", findings: "Clean scan, all modules healthy. Minor oil seep noted. Cleared to buy.", address: "Dealer lot, Peoria IL" },
  { c: 13, name: "Walt Kowalski", veh: ["2009", "Ford", "Ranger", "188,000"], svc: 0, day: -9, time: "13:30", status: "complete", paid: true, method: "Check", concern: "Check engine light, poor mileage", findings: "Upstream O2 sensor failing. Replaced and verified fuel trims.", extra: [["O2 sensor (customer supplied)", 0]], codes: [["P0131", "O2 sensor low voltage B1S1", "warn"]], address: "6 Mill Rd, Canton IL" },
  { c: 14, name: "Jasmine Cole", veh: ["2021", "Mazda", "CX-5", "31,200"], svc: 1, day: -12, time: "10:00", status: "complete", paid: true, method: "Card", concern: "Random no-start", findings: "Intermittent fuel pump relay. Relay replaced.", address: "75 Heron Pt, Normal IL" },
  { c: 15, name: "Rob Lindgren", veh: ["2014", "Dodge", "Charger", "126,000"], svc: 0, day: -15, time: "15:00", status: "complete", paid: true, method: "Card", concern: "Check engine light flashing", findings: "Cylinder 5 misfire from collapsed lifter. Referred to shop for repair.", codes: [["P0305", "Cylinder 5 misfire", "critical"]], address: "340 Dock St, Peoria IL" },
  { c: 16, name: "Elena Vasquez", veh: ["2017", "Volkswagen", "Jetta", "93,500"], svc: 3, day: -19, time: "09:30", status: "complete", paid: true, method: "Card", concern: "Dash lights flicker", findings: "Alternator output low. Replacement recommended and done by customer.", address: "11 Prairie Ave, Galesburg IL" },
  { c: 17, name: "Bruce Okafor", veh: ["2012", "Toyota", "Camry", "151,000"], svc: 0, day: -22, time: "14:00", status: "complete", paid: true, method: "Cash", concern: "Check engine light", findings: "Failed catalytic converter efficiency. Quote provided.", codes: [["P0420", "Catalyst efficiency below threshold", "warn"]], address: "903 State St, Macomb IL" },
  { c: 18, name: "Carla Mitchell", veh: ["2019", "Ford", "Escape", "58,200"], svc: 2, day: -27, time: "12:30", status: "complete", paid: true, method: "Card", concern: "Pre-purchase inspection", findings: "One stored transmission code, history of recall. Negotiated price down.", address: "Dealer lot, Moline IL" },
  { c: 19, name: "Dennis Park", veh: ["2015", "Honda", "CR-V", "112,300"], svc: 0, day: -33, time: "10:30", status: "complete", paid: true, method: "Card", concern: "Check engine light", findings: "Faulty purge valve. Replaced.", address: "52 Sunset Dr, East Peoria IL" },
  { c: 20, name: "Lori Beckett", veh: ["2010", "Buick", "Lucerne", "98,700"], svc: 1, day: -38, time: "16:30", status: "complete", paid: true, method: "Cash", concern: "Won't start in cold", findings: "Weak battery and corroded terminals. Cleaned, replaced battery.", address: "8 Willow Ct, Pekin IL" },
  { c: 21, name: "Pete Samuelson", veh: ["2013", "Chevrolet", "Cruze", "134,000"], svc: 0, day: -44, time: "09:00", status: "complete", paid: true, method: "Card", concern: "Check engine light, coolant smell", findings: "Failing thermostat housing leak. Quote given.", address: "630 Mason Rd, Washington IL" },
  { c: 22, name: "Nadia Rahman", veh: ["2022", "Hyundai", "Tucson", "22,400"], svc: 2, day: -49, time: "11:30", status: "complete", paid: true, method: "Card", concern: "Pre-purchase inspection", findings: "Clean. No faults.", address: "Dealer lot, Bloomington IL" },
];

const LEADS: [string, number, string, string, string, string, string | null, string][] = [
  // name, phoneIdx, source, vehicle, notes, stage, followUpOffsetDays|null, ... (last = messages marker)
  ["Kyle Brandt", 30, "Facebook", "2016 Ford Fusion", "Saw our post. Check engine light and bad fuel mileage.", "new", null, "in:Hey, is this the mobile diagnostic guy? My check engine light is on, how much?"],
  ["Samantha Ortiz", 31, "Website", "2019 Kia Soul", "Asked about a pre-purchase inspection this weekend.", "new", null, ""],
  ["Ron Delaney", 32, "Text", "2008 Chevy Tahoe", "Truck dies at stop signs.", "contacted", "1", "in:My Tahoe keeps dying at stop signs|out:Sounds like it could be idle control or a sensor. I can come to you and scan it. What day works?"],
  ["Beth Hansen", 33, "Referral", "2014 Subaru Forester", "Referred by Renee Foster. Battery light on.", "contacted", "2", ""],
  ["Omar Haddad", 34, "Phone", "2017 BMW 330i", "Wants a second opinion on a repair quote.", "quoted", "0", "in:Dealer quoted me $1,800 for this misfire. Can you verify?|out:Yes, I can test it and give you my own findings. Diagnostic is $95."],
  ["Trish Calloway", 35, "Website", "2012 Nissan Rogue", "Quoted the electrical diagnostic, waiting to hear back.", "quoted", "-2", ""],
  ["Jon Weller", 36, "Facebook", "2015 Dodge Ram", "Asked about price, hasn't answered since.", "quoted", null, ""],
  ["Felicia Marsh", 37, "Walk-up", "2018 Jeep Cherokee", "Met at a car meet. Booked a check engine diagnostic.", "booked", null, ""],
  ["Doug Pruitt", 38, "Text", "2010 Ford Explorer", "Wanted a quick battery test, done.", "won", null, ""],
  ["Gina Fontaine", 39, "Phone", "2020 Honda Civic", "Decided to use the dealer for warranty work.", "lost", null, ""],
  ["Victor Soto", 40, "Referral", "2013 Toyota Tacoma", "Referral from Bruce Okafor.", "new", null, ""],
  ["Amber Wick", 41, "Import", "2011 Honda Odyssey", "From an old customer list.", "contacted", "5", ""],
];

const EXPENSES: [number, string, number, string][] = [
  [-2, "Fuel", 6420, "Diesel and gas for the week"],
  [-4, "Tools", 18900, "Scan tool software update"],
  [-6, "Insurance", 14500, "Monthly liability"],
  [-9, "Fuel", 5890, "Fuel"],
  [-13, "Parts", 4200, "Test leads and fuses"],
  [-16, "Subscriptions", 3900, "Repair data subscription"],
  [-20, "Fuel", 6110, "Fuel"],
  [-26, "Marketing", 9900, "Facebook ads"],
  [-31, "Fuel", 6350, "Fuel"],
  [-40, "Tools", 7600, "Multimeter probes"],
];

export async function demoPresent(): Promise<boolean> {
  const r = await sql`select 1 from customers where phone like '(309) 555-01%' limit 1`;
  return r.length > 0;
}

export async function loadDemo(): Promise<{ ok: boolean; reason?: string }> {
  const svc = await sql`select id, name, price_cents from services where active order by sort, id`;
  if (svc.length < 4) return { ok: false, reason: "services" };
  if (await demoPresent()) return { ok: false, reason: "exists" };
  const today = todayLocal();

  for (const j of JOBS) {
    const s = svc[j.svc];
    const phone = P(j.c);
    const c = await sql`insert into customers (name, phone, email) values (${j.name}, ${phone}, ${j.name.toLowerCase().replace(/[^a-z]/g, ".") + "@example.com"}) returning id`;
    const v = await sql`insert into vehicles (customer_id, year, make, model, mileage) values (${c[0].id}, ${j.veh[0]}, ${j.veh[1]}, ${j.veh[2]}, ${j.veh[3]}) returning id`;
    const when = `${addDays(today, j.day)}T${j.time}`;
    const total = s.price_cents + (j.extra || []).reduce((a, x) => a + x[1], 0);
    const paidAt = j.paid ? `${addDays(today, j.day)}T${j.time}:00` : null;
    const job = await sql`insert into jobs (customer_id, vehicle_id, service_id, status, scheduled_at, address, concern, findings, token, paid_at, paid_cents, paid_method, completed_at)
      values (${c[0].id}, ${v[0].id}, ${s.id}, ${j.status}, ${when}, ${j.address}, ${j.concern}, ${j.findings || ""}, ${tok()},
        ${paidAt}::timestamptz, ${j.paid ? total : 0}, ${j.paid ? j.method || "Card" : ""}, ${j.status === "complete" ? paidAt || when + ":00" : null}::timestamptz)
      returning id`;
    const jid = job[0].id;
    await sql`insert into line_items (job_id, label, qty, unit_cents) values (${jid}, ${s.name}, 1, ${s.price_cents})`;
    for (const [label, cents] of j.extra || []) await sql`insert into line_items (job_id, label, qty, unit_cents) values (${jid}, ${label}, 1, ${cents})`;
    for (const [code, desc, sev] of j.codes || []) await sql`insert into codes (job_id, code, description, severity) values (${jid}, ${code}, ${desc}, ${sev})`;
    // matching lead so the funnel and sources look real
    const stage = j.status === "complete" ? "won" : j.status === "requested" ? "new" : "booked";
    const src = ["Website", "Facebook", "Referral", "Phone", "Text", "Website", "Referral"][j.c % 7];
    if (j.status !== "requested") {
      await sql`insert into leads (name, phone, source, vehicle, notes, stage, customer_id, job_id, last_contact_at)
        values (${j.name}, ${phone}, ${src}, ${j.veh[0] + " " + j.veh[1] + " " + j.veh[2]}, ${j.concern}, ${stage}, ${c[0].id}, ${jid}, now())`;
    }
  }

  // open leads with conversations
  for (const [name, idx, source, vehicle, notes, stage, fu, msgs] of LEADS) {
    const fuDate = fu === null ? null : addDays(today, Number(fu));
    const l = await sql`insert into leads (name, phone, source, vehicle, notes, stage, follow_up_on, last_contact_at)
      values (${name}, ${P(idx)}, ${source}, ${vehicle}, ${notes}, ${stage}, ${fuDate}::date, ${stage === "new" ? null : new Date().toISOString()}) returning id`;
    for (const m of (msgs ? msgs.split("|") : [])) {
      const dir = m.startsWith("out:") ? "out" : "in";
      await sql`insert into messages (lead_id, direction, body) values (${l[0].id}, ${dir}, ${m.slice(dir === "out" ? 4 : 3)})`;
    }
    if (name === "Kyle Brandt") await sql`insert into approvals (kind, lead_id, to_name, to_phone, body, reason, by_ai) values ('reply', ${l[0].id}, ${name}, ${P(idx)}, 'Hi Kyle, this is the mobile diagnostic shop. The check engine diagnostic is $95 and I come to you with the scan tools. What day works, and what is the address?', 'Reply to their message', false)`;
    if (name === "Trish Calloway") await sql`insert into approvals (kind, lead_id, to_name, to_phone, body, reason, by_ai) values ('follow_up', ${l[0].id}, ${name}, ${P(idx)}, 'Hi Trish, just checking in on your Nissan Rogue. Happy to answer any questions or get you on the schedule.', 'No reply 2 days after quote', false)`;
  }
  const rv = await sql`select j.id, c.name, c.phone from jobs j join customers c on c.id = j.customer_id where c.phone = ${P(10)} limit 1`;
  if (rv.length) await sql`insert into approvals (kind, job_id, to_name, to_phone, body, reason, by_ai) values ('review_request', ${rv[0].id}, ${rv[0].name}, ${rv[0].phone}, 'Hi Renee, thanks for choosing us! If I earned it, a quick review helps a small shop a lot.', 'Ask for a review', false)`;

  for (const [d, cat, cents, note] of EXPENSES) await sql`insert into expenses (spent_on, category, amount_cents, note) values (${addDays(today, d)}::date, ${cat}, ${cents}, ${"[sample] " + note})`;
  for (const [t, d] of [["Order OBD adapter cables", 2], ["Send estimates to Monique and Hank", 0], ["Update prices on website", 5]] as [string, number][])
    await sql`insert into tasks (title, due_on) values (${t + " (sample)"}, ${addDays(today, d)}::date)`;
  await sql`insert into ai_log (kind, question, answer) values ('insight', 'Weekly insights', ${"- Misfire and no-start diagnostics are your best earners this month.\n- 3 booking requests are waiting. Answering within an hour wins more of them.\n- Referrals turn into jobs more often than Facebook leads.\n\nThis week: reply to the 3 waiting requests, follow up with Omar and Trish on their quotes, and text Monique and Hank their estimates. (sample answer)"})`;
  return { ok: true };
}

export async function clearDemo(): Promise<void> {
  await sql`delete from approvals where lead_id in (select id from leads where phone like '(309) 555-01%') or job_id in (select j.id from jobs j join customers c on c.id = j.customer_id where c.phone like '(309) 555-01%')`;
  await sql`delete from leads where phone like '(309) 555-01%'`;
  await sql`delete from customers where phone like '(309) 555-01%'`;
  await sql`delete from expenses where note like '[sample] %'`;
  await sql`delete from tasks where title like '% (sample)'`;
  await sql`delete from ai_log where answer like '%(sample answer)'`;
}
