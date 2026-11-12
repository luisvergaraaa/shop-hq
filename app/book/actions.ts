"use server";
import { redirect } from "next/navigation";
import { createJob } from "@/lib/jobs";

const s = (f: FormData, k: string, max = 300) => String(f.get(k) || "").trim().slice(0, max);

export async function submitBooking(form: FormData) {
  if (s(form, "company")) redirect("/book/thanks"); // bot trap
  const name = s(form, "name", 120);
  const phone = s(form, "phone", 40);
  if (!name || !phone) redirect("/book?e=1");
  const when = s(form, "when", 20);
  await createJob({
    name, phone, email: s(form, "email", 160),
    year: s(form, "year", 4), make: s(form, "make", 40), model: s(form, "model", 60),
    vin: s(form, "vin", 17), mileage: s(form, "mileage", 12),
    serviceId: Number(form.get("service")) || null,
    when: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(when) ? when : null,
    address: s(form, "address", 300), concern: s(form, "concern", 2000),
    status: "requested", source: "Website",
  });
  redirect("/book/thanks");
}
