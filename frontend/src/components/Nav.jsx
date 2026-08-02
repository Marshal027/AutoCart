import CardNav from "./CardNav.jsx";

export default function Nav({ children }) {
  return (
    <CardNav
      items={[]}
      baseColor="#f7f5ef"
      menuColor="#141414"
    >
      {children}
    </CardNav>
  );
}
