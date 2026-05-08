export type GameStatus = "waiting" | "running" | "finale" | "finished";

export type StepType = "normal" | "piege";

export type ZoneType = "salon" | "cuisine" | "chambre_garcon" | "chambre_fille" | "douche" | "etage2" | "etage3" | "terrasse";

export interface Team {
  code: string;          // code 4 chiffres donné aux joueurs
  nom: string;
  membres: string[];     // juste les prénoms
  score: number;
  etapeCourante: number;
  finished: boolean;
  finishedAt: number | null;
  fragments: string[];   // Fragments de code collectés
}

export interface Step {
  id?: string;           // ID unique pour l'attribution
  indice: string;
  code: string;          // 2 chiffres
  type: StepType;
  points: number;
  malus: number;
  zone?: ZoneType;       // Zone d'accès
  fragment?: string;     // Fragment de code à collecter
}

export interface Finale {
  indice: string;
  code: string;
}

export interface GameState {
  status: GameStatus;
  timerStart: number;        // timestamp ms
  duree: number;             // secondes, ex: 3600
  finaleUnlocked: boolean;
  messageGlobal: string;
  gagnant: string | null;
  modeNonLineaire: boolean;  // true = progression par zone, false = progression linéaire

  teams: {
    [teamId: string]: Team;
  };

  etapes: {
    [teamId: string]: {
      [ordre: number]: Step;
    };
  };

  // Nouveau système pour mode non linéaire
  zones: {
    [teamId: string]: {
      [zone: string]: {
        steps: Step[];
        currentStepIndex: number;
        completed: boolean;
      };
    };
  };

  // État des zones (pour événements dynamiques)
  zoneStates: {
    [zone: string]: {
      locked: boolean;
      trapActive: boolean;
      lockedUntil?: number; // timestamp
    };
  };

  finale: Finale;

  connectedTeams: {
    [teamId: string]: boolean;
  };
}

export type WSMessage =
  | { type: "VALIDATE_CODE"; teamId: string; etape: number; code: string }
  | { type: "USE_HINT"; teamId: string; etape: number }
  | { type: "VALIDATE_ZONE_CODE"; teamId: string; zone: string; code: string }
  | { type: "SELECT_ZONE"; teamId: string; zone: string }
  | { type: "UNLOCK_FINALE" }
  | { type: "FINALE_WIN"; teamId: string }
  | { type: "ADMIN_ACTION"; action: "skip_step" | "add_points" | "remove_points" | "reset_team"; teamId: string; value?: number }
  | { type: "ZONE_ACTION"; action: "lock_zone" | "unlock_zone" | "activate_trap" | "deactivate_trap"; zone: string; duration?: number }
  | { type: "SEND_MESSAGE"; text: string }
  | { type: "INIT_STATE"; gameState: GameState }
  | { type: "STATE_UPDATE"; gameState: GameState }
  | { type: "TEAM_CONNECT"; teamId: string }
  | { type: "TEAM_DISCONNECT"; teamId: string };
