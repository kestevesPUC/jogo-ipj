interface Team {
  id: string;
  name: string;
  color: string;
  score: number;
}

export function Scoreboard({
  teams,
  onAdjust,
  activeTeamId,
}: {
  teams: Team[];
  onAdjust?: (teamId: string, delta: number) => void;
  activeTeamId?: string | null;
}) {
  return (
    <div className="scoreboard">
      {teams.map((team) => {
        const isActive = activeTeamId === team.id;
        return (
          <div key={team.id} className={`team-card${isActive ? " team-card-active" : ""}`}>
            <span className="team-card-stripe" style={{ background: team.color }} />
            <div className="team-card-name">{team.name}</div>
            <div className="team-card-score">{team.score}</div>
            {onAdjust && (
              <div className="team-card-controls">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ flex: 1 }}
                  onClick={() => onAdjust(team.id, 10)}
                  aria-label={`Somar 10 pontos para ${team.name}`}
                >
                  +10
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ flex: 1 }}
                  onClick={() => onAdjust(team.id, -10)}
                  aria-label={`Subtrair 10 pontos de ${team.name}`}
                >
                  -10
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
