import { useEffect, useState } from 'react';
import { useGame } from './api/useGame.ts';
import { fetchDevToken } from './api/socket.ts';
import type { PhaseState } from './api/types.ts';
import {
  allowedCarActions,
  cellTitle,
  errorLabel,
  phaseLabel,
  playerIdFromInitData,
  shopOffer,
} from './api/present.ts';
import {
  Hud,
  OpponentsBar,
  TrackWheel,
  GarageBar,
  Dock,
  TableLayout,
} from './components/table/index.ts';
import { ConnectingScreen } from './components/lobby/ConnectingScreen.tsx';
import { LobbyScreen } from './components/lobby/LobbyScreen.tsx';
import { AuctionModal } from './components/auction/AuctionModal.tsx';
import { MockTable } from './MockTable.tsx';

function LiveTable({ devPlayerId, roomId }: { devPlayerId: string; roomId: string }) {
  const game = useGame();
  const { authenticate } = game;
  const room = game.room;
  const me = game.me;
  const phase: PhaseState = room?.phase ?? { name: 'lobby' };
  const [bootError, setBootError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [starting, setStarting] = useState(false);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const selectedCarId = me?.cars.some((car) => car.id === pickedId)
    ? pickedId
    : (me?.cars[0]?.id ?? null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const initData = await fetchDevToken(devPlayerId, `Player${devPlayerId}`);
        if (cancelled) return;
        const id = playerIdFromInitData(initData) ?? devPlayerId;
        const res = await authenticate(initData, roomId, id);
        if (!cancelled && !res.ok) setBootError(res.error ?? 'auth failed');
      } catch (err) {
        if (!cancelled) {
          setBootError(err instanceof Error ? err.message : 'dev token failed');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attempt, authenticate, devPlayerId, roomId]);

  const retry = () => {
    setBootError(null);
    game.setError(null);
    setAttempt((n) => n + 1);
  };

  const lobbyPhase = room?.phase.name === 'lobby';
  const showLobby =
    lobbyPhase || (!room && (game.authPhase === 'lobby' || game.lobby.length > 0));

  if (!room || lobbyPhase) {
    if (showLobby) {
      const seats =
        room && room.phase.name === 'lobby'
          ? room.players.map((player) => ({ id: player.id, name: player.name }))
          : game.lobby;
      return (
        <LobbyScreen
          seats={seats}
          myId={game.myId}
          roomId={roomId}
          devPlayerId={devPlayerId}
          error={game.error ? errorLabel(game.error) : null}
          starting={starting}
          onDismissError={() => game.setError(null)}
          onStart={() => {
            if (starting) return;
            setStarting(true);
            void game.startMatch().finally(() => setStarting(false));
          }}
        />
      );
    }

    const detail = bootError ?? game.connectionError ?? (game.authPhase === 'error' ? game.error : null);
    return (
      <ConnectingScreen
        title={detail ? 'Не удалось сесть за стол' : 'Подключение к столу...'}
        detail={detail ? errorLabel(detail) : null}
        onRetry={detail ? retry : undefined}
      />
    );
  }

  const opponents = room.players.filter((player) => player.id !== game.myId);
  const selected = me?.cars.find((car) => car.id === selectedCarId);
  const canTaxi = Boolean(selected && selected.class !== 'retro' && selected.taxiMult !== '0');
  const waitingName = game.activePlayer?.name ?? 'соперника';
  const cell = room.phase.name === 'resolve_cell' ? cellTitle(room.phase.cell) : undefined;
  const auction = room.phase.name === 'auction' ? room.phase.state : null;
  const canBid = auction?.currentTurnPlayerId === game.myId;
  const banner = game.error
    ? errorLabel(game.error)
    : !game.connected
      ? 'Нет связи со столом'
      : null;

  return (
    <div className="relative">
      {banner ? (
        <button
          type="button"
          onClick={() => game.setError(null)}
          className="glass-card absolute inset-x-2 bottom-[204px] z-[60] px-3 py-2 text-left text-xs text-[#F3C7C4]"
        >
          {banner}
        </button>
      ) : null}
      <TableLayout
        hud={
          <Hud
            isMyTurn={game.isMyTurn}
            activePlayerName={waitingName}
            cash={me?.cash ?? '0'}
            turnNumber={(game.activePlayer?.turnCount ?? 0) + 1}
          />
        }
        opponents={
          <OpponentsBar
            opponents={opponents}
            currentTurnPlayerId={room.players[room.turn]?.id}
          />
        }
        track={
          <TrackWheel
            players={room.players}
            currentTurnPlayerId={room.players[room.turn]?.id}
            activeCellIndex={me?.position ?? 0}
            phaseName={phaseLabel(phase)}
            lapNumber={1}
          />
        }
        garage={
          <GarageBar
            cars={me?.cars ?? []}
            selectedCarId={selectedCarId}
            onSelectCar={setPickedId}
            actionsEnabled={game.isMyTurn}
            waitingName={waitingName}
            allowedActions={allowedCarActions(phase, game.isMyTurn)}
            onCarAction={(action, car) => {
              if (!game.isMyTurn) return;
              if (action === 'repair') void game.repair(car.id);
              if (action === 'scrap') void game.scrap(car.id);
              if (action === 'buyout') void game.buyout(car.id);
            }}
          />
        }
        dock={
          <Dock
            phase={phase}
            isMyTurn={game.isMyTurn}
            waitingName={waitingName}
            taxiDisabled={!canTaxi}
            offer={shopOffer(room)}
            cellTitle={cell}
            opponents={opponents}
            lenderCash={me?.cash}
            onMove={(steps) => {
              if (!game.isMyTurn) return;
              void game.move(steps);
            }}
            onPass={() => {
              if (!game.isMyTurn && !canBid) return;
              void game.pass();
            }}
            onTaxi={() => {
              if (!game.isMyTurn || !selectedCarId || !canTaxi) return;
              void game.taxi(selectedCarId);
            }}
            onBuy={(carId) => {
              if (!game.isMyTurn) return;
              void game.buy(carId);
            }}
            onRent={() => {
              if (!game.isMyTurn) return;
              void game.rent();
            }}
            onStartAuction={() => {
              if (!game.isMyTurn) return;
              void game.sendIntent({ type: 'start_auction' });
            }}
            onLoanOffer={(offer) => {
              if (!game.isMyTurn) return;
              void game.loanOffer(offer.targetId, offer.principal, offer.due, offer.turns);
            }}
          />
        }
      />
      <AuctionModal
        auction={auction}
        players={room.players}
        myId={game.myId}
        timerExpiresAt={room.timerExpiresAt}
        updatedAt={room.updatedAt}
        error={game.error ? errorLabel(game.error) : null}
        onBid={(step) => {
          if (!canBid) return;
          void game.bid(step);
        }}
        onPass={() => {
          if (!canBid) return;
          void game.pass();
        }}
      />
    </div>
  );
}

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const devPlayerId = params.get('p') || '1';
  const roomId = params.get('room') || 'room1';
  if (params.get('mock') === '1') return <MockTable />;
  return <LiveTable devPlayerId={devPlayerId} roomId={roomId} />;
}
