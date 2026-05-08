import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import FormInput from '../components/FormInput';
import Button from '../components/Button';

export default function Landing() {
  const [code, setCode] = useState('');
  const [showTeam, setShowTeam] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [teamMembers, setTeamMembers] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const gameState = useGameStore(state => state.gameState);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!gameState) return;

    setIsLoading(true);
    setError('');

    // Simulation de délai pour UX
    await new Promise(resolve => setTimeout(resolve, 300));

    const teamId = Object.keys(gameState.teams).find(
      id => gameState.teams[id].code === code
    );

    if (teamId) {
      const team = gameState.teams[teamId];
      setTeamName(team.nom);
      setTeamMembers(team.membres);
      
      localStorage.setItem('teamId', teamId);
      
      localStorage.setItem(`team_${teamId}_progress`, JSON.stringify({
        etape: team.etapeCourante,
        score: team.score,
      }));

      setShowTeam(true);
      
      setTimeout(() => {
        navigate(`/team/${teamId}`);
      }, 3000);
    } else {
      setError('Code invalide');
      setCode('');
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        {!showTeam ? (
          <div className="space-y-6 sm:space-y-8">
            <div className="text-center">
              <h1 className="text-3xl sm:text-4xl font-bold text-purple-400 mb-2">Jeu de la soirée</h1>
              <p className="text-gray-400 text-sm sm:text-base">Entrez votre code d'équipe pour commencer</p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              <FormInput
                label="Code d'équipe"
                type="text"
                value={code}
                onChange={(v) => {
                  setCode(v.replace(/\D/g, '').slice(0, 4));
                  setError('');
                }}
                placeholder="XXXX"
                maxLength={4}
                pattern={/^\d{4}$/}
                validationMessage="Le code doit contenir exactement 4 chiffres"
                required
                disabled={isLoading}
                error={error}
              />
              
              <Button
                type="submit"
                isLoading={isLoading}
                disabled={code.length !== 4}
                fullWidth
              >
                Rejoindre l'équipe
              </Button>
            </form>

            <div className="text-center">
              <button
                onClick={() => navigate('/admin')}
                className="text-gray-600 text-xs hover:text-gray-500 transition-colors"
              >
                Admin
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-4 sm:space-y-6">
            <div className="animate-pulse">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-purple-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">{teamName}</h2>
            <div className="text-lg sm:text-xl text-purple-400">
              {teamMembers.join(' • ')}
            </div>
            <p className="text-gray-400 text-xs sm:text-sm">Chargement en cours...</p>
          </div>
        )}
      </div>
    </div>
  );
}
