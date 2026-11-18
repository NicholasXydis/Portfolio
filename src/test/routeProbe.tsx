import { useLocation, useNavigate } from "react-router";

export function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>;
}

export function HistoryButtons() {
  const navigate = useNavigate();
  return (
    <div>
      <button type="button" onClick={() => navigate(-1)}>
        test back
      </button>
      <button type="button" onClick={() => navigate(1)}>
        test forward
      </button>
      <button type="button" onClick={() => navigate("/en/lite")}>
        test to lite
      </button>
    </div>
  );
}
