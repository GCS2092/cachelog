import { useGameStore } from '../store/gameStore';
import Button from '../components/Button';

export default function Results() {
  const gameState = useGameStore(state => state.gameState);

  if (!gameState) {
    return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">Chargement...</div>;
  }

  const sortedTeams = Object.entries(gameState.teams).sort(([, a], [, b]) => b.score - a.score);
  const winner = gameState.gagnant ? gameState.teams[gameState.gagnant] : sortedTeams[0]?.[1];

  const fastestTeam = Object.entries(gameState.teams)
    .filter(([_, t]) => t.finishedAt)
    .sort(([, a], [, b]) => (a.finishedAt || 0) - (b.finishedAt || 0))[0];

  const totalTraps = Object.values(gameState.teams).reduce((sum, team) => {
    const teamSteps = gameState.etapes[Object.keys(gameState.teams).find(id => gameState.teams[id] === team) || ''] || {};
    const traps = Object.values(teamSteps).filter(step => step.type === 'piege').length;
    return sum + traps;
  }, 0);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-3 sm:p-4">
      <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
        <div className="text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-purple-400 mb-2">🏆 Résultats 🏆</h1>
          <p className="text-gray-400 text-sm sm:text-base">Félicitations à tous les participants !</p>
        </div>

        {winner && (
          <div className="p-6 sm:p-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl text-center border-4 border-yellow-400 shadow-2xl">
            <div className="text-5xl sm:text-6xl mb-3 sm:mb-4">🏆</div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-3 sm:mb-4">Gagnant</h2>
            <p className="text-4xl sm:text-5xl font-bold mb-2">{winner.nom}</p>
            <p className="text-2xl sm:text-3xl">{winner.score} points</p>
          </div>
        )}

        <div className="space-y-3 sm:space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold">Classement final</h2>
          <div className="space-y-2 sm:space-y-3">
            {sortedTeams.map(([teamId, team], index) => (
              <div
                key={teamId}
                className={`p-4 sm:p-6 rounded-xl flex justify-between items-center transition-all ${
                  index === 0 ? 'bg-yellow-500 text-gray-900' : 
                  index === 1 ? 'bg-gray-400 text-gray-900' : 
                  index === 2 ? 'bg-orange-500' : 
                  'bg-gray-800'
                }`}
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <span className="text-3xl sm:text-4xl font-bold">#{index + 1}</span>
                  <div>
                    <div className="font-semibold text-base sm:text-lg">{team.nom}</div>
                    <div className="text-xs sm:text-sm opacity-80">{team.membres.join(' • ')}</div>
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-bold">{team.score} pts</div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <div className="p-4 sm:p-6 bg-gray-800 rounded-xl text-center border border-gray-700">
            <div className="text-3xl sm:text-4xl mb-2 sm:mb-3">⚡</div>
            <h3 className="font-semibold mb-1 sm:mb-2 text-gray-300 text-sm sm:text-base">Plus rapide</h3>
            <p className="text-xl sm:text-2xl text-purple-400">{fastestTeam ? fastestTeam[1].nom : '-'}</p>
          </div>
          <div className="p-4 sm:p-6 bg-gray-800 rounded-xl text-center border border-gray-700">
            <div className="text-3xl sm:text-4xl mb-2 sm:mb-3">💣</div>
            <h3 className="font-semibold mb-1 sm:mb-2 text-gray-300 text-sm sm:text-base">Pièges déclenchés</h3>
            <p className="text-xl sm:text-2xl text-purple-400">{totalTraps}</p>
          </div>
          <div className="p-4 sm:p-6 bg-gray-800 rounded-xl text-center border border-gray-700">
            <div className="text-3xl sm:text-4xl mb-2 sm:mb-3">👥</div>
            <h3 className="font-semibold mb-1 sm:mb-2 text-gray-300 text-sm sm:text-base">Équipes</h3>
            <p className="text-xl sm:text-2xl text-purple-400">{Object.keys(gameState.teams).length}</p>
          </div>
        </div>

        <div className="text-center pt-6 sm:pt-8">
          <Button onClick={() => window.location.href = '/'} variant="secondary">
            Retour à l'accueil
          </Button>
        </div>
      </div>
    </div>
  );
}
