import CardNav from "./CardNav.jsx";

const navigationCards = [
  {
    label: "Explore",
    to: "/shop",
    ariaLabel: "Explore the AutoCart shop",
    bgColor: "#1b1722",
    textColor: "#fff",
  },
  {
    label: "Prava",
    to: "/prava",
    ariaLabel: "Open Prava payment settings",
    bgColor: "#2f293a",
    textColor: "#fff",
  },
  {
    label: "Home",
    to: "/",
    ariaLabel: "Return to the AutoCart home page",
    bgColor: "#e8dfd4",
    textColor: "#1b1722",
  },
];

export default function Nav({ children }) {
  return (
    <CardNav
      items={navigationCards}
      baseColor="#f7f5ef"
      menuColor="#141414"
    >
      {children}
    </CardNav>
  );
}
