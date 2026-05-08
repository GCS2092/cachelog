import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store/gameStore';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import Button from '../../components/Button';
import FormInput from '../../components/FormInput';
import Toast from '../../components/Toast';
import type { GameState, Step, ZoneType } from '../../types/game';
import { generateQuestions, generateTeamCode, generateFinaleCode, DEFAULT_CONFIG, type GeneratorConfig } from '../../utils/questionGenerator';

export default function AdminSetup() {
  const navigate = useNavigate();
  const sendMessage = useGameStore(state => state.sendMessage);
  useAdminAuth();
  
  const [teams, setTeams] = useState<{ id: string; nom: string; code: string; membres: string[] }[]>([
    { id: '1', nom: '', code: '', membres: [] },
  ]);
  const [etapes, setEtapes] = useState<{ [teamId: string]: Step[] }>({});
  const [finale, setFinale] = useState({ indice: '', code: '' });
  const [duree, setDuree] = useState(3600); // 1 heure par défaut
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [commonSteps, setCommonSteps] = useState<Step[]>([]);
  const [generatorConfig, setGeneratorConfig] = useState<GeneratorConfig>(DEFAULT_CONFIG);
  const [showGeneratorPanel, setShowGeneratorPanel] = useState(false);
  const [modeNonLineaire, setModeNonLineaire] = useState(false);

  // Auto-save local
  useEffect(() => {
    const config = { teams, etapes, finale, duree, commonSteps };
    localStorage.setItem('adminSetupConfig', JSON.stringify(config));
  }, [teams, etapes, finale, duree, commonSteps]);

  // Charger la configuration sauvegardée
  useEffect(() => {
    const saved = localStorage.getItem('adminSetupConfig');
    if (saved) {
      try {
        const config = JSON.parse(saved);
        setTeams(config.teams || [{ id: '1', nom: '', code: '', membres: [] }]);
        setEtapes(config.etapes || {});
        setFinale(config.finale || { indice: '', code: '' });
        setDuree(config.duree || 3600);
        setCommonSteps(config.commonSteps || []);
      } catch (e) {
        console.error('Erreur lors du chargement de la configuration sauvegardée');
      }
    }
  }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  };

  const saveConfig = () => {
    const config = { teams, etapes, finale, duree, commonSteps };
    localStorage.setItem('adminSetupConfig', JSON.stringify(config));
    showToast('Configuration enregistrée localement', 'success');
  };

  const addTeam = () => {
    const newTeam = { id: Date.now().toString(), nom: '', code: '', membres: [] };
    setTeams([...teams, newTeam]);
    showToast('Nouvelle équipe créée', 'success');
  };

  const saveTeam = (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    if (team && team.nom && team.code) {
      showToast(`Équipe "${team.nom}" enregistrée`, 'success');
    } else {
      showToast('Remplissez le nom et le code avant d\'enregistrer', 'error');
    }
  };

  const updateTeam = (id: string, field: string, value: any) => {
    setTeams(teams.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const addStep = (teamId: string) => {
    const newStep: Step & { id: string } = { 
      id: Date.now().toString(),
      indice: '', 
      code: '', 
      type: 'normal', 
      points: 10, 
      malus: 5,
      zone: 'salon',
      fragment: ''
    };
    setCommonSteps([...commonSteps, newStep]);
  };

  // Génération automatique des questions
  const handleGenerateQuestions = () => {
    const generated = generateQuestions(generatorConfig);
    setCommonSteps(generated);
    
    // Appliquer à toutes les équipes existantes
    const newEtapes: { [_teamId: string]: Step[] } = {};
    teams.forEach(team => {
      newEtapes[team.id] = [...generated];
    });
    setEtapes(newEtapes);
    
    // Générer aussi la finale avec les fragments
    if (generatorConfig.genererFragments) {
      const fragments = generated.map(q => q.fragment).filter(Boolean) as string[];
      const finaleGenerated = generateFinaleCode(fragments);
      setFinale(finaleGenerated);
    }
    
    showToast(`✨ ${generated.length} questions générées automatiquement`, 'success');
    setShowGeneratorPanel(false);
  };

  // Génération auto des codes d'équipe
  const handleGenerateTeamCodes = () => {
    const existingCodes = new Set(teams.map(t => t.code).filter(Boolean));
    const newTeams = teams.map(team => {
      if (team.code) return team;
      const code = generateTeamCode(existingCodes);
      existingCodes.add(code);
      return { ...team, code };
    });
    setTeams(newTeams);
    showToast('✨ Codes d\'équipe générés', 'success');
  };

  // Réinitialiser tout (questions + finale)
  const handleResetQuestions = () => {
    if (!confirm('Réinitialiser toutes les questions ?')) return;
    setCommonSteps([]);
    setEtapes({});
    setFinale({ indice: '', code: '' });
    showToast('Questions réinitialisées', 'success');
  };

  const updateCommonStep = (stepIndex: number, field: string, value: any) => {
    const newSteps = [...commonSteps];
    newSteps[stepIndex] = { ...newSteps[stepIndex], [field]: value };
    setCommonSteps(newSteps);
    // Appliquer à toutes les équipes
    const newEtapes = { ...etapes };
    teams.forEach(team => {
      const teamSteps = etapes[team.id] || [];
      if (teamSteps[stepIndex]) {
        teamSteps[stepIndex] = { ...teamSteps[stepIndex], [field]: value };
      }
      newEtapes[team.id] = teamSteps;
    });
    setEtapes(newEtapes);
  };

  const removeCommonStep = (stepIndex: number) => {
    const newSteps = [...commonSteps];
    newSteps.splice(stepIndex, 1);
    setCommonSteps(newSteps);
    // Appliquer à toutes les équipes
    const newEtapes = { ...etapes };
    teams.forEach(team => {
      const teamSteps = [...(etapes[team.id] || [])];
      teamSteps.splice(stepIndex, 1);
      newEtapes[team.id] = teamSteps;
    });
    setEtapes(newEtapes);
  };

  const editTeamQuestion = (teamId: string, index: number) => {
    const teamSteps = etapes[teamId] || [];
    const step = teamSteps[index];
    const newIndice = prompt('Nouvel indice:', step.indice);
    if (newIndice !== null) {
      const newCode = prompt('Nouveau code (2 chiffres):', step.code);
      if (newCode !== null) {
        const newSteps = [...teamSteps];
        newSteps[index] = { ...step, indice: newIndice, code: newCode.replace(/\D/g, '').slice(0, 2) };
        setEtapes({ ...etapes, [teamId]: newSteps });
        showToast('Question modifiée pour cette équipe', 'success');
      }
    }
  };

  const moveQuestionUp = (teamId: string, index: number) => {
    const teamSteps = etapes[teamId] || [];
    if (index > 0) {
      const newSteps = [...teamSteps];
      [newSteps[index - 1], newSteps[index]] = [newSteps[index], newSteps[index - 1]];
      setEtapes({ ...etapes, [teamId]: newSteps });
      showToast('Question déplacée vers le haut', 'success');
    }
  };

  const moveQuestionDown = (teamId: string, index: number) => {
    const teamSteps = etapes[teamId] || [];
    if (index < teamSteps.length - 1) {
      const newSteps = [...teamSteps];
      [newSteps[index], newSteps[index + 1]] = [newSteps[index + 1], newSteps[index]];
      setEtapes({ ...etapes, [teamId]: newSteps });
      showToast('Question déplacée vers le bas', 'success');
    }
  };

  const initializeGame = () => {
    // Validation
    const teamsWithoutQuestions = teams.filter(team => 
      !etapes[team.id] || etapes[team.id].length === 0
    );
    
    if (teamsWithoutQuestions.length > 0) {
      const teamNames = teamsWithoutQuestions.map(t => t.nom || 'Équipe sans nom').join(', ');
      showToast(`Erreur: Les équipes suivantes n'ont pas de questions: ${teamNames}`, 'error');
      return;
    }

    if (teams.length === 0) {
      showToast('Erreur: Aucune équipe créée', 'error');
      return;
    }

    if (commonSteps.length === 0) {
      showToast('Erreur: Aucune question créée', 'error');
      return;
    }

    // Initialiser les zones pour le mode non-linéaire
    const zones: any = {};
    if (modeNonLineaire) {
      teams.forEach(team => {
        zones[team.id] = {};
        ['salon', 'cuisine', 'chambre_garcon', 'chambre_fille', 'douche', 'etage2', 'etage3', 'terrasse'].forEach(zone => {
          const zoneSteps = commonSteps.filter(s => s.zone === zone);
          if (zoneSteps.length > 0) {
            zones[team.id][zone] = {
              steps: zoneSteps,
              currentStepIndex: 0,
              completed: false,
            };
          }
        });
      });
    }

    const gameState: GameState = {
      status: 'waiting',
      timerStart: 0,
      duree,
      finaleUnlocked: false,
      messageGlobal: '',
      gagnant: null,
      modeNonLineaire,
      teams: teams.reduce((acc, team) => {
        acc[team.id] = {
          code: team.code,
          nom: team.nom,
          membres: team.membres,
          score: 0,
          etapeCourante: 0,
          finished: false,
          finishedAt: null,
          fragments: []
        };
        return acc;
      }, {} as { [teamId: string]: any }),
      etapes: teams.reduce((acc, team) => {
        const teamSteps = etapes[team.id] || [];
        // Convertir le tableau en objet indexé par l'ordre
        acc[team.id] = teamSteps.reduce((stepAcc, step, index) => {
          stepAcc[index] = step;
          return stepAcc;
        }, {} as { [ordre: number]: Step });
        return acc;
      }, {} as { [teamId: string]: { [ordre: number]: Step } }),
      zones,
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
      finale,
      connectedTeams: {},
    };
    sendMessage({ type: 'INIT_STATE', gameState });
    navigate('/admin/dashboard');
    showToast('Jeu initialisé avec succès', 'success');
  };

  const exportConfig = () => {
    const config = { teams, etapes, finale, duree };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'jeu-config.json';
    a.click();
  };

  const importConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const config = JSON.parse(event.target?.result as string);
        setTeams(config.teams);
        setEtapes(config.etapes);
        setFinale(config.finale);
        setDuree(config.duree);
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-3 sm:p-4">
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-purple-400">Setup du jeu</h1>
            <p className="text-gray-400 text-xs sm:text-sm">Configurez les équipes, étapes et finale</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={saveConfig} variant="success" size="sm">
              💾 Enregistrer
            </Button>
            <Button onClick={exportConfig} variant="secondary" size="sm">
              Exporter
            </Button>
            <label className="cursor-pointer">
              <span className="px-3 sm:px-4 py-2 bg-gray-600 rounded-lg hover:bg-gray-700 text-xs sm:text-sm font-semibold inline-block">
                Importer
              </span>
              <input type="file" accept=".json" onChange={importConfig} className="hidden" />
            </label>
          </div>
        </div>

        <div className="p-4 sm:p-6 bg-gray-800 rounded-xl border border-gray-700">
          <h2 className="text-lg font-semibold mb-3">Mode de jeu</h2>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={modeNonLineaire}
                onChange={(e) => setModeNonLineaire(e.target.checked)}
                className="w-5 h-5"
              />
              <span className="text-sm sm:text-base">Mode non-linéaire par zones</span>
            </label>
          </div>
          {modeNonLineaire && (
            <p className="text-xs sm:text-sm text-purple-300 mt-2">
              Les équipes choisiront quelles zones explorer dans n'importe quel ordre. Chaque zone contient ses propres questions.
            </p>
          )}
        </div>

        <div className="p-4 sm:p-6 bg-gray-800 rounded-xl border border-gray-700">
          <FormInput
            label="Durée du jeu (minutes)"
            type="number"
            value={String(duree / 60)}
            onChange={(v) => setDuree(Number(v) * 60)}
            required
          />
        </div>

        <div className="space-y-3 sm:space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl sm:text-2xl font-bold">Équipes</h2>
            <Button onClick={addTeam} variant="primary" size="sm">
              + Ajouter équipe
            </Button>
          </div>
          <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2">
            {teams.map((team) => (
              <div key={team.id} className="p-3 sm:p-4 bg-gray-800 rounded-xl border border-gray-700 space-y-2 sm:space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-sm sm:text-base">Équipe {teams.indexOf(team) + 1}</span>
                  <Button onClick={() => saveTeam(team.id)} variant="success" size="sm">
                    Enregistrer
                  </Button>
                </div>
                <FormInput
                  label="Nom de l'équipe"
                  type="text"
                  value={team.nom}
                  onChange={(v) => updateTeam(team.id, 'nom', v)}
                  placeholder="Nom"
                  required
                />
                <FormInput
                  label="Code à 4 chiffres"
                  type="text"
                  value={team.code}
                  onChange={(v) => updateTeam(team.id, 'code', v.replace(/\D/g, '').slice(0, 4))}
                  placeholder="XXXX"
                  maxLength={4}
                  pattern={/^\d{4}$/}
                  validationMessage="Le code doit contenir 4 chiffres"
                  required
                />
                <FormInput
                  label="Membres (séparés par des virgules)"
                  type="text"
                  value={team.membres.join(', ')}
                  onChange={(v) => updateTeam(team.id, 'membres', v.split(',').map(m => m.trim()))}
                  placeholder="Alice, Bob, Charlie"
                  required
                />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-xl sm:text-2xl font-bold">Pool de questions</h2>
            <div className="flex gap-2 flex-wrap">
              <Button onClick={() => setShowGeneratorPanel(!showGeneratorPanel)} variant="primary" size="sm">
                ✨ Génération auto
              </Button>
              {commonSteps.length > 0 && (
                <Button onClick={handleResetQuestions} variant="danger" size="sm">
                  🗑️ Tout réinitialiser
                </Button>
              )}
            </div>
          </div>
          <p className="text-gray-400 text-xs sm:text-sm">Créez vos questions manuellement, ou générez-les automatiquement</p>

          {/* Panneau de génération automatique */}
          {showGeneratorPanel && (
            <div className="p-4 bg-purple-900 border border-purple-500 rounded-xl space-y-4">
              <h3 className="font-semibold text-lg">✨ Configuration de la génération automatique</h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs text-gray-300 mb-1">Nombre de questions</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={generatorConfig.nbQuestions}
                    onChange={(e) => setGeneratorConfig({ ...generatorConfig, nbQuestions: Math.max(1, Number(e.target.value)) })}
                    className="w-full px-2 py-2 bg-gray-700 rounded border border-gray-600 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-300 mb-1">Nombre de pièges</label>
                  <input
                    type="number"
                    min="0"
                    max={generatorConfig.nbQuestions}
                    value={generatorConfig.nbPieges}
                    onChange={(e) => setGeneratorConfig({ ...generatorConfig, nbPieges: Math.max(0, Number(e.target.value)) })}
                    className="w-full px-2 py-2 bg-gray-700 rounded border border-gray-600 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-300 mb-1">Points / question</label>
                  <input
                    type="number"
                    min="1"
                    value={generatorConfig.points}
                    onChange={(e) => setGeneratorConfig({ ...generatorConfig, points: Number(e.target.value) })}
                    className="w-full px-2 py-2 bg-gray-700 rounded border border-gray-600 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-300 mb-1">Malus / piège</label>
                  <input
                    type="number"
                    min="0"
                    value={generatorConfig.malus}
                    onChange={(e) => setGeneratorConfig({ ...generatorConfig, malus: Number(e.target.value) })}
                    className="w-full px-2 py-2 bg-gray-700 rounded border border-gray-600 text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 flex-wrap">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={generatorConfig.useAllZones}
                    onChange={(e) => setGeneratorConfig({ ...generatorConfig, useAllZones: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Utiliser toutes les zones</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={generatorConfig.genererFragments}
                    onChange={(e) => setGeneratorConfig({ ...generatorConfig, genererFragments: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Générer fragments + finale</span>
                </label>
              </div>

              {!generatorConfig.useAllZones && (
                <div>
                  <label className="block text-xs text-gray-300 mb-2">Zones sélectionnées</label>
                  <div className="flex flex-wrap gap-2">
                    {(['salon', 'cuisine', 'chambre_garcon', 'chambre_fille', 'douche', 'etage2', 'etage3', 'terrasse'] as ZoneType[]).map(z => (
                      <button
                        key={z}
                        onClick={() => {
                          const selected = generatorConfig.zonesSelectionnees.includes(z)
                            ? generatorConfig.zonesSelectionnees.filter(x => x !== z)
                            : [...generatorConfig.zonesSelectionnees, z];
                          setGeneratorConfig({ ...generatorConfig, zonesSelectionnees: selected });
                        }}
                        className={`px-3 py-1 rounded text-xs ${
                          generatorConfig.zonesSelectionnees.includes(z)
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-700 text-gray-400'
                        }`}
                      >
                        {z}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={handleGenerateQuestions} variant="success" size="sm">
                  ✨ Générer maintenant
                </Button>
                <Button onClick={handleGenerateTeamCodes} variant="secondary" size="sm">
                  🔢 Générer codes d'équipe
                </Button>
              </div>

              {commonSteps.length > 0 && (
                <p className="text-xs text-yellow-300">
                  ⚠️ Cela remplacera les {commonSteps.length} questions existantes
                </p>
              )}
            </div>
          )}
          
          <div className="p-4 sm:p-6 bg-gray-800 rounded-xl border border-gray-700 space-y-3 sm:space-y-4">
            {commonSteps.map((step, stepIndex) => (
              <div key={stepIndex} className="p-3 sm:p-4 bg-gray-700 rounded-lg space-y-2 sm:space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-base sm:text-lg">Question {stepIndex + 1}</span>
                  <div className="flex gap-2">
                    <Button onClick={() => removeCommonStep(stepIndex)} variant="danger" size="sm">
                      Supprimer
                    </Button>
                    <Button onClick={() => showToast(`Question ${stepIndex + 1} enregistrée`, 'success')} variant="success" size="sm">
                      Enregistrer
                    </Button>
                  </div>
                </div>
                <div className="grid gap-2 sm:gap-3 grid-cols-1 md:grid-cols-2">
                  <FormInput
                    label="Indice"
                    type="text"
                    value={step.indice}
                    onChange={(v) => updateCommonStep(stepIndex, 'indice', v)}
                    placeholder="Indice de la question"
                    required
                  />
                  <FormInput
                    label="Code (2 chiffres)"
                    type="text"
                    value={step.code}
                    onChange={(v) => updateCommonStep(stepIndex, 'code', v.replace(/\D/g, '').slice(0, 2))}
                    placeholder="XX"
                    maxLength={2}
                    pattern={/^\d{2}$/}
                    validationMessage="Le code doit contenir 2 chiffres"
                    required
                  />
                  <FormInput
                    label="Fragment de code"
                    type="text"
                    value={step.fragment || ''}
                    onChange={(v) => updateCommonStep(stepIndex, 'fragment', v)}
                    placeholder="Ex: 3A, 7K, X2"
                  />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 sm:gap-3">
                  <div>
                    <label className="block text-xs sm:text-sm text-gray-300 mb-1">Type</label>
                    <select
                      value={step.type}
                      onChange={(e) => updateCommonStep(stepIndex, 'type', e.target.value)}
                      className="w-full px-2 sm:px-3 py-2 bg-gray-600 rounded border border-gray-500 focus:border-purple-500 focus:outline-none text-xs sm:text-sm"
                    >
                      <option value="normal">Normal</option>
                      <option value="piege">Piège</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm text-gray-300 mb-1">Zone</label>
                    <select
                      value={step.zone || 'salon'}
                      onChange={(e) => updateCommonStep(stepIndex, 'zone', e.target.value)}
                      className="w-full px-2 sm:px-3 py-2 bg-gray-600 rounded border border-gray-500 focus:border-purple-500 focus:outline-none text-xs sm:text-sm"
                    >
                      <option value="salon">Salon</option>
                      <option value="cuisine">Cuisine</option>
                      <option value="chambre_garcon">Chambre garçon</option>
                      <option value="chambre_fille">Chambre fille (filles uniquement)</option>
                      <option value="douche">Douche extérieure</option>
                      <option value="etage2">2ème étage</option>
                      <option value="etage3">3ème étage</option>
                      <option value="terrasse">Terrasse</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm text-gray-300 mb-1">Points</label>
                    <input
                      type="number"
                      value={step.points}
                      onChange={(e) => updateCommonStep(stepIndex, 'points', Number(e.target.value))}
                      className="w-full px-2 sm:px-3 py-2 bg-gray-600 rounded border border-gray-500 focus:border-purple-500 focus:outline-none text-xs sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm text-gray-300 mb-1">Malus</label>
                    <input
                      type="number"
                      value={step.malus}
                      onChange={(e) => updateCommonStep(stepIndex, 'malus', Number(e.target.value))}
                      className="w-full px-2 sm:px-3 py-2 bg-gray-600 rounded border border-gray-500 focus:border-purple-500 focus:outline-none text-xs sm:text-sm"
                    />
                  </div>
                  <div className="flex items-end">
                    <span className="text-xs sm:text-sm text-gray-400">{commonSteps.length} question(s)</span>
                  </div>
                </div>
              </div>
            ))}
            <Button onClick={() => addStep('common')} variant="secondary" size="sm" fullWidth>
              + Ajouter une question
            </Button>
          </div>
        </div>

        <div className="space-y-3 sm:space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold">Attribution aux équipes</h2>
          <p className="text-gray-400 text-xs sm:text-sm">Sélectionnez quelles questions assigner à chaque équipe</p>
          
          {teams.map((team) => (
            <div key={team.id} className="p-4 sm:p-6 bg-gray-800 rounded-xl border border-gray-700 space-y-3 sm:space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-base sm:text-lg">{team.nom || 'Équipe sans nom'}</h3>
                <Button onClick={() => {
                  // Assigner toutes les questions du pool à cette équipe
                  setEtapes({ ...etapes, [team.id]: [...commonSteps] });
                  showToast(`Questions assignées à ${team.nom || 'cette équipe'}`, 'success');
                }} variant="success" size="sm">
                  Assigner toutes les questions
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {commonSteps.map((step, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      const teamSteps = etapes[team.id] || [];
                      const exists = teamSteps.some(s => s.indice === step.indice && s.code === step.code);
                      if (exists) {
                        // Retirer cette question
                        setEtapes({
                          ...etapes,
                          [team.id]: teamSteps.filter(s => !(s.indice === step.indice && s.code === step.code))
                        });
                        showToast(`Question ${idx + 1} retirée`, 'success');
                      } else {
                        // Ajouter cette question
                        setEtapes({
                          ...etapes,
                          [team.id]: [...teamSteps, step]
                        });
                        showToast(`Question ${idx + 1} assignée`, 'success');
                      }
                    }}
                    className={`px-3 py-1 rounded text-xs sm:text-sm ${
                      (etapes[team.id] || []).some(s => s.indice === step.indice && s.code === step.code)
                        ? 'bg-purple-600'
                        : 'bg-gray-600'
                    }`}
                  >
                    Q{idx + 1}
                  </button>
                ))}
              </div>
              <div className="text-xs sm:text-sm text-gray-400">
                {(etapes[team.id] || []).length} question(s) assignée(s)
              </div>
              {/* Aperçu des questions assignées avec ordre */}
              {(etapes[team.id] || []).length > 0 && (
                <div className="mt-2 p-2 bg-gray-700 rounded text-xs sm:text-sm">
                  <p className="font-semibold mb-1">Ordre des questions :</p>
                  <ol className="list-decimal list-inside space-y-1">
                    {(etapes[team.id] || []).map((step, idx) => {
                      const poolIndex = commonSteps.findIndex(s => s.indice === step.indice && s.code === step.code);
                      return (
                        <li key={idx} className="flex items-center gap-2 justify-between">
                          <span>
                            Q{poolIndex + 1}: {step.indice || '(vide)'} - {step.points} pts
                          </span>
                          <div className="flex gap-1">
                            <button
                              onClick={() => editTeamQuestion(team.id, idx)}
                              className="px-2 py-1 bg-blue-600 rounded hover:bg-blue-500"
                              title="Modifier pour cette équipe"
                            >
                              ✎
                            </button>
                            <button
                              onClick={() => moveQuestionUp(team.id, idx)}
                              disabled={idx === 0}
                              className="px-2 py-1 bg-gray-600 rounded hover:bg-gray-500 disabled:opacity-50"
                            >
                              ↑
                            </button>
                            <button
                              onClick={() => moveQuestionDown(team.id, idx)}
                              disabled={idx === (etapes[team.id] || []).length - 1}
                              className="px-2 py-1 bg-gray-600 rounded hover:bg-gray-500 disabled:opacity-50"
                            >
                              ↓
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="p-4 sm:p-6 bg-gray-800 rounded-xl border border-gray-700 space-y-3 sm:space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold">Finale</h2>
          <FormInput
            label="Indice final"
            type="text"
            value={finale.indice}
            onChange={(v) => setFinale({ ...finale, indice: v })}
            placeholder="Indice de la finale"
            required
          />
          <FormInput
            label="Code final"
            type="text"
            value={finale.code}
            onChange={(v) => setFinale({ ...finale, code: v })}
            placeholder="Code final"
            required
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <Button onClick={initializeGame} variant="success" size="lg" fullWidth>
            Initialiser le jeu
          </Button>
          <Button onClick={() => navigate('/admin/dashboard')} variant="secondary" size="lg">
            Retour
          </Button>
        </div>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
