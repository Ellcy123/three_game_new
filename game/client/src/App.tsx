import { useSocket } from './hooks/useSocket';
import { useBGM } from './hooks/useBGM';
import { Lobby } from './components/Lobby';
import { WaitingRoom } from './components/WaitingRoom';
import { GameScreen } from './components/GameScreen';
import HidingScreen from './components/HidingScreen';
import { TurtleSoupScreen } from './components/TurtleSoupScreen';
import StoryScreen from './components/StoryScreen';
import MouseKingScreen from './components/MouseKingScreen';
import ParrotScreen from './components/ParrotScreen';
import DeathScreen from './components/DeathScreen';
import EndingScreen from './components/EndingScreen';
import { ChatRoom } from './components/ChatRoom';
import { BGMControl } from './components/BGMControl';
import ItemSelectionModal from './components/ItemSelectionModal';
import { CursorOverlay, useCursorTracking } from './components/CursorOverlay';

function App() {
  const {
    isConnected,
    isReconnecting,
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
    clearEventResult,
    // 第二关
    currentLevel,
    hidingState,
    hidingAttackResult,
    levelStory,
    currentStoryIndex,
    hidingNextStory,
    hidingNextPhase,
    hidingSelectArea,
    hidingConfirmSelection,
    // 第三幕
    storyState,
    storyNextStory,
    storyNextPhase,
    storySelectBranch,
    storyMakeChoice,
    // BOSS战 - 鼠鼠大王
    bossState,
    bossAttackResult,
    bossSelectFighter,
    bossAttackHole,
    bossNextRound,
    bossStartBattle,
    // BOSS战 - 百变小鹦
    parrotState,
    parrotStartBattle,
    parrotSubmitAnswer,
    parrotNextRound,
    // BOSS战 - 死神
    deathState,
    diceSelectionNeeded,
    deathStartBattle,
    deathSetBet,
    deathSetChoice,
    deathConfirmBet,
    deathRoll,
    deathSetCustomDice,
    deathNextRound,
    // 结局
    endingId,
    // 海龟汤
    soupState,
    soupQuestionResult,
    clearSoupQuestionResult,
    soupNextStory,
    soupNextPhase,
    soupGoBack,
    soupAskQuestion,
    soupSubmitDeathCount,
    soupSubmitIsHuman,
    soupSubmitIdentity,
    soupConfirmIdentities,
    // 调试
    debugSkipToLevel3,
    debugSkipToBoss1,
    debugSkipToBoss2,
    debugSkipToBoss3,
    debugSkipToSoup,
    // 聊天室
    chatMessages,
    chatEnabled,
    chatDisableReason,
    sendChatMessage,
    // 光标同步
    remoteCursors,
    cursorEnabled,
    sendCursorPosition,
    // 敲击互动
    hammerCounts,
    shouldShake,
    hammerEffect,
    sendHammerHit,
    // 帮助功能
    forceAdvance,
    returnToLobby,
    restartGame,
    // 道具选择
    itemSelectionData,
    itemSelect,
    itemSkip
  } = useSocket();

  // 光标追踪 - 发送自己的鼠标位置
  useCursorTracking(sendCursorPosition, cursorEnabled && !!room);

  // 确定当前 BGM 关卡
  // 如果没有进入房间，使用 lobby；如果在等待房间，使用 waiting；否则使用 currentLevel
  const bgmLevel = !room ? 'lobby' : (!gameState ? 'waiting' : currentLevel);

  // BGM 控制
  const {
    isPlaying: bgmPlaying,
    isMuted: bgmMuted,
    volume: bgmVolume,
    toggleMute: toggleBgmMute,
    togglePlay: toggleBgmPlay,
    changeVolume: changeBgmVolume
  } = useBGM(bgmLevel);

  // 判断角色是否已揭示（海龟汤结束后）
  const characterRevealed = gameState?.players?.some(p => p.characterRevealed) ?? false;

  // 判断是否是房主
  const isHost = room?.players?.find(p => p.id === playerId)?.isHost ?? false;

  // 获取玩家列表（用于聊天室玩家面板）
  const chatPlayers = gameState?.players?.map(p => ({
    id: p.id,
    name: p.name,
    characterType: p.characterType,
    characterRevealed: p.characterRevealed
  })) ?? room?.players?.map(p => ({
    id: p.id,
    name: p.customName || p.name,
    characterType: undefined,
    characterRevealed: false
  })) ?? [];

  // 道具选择模态框（全局显示，优先级最高）
  const renderItemSelectionModal = () => {
    if (!itemSelectionData) return null;
    return (
      <ItemSelectionModal
        data={itemSelectionData}
        onSelect={(optionId) => itemSelect(itemSelectionData.itemId, optionId)}
        onSkip={() => itemSkip(itemSelectionData.itemId)}
        canSkip={itemSelectionData.selectionType !== 'time_machine'} // 时光机必须选择
      />
    );
  };

  // 渲染光标覆盖层（只在房间内显示）
  const renderCursorOverlay = () => {
    if (!playerId || !room) return null;
    return (
      <CursorOverlay
        playerId={playerId}
        remoteCursors={remoteCursors}
        enabled={cursorEnabled}
      />
    );
  };

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-sky-300 via-green-200 to-emerald-300">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-green-700">连接服务器中...</p>
        </div>
      </div>
    );
  }

  // 重连中
  if (isReconnecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-sky-300 via-green-200 to-emerald-300">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🔄</div>
          <p className="text-green-700 text-lg font-medium">正在恢复游戏...</p>
          <p className="text-green-600 text-sm mt-2">请稍候</p>
        </div>
      </div>
    );
  }

  // 结局画面
  if (currentLevel === 'ending' && endingId && playerId) {
    return (
      <>
        {renderCursorOverlay()}
        {renderItemSelectionModal()}
        <WithChat
          chatMessages={chatMessages}
          playerId={playerId}
          roomId={room?.id}
          chatEnabled={chatEnabled}
          chatDisableReason={chatDisableReason}
          characterRevealed={characterRevealed}
          sendChatMessage={sendChatMessage}
          onForceAdvance={forceAdvance}
          onReturnToLobby={returnToLobby}
          bgmPlaying={bgmPlaying}
          bgmMuted={bgmMuted}
          bgmVolume={bgmVolume}
          onToggleBgmMute={toggleBgmMute}
          onToggleBgmPlay={toggleBgmPlay}
          onChangeBgmVolume={changeBgmVolume}
          players={chatPlayers}
          hammerCounts={hammerCounts}
          hammerEffect={hammerEffect}
          shouldShake={shouldShake}
          onHammerHit={sendHammerHit}
        >
          <EndingScreen
            endingId={endingId}
            onRestart={restartGame}
            onMainMenu={returnToLobby}
          />
        </WithChat>
      </>
    );
  }

  // BOSS战 - 死神
  if (currentLevel === 'boss3' && playerId) {
    // 等待 deathState 加载
    if (!deathState) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-purple-200 via-violet-100 to-indigo-100">
          <div className="text-center">
            <div className="text-6xl mb-4 animate-bounce">💀</div>
            <p className="text-purple-700 text-lg font-medium">正在进入BOSS战...</p>
          </div>
        </div>
      );
    }
    return (
      <>
        {renderCursorOverlay()}
        {renderItemSelectionModal()}
        <WithChat
          chatMessages={chatMessages}
          playerId={playerId}
          roomId={room?.id}
          chatEnabled={chatEnabled}
          chatDisableReason={chatDisableReason}
          characterRevealed={characterRevealed}
          chatTheme="light"
          sendChatMessage={sendChatMessage}
          onForceAdvance={forceAdvance}
          onReturnToLobby={returnToLobby}
          bgmPlaying={bgmPlaying}
          bgmMuted={bgmMuted}
          bgmVolume={bgmVolume}
          onToggleBgmMute={toggleBgmMute}
          onToggleBgmPlay={toggleBgmPlay}
          onChangeBgmVolume={changeBgmVolume}
          players={chatPlayers}
          hammerCounts={hammerCounts}
          hammerEffect={hammerEffect}
          shouldShake={shouldShake}
          onHammerHit={sendHammerHit}
        >
          <DeathScreen
            playerId={playerId}
            state={deathState}
            onStartBattle={deathStartBattle}
            onSetBet={deathSetBet}
            onSetChoice={deathSetChoice}
            onConfirmBet={deathConfirmBet}
            onRoll={deathRoll}
            onNextRound={deathNextRound}
            onSetCustomDice={deathSetCustomDice}
            diceSelectionNeeded={diceSelectionNeeded}
          />
        </WithChat>
      </>
    );
  }

  // BOSS战 - 百变小鹦
  if (currentLevel === 'boss2' && playerId) {
    // 等待 parrotState 加载
    if (!parrotState) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-green-200 via-emerald-100 to-teal-100">
          <div className="text-center">
            <div className="text-6xl mb-4 animate-bounce">🦜</div>
            <p className="text-emerald-700 text-lg font-medium">正在进入BOSS战...</p>
          </div>
        </div>
      );
    }
    return (
      <>
        {renderCursorOverlay()}
        {renderItemSelectionModal()}
        <WithChat
          chatMessages={chatMessages}
          playerId={playerId}
          roomId={room?.id}
          chatEnabled={chatEnabled}
          chatDisableReason={chatDisableReason}
          characterRevealed={characterRevealed}
          chatTheme="light"
          sendChatMessage={sendChatMessage}
          onForceAdvance={forceAdvance}
          onReturnToLobby={returnToLobby}
          bgmPlaying={bgmPlaying}
          bgmMuted={bgmMuted}
          bgmVolume={bgmVolume}
          onToggleBgmMute={toggleBgmMute}
          onToggleBgmPlay={toggleBgmPlay}
          onChangeBgmVolume={changeBgmVolume}
          players={chatPlayers}
          hammerCounts={hammerCounts}
          hammerEffect={hammerEffect}
          shouldShake={shouldShake}
          onHammerHit={sendHammerHit}
        >
          <ParrotScreen
            playerId={playerId}
            state={parrotState}
            onStartBattle={parrotStartBattle}
            onSubmitAnswer={parrotSubmitAnswer}
            onNextRound={parrotNextRound}
          />
        </WithChat>
      </>
    );
  }

  // BOSS战 - 鼠鼠大王
  if (currentLevel === 'boss1' && playerId) {
    // 等待 bossState 加载
    if (!bossState) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-200 via-yellow-100 to-orange-100">
          <div className="text-center">
            <div className="text-6xl mb-4 animate-bounce">🐀</div>
            <p className="text-amber-700 text-lg font-medium">正在进入BOSS战...</p>
          </div>
        </div>
      );
    }
    return (
      <>
        {renderCursorOverlay()}
        {renderItemSelectionModal()}
        <WithChat
          chatMessages={chatMessages}
          playerId={playerId}
          roomId={room?.id}
          chatEnabled={chatEnabled}
          chatDisableReason={chatDisableReason}
          characterRevealed={characterRevealed}
          chatTheme="light"
          sendChatMessage={sendChatMessage}
          onForceAdvance={forceAdvance}
          onReturnToLobby={returnToLobby}
          bgmPlaying={bgmPlaying}
          bgmMuted={bgmMuted}
          bgmVolume={bgmVolume}
          onToggleBgmMute={toggleBgmMute}
          onToggleBgmPlay={toggleBgmPlay}
          onChangeBgmVolume={changeBgmVolume}
          players={chatPlayers}
          hammerCounts={hammerCounts}
          hammerEffect={hammerEffect}
          shouldShake={shouldShake}
          onHammerHit={sendHammerHit}
        >
          <MouseKingScreen
            playerId={playerId}
            state={bossState}
            onSelectFighter={bossSelectFighter}
            onAttackHole={bossAttackHole}
            onNextRound={bossNextRound}
            onStartBattle={bossStartBattle}
            lastResult={bossAttackResult}
          />
        </WithChat>
      </>
    );
  }

  // 第三幕 - 个人剧情
  if (currentLevel === 'level3' && storyState && playerId && gameState) {
    return (
      <>
        {renderCursorOverlay()}
        <WithChat
          chatMessages={chatMessages}
          playerId={playerId}
          roomId={room?.id}
          chatEnabled={chatEnabled}
        chatDisableReason={chatDisableReason}
        characterRevealed={characterRevealed}
        chatTheme="light"
        sendChatMessage={sendChatMessage}
        onForceAdvance={forceAdvance}
        onReturnToLobby={returnToLobby}
        bgmPlaying={bgmPlaying}
        bgmMuted={bgmMuted}
        bgmVolume={bgmVolume}
        onToggleBgmMute={toggleBgmMute}
        onToggleBgmPlay={toggleBgmPlay}
        onChangeBgmVolume={changeBgmVolume}
        players={chatPlayers}
        hammerCounts={hammerCounts}
        hammerEffect={hammerEffect}
        shouldShake={shouldShake}
        onHammerHit={sendHammerHit}
      >
        <StoryScreen
          playerId={playerId}
          players={gameState.players.map(p => ({ id: p.id, name: p.name, health: p.health }))}
          storyState={storyState}
          onNextStory={storyNextStory}
          onSelectBranch={storySelectBranch}
          onMakeChoice={storyMakeChoice}
          onNextPhase={storyNextPhase}
        />
      </WithChat>
      </>
    );
  }

  // 海龟汤关卡
  if (currentLevel === 'turtle-soup' && soupState && playerId) {
    return (
      <>
        {renderCursorOverlay()}
        <WithChat
          chatMessages={chatMessages}
          playerId={playerId}
          roomId={room?.id}
        chatEnabled={chatEnabled}
        chatDisableReason={chatDisableReason}
        characterRevealed={characterRevealed}
        sendChatMessage={sendChatMessage}
        onForceAdvance={forceAdvance}
        onReturnToLobby={returnToLobby}
        bgmPlaying={bgmPlaying}
        bgmMuted={bgmMuted}
        bgmVolume={bgmVolume}
        onToggleBgmMute={toggleBgmMute}
        onToggleBgmPlay={toggleBgmPlay}
        onChangeBgmVolume={changeBgmVolume}
        players={chatPlayers}
        hammerCounts={hammerCounts}
        hammerEffect={hammerEffect}
        shouldShake={shouldShake}
        onHammerHit={sendHammerHit}
      >
        <TurtleSoupScreen
          soupState={soupState}
          playerId={playerId}
          questionResult={soupQuestionResult}
          isHost={isHost}
          onClearQuestionResult={clearSoupQuestionResult}
          onNextStory={soupNextStory}
          onNextPhase={soupNextPhase}
          onGoBack={soupGoBack}
          onAskQuestion={soupAskQuestion}
          onSubmitDeathCount={soupSubmitDeathCount}
          onSubmitIsHuman={soupSubmitIsHuman}
          onSubmitIdentity={soupSubmitIdentity}
          onConfirmIdentities={soupConfirmIdentities}
        />
      </WithChat>
      </>
    );
  }

  // 第二关 - 藏匿
  if (currentLevel === 'level2' && hidingState && playerId && room) {
    return (
      <>
        {renderCursorOverlay()}
        <WithChat
          chatMessages={chatMessages}
          playerId={playerId}
          roomId={room.id}
          chatEnabled={chatEnabled}
          chatDisableReason={chatDisableReason}
          characterRevealed={characterRevealed}
          sendChatMessage={sendChatMessage}
          onForceAdvance={forceAdvance}
          onReturnToLobby={returnToLobby}
          bgmPlaying={bgmPlaying}
          bgmMuted={bgmMuted}
        bgmVolume={bgmVolume}
        onToggleBgmMute={toggleBgmMute}
        onToggleBgmPlay={toggleBgmPlay}
        onChangeBgmVolume={changeBgmVolume}
        players={chatPlayers}
        hammerCounts={hammerCounts}
        hammerEffect={hammerEffect}
        shouldShake={shouldShake}
        onHammerHit={sendHammerHit}
      >
        <HidingScreen
          roomId={room.id}
          playerId={playerId}
          players={hidingState.players}
          isHost={isHost}
          hidingState={hidingState}
          storyTexts={levelStory}
          currentStoryIndex={currentStoryIndex}
          attackResult={hidingAttackResult}
          onSelectArea={hidingSelectArea}
          onConfirmSelection={hidingConfirmSelection}
          onNextStory={hidingNextStory}
          onNextPhase={hidingNextPhase}
        />
      </WithChat>
      </>
    );
  }

  // 第一关 - 密室
  if (gameState && playerId) {
    return (
      <>
        {renderCursorOverlay()}
        <WithChat
          chatMessages={chatMessages}
          playerId={playerId}
          roomId={room?.id}
          chatEnabled={chatEnabled}
          chatDisableReason={chatDisableReason}
          characterRevealed={characterRevealed}
          sendChatMessage={sendChatMessage}
          onForceAdvance={forceAdvance}
          onReturnToLobby={returnToLobby}
          bgmPlaying={bgmPlaying}
          bgmMuted={bgmMuted}
          bgmVolume={bgmVolume}
          onToggleBgmMute={toggleBgmMute}
          onToggleBgmPlay={toggleBgmPlay}
          onChangeBgmVolume={changeBgmVolume}
          debugActions={{
            skipToBoss1: debugSkipToBoss1,
            skipToBoss2: debugSkipToBoss2,
            skipToBoss3: debugSkipToBoss3,
            skipToSoup: debugSkipToSoup,
          skipToLevel3: debugSkipToLevel3
        }}
        players={chatPlayers}
        hammerCounts={hammerCounts}
        hammerEffect={hammerEffect}
        shouldShake={shouldShake}
        onHammerHit={sendHammerHit}
      >
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
      </WithChat>
      </>
    );
  }

  // 等待房间
  if (room && playerId) {
    return (
      <>
        {renderCursorOverlay()}
        <WithChat
          chatMessages={chatMessages}
          playerId={playerId}
          roomId={room.id}
          chatEnabled={chatEnabled}
          chatDisableReason={chatDisableReason}
          characterRevealed={characterRevealed}
          sendChatMessage={sendChatMessage}
          onForceAdvance={forceAdvance}
          onReturnToLobby={returnToLobby}
          bgmPlaying={bgmPlaying}
          bgmMuted={bgmMuted}
          bgmVolume={bgmVolume}
          onToggleBgmMute={toggleBgmMute}
          onToggleBgmPlay={toggleBgmPlay}
          onChangeBgmVolume={changeBgmVolume}
          debugActions={{
            skipToBoss1: debugSkipToBoss1,
            skipToBoss2: debugSkipToBoss2,
            skipToBoss3: debugSkipToBoss3,
            skipToSoup: debugSkipToSoup,
            skipToLevel3: debugSkipToLevel3
          }}
          players={chatPlayers}
          hammerCounts={hammerCounts}
          hammerEffect={hammerEffect}
          shouldShake={shouldShake}
          onHammerHit={sendHammerHit}
        >
          <WaitingRoom
            room={room}
            playerId={playerId}
          canStart={canStart}
          onReady={setReady}
          onStartGame={startGame}
          onLeave={leaveRoom}
        />
      </WithChat>
      </>
    );
  }

  // 大厅
  return (
    <>
      <Lobby onCreateRoom={createRoom} onJoinRoom={joinRoom} />
      <BGMControl
        isPlaying={bgmPlaying}
        isMuted={bgmMuted}
        volume={bgmVolume}
        onToggleMute={toggleBgmMute}
        onTogglePlay={toggleBgmPlay}
        onVolumeChange={changeBgmVolume}
      />
    </>
  );
}

// 带聊天室的布局包装器 - 右侧侧边栏布局
function WithChat({
  children,
  chatMessages,
  playerId,
  roomId,
  chatEnabled,
  chatDisableReason,
  characterRevealed,
  chatTheme = 'dark',
  sendChatMessage,
  onForceAdvance,
  onReturnToLobby,
  bgmPlaying,
  bgmMuted,
  bgmVolume,
  onToggleBgmMute,
  onToggleBgmPlay,
  onChangeBgmVolume,
  debugActions,
  players,
  hammerCounts,
  hammerEffect,
  shouldShake,
  onHammerHit
}: {
  children: React.ReactNode;
  chatMessages: any[];
  playerId: string;
  roomId?: string;
  chatEnabled: boolean;
  chatDisableReason?: string;
  characterRevealed?: boolean;
  chatTheme?: 'dark' | 'light';
  sendChatMessage: (content: string) => void;
  onForceAdvance?: () => void;
  onReturnToLobby?: () => void;
  bgmPlaying?: boolean;
  bgmMuted?: boolean;
  bgmVolume?: number;
  onToggleBgmMute?: () => void;
  onToggleBgmPlay?: () => void;
  onChangeBgmVolume?: (volume: number) => void;
  debugActions?: {
    skipToBoss1?: () => void;
    skipToBoss2?: () => void;
    skipToBoss3?: () => void;
    skipToSoup?: () => void;
    skipToLevel3?: () => void;
  };
  players?: Array<{
    id: string;
    name: string;
    characterType?: string;
    characterRevealed?: boolean;
  }>;
  hammerCounts?: Record<string, number>;
  hammerEffect?: string | null;
  shouldShake?: boolean;
  onHammerHit?: (targetPlayerId: string) => void;
}) {
  return (
    <div className={`min-h-screen pr-80 ${shouldShake ? 'animate-shake' : ''}`}>
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10% { transform: translateX(-8px); }
          20% { transform: translateX(8px); }
          30% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          50% { transform: translateX(-4px); }
          60% { transform: translateX(4px); }
          70% { transform: translateX(-2px); }
          80% { transform: translateX(2px); }
          90% { transform: translateX(-1px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
      {children}
      <ChatRoom
        messages={chatMessages}
        playerId={playerId}
        roomId={roomId}
        enabled={chatEnabled}
        disableReason={chatDisableReason}
        characterRevealed={characterRevealed}
        theme={chatTheme}
        players={players}
        hammerCounts={hammerCounts}
        hammerEffect={hammerEffect}
        onHammerHit={onHammerHit}
        onSendMessage={sendChatMessage}
        onForceAdvance={onForceAdvance}
        onReturnToLobby={onReturnToLobby}
        debugActions={debugActions}
      />
      {/* BGM 控制 */}
      {onToggleBgmMute && onToggleBgmPlay && onChangeBgmVolume && (
        <BGMControl
          isPlaying={bgmPlaying ?? false}
          isMuted={bgmMuted ?? false}
          volume={bgmVolume ?? 0.3}
          onToggleMute={onToggleBgmMute}
          onTogglePlay={onToggleBgmPlay}
          onVolumeChange={onChangeBgmVolume}
        />
      )}
    </div>
  );
}

export default App;
