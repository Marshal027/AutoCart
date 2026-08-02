import { useNavigate } from "react-router-dom";
import SpecularButton from "./SpecularButton.jsx";

export default function EmptyShopPage({ eyebrow, title, description }) {
  const navigate = useNavigate();

  return (
    <main className="shop-route-page route-empty-template">
      <span className="route-eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      <p>{description}</p>
      <SpecularButton size="md" type="button" className="route-secondary-btn" onClick={() => navigate("/shop")}>
        ← Back to shop
      </SpecularButton>
    </main>
  );
}
