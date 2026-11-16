import { getInstructions } from "./api";
import { useLoad } from "./usePolling";

export function InstructionsPage() {
  const { data: instructions, failed } = useLoad(getInstructions);

  return (
    <>
      <h1>The agent's instructions</h1>
      <p className="lead">
        The UnderCover Agent works every claim from these instructions. They are
        read only.
      </p>
      <section className="panel" aria-label="Instructions">
        {instructions ? (
          <div className="instructions">{instructions.text}</div>
        ) : (
          <p className="muted">
            {failed ? "The backend is not responding." : "Loading"}
          </p>
        )}
      </section>
    </>
  );
}
