import { sql } from "./db";
import { addDays, todayLocal } from "./format";

// Everything sample uses a fictional phone starting "(309) 555-0", or a "[listing]" note (real local businesses), so it removes cleanly.
const P = (n: number) => `(309) 555-0${String(n).padStart(3, "0")}`;
const tok = () => crypto.randomUUID().replace(/-/g, "").slice(0, 20);
function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = ["Marcus","Tasha","Dale","Priya","Cole","Angela","Greg","Monique","Hank","Renee","Tony","Shawna","Walt","Jasmine","Rob","Elena","Bruce","Carla","Dennis","Lori","Pete","Nadia","Kevin","Brianna","Mitch","Dana","Luis","Katie","Jerome","Holly","Travis","Alicia","Derek","Megan","Omar","Sierra","Wes","Tina","Ray","Candace"];
const LAST = ["Reed","Greene","Whitaker","Nair","Henderson","Torres","Albrecht","Bell","Dobbs","Foster","Marchetti","Pike","Kowalski","Cole","Lindgren","Vasquez","Okafor","Mitchell","Park","Beckett","Samuelson","Rahman","Hoffman","Dillard","Brandt","Sutter","Ibarra","Wagner","Fleming","Yoder","Keller","Stroud","Nowak","Pruitt","Haddad","Marsh","Fontaine","Soto","Wick","Delaney"];
const TOWNS = ["East Peoria","Washington","Morton","Metamora","Germantown Hills","Tremont","Pekin","Peoria","Eureka","Bartonville","Creve Coeur","Chillicothe"];
const STREETS = ["Oak St","Maple Ave","Hickory Ln","River Rd","Pine St","Cedar Ct","Lakeview Dr","Elm St","Mill Rd","Prairie Ave","Heron Pt","Sunset Dr","Willow Ct","Quarry Rd","Main St","Court St"];
const CARS: [string, string, string][] = [["Honda","Accord","Civic"],["Ford","F-150","Escape"],["Chevrolet","Silverado","Equinox"],["Toyota","RAV4","Camry"],["Jeep","Wrangler","Cherokee"],["Nissan","Altima","Rogue"],["Ram","1500","2500"],["Hyundai","Sonata","Tucson"],["GMC","Sierra","Terrain"],["Subaru","Outback","Forester"],["Dodge","Charger","Durango"],["Kia","Sorento","Soul"]];
const CONCERNS: [string, string, [string, string, string][]][] = [
  ["Check engine light on, rough idle", "Ignition coil failing on one cylinder. Replacement recommended with plugs.", [["P0301", "Cylinder 1 misfire detected", "warn"]]],
  ["Truck cranks but will not start", "Fuel pump relay intermittent. Relay replaced, starts every time.", []],
  ["Battery keeps dying overnight", "Parasitic draw traced to a faulty module. Battery tested good.", []],
  ["ABS and traction lights on", "Wheel speed sensor failing. Sensor and wiring checked.", [["C0035", "Front wheel speed sensor circuit", "warn"]]],
  ["Check engine light, poor mileage", "Upstream O2 sensor failing. Verified fuel trims after.", [["P0131", "O2 sensor low voltage B1S1", "warn"]]],
  ["Loss of power on hills", "Clogged catalytic converter and low fuel pressure noted. Quote provided.", [["P0420", "Catalyst efficiency below threshold", "warn"]]],
  ["Intermittent stalling", "Crank sensor dropping signal when warm. Replacement quoted.", [["P0335", "Crankshaft position sensor circuit", "critical"]]],
  ["Pre-purchase inspection", "Clean scan, all modules healthy. Cleared to buy.", []],
  ["Dash lights flicker, slow crank", "Alternator output low. Replacement recommended.", [["P0562", "System voltage low", "warn"]]],
  ["Check engine light flashing", "Cylinder misfire from worn plugs and coil. Repair estimate sent.", [["P0305", "Cylinder 5 misfire", "critical"]]],
  ["EVAP light on", "Loose gas cap, small EVAP leak. Cleared and verified.", [["P0455", "EVAP large leak", "info"]]],
  ["Overheating in traffic", "Thermostat sticking and coolant leak at housing. Quote given.", [["P0128", "Coolant below thermostat temp", "warn"]]],
];
const EXTRAS: [string, number, number][] = [["Repair labor", 12000, 42000], ["Parts supplied", 4500, 34000], ["ECU programming / relearn", 14000, 26000], ["Fleet scan add-on", 6000, 15000]];
const SRC = ["Website", "Facebook", "Referral", "Phone", "Text", "Website", "Referral", "Google"];

type Gen = { c: number; name: string; veh: [string, string, string, string]; svc: number; day: number; time: string; status: string; paid: boolean; method: string; concern: string; findings: string; extras: [string, number][]; codes: [string, string, string][]; address: string };

function genJobs(): Gen[] {
  const r = rng(309);
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const out: Gen[] = [];
  let c = 0;
  const mk = (day: number, status: string): Gen => {
    c++;
    const car = pick(CARS); const cc = pick(CONCERNS);
    const svc = r() < 0.55 ? 0 : r() < 0.55 ? 1 : r() < 0.6 ? 2 : 3;
    const ex: [string, number][] = [];
    if (r() < 0.62) { const e = pick(EXTRAS); ex.push([e[0], Math.round((e[1] + r() * (e[2] - e[1])) / 500) * 500]); }
    if (r() < 0.22) { const e = pick(EXTRAS); if (!ex.find((x) => x[0] === e[0])) ex.push([e[0], Math.round((e[1] + r() * (e[2] - e[1])) / 500) * 500]); }
    const hr = 8 + Math.floor(r() * 10);
    return {
      c, name: `${FIRST[(c * 3) % 40]} ${LAST[(c * 7 + 3) % 40]}`,
      veh: [String(2008 + Math.floor(r() * 15)), pick([car[0]]), pick([car[1], car[2]]), `${(40 + Math.floor(r() * 150)).toLocaleString("en-US")},${String(Math.floor(r() * 999)).padStart(3, "0")}`],
      svc, day, time: `${String(hr).padStart(2, "0")}:${r() < 0.5 ? "00" : "30"}`, status,
      paid: status === "complete" && day < -2, method: pick(["Card", "Card", "Card", "Cash", "Check"]),
      concern: cc[0], findings: status === "complete" ? cc[1] : "", extras: ex, codes: status === "requested" || status === "scheduled" ? [] : cc[2],
      address: `${100 + Math.floor(r() * 900)} ${pick(STREETS)}, ${pick(TOWNS)} IL`,
    };
  };
  // 12 weeks of steadily growing volume
  for (let d = -84; d <= -1; d++) {
    const dow = (new Date(addDays(todayLocal(), d) + "T12:00:00").getDay());
    if (dow === 0) continue;
    const n = 1 + Math.floor(r() * 2) + Math.floor((84 + d) / 26) + (dow === 6 ? -1 : 0);
    for (let i = 0; i < n; i++) out.push(mk(d, "complete"));
  }
  // today, waiting requests, upcoming
  ["diagnosing", "diagnosing", "scheduled", "scheduled", "scheduled"].forEach((s) => out.push(mk(0, s)));
  [1, 1, 2, 2, 3, 4].forEach((d) => out.push(mk(d, "scheduled")));
  [1, 2, 2, 3, 4, 5].forEach((d) => out.push(mk(d, "requested")));
  return out;
}

// Real central-IL businesses (public listings). "Likely needs" is a suggested angle, not something they said.
const REAL: [string, string, string, string][] = [
  ["Jake's Lawn Service", "(309) 415-1784", "East Peoria", "mower trucks and trailers, spring/fall diagnostics"],
  ["Wilson Services of Central Illinois", "(309) 694-8400", "East Peoria", "work-truck check engine lights and no-start calls"],
  ["Mobeck Lawn & Landscape", "(309) 285-8606", "Washington", "crew trucks and plow rigs, pre-season checks"],
  ["Barrick-Oltman Heating & Cooling", "(309) 444-4474", "Washington", "service van fleet scans, avoids van downtime"],
  ["Washington Heating & Air Conditioning", "(309) 388-7212", "Washington", "service van diagnostics, electrical gremlins"],
  ["D.A. Nabhan Plumbing Services", "(309) 648-5905", "Washington", "plumbing van diagnostics, on-site so no tow"],
  ["Ogborn Plumbing", "(309) 745-5763", "Washington", "van check engine lights, battery and charging checks"],
  ["Novy Plumbing", "(309) 450-2851", "Washington", "van diagnostics and quick repair guidance"],
  ["Metro Auto Sales", "(309) 263-0702", "Morton", "pre-sale scans on trade-ins, sold-as-is vehicles"],
  ["G-Inspired Automall", "(309) 713-1020", "Washington", "mobile pre-purchase inspections and warning-light scans"],
  ["Crossroads Used Cars", "(309) 925-5919", "Tremont", "scan inventory before listing, find hidden codes"],
  ["Tremont Car Connection", "(309) 925-9051", "Tremont", "car and truck inventory diagnostics"],
  ["Mike Murphy Auto Annex", "(309) 328-8171", "Morton", "trade-in diagnostics, second opinions for buyers"],
  ["DLM Trucking", "(309) 383-2755", "Metamora", "light-duty fleet codes, derate and emissions faults"],
  ["Dayton Freight (Peoria)", "(309) 698-5540", "East Peoria", "pickup/cargo vehicle scans, breakdown triage"],
  ["Hofstatter Material & Services", "(309) 367-6000", "Metamora", "dump and utility truck check engine lights"],
  ["Redbird Storage", "(309) 285-2844", "Metamora", "maintenance truck and tenant-van diagnostics"],
  ["Beacon Property Management", "(309) 291-0777", "Morton", "maintenance vehicles, on-site diagnostics"],
  ["Rapp Construction", "(309) 319-3435", "Morton", "job-site truck diagnostics without losing a day"],
  ["Paramount Property Management", "(309) 550-5225", "East Peoria", "maintenance fleet and tenant vehicle checks"],
  ["Remodel It", "(309) 291-0098", "Morton", "contractor trucks and trailers, no-start calls"],
  ["Tazewell Towing", "(309) 347-1711", "Pekin", "tow truck and flatbed diagnostics, referral partner"],
  ["Burton's Towing & Recovery", "(309) 349-3131", "Pekin", "tow fleet scans, refer stranded drivers to you"],
  ["Joe's Towing & Recovery", "(309) 829-2123", "Peoria", "tow trucks plus referral partner for no-start calls"],
];

// Fictional potential customers (people who might call), 555 numbers
const LEADS: [string, string, string, string, string, string, number | null, string][] = [
  // name, source, vehicle, need, stage, town, follow-up offset, messages
  ["Kyle Brandt", "Facebook", "2016 Ford Fusion", "Check engine light, bad fuel mileage", "new", "East Peoria", null, "in:Hey, is this the mobile diagnostic guy? My check engine light is on, how much?"],
  ["Samantha Ortiz", "Website", "2019 Kia Soul", "Pre-purchase inspection this weekend", "new", "Washington", null, ""],
  ["Ron Delaney", "Text", "2008 Chevy Tahoe", "Dies at stop signs", "contacted", "Morton", 1, "in:My Tahoe keeps dying at stop signs|out:Sounds like idle control or a sensor. I can come to you and scan it. What day works?"],
  ["Beth Hansen", "Referral", "2014 Subaru Forester", "Battery light on, charging issue", "contacted", "Germantown Hills", 2, ""],
  ["Omar Haddad", "Phone", "2017 BMW 330i", "Second opinion on a $1,800 repair quote", "quoted", "Metamora", 0, "in:Dealer quoted me $1,800 for this misfire. Can you verify?|out:Yes, I can test it and give you my own findings. Diagnostic is $95."],
  ["Trish Calloway", "Website", "2012 Nissan Rogue", "Electrical drain, dead battery", "quoted", "Washington", -2, ""],
  ["Jon Weller", "Facebook", "2015 Dodge Ram", "Lost power on hills, asked price", "quoted", "Tremont", null, ""],
  ["Victor Soto", "Referral", "2013 Toyota Tacoma", "Check engine light, referred by a customer", "new", "East Peoria", null, ""],
  ["Amber Wick", "Import", "2011 Honda Odyssey", "Transmission shifting hard", "contacted", "Morton", 5, ""],
  ["Chad Pruitt", "Facebook", "2010 Ford Explorer", "ABS and traction lights", "new", "Pekin", null, ""],
  ["Dana Fischer", "Website", "2018 Jeep Cherokee", "Rough idle, buying a used one next week", "new", "Metamora", null, ""],
  ["Mike Tolliver", "Phone", "2009 Silverado 2500", "No start, clicking noise", "new", "Germantown Hills", null, ""],
  ["Lisa Kemper", "Text", "2016 Mazda CX-5", "Check engine light after fill-up", "contacted", "Washington", 1, ""],
  ["Brent Yoder", "Referral", "2014 Ram 1500", "Overheating in traffic", "quoted", "Eureka", 3, ""],
  ["Carol Nguyen", "Website", "2020 Honda CR-V", "Pre-purchase scan at a dealer lot", "new", "East Peoria", null, ""],
  ["Joel Strand", "Facebook", "2012 Chevy Cruze", "Intermittent stalling", "new", "Morton", null, ""],
  ["Patrice Lowe", "Google", "2017 Hyundai Elantra", "Airbag light on", "contacted", "Tremont", 2, ""],
  ["Gary Moeller", "Phone", "2008 Ford F-250", "Diesel hard start, glow plug light", "new", "Metamora", null, ""],
];

const EXPENSES: [string, string, number][] = [
  ["Fuel", "Fleet fuel", 28000], ["Insurance", "Liability + garage", 38000], ["Software & subscriptions", "Scan tool + repair data", 18900],
  ["Marketing", "Facebook + Google ads", 42000], ["Vehicle upkeep", "Service van maintenance", 21000], ["Parts", "Shop supplies and test equipment", 33000], ["Other", "Tech payroll", 160000],
];

export async function demoPresent(): Promise<boolean> {
  const r = await sql`select 1 from customers where phone like '(309) 555-0%' limit 1`;
  return r.length > 0;
}

export async function clearDemo(): Promise<void> {
  await sql`delete from approvals where lead_id in (select id from leads where phone like '(309) 555-0%' or notes like '[listing] %') or job_id in (select j.id from jobs j join customers c on c.id = j.customer_id where c.phone like '(309) 555-0%')`;
  await sql`delete from leads where phone like '(309) 555-0%' or notes like '[listing] %'`;
  await sql`delete from customers where phone like '(309) 555-0%'`;
  await sql`delete from expenses where note like '[sample] %'`;
  await sql`delete from tasks where title like '% (sample)'`;
  await sql`delete from ai_log where answer like '%(sample answer)'`;
}

export async function loadDemo(): Promise<{ ok: boolean; reason?: string }> {
  const svc = await sql`select id, name, price_cents from services where active order by sort, id`;
  if (svc.length < 4) return { ok: false, reason: "services" };
  if (await demoPresent()) await clearDemo(); // replace older sample data
  const today = todayLocal();
  const jobs = genJobs();
  const jobIds: Record<number, number> = {};
  const custIds: Record<number, number> = {};

  const doJob = async (j: Gen) => {
    const s = svc[j.svc];
    const c = await sql`insert into customers (name, phone, email) values (${j.name}, ${P(j.c)}, ${j.name.toLowerCase().replace(/[^a-z]/g, ".") + "@example.com"}) returning id`;
    const v = await sql`insert into vehicles (customer_id, year, make, model, mileage) values (${c[0].id}, ${j.veh[0]}, ${j.veh[1]}, ${j.veh[2]}, ${j.veh[3]}) returning id`;
    const when = `${addDays(today, j.day)}T${j.time}`;
    const total = s.price_cents + j.extras.reduce((a, x) => a + x[1], 0);
    const paidAt = j.paid ? `${when}:00` : null;
    const done = j.status === "complete" ? `${when}:00` : null;
    const job = await sql`insert into jobs (customer_id, vehicle_id, service_id, status, scheduled_at, address, concern, findings, token, paid_at, paid_cents, paid_method, completed_at)
      values (${c[0].id}, ${v[0].id}, ${s.id}, ${j.status}, ${when}, ${j.address}, ${j.concern}, ${j.findings}, ${tok()},
        ${paidAt}::timestamptz, ${j.paid ? total : 0}, ${j.paid ? j.method : ""}, ${done}::timestamptz) returning id`;
    const jid = job[0].id;
    custIds[j.c] = c[0].id; jobIds[j.c] = jid;
    await Promise.all([
      sql`insert into line_items (job_id, label, qty, unit_cents) values (${jid}, ${s.name}, 1, ${s.price_cents})`,
      ...j.extras.map(([label, cents]) => sql`insert into line_items (job_id, label, qty, unit_cents) values (${jid}, ${label}, 1, ${cents})`),
      ...j.codes.map(([code, desc, sev]) => sql`insert into codes (job_id, code, description, severity) values (${jid}, ${code}, ${desc}, ${sev})`),
    ]);
  };
  for (let i = 0; i < jobs.length; i += 30) await Promise.all(jobs.slice(i, i + 30).map(doJob));

  // a few job-linked leads so the funnel shows wins and bookings (kept small: ~50 leads total)
  const linked = jobs.filter((j) => j.status === "scheduled" || (j.status === "complete" && j.day >= -6)).slice(-8);
  for (const j of linked) {
    const stage = j.status === "complete" ? "won" : "booked";
    await sql`insert into leads (name, phone, source, vehicle, notes, stage, customer_id, job_id, last_contact_at)
      values (${j.name}, ${P(j.c)}, ${SRC[j.c % SRC.length]}, ${j.veh[0] + " " + j.veh[1] + " " + j.veh[2]}, ${"Needs: " + j.concern}, ${stage}, ${custIds[j.c]}, ${jobIds[j.c]}, now())`;
  }

  // potential customers with conversations
  let n = 300;
  for (const [name, source, vehicle, need, stage, town, fu, msgs] of LEADS) {
    n++;
    const fuDate = fu === null ? null : addDays(today, fu);
    const l = await sql`insert into leads (name, phone, source, vehicle, notes, stage, follow_up_on, last_contact_at)
      values (${name}, ${P(n)}, ${source}, ${vehicle}, ${"Needs: " + need + " · " + town}, ${stage}, ${fuDate}::date, ${stage === "new" ? null : new Date().toISOString()}) returning id`;
    for (const m of msgs ? msgs.split("|") : []) {
      const dir = m.startsWith("out:") ? "out" : "in";
      await sql`insert into messages (lead_id, direction, body) values (${l[0].id}, ${dir}, ${m.slice(dir === "out" ? 4 : 3)})`;
    }
    if (name === "Kyle Brandt") await sql`insert into approvals (kind, lead_id, to_name, to_phone, body, reason, by_ai) values ('reply', ${l[0].id}, ${name}, ${P(n)}, 'Hi Kyle, this is the mobile diagnostic shop. The check engine diagnostic is $95 and I come to you with the scan tools. What day works, and what is the address?', 'Reply to their message', false)`;
    if (name === "Trish Calloway") await sql`insert into approvals (kind, lead_id, to_name, to_phone, body, reason, by_ai) values ('follow_up', ${l[0].id}, ${name}, ${P(n)}, 'Hi Trish, just checking in on your Nissan Rogue. Happy to answer any questions or get you on the schedule.', 'No reply 2 days after quote', false)`;
  }

  // real local businesses to cold-call
  for (let i = 0; i < REAL.length; i++) {
    const [name, phone, town, need] = REAL[i];
    await sql`insert into leads (name, phone, source, vehicle, notes, stage, follow_up_on)
      values (${name}, ${phone}, 'Prospecting', 'Business', ${"[listing] Likely needs: " + need + " · " + town}, ${i % 6 === 5 ? "contacted" : "new"}, ${i % 6 === 5 ? addDays(today, 1 + (i % 4)) : null}::date)`;
  }

  const paid = await sql`select j.id, c.name, c.phone from jobs j join customers c on c.id = j.customer_id where j.paid_cents > 0 order by j.id desc limit 1`;
  if (paid.length) await sql`insert into approvals (kind, job_id, to_name, to_phone, body, reason, by_ai) values ('review_request', ${paid[0].id}, ${paid[0].name}, ${paid[0].phone}, 'Hi, thanks for choosing us! If I earned it, a quick Google review helps a small shop a lot.', 'Ask for a review', false)`;

  // weekly + monthly expenses across 12 weeks
  const rows: [string, string, number, number][] = [];
  for (let w = 0; w < 12; w++) for (const [cat, note, cents] of EXPENSES) {
    if (cat === "Insurance" && w % 4 !== 0) continue;
    if (cat === "Software & subscriptions" && w % 4 !== 1) continue;
    if (cat === "Marketing" && w % 2 !== 0) continue;
    rows.push([addDays(today, -w * 7 - 1), cat, cat === "Other" ? 120000 + (w % 3) * 5000 : cents + (w % 3) * 1500, 0]);
    rows[rows.length - 1][3] = EXPENSES.findIndex((e) => e[0] === cat);
  }
  for (let i = 0; i < rows.length; i += 25) await Promise.all(rows.slice(i, i + 25).map(([d, cat, cents, ix]) => sql`insert into expenses (spent_on, category, amount_cents, note) values (${d}::date, ${cat}, ${cents}, ${"[sample] " + EXPENSES[ix][1]})`));
  for (const [t, d] of [["Order OBD adapter cables", 2], ["Send estimates to open jobs", 0], ["Hire second tech", 14], ["Update prices on website", 5]] as [string, number][])
    await sql`insert into tasks (title, due_on) values (${t + " (sample)"}, ${addDays(today, d)}::date)`;
  await sql`insert into ai_log (kind, question, answer) values ('insight', 'Weekly insights', ${"- Revenue has grown every month. Misfire and no-start diagnostics are your best earners.\n- Dealers and trade fleets in Morton and Washington are the biggest untapped group.\n- Referrals turn into jobs more often than Facebook leads.\n\nThis week: call the 6 dealers and 8 contractors on your list, reply to waiting requests, and follow up on open quotes. (sample answer)"})`;
  return { ok: true };
}
