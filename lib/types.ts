export type NavItem = {
  name: string;
  link: string;
};

export type HeroContent = {
  eyebrow: string;
  headline: string;
  intro: string;
  cta: string;
};

export type GridItem = {
  id: number;
  title: string;
  description: string;
  className: string;
  imgClassName: string;
  titleClassName: string;
  img: string;
  spareImg: string;
};

export type Project = {
  id: number;
  title: string;
  des: string;
  img: string;
  iconLists: string[];
  link: string;
};

export type Testimonial = {
  quote: string;
  name: string;
  title: string;
};

export type Experience = {
  id: number;
  title: string;
  desc: string;
  className: string;
  thumbnail: string;
};

export type SocialLink = {
  id: number;
  img: string;
  link: string;
};

export type PortfolioContent = {
  navItems: NavItem[];
  heroContent: HeroContent;
  gridItems: GridItem[];
  projects: Project[];
  testimonials: Testimonial[];
  workExperience: Experience[];
  socialMedia: SocialLink[];
};
