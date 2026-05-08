import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import Button from '../components/Button';
import FormInput from '../components/FormInput';

export default function TeamView() {
  const navigate = useNavigate();
  const gameState = useGameStore(state => state.gameState);
  const sendMessage = useGameStore(state => state.sendMessage);
  const isConnected = useGameStore(state => state.isConnected);

  const [codeInput, setCodeInput] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'trap' | 'error'; message: string } | null>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [showGlobalMessage, setShowGlobalMessage] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [hintsUsed, setHintsUsed] = useState<number[]>([]); // Indices des étapes où on a utilisé un indice
  const [selectedZone, setSelectedZone] = useState<string | null>(null); // Pour mode non-linéaire

  // Mise à jour du temps local chaque seconde pour le timer
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const teamId = localStorage.getItem('teamId');
  const team = teamId && gameState ? gameState.teams[teamId] : null;

  if (!team) {
    navigate('/');
    return null;
  }

  const currentStep = team ? gameState?.etapes[teamId || '']?.[team.etapeCourante] : null;
  const totalSteps = team ? Object.keys(gameState?.etapes[teamId || ''] || {}).length : 0;

  useEffect(() => {
    if (gameState?.finaleUnlocked) {
      navigate(`/finale/${teamId}`);
    }
  }, [gameState?.finaleUnlocked, teamId, navigate]);

  useEffect(() => {
    if (gameState?.messageGlobal) {
      setShowGlobalMessage(true);
      const timer = setTimeout(() => setShowGlobalMessage(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [gameState?.messageGlobal]);

  // Envoyer message de connexion quand l'équipe se connecte
  useEffect(() => {
    if (isConnected && teamId) {
      sendMessage({ type: 'TEAM_CONNECT', teamId });
    }
    return () => {
      if (teamId) {
        sendMessage({ type: 'TEAM_DISCONNECT', teamId });
      }
    };
  }, [isConnected, teamId, sendMessage]);

  const handleValidate = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!teamId || !currentStep) return;

    setIsAnimating(true);

    sendMessage({
      type: 'VALIDATE_CODE',
      teamId,
      etape: team.etapeCourante,
      code: codeInput,
    });

    setCodeInput('');

    // Feedback local immédiat (sera confirmé par le serveur)
    if (codeInput === currentStep.code) {
      setFeedback({ type: 'success', message: `+${currentStep.points} points!` });
    } else if (currentStep.type === 'piege') {
      setFeedback({ type: 'trap', message: `-${currentStep.malus} points (piège!)` });
    } else {
      setFeedback({ type: 'error', message: 'Code incorrect' });
    }

    setTimeout(() => {
      setFeedback(null);
      setIsAnimating(false);
    }, 2000);
  };

  const handleHint = () => {
    if (!teamId || !currentStep || hintsUsed.includes(team.etapeCourante)) return;
    
    const hintPenalty = 5;
    const firstDigit = currentStep.code[0];
    
    // Envoyer au serveur pour appliquer la pénalité
    sendMessage({ type: 'USE_HINT', teamId, etape: team.etapeCourante });
    
    setHintsUsed([...hintsUsed, team.etapeCourante]);
    setFeedback({ 
      type: 'error', 
      message: `Indice utilisé (-${hintPenalty} pts): Le code commence par ${firstDigit}` 
    });
    
    setTimeout(() => setFeedback(null), 4000);
  };

  // Calcul du temps restant avec le temps local
  const timeRemaining = gameState?.timerStart && gameState?.duree
    ? Math.max(0, gameState.timerStart + gameState.duree * 1000 - currentTime)
    : 0;

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Couleur du timer selon le temps restant
  const timerColor = timeRemaining > 600000 ? 'text-green-500' : timeRemaining > 300000 ? 'text-orange-500' : 'text-red-500';

  // Calcul du classement
  const getRanking = () => {
    return Object.entries(gameState?.teams || {})
      .map(([id, team]) => ({ id, ...team }))
      .sort((a, b) => b.score - a.score)
      .map((team, index) => ({ ...team, rank: index + 1 }));
  };

  const ranking = getRanking();
  const currentRank = ranking.find(r => r.id === teamId)?.rank || 0;
  const totalTeams = ranking.length;

  const isRestrictedZone = currentStep?.zone === 'chambre_fille';

  // Mode non-linéaire : données des zones
  const isModeNonLineaire = gameState?.modeNonLineaire ?? false;
  const teamZones = teamId ? gameState?.zones?.[teamId] : {};
  const zoneStates = gameState?.zoneStates || {};

  const getZoneIcon = (zone: string) => {
    const icons: Record<string, string> = {
      salon: '🛋️',
      cuisine: '🍳',
      chambre_garcon: '👦',
      chambre_fille: '👧',
      douche: '🚿',
      etage2: '🏢',
      etage3: '🏢',
      terrasse: '🌿',
    };
    return icons[zone] || '🏠';
  };

  const getZoneStatus = (zone: string) => {
    const zoneData = teamZones?.[zone];
    const zoneState = zoneStates?.[zone];
    
    if (zoneState?.locked) return 'locked';
    if (zoneState?.lockedByTeam && zoneState.lockedByTeam !== teamId) return 'occupied';
    if (zoneState?.abandonedByTeams?.includes(teamId)) return 'abandoned';
    if (zoneData?.completed) return 'completed';
    if (selectedZone === zone) return 'selected';
    if (zoneData && zoneData.steps.length > 0) return 'available';
    return 'empty';
  };

  const handleAbandonZone = () => {
    if (!teamId || !selectedZone) return;

    if (confirm('Êtes-vous sûr de vouloir abandonner cette zone ? Vous perdrez 10 points et ne pourrez plus revenir.')) {
      sendMessage({ type: 'ABANDON_ZONE', teamId, zone: selectedZone });
      setSelectedZone(null);
    }
  };

  const handleZoneSelect = (zone: string) => {
    if (isModeNonLineaire) {
      setSelectedZone(zone);
      sendMessage({ type: 'SELECT_ZONE', teamId: teamId!, zone });
    }
  };

  const handleZoneValidate = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!teamId || !selectedZone) return;

    setIsAnimating(true);

    sendMessage({
      type: 'VALIDATE_ZONE_CODE',
      teamId,
      zone: selectedZone,
      code: codeInput,
    });

    setCodeInput('');

    const zoneData = teamZones?.[selectedZone];
    const step = zoneData?.steps[zoneData?.currentStepIndex || 0];

    if (codeInput === step?.code) {
      setFeedback({ type: 'success', message: `+${step.points} points!` });
    } else if (step?.type === 'piege') {
      setFeedback({ type: 'trap', message: `-${step.malus} points (piège!)` });
    } else {
      setFeedback({ type: 'error', message: 'Code incorrect' });
    }

    setTimeout(() => {
      setFeedback(null);
      setIsAnimating(false);
    }, 2000);
  };

  if (!team) {
    return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">Chargement...</div>;
  }

  if (!currentStep) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <h2 className="text-2xl font-bold mb-4">{team.nom}</h2>
          <p className="text-gray-400 mb-4">Aucune étape n'a été configurée pour cette équipe.</p>
          <p className="text-gray-400">L'administrateur doit configurer les étapes depuis le dashboard.</p>
        </div>

        {/* Message global overlay */}
        {showGlobalMessage && gameState?.messageGlobal && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-8 rounded-lg text-center max-w-md">
              <p className="text-2xl text-white">{gameState.messageGlobal}</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <header className="p-3 sm:p-4 flex justify-between items-center border-b border-gray-700">
        <div className="flex items-center gap-2">
          <div className={`w-2 sm:w-3 h-2 sm:h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className={`text-xl sm:text-2xl font-mono ${timerColor}`}>
            {formatTime(timeRemaining)}
          </span>
        </div>
        <div className="text-right">
          <div className="font-semibold text-sm sm:text-base">{team.nom}</div>
          <div className="text-purple-400 text-xs sm:text-sm">{team.score} points</div>
          <div className="text-xs text-gray-400">
            🏆 {currentRank}/{totalTeams}
          </div>
        </div>
      </header>

      {/* Corps */}
      <main className="flex-1 flex flex-col items-center justify-center p-3 sm:p-4">
        <div className="w-full max-w-md">
          
          {/* Mode non-linéaire : carte des zones */}
          {isModeNonLineaire ? (
            <div className="space-y-4 sm:space-y-6">
              <div className="text-center">
                <h2 className="text-2xl sm:text-3xl font-bold mb-2 sm:mb-4">Choisissez une zone</h2>
                <p className="text-gray-400 text-sm">Explorez les zones dans n'importe quel ordre</p>
              </div>

              {/* Carte des zones */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {['salon', 'cuisine', 'chambre_garcon', 'chambre_fille', 'douche', 'etage2', 'etage3', 'terrasse'].map(zone => {
                  const status = getZoneStatus(zone);
                  const zoneData = teamZones?.[zone];
                  const currentStepIndex = zoneData?.currentStepIndex || 0;
                  const totalZoneSteps = zoneData?.steps.length || 0;

                  return (
                    <div
                      key={zone}
                      onClick={() => status === 'available' && handleZoneSelect(zone)}
                      className={`relative p-4 sm:p-5 rounded-2xl border-2 transition-all transform hover:scale-105 cursor-pointer ${
                        status === 'locked'
                          ? 'bg-gray-800 border-gray-700 opacity-50 cursor-not-allowed'
                        : status === 'occupied'
                          ? 'bg-orange-900 border-orange-700 opacity-70 cursor-not-allowed'
                        : status === 'abandoned'
                          ? 'bg-red-900 border-red-700 opacity-50 cursor-not-allowed'
                        : status === 'completed'
                          ? 'bg-green-900 border-green-700 shadow-lg shadow-green-900/50'
                        : status === 'selected'
                          ? 'bg-purple-600 border-purple-400 shadow-lg shadow-purple-900/50 scale-105'
                        : status === 'available'
                          ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-600 hover:border-purple-400 shadow-lg'
                        : 'bg-gray-900 border-gray-800 cursor-not-allowed'
                      }`}
                    >
                      {/* Icône de la zone */}
                      <div className="text-4xl sm:text-5xl mb-2 text-center transform hover:scale-110 transition-transform">
                        {getZoneIcon(zone)}
                      </div>
                      
                      {/* Nom de la zone */}
                      <div className="text-sm sm:text-base font-semibold capitalize text-center mb-2">
                        {zone.replace('_', ' ')}
                      </div>

                      {/* Indicateurs d'état */}
                      <div className="space-y-1">
                        {status === 'locked' && (
                          <div className="flex items-center justify-center gap-1 text-xs text-red-400">
                            🔒 Bloquée
                          </div>
                        )}
                        {status === 'occupied' && (
                          <div className="flex items-center justify-center gap-1 text-xs text-orange-400">
                            🚫 Occupée
                          </div>
                        )}
                        {status === 'abandoned' && (
                          <div className="flex items-center justify-center gap-1 text-xs text-red-400">
                            ❌ Abandonnée
                          </div>
                        )}
                        {status === 'completed' && (
                          <div className="flex items-center justify-center gap-1 text-xs text-green-400">
                            ✓ Terminée
                          </div>
                        )}
                        {status === 'selected' && (
                          <div className="flex items-center justify-center gap-1 text-xs text-white">
                            🎯 En cours
                          </div>
                        )}
                        {status === 'available' && (
                          <div className="flex items-center justify-center gap-1 text-xs text-purple-300">
                            📍 {currentStepIndex}/{totalZoneSteps}
                          </div>
                        )}
                      </div>

                      {/* Barre de progression */}
                      {status === 'available' || status === 'selected' ? (
                        <div className="mt-2 w-full bg-gray-700 rounded-full h-1.5">
                          <div
                            className="bg-purple-500 h-1.5 rounded-full transition-all"
                            style={{ width: `${(currentStepIndex / totalZoneSteps) * 100}%` }}
                          />
                        </div>
                      ) : status === 'completed' ? (
                        <div className="mt-2 w-full bg-green-700 rounded-full h-1.5">
                          <div className="bg-green-500 h-1.5 rounded-full w-full" />
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              {/* Question de la zone sélectionnée */}
              {selectedZone && teamZones?.[selectedZone] && (
                <div className="mt-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold text-lg capitalize">{selectedZone}</h3>
                    <button
                      onClick={handleAbandonZone}
                      className="text-red-400 hover:text-red-300 text-sm"
                    >
                      Abandonner (-10 pts)
                    </button>
                  </div>
                  
                  {selectedZone === 'chambre_fille' ? (
                    <div className="p-3 bg-pink-900 border border-pink-500 rounded-lg mb-4">
                      <p className="text-pink-200 text-sm mb-1">🔒 Zone réservée aux filles</p>
                      <p className="text-pink-300 text-xs">Envoyez une fille chercher l'indice.</p>
                    </div>
                  ) : (
                    <p className="text-purple-300 mb-4">
                      {teamZones[selectedZone].steps[teamZones[selectedZone].currentStepIndex]?.indice}
                    </p>
                  )}

                  <form onSubmit={handleZoneValidate} className="space-y-3">
                    <FormInput
                      label="Code"
                      type="text"
                      value={codeInput}
                      onChange={(v) => {
                        setCodeInput(v.replace(/\D/g, '').slice(0, 2));
                        setFeedback(null);
                      }}
                      placeholder="XX"
                      maxLength={2}
                      pattern={/^\d{2}$/}
                      validationMessage="Le code doit contenir exactement 2 chiffres"
                      required
                      disabled={isAnimating}
                    />
                    <Button
                      type="submit"
                      fullWidth
                      disabled={codeInput.length !== 2 || isAnimating}
                      isLoading={isAnimating}
                    >
                      Valider
                    </Button>
                  </form>

                  {feedback && (
                    <div className={`mt-3 p-3 rounded-lg text-center text-sm ${
                      feedback.type === 'success' ? 'bg-green-600' :
                      feedback.type === 'trap' ? 'bg-red-600' : 'bg-yellow-600'
                    }`}>
                      {feedback.message}
                    </div>
                  )}
                </div>
              )}

              {/* Affichage des fragments collectés */}
              {team.fragments && team.fragments.length > 0 && (
                <div className="p-3 bg-gray-800 rounded-lg border border-gray-700">
                  <p className="text-sm text-gray-400 mb-2">🧩 Fragments collectés :</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {team.fragments.map((frag, idx) => (
                      <span key={idx} className="px-3 py-1 bg-purple-600 rounded text-sm font-mono">
                        {frag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Mode linéaire classique */
            <div className="text-center mb-6 sm:mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold mb-2 sm:mb-4">Étape {team.etapeCourante + 1}/{totalSteps}</h2>
              {isRestrictedZone ? (
                <div className="p-4 bg-pink-900 border border-pink-500 rounded-lg mb-6 sm:mb-8">
                  <p className="text-pink-200 text-lg mb-2">🔒 Zone réservée aux filles</p>
                  <p className="text-pink-300 text-sm">Envoyez une fille de votre équipe chercher l'indice dans la chambre des filles.</p>
                </div>
              ) : (
                <p className="text-xl sm:text-2xl text-purple-300 mb-6 sm:mb-8">{currentStep.indice}</p>
              )}
              
              {/* Affichage des fragments collectés */}
              {team.fragments && team.fragments.length > 0 && (
                <div className="mt-4 p-3 bg-gray-800 rounded-lg border border-gray-700">
                  <p className="text-sm text-gray-400 mb-2">🧩 Fragments collectés :</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {team.fragments.map((frag, idx) => (
                      <span key={idx} className="px-3 py-1 bg-purple-600 rounded text-sm font-mono">
                        {frag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Formulaire de validation (mode linéaire) */}
          {!isModeNonLineaire && (
            <form onSubmit={handleValidate} className="space-y-4 sm:space-y-6">
              <FormInput
                label="Code"
                type="text"
                value={codeInput}
                onChange={(v) => {
                  setCodeInput(v.replace(/\D/g, '').slice(0, 2));
                  setFeedback(null);
                }}
                placeholder="XX"
                maxLength={2}
                pattern={/^\d{2}$/}
                validationMessage="Le code doit contenir exactement 2 chiffres"
                required
                disabled={isAnimating}
              />
              
              <Button
                type="submit"
                fullWidth
                disabled={codeInput.length !== 2 || isAnimating}
                isLoading={isAnimating}
              >
                Valider
              </Button>

              <Button
                type="button"
                variant="secondary"
                fullWidth
                size="sm"
                onClick={handleHint}
                disabled={hintsUsed.includes(team.etapeCourante) || isAnimating}
              >
                💡 Obtenir un indice (-5 pts)
              </Button>
            </form>
          )}

          {/* Feedback */}
          {feedback && (
            <div className={`mt-4 p-3 sm:p-4 rounded-lg text-center text-sm sm:text-base ${
              feedback.type === 'success' ? 'bg-green-600' :
              feedback.type === 'trap' ? 'bg-red-600' : 'bg-yellow-600'
            }`}>
              {feedback.message}
            </div>
          )}
        </div>
      </main>

      {/* Bas de page */}
      {!isModeNonLineaire && (
        <footer className="p-4 border-t border-gray-700">
          <div className="max-w-md mx-auto">
            <div className="flex justify-between text-sm text-gray-400 mb-2">
              <span>Étape {team.etapeCourante + 1}</span>
              <span>{totalSteps} étapes</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-purple-600 h-2 rounded-full transition-all"
                style={{ width: `${((team.etapeCourante + 1) / totalSteps) * 100}%` }}
              />
            </div>
          </div>
        </footer>
      )}

      {/* Message global overlay */}
      {showGlobalMessage && gameState?.messageGlobal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-8 rounded-lg text-center max-w-md">
            <p className="text-2xl text-white">{gameState.messageGlobal}</p>
          </div>
        </div>
      )}
    </div>
  );
}
