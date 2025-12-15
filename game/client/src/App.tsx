import { useSocket } from './hooks/useSocket';
import { Lobby } from './components/Lobby';
import { WaitingRoom } from './components/WaitingRoom';
import { GameScreen } from './components/GameScreen';

function App() {
  const {
    isConnected,
    room,
    gameState,
    eventResult,
    error,
    playerId,
    canStart,
    createRoom,
    joinRoom,
    leaveRoom,
    setReady,
    startGame,
    sendAction,
    sendPassword,
    sendChoice,
    revivePlayer,
    clearError,
    clearEventResult
  } = useSocket();

  // 显示错误提示
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="bg-red-900/50 border border-red-500 p-6 rounded-lg max-w-md">
          <h2 className="text-red-400 font-bold mb-2">错误</h2>
          <p className="text-white mb-4">{error}</p>
          <button
            onClick={clearError}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg"
          >
            确定
          </button>
        </div>
      </div>
    );
  }

  // 连接中
  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-gray-400">连接服务器中...</p>
        </div>
      </div>
    );
  }

  // 游戏进行中
  if (gameState && playerId) {
    return (
      <GameScreen
        gameState={gameState}
        playerId={playerId}
        eventResult={eventResult}
        onAction={sendAction}
        onPassword={sendPassword}
        onChoice={sendChoice}
        onRevive={revivePlayer}
        onClearResult={clearEventResult}
      />
    );
  }

  // 等待房间
  if (room && playerId) {
    return (
      <WaitingRoom
        room={room}
        playerId={playerId}
        canStart={canStart}
        onReady={setReady}
        onStartGame={startGame}
        onLeave={leaveRoom}
      />
    );
  }

  // 大厅
  return <Lobby onCreateRoom={createRoom} onJoinRoom={joinRoom} />;
}

export default App;
