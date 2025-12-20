import { useState, useRef, useCallback } from 'react';

interface TurtleSoupScreenProps {
  soupState: any;
  playerId: string;
  questionResult: any;
  isHost?: boolean; // 是否是房主
  onClearQuestionResult: () => void;
  onNextStory: () => void;
  onNextPhase: () => void;
  onGoBack: () => void;
  onAskQuestion: (keywordId: string, questionId: string) => void;
  onSubmitDeathCount: (answer: string) => void;
  onSubmitIsHuman: (answer: string) => void;
  onSubmitIdentity: (animalId: string) => void;
  onConfirmIdentities: () => void;
}

// 通用背景样式
const bgClass = "min-h-screen bg-gradient-to-b from-indigo-900 via-purple-900 to-slate-900";

export function TurtleSoupScreen({
  soupState,
  playerId,
  questionResult,
  isHost = false,
  onClearQuestionResult,
  onNextStory,
  onNextPhase,
  onGoBack,
  onAskQuestion,
  onSubmitDeathCount,
  onSubmitIsHuman,
  onSubmitIdentity,
  onConfirmIdentities
}: TurtleSoupScreenProps) {
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);
  const [selectedDeathCount, setSelectedDeathCount] = useState<string | null>(null);
  const [selectedIsHuman, setSelectedIsHuman] = useState<string | null>(null);
  
  // 防抖：防止按钮被多次点击
  const lastClickRef = useRef<number>(0);
  const debounceClick = useCallback((callback: () => void, delay: number = 500) => {
    const now = Date.now();
    if (now - lastClickRef.current < delay) return;
    lastClickRef.current = now;
    callback();
  }, []);

  if (!soupState) return <div className={`${bgClass} flex items-center justify-center`}>
    <div className="text-center">
      <span className="text-4xl animate-spin inline-block">🐸</span>
      <p className="text-purple-200 mt-4">加载中...</p>
    </div>
  </div>;

  const { phase, storyIndex, players, keywords, config, results } = soupState;
  const myPlayer = players?.find((p: any) => p.playerId === playerId);


  // 渲染开场剧情
  const renderOpeningStory = () => {
    const stories = config?.openingStory || [];
    return (
      <div className={`${bgClass} flex flex-col items-center justify-center p-8`}>
        <div className="max-w-2xl text-center bg-white/10 backdrop-blur-sm rounded-3xl p-8 border-2 border-purple-400">
          <span className="text-5xl mb-6 block">🌙</span>
          <div className="mb-8">
            {stories.slice(0, storyIndex + 1).map((text: string, i: number) => (
              <p key={i} className="text-xl text-purple-100 mb-4 animate-fade-in leading-relaxed">
                {text}
              </p>
            ))}
          </div>
          {isHost ? (
            <button
              onClick={() => debounceClick(storyIndex < stories.length - 1 ? onNextStory : onNextPhase)}
              className="px-8 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 
                        hover:from-purple-600 hover:to-indigo-600
                        text-white rounded-2xl text-lg font-semibold
                        shadow-lg hover:shadow-xl hover:scale-105 transition-all
                        flex items-center gap-2 mx-auto"
            >
              <span>{storyIndex < stories.length - 1 ? '继续' : '进入记忆'}</span>
              <span>▶</span>
            </button>
          ) : (
            <div className="text-purple-300 text-sm flex items-center justify-center gap-2">
              <span className="animate-pulse">⏳</span>
              <span>等待房主操作...</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // 渲染记忆介绍
  const renderMemoryIntro = () => {
    const stories = config?.memoryIntro || [];
    return (
      <div className={`${bgClass} flex flex-col items-center justify-center p-8`}>
        <div className="max-w-2xl text-center bg-white/10 backdrop-blur-sm rounded-3xl p-8 border-2 border-indigo-400">
          <span className="text-5xl mb-6 block">💭</span>
          <div className="mb-8">
            {stories.slice(0, storyIndex + 1).map((text: string, i: number) => (
              <p key={i} className="text-xl text-indigo-200 mb-4 italic animate-fade-in leading-relaxed">
                {text}
              </p>
            ))}
          </div>
          {isHost ? (
            <button
              onClick={() => debounceClick(storyIndex < stories.length - 1 ? onNextStory : onNextPhase)}
              className="px-8 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 
                        hover:from-indigo-600 hover:to-purple-600
                        text-white rounded-2xl text-lg font-semibold
                        shadow-lg hover:shadow-xl hover:scale-105 transition-all
                        flex items-center gap-2 mx-auto"
            >
              <span>{storyIndex < stories.length - 1 ? '继续' : '查看规则'}</span>
              <span>▶</span>
            </button>
          ) : (
            <div className="text-indigo-300 text-sm flex items-center justify-center gap-2">
              <span className="animate-pulse">⏳</span>
              <span>等待房主操作...</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // 渲染规则说明
  const renderRules = () => (
    <div className={`${bgClass} flex flex-col items-center justify-center p-8`}>
      <div className="max-w-xl bg-white/10 backdrop-blur-sm rounded-3xl p-8 border-2 border-amber-400">
        <h2 className="text-2xl font-bold text-center mb-6 text-amber-300 flex items-center justify-center gap-2">
          <span>🐸</span>
          <span>记忆回溯 - 海龟汤</span>
          <span>🍜</span>
        </h2>
        <p className="text-purple-200 mb-4 text-center">一段混乱的记忆浮现在眼前...</p>
        <p className="text-purple-200 mb-6 text-center">这段记忆似乎不属于一个人...</p>
        <div className="border-t border-purple-500/50 pt-4 mb-6">
          <h3 className="text-amber-300 font-bold mb-3 flex items-center gap-2">
            <span>📜</span>
            <span>规则说明</span>
          </h3>
          <ul className="text-purple-100 space-y-2">
            <li className="flex items-start gap-2"><span>💡</span><span>点击高亮的【关键词】进行提问（仅房主可操作）</span></li>
            <li className="flex items-start gap-2"><span>❓</span><span>从3个问题中选择1个提问</span></li>
            <li className="flex items-start gap-2"><span>✅</span><span>系统会回答 YES 或 NO</span></li>
            <li className="flex items-start gap-2 text-green-300"><span>🎁</span><span>每人有 10 次免费提问机会</span></li>
            <li className="flex items-start gap-2 text-red-300"><span>💔</span><span>超出后每次提问消耗 1 点生命值</span></li>
            <li className="flex items-start gap-2"><span>🎯</span><span>提问结束后需要回答三个问题</span></li>
            <li className="flex items-start gap-2 text-red-300"><span>⚠️</span><span>答错会扣除生命值</span></li>
          </ul>
        </div>
        {isHost ? (
          <button
            onClick={() => debounceClick(onNextPhase)}
            className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 
                      hover:from-amber-600 hover:to-orange-600
                      text-white rounded-2xl text-lg font-bold
                      shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all
                      flex items-center justify-center gap-2"
          >
            <span>🔮</span>
            <span>开始回溯</span>
          </button>
        ) : (
          <div className="text-amber-300 text-sm flex items-center justify-center gap-2 py-3">
            <span className="animate-pulse">⏳</span>
            <span>等待房主开始...</span>
          </div>
        )}
      </div>
    </div>
  );


  // 渲染提问阶段
  const renderQuestioning = () => {
    const storyText = config?.storyText || '';
    const keywordConfigs = config?.keywords || [];

    const renderStoryWithKeywords = () => {
      const parts = storyText.split(/【([^】]+)】/);
      return parts.map((part: string, index: number) => {
        if (index % 2 === 1) {
          const kwConfig = keywordConfigs.find((k: any) => k.text === part);
          const kwState = keywords?.find((k: any) => k.text === part);
          if (kwConfig && kwState) {
            const canClick = isHost && !kwState.isAsked;
            return (
              <span
                key={index}
                onClick={() => canClick && setSelectedKeyword(kwConfig.id)}
                className={`px-1 rounded-lg transition-all ${
                  kwState.isAsked
                    ? 'text-gray-500 line-through cursor-not-allowed bg-gray-700/30'
                    : canClick
                      ? 'cursor-pointer text-amber-300 hover:bg-amber-400/20 font-bold border-b-2 border-amber-400'
                      : 'text-amber-300 font-bold border-b-2 border-amber-400 cursor-default'
                }`}
              >
                【{part}】
                {kwState.isAsked && <span className="text-xs ml-1">✓</span>}
              </span>
            );
          }
        }
        return <span key={index}>{part}</span>;
      });
    };

    return (
      <div className={`${bgClass} flex flex-col`}>
        {/* 顶部状态栏 */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 border-b-4 border-amber-400 shadow-lg">
          <div className="max-w-4xl mx-auto flex justify-between items-center">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span>💭</span>
              <span>混沌的记忆</span>
            </h2>
            <div className="flex gap-4">
              {players?.map((p: any) => (
                <div key={p.playerId} className="bg-white/20 px-3 py-1 rounded-full text-sm">
                  <span className={p.playerId === playerId ? 'text-amber-300 font-bold' : 'text-white'}>
                    {p.playerId === playerId ? '你' : `玩家`}
                  </span>
                  <span className="text-white ml-2">
                    剩余: <span className={p.freeQuestions > 0 ? 'text-green-300' : 'text-red-300'}>
                      {p.freeQuestions}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 主内容区 */}
        <div className="flex-1 p-8 max-w-4xl mx-auto w-full">
          <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-6 mb-6 border-2 border-purple-400">
            <p className="text-lg text-purple-100 leading-relaxed">
              {renderStoryWithKeywords()}
            </p>
          </div>

          <div className="text-center text-purple-300 mb-4 flex items-center justify-center gap-2">
            <span>💡</span>
            <span>{isHost ? '点击【高亮词语】进行提问' : '房主正在操作，请一起讨论...'}</span>
          </div>

          {isHost ? (
            <button
              onClick={() => debounceClick(onNextPhase)}
              className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-500 
                        hover:from-green-600 hover:to-emerald-600
                        text-white rounded-2xl text-lg font-bold
                        shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all
                        flex items-center justify-center gap-2"
            >
              <span>📝</span>
              <span>提交答案</span>
            </button>
          ) : (
            <div className="text-green-300 text-sm flex items-center justify-center gap-2 py-3">
              <span className="animate-pulse">⏳</span>
              <span>等待房主提交...</span>
            </div>
          )}
        </div>

        {selectedKeyword && (
          <KeywordModal
            keywordId={selectedKeyword}
            keywordConfigs={keywordConfigs}
            myFreeQuestions={myPlayer?.freeQuestions || 0}
            onSelect={(questionId) => {
              onAskQuestion(selectedKeyword, questionId);
              setSelectedKeyword(null);
            }}
            onClose={() => setSelectedKeyword(null)}
          />
        )}

        {questionResult && (
          <AnswerModal answer={questionResult.answer} onClose={onClearQuestionResult} />
        )}
      </div>
    );
  };

  // 渲染确认提交
  const renderConfirmSubmit = () => (
    <div className={`${bgClass} flex items-center justify-center p-8`}>
      <div className="max-w-md bg-white/10 backdrop-blur-sm rounded-3xl p-8 border-2 border-amber-400">
        <h2 className="text-xl font-bold text-amber-300 text-center mb-6 flex items-center justify-center gap-2">
          <span>⚠️</span>
          <span>确认提交</span>
        </h2>
        <p className="text-purple-200 text-center mb-6">一旦提交，无法返回继续提问！</p>
        <p className="text-purple-200 text-center mb-8">你们准备好揭示真相了吗？</p>
        {isHost ? (
          <div className="flex gap-4">
            <button
              onClick={() => debounceClick(onGoBack)}
              className="flex-1 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded-2xl
                        transition-all hover:scale-[1.02]"
            >
              返回继续提问
            </button>
            <button
              onClick={() => debounceClick(onNextPhase)}
              className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-500 
                        hover:from-amber-600 hover:to-orange-600
                        text-white font-bold rounded-2xl
                        shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all"
            >
              确认提交
            </button>
          </div>
        ) : (
          <div className="text-amber-300 text-sm flex items-center justify-center gap-2 py-3">
            <span className="animate-pulse">⏳</span>
            <span>等待房主确认...</span>
          </div>
        )}
      </div>
    </div>
  );


  // 渲染死亡人数问题
  const renderDeathCountQuestion = () => {
    const options = config?.finalQuestions?.deathCount?.options || ['0', '1', '2', '3'];
    return (
      <div className={`${bgClass} flex items-center justify-center p-8`}>
        <div className="max-w-lg bg-white/10 backdrop-blur-sm rounded-3xl p-8 border-2 border-purple-400">
          <h2 className="text-xl font-bold text-purple-300 text-center mb-6 flex items-center justify-center gap-2">
            <span>💀</span>
            <span>问题1：死亡的有几个角色？</span>
          </h2>
          <p className="text-purple-200 text-center mb-6">在这段记忆中，有几个角色死亡了？</p>
          {!isHost && (
            <p className="text-amber-300 text-sm text-center mb-4">（房主正在选择答案）</p>
          )}
          <div className="grid grid-cols-4 gap-4 mb-6">
            {options.map((opt: string) => (
              <button
                key={opt}
                onClick={() => isHost && setSelectedDeathCount(opt)}
                disabled={!isHost}
                className={`py-4 rounded-2xl text-2xl font-bold transition-all ${
                  selectedDeathCount === opt
                    ? 'bg-gradient-to-b from-purple-500 to-indigo-500 text-white shadow-lg scale-105'
                    : isHost
                      ? 'bg-white/10 text-purple-200 hover:bg-white/20 border border-purple-400'
                      : 'bg-white/10 text-purple-200 border border-purple-400 cursor-not-allowed'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
          {isHost ? (
            <button
              onClick={() => selectedDeathCount && debounceClick(() => onSubmitDeathCount(selectedDeathCount))}
              disabled={!selectedDeathCount}
              className="w-full py-3 bg-gradient-to-r from-purple-500 to-indigo-500 
                        hover:from-purple-600 hover:to-indigo-600
                        disabled:from-gray-600 disabled:to-gray-700
                        text-white rounded-2xl font-bold transition-all"
            >
              确认答案
            </button>
          ) : (
            <div className="text-purple-300 text-sm flex items-center justify-center gap-2 py-3">
              <span className="animate-pulse">⏳</span>
              <span>等待房主选择...</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // 渲染是否人类问题
  const renderIsHumanQuestion = () => {
    const options = config?.finalQuestions?.isHuman?.options || ['是', '否'];
    return (
      <div className={`${bgClass} flex items-center justify-center p-8`}>
        <div className="max-w-lg bg-white/10 backdrop-blur-sm rounded-3xl p-8 border-2 border-purple-400">
          <h2 className="text-xl font-bold text-purple-300 text-center mb-6 flex items-center justify-center gap-2">
            <span>🧑</span>
            <span>问题2：你们是人类吗？</span>
          </h2>
          <p className="text-purple-200 text-center mb-6">记忆中的"我"，是人类吗？</p>
          {results?.deathCountCorrect !== null && (
            <div className={`mb-4 p-3 rounded-2xl text-center ${
              results.deathCountCorrect ? 'bg-green-500/20 text-green-300 border border-green-400' : 'bg-red-500/20 text-red-300 border border-red-400'
            }`}>
              问题1: {results.deathCountCorrect ? '✓ 正确' : '✗ 错误（正确答案：3）'}
            </div>
          )}
          {!isHost && (
            <p className="text-amber-300 text-sm text-center mb-4">（房主正在选择答案）</p>
          )}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {options.map((opt: string) => (
              <button
                key={opt}
                onClick={() => isHost && setSelectedIsHuman(opt)}
                disabled={!isHost}
                className={`py-4 rounded-2xl text-xl font-bold transition-all ${
                  selectedIsHuman === opt
                    ? 'bg-gradient-to-b from-purple-500 to-indigo-500 text-white shadow-lg scale-105'
                    : isHost
                      ? 'bg-white/10 text-purple-200 hover:bg-white/20 border border-purple-400'
                      : 'bg-white/10 text-purple-200 border border-purple-400 cursor-not-allowed'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
          {isHost ? (
            <button
              onClick={() => selectedIsHuman && debounceClick(() => onSubmitIsHuman(selectedIsHuman))}
              disabled={!selectedIsHuman}
              className="w-full py-3 bg-gradient-to-r from-purple-500 to-indigo-500 
                        hover:from-purple-600 hover:to-indigo-600
                        disabled:from-gray-600 disabled:to-gray-700
                        text-white rounded-2xl font-bold transition-all"
            >
              确认答案
            </button>
          ) : (
            <div className="text-purple-300 text-sm flex items-center justify-center gap-2 py-3">
              <span className="animate-pulse">⏳</span>
              <span>等待房主选择...</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // 渲染身份选择问题
  const renderIdentityQuestion = () => {
    const animalOptions = config?.animalOptions || [];
    const mySelection = myPlayer?.selectedAnimal;
    return (
      <div className={`${bgClass} flex flex-col p-8`}>
        <div className="max-w-4xl mx-auto w-full">
          <h2 className="text-xl font-bold text-purple-300 text-center mb-4 flex items-center justify-center gap-2">
            <span>🐾</span>
            <span>问题3：你们分别是什么动物？</span>
          </h2>
          <p className="text-purple-200 text-center mb-2">请选择你认为自己的真实身份：</p>
          {results?.isHumanCorrect !== null && (
            <div className={`mb-4 p-3 rounded-2xl text-center ${
              results.isHumanCorrect ? 'bg-green-500/20 text-green-300 border border-green-400' : 'bg-red-500/20 text-red-300 border border-red-400'
            }`}>
              问题2: {results.isHumanCorrect ? '✓ 正确' : '✗ 错误（正确答案：否）'}
            </div>
          )}
          
          <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-4 mb-4 border border-purple-400">
            <div className="grid grid-cols-6 gap-2">
              {animalOptions.map((animal: any) => (
                <button
                  key={animal.id}
                  onClick={() => onSubmitIdentity(animal.id)}
                  className={`p-3 rounded-2xl text-center transition-all ${
                    mySelection === animal.id
                      ? 'bg-gradient-to-b from-purple-500 to-indigo-500 ring-2 ring-amber-400 scale-105'
                      : 'bg-white/10 hover:bg-white/20 border border-purple-400/50'
                  }`}
                >
                  <div className="text-2xl">{animal.icon}</div>
                  <div className="text-xs text-purple-200">{animal.name}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-4 mb-4 border border-purple-400">
            <h3 className="text-purple-300 mb-2">当前选择：</h3>
            {players?.map((p: any) => {
              const animal = animalOptions.find((a: any) => a.id === p.selectedAnimal);
              return (
                <div key={p.playerId} className="flex items-center gap-2 mb-1">
                  <span className={p.playerId === playerId ? 'text-amber-300' : 'text-purple-200'}>
                    {p.playerId === playerId ? '你' : '玩家'}:
                  </span>
                  <span className="text-white">
                    {animal ? `${animal.icon} ${animal.name}` : '[未选择]'}
                  </span>
                </div>
              );
            })}
          </div>

          {isHost ? (
            <button
              onClick={() => debounceClick(onConfirmIdentities)}
              disabled={!players?.every((p: any) => p.selectedAnimal)}
              className="w-full py-3 bg-gradient-to-r from-purple-500 to-indigo-500 
                        hover:from-purple-600 hover:to-indigo-600
                        disabled:from-gray-600 disabled:to-gray-700
                        text-white rounded-2xl font-bold transition-all"
            >
              确认所有选择
            </button>
          ) : (
            <div className="text-purple-300 text-sm flex items-center justify-center gap-2 py-3">
              <span className="animate-pulse">⏳</span>
              <span>等待房主确认...</span>
            </div>
          )}
        </div>
      </div>
    );
  };


  // 渲染揭示阶段
  const renderRevelation = () => {
    const revelation = config?.revelation;
    if (!revelation) return null;

    switch (phase) {
      case 'revelation_intro':
        return (
          <div className={`${bgClass} flex items-center justify-center p-8`}>
            <div className="max-w-2xl text-center bg-white/10 backdrop-blur-sm rounded-3xl p-8 border-2 border-amber-400">
              <span className="text-6xl mb-6 block">✨</span>
              <h2 className="text-3xl font-bold text-amber-300 mb-6">{revelation.title}</h2>
              <p className="text-xl text-purple-200 whitespace-pre-line mb-8">{revelation.subtitle}</p>
              {isHost ? (
                <button
                  onClick={() => debounceClick(onNextPhase)}
                  className="px-8 py-3 bg-gradient-to-r from-amber-500 to-orange-500 
                            hover:from-amber-600 hover:to-orange-600
                            text-white rounded-2xl text-lg font-semibold
                            shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                >
                  揭示真相
                </button>
              ) : (
                <div className="text-amber-300 text-sm flex items-center justify-center gap-2">
                  <span className="animate-pulse">⏳</span>
                  <span>等待房主操作...</span>
                </div>
              )}
            </div>
          </div>
        );

      case 'revelation_turtle':
      case 'revelation_dog':
      case 'revelation_cat':
        const storyKey = phase.replace('revelation_', '');
        const story = revelation.stories.find((s: any) => s.character === storyKey);
        if (!story) return null;
        const charEmoji = storyKey === 'turtle' ? '🐸' : storyKey === 'dog' ? '🐶' : '😺';

        return (
          <div className={`${bgClass} flex items-center justify-center p-8`}>
            <div className="max-w-2xl bg-white/10 backdrop-blur-sm rounded-3xl p-8 border-2 border-purple-400">
              <div className="text-center mb-4">
                <span className="text-5xl">{charEmoji}</span>
              </div>
              <h2 className="text-2xl font-bold text-purple-300 mb-4 text-center">{story.title}</h2>
              <p className="text-amber-300 italic mb-4 text-center">{story.highlight}</p>
              <div className="border-t border-purple-500/50 pt-4 mb-4">
                {story.content.map((line: string, i: number) => (
                  <p key={i} className="text-purple-100 mb-2 leading-relaxed">{line}</p>
                ))}
              </div>
              <p className="text-red-400 font-bold mb-6 text-center bg-red-500/20 p-3 rounded-2xl">{story.deathCause}</p>
              {isHost ? (
                <button
                  onClick={() => debounceClick(onNextPhase)}
                  className="w-full py-3 bg-gradient-to-r from-purple-500 to-indigo-500 
                            hover:from-purple-600 hover:to-indigo-600
                            text-white rounded-2xl font-semibold transition-all"
                >
                  继续
                </button>
              ) : (
                <div className="text-purple-300 text-sm flex items-center justify-center gap-2 py-3">
                  <span className="animate-pulse">⏳</span>
                  <span>等待房主操作...</span>
                </div>
              )}
            </div>
          </div>
        );

      case 'revelation_epilogue':
        const epilogue = revelation.epilogue || [];
        // 将epilogue分成两部分显示
        const midPoint = Math.ceil(epilogue.length / 2);
        const isFirstHalf = storyIndex < midPoint;
        const displayTexts = isFirstHalf 
          ? epilogue.slice(0, Math.min(storyIndex + 1, midPoint))
          : epilogue.slice(midPoint, storyIndex + 1);
        const isLastInHalf = isFirstHalf ? storyIndex === midPoint - 1 : storyIndex === epilogue.length - 1;
        
        return (
          <div className={`${bgClass} flex items-center justify-center p-8`}>
            <div className="max-w-2xl text-center bg-white/10 backdrop-blur-sm rounded-3xl p-8 border-2 border-purple-400">
              <h2 className="text-2xl font-bold text-purple-300 mb-6 flex items-center justify-center gap-2">
                <span>🌟</span>
                <span>记忆的真相 {isFirstHalf ? '(1/2)' : '(2/2)'}</span>
              </h2>
              <div className="mb-8">
                {displayTexts.map((text: string, i: number) => (
                  <p key={i} className="text-lg text-purple-100 mb-3 leading-relaxed">{text}</p>
                ))}
              </div>
              {isHost ? (
                <button
                  onClick={() => debounceClick(storyIndex < epilogue.length - 1 ? onNextStory : onNextPhase)}
                  className="px-8 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 
                            hover:from-purple-600 hover:to-indigo-600
                            text-white rounded-2xl text-lg font-semibold
                            shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                >
                  {storyIndex < epilogue.length - 1 ? (isLastInHalf ? '继续阅读' : '继续') : '进入第三幕'}
                </button>
              ) : (
                <div className="text-purple-300 text-sm flex items-center justify-center gap-2">
                  <span className="animate-pulse">⏳</span>
                  <span>等待房主操作...</span>
                </div>
              )}
            </div>
          </div>
        );
    }
    return null;
  };

  // 渲染过渡剧情
  const renderTransition = () => {
    const transition = config?.transition || [];
    if (transition.length === 0) {
      // 如果没有过渡内容，直接进入下一阶段
      return (
        <div className={`${bgClass} flex items-center justify-center p-8`}>
          <div className="text-center">
            <span className="text-4xl animate-spin inline-block">🐸</span>
            <p className="text-purple-200 mt-4">加载中...</p>
          </div>
        </div>
      );
    }
    return (
      <div className={`${bgClass} flex items-center justify-center p-8`}>
        <div className="max-w-2xl text-center bg-white/10 backdrop-blur-sm rounded-3xl p-8 border-2 border-purple-400">
          <div className="mb-8">
            {transition.slice(0, storyIndex + 1).map((text: string, i: number) => (
              <p key={i} className="text-lg text-purple-100 mb-3 leading-relaxed">{text}</p>
            ))}
          </div>
          {isHost ? (
            <button
              onClick={() => debounceClick(storyIndex < transition.length - 1 ? onNextStory : onNextPhase)}
              className="px-8 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 
                        hover:from-purple-600 hover:to-indigo-600
                        text-white rounded-2xl text-lg font-semibold
                        shadow-lg hover:shadow-xl hover:scale-105 transition-all"
            >
              {storyIndex < transition.length - 1 ? '继续' : '进入第三幕'}
            </button>
          ) : (
            <div className="text-purple-300 text-sm flex items-center justify-center gap-2">
              <span className="animate-pulse">⏳</span>
              <span>等待房主操作...</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // 渲染身份判定结果
  const renderIdentityReveal = () => {
    const animalOptions = config?.animalOptions || [];
    const identityResults = results?.identityResults || {};
    
    // 正确答案映射
    const correctAnswers: Record<string, string> = {
      cat: 'cat',
      dog: 'dog', 
      turtle: 'turtle'
    };
    
    return (
      <div className={`${bgClass} flex items-center justify-center p-8`}>
        <div className="max-w-2xl bg-white/10 backdrop-blur-sm rounded-3xl p-8 border-2 border-amber-400">
          <h2 className="text-2xl font-bold text-amber-300 text-center mb-6 flex items-center justify-center gap-2">
            <span>🎯</span>
            <span>身份判定结果</span>
          </h2>
          
          <div className="space-y-4 mb-6">
            {players?.map((p: any) => {
              const selectedAnimal = animalOptions.find((a: any) => a.id === p.selectedAnimal);
              // 根据玩家的characterType获取正确答案
              const playerCharType = p.characterType;
              const correctAnimalId = correctAnswers[playerCharType] || playerCharType;
              const correctAnimal = animalOptions.find((a: any) => a.id === correctAnimalId);
              const isCorrect = identityResults[p.playerId];
              
              return (
                <div key={p.playerId} className={`p-4 rounded-2xl border-2 ${
                  isCorrect ? 'bg-green-500/20 border-green-400' : 'bg-red-500/20 border-red-400'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className={p.playerId === playerId ? 'text-amber-300 font-bold' : 'text-white'}>
                      {p.playerId === playerId ? '你' : '玩家'}
                    </span>
                    <span className={isCorrect ? 'text-green-400' : 'text-red-400'}>
                      {isCorrect ? '✓ 正确' : '✗ 错误'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="text-purple-200">
                      选择: <span className="text-white">{selectedAnimal ? `${selectedAnimal.icon} ${selectedAnimal.name}` : '未选择'}</span>
                    </div>
                    {!isCorrect && correctAnimal && (
                      <div className="text-purple-200">
                        正确: <span className="text-green-300">{correctAnimal.icon} {correctAnimal.name}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="text-center text-purple-200 mb-6">
            <p>你们的真实身份即将揭晓...</p>
          </div>
          
          {isHost ? (
            <button
              onClick={() => debounceClick(onNextPhase)}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 
                        hover:from-amber-600 hover:to-orange-600
                        text-white rounded-2xl font-bold transition-all"
            >
              揭示真相
            </button>
          ) : (
            <div className="text-amber-300 text-sm flex items-center justify-center gap-2 py-3">
              <span className="animate-pulse">⏳</span>
              <span>等待房主操作...</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // 根据阶段渲染不同内容
  switch (phase) {
    case 'opening': return renderOpeningStory();
    case 'memory_intro': return renderMemoryIntro();
    case 'rules': return renderRules();
    case 'questioning': return renderQuestioning();
    case 'confirm_submit': return renderConfirmSubmit();
    case 'question_death_count': return renderDeathCountQuestion();
    case 'question_is_human': return renderIsHumanQuestion();
    case 'question_identity': return renderIdentityQuestion();
    case 'identity_reveal': return renderIdentityReveal();
    case 'revelation_intro':
    case 'revelation_turtle':
    case 'revelation_dog':
    case 'revelation_cat':
    case 'revelation_epilogue': return renderRevelation();
    case 'transition': return renderTransition();
    default: return <div className={`${bgClass} flex items-center justify-center`}>
      <div className="text-center">
        <span className="text-4xl animate-spin inline-block">🐸</span>
        <p className="text-purple-200 mt-4">加载中...</p>
      </div>
    </div>;
  }
}


// 关键词问题弹窗组件
function KeywordModal({
  keywordId,
  keywordConfigs,
  myFreeQuestions,
  onSelect,
  onClose
}: {
  keywordId: string;
  keywordConfigs: any[];
  myFreeQuestions: number;
  onSelect: (questionId: string) => void;
  onClose: () => void;
}) {
  const keyword = keywordConfigs.find((k: any) => k.id === keywordId);
  if (!keyword) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-b from-purple-900 to-indigo-900 rounded-3xl p-6 max-w-lg w-full border-2 border-amber-400">
        <h3 className="text-xl font-bold text-amber-300 mb-4 flex items-center gap-2">
          <span>🔍</span>
          <span>关键词：{keyword.text}</span>
        </h3>
        <p className="text-purple-200 mb-4">请选择一个问题进行提问：</p>
        <div className="space-y-3 mb-4">
          {keyword.questions.map((q: any) => (
            <button
              key={q.id}
              onClick={() => onSelect(q.id)}
              className="w-full p-4 bg-white/10 hover:bg-white/20 rounded-2xl text-left text-purple-100 
                        transition-all border border-purple-400/50 hover:border-amber-400"
            >
              {q.id}. {q.text}
            </button>
          ))}
        </div>
        <div className="flex justify-between items-center border-t border-purple-500/50 pt-4">
          <span className="text-purple-200 text-sm">
            剩余免费: <span className={myFreeQuestions > 0 ? 'text-green-400' : 'text-red-400'}>
              {myFreeQuestions}次
            </span>
            {myFreeQuestions <= 0 && <span className="text-red-400 ml-2">(消耗1HP)</span>}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-xl transition-all"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}

// 答案显示弹窗组件
function AnswerModal({
  answer,
  onClose
}: {
  answer: boolean;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-b from-purple-900 to-indigo-900 rounded-3xl p-8 text-center border-2 border-purple-400">
        <h3 className="text-lg text-purple-300 mb-4">【回答】</h3>
        <div className={`text-7xl font-bold mb-6 ${answer ? 'text-green-400' : 'text-red-400'}`}>
          {answer ? '✅ YES' : '❌ NO'}
        </div>
        <p className="text-purple-200 mb-6 flex items-center justify-center gap-2">
          <span>💡</span>
          <span>这个答案意味着什么？请仔细思考...</span>
        </p>
        <button
          onClick={onClose}
          className="px-8 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 
                    hover:from-purple-600 hover:to-indigo-600
                    text-white rounded-2xl font-semibold transition-all"
        >
          继续提问
        </button>
      </div>
    </div>
  );
}
