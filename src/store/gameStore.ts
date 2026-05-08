import { create } from 'zustand';
import type { GameState, WSMessage } from '../types/game';
import PartySocket from 'partysocket';

interface GameStore {
  gameState: GameState | null;
  isConnected: boolean;
  socket: PartySocket | null;
  connect: (roomName: string) => void;
  disconnect: () => void;
  sendMessage: (message: WSMessage) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: null,
  isConnected: false,
  socket: null,

  connect: (roomName: string) => {
    const existingSocket = get().socket;
    if (existingSocket) {
      existingSocket.close();
    }

    const socket = new PartySocket({
      host: import.meta.env.VITE_PARTYKIT_URL || import.meta.env.VITE_PARTYKIT_HOST || 'localhost:1999',
      room: roomName,
    });

    socket.addEventListener('open', () => {
      set({ isConnected: true });
    });

    socket.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(event.data) as WSMessage;
        if (message.type === 'STATE_UPDATE') {
          set({ gameState: message.gameState });
        }
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    });

    socket.addEventListener('close', () => {
      set({ isConnected: false });
      // Reconnexion automatique après 2 secondes
      setTimeout(() => {
        const currentSocket = get().socket;
        if (!currentSocket || currentSocket.readyState === WebSocket.CLOSED) {
          get().connect(roomName);
        }
      }, 2000);
    });

    socket.addEventListener('error', (error) => {
      console.error('WebSocket error:', error);
      set({ isConnected: false });
    });

    set({ socket });
  },

  disconnect: () => {
    const socket = get().socket;
    if (socket) {
      socket.close();
      set({ socket: null, isConnected: false });
    }
  },

  sendMessage: (message: WSMessage) => {
    const socket = get().socket;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  },
}));
