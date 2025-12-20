import React, { useState } from 'react';

interface EndingScreenProps {
  endingId: 'ending_0' | 'ending_1' | 'ending_2';
  onRestart: () => void;
  onMainMenu: () => void;
}

// 欢乐小动物园风格按钮
const buttonClass = "px-6 py-3 rounded-full text-lg font-bold shadow-lg transition-all hover:scale-105";
const primaryButton = `${buttonClass} bg-gradient-to-r from-sky-400 to-blue-500 hover:from-sky-500 hover:to-blue-600 text-white`;
const secondaryButton = `${buttonClass} bg-gradient-to-r from-gray-200 to-gray-300 hover:from-gray-300 hover:to-gray-400 text-gray-700`;

// 结局0：死于鼠鼠大王
const Ending0: React.FC<{ onRestart: () => void; onMainMenu: () => void }> = ({ onRestart, onMainMenu }) => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-200 via-orange-100 to-yellow-100 text-gray-800 flex flex-col items-center justify-center p-4">
      <div className="fixed top-6 left-8 text-4xl">🐀</div>
      <div className="fixed bottom-10 right-20 text-3xl">💀</div>
      
      <div className="max-w-2xl w-full bg-white/90 backdrop-blur rounded-3xl p-8 shadow-xl border-4 border-amber-300 text-center">
        <h2 className="text-2xl text-gray-500 mb-2">【结局0】</h2>
        <h1 className="text-4xl font-bold text-rose-500 mb-8">死于鼠鼠大王</h1>
        <div className="my-12">
          <p className="text-2xl mb-4 text-gray-700">牛，为你点赞！</p>
          <p className="text-9xl">👍</p>
        </div>
        <div className="flex justify-center gap-4 mt-8">
          <button onClick={onRestart} className={primaryButton}>
            🔄 重新开始
          </button>
          <button onClick={onMainMenu} className={secondaryButton}>
            🏠 返回主菜单
          </button>
        </div>
      </div>
    </div>
  );
};

// 结局1场景数据
const ending1Scenes = [
  {
    title: '第一幕：密室',
    playerView: [
      '一觉醒来，我们三人居然被困在密室了。',
      '有点意思，这怎么可能难倒我们三位冒险者呢。',
      '于是我们搜集证据，终于找到了逃出去的关键信息：C.H.E.O。',
      '我略懂英文，翻译过来就是"撤噢！"',
      '看来这就是逃出去的密码了。',
      '果然，门开了，我们逃了出去。',
      '等一下！有人来了……'
    ],
    nurseView: [
      '这三位重度妄想症的病人不知道又在玩什么小游戏呢。',
      '看来又犯病了。',
      '"水潭有线索！"其中一位高喊着，把脑袋放进了马桶里。',
      '还有一位在门上乱按着，看样子是在密码锁上输入密码呢。',
      '我把门打开："你们玩完了？该回房间了。"'
    ]
  },
  {
    title: '第二幕：藏匿',
    playerView: ['这个诡异的人走进来后开始寻找我们。', '还好我们都隐蔽地藏了起来。', '等他走后，我们也终于逃出去了。'],
    nurseView: ['他们见我进来，果断趴在地上。', '仿佛这样我就看不见他们了。', '我也习惯他们这样了。', '我告诉他们开饭了，他们就乖乖出来了。']
  },
  {
    title: '第三幕：过往',
    playerView: [
      '我们三人逃出了密室后，结果这里居然还有一个房间！',
      '房间内有一个发光的魔盒。',
      '这魔盒中的画面似乎是那样的熟悉。',
      '我们想起来了！这是关于我们仨的记忆！',
      '我们仨其实根本不是人类！',
      '而是三只小动物！乌龟、小猫还有大狗！',
      '恐怕我们失忆并且离开主人，和这诡异之人脱不了关系！'
    ],
    nurseView: [
      '他们三人在吃饭时看着电视中的《快乐宠物频道》。',
      '之后，不知道开始发什么疯。',
      '其中一人把锅扣在了身上，一动不动。',
      '另外俩人，一个在舔自己的手，另一个伸着舌头冲我傻笑。',
      '我怀疑他们的重度妄想症又严重了。'
    ]
  },
  {
    title: '第四幕：分别',
    playerView: ['我们仨不想被困在这里，想回到主人身边。', '我们分析，只有打败那个诡异的人才能逃出去！', '于是我们仨决定分头行动，各自提升实力。', '两年之后在密室处集合！'],
    nurseView: [
      '仨人不知道又搞什么名堂。',
      '其中一个天天趴在大石头上一动不动，说是要吸收日月精华。',
      '还有一个看到什么就挠什么，手指甲都给挠坏了。',
      '最后那个更奇怪，天天对着所有人闻来闻去。',
      '把其他精神病都给吓到了。',
      '院长说这是新的病情表现，让我继续观察。'
    ]
  },
  {
    title: '第五幕：结局',
    playerView: [
      '我们仨已经修行圆满，集结后准备找那诡异之人算总账。',
      '可没想到他居然派出他手下的大将——鼠鼠大王——向我们发起了攻击！',
      '不过凭借我们这些日子的修行，很快便击败了它！',
      '哼，不堪一击！'
    ],
    nurseView: [
      '疯人院里这几天闹耗子，闹得挺凶的。',
      '结果这仨精神病今天跟打了鸡血似的，开始疯狂抓起了耗子。',
      '没想到这仨人脑子虽不好使，但是抓耗子配合的却十分默契。',
      '不一会就将那只大耗子抓住了。',
      '院长很高兴，奖励了他们每人一包小零食。',
      '仨人乐得跟朵月季花似的。',
      '居然乖乖地跟我回到了病房。',
      '看来以后想控制这仨人，一包小零食就能解决了。'
    ]
  }
];

// 结局1：疯人院
const Ending1: React.FC<{ onRestart: () => void; onMainMenu: () => void }> = ({ onRestart, onMainMenu }) => {
  const [phase, setPhase] = useState<'title' | 'scenes' | 'final'>('title');
  const [sceneIndex, setSceneIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'player' | 'nurse'>('player');
  const [textIndex, setTextIndex] = useState(0);

  const currentScene = ending1Scenes[sceneIndex];
  const currentTexts = viewMode === 'player' ? currentScene?.playerView : currentScene?.nurseView;

  const handleNext = () => {
    if (phase === 'title') {
      setPhase('scenes');
      return;
    }
    if (phase === 'scenes') {
      if (textIndex < (currentTexts?.length || 0) - 1) {
        setTextIndex(textIndex + 1);
      } else if (viewMode === 'player') {
        setViewMode('nurse');
        setTextIndex(0);
      } else if (sceneIndex < ending1Scenes.length - 1) {
        setSceneIndex(sceneIndex + 1);
        setViewMode('player');
        setTextIndex(0);
      } else {
        setPhase('final');
      }
    }
  };

  const containerClass = "min-h-screen bg-gradient-to-b from-violet-200 via-purple-100 to-indigo-100 text-gray-800";
  const cardClass = "bg-white/90 backdrop-blur rounded-3xl shadow-xl border-4 border-violet-300";

  if (phase === 'title') {
    return (
      <div className={`${containerClass} flex flex-col items-center justify-center p-4`}>
        <div className="fixed top-6 left-8 text-4xl">🏥</div>
        <div className="fixed bottom-10 right-20 text-3xl animate-pulse">💭</div>
        
        <div className="max-w-2xl w-full text-center">
          <h2 className="text-2xl text-gray-500 mb-2">【结局1】</h2>
          <h1 className="text-5xl font-bold text-violet-500 mb-8">疯人院</h1>
          <p className="text-xl text-gray-600 italic mb-12">"也许疯狂，才是最真实的清醒"</p>
          <button onClick={handleNext} className={`${buttonClass} bg-gradient-to-r from-violet-400 to-purple-500 hover:from-violet-500 hover:to-purple-600 text-white`}>
            继续 →
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'scenes' && currentScene) {
    return (
      <div className={`${containerClass} p-4`}>
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-violet-600">{currentScene.title}</h2>
            <div className="flex justify-center gap-4 mt-3">
              <span className={`px-4 py-2 rounded-full font-bold ${viewMode === 'player' ? 'bg-sky-400 text-white' : 'bg-gray-200 text-gray-500'}`}>
                🎮 玩家视角
              </span>
              <span className={`px-4 py-2 rounded-full font-bold ${viewMode === 'nurse' ? 'bg-emerald-400 text-white' : 'bg-gray-200 text-gray-500'}`}>
                👩‍⚕️ 护士视角
              </span>
            </div>
          </div>
          
          <div className={`${cardClass} p-6 mb-6 min-h-[200px] ${
            viewMode === 'player' 
              ? 'border-sky-300 bg-gradient-to-br from-sky-50 to-blue-50' 
              : 'border-emerald-300 bg-gradient-to-br from-emerald-50 to-green-50'
          }`}>
            <p className="text-lg leading-relaxed text-gray-700">{currentTexts?.[textIndex]}</p>
          </div>
          
          <div className="text-center text-gray-500 mb-4">
            {textIndex + 1} / {currentTexts?.length} | 场景 {sceneIndex + 1} / {ending1Scenes.length}
          </div>
          
          <div className="flex justify-center">
            <button onClick={handleNext} className={`${buttonClass} bg-gradient-to-r from-violet-400 to-purple-500 hover:from-violet-500 hover:to-purple-600 text-white`}>
              继续 →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${containerClass} flex flex-col items-center justify-center p-4`}>
      <div className={`max-w-2xl w-full ${cardClass} p-8 text-center`}>
        <h1 className="text-4xl font-bold text-violet-500 mb-8">【疯人院】</h1>
        <div className="my-8 space-y-4">
          <p className="text-xl text-gray-700">三位冒险者在疯人院里度过了快乐的一天</p>
          <p className="text-lg text-gray-500">虽然世界很疯狂，但我们很快乐</p>
        </div>
        <div className="flex justify-center gap-4 my-8 text-5xl">
          <span>😺</span><span>🐶</span><span>🐸</span>
        </div>
        <p className="text-2xl text-violet-400 my-8">～ THE END ～</p>
        <div className="flex justify-center gap-4 mt-8">
          <button onClick={onRestart} className={primaryButton}>🔄 重新开始</button>
          <button onClick={onMainMenu} className={secondaryButton}>🏠 返回主菜单</button>
        </div>
      </div>
    </div>
  );
};


// 结局2回响数据
const echoes = {
  cat: {
    emoji: '😺',
    title: '猫的回响',
    content: [
      '铲屎官，好久不见，我在这边混得很好，你呢？',
      '我还记得我生病时你焦急的样子。',
      '对不起，我没能陪你更久。',
      '你和我告别时说的话，说实话我没太记住。当时太疼了。',
      '但我记得安乐后，你哭着说你爱我。',
      '谢谢你给我快乐的一生。',
      '我也永远爱你。'
    ],
    ps: 'PS：家里的猫条别浪费，喂给流浪猫吧。'
  },
  dog: {
    emoji: '🐶',
    title: '狗的回响',
    content: [
      '爸爸妈妈，你们啥时候来这边啊？这边可好玩啦！',
      '我想带你们看看，我现在过得很好。',
      '对啦！我昨天终于吃到巧克力了！不过吃完好像有点不对劲……不对，我好像已经不在了，那没事了。',
      '爸爸妈妈，对不起。其实我在床下面拉过便便，可能已经风干了，你找找看。',
      '我出意外时你们一定很难过吧，让你们担心了。',
      '早知道调皮的代价是不能见到你，我一定乖乖听话。',
      '我也永远爱你们。'
    ]
  },
  turtle: {
    emoji: '🐸',
    title: '龟的回响',
    content: [
      '主人，我走了之后你还好吗？',
      '我知道我们在一起的时间很长很长。长到你可能都忘了，我也是会离开的。',
      '那天我感觉自己好累好累。我知道，是时候了。',
      '谢谢你每天给我晒太阳。',
      '谢谢你记得给我换水。',
      '谢谢你在我面前絮絮叨叨地说你的烦心事。',
      '虽然我可能听不太懂，但我喜欢听你说话。',
      '我在这边认识了新朋友，一只猫和一只狗。我们现在是最好的伙伴。',
      '所以你不用担心我，我很好。',
      '我也永远爱你。'
    ]
  }
};

const prologue = [
  '你们不计后果地向死神发起挑战，最终打动了死神。',
  '他向你们讲述了这个世界的起源：',
  '"这并不是被创造出来的世界，而是因爱形成的回响空间。"',
  '"宠物去世后，因为主人的念念不忘，在这里产生了回响，因此出现了这个由宠物构成的世界。"',
  '"你们刚来到这个世界时听到的哭声，就是来自主人念念不忘的回响。"'
];

const dialogue = [
  { speaker: '龟', emotion: '沉思', text: '所以说，打开这个世界大门的密码是 ECHO（回响），是因为被思念，所以我们还存在……' },
  { speaker: '狗', emotion: '好奇', text: '那我也很思念主人，他能听到我的回响吗？' },
  { speaker: '死神', emotion: '微笑', text: '恐怕不能。' },
  { speaker: '旁白', text: '狗的表情有些失落。' },
  { speaker: '死神', text: '不过，我有办法。' }
];

const adventurerScene = [
  '死神用神秘力量从虚空中抓来了三名冒险者。',
  '三人明明是男人，却穿着妃子的衣服。',
  '死神说道："他们是异世界的冒险者，有什么想对主人说的话，都可以让他们传达。"',
  '猫眼前一亮，仿佛又看到了那个流着泪和它告别的身影。',
  '分别后，猫还没有这么开心过。'
];

// 结局2：我也永远爱你（真结局）
const Ending2: React.FC<{ onRestart: () => void; onMainMenu: () => void }> = ({ onRestart, onMainMenu }) => {
  const [phase, setPhase] = useState<'title' | 'prologue' | 'dialogue' | 'adventurer' | 'echoes' | 'final'>('title');
  const [textIndex, setTextIndex] = useState(0);
  const [currentEcho, setCurrentEcho] = useState<'cat' | 'dog' | 'turtle' | null>(null);
  const [echoTextIndex, setEchoTextIndex] = useState(0);

  const handleNext = () => {
    switch (phase) {
      case 'title':
        setPhase('prologue');
        setTextIndex(0);
        break;
      case 'prologue':
        if (textIndex < prologue.length - 1) {
          setTextIndex(textIndex + 1);
        } else {
          setPhase('dialogue');
          setTextIndex(0);
        }
        break;
      case 'dialogue':
        if (textIndex < dialogue.length - 1) {
          setTextIndex(textIndex + 1);
        } else {
          setPhase('adventurer');
          setTextIndex(0);
        }
        break;
      case 'adventurer':
        if (textIndex < adventurerScene.length - 1) {
          setTextIndex(textIndex + 1);
        } else {
          setPhase('echoes');
          setCurrentEcho('cat');
          setEchoTextIndex(0);
        }
        break;
      case 'echoes':
        if (currentEcho) {
          const echo = echoes[currentEcho];
          if (echoTextIndex < echo.content.length - 1) {
            setEchoTextIndex(echoTextIndex + 1);
          } else if (currentEcho === 'cat') {
            setCurrentEcho('dog');
            setEchoTextIndex(0);
          } else if (currentEcho === 'dog') {
            setCurrentEcho('turtle');
            setEchoTextIndex(0);
          } else {
            setPhase('final');
          }
        }
        break;
    }
  };

  const containerClass = "min-h-screen bg-gradient-to-b from-pink-200 via-rose-100 to-purple-100 text-gray-800";
  const cardClass = "bg-white/90 backdrop-blur rounded-3xl shadow-xl border-4 border-pink-300";
  const pinkButton = `${buttonClass} bg-gradient-to-r from-pink-400 to-rose-500 hover:from-pink-500 hover:to-rose-600 text-white`;

  if (phase === 'title') {
    return (
      <div className={`${containerClass} flex flex-col items-center justify-center p-4`}>
        <div className="fixed top-6 left-8 text-4xl animate-pulse">💕</div>
        <div className="fixed top-10 right-20 text-3xl">🌟</div>
        <div className="fixed bottom-10 left-12 text-3xl">😺</div>
        <div className="fixed bottom-16 right-16 text-3xl">🐶</div>
        <div className="fixed bottom-8 left-1/2 text-3xl">🐸</div>
        
        <div className="max-w-2xl w-full text-center">
          <h2 className="text-2xl text-gray-500 mb-2">【结局2】</h2>
          <h1 className="text-5xl font-bold text-pink-500 mb-8">我也永远爱你</h1>
          <p className="text-xl text-gray-600 italic mb-4">"因为被思念，所以还存在。"</p>
          <p className="text-lg text-purple-500 mb-12">"ECHO —— 回响，永不消散。"</p>
          <button onClick={handleNext} className={pinkButton}>
            继续 →
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'prologue') {
    return (
      <div className={`${containerClass} p-4`}>
        <div className="max-w-3xl mx-auto flex flex-col items-center justify-center min-h-screen">
          <div className={`${cardClass} p-8 mb-6 w-full`}>
            <p className="text-xl leading-relaxed text-center text-gray-700">{prologue[textIndex]}</p>
          </div>
          <button onClick={handleNext} className={pinkButton}>继续 →</button>
        </div>
      </div>
    );
  }

  if (phase === 'dialogue') {
    const line = dialogue[textIndex];
    return (
      <div className={`${containerClass} p-4`}>
        <div className="max-w-3xl mx-auto flex flex-col items-center justify-center min-h-screen">
          <div className={`${cardClass} p-8 mb-6 w-full`}>
            {line.speaker !== '旁白' && (
              <p className="text-purple-500 mb-3 font-bold">
                {line.speaker === '龟' && '🐸'} {line.speaker === '狗' && '🐶'} {line.speaker === '死神' && '💀'} {line.speaker} {line.emotion && `（${line.emotion}）`}：
              </p>
            )}
            <p className={`text-xl leading-relaxed ${line.speaker === '旁白' ? 'text-gray-500 italic text-center' : 'text-gray-700'}`}>
              {line.text}
            </p>
          </div>
          <button onClick={handleNext} className={pinkButton}>继续 →</button>
        </div>
      </div>
    );
  }

  if (phase === 'adventurer') {
    return (
      <div className={`${containerClass} p-4`}>
        <div className="max-w-3xl mx-auto flex flex-col items-center justify-center min-h-screen">
          <div className={`${cardClass} p-8 mb-6 w-full`}>
            <p className="text-xl leading-relaxed text-center text-gray-700">{adventurerScene[textIndex]}</p>
          </div>
          <button onClick={handleNext} className={pinkButton}>继续 →</button>
        </div>
      </div>
    );
  }

  if (phase === 'echoes' && currentEcho) {
    const echo = echoes[currentEcho];
    const isLastText = echoTextIndex === echo.content.length - 1;
    const showPs = currentEcho === 'cat' && isLastText;

    return (
      <div className={`${containerClass} p-4`}>
        <div className="max-w-3xl mx-auto flex flex-col items-center justify-center min-h-screen">
          <div className={`${cardClass} p-8 mb-6 w-full border-pink-400 shadow-lg shadow-pink-200`}>
            <div className="text-center mb-6">
              <span className="text-7xl">{echo.emoji}</span>
              <h3 className="text-2xl font-bold text-pink-500 mt-3">{echo.title}</h3>
            </div>
            <div className="min-h-[150px] flex items-center justify-center">
              <p className="text-xl leading-relaxed text-center text-gray-700">{echo.content[echoTextIndex]}</p>
            </div>
            {showPs && (
              <p className="text-sm text-gray-500 text-center mt-6 border-t border-gray-200 pt-4">
                {echoes.cat.ps}
              </p>
            )}
          </div>
          <div className="text-center text-gray-500 mb-4">
            {echoTextIndex + 1} / {echo.content.length}
          </div>
          <button onClick={handleNext} className={pinkButton}>继续 →</button>
        </div>
      </div>
    );
  }

  // 最终画面
  return (
    <div className={`${containerClass} flex flex-col items-center justify-center p-4`}>
      <div className="fixed top-6 left-8 text-4xl animate-pulse">💕</div>
      <div className="fixed top-10 right-20 text-3xl animate-bounce">🌟</div>
      
      <div className="max-w-2xl w-full text-center">
        <h1 className="text-4xl font-bold text-pink-500 mb-8">【结局2】我也永远爱你</h1>
        <div className="my-8 space-y-4">
          <p className="text-xl text-purple-500">"因为被思念，所以还存在。"</p>
          <p className="text-xl text-purple-500">"ECHO —— 回响，永不消散。"</p>
        </div>
        <div className="my-8 text-gray-600 space-y-2">
          <p className="text-lg">感谢你的游玩。</p>
          <p className="text-lg mt-4">献给所有爱过宠物的人。</p>
          <p className="text-lg">献给所有被爱过的宠物。</p>
        </div>
        <div className="flex justify-center gap-8 my-8 text-5xl">
          <span className="animate-bounce" style={{ animationDelay: '0ms' }}>😺</span>
          <span className="animate-bounce" style={{ animationDelay: '100ms' }}>🐶</span>
          <span className="animate-bounce" style={{ animationDelay: '200ms' }}>🐸</span>
        </div>
        <p className="text-2xl text-pink-400 my-8">～ THE END ～</p>
        <div className="flex justify-center gap-4 mt-8">
          <button onClick={onRestart} className={primaryButton}>🔄 重新开始</button>
          <button onClick={onMainMenu} className={secondaryButton}>🏠 返回主菜单</button>
        </div>
      </div>
    </div>
  );
};

// 主组件
const EndingScreen: React.FC<EndingScreenProps> = ({ endingId, onRestart, onMainMenu }) => {
  switch (endingId) {
    case 'ending_0':
      return <Ending0 onRestart={onRestart} onMainMenu={onMainMenu} />;
    case 'ending_1':
      return <Ending1 onRestart={onRestart} onMainMenu={onMainMenu} />;
    case 'ending_2':
      return <Ending2 onRestart={onRestart} onMainMenu={onMainMenu} />;
    default:
      return null;
  }
};

export default EndingScreen;
