import { Heart } from "lucide-react";
import { toggleFavorite } from "@/actions/engage";

export function FavoriteButton({ type, id, on, path }: { type: "professional" | "opdracht" | "dienst"; id: string; on: boolean; path: string }) {
  return (
    <form action={toggleFavorite}>
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="on" value={on ? "0" : "1"} />
      <input type="hidden" name="pad" value={path} />
      <button type="submit" className="btn-secondary" aria-pressed={on}>
        <Heart className={`h-4 w-4 ${on ? "fill-danger text-danger" : ""}`} aria-hidden />
        {on ? "Bewaard" : "Bewaren"}
      </button>
    </form>
  );
}
