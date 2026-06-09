/** Phase 2 preview — lavender Hall UI using shared theme tokens */
export function ReadingHallTeaser() {
  const seats: Array<"empty" | "occupied" | "friend" | "mine"> = [
    "occupied",
    "empty",
    "occupied",
    "empty",
    "empty",
    "friend",
    "occupied",
    "empty",
    "occupied",
    "empty",
    "mine",
    "empty",
  ];

  return (
    <section className="hall-teaser" aria-labelledby="hall-heading">
      <div className="hall-teaser-inner">
        <div className="hall-teaser-copy">
          <span className="hall-badge">Reading Hall</span>
          <h2 id="hall-heading">Scriptorium</h2>
          <p>
            Claim a seat and read alongside others — presence without page leakage.
            The hall shares who is reading, never what is on the page.
          </p>
        </div>

        <div className="hall-teaser-actions">
          <div
            className="hall-seat-map"
            role="img"
            aria-label="Preview seat map with a few readers present"
          >
            {seats.map((state, i) => (
              <span
                key={i}
                className={[
                  "hall-seat",
                  state === "occupied" && "hall-seat--occupied",
                  state === "friend" && "hall-seat--friend",
                  state === "mine" && "hall-seat--mine",
                ]
                  .filter(Boolean)
                  .join(" ")}
              />
            ))}
          </div>
          <button type="button" className="btn-hall" disabled title="Coming in Phase 2">
            Enter hall
          </button>
          <span className="hall-teaser-meta">Phase 2 · WebSocket presence</span>
        </div>
      </div>
    </section>
  );
}
