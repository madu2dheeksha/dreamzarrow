/**
 * Company facts. Everything here was taken from the existing website
 * (dreaamzarrowhomes.com) unless marked otherwise. Optional fields set to
 * `null` are not rendered anywhere until they are filled in — see
 * docs/CONTENT-TODO.md for the list of items awaiting confirmation.
 */
export const site = {
  name: "DreaamzArrow Homes",
  legalName: "DreaamzArrow Homes Infra Pvt Ltd",
  tagline: "Make your dreams a reality",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.dreaamzarrowhomes.com").replace(/\/$/, ""),
  description:
    "DreaamzArrow Homes is a Kondapur-based real estate consultancy helping families, professionals and investors buy, rent, sell and lease premium homes across West Hyderabad.",

  phone: {
    display: "+91 88869 13334",
    e164: "+918886913334",
  },
  whatsapp: "918886913334",
  email: "info@dreaamzarrowhomes.com",

  address: {
    lines: ["Plot No. 75, Flat No. 301", "Sai Krishna Enclave, Road No. 3", "Jagruthi Colony, Kondapur"],
    locality: "Kondapur",
    city: "Hyderabad",
    region: "Telangana",
    postalCode: "500084",
    country: "IN",
  },
  geo: { lat: 17.467040393356697, lng: 78.36451828757107 },
  mapEmbedUrl:
    "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d635.02452388195!2d78.36451828757107!3d17.467040393356697!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bcb933562bb343b%3A0xda5be78b6032385b!2sDreaamzarrow%20Homes!5e0!3m2!1sen!2sin!4v1704386309814!5m2!1sen!2sin",
  mapLinkUrl: "https://www.google.com/maps/search/?api=1&query=Dreaamzarrow+Homes+Kondapur+Hyderabad",

  /** Tuesday is the weekly holiday. Times are IST. */
  hours: [
    { day: "Monday", short: "Mo", open: "09:30", close: "18:30" },
    { day: "Tuesday", short: "Tu", open: null, close: null },
    { day: "Wednesday", short: "We", open: "09:30", close: "18:30" },
    { day: "Thursday", short: "Th", open: "09:30", close: "18:30" },
    { day: "Friday", short: "Fr", open: "09:30", close: "18:30" },
    { day: "Saturday", short: "Sa", open: "09:30", close: "18:30" },
    { day: "Sunday", short: "Su", open: "09:30", close: "18:30" },
  ],

  social: [
    { label: "Instagram", href: "https://www.instagram.com/dreaamzarrow_homes" },
    { label: "YouTube", href: "https://youtube.com/@dreaamzarrowhomesinfraprivatel" },
    { label: "LinkedIn", href: "https://www.linkedin.com/company/dreaamzarrow-homes-pvt-ltd/" },
    { label: "Facebook", href: "https://www.facebook.com/share/1BWUhXuymH/" },
  ],

  /** Awaiting confirmation — rendered only when set. */
  reraRegistration: null as string | null,
  foundedYear: null as number | null,
} as const;

export function whatsappLink(message?: string) {
  const base = `https://wa.me/${site.whatsapp}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export const telLink = `tel:${site.phone.e164}`;
export const mailLink = `mailto:${site.email}`;

export const nav = [
  { label: "Properties", href: "/properties" },
  { label: "Services", href: "/services" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
] as const;
