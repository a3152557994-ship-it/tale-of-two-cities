// 《双城记》Reigns 式滑卡生存游戏 —— 卡牌 / 结局 / 人格数据
// 左 = 伦敦（谨慎、秩序、怜悯、自保、妥协）；右 = 巴黎（激情、反抗、正义、复仇、冒险）。
// fx 顺序：bread / gold / heart / fury。所有卡牌字段已展开为最终 schema。
//
// 使用的 flag（13 个）：
//   lorry_trust     洛里的信任（台尔森金库 / 空白通行证线）
//   jerry_secret    知道杰瑞的“复活人”副业（克莱空棺 → 要挟间谍 → 通行证）
//   manette_letter  你私藏了巴士底狱北塔里梅尼特医生的信
//   carton_bond     信了卡顿的誓言（隐藏结局线）
//   on_the_list     你的名字被织进了德发日夫人的毛线
//   smuggler        走私邮袋线
//   jacques         你成了“雅克”（复仇结局线）
//   marquis_debt    你替侯爵办过脏活（账本会在 1790 年代回来找你）
//   darnay_friend   达内的朋友
//   marquis_dead    侯爵已死（剧情时序门）
//   escape_papers   你手里有一张出城通行证
//   gabelle_letter  你把加贝尔的求救信交给了达内
//   darnay_arrested 达内已在巴黎城门被捕（剧情时序门）

export const METERS = [
  { key: 'bread', icon: '🍞', name: '面包', nameEn: 'Bread' },
  { key: 'gold', icon: '🪙', name: '金币', nameEn: 'Gold' },
  { key: 'heart', icon: '🕯', name: '良心', nameEn: 'Conscience' },
  { key: 'fury', icon: '🔥', name: '怒火', nameEn: 'Fury' }
];

export const CHARACTERS = {
  lorry: { name: '贾维斯·洛里', nameEn: 'Jarvis Lorry', role: '台尔森银行老职员', roleEn: "Tellson's Banker" },
  lucie: { name: '露西·梅尼特', nameEn: 'Lucie Manette', role: '金线般的姑娘', roleEn: 'The Golden Thread' },
  manette: { name: '梅尼特医生', nameEn: 'Doctor Manette', role: '巴士底狱旧囚', roleEn: 'Bastille Prisoner' },
  carton: { name: '悉尼·卡顿', nameEn: 'Sydney Carton', role: '醉醺醺的律师', roleEn: 'Dissolute Barrister' },
  darnay: { name: '查尔斯·达内', nameEn: 'Charles Darnay', role: '隐姓埋名的贵族', roleEn: 'Émigré Nobleman' },
  mme_defarge: { name: '德发日夫人', nameEn: 'Madame Defarge', role: '织毛线的复仇者', roleEn: 'The Knitter' },
  defarge: { name: '德发日', nameEn: 'Ernest Defarge', role: '圣安东尼酒铺老板', roleEn: 'Wine-shop Keeper' },
  marquis: { name: '圣埃弗雷蒙德侯爵', nameEn: 'Marquis St. Evrémonde', role: '傲慢的大贵族', roleEn: 'The Aristocrat' },
  jerry: { name: '杰瑞·克兰彻', nameEn: 'Jerry Cruncher', role: '银行跑腿兼副业', roleEn: 'Odd-job Man' },
  citizen: { name: '巴黎市民', nameEn: 'Citizen of Paris', role: '无套裤汉', roleEn: 'Sans-culotte' }
};

// ---- 构造辅助（导出的仍是完整的纯数据对象） ----
const o = (label, labelEn, [bread, gold, heart, fury], tags = [], x = {}) => {
  const c = {
    label, labelEn,
    fx: { bread, gold, heart, fury },
    tags,
    set: x.s || [],
    clear: x.c || []
  };
  if (x.a) { c.after = x.a; c.afterEn = x.ae || ''; }
  return c;
};
const K = (id, phase, city, who, text, textEn, left, right, x = {}) => {
  const card = {
    id, phase, city, who, text, textEn, left, right,
    requires: x.req || [],
    excludes: x.exc || [],
    once: x.once === undefined ? true : x.once,
    weight: x.w || 1
  };
  if (x.beat !== undefined) card.beat = x.beat;
  return card;
};

export const CARDS = [
  // ===================== 第一幕 招回人世 1775–1779 =====================
  K('c001', 1, 'london', 'lorry',
    '1775年，多佛邮车在泥里喘气。洛里先生塞给你一张纸条，只有一句：“招回人世。”他说这只是生意，可他的手在抖。',
    'Dover road, 1775. The mail coach wheezes through the mud. Mr. Lorry slips you a note: "Recalled to Life." Mere business, he insists. His hand trembles.',
    o('只送信不多问', "Deliver, don't ask", [0, 10, -5, -5], ['prudent'], { s: ['lorry_trust'], a: '洛里点头：“台尔森就要你这样的。”', ae: "\"Tellson's likes a closed mouth.\"" }),
    o('追问招回了谁', 'Who was buried?', [-5, -5, 10, 5], ['idealist'], { a: '洛里低声：“一个被活埋了十八年的人。”', ae: '"A man buried alive for eighteen years."' }),
    { beat: 0 }),

  K('c002', 1, 'london', 'jerry',
    '看门的杰瑞·克兰彻白天坐在银行门口，夜里靴子上全是墓园的土。他冲你挤眼：“小伙子，想跟我去钓鱼吗？”',
    "Jerry Cruncher minds Tellson's door by day. By night his boots gather churchyard clay. He winks: \"Fancy a spot of fishing, young sir?\"",
    o('装作没看见', 'Look away', [0, 5, -5, 0], ['cold'], { a: '杰瑞拍拍你：“懂事的人活得长。”', ae: '"Sensible lads live long."' }),
    o('夜里跟着去', 'Follow him tonight', [-5, 10, -10, 5], ['opportunist'], { s: ['jerry_secret'], a: '鱼竿是铁锹，鱼塘是坟场。', ae: 'The rod was a spade. The pond, a churchyard.' })),

  K('c003', 1, 'paris', 'defarge',
    '德发日领你爬上酒铺阁楼。白发老人埋头钉鞋。你问他名字，他答：“北塔，一百零五号。”',
    'Defarge leads you up to the garret above his wine-shop. A white-haired man stitches a shoe. His name? "One Hundred and Five, North Tower."',
    o('悄悄带去伦敦', 'Spirit him away', [-5, -5, 5, -5], ['mercy'], { a: '马车里，他一路攥着一缕金发。', ae: 'All the way, he clutched a lock of golden hair.' }),
    o('让邻居们看看', 'Let Saint Antoine see', [0, 0, -5, 10], ['revenge'], { s: ['jacques'], a: '德发日微笑：“雅克们都该记住这张脸。”', ae: '"Every Jacques should remember this face."' })),

  K('c004', 1, 'london', 'lorry',
    '洛里发现账上少了三十镑：“你知道是谁吗？”你知道——是扫地的老约翰，他孙子病得快不行了。',
    'Thirty pounds missing. "Any idea who?" asks Lorry. You know: old John the sweeper, whose grandson lies gravely ill.',
    o('如实上报', 'Report him', [5, 10, -10, 0], ['cold'], { a: '老约翰走时，还向你鞠了一躬。', ae: 'Old John bowed to you on his way out.' }),
    o('自掏腰包补上', 'Pay it yourself', [-5, -15, 10, 0], ['sacrifice'], { a: '账平了。你的晚饭没了。', ae: 'The books balance. Your supper does not.' })),

  K('c005', 1, 'paris', 'citizen',
    '圣安东尼区，一个抱孩子的女人拦住你：“先生，您身上有面包味。”你口袋里确实揣着半根长棍面包。',
    'In Saint Antoine a woman with a baby blocks your way. "Monsieur, you smell of bread." Half a loaf is indeed in your pocket.',
    o('加快脚步', 'Walk faster', [5, 0, -10, -5], ['cold'], { a: '你吃完了面包，一点也不香。', ae: 'You eat the bread. It tastes of nothing.' }),
    o('整根给她', 'Give her everything', [-10, 0, 10, 5], ['mercy'], { a: '围上来的，不止她一个。', ae: 'She was not the only one watching.' })),

  K('c006', 1, 'paris', 'citizen',
    '一只酒桶在圣安东尼的石板路上摔碎了，整条街的人趴下去舔石缝。一个高个子蘸着红酒，在墙上写了一个字：血。',
    'A wine cask shatters on the cobbles of Saint Antoine. The whole street kneels to lap it up. A tall joker dips a finger and writes on the wall: BLOOD.',
    o('绕道离开', 'Walk around it', [0, 5, -5, -10], ['prudent'], { a: '你的鞋底，还是染红了。', ae: 'Your soles came away red anyway.' }),
    o('跪下分一口', 'Kneel and drink', [10, -5, 0, 5], ['idealist'], { a: '酒是酸的，心里的东西更酸。', ae: 'The wine was sour. Something else was sourer.' }),
    { beat: 6 }),

  K('c007', 1, 'paris', 'marquis',
    '侯爵用扇子点了点你：“把我的金子悄悄挪去伦敦。至于外面那些饿鬼——他们饿惯了。”',
    'The Marquis taps you with his fan. "Move my gold quietly to London. As for the hungry rabble outside—they are quite used to it."',
    o('恭敬照办', 'Bow and comply', [5, 10, -10, -10], ['cold'], { s: ['marquis_debt'], a: '侯爵赏你一枚金路易，像在喂狗。', ae: 'He tosses you a louis d\'or, as one feeds a dog.' }),
    o('故意拖延', 'Drag your feet', [-5, -10, 5, 10], ['idealist'], { a: '侯爵记住了你的脸。', ae: 'The Marquis remembers your face.' })),

  K('c008', 1, 'london', 'lucie',
    '一个金发姑娘在台尔森银行坐了一整个下午。她叫露西。“求您说实话——我父亲，还活着吗？”',
    "A golden-haired young woman has waited all afternoon at Tellson's. Her name is Lucie. \"Please, the truth—is my father alive?\"",
    o('让洛里来说', 'Let Lorry explain', [0, 5, -5, 0], ['prudent'], { a: '洛里用“生意”讲了一整个钟头。', ae: 'Lorry explains for an hour, entirely as business.' }),
    o('陪她去巴黎', 'Escort her to Paris', [-5, -10, 10, 0], ['mercy'], { a: '她第一次笑了。银行扣了你三周工钱。', ae: "She smiles at last. Tellson's docks three weeks' pay." })),

  K('c009', 1, 'paris', 'manette',
    '梅尼特医生又低头钉鞋了，锤声响了一夜。他忽然抬头看你：“你也是来提审我的？”',
    'Doctor Manette is cobbling again; the hammer never stops all night. Suddenly he looks up. "Have you come to question me too?"',
    o('扶他上床', 'Help him to bed', [-5, 0, 10, -5], ['mercy'], { a: '他睡着了，手里还攥着鞋楦。', ae: 'He sleeps, still gripping the last.' }),
    o('追问狱中往事', 'Ask about the prison', [0, 0, -5, 5], ['revenge'], { a: '他喃喃：“我写过一封信……藏在烟囱里。”', ae: '"I wrote a letter... hid it in the chimney."' })),

  K('c010', 1, 'london', 'jerry',
    '杰瑞骂老婆又在“跪着咒他”——其实是在祷告。“她一跪，我生意就黄！”他非要你评评理。',
    'Jerry fumes that his wife is "flopping" again—praying, that is. "Every time she kneels, my trade goes sour!" He demands you take his side.',
    o('帮杰瑞说话', 'Side with Jerry', [5, 5, -5, 0], ['opportunist'], { a: '杰瑞请你喝了一品脱。', ae: 'Jerry stands you a pint.' }),
    o('帮太太说话', 'Side with his wife', [-5, 0, 10, 0], ['mercy'], { a: '杰瑞往你靴子里扔了块泥。', ae: 'Jerry drops a clod of mud in your boot.' })),

  K('c011', 1, 'london', 'carton',
    '酒馆门口，一个醉汉拦住你：“知道全伦敦最没用的人是谁吗？就是我，悉尼·卡顿。请我喝一杯？”',
    'A drunk blocks the tavern door. "Know the most useless man in London? You\'re looking at him. Sydney Carton. Buy me a drink?"',
    o('扶他回家', 'Walk him home', [0, -5, 10, -5], ['mercy'], { a: '他在门口说：“你是个傻瓜。谢谢。”', ae: '"You\'re a fool. Thank you."' }),
    o('陪他喝到天亮', 'Drink till dawn', [-10, -5, 5, 0], [], { a: '他醉了，也比你清醒。', ae: 'Drunk, he was still the sharpest man there.' })),

  K('c012', 1, 'paris', 'defarge',
    '德发日在酒铺后屋点名：雅克一号、二号、三号。“想当雅克四号吗？只要记住一个名字，永远别忘。”',
    'In the back room Defarge counts heads: Jacques One, Two, Three. "Care to be Jacques Four? Remember one name. Forever."',
    o('我只来记账', 'I just keep ledgers', [0, 5, 0, -10], ['prudent'], { a: '德发日耸肩：“账本也会记仇。”', ae: '"Ledgers hold grudges too."' }),
    o('我叫雅克', 'Call me Jacques', [5, -5, -5, 10], ['revenge'], { s: ['jacques'], a: '从此你只喝德发日家的酒。', ae: "From now on you drink only at Defarge's." }),
    { exc: ['jacques'] }),

  K('c013', 1, 'paris', 'mme_defarge',
    '德发日夫人坐在柜台后织毛线，眼皮都不抬：“年轻人，你叫什么名字？我想把它织进去。”',
    'Madame Defarge knits behind the counter without looking up. "Your name, young man? I should like to knit it in."',
    o('报个假名', 'Give a false name', [0, 0, -5, -5], ['opportunist'], { a: '她点点头，那一针多绕了一圈。', ae: 'She nods. One stitch loops twice.' }),
    o('报上真名', 'Give your real name', [0, 0, 5, 5], ['idealist'], { s: ['on_the_list'], a: '咔嗒一声。你被记住了。', ae: 'Click. You have been remembered.' })),

  K('c014', 1, 'london', 'lorry',
    '洛里派你押一箱金币过海峡：“带上手枪。还有，别跟法国人聊天气——聊着聊着就聊到国王了。”',
    'Lorry sends you across the Channel with a chest of gold. "Take a pistol. And never discuss the weather with the French. It drifts to the King."',
    o('多雇两个保镖', 'Hire two guards', [0, -10, 0, -5], ['prudent'], { a: '保镖一路都在聊国王。', ae: 'The guards discussed the King all the way.' }),
    o('独自轻装上路', 'Travel alone', [-5, 10, 0, 5], ['opportunist'], { a: '海风吹走了帽子，没吹走金币。', ae: 'The wind took your hat, not the gold.' })),

  K('c015', 1, 'paris', 'citizen',
    '一个修路工在路边砸石头：“城堡的人又抓走了一个乡亲。先生，这年头，石头都比人值钱。”',
    'A mender of roads cracks stones by the wayside. "The château men took another of us. Monsieur, these days a stone is worth more than a man."',
    o('给他几个铜板', 'Give him coppers', [0, -5, 5, -5], ['mercy'], { a: '他把铜板咬了咬，才收下。', ae: 'He bites each coin before trusting it.' }),
    o('问他想不想报仇', 'Ask about revenge', [0, 0, -5, 5], ['revenge'], { a: '锤子停了一下，又重重落下。', ae: 'His hammer pauses. Then falls, harder.' })),

  K('c016', 1, 'london', 'jerry',
    '杰瑞压低嗓门：“有批货要过海——白兰地、蕾丝，外加一位不想被看见的先生。银行邮袋最安全。”',
    'Jerry lowers his voice. "Cargo for France: brandy, lace, and a gentleman who\'d rather not be seen. Nothing safer than a bank mailbag."',
    o('告诉洛里', 'Tell Lorry', [0, 5, -5, -5], ['cold'], { a: '杰瑞整整一年没理你。', ae: "Jerry doesn't speak to you for a year." }),
    o('我要三成', 'I want thirty percent', [5, 10, -5, 5], ['opportunist'], { s: ['smuggler'], a: '邮袋鼓了，良心瘪了。', ae: 'The mailbag fattened. Your conscience thinned.' })),

  K('c017', 1, 'paris', 'marquis',
    '侯爵又来了：“上回你很懂事。这次，帮我在一张佃农借据上，添一个零。”',
    'The Marquis again. "You were sensible last time. Now add a nought to this peasant\'s IOU, there\'s a good fellow."',
    o('添就添吧', 'Add the nought', [0, 10, -15, -5], ['cold'], { a: '那户人家，没熬过那个冬天。', ae: 'That family did not see the spring.' }),
    o('当面撕掉', 'Tear it up', [0, -15, 10, 10], ['idealist'], { c: ['marquis_debt'], a: '侯爵笑：“骨气可当不了面包。”', ae: '"Pride," smiles the Marquis, "is not bread."' }),
    { req: ['marquis_debt'], w: 2 }),

  K('c018', 1, 'london', 'manette',
    '梅尼特医生好些了，却偷偷问你：“我那张钉鞋凳……还在吗？没有它，我睡不着。”',
    'Doctor Manette is better, yet he whispers: "My shoemaker\'s bench... is it still there? I cannot sleep without it."',
    o('劈了烧掉', 'Burn it', [5, 0, -5, -5], ['prudent'], { a: '炉火很旺，像在烧一段往事。', ae: 'The fire burned bright, as if fed on years.' }),
    o('搬回给他', 'Bring it back', [0, -5, 10, 0], ['mercy'], { a: '锤声又响了。他睡得很香。', ae: 'The hammering resumes. He sleeps like a child.' })),

  K('c019', 1, 'london', 'lucie',
    '露西想给父亲请伦敦最好的医生，钱不够。她红着脸问：“银行……能先预支一点吗？”',
    'Lucie wants the finest physician in London for her father but cannot afford him. Blushing: "Could the bank... advance a little?"',
    o('按规矩办', 'Follow the rules', [0, 5, -10, 0], ['cold'], { a: '规矩无可挑剔。露西没再开过口。', ae: 'The rules were impeccable. She never asked again.' }),
    o('自己掏钱', 'Pay from your pocket', [-5, -15, 10, 0], ['sacrifice'], { a: '她说要还，你说不急。其实你很急。', ae: '"No hurry," you said. Your stomach disagreed.' })),

  K('c020', 1, 'paris', 'citizen',
    '收盐税的税吏把账本递给你：“你是银行的人，帮我算算——这家人还能榨出几个苏？”',
    'The salt-tax collector hands you his book. "You\'re a banking man. How many more sous can we squeeze from this household?"',
    o('帮他算清', 'Do the sums', [5, 10, -10, -10], ['cold'], { a: '你算得很准，准得让人害怕。', ae: 'Your sums were exact. Frighteningly exact.' }),
    o('故意算错', 'Botch the sums', [0, -5, 5, 10], ['idealist', 'revenge'], { a: '那家人多吃了一个月面包。', ae: 'That family ate for one more month.' })),

  K('c021', 1, 'london', 'darnay',
    '一个年轻法国人来银行换钱，说自己靠教法语糊口。他戒指上有枚家族纹章，被他用拇指悄悄盖住了。',
    'A young Frenchman changes money, saying he lives by teaching French. His ring bears a family crest. His thumb quietly covers it.',
    o('多收手续费', 'Charge him extra', [0, 5, -5, 5], ['opportunist'], { a: '他付了，一声没吭。贵族都这样。', ae: 'He paid without a word. Aristocrats do.' }),
    o('替他保密', 'Keep his secret', [0, -5, 10, -5], ['mercy'], { s: ['darnay_friend'], a: '“叫我达内吧。真名，以后再说。”', ae: '"Call me Darnay. My real name can wait."' })),

  K('c022', 1, 'london', 'lorry',
    '洛里在账本扉页写：“这是最好的时代，也是最坏的时代。”下一行写：年息四厘。他问你：“哪行更要紧？”',
    'Lorry writes in the ledger: "It was the best of times, it was the worst of times." Beneath: "Interest, four per cent." "Which line matters more?"',
    o('年息四厘', 'The interest', [0, 10, -5, -5], ['prudent'], { a: '洛里欣慰：“你会在台尔森待很久。”', ae: "\"You'll go far at Tellson's.\"" }),
    o('那个时代', 'The times', [0, -5, 5, 5], ['idealist'], { a: '洛里叹气：“时代可不付利息。”', ae: '"The times," sighs Lorry, "pay no interest."' })),

  // ===================== 第二幕 金线 1780–1788 =====================
  K('c023', 2, 'london', 'lucie',
    '索霍区的小院里，露西把父亲、洛里、你，连醉醺醺的卡顿都拢在同一盏灯下：“这根金线，谁都不许剪断。”',
    'In the little Soho house Lucie gathers her father, Lorry, you—even a tipsy Carton—beneath one lamp. "This golden thread: nobody may cut it."',
    o('守着这盏灯', 'Stay by the hearth', [10, -5, 10, -5], ['mercy'], { a: '那晚的汤，你记了一辈子。', ae: 'You remembered that soup all your life.' }),
    o('连夜回巴黎', 'Back to Paris tonight', [-5, 10, -5, 5], ['opportunist'], { a: '露西在窗口留了一盏灯。', ae: 'Lucie left a lamp in the window.' }),
    { beat: 14 }),

  K('c024', 2, 'london', 'darnay',
    '老贝利法庭审法国人达内间谍案，旁听席嗡嗡作响，像等开饭的苍蝇。你能证明他那天在银行——开口就可能成同党。',
    'The Old Bailey tries Darnay as a spy; the gallery buzzes like flies awaiting dinner. You could swear he was at the bank that day—and be called his accomplice.',
    o('保持沉默', 'Stay silent', [0, 5, -10, -5], ['prudent'], { a: '幸好，一个醉鬼律师救了他。', ae: 'Luckily, a drunken barrister saved him anyway.' }),
    o('出庭作证', 'Take the stand', [-5, -10, 10, 0], ['idealist'], { s: ['darnay_friend'], a: '无罪。苍蝇们失望地散了。', ae: 'Acquitted. The flies disperse, disappointed.' })),

  K('c025', 2, 'london', 'carton',
    '卡顿在露西家窗外站了一整夜。你下班路过，他说：“别告诉她。一个废物，也有权看看灯光。”',
    'Carton has stood all night beneath Lucie\'s window. As you pass: "Don\'t tell her. Even a wastrel may look at a lit window."',
    o('劝他回家睡', 'Send him to bed', [5, 0, -5, -5], ['prudent'], { a: '他走了，影子却像留在了那里。', ae: 'He left. His shadow seemed to stay.' }),
    o('陪他站到天亮', 'Keep him company', [-10, 0, 10, 5], ['mercy'], { a: '天亮时他说：“今晚没那么冷。”', ae: 'At dawn: "Less cold tonight, somehow."' }),
    { once: false }),

  K('c026', 2, 'london', 'jerry',
    '杰瑞拉你入伙：今晚去“钓”间谍罗杰·克莱。“老主顾了，”他说，“就是那口棺材，抬起来轻得有点怪。”',
    'Jerry wants a partner tonight: the late spy Roger Cly. "Odd thing, though—that coffin carried awful light."',
    o('我不干', 'Count me out', [5, 0, 5, -5], ['prudent'], { a: '第二天杰瑞嘟囔：“亏大了。”', ae: 'Next day Jerry mutters: "Swindled!"' }),
    o('扛起铁锹', 'Grab a spade', [-10, 5, -5, 5], ['opportunist'], { a: '棺材里只有石头。克莱，还活着。', ae: 'Nothing inside but stones. Cly lives.' }),
    { req: ['jerry_secret'], w: 2 }),

  K('c027', 2, 'london', 'jerry',
    '小杰瑞问你：“我爸说他是‘复活人’，干的是一门科学。我长大也想当复活人，是不是很体面？”',
    'Young Jerry asks: "Father says he\'s a Resurrection-Man—a branch of science. I want to be one when I grow up. Respectable, ain\'t it?"',
    o('体面极了', 'Highly respectable', [0, 5, -10, 0], ['opportunist'], { a: '小杰瑞立志继承父业。', ae: 'Young Jerry resolves to follow his father.' }),
    o('今晚去看看', 'See for yourself', [-5, 0, 5, 5], ['idealist'], { s: ['jerry_secret'], a: '你看见了。你会后悔看见。', ae: "You saw. You'll wish you hadn't." }),
    { exc: ['jerry_secret'] }),

  K('c028', 2, 'paris', 'marquis',
    '侯爵要向银行贷款修猎场，抵押品是“佃农明年的收成”。他打个哈欠：“反正他们也吃不完。”',
    'The Marquis wants a loan for a hunting park, secured on "my peasants\' next harvest. They never eat it all anyway," he yawns.',
    o('批准贷款', 'Approve it', [5, 10, -10, -10], ['cold'], { a: '猎场很美，鹿比人吃得好。', ae: 'Lovely park. The deer ate better than the people.' }),
    o('驳回申请', 'Reject it', [0, -10, 5, 10], ['idealist'], { a: '侯爵：“台尔森也开始讲良心了？”', ae: "\"Since when has Tellson's a conscience?\"" }),
    { exc: ['marquis_dead'] }),

  K('c029', 2, 'paris', 'marquis',
    '侯爵的马车冲过喷泉边，一个孩子再没站起来。侯爵扔出一枚金币：“看好你们的崽子。”金币滚到了你脚边。',
    'The Marquis\'s carriage tears past the fountain. A child does not rise. A gold coin flies from the window: "Mind your brats." It rolls to your feet.',
    o('低头别看', 'Look at the ground', [0, 5, -15, -10], ['cold'], { s: ['marquis_dead'], a: '那夜之后，侯爵再没醒来。纸条署名：雅克。', ae: 'The Marquis never woke again. The note was signed: Jacques.' }),
    o('把金币扔回去', 'Throw the coin back', [0, -5, 10, 10], ['idealist', 'revenge'], { s: ['marquis_dead'], a: '车窗里传来：“谁扔的？”——可惜他没有明天了。', ae: '"Who threw that?" He would not live to find out.' }),
    { beat: 22 }),

  K('c030', 2, 'london', 'darnay',
    '侯爵死了，达内继承了爵位和庄园。他想全部放弃，让你经手把地契转给佃农——这会得罪他整个家族。',
    'The Marquis is dead; Darnay inherits title and lands. He wants to renounce it all and asks you to hand the deeds to the tenants—enraging his whole family.',
    o('劝他留条后路', 'Advise caution', [0, 5, -5, -5], ['prudent'], { a: '他留下了管家加贝尔看庄园。', ae: 'He leaves old Gabelle to mind the estate.' }),
    o('替他办妥', 'Do it for him', [0, -10, 10, 5], ['idealist'], { s: ['darnay_friend'], a: '“从今天起，我只是查尔斯·达内。”', ae: '"From today, I am only Charles Darnay."' }),
    { req: ['marquis_dead'] }),

  K('c031', 2, 'paris', 'citizen',
    '为侯爵之死，修路工加斯帕被抓走了，村里的喷泉被士兵围住，没人敢去打水。一个老妇问你：“先生，水也有罪吗？”',
    'For the Marquis\'s death they seized Gaspard; soldiers ring the village fountain and no one dares draw water. An old woman asks: "Monsieur, is water guilty too?"',
    o('去邻村打水', 'Fetch it elsewhere', [-5, 0, -5, -5], ['prudent'], { a: '你走了六里路，提回半桶水。', ae: 'Six miles for half a bucket.' }),
    o('领她们打水', 'Lead them to it', [5, 0, 5, 5], ['revenge'], { a: '那晚，村里有人在磨镰刀。', ae: 'That night, someone in the village sharpened a scythe.' }),
    { req: ['marquis_dead'] }),

  K('c032', 2, 'london', 'lorry',
    '洛里把金库钥匙交给你：“这里归你管了。年轻人，别相信任何人——包括我。”',
    'Lorry hands you the vault keys. "It\'s yours to mind now. Trust nobody, young man—myself included."',
    o('每晚对账三遍', 'Count it thrice nightly', [-5, 10, 0, -5], ['prudent'], { a: '你梦里都在数金币。', ae: 'You count guineas in your sleep.' }),
    o('开个小金库', 'Skim a little', [0, 10, -10, 0], ['opportunist'], { c: ['lorry_trust'], a: '洛里眯起眼：“我年轻时也想过。”', ae: '"I thought of that too, once," says Lorry, squinting.' }),
    { req: ['lorry_trust'], w: 2 }),

  K('c033', 2, 'london', 'lorry',
    '一位伯爵夫人要立刻取走全部存款，可规矩要提前三个月通知。她哭了。洛里在一旁看你怎么办。',
    'A countess demands all her savings at once; the rules require three months\' notice. She weeps. Lorry watches what you will do.',
    o('按规矩来', 'Rules are rules', [0, 5, -5, 0], ['prudent'], { s: ['lorry_trust'], a: '洛里在本子上给你打了个勾。', ae: 'Lorry puts a tick beside your name.' }),
    o('破例给她', 'Make an exception', [0, -10, 10, 5], ['mercy'], { a: '她连夜逃出了法国。', ae: 'She fled France that very night.' }),
    { exc: ['lorry_trust'] }),

  K('c034', 2, 'london', 'manette',
    '梅尼特医生在伦敦行医出了名，富太太们排长队。他想免费给码头工人看病，问你能否用银行名义募捐。',
    'Doctor Manette is now a fashionable physician. He wishes to treat dockers for free, and asks if the bank might raise funds in its name.',
    o('只接富太太', 'Stick to the rich', [5, 10, -10, -5], ['cold'], { a: '诊所的地毯换成了波斯货。', ae: 'The surgery got a Persian carpet.' }),
    o('敲锣募捐', 'Pass the hat', [-5, -10, 5, 5], ['mercy'], { a: '码头工人送来一筐鱼，有点臭。', ae: 'The dockers sent a basket of fish. Slightly off.' })),

  K('c035', 2, 'london', 'lucie',
    '小露西问你：“为什么夜里街角总有回声，像好多好多脚步？”露西在一旁停下了针线。',
    'Little Lucie asks: "Why do the street corners echo at night, like ever so many footsteps?" Her mother\'s needle stops.',
    o('说那是风', "It's only the wind", [0, 0, 5, -5], ['mercy'], { a: '回声，却一夜比一夜近。', ae: 'Yet the echoes came nearer every night.' }),
    o('说那是巴黎', "It's Paris, walking", [0, 0, -5, 5], ['idealist'], { a: '那一夜，孩子梦里全是脚步声。', ae: 'The child dreamed of nothing but footsteps.' }),
    { once: false }),

  K('c036', 2, 'london', 'carton',
    '卡顿拦住你：“替我转告她——为了她，为了她所爱的人，我愿意献出生命。”说完他自己先笑了：“当然，没人会信。”',
    'Carton stops you. "Tell her: for her, and for any dear to her, I would give my life." He laughs first. "Naturally, nobody believes it."',
    o('劝他少喝点', 'Drink less, Sydney', [5, 0, -5, -5], ['prudent'], { a: '他耸肩：“你说得对，我只是个醉鬼。”', ae: '"Quite right. I\'m only a drunk."' }),
    o('我信你', 'I believe you', [-5, 0, 10, 5], ['sacrifice'], { s: ['carton_bond'], a: '他愣了很久：“那就别忘了。”', ae: 'A long silence. "Then don\'t forget."' }),
    { beat: 28 }),

  K('c037', 2, 'paris', 'defarge',
    '德发日要你在银行里留意，哪些贵族在偷偷转移财产。“雅克，名单比枪更有用。”',
    'Defarge wants you to watch which nobles are quietly moving their money abroad. "A list, Jacques, is worth more than a musket."',
    o('银行要保密', 'Bank secrecy', [0, 5, 0, -10], ['prudent'], { a: '德发日：“保密？那就替我们保密。”', ae: '"Secrecy? Then keep ours too."' }),
    o('抄一份给他', 'Copy him the list', [5, -5, -10, 10], ['revenge'], { a: '你的字迹，被织进了毛线。', ae: 'Your handwriting was knitted into the wool.' }),
    { req: ['jacques'], w: 2 }),

  K('c038', 2, 'paris', 'mme_defarge',
    '德发日夫人在织一条长得没有尽头的围巾：“报仇和织毛线一样，一针都不能漏。”她递给你一团毛线。',
    'Madame Defarge knits an endless scarf. "Vengeance is like knitting: drop not a single stitch." She offers you a ball of wool.',
    o('婉言谢绝', 'Politely decline', [0, 0, 5, -10], ['prudent'], { a: '她不再看你。这比看你更可怕。', ae: 'She stops looking at you. That is worse.' }),
    o('接过毛线', 'Take the wool', [0, 0, -10, 10], ['revenge'], { a: '你学会了平针，也学会了记仇。', ae: 'You learned plain stitch. And how to hold a grudge.' })),

  K('c039', 2, 'paris', 'citizen',
    '一个从乡下来的修路工说，他在凡尔赛见到了国王，“国王看我，就像看一条狗。”他问你：“英国人，你们怎么对付国王？”',
    'A road-mender up from the country saw the King at Versailles. "He looked at me as at a dog." He asks: "Englishman, how do your lot deal with kings?"',
    o('我们讲宪法', 'We have a constitution', [0, 0, 0, -10], ['prudent'], { a: '修路工没听懂，有点失望。', ae: 'He did not understand. He looked let down.' }),
    o('我们换过一个', 'We replaced one', [0, 0, -5, 10], ['revenge'], { a: '这句话一夜之间传遍了整个区。', ae: 'By morning the whole quarter was repeating it.' })),

  K('c040', 2, 'paris', 'citizen',
    '四磅面包涨到十四个苏。面包师偷偷找你：“银行能借我面粉钱吗？我只卖给穷人，绝不涨价。”',
    'A four-pound loaf now costs fourteen sous. A baker sidles up: "Will the bank lend me for flour? I sell only to the poor, at the old price."',
    o('按利息借', 'Lend at interest', [5, 5, -5, -5], ['prudent'], { a: '面包师按时还钱，瘦了一圈。', ae: 'He repaid on time, a good deal thinner.' }),
    o('无息借他', 'Lend interest-free', [10, -15, 5, 5], ['mercy'], { a: '每天早上，你门口多一根面包。', ae: 'Every morning a loaf appears at your door.' })),

  K('c041', 2, 'london', 'jerry',
    '缉私船追上来了！杰瑞指着满舱白兰地，又指了指你：“扔一样下海，你挑。”',
    'The revenue cutter is gaining! Jerry points at the brandy, then at you. "One of you goes overboard. Your pick."',
    o('全扔海里', 'Dump the cargo', [0, -15, 0, -5], ['prudent'], { c: ['smuggler'], a: '鱼群那晚醉得很开心。', ae: 'The fish had a merry night of it.' }),
    o('全速冲过去', 'Outrun them', [-10, 15, 0, 10], ['opportunist'], { a: '你们赢了。你的帽子没赢。', ae: 'You won. Your hat did not.' }),
    { req: ['smuggler'], w: 2 }),

  K('c042', 2, 'london', 'darnay',
    '达内求婚前来问你：“要不要告诉梅尼特医生我的真姓？那是一个会让他想起地狱的姓。”',
    'Before proposing, Darnay asks you: "Should I tell Doctor Manette my true name? It is a name that may remind him of hell."',
    o('先瞒着吧', 'Keep it quiet', [0, 0, -10, -5], ['prudent'], { a: '秘密像金线上的一个结。', ae: 'A secret, like a knot in a golden thread.' }),
    o('说实话', 'Tell the truth', [0, 0, 10, 5], ['idealist'], { a: '医生答应了婚事，当晚却又拿起了鞋锤。', ae: 'He consented—then reached for his hammer that night.' }),
    { req: ['darnay_friend'], w: 2 }),

  K('c043', 2, 'paris', 'citizen',
    '一个自称雅克一号的人请你帮忙往圣安东尼运一车“土豆”。你掀开草席——真的是土豆。他叹气：“下次就不是了。”',
    'A man calling himself Jacques One asks you to cart "potatoes" into Saint Antoine. You lift the sacking—genuinely potatoes. He sighs: "Next time they won\'t be."',
    o('下次别找我', 'Never call on me', [0, 0, 0, -10], ['prudent'], { a: '他把你从名单上划掉了。哪张名单？', ae: 'He crossed you off a list. Which list?' }),
    o('下次也叫我', 'Count me in', [5, 0, -5, 5], ['revenge'], { a: '他塞给你两个土豆当定金。', ae: 'He pays a deposit of two potatoes.' }),
    { once: false }),

  K('c044', 2, 'london', 'lorry',
    '法国国王要向台尔森借钱。洛里问你：“国王的信用，和他的王冠一样稳吗？”',
    "The King of France wishes to borrow from Tellson's. Lorry asks: \"Is a king's credit as secure as his crown?\"",
    o('借，利息翻倍', 'Lend—double interest', [5, 10, -5, -10], ['opportunist'], { a: '1788年，国库宣布：空了。', ae: '1788: the royal treasury declared itself empty.' }),
    o('一个子儿不借', 'Not a farthing', [0, -10, 5, 5], ['idealist'], { a: '洛里：“你比我想的更像个银行家。”', ae: '"More of a banker than I thought."' })),

  K('c045', 2, 'london', 'jerry',
    '杰瑞嚼着稻草：“知道我最怕啥？怕人真能复活——那我这行就完了。”他请你替他的“副业”保密。',
    'Jerry chews a straw. "Know what scares me? Folk really coming back to life. Ruin my trade, that would." He begs you to keep his sideline quiet.',
    o('保密，收封口费', 'Silence, for a fee', [0, 5, -5, 0], ['opportunist'], { a: '杰瑞：“你比我还像复活人。”', ae: '"You\'re more resurrection-man than me."' }),
    o('劝他金盆洗手', 'Urge him to quit', [0, -5, 10, 5], ['mercy'], { a: '他嘟囔：“那我老婆可要高兴死了。”', ae: '"My missus\'d be fair delighted."' }),
    { req: ['jerry_secret'] }),

  K('c046', 2, 'london', 'lucie',
    '露西的小儿子病重。她攥着你的手：“你认识最好的医生……”可那位医生的诊金，是你半年薪水。',
    'Lucie\'s little son is gravely ill. She grips your hand: "You know the best doctor..." His fee is half a year of your wages.',
    o('介绍个便宜的', 'Find a cheaper one', [0, 5, -10, 0], ['cold'], { a: '你在账本上省下了一笔，心里欠下了一笔。', ae: 'Saved in the ledger. Owed in the heart.' }),
    o('付全款', 'Pay in full', [-5, -15, 10, 0], ['sacrifice'], { a: '孩子还是走了。她说：“谢谢你，他没受苦。”', ae: 'The boy still slipped away. "Thank you. He was at peace."' })),

  K('c047', 2, 'london', 'marquis',
    '侯爵来伦敦看侄子达内，顺手存了一箱“不便留在法国”的文件：“别看。好奇心会害死英国人。”',
    'Visiting his nephew Darnay, the Marquis deposits a box of papers "inconvenient to keep in France." "Don\'t look. Curiosity kills Englishmen."',
    o('原封收好', 'Seal it away', [0, 5, -5, -5], ['prudent'], { s: ['marquis_debt'], a: '侯爵：“你会有前途的。”', ae: '"You\'ll go far."' }),
    o('偷看一眼', 'Take a peek', [0, 0, 5, 5], ['idealist'], { a: '名单上有佃农、债户，还有一个名字：梅尼特。', ae: 'Tenants, debtors, and one more name: Manette.' }),
    { exc: ['marquis_dead'] }),

  K('c048', 2, 'london', 'manette',
    '露西婚礼后，医生把自己锁在屋里钉了九天鞋。洛里低声问你：“要不要趁他睡着，把鞋凳劈了？”',
    'After Lucie\'s wedding the Doctor locks himself in and cobbles for nine days. Lorry whispers: "Shall we chop up the bench while he sleeps?"',
    o('劈了它', 'Chop it up', [0, 0, 5, -5], ['prudent'], { a: '你们像两个销毁证据的贼。', ae: 'You felt like two thieves destroying evidence.' }),
    o('让他钉完', 'Let him finish', [0, -5, 5, 5], ['mercy'], { a: '第十天，他走出来，像什么都没发生。', ae: 'On the tenth day he emerged as if nothing had happened.' })),

  // ===================== 第三幕 风暴 1789–1793 =====================
  K('c049', 3, 'paris', 'defarge',
    '1789年7月14日，巴士底狱陷落。德发日拽着你冲进北塔：“一百零五号！搜！”墙缝里露出一卷发黄的纸。',
    'July 14th, 1789. The Bastille falls. Defarge drags you into the North Tower: "One Hundred and Five! Search!" A yellowed roll peeps from a crack.',
    o('揣进自己怀里', 'Pocket it yourself', [0, 0, 5, -10], ['prudent'], { s: ['manette_letter'], a: '那封信贴着你的心口，烫得像炭。', ae: 'The letter burned against your chest like a coal.' }),
    o('交给德发日', 'Hand it to Defarge', [0, 0, -10, 20], ['revenge'], { a: '他读完，只说了一个姓：埃弗雷蒙德。', ae: 'He read it and said one name: Evrémonde.' }),
    { beat: 35 }),

  K('c050', 3, 'paris', 'citizen',
    '一个自称“复仇女”的女人把一顶红帽子扣在你头上：“戴着它，或者被它记住。”',
    'A woman calling herself The Vengeance jams a red cap on your head. "Wear it—or be remembered by it."',
    o('悄悄摘下', 'Quietly remove it', [0, 0, 5, -10], [], { a: '她冲你笑了笑。你宁愿她骂你。', ae: 'She smiled at you. You\'d rather she had shouted.' }),
    o('戴正再喊口号', 'Wear it and cheer', [5, 0, -5, 15], ['opportunist'], { a: '红色很衬你。这才是问题。', ae: 'Red suits you. That is the problem.' })),

  K('c051', 3, 'paris', 'lorry',
    '1792年9月，台尔森巴黎分行的院子里，一群人围着磨刀石排队，火星四溅。洛里拉上窗帘：“别看。记账。”',
    'September 1792. In the courtyard of Tellson\'s Paris branch, a crowd queues at the grindstone, sparks flying. Lorry draws the curtain. "Don\'t look. Keep the books."',
    o('拉上窗帘', 'Draw the curtain', [0, 10, -10, 5], ['cold'], { a: '那一夜，账本上的字一个也没写对。', ae: 'Not one figure in the ledger came out right.' }),
    o('下楼去劝', 'Go down and plead', [-15, 0, 15, -15], ['sacrifice'], { a: '有人听了你的话，放下了刀。只有一个。', ae: 'One man listened and set down his blade. Just one.' }),
    { req: ['darnay_arrested'] }),

  K('c052', 3, 'paris', 'citizen',
    '城门哨兵翻着你的证件：“英国人？银行的？那你一定见过很多贵族的钱。”他舔了舔嘴唇。',
    'The barrier guard thumbs your papers. "English? A banker? Then you\'ve seen plenty of aristocrats\' money." He licks his lips.',
    o('塞点钱', 'Grease his palm', [0, -15, -5, 0], ['opportunist'], { a: '证件上多了个红戳：“爱国者”。', ae: 'A red stamp appears: "PATRIOT."' }),
    o('大谈人权宣言', 'Recite the Rights', [-5, 0, 5, 10], ['idealist'], { a: '哨兵感动得哭了，然后扣了你半天。', ae: 'He wept with emotion, then detained you all day.' }),
    { once: false }),

  K('c053', 3, 'paris', 'mme_defarge',
    '德发日夫人放下毛线：“你在伦敦，认识一个叫达内的人吧？”她的眼睛像两枚生锈的钉子。',
    'Madame Defarge lowers her knitting. "In London you know a man called Darnay, I think?" Her eyes are two rusty nails.',
    o('从没听过', 'Never heard of him', [0, 0, -10, 10], ['cold'], { a: '她点头：“很好。我也会忘了你。”暂时。', ae: '"Good. Then I may forget you." For now.' }),
    o('他是个好人', 'A good man', [0, 0, 10, -10], ['idealist'], { s: ['on_the_list'], a: '她又织了一针，很慢，很仔细。', ae: 'One more stitch. Slow. Careful.' }),
    { req: ['darnay_friend'], w: 2 }),

  K('c054', 3, 'london', 'darnay',
    '一封巴黎监狱的信寄到台尔森，收件人“前侯爵埃弗雷蒙德”。老管家加贝尔写道：“看在上帝份上，救救我。”',
    'A letter from a Paris prison reaches Tellson\'s, addressed to "the former Marquis St. Evrémonde." Old Gabelle writes: "For the love of God, save me."',
    o('压下这封信', 'Bury the letter', [0, 5, -15, -5], ['cold'], { a: '信在抽屉里躺了一夜。第二天，它不见了。', ae: 'It lay in a drawer one night. Next morning, gone.' }),
    o('交给达内', 'Give it to Darnay', [0, 0, 10, 5], ['idealist'], { s: ['gabelle_letter'], a: '达内读完，望向海峡对岸。', ae: 'Darnay read it, and looked across the Channel.' }),
    { exc: ['darnay_arrested', 'gabelle_letter'] }),

  K('c055', 3, 'london', 'darnay',
    '达内收拾好了行李：“加贝尔在等我。你陪我去巴黎吗？你比我熟那边的门路。”',
    'Darnay has packed. "Gabelle is waiting for me. Will you come to Paris? You know the ways there better than I."',
    o('劝他别去', 'Beg him to stay', [0, 0, -5, -10], ['prudent'], { a: '他握了握你的手：“我非去不可。”', ae: '"I must go," he said, and shook your hand.' }),
    o('陪他上路', 'Go with him', [-5, -5, 10, 5], ['idealist'], { s: ['darnay_friend'], a: '马车驶向南方，像被磁石吸着。', ae: 'The coach rolled south, as if drawn by a lodestone.' }),
    { req: ['gabelle_letter'], exc: ['darnay_arrested'], w: 3 }),

  K('c056', 3, 'paris', 'darnay',
    '1792年，达内为救老管家回到巴黎，在城门被拦下：“流亡贵族，押送拉福斯监狱。”他回头，看见了你。',
    '1792. Darnay returns to save his old steward and is stopped at the barrier: "Emigrant aristocrat. To La Force." He turns, and sees you.',
    o('装作不认识', 'Feign ignorance', [5, 0, -15, 10], ['cold'], { s: ['darnay_arrested'], a: '他被押走时没有怪你。这更难受。', ae: 'He did not blame you. That was worse.' }),
    o('上前作保', 'Vouch for him', [-5, -5, 10, -10], ['sacrifice'], { s: ['darnay_arrested', 'on_the_list'], a: '哨兵在你的名字下面画了一道线。', ae: 'The guard underlined your name.' }),
    { beat: 42 }),

  K('c057', 3, 'paris', 'manette',
    '梅尼特医生成了巴黎的英雄——巴士底狱的老囚犯。“我要用我的苦难，换女婿一条命。”他请你陪他跑遍各区委员会。',
    'Doctor Manette is a hero of Paris now—a prisoner of the Bastille. "My suffering shall buy my son-in-law\'s life." He asks you to tour the committees with him.',
    o('劝他别冒险', 'Urge caution', [5, 0, -5, -5], ['prudent'], { a: '他第一次没有听你的。', ae: 'For the first time, he did not listen to you.' }),
    o('陪他奔走', 'Walk with him', [-10, -5, 10, 5], ['mercy'], { a: '他的白发，比任何通行证都管用。', ae: 'His white hair opened more doors than any pass.' }),
    { req: ['darnay_arrested'], w: 2 }),

  K('c058', 3, 'paris', 'lucie',
    '露西每天下午都站在拉福斯监狱外的街角，因为达内也许能从某扇窗看见她。一个锯木匠天天盯着她笑。',
    'Every afternoon Lucie stands at a corner outside La Force, in case Darnay can glimpse her from some window. A wood-sawyer watches her, grinning.',
    o('劝她回家', 'Send her home', [5, 0, -5, 0], ['prudent'], { a: '她第二天还是去了。', ae: 'She went again the next day.' }),
    o('陪她一起站', 'Stand beside her', [-5, 0, 10, -10], ['mercy'], { a: '锯木匠咧嘴：“看，我的小断头台。”', ae: 'The sawyer grins: "Behold my little guillotine."' }),
    { req: ['darnay_arrested'], w: 2 }),

  K('c059', 3, 'paris', 'citizen',
    '街上跳起了卡马尼奥拉舞，五百人围成一圈。一个女人把你拽进去：“不跳的，都是贵族！”',
    'The Carmagnole fills the street, five hundred dancing in a ring. A woman hauls you in: "Whoever won\'t dance is an aristocrat!"',
    o('崴脚装伤', 'Fake a twisted ankle', [-5, 0, 0, -5], ['prudent'], { a: '你装得太像，真的崴了。', ae: 'You faked it so well you truly twisted it.' }),
    o('跳到天亮', 'Dance till dawn', [-10, 0, 0, 15], ['opportunist'], { a: '你跳得太好，被推选为区委员。', ae: 'You danced so well they elected you to the committee.' })),

  K('c060', 3, 'paris', 'jerry',
    '杰瑞在巴黎认出了间谍巴萨的同伙：“克莱？他那口棺材是我挖的——里面只有石头！”这个秘密，够换一张通行证。',
    'In Paris Jerry spots the spy Barsad\'s partner. "Cly? I dug up his coffin—nothing but stones!" A secret like that is worth a travel pass.',
    o('别惹间谍', "Don't poke spies", [0, 0, 0, -5], ['prudent'], { a: '杰瑞把秘密咽回去，噎得直咳。', ae: 'Jerry swallowed the secret and nearly choked.' }),
    o('拿去要挟', 'Blackmail him', [0, -5, -5, 5], ['opportunist'], { s: ['escape_papers'], a: '间谍脸色铁青：“你们要什么？”', ae: 'The spy goes grey. "What do you want?"' }),
    { req: ['jerry_secret'], w: 3 }),

  K('c061', 3, 'paris', 'jerry',
    '杰瑞把一桶兑了水的伦敦啤酒卖给国民卫队，说是“共和国特酿”。他分你一半利润，只要你帮着吆喝。',
    'Jerry sells the National Guard a cask of watered London ale as "Republican Reserve." Half the profit is yours if you help him hawk it.',
    o('不掺和', 'Stay out of it', [0, 0, 5, -5], [], { a: '杰瑞独吞了利润，也独吞了宿醉。', ae: 'Jerry kept the profit—and the hangover.' }),
    o('帮他吆喝', 'Hawk it loudly', [5, 15, -5, 5], ['opportunist'], { a: '卫队长喝完说：“有自由的味道。”', ae: 'The captain sips: "It tastes of liberty."' })),

  K('c062', 3, 'paris', 'citizen',
    '你被临时抽去当革命法庭陪审员。被告是个老裁缝，罪名是“替贵族改过裤子”。',
    'You are drafted as a juror of the Revolutionary Tribunal. The accused: an old tailor, charged with "altering trousers for aristocrats."',
    o('投无罪', 'Not guilty', [0, 0, 15, -20], ['mercy'], { a: '全场看你的眼神，像在量你的领口。', ae: 'The whole court eyed your collar size.' }),
    o('投有罪', 'Guilty', [5, 0, -15, 15], ['cold', 'revenge'], { a: '老裁缝看了你一眼，没有恨，只有累。', ae: 'He looked at you without hate. Only weariness.' }),
    { req: ['darnay_arrested'] }),

  K('c063', 3, 'paris', 'citizen',
    '区委员会贴出《嫌疑犯法》：凡“对自由缺乏热情”者，皆可逮捕。邻居在门口打量你：“公民，你今天热情吗？”',
    'The Law of Suspects is posted: anyone "lacking zeal for liberty" may be arrested. Your neighbour eyes you: "Citizen, are you zealous today?"',
    o('关门不理', 'Shut the door', [0, 0, 0, -10], ['prudent'], { a: '门关上了，猫眼却开着。', ae: 'The door shut. The peephole did not.' }),
    o('先举报对门', 'Denounce him first', [10, 5, -20, 15], ['opportunist', 'cold'], { a: '你后来才知道，他昨天刚举报过你。', ae: 'He had denounced you yesterday, it turned out.' }),
    { req: ['darnay_arrested'] }),

  K('c064', 3, 'paris', 'defarge',
    '德发日私下对你说：“她要的已经不止是正义了。她要一个家族断了根。”他问你：“我该劝劝她吗？”',
    'Defarge, privately: "It\'s no longer justice she wants. She wants a whole family ended." He asks: "Should I try to stop her?"',
    o('劝她收手', 'Yes, stop her', [0, 0, 10, -10], ['mercy'], { a: '他去了，回来时脸色像纸。', ae: 'He went. He came back pale as paper.' }),
    o('随她去吧', 'Let her be', [0, 0, -10, 10], ['cold'], { a: '德发日叹气：“风和火，谁拦得住。”', ae: '"Who can stop the wind and the fire?"' })),

  K('c065', 3, 'paris', 'mme_defarge',
    '你确定，德发日夫人的毛线里织着你的名字。复仇女笑嘻嘻地说：“夫人最近织得可快了。”',
    'You are certain your name is knitted into Madame Defarge\'s wool. The Vengeance giggles: "Madame knits so fast lately."',
    o('连夜逃回伦敦', 'Flee to London tonight', [-10, -15, 0, -10], ['prudent'], { c: ['on_the_list'], a: '多佛的白崖，从没这么好看过。', ae: 'The white cliffs had never looked so lovely.' }),
    o('当众表忠心', 'Prove your zeal', [0, -5, -10, 20], ['opportunist'], { c: ['on_the_list'], a: '她拆掉了一针。暂时的。', ae: 'She unpicked one stitch. For now.' }),
    { req: ['on_the_list'], w: 3 }),

  K('c066', 3, 'paris', 'lorry',
    '洛里把分行金库钥匙和一沓空白通行证交给你：“我老了。这些纸，能救命，也能要命。”',
    'Lorry hands you the branch vault keys and a sheaf of blank passes. "I\'m old. These papers can save a life—or cost one."',
    o('锁进保险箱', 'Lock them away', [0, 10, -5, -5], ['prudent'], { a: '保险箱很安全。门外的人不安全。', ae: 'The safe was secure. The people outside were not.' }),
    o('发给要逃的人', 'Hand them out', [0, -10, 15, -10], ['sacrifice'], { s: ['escape_papers'], a: '你给自己留了最后一张。', ae: 'You kept the last one for yourself.' }),
    { req: ['lorry_trust'], w: 2 }),

  K('c067', 3, 'paris', 'lorry',
    '洛里在分行门口犹豫：“一位老夫人求我们藏她三天。可台尔森银行……不是旅馆啊。”',
    'Lorry hesitates at the branch door. "An old lady begs us to hide her for three days. But Tellson\'s is not an inn."',
    o('送她出门', 'Turn her away', [0, 5, -10, 5], ['prudent'], { a: '她走时说：“愿上帝保佑台尔森。”', ae: '"God keep Tellson\'s," she said, leaving.' }),
    o('藏进金库', 'Hide her inside', [-5, -5, 10, -15], ['mercy'], { s: ['lorry_trust'], a: '洛里看了你很久：“你像我年轻时。”', ae: '"You remind me of myself," says Lorry at last.' }),
    { exc: ['lorry_trust'] }),

  K('c068', 3, 'paris', 'citizen',
    '达内被重审，检察官要找北塔那封信——它正在你怀里。陪审席的人说：“谁藏着证据，谁就是同谋。”',
    'Darnay is retried, and the prosecutor wants the North Tower letter—which is in your coat. A juror says: "Whoever hides evidence is an accomplice."',
    o('烧掉它', 'Burn it', [0, 0, 10, -15], ['mercy'], { c: ['manette_letter'], a: '纸灰飘进塞纳河，像一场小雪。', ae: 'The ashes drifted onto the Seine like snow.' }),
    o('交给法庭', 'Hand it over', [0, 5, -15, 20], ['cold', 'revenge'], { c: ['manette_letter'], a: '全场静了。医生用双手捂住了脸。', ae: 'Silence. The Doctor covered his face.' }),
    { req: ['manette_letter', 'darnay_arrested'], w: 3 }),

  K('c069', 3, 'paris', 'carton',
    '卡顿去药铺买了两小包东西，一包让你转交洛里：“明天下午两点，马车在门口等。别问为什么。”',
    'Carton buys two small packets at a chemist\'s and gives you one for Lorry. "Tomorrow, two o\'clock, a coach at the door. Don\'t ask why."',
    o('问清楚再说', 'Demand to know', [0, 0, -5, -5], ['prudent'], { a: '他笑：“你会知道的，在马车上。”', ae: '"You\'ll understand. In the coach."' }),
    o('照办，不问', 'Obey, no questions', [0, 0, 15, 5], ['sacrifice'], { s: ['escape_papers'], a: '他拍拍你：“记得那盏灯。”', ae: '"Remember the lamp," he says.' }),
    { req: ['carton_bond', 'darnay_arrested'], w: 3 }),

  K('c070', 3, 'paris', 'carton',
    '一个长得像达内的英国醉汉在河边念叨：“我是复活，我是生命……”他问你，人死之后，会不会变成更好的人。',
    'An English drunk who looks like Darnay mutters by the river: "I am the resurrection and the life..." He asks if a man might be better after death.',
    o('死了就是死了', 'Dead is dead', [0, 0, -10, 0], ['cold'], { a: '他点头：“也对。”背影却更孤单了。', ae: '"Quite so." His back looked lonelier.' }),
    o('会的', 'Yes, he might', [-5, 0, 10, 5], ['idealist'], { s: ['carton_bond'], a: '他笑了：“那我知道该做什么了。”', ae: '"Then I know what to do."' }),
    { exc: ['carton_bond'] }),

  K('c071', 3, 'paris', 'citizen',
    '人群里，一个要被押走的小女裁缝拉住你的袖子：“我什么都没做……你能握着我的手吗？我不想一个人走。”',
    'In the crowd, a little seamstress being led away catches your sleeve. "I did nothing... Will you hold my hand? I don\'t want to go alone."',
    o('别过脸去', 'Look away', [0, 0, -15, 10], ['cold'], { a: '你一辈子都记得那只袖子的重量。', ae: 'You felt the weight of that sleeve forever.' }),
    o('握住她的手', 'Hold her hand', [0, 0, 15, -15], ['sacrifice'], { a: '她说：“你的手真暖。”然后笑了。', ae: '"Your hand is warm," she said, and smiled.' }),
    { req: ['darnay_arrested'] }),

  K('c072', 3, 'paris', 'mme_defarge',
    '德发日夫人的毛线织到最后一行：埃弗雷蒙德，妻，女，还有那个医生。她抬眼看你：“你和他们，很熟？”',
    'Madame Defarge reaches the last row: Evrémonde, wife, daughter, and the Doctor. She looks up. "You know them well, I think?"',
    o('撇清关系', 'Disown them', [5, 0, -20, 15], ['cold'], { a: '她点头：“聪明人活得久。”', ae: '"Clever folk live long."' }),
    o('我是他们的朋友', 'I am their friend', [0, 0, 15, -20], ['sacrifice'], { s: ['on_the_list'], a: '毛线针，停在了你的名字上。', ae: 'The needles stopped at your name.' }),
    { beat: 47 }),

  K('c073', 3, 'paris', 'citizen',
    '面包店前的队伍排到了塞纳河边。一个国民卫队员插到你前面：“公民，给共和国让一让！”',
    'The bread queue stretches to the Seine. A National Guardsman cuts in front of you. "Make way for the Republic, citizen!"',
    o('让他', 'Let him', [-10, 0, 0, -5], ['prudent'], { a: '轮到你时，面包卖完了。', ae: 'When your turn came, the bread was gone.' }),
    o('把他拽回队尾', 'Send him back', [5, 0, 5, 10], [], { a: '全队为你鼓掌。他记下了你的长相。', ae: 'The queue cheered. He memorised your face.' }),
    { once: false }),

  K('c074', 3, 'paris', 'citizen',
    '区委员会要“征用”台尔森分行的金库，献给共和国。领头的，是上周你赊给他面包钱的鞋匠。',
    'The section committee comes to "requisition" Tellson\'s vault for the Republic. At its head: the cobbler you lent bread money last week.',
    o('说要请示伦敦', 'Must ask London', [0, 10, 0, -10], ['prudent'], { a: '鞋匠：“伦敦？那是哪个区？”', ae: '"London? Which section is that?"' }),
    o('献给共和国', 'For the Republic!', [0, -20, 0, 15], ['idealist'], { a: '鞋匠拥抱你，顺手摸走了你的怀表。', ae: 'The cobbler embraces you—and your pocket watch.' })),

  K('c075', 3, 'paris', 'defarge',
    '德发日知道你在走私：“帮我运一批传单去伦敦，给英国的雅克们。不然——你懂的。”',
    'Defarge knows about your smuggling. "Carry a bundle of pamphlets to London, for the English Jacques. Otherwise—you understand."',
    o('拒绝', 'Refuse', [0, 0, 5, -15], ['idealist'], { c: ['smuggler'], a: '你的邮袋，从此干净得可疑。', ae: 'Your mailbags became suspiciously clean.' }),
    o('装船', 'Load them aboard', [0, 10, -5, 15], ['opportunist'], { a: '伦敦的咖啡馆里，有人开始唱《马赛曲》。', ae: 'In a London coffee-house, someone hums the Marseillaise.' }),
    { req: ['smuggler'], w: 2 }),

  K('c076', 3, 'paris', 'darnay',
    '你去拉福斯监狱探视达内。他托你带封信给露西：“若我出不去，告诉她，我不后悔回来。”看守伸手要检查。',
    'You visit Darnay in La Force. He gives you a letter for Lucie: "If I never leave, tell her I don\'t regret coming back." The jailer holds out his hand.',
    o('交给看守查', 'Let him inspect it', [0, 0, -5, 5], ['prudent'], { a: '看守读得很慢，还纠正了一个错字。', ae: 'The jailer read slowly and corrected a spelling.' }),
    o('藏进鞋底', 'Hide it in boot', [0, 0, 10, -10], ['mercy'], { a: '信纸带着鞋油味，露西说那是世上最香的信。', ae: 'It smelled of boot-black. Lucie called it the sweetest letter alive.' }),
    { req: ['darnay_arrested'] }),

  K('c077', 3, 'paris', 'citizen',
    '1793年1月，路易·卡佩上了断头台。街上有人兜售“国王最后一缕头发”，一个苏一根。',
    'January 1793. Louis Capet goes to the guillotine. A hawker sells "the King\'s last hairs," one sou apiece.',
    o('默默回家', 'Go home quietly', [0, 0, 5, -10], [], { a: '那天全城的钟都没响。', ae: 'Not one bell in Paris rang that day.' }),
    o('买一根留念', 'Buy a souvenir', [0, -5, -5, 10], ['opportunist'], { a: '你买的头发是棕色的。国王是白头发。', ae: 'Your hair was brown. The King\'s was grey.' }),
    { req: ['darnay_arrested'] }),

  K('c078', 3, 'paris', 'citizen',
    '区委员会在城堡废墟里翻出一本旧账，上面有你替侯爵经手的签名。委员冷笑：“公民，解释一下？”',
    'In the château ruins the committee found an old ledger bearing your signature on the Marquis\'s business. "Explain yourself, citizen."',
    o('花钱消灾', 'Pay it away', [0, -20, 0, 5], ['opportunist'], { c: ['marquis_debt'], a: '账本进了壁炉，你的积蓄进了委员的口袋。', ae: 'The ledger went to the fire; your savings to his pocket.' }),
    o('揭发更多贵族', 'Name bigger fish', [0, 5, -15, 15], ['opportunist'], { c: ['marquis_debt'], a: '你的名字被划掉，换上了七个别人的。', ae: 'Your name was struck out. Seven others written in.' }),
    { req: ['marquis_debt'], w: 3 }),

  K('c079', 3, 'paris', 'citizen',
    '你怀里那张通行证能带一个人出城。城门口，一个母亲抱着孩子在哭。身后，是你自己的命。',
    'The pass in your coat will take one person out of Paris. At the gate a mother weeps, her child in her arms. Behind you: your own life.',
    o('自己留着', 'Keep it', [5, 0, -15, 5], ['prudent', 'cold'], { a: '马车出城时，你没敢回头。', ae: 'As the coach left, you dared not look back.' }),
    o('给她们', 'Give it to them', [0, 0, 20, -10], ['sacrifice'], { c: ['escape_papers'], a: '孩子隔着车窗冲你挥手。你也挥了。', ae: 'The child waved through the window. You waved back.' }),
    { req: ['escape_papers'], w: 2 })
];

// ===================== 结局 =====================
export const ENDINGS = {
  bread_0: {
    title: '一块面包的价钱', titleEn: 'The Price of a Loaf',
    epitaph: '你替台尔森数过上万枚金币，最后输给了一块面包。',
    epitaphEn: "You counted ten thousand guineas for Tellson's, and lost to a single loaf.",
    city: 'paris', death: '饿倒在圣安东尼街头', deathEn: 'Hunger in Saint Antoine'
  },
  bread_100: {
    title: '布丁比革命凶险', titleEn: 'Death by Pudding',
    epitaph: '巴黎的风暴没能要你的命，伦敦的第七块约克郡布丁做到了。',
    epitaphEn: 'The Paris storm could not finish you. The seventh Yorkshire pudding could.',
    city: 'london', death: '第七块约克郡布丁', deathEn: 'The seventh Yorkshire pudding'
  },
  gold_0: {
    title: '债务人监狱', titleEn: 'The Debtors\' Prison',
    epitaph: '台尔森银行把你扫出了门。你的墓碑上刻着：余额不足。',
    epitaphEn: "Tellson's swept you out the door. Your headstone reads: Insufficient Funds.",
    city: 'london', death: '余额不足', deathEn: 'Insufficient funds'
  },
  gold_100: {
    title: '富得太显眼', titleEn: 'Conspicuously Rich',
    epitaph: '你的金币多到发光，于是人群请你去路灯下照照亮。',
    epitaphEn: 'Your gold shone so bright the crowd invited you to light a lamp-post.',
    city: 'paris', death: '被请上了路灯杆', deathEn: 'An invitation to the lamp-post'
  },
  heart_0: {
    title: '第二个侯爵', titleEn: 'The Second Marquis',
    epitaph: '你终于活成了那辆马车。某个清晨，枕边多了张纸条，署名：雅克。',
    epitaphEn: 'At last you became the carriage. One dawn, a note on your pillow, signed: Jacques.',
    city: 'paris', death: '一张署名雅克的纸条', deathEn: 'A note signed Jacques'
  },
  heart_100: {
    title: '不会撒谎的人', titleEn: 'The Man Who Could Not Lie',
    epitaph: '在人人告密的年代，法官问你认不认识他们。你说：认识，他们都是好人。',
    epitaphEn: 'In an age of informers the judge asked if you knew them. "Yes. Good people, all."',
    city: 'paris', death: '不会撒谎', deathEn: 'Inability to lie'
  },
  fury_0: {
    title: '冷静即有罪', titleEn: 'Guilty of Calm',
    epitaph: '在那个年代，最致命的罪名叫作“不够热情”。你很冷静，直到最后一刻。',
    epitaphEn: 'In those years the deadliest crime was insufficient zeal. You stayed calm to the very end.',
    city: 'paris', death: '可疑的温和', deathEn: 'Suspicious moderation'
  },
  fury_100: {
    title: '下一个是你', titleEn: 'Next!',
    epitaph: '你喊了一辈子“下一个”，直到有一天，人群喊出了你的名字。',
    epitaphEn: 'All your life you shouted "Next!"—until the crowd shouted your name.',
    city: 'paris', death: '自己写的名单', deathEn: 'A list in his own hand'
  },
  survive_london: {
    title: '伦敦的炉火', titleEn: 'A London Hearth',
    epitaph: '最好的时代，最坏的时代，你都活过来了——而且账目分毫不差。',
    epitaphEn: 'The best of times, the worst of times—you survived both, and the books still balanced.',
    city: 'london', death: null, deathEn: null
  },
  survive_paris: {
    title: '共和国公民', titleEn: 'Citizen of the Republic',
    epitaph: '你留在了巴黎，学会了每天早上数一数，邻居还剩几个。',
    epitaphEn: 'You stayed in Paris, and learned each morning to count how many neighbours remained.',
    city: 'paris', death: null, deathEn: null
  },
  survive_lorry: {
    title: '台尔森的老伙计', titleEn: "Tellson's Man",
    epitaph: '生意就是生意。可你在账本最后一页，偷偷记下了每个救过的人。',
    epitaphEn: 'Business is business. Yet on the ledger\'s last page you listed everyone you saved.',
    city: 'london', death: null, deathEn: null
  },
  survive_revenge: {
    title: '新的编织者', titleEn: 'The New Knitter',
    epitaph: '你也学会了织毛线。一针一个名字，从不漏针。',
    epitaphEn: 'You took up knitting too. One stitch, one name. Never a dropped stitch.',
    city: 'paris', death: null, deathEn: null
  },
  survive_cold: {
    title: '无人哀悼', titleEn: 'Unmourned',
    epitaph: '你活下来了，没欠过任何人。也没有任何人，记得你。',
    epitaphEn: 'You survived, owing no one. And no one remembers you.',
    city: 'london', death: null, deathEn: null
  },
  secret_carton: {
    title: '远远更好的事', titleEn: 'A Far, Far Better Thing',
    epitaph: '驶离巴黎的马车上，露西睡在你肩头。身后，有人替所有人走上了台阶。',
    epitaphEn: 'In the coach leaving Paris, Lucie sleeps on your shoulder. Behind you, one man climbs the steps for all.',
    city: 'london', death: null, deathEn: null
  }
};

// 第 50 步时按顺序判定，命中第一条即生效。
// 字段：flags = 必须全部拥有；notFlags = 必须全部没有；min = 数值 ≥；max = 数值 ≤。无条件 = 兜底。
export const SURVIVAL_RULES = [
  { ending: 'secret_carton', flags: ['carton_bond'], min: { heart: 70 } },
  { ending: 'survive_revenge', flags: ['jacques'], min: { fury: 70 } },
  { ending: 'survive_cold', max: { heart: 30 } },
  { ending: 'survive_lorry', flags: ['lorry_trust'], min: { gold: 60 } },
  { ending: 'survive_paris', notFlags: ['escape_papers'], min: { fury: 55 } },
  { ending: 'survive_london' }
];

// ===================== 人格 =====================
export const PERSONAS = [
  {
    id: 'carton', tag: 'sacrifice', name: '卡顿型', nameEn: 'The Carton',
    line: '你总说自己一文不值，却随时准备替别人付账。',
    lineEn: 'You call yourself worthless, yet you always pick up the bill—even the last one.',
    quote: 'It is a far, far better thing that I do, than I have ever done; it is a far, far better rest that I go to than I have ever known.',
    quoteZh: '我此刻所做的，远比我平生所做的一切更好；我将得到的安息，远比我平生所知的一切更好。'
  },
  {
    id: 'lucie', tag: 'mercy', name: '露西型', nameEn: 'The Lucie',
    line: '世界在撕裂，你偏要把每个人都缝回一盏灯下。',
    lineEn: 'The world tears apart; you insist on stitching everyone back beneath one lamp.',
    quote: 'She was the golden thread that united him to a Past beyond his misery, and to a Present beyond his misery.',
    quoteZh: '她是那根金线，把他系向苦难之前的过去，也系向苦难之外的今天。'
  },
  {
    id: 'mme_defarge', tag: 'revenge', name: '德发日型', nameEn: 'The Defarge',
    line: '你从不吵架，你只是默默记下，一针都不漏。',
    lineEn: 'You never argue. You simply remember—every single stitch.',
    quote: 'Tell the Wind and the Fire where to stop; but don\'t tell me.',
    quoteZh: '去叫风和火停下吧，别来叫我。'
  },
  {
    id: 'marquis', tag: 'cold', name: '侯爵型', nameEn: 'The Marquis',
    line: '你的马车很稳，因为你从不看车轮底下。',
    lineEn: 'Your carriage rides smoothly, because you never look beneath the wheels.',
    quote: 'Repression is the only lasting philosophy.',
    quoteZh: '压制，才是唯一经久不衰的哲学。'
  },
  {
    id: 'lorry', tag: 'prudent', name: '洛里型', nameEn: 'The Lorry',
    line: '嘴上全是生意，抽屉里藏着所有人的平安。',
    lineEn: 'All business on the lips; everyone\'s safety tucked in your drawer.',
    quote: 'Feelings! I have no time for them, no chance of them. I pass my whole life, miss, in turning an immense pecuniary Mangle.',
    quoteZh: '感情？我没空，也没机会。小姐，我这辈子都在摇一台巨大的钱币轧布机。'
  },
  {
    id: 'darnay', tag: 'idealist', name: '达内型', nameEn: 'The Darnay',
    line: '明知前面是城门的拦杆，你还是为一封信回去了。',
    lineEn: 'You knew the barrier was waiting, and still went back for one letter.',
    quote: 'It was the spring of hope, it was the winter of despair.',
    quoteZh: '那是希望的春天，也是绝望的冬天。'
  },
  {
    id: 'jerry', tag: 'opportunist', name: '杰瑞型', nameEn: 'The Jerry',
    line: '时代再乱，你总能在里面找到一份副业。',
    lineEn: 'However wild the times, you always find a sideline in them.',
    quote: 'You\'d be in a Blazing bad way, if recalling to life was to come into fashion, Jerry!',
    quoteZh: '杰瑞啊，要是“招回人世”流行起来，你这行可就要完蛋喽！'
  }
];
