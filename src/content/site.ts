/** Site-wide facts. Public by design (no secrets here). */
export const SITE = {
  url: "https://revazkuparadze.com/",
  owner: "Revaz Kuparadze",
  shortName: "Rez",
  jobTitle: "Founder and product lead",
  city: "New York",
  linkedin: "https://www.linkedin.com/in/rkuparadze/",
  booking: "https://calendar.app.google/oPBxK5waPKJncCMs9",
  ogImage: "og-image.png",
} as const;

export type PageMeta = { title: string; description: string };
export const PAGE_META: Record<"home" | "about" | "craft" | "notFound", PageMeta> = {
  home: {
    title: "Ideas to life · Revaz Kuparadze",
    description: "Revaz (Rez) Kuparadze turns ideas from 0 to 1: co-founder of eConsul, ePhoto.AI and greencard.ge, now building with AI in New York. Have an idea? Book a call.",
  },
  about: {
    title: "About · Revaz Kuparadze",
    description: "Rez Kuparadze’s path from PCmania and ABK to TBC Bank, eConsul and building with AI in New York, with the awards along the way.",
  },
  craft: {
    title: "Craft · Revaz Kuparadze",
    description: "Ads, print and strategy from Rez Kuparadze’s years at ABK: national TV campaigns and Cannes Young Lions Georgia work.",
  },
  notFound: {
    title: "Page not found · Revaz Kuparadze",
    description: "Revaz (Rez) Kuparadze turns ideas from 0 to 1: co-founder of eConsul, ePhoto.AI and greencard.ge, now building with AI in New York. Have an idea? Book a call.",
  },
};
