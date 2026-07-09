import PaletteButton from "./PaletteButton";
import ThemeToggle from "./ThemeToggle";

// Grouping for the top-right board controls: paint (palette) + light/dark.
export default function HeaderControls() {
  return (
    <div className="qr-controls">
      <PaletteButton />
      <ThemeToggle />
    </div>
  );
}
