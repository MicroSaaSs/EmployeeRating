import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { message, preparePrivateDraftRating } from "../utils/api";

export default function RatePrivateDraftButton({ id, name, directorySearch }: {
  id: string;
  name: string;
  directorySearch?: string;
}) {
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function openRating() {
    setPending(true);
    setError("");
    try {
      const recipient = await preparePrivateDraftRating(id);
      navigate("/professionals/" + recipient.id + "/rate", { state: { directorySearch } });
    } catch (failure) {
      setError(message(failure));
      setPending(false);
    }
  }

  return <div>
    <button className="pilot-button" type="button" disabled={pending} onClick={() => void openRating()}>
      {pending ? "Opening rating…" : "Rate " + name}
    </button>
    {error && <p className="mt-2 text-sm text-red-800" role="alert">{error}</p>}
  </div>;
}
