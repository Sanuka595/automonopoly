import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { socket, sendIntent, auth as socketAuth, startMatch as emitStart } from './socket.ts';
import type {
  RoomState,
  PlayerState,
  PhaseState,
  IntentResponse,
  AuthResponse,
  LobbyUser,
} from './types.ts';

export type AuthPhase = 'idle' | 'lobby' | 'playing' | 'error';

export function useGame(initialMyId: string = '') {
  const [room, setRoom] = useState<RoomState | null>(null);
  const [lobby, setLobby] = useState<LobbyUser[]>([]);
  const [myId, setMyId] = useState<string>(initialMyId);
  const [error, setError] = useState<string | null>(null);
  const [lastRolled, setLastRolled] = useState<number | null>(null);
  const [connected, setConnected] = useState(socket.connected);
  const [authPhase, setAuthPhase] = useState<AuthPhase>('idle');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const creds = useRef<{ initData: string; roomId: string } | null>(null);
  const authInFlight = useRef(false);
  const phaseRef = useRef<PhaseState['name'] | null>(null);

  useEffect(() => {
    const handleRoomState = (nextRoom: RoomState) => {
      phaseRef.current = nextRoom.phase.name;
      setRoom(nextRoom);
      setAuthPhase(nextRoom.phase.name === 'lobby' ? 'lobby' : 'playing');
    };
    const handleLobby = (list: LobbyUser[]) => {
      if (phaseRef.current && phaseRef.current !== 'lobby') return;
      setLobby(list);
      setAuthPhase('lobby');
    };
    const reauth = () => {
      const saved = creds.current;
      if (!saved || authInFlight.current) return;
      socket.emit('auth', saved, (res: AuthResponse) => {
        if (!res?.ok) {
          setError(res?.error ?? 'auth failed');
          setAuthPhase('error');
        }
      });
    };
    const handleConnect = () => {
      setConnected(true);
      setConnectionError(null);
      reauth();
    };
    const handleDisconnect = () => {
      setConnected(false);
    };
    const handleConnectError = (err: Error) => {
      setConnected(false);
      setConnectionError(err.message || 'Нет связи с сервером');
    };

    socket.on('room:state', handleRoomState);
    socket.on('lobby:update', handleLobby);
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);

    return () => {
      socket.off('room:state', handleRoomState);
      socket.off('lobby:update', handleLobby);
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
    };
  }, []);

  const me: PlayerState | undefined = useMemo(() => {
    if (!room || !myId) return undefined;
    return room.players.find((p) => p.id === myId);
  }, [room, myId]);

  const isMyTurn: boolean = useMemo(() => {
    if (!room || !myId) return false;
    const myIndex = room.players.findIndex((p) => p.id === myId);
    return myIndex !== -1 && room.turn === myIndex;
  }, [room, myId]);

  const activePlayer: PlayerState | undefined = useMemo(() => {
    if (!room || room.turn < 0 || room.turn >= room.players.length) return undefined;
    return room.players[room.turn];
  }, [room]);

  const currentPhase: PhaseState = useMemo(() => {
    return room?.phase ?? { name: 'lobby' };
  }, [room]);

  const authenticate = useCallback(
    async (initData: string, roomId: string, playerId?: string): Promise<AuthResponse> => {
      creds.current = { initData, roomId };
      if (playerId) setMyId(playerId);
      authInFlight.current = true;
      try {
        const res = await socketAuth(initData, roomId);
        if (!res.ok) {
          setError(res.error ?? 'Authentication failed');
          setAuthPhase('error');
        } else {
          setError(null);
          setAuthPhase(res.state === 'playing' ? 'playing' : 'lobby');
        }
        return res;
      } finally {
        authInFlight.current = false;
      }
    },
    [],
  );

  const startMatch = useCallback(async (): Promise<AuthResponse> => {
    const res = await emitStart();
    if (!res.ok) {
      setError(res.error ?? 'cannot start');
    } else {
      setError(null);
    }
    return res;
  }, []);

  const executeIntent = useCallback(
    async (payload: Record<string, unknown>): Promise<IntentResponse> => {
      const res = await sendIntent(payload);
      if (!res.ok) {
        setError(res.error ?? 'Action failed');
      } else {
        setError(null);
        if (res.rolled !== undefined) {
          setLastRolled(res.rolled);
        }
      }
      return res;
    },
    [],
  );

  // Intent helpers
  const move = useCallback(
    (steps: 1 | 2 | 3 | 4) => executeIntent({ type: 'move', steps }),
    [executeIntent],
  );

  const buy = useCallback(
    (carId: string) => executeIntent({ type: 'buy', carId }),
    [executeIntent],
  );

  const repair = useCallback(
    (carId: string) => executeIntent({ type: 'repair', carId }),
    [executeIntent],
  );

  const scrap = useCallback(
    (carId: string) => executeIntent({ type: 'scrap', carId }),
    [executeIntent],
  );

  const buyout = useCallback(
    (carId: string) => executeIntent({ type: 'buyout', carId }),
    [executeIntent],
  );

  const rent = useCallback(
    () => executeIntent({ type: 'rent' }),
    [executeIntent],
  );

  const taxi = useCallback(
    (carId: string) => executeIntent({ type: 'taxi', carId }),
    [executeIntent],
  );

  const pass = useCallback(
    () => executeIntent({ type: 'pass' }),
    [executeIntent],
  );

  const bid = useCallback(
    (step: '100' | '500') => executeIntent({ type: 'bid', step }),
    [executeIntent],
  );

  const raceInvite = useCallback(
    (targetId: string, stake: string) =>
      executeIntent({ type: 'race_invite', targetId, stake }),
    [executeIntent],
  );

  const raceAccept = useCallback(
    () => executeIntent({ type: 'race_accept' }),
    [executeIntent],
  );

  const raceForfeit = useCallback(
    () => executeIntent({ type: 'race_forfeit' }),
    [executeIntent],
  );

  const raceJoinPool = useCallback(
    () => executeIntent({ type: 'race_join_pool' }),
    [executeIntent],
  );

  const loanOffer = useCallback(
    (targetId: string, principal: string, due: string, turns: number) =>
      executeIntent({ type: 'loan_offer', targetId, principal, due, turns }),
    [executeIntent],
  );

  return {
    room,
    setRoom,
    lobby,
    myId,
    setMyId,
    me,
    isMyTurn,
    activePlayer,
    currentPhase,
    error,
    setError,
    lastRolled,
    connected,
    authPhase,
    connectionError,
    authenticate,
    startMatch,
    sendIntent: executeIntent,
    move,
    buy,
    repair,
    scrap,
    buyout,
    rent,
    taxi,
    pass,
    bid,
    raceInvite,
    raceAccept,
    raceForfeit,
    raceJoinPool,
    loanOffer,
  };
}
