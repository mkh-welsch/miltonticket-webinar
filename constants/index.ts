type TSidebarLinks = {
  label: string;
  route: string;
  imgUrl: string;
};

export const sidebarLinks: TSidebarLinks[] = [
  {
    label: "Übersicht",
    route: "/",
    imgUrl: "/icons/Home.svg",
  },

  {
    label: "Geplant",
    route: "/upcoming",
    imgUrl: "/icons/upcoming.svg",
  },
  {
    label: "Vergangen",
    route: "/previous",
    imgUrl: "/icons/previous.svg",
  },
  {
    label: "Aufzeichnungen",
    route: "/recordings",
    imgUrl: "/icons/Video.svg",
  },
  {
    label: "Sprechstunde",
    route: "/personal-room",
    imgUrl: "/icons/add-personal.svg",
  },
];

export const avatarImages: string[] = [
  "/images/avatar-1.jpeg",
  "/images/avatar-2.jpeg",
  "/images/avatar-3.png",
  "/images/avatar-4.png",
  "/images/avatar-5.png",
];
