import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store/gameStore';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import Button from '../../components/Button';
import FormInput from '../../components/FormInput';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const gameState = useGameStore(state => state.gameState);
  const sendMessage = useGameStore(state => state.sendMessage);
  const { logout } = useAdminAuth();
  
  const [messageInput, setMessageInput] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'en_cours' | 'fini' | 'termine'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [showActionMenu, setShowActionMenu] = useState<string | null>(null);
  const [eventMessage, setEventMessage] = useState('');
  const [showEventPanel, setShowEventPanel] = useState(false);
  const isConnected = useGameStore(state => state.isConnected);
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Mise à jour du temps local chaque seconde pour le timer
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const getZoneLabel = (zone?: string) => {
    switch (zone) {
      case 'salon': return '🛋️ Salon';
      case 'cuisine': return '🍳 Cuisine';
      case 'chambre_garcon': return '👦 Chambre garçon';
      case 'chambre_fille': return '👧 Chambre fille';
      case 'douche': return '🚿 Douche';
      case 'etage2': return '🏢 2ème étage';
      case 'etage3': return '🏢 3ème étage';
      case 'terrasse': return '🌿 Terrasse';
      default: return '🏠 Salon';
    }
  };

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

  const sendEvent = () => {
    if (eventMessage.trim()) {
      sendMessage({ type: 'SEND_MESSAGE', text: `⚡ ÉVÉNEMENT: ${eventMessage}` });
      setEventMessage('');
      setShowEventPanel(false);
    }
  };

  const handleZoneAction = (zone: string, action: 'lock_zone' | 'unlock_zone' | 'activate_trap' | 'deactivate_trap', duration?: number) => {
    sendMessage({ type: 'ZONE_ACTION', action, zone, duration });
  };

  const timerRunning = gameState?.status === 'running';

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

  const startTimer = () => {
    if (!gameState) return;
    sendMessage({
      type: 'INIT_STATE',
      gameState: { ...gameState, status: 'running', timerStart: Date.now() },
    });
  };

  const pauseTimer = () => {
    if (!gameState) return;
    const elapsed = Date.now() - gameState.timerStart;
    sendMessage({
      type: 'INIT_STATE',
      gameState: { ...gameState, status: 'waiting', timerStart: Date.now() - elapsed },
    });
  };

  const resetTimer = () => {
    if (!gameState) return;
    sendMessage({
      type: 'INIT_STATE',
      gameState: { ...gameState, status: 'waiting', timerStart: 0 },
    });
  };

  const unlockFinale = () => {
    sendMessage({ type: 'UNLOCK_FINALE' });
  };

  const sendGlobalMessage = () => {
    if (messageInput.trim()) {
      sendMessage({ type: 'SEND_MESSAGE', text: messageInput });
      setMessageInput('');
    }
  };

  const handleTeamAction = (teamId: string, action: 'skip_step' | 'add_points' | 'remove_points' | 'reset_team', value?: number) => {
    if (action === 'reset_team') {
      if (confirm('Réinitialiser cette équipe ?')) {
        sendMessage({ type: 'ADMIN_ACTION', action: 'reset_team', teamId });
      }
    } else {
      sendMessage({ type: 'ADMIN_ACTION', action, teamId, value });
    }
  };

  const exportState = () => {
    const blob = new Blob([JSON.stringify(gameState, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `game-state-${Date.now()}.json`;
    a.click();
  };

  const resetGame = () => {
    if (confirm('Réinitialiser complètement le jeu ?')) {
      sendMessage({
        type: 'INIT_STATE',
        gameState: {
          status: 'waiting',
          timerStart: 0,
          duree: 3600,
          finaleUnlocked: false,
          messageGlobal: '',
          gagnant: null,
          modeNonLineaire: false,
          teams: {},
          etapes: {},
          zones: {},
          zoneStates: {
            salon: { locked: false, trapActive: false },
            cuisine: { locked: false, trapActive: false },
            chambre_garcon: { locked: false, trapActive: false },
            chambre_fille: { locked: false, trapActive: false },
            douche: { locked: false, trapActive: false },
            etage2: { locked: false, trapActive: false },
            etage3: { locked: false, trapActive: false },
            terrasse: { locked: false, trapActive: false },
          },
          finale: { indice: '', code: '' },
          connectedTeams: {},
        },
      });
    }
  };

  if (!gameState) {
    return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">Chargement...</div>;
  }

  // Filtrer et trier les équipes
  const filteredTeams = Object.entries(gameState.teams)
    .filter(([_, team]) => {
      if (filterStatus === 'all') return true;
      const totalSteps = Object.keys(gameState.etapes[_] || {}).length;
      if (filterStatus === 'en_cours') return !team.finished && team.etapeCourante < totalSteps;
      if (filterStatus === 'fini') return team.etapeCourante >= totalSteps && totalSteps > 0;
      if (filterStatus === 'termine') return team.finished;
      return true;
    })
    .filter(([_, team]) => {
      if (!searchQuery) return true;
      return team.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
             team.membres.some(m => m.toLowerCase().includes(searchQuery.toLowerCase()));
    })
    .sort(([, a], [, b]) => b.score - a.score);

  const sortedTeams = Object.entries(gameState.teams).sort(([, a], [, b]) => b.score - a.score);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-3 sm:p-4">
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
        {/* Header avec timer */}
        <div className="p-3 sm:p-4 bg-gray-800 rounded-lg">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 sm:mb-4 gap-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className={`w-2 sm:w-3 h-2 sm:h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <h1 className="text-xl sm:text-2xl font-bold">Dashboard Admin</h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={logout} variant="secondary" size="sm">
                Déconnexion
              </Button>
              <Button onClick={() => setShowEventPanel(!showEventPanel)} variant="secondary" size="sm">
                ⚡ Événements
              </Button>
              <Button onClick={exportState} variant="secondary" size="sm">
                Exporter
              </Button>
              <Button onClick={resetGame} variant="danger" size="sm">
                Reset jeu
              </Button>
              <Button onClick={() => navigate('/admin/setup')} variant="primary" size="sm">
                Setup
              </Button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-3xl sm:text-4xl font-mono">{formatTime(timeRemaining)}</div>
            <div className="flex gap-2 flex-wrap justify-center">
              {!timerRunning ? (
                <Button onClick={startTimer} variant="success" size="sm">
                  Start
                </Button>
              ) : (
                <Button onClick={pauseTimer} variant="warning" size="sm">
                  Pause
                </Button>
              )}
              <Button onClick={resetTimer} variant="secondary" size="sm">
                Reset
              </Button>
              <Button onClick={unlockFinale} variant="danger" size="sm">
                Finale
              </Button>
            </div>
          </div>
        </div>

        {/* Panneau d'événements */}
        {showEventPanel && (
          <div className="p-4 bg-yellow-900 border border-yellow-500 rounded-lg">
            <h3 className="font-semibold mb-3">⚡ Envoyer un événement dynamique</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={eventMessage}
                onChange={(e) => setEventMessage(e.target.value)}
                placeholder="Ex: Zone bloquée : cuisine inaccessible 3 min"
                className="flex-1 px-3 py-2 bg-gray-800 rounded border border-gray-700 focus:border-purple-500 focus:outline-none"
              />
              <Button onClick={sendEvent} variant="primary" size="sm">
                Envoyer
              </Button>
            </div>
            <div className="mt-2 text-xs text-gray-400">
              Exemples: "Zone bloquée : cuisine inaccessible", "Piège activé dans une zone", "Mode urgence : indices coûtent 10 pts"
            </div>
          </div>
        )}

        {/* Panneau de contrôle des zones (mode non-linéaire) */}
        {gameState.modeNonLineaire && (
          <div className="p-4 bg-purple-900 border border-purple-500 rounded-lg">
            <h3 className="font-semibold mb-3">🏠 Contrôle des zones</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {['salon', 'cuisine', 'chambre_garcon', 'chambre_fille', 'douche', 'etage2', 'etage3', 'terrasse'].map(zone => {
                const zoneState = gameState.zoneStates?.[zone];
                const isLocked = zoneState?.locked;
                const isTrapActive = zoneState?.trapActive;

                return (
                  <div key={zone} className="p-2 bg-gray-800 rounded">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{getZoneIcon(zone)}</span>
                      <span className="text-xs font-semibold capitalize">{zone}</span>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        onClick={() => handleZoneAction(zone, isLocked ? 'unlock_zone' : 'lock_zone', isLocked ? undefined : 180)}
                        variant={isLocked ? 'success' : 'warning'}
                        size="sm"
                        className="text-xs px-2 py-1"
                      >
                        {isLocked ? '🔓' : '🔒'}
                      </Button>
                      <Button
                        onClick={() => handleZoneAction(zone, isTrapActive ? 'deactivate_trap' : 'activate_trap')}
                        variant={isTrapActive ? 'success' : 'danger'}
                        size="sm"
                        className="text-xs px-2 py-1"
                      >
                        {isTrapActive ? '💣' : '🚫'}
                      </Button>
                    </div>
                    <div className="mt-1 text-xs text-gray-400">
                      {isLocked ? 'Bloquée' : isTrapActive ? 'Piège actif' : 'Disponible'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Filtres et recherche */}
        <div className="flex flex-col md:flex-row gap-3 sm:gap-4">
          <div className="flex-1">
            <FormInput
              label="Rechercher une équipe"
              type="text"
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Nom ou membres..."
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm text-gray-300 mb-2">Statut</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="w-full px-3 sm:px-4 py-2 bg-gray-800 rounded-lg border border-gray-700 focus:border-purple-500 focus:outline-none text-sm"
            >
              <option value="all">Tous</option>
              <option value="en_cours">En cours</option>
              <option value="fini">Fini</option>
              <option value="termine">Terminé</option>
            </select>
          </div>
          <Button
            onClick={() => setViewMode(viewMode === 'cards' ? 'table' : 'cards')}
            variant="secondary"
            size="sm"
          >
            {viewMode === 'cards' ? '📊 Tableau' : '🎴 Cartes'}
          </Button>
        </div>

        {/* Classement compact */}
        <div className="p-3 sm:p-4 bg-gray-800 rounded-lg">
          <h3 className="font-semibold mb-3 sm:mb-4">🏆 Classement</h3>
          <div className="space-y-2">
            {sortedTeams.slice(0, 3).map(([teamId, team], index) => (
              <div
                key={teamId}
                className={`flex justify-between items-center p-2 rounded ${
                  index === 0 ? 'bg-yellow-600' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-600' : 'bg-gray-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg sm:text-xl font-bold">#{index + 1}</span>
                  <span className="font-semibold text-sm sm:text-base">{team.nom}</span>
                </div>
                <span className="font-bold text-sm sm:text-base">{team.score} pts</span>
              </div>
            ))}
          </div>
        </div>

        {/* Métriques */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-3 sm:p-4 bg-gray-800 rounded-lg text-center">
            <div className="text-xl sm:text-2xl font-bold text-purple-400">{Object.keys(gameState.teams).length}</div>
            <div className="text-xs sm:text-sm text-gray-400">Équipes</div>
          </div>
          <div className="p-3 sm:p-4 bg-gray-800 rounded-lg text-center">
            <div className="text-xl sm:text-2xl font-bold text-green-400">
              {Object.values(gameState.teams).filter(t => t.finished).length}
            </div>
            <div className="text-xs sm:text-sm text-gray-400">Terminées</div>
          </div>
          <div className="p-3 sm:p-4 bg-gray-800 rounded-lg text-center">
            <div className="text-xl sm:text-2xl font-bold text-blue-400">
              {Object.values(gameState.teams).filter(t => !t.finished).length}
            </div>
            <div className="text-xs sm:text-sm text-gray-400">En cours</div>
          </div>
          <div className="p-3 sm:p-4 bg-gray-800 rounded-lg text-center">
            <div className="text-xl sm:text-2xl font-bold text-yellow-400">
              {Object.values(gameState.teams).reduce((sum, t) => sum + t.score, 0)}
            </div>
            <div className="text-xs sm:text-sm text-gray-400">Total points</div>
          </div>
        </div>

        {/* Vue équipes */}
        {viewMode === 'cards' ? (
          <div className="grid gap-3 sm:gap-4 mb-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {filteredTeams.map(([teamId, team]) => {
              const totalSteps = Object.keys(gameState.etapes[teamId] || {}).length;
              const currentStep = gameState.etapes[teamId]?.[team.etapeCourante];
              const teamStatus = team.finished ? 'Terminé' : team.etapeCourante >= totalSteps && totalSteps > 0 ? 'Fini' : 'En cours';
              return (
                <div key={teamId} className="p-3 sm:p-4 bg-gray-800 rounded-lg relative">
                  <div className="flex justify-between items-start mb-2 sm:mb-3">
                    <div className="flex items-start gap-2">
                      <div className={`w-2 sm:w-3 h-2 sm:h-3 rounded-full mt-1 sm:mt-2 ${gameState.connectedTeams?.[teamId] ? 'bg-green-500' : 'bg-red-500'}`} />
                      <div>
                        <h3 className="font-semibold text-base sm:text-lg">{team.nom}</h3>
                        <p className="text-xs sm:text-sm text-gray-400">{team.membres.join(', ')}</p>
                        <p className="text-xs sm:text-sm text-purple-400 mt-1">Code: {team.code}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-purple-400 font-bold text-xl sm:text-2xl">{team.score} pts</div>
                      <span className={`inline-block mt-1 px-2 py-1 text-xs rounded ${
                        teamStatus === 'Terminé' ? 'bg-green-600' : teamStatus === 'Fini' ? 'bg-blue-600' : 'bg-yellow-600'
                      }`}>
                        {teamStatus}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs sm:text-sm text-gray-400 mb-2 sm:mb-3">
                    Étape {team.etapeCourante + 1}/{totalSteps}
                    {currentStep && (
                      <span className="ml-2 text-purple-300">{getZoneLabel(currentStep.zone)}</span>
                    )}
                  </div>

                  {currentStep && (
                    <div className="mb-2 sm:mb-3 p-2 bg-gray-700 rounded text-xs sm:text-sm">
                      <p className="text-gray-400 mb-1">Indice:</p>
                      <p>{currentStep.indice}</p>
                    </div>
                  )}

                  {/* Fragments collectés */}
                  {team.fragments && team.fragments.length > 0 && (
                    <div className="mb-2 sm:mb-3 p-2 bg-gray-700 rounded text-xs">
                      <p className="text-gray-400 mb-1">🧩 Fragments ({team.fragments.length}):</p>
                      <div className="flex flex-wrap gap-1">
                        {team.fragments.map((frag, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-purple-600 rounded font-mono text-xs">
                            {frag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Progression par zone (mode non-linéaire) */}
                  {gameState.modeNonLineaire && gameState.zones[teamId] && (
                    <div className="mb-2 sm:mb-3 p-2 bg-gray-700 rounded text-xs">
                      <p className="text-gray-400 mb-2">🏠 Progression par zone:</p>
                      <div className="grid grid-cols-2 gap-1">
                        {['salon', 'cuisine', 'chambre_garcon', 'chambre_fille', 'douche', 'etage2', 'etage3', 'terrasse'].map(zone => {
                          const zoneData = gameState.zones[teamId]?.[zone];
                          const zoneState = gameState.zoneStates?.[zone];
                          const isLocked = zoneState?.locked;
                          const isCompleted = zoneData?.completed;
                          const currentStep = zoneData?.currentStepIndex || 0;
                          const totalSteps = zoneData?.steps.length || 0;

                          return (
                            <div
                              key={zone}
                              className={`flex items-center gap-1 p-1 rounded ${
                                isLocked ? 'bg-red-900 opacity-50' :
                                isCompleted ? 'bg-green-900' :
                                'bg-gray-800'
                              }`}
                            >
                              <span>{getZoneIcon(zone)}</span>
                              <span className="truncate">
                                {isLocked ? '🔒' : isCompleted ? '✓' : `${currentStep}/${totalSteps}`}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex gap-1 sm:gap-2 flex-wrap relative">
                    <Button onClick={() => handleTeamAction(teamId, 'skip_step')} variant="primary" size="sm">
                      Skip
                    </Button>
                    <Button onClick={() => handleTeamAction(teamId, 'add_points', 10)} variant="success" size="sm">
                      +10
                    </Button>
                    <Button
                      onClick={() => setShowActionMenu(showActionMenu === teamId ? null : teamId)}
                      variant="secondary"
                      size="sm"
                    >
                      ⋮
                    </Button>
                    {showActionMenu === teamId && (
                      <div className="absolute top-full right-0 mt-1 bg-gray-700 rounded-lg shadow-lg z-10 flex flex-col gap-1 p-1">
                        <Button
                          onClick={() => { handleTeamAction(teamId, 'remove_points', 10); setShowActionMenu(null); }}
                          variant="danger"
                          size="sm"
                        >
                          -10 pts
                        </Button>
                        <Button
                          onClick={() => { handleTeamAction(teamId, 'reset_team'); setShowActionMenu(null); }}
                          variant="warning"
                          size="sm"
                        >
                          Reset équipe
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mb-6 p-3 sm:p-4 bg-gray-800 rounded-lg overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left p-2">#</th>
                  <th className="text-left p-2">Équipe</th>
                  <th className="text-left p-2 hidden sm:table-cell">Membres</th>
                  <th className="text-left p-2">Code</th>
                  <th className="text-left p-2">Score</th>
                  <th className="text-left p-2">Étape</th>
                  <th className="text-left p-2">Statut</th>
                  <th className="text-left p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTeams.map(([teamId, team], index) => {
                  const totalSteps = Object.keys(gameState.etapes[teamId] || {}).length;
                  const teamStatus = team.finished ? 'Terminé' : team.etapeCourante >= totalSteps && totalSteps > 0 ? 'Fini' : 'En cours';
                  return (
                    <tr key={teamId} className="border-b border-gray-700">
                      <td className="p-2">{index + 1}</td>
                      <td className="p-2 font-semibold flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${gameState.connectedTeams?.[teamId] ? 'bg-green-500' : 'bg-red-500'}`} />
                        {team.nom}
                      </td>
                      <td className="p-2 hidden sm:table-cell">{team.membres.join(', ')}</td>
                      <td className="p-2">{team.code}</td>
                      <td className="p-2 font-bold text-purple-400">{team.score}</td>
                      <td className="p-2">{team.etapeCourante + 1}/{totalSteps}</td>
                      <td className="p-2">
                        <span className={`px-2 py-1 text-xs rounded ${
                          teamStatus === 'Terminé' ? 'bg-green-600' : teamStatus === 'Fini' ? 'bg-blue-600' : 'bg-yellow-600'
                        }`}>
                          {teamStatus}
                        </span>
                      </td>
                      <td className="p-2">
                        <div className="flex gap-1">
                          <Button onClick={() => handleTeamAction(teamId, 'skip_step')} variant="primary" size="sm">Skip</Button>
                          <Button onClick={() => handleTeamAction(teamId, 'add_points', 10)} variant="success" size="sm">+10</Button>
                          <Button onClick={() => handleTeamAction(teamId, 'reset_team')} variant="warning" size="sm">Reset</Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Message global */}
        <div className="p-4 sm:p-6 bg-gray-800 rounded-xl border border-gray-700">
          <h3 className="font-semibold mb-3 sm:mb-4">Message global</h3>
          <div className="flex gap-3 sm:gap-4 flex-col sm:flex-row">
            <div className="flex-1">
              <FormInput
                label="Message"
                type="text"
                value={messageInput}
                onChange={setMessageInput}
                placeholder="Envoyer un message à tous les joueurs..."
              />
            </div>
            <Button onClick={sendGlobalMessage} variant="primary">
              Envoyer
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
