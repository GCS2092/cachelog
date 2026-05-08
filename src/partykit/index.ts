import { type PartyKitServer } from "partykit/server";
import type { GameState, WSMessage } from "../types/game";

export default {
  async onConnect(ws, room) {
    const state = await room.storage.get<GameState>("gameState");
    ws.send(JSON.stringify({ type: "STATE_UPDATE", gameState: state || getInitialState() }));
  },

  async onMessage(message, _ws, room) {
    const msg: WSMessage = JSON.parse(message as string);
    const currentState = (await room.storage.get<GameState>("gameState")) || getInitialState();

    switch (msg.type) {
      case "VALIDATE_CODE": {
        const team = currentState.teams[msg.teamId];
        const step = currentState.etapes[msg.teamId]?.[msg.etape];

        if (!team || !step) return;

        if (msg.code === step.code) {
          // Bon code
          team.score += step.points;
          team.etapeCourante += 1;
          
          // Collecter le fragment si présent
          if (step.fragment) {
            if (!team.fragments) team.fragments = [];
            if (!team.fragments.includes(step.fragment)) {
              team.fragments.push(step.fragment);
            }
          }
          
          // Vérifier si l'équipe a fini
          if (team.etapeCourante >= Object.keys(currentState.etapes[msg.teamId]).length) {
            team.finished = true;
            team.finishedAt = Date.now();
          }
        } else if (step.type === "piege") {
          // Piège déclenché
          team.score -= step.malus;
        }

        await room.storage.put("gameState", currentState);
        room.broadcast(JSON.stringify({ type: "STATE_UPDATE", gameState: currentState }));
        break;
      }

      case "VALIDATE_ZONE_CODE": {
        if (!currentState.modeNonLineaire) return; // Ignorer si mode linéaire

        const team = currentState.teams[msg.teamId];
        const zoneData = currentState.zones[msg.teamId]?.[msg.zone];

        if (!team || !zoneData) return;

        const step = zoneData.steps[zoneData.currentStepIndex];
        if (!step) return;

        if (msg.code === step.code) {
          // Bon code
          team.score += step.points;
          zoneData.currentStepIndex += 1;
          
          // Collecter le fragment si présent
          if (step.fragment) {
            if (!team.fragments) team.fragments = [];
            if (!team.fragments.includes(step.fragment)) {
              team.fragments.push(step.fragment);
            }
          }
          
          // Vérifier si la zone est terminée
          if (zoneData.currentStepIndex >= zoneData.steps.length) {
            zoneData.completed = true;
            
            // Vérifier si toutes les zones sont terminées
            const allZonesCompleted = Object.values(currentState.zones[msg.teamId] || {}).every(z => z.completed);
            if (allZonesCompleted) {
              team.finished = true;
              team.finishedAt = Date.now();
            }
          }
        } else if (step.type === "piege") {
          // Piège déclenché
          team.score -= step.malus;
        }

        await room.storage.put("gameState", currentState);
        room.broadcast(JSON.stringify({ type: "STATE_UPDATE", gameState: currentState }));
        break;
      }

      case "SELECT_ZONE": {
        if (!currentState.modeNonLineaire) return; // Ignorer si mode linéaire

        const zoneData = currentState.zones[msg.teamId]?.[msg.zone];
        const zoneState = currentState.zoneStates[msg.zone];
        const team = currentState.teams[msg.teamId];

        if (!zoneData || !team) return;

        // Vérifier si la zone est abandonnée par cette équipe
        if (zoneState?.abandonedByTeams?.includes(msg.teamId)) {
          return; // Équipe ne peut plus revenir sur cette zone
        }

        // Vérifier si la zone est déjà occupée par une autre équipe
        if (zoneState?.lockedByTeam && zoneState.lockedByTeam !== msg.teamId) {
          return; // Zone déjà occupée
        }

        // Verrouiller la zone pour cette équipe
        if (!currentState.zoneStates[msg.zone]) {
          currentState.zoneStates[msg.zone] = { locked: false, trapActive: false };
        }
        currentState.zoneStates[msg.zone].lockedByTeam = msg.teamId;

        await room.storage.put("gameState", currentState);
        room.broadcast(JSON.stringify({ type: "STATE_UPDATE", gameState: currentState }));
        break;
      }

      case "ABANDON_ZONE": {
        if (!currentState.modeNonLineaire) return;

        const zoneState = currentState.zoneStates[msg.zone];
        const team = currentState.teams[msg.teamId];

        if (!zoneState || !team) return;

        // Vérifier que cette équipe occupe bien cette zone
        if (zoneState.lockedByTeam !== msg.teamId) {
          return;
        }

        // Pénalité pour abandon (10 points)
        team.score = Math.max(0, team.score - 10);

        // Libérer la zone
        zoneState.lockedByTeam = undefined;

        // Marquer la zone comme abandonnée par cette équipe
        if (!zoneState.abandonedByTeams) {
          zoneState.abandonedByTeams = [];
        }
        if (!zoneState.abandonedByTeams.includes(msg.teamId)) {
          zoneState.abandonedByTeams.push(msg.teamId);
        }

        await room.storage.put("gameState", currentState);
        room.broadcast(JSON.stringify({ type: "STATE_UPDATE", gameState: currentState }));
        break;
      }

      case "ZONE_ACTION": {
        const zoneState = currentState.zoneStates[msg.zone] || { locked: false, trapActive: false };
        
        switch (msg.action) {
          case "lock_zone":
            // Vérifier si une équipe occupe déjà cette zone
            if (zoneState.lockedByTeam) {
              // Ne pas verrouiller si une équipe est dedans
              // L'admin peut forcer mais on garde la trace
              zoneState.locked = true;
              zoneState.lockedUntil = msg.duration ? Date.now() + msg.duration * 1000 : undefined;
            } else {
              zoneState.locked = true;
              zoneState.lockedUntil = msg.duration ? Date.now() + msg.duration * 1000 : undefined;
            }
            break;
          case "unlock_zone":
            zoneState.locked = false;
            zoneState.lockedUntil = undefined;
            break;
          case "activate_trap":
            zoneState.trapActive = true;
            break;
          case "deactivate_trap":
            zoneState.trapActive = false;
            break;
        }

        await room.storage.put("gameState", currentState);
        room.broadcast(JSON.stringify({ type: "STATE_UPDATE", gameState: currentState }));
        break;
      }

      case "UNLOCK_FINALE": {
        currentState.finaleUnlocked = true;
        await room.storage.put("gameState", currentState);
        room.broadcast(JSON.stringify({ type: "STATE_UPDATE", gameState: currentState }));
        break;
      }

      case "USE_HINT": {
        const team = currentState.teams[msg.teamId];
        if (!team) return;
        team.score -= 5;
        await room.storage.put("gameState", currentState);
        room.broadcast(JSON.stringify({ type: "STATE_UPDATE", gameState: currentState }));
        break;
      }

      case "FINALE_WIN": {
        currentState.gagnant = msg.teamId;
        currentState.status = "finished";
        await room.storage.put("gameState", currentState);
        room.broadcast(JSON.stringify({ type: "STATE_UPDATE", gameState: currentState }));
        break;
      }

      case "ADMIN_ACTION": {
        const team = currentState.teams[msg.teamId];
        if (!team) return;

        switch (msg.action) {
          case "skip_step":
            team.etapeCourante += 1;
            break;
          case "add_points":
            team.score += msg.value || 0;
            break;
          case "remove_points":
            team.score -= msg.value || 0;
            break;
          case "reset_team":
            team.score = 0;
            team.etapeCourante = 0;
            team.finished = false;
            team.finishedAt = null;
            team.fragments = [];
            break;
        }

        await room.storage.put("gameState", currentState);
        room.broadcast(JSON.stringify({ type: "STATE_UPDATE", gameState: currentState }));
        break;
      }

      case "SEND_MESSAGE": {
        currentState.messageGlobal = msg.text;
        await room.storage.put("gameState", currentState);
        room.broadcast(JSON.stringify({ type: "STATE_UPDATE", gameState: currentState }));
        break;
      }

      case "INIT_STATE": {
        await room.storage.put("gameState", msg.gameState);
        room.broadcast(JSON.stringify({ type: "STATE_UPDATE", gameState: msg.gameState }));
        break;
      }

      case "TEAM_CONNECT": {
        currentState.connectedTeams = currentState.connectedTeams || {};
        currentState.connectedTeams[msg.teamId] = true;
        await room.storage.put("gameState", currentState);
        room.broadcast(JSON.stringify({ type: "STATE_UPDATE", gameState: currentState }));
        break;
      }

      case "TEAM_DISCONNECT": {
        currentState.connectedTeams = currentState.connectedTeams || {};
        delete currentState.connectedTeams[msg.teamId];
        await room.storage.put("gameState", currentState);
        room.broadcast(JSON.stringify({ type: "STATE_UPDATE", gameState: currentState }));
        break;
      }
    }
  },
} satisfies PartyKitServer;

function getInitialState(): GameState {
  return {
    status: "waiting",
    timerStart: 0,
    duree: 3600,
    finaleUnlocked: false,
    messageGlobal: "",
    gagnant: null,
    modeNonLineaire: false,
    teams: {},
    etapes: {},
    zones: {},
    zoneStates: {
      salon: { locked: false, trapActive: false, lockedByTeam: undefined, abandonedByTeams: [] },
      cuisine: { locked: false, trapActive: false, lockedByTeam: undefined, abandonedByTeams: [] },
      chambre_garcon: { locked: false, trapActive: false, lockedByTeam: undefined, abandonedByTeams: [] },
      chambre_fille: { locked: false, trapActive: false, lockedByTeam: undefined, abandonedByTeams: [] },
      douche: { locked: false, trapActive: false, lockedByTeam: undefined, abandonedByTeams: [] },
      etage2: { locked: false, trapActive: false, lockedByTeam: undefined, abandonedByTeams: [] },
      etage3: { locked: false, trapActive: false, lockedByTeam: undefined, abandonedByTeams: [] },
      terrasse: { locked: false, trapActive: false, lockedByTeam: undefined, abandonedByTeams: [] },
    },
    finale: { indice: "", code: "" },
    connectedTeams: {},
  };
}
