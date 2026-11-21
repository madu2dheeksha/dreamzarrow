/**
 * Client testimonials as published on the previous website (home and About
 * pages). Wording is unchanged apart from removing stray quotation marks.
 * Only add new testimonials that the client has approved for publication.
 */
export type Testimonial = { name: string; quote: string; context: string };

export const testimonials: Testimonial[] = [
  {
    name: "Vijay Kumar",
    context: "Resale villa enquiry",
    quote:
      "Highly recommended for anyone looking at resale luxury properties in Hyderabad. They have solid connections with villa communities around Kokapet, Narsingi, and Kondapur. Felt like dealing with trusted advisors, not pushy agents.",
  },
  {
    name: "Sreekar Reddy",
    context: "Bought in Narsingi",
    quote:
      "I recently purchased a property in Narsingi through DreaamzArrow Homes, and the entire experience was smooth and professional. Their team was very responsive and guided me through every step from property visits to documentation. They understood my requirements and helped me find a flat within my budget in a prime location.",
  },
  {
    name: "Ram",
    context: "Leased out a property",
    quote:
      "Helped us find a tenant within days! I listed my property for lease and the team managed everything — photos, promotion, property visits — and found the right tenant in less than a week. Very impressed with their efficiency.",
  },
  {
    name: "Sarika",
    context: "Rented in Gachibowli",
    quote:
      "I recently rented a flat in Gachibowli through DreaamzArrow Homes, and the entire process was smooth and stress-free. The team was very professional, transparent, and responsive at every step—from shortlisting the right property to finalizing the agreement. They clearly understood my requirements and helped me find a flat that perfectly matched my budget and lifestyle.",
  },
  {
    name: "Madhavi",
    context: "Commercial investment",
    quote:
      "Dreaamz Arrow Homes has been a game-changer in expanding my commercial property portfolio. Their team possesses a keen eye for lucrative investment opportunities and provides comprehensive analyses to support decision-making. Their commitment doesn't end at the sale; they continue to offer insights and support, ensuring long-term investment success.",
  },
  {
    name: "Vinay Gupta",
    context: "Bought a 2 BHK in Kondapur",
    quote:
      "Just bought a new 2BHK in Kondapur through Dreaamzarrow Homes. Their expertise in Hyderabad real estate made the entire process smooth. Highly recommend them for anyone looking to buy a flat in Gachibowli or nearby areas. Trustworthy and professional!",
  },
  {
    name: "Ajay Thakur",
    context: "Rented a flat",
    quote:
      "We rented a flat through DreaamzArrow Homes and the process was super quick. No fake promises, no hidden charges, and the documentation was handled very neatly. The team is polite, responsive, and trustworthy.",
  },
  {
    name: "Praharsha",
    context: "Rented a flat",
    quote:
      "I recently rented a flat through DreaamzArrow Homes and had a very smooth experience. The team was professional, transparent, and supportive throughout the process. They clearly explained all details, arranged timely visits, and helped with documentation without any hassle. Really appreciate their quick responses and genuine approach.",
  },
  {
    name: "Vinay Guptha",
    context: "Bought a 3 BHK",
    quote:
      "DreaamzArrow Homes made the entire home-buying journey so smooth. I was searching for a 3BHK for almost two months, and their team understood exactly what we needed. They showed us the best options, handled every detail, and helped us finalize our dream home without any stress. Highly recommended!",
  },
];
