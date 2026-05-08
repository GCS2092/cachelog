import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import FormInput from '../components/FormInput';
import Button from '../components/Button';

export default function Finale() {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const gameState = useGameStore(state => state.gameState);
  const sendMessage = useGameStore(state => state.sendMessage);
  
  const [codeInput, setCodeInput] = useState('');
  const [error, setError] = useState('');

  const teamsOnFinale = Object.values(gameState?.teams || {}).filter(t => t.finished).length;
  const team = teamId ? gameState?.teams[teamId] : null;
  const fragments = team?.fragments || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!teamId || !gameState) return;

    if (codeInput === gameState.finale.code) {
      sendMessage({ type: 'FINALE_WIN', teamId });
    } else {
      setError('Code incorrect');
      setCodeInput('');
    }
  };

  if (gameState?.gagnant) {
    navigate('/results');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md text-center space-y-6 sm:space-y-8">
        <div>
          <h1 className="text-4xl sm:text-5xl font-bold text-purple-400 mb-2">🎉 FINALE 🎉</h1>
          <p className="text-gray-400 text-sm sm:text-base">Entrez le code final pour gagner !</p>
        </div>
        
        <div className="p-4 sm:p-6 bg-gray-800 rounded-lg border-2 border-purple-500">
          <p className="text-2xl sm:text-3xl mb-3 sm:mb-4">{gameState?.finale.indice}</p>
          <p className="text-xs sm:text-sm text-gray-400">Équipes sur la finale : {teamsOnFinale}</p>
        </div>

        {/* Affichage des fragments collectés */}
        {fragments.length > 0 && (
          <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
            <p className="text-sm text-gray-400 mb-2">🧩 Vos fragments collectés :</p>
            <div className="flex flex-wrap gap-2 justify-center mb-3">
              {fragments.map((frag, idx) => (
                <span key={idx} className="px-3 py-1 bg-purple-600 rounded text-sm font-mono">
                  {frag}
                </span>
              ))}
            </div>
            <p className="text-xs text-gray-500">Assemblez ces fragments pour trouver le code final</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <FormInput
            label="Code final"
            type="text"
            value={codeInput}
            onChange={(v) => {
              setCodeInput(v.replace(/\D/g, ''));
              setError('');
            }}
            placeholder="Code"
            error={error}
            required
          />
          
          <Button
            type="submit"
            variant="success"
            size="lg"
            fullWidth
            disabled={!codeInput}
          >
            Gagner !
          </Button>
        </form>
      </div>
    </div>
  );
}
