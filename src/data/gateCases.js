/**
 * 1792：断头台城门官 (Gatekeeper of 1792)
 * Golden 3-Case Playable Slice — zero literary homework, instant visual inspection drama.
 */

export const DAILY_ORDERS = [
  {
    id: 'r1',
    tag: '铁律一',
    tagEn: 'ORDER I',
    text: '凡携带「波旁皇室百合纹」或贵族地契者，一律扣押',
    textEn: 'Detain anyone bearing Royal Fleur-de-lis or noble deeds'
  },
  {
    id: 'r2',
    tag: '铁律二',
    tagEn: 'ORDER II',
    text: '通行证须盖 1792 共和元年真章，旧章涂改立即扣押',
    textEn: 'Passports must bear genuine 1792 Year I seals; forged dates void'
  },
  {
    id: 'r3',
    tag: '铁律三',
    tagEn: 'ORDER III',
    text: '持「台尔森银行真火漆公函」之外交信使，依法放行',
    textEn: "Couriers holding genuine Tellson's Bank wax dispatches are exempt"
  }
];

export const GATE_CASES = [
  {
    id: 'case_noble',
    order: 1,
    banner: '第一审 · 夜雾渡船客',
    bannerEn: 'CASE I · THE NIGHT FERRY',
    portrait: 'noble_disguise',
    docPortrait: 'noble_disguise',
    wantedPortrait: null,
    name: '玛丽·杜邦',
    nameEn: 'Marie Dupont',
    claimedRole: '圣安东尼街区 · 洗衣妇',
    claimedRoleEn: 'Laundress of Saint-Antoine',
    destination: '渡海前往英国多佛',
    destinationEn: 'Packet Boat to Dover',
    docNumber: 'PASS-1792-084',
    docYearText: '1792（墨迹深浅不一）',
    docYearTextEn: '1792 (smudged over 1789)',
    docSealLabel: '旧税印 · 疑似百合底纹',
    docSealLabelEn: 'Old Tax Seal · Faint Lily',
    docSealFake: true,
    openingLine: '“长官行行好……我只是去多佛投奔姨妈的粗使洗衣妇，雾大船快开了！”',
    openingLineEn: '“Mercy, Citizen Officer… I am only a poor laundress bound for Dover!”',
    // Hotspots on suspect portrait (normalized 0..1) + passport seal + trunk
    clues: [
      {
        id: 'pearl_earring',
        where: 'portrait',
        x: 0.635,
        y: 0.43,
        label: '南洋珍珠耳坠',
        labelEn: 'South Sea Pearl Earring',
        detail: '粗麻灰头巾下藏着名贵皇家珍珠耳坠——洗衣妇绝买不起！',
        detailEn: 'A lustrous royal pearl gleams beneath her coarse burlap hood!',
        severity: 'contradiction',
        reaction: '“这、这是我娘留下的假珠子！您看错了！”',
        reactionEn: '“Th-that is only glass from my mother!”'
      },
      {
        id: 'fleur_collar',
        where: 'portrait',
        x: 0.68,
        y: 0.72,
        label: '皇室金百合内衬',
        labelEn: 'Royal Fleur-de-lis Silk',
        detail: '披肩裂缝露出蓝绸金丝「波旁皇室三叶百合」刺绣（违背铁律一）！',
        detailEn: 'Royal blue silk with gold fleur-de-lis peeks inside her shawl!',
        severity: 'fatal',
        reaction: '（她脸色煞白，死死攥紧领口往后退了一步）',
        reactionEn: '(She turns pale, clutching her cloak shut in terror.)'
      },
      {
        id: 'forged_seal',
        where: 'passport',
        label: '1789 涂改旧章',
        labelEn: 'Altered 1789 Seal',
        detail: '火漆底纹是前朝税章，签发年「1789」被浓墨硬描成了「1792」（违背铁律二）！',
        detailEn: 'An old royal seal with 1789 crudely inked into 1792!',
        severity: 'fatal',
        reaction: '“别声张……求您千万别喊卫兵！”',
        reactionEn: '“Hush… please do not call the guards!”'
      },
      {
        id: 'trunk_deed',
        where: 'trunk',
        itemIcon: '📜',
        label: '侯爵府私印地契',
        labelEn: 'Marquis Estate Deed',
        detail: '撬开洗衣木桶暗格：搜出丝绸舞鞋与「圣埃弗雷蒙德侯爵表侄女」地契！',
        detailEn: 'Hidden inside her tub: silk slippers & an Evrémonde estate deed!',
        severity: 'fatal',
        reaction: '“全完了……长官，我有钱！我给您钱！”',
        reactionEn: '“I am undone… Officer, take my gold!”'
      }
    ],
    bribe: {
      triggerClues: 2,
      amount: 50,
      pitch: '她哭着从暗袋推出 50 枚金路易：“我只是侯爵家没害过人的远亲！听说长官家小女儿正发高烧缺药钱？收下它盖绿章，孩子今晚就有救！”',
      pitchEn: 'She slides 50 gold louis across the desk: “I harmed no one! Your little daughter has a fever—take this gold and stamp GREEN!”'
    },
    outcomes: {
      pass_bribe: {
        goldDelta: 50,
        strikeDelta: 1,
        daughterSaved: true,
        tag: '贪财留情',
        summary: '你不动声色收下 50 金币盖下绿章。女儿的退烧药有着落了，但窗外督察记下了你一笔可疑放行。',
        summaryEn: 'You pocket the 50 gold and stamp GREEN. Medicine for your child—and 1 Inspector Strike.'
      },
      pass_blind: {
        goldDelta: 5,
        strikeDelta: 1,
        daughterSaved: false,
        tag: '失察漏放',
        summary: '你没查出破绽就放她登船！半小时后暗探回报那是潜逃贵族，督察大怒记过一次！',
        summaryEn: 'You waved an aristocrat through without catching her disguise! +1 Inspector Strike.'
      },
      detain: {
        goldDelta: 15,
        strikeDelta: 0,
        daughterSaved: false,
        tag: '铁面缉拿',
        summary: '红章重重砸下！卫兵拖走了哭喊的侯爵表侄女，督察满意点头，赏你 15 金币公事补贴。',
        summaryEn: 'RED STAMP! Guards drag the disguised noblewoman away. +15 gold bounty, 0 strikes.'
      }
    }
  },

  {
    id: 'case_jerry',
    order: 2,
    banner: '第二审 · 满手坟土的怪客',
    bannerEn: 'CASE II · THE GRAVEYARD MESSENGER',
    portrait: 'jerry',
    docPortrait: 'jerry',
    wantedPortrait: null,
    name: '杰瑞·克兰彻',
    nameEn: 'Jerry Cruncher',
    claimedRole: '伦敦台尔森银行 · 外交信使',
    claimedRoleEn: "Tellson's Bank Courier",
    destination: '护送银行业务卷宗返英',
    destinationEn: 'Returning Dispatches to London',
    docNumber: 'PASS-1792-219',
    docYearText: '1792 共和元年 · 十一月',
    docYearTextEn: 'Nov 1792 · Year I',
    docSealLabel: '巴黎海关 1792 真印',
    docSealLabelEn: 'Valid 1792 Customs Seal',
    docSealFake: false,
    openingLine: '“嘿嘿，长官别看我长得糙，老子可是伦敦台尔森银行正经跑腿的！”',
    openingLineEn: '“Easy with that glass, Guv’nor! Honest courier from Tellson’s Bank!”',
    clues: [
      {
        id: 'rusty_fingers',
        where: 'portrait',
        x: 0.45,
        y: 0.88,
        label: '棺材铁锈红泥',
        labelEn: 'Coffin-Rust Fingers',
        detail: '指甲缝里塞满潮湿墓园泥与棺钉铁锈——这老小子半夜干过盗墓副业！',
        detailEn: 'Graveyard clay and iron coffin-rust cake his knuckles!',
        severity: 'suspicious',
        reaction: '“咳！那是……那是给马车上油蹭的铁锈！不犯你们城门王法吧？”',
        reactionEn: '“Just axle-grease and honest rust, Citizen!”'
      },
      {
        id: 'spiky_hair',
        where: 'portrait',
        x: 0.46,
        y: 0.16,
        label: '铁刺倒竖乱发',
        labelEn: 'Iron-Spike Hair',
        detail: '头发像墓地铁栏杆一样根根倒竖，眼神乱瞟，看着像极了黑市老油条。',
        detailEn: 'Bristling iron-grey spikes—shifty as a midnight resurrection-man.',
        severity: 'suspicious',
        reaction: '“长相难看也要上断头台？你们巴黎讲不讲理！”',
        reactionEn: '“Is ugly hair a hanging offence in Paris now?!”'
      },
      {
        id: 'valid_seal',
        where: 'passport',
        label: '1792 海关真章无误',
        labelEn: 'Genuine 1792 Seal',
        detail: '放大核验：1792 共和元年钢印齿纹分毫不差，通行证完全合规！',
        detailEn: 'Crisp 1792 Republic steel engraving—this passport is 100% genuine.',
        severity: 'clear',
        reaction: '“我就说嘛，洛里先生办的证哪能有假！”',
        reactionEn: '“Told yer! Mr. Lorry’s papers are solid gold!”'
      },
      {
        id: 'trunk_dispatch',
        where: 'trunk',
        itemIcon: '🔏',
        label: '台尔森真火漆公函',
        labelEn: "Tellson's Wax Dispatch",
        detail: '翻开帆布包：一把沾泥小铁锹，以及盖着「台尔森双城真火漆」的豁免公函（符合铁律三）！',
        detailEn: "A muddy crowbar—PLUS a genuine Tellson's Bank diplomatic dispatch (Exempt under Order III)!",
        severity: 'clear',
        reaction: '“看清喽！台尔森银行特许公函！扣了我你可得挨督察板子！”',
        reactionEn: '“See that Tellson wax? Detain me and YOUR head rolls!”'
      }
    ],
    bribe: null,
    outcomes: {
      pass_clean: {
        goldDelta: 25,
        strikeDelta: 0,
        tag: '明察秋毫',
        summary: '你没被他的盗墓贼长相唬住，核准台尔森真公函盖下绿章！洛里先生随手赏了 25 金币通关费。',
        summaryEn: "You verified his Tellson's exemption despite his shady hands! +25 gold tip, 0 strikes."
      },
      detain_wrong: {
        goldDelta: -10,
        strikeDelta: 1,
        tag: '乱杀无辜',
        summary: '你光看他像坏人就乱盖红章！英国银行团抗议扣押外交信使，督察罚没你 10 金币并记大过一次！',
        summaryEn: 'FALSE ARREST! He held genuine diplomatic papers. Fined 10 gold & +1 Inspector Strike!'
      }
    }
  },

  {
    id: 'case_double',
    order: 3,
    banner: '终局第三审 · 下午三点的替身马车',
    bannerEn: 'FINAL CASE · THE DOUBLE AT THE BARRIER',
    portrait: 'darnay',
    docPortrait: 'carton',
    wantedPortrait: 'darnay',
    wantedName: '头号越狱死囚：查尔斯·达内',
    wantedNameEn: 'ESCAPED PRISONER: CHARLES DARNAY',
    name: '持证名：悉尼·卡顿',
    nameEn: 'Pass Name: Sydney Carton',
    claimedRole: '英国皇家法庭 · 大律师',
    claimedRoleEn: 'English Barrister-at-Law',
    destination: '同洛里先生马车紧急出境',
    destinationEn: 'Urgent Coach to Calais Pier',
    docNumber: 'GBR-1792-520',
    docYearText: '1792 · 英国公使馆真签',
    docYearTextEn: '1792 · British Embassy Visa',
    docSealLabel: '英法联签 1792 真章',
    docSealLabelEn: 'Valid Anglo-French Seal',
    docSealFake: false,
    openingLine: '（马车里的青年双目半阖、神智恍惚，身旁白发银行家死死按住发抖的手：“他是英国律师卡顿，喝醉了……”）',
    openingLineEn: '(The pale passenger slumps half-conscious. Old Mr. Lorry whispers: “Only Mr. Carton, dead drunk…”) ',
    clues: [
      {
        id: 'ether_cravat',
        where: 'portrait',
        x: 0.57,
        y: 0.65,
        label: '领巾刺鼻乙醚迷药',
        labelEn: 'Ether-Soaked Cravat',
        detail: '根本不是酒味！白色领巾浸透了药房乙醚——他是被人迷晕后强行抬上马车的！',
        detailEn: 'Not wine—heavy apothecary ETHER! Someone drugged him and dressed him in this coat!',
        severity: 'fatal',
        reaction: '（白发老人呼吸一滞，额头冷汗涔涔滑落）',
        reactionEn: '(Old Mr. Lorry freezes, cold sweat beading on his brow.)'
      },
      {
        id: 'twin_face',
        where: 'portrait',
        x: 0.46,
        y: 0.34,
        label: '与通缉死囚容貌重合',
        labelEn: 'Exact Face of Escaped Prisoner',
        detail: '对照墙上急缉令与护照小像：护照上卡顿眼神颓唐散漫，而眼前昏迷者正是越狱死囚达内！',
        detailEn: 'Compare the Wanted Poster: this is escaped prisoner Darnay—Carton stayed in prison to die for him!',
        severity: 'fatal',
        reaction: '（昏迷青年在梦里喃喃：“卡顿……快走，别替我上断头台……”）',
        reactionEn: '(The drugged man murmurs: “Carton… do not die in my stead…”)'
      },
      {
        id: 'embassy_seal',
        where: 'passport',
        label: '真护照 · 却是顶替之人',
        labelEn: 'Real Pass · Wrong Twin',
        detail: '护照是卡顿本人的真证件——那个英国浪子把生路塞进他怀里，自己留在了第 52 号死囚车上！',
        detailEn: 'The passport is genuine—its true owner stayed behind in cell 52 to face the blade at 3 PM!',
        severity: 'contradiction',
        reaction: '老人低声哀求：“长官……牢里那个人是心甘情愿替他赴死的……”',
        reactionEn: '“Officer… the man left behind chose this sacrifice of his own free will…”'
      },
      {
        id: 'trunk_farewell',
        where: 'trunk',
        itemIcon: '✉️',
        label: '大衣口袋诀别信',
        labelEn: "Carton's Farewell Note",
        detail: '搜出揉皱的铅笔绝笔：“别回头。我此刻所做的，远比我平生所做的一切都好。”',
        detailEn: 'A crumpled note in the coat: “It is a far, far better thing that I do, than I have ever done.”',
        severity: 'fatal',
        reaction: '老人把全部盘缠 40 金币推到桌角：“抓他你升官，放他一家团圆……长官，你怎么盖这一章？”',
        reactionEn: 'Lorry places 40 gold on the corner: “Stamp RED for promotion, or GREEN to let mercy live…”'
      }
    ],
    bribe: {
      triggerClues: 2,
      amount: 40,
      pitch: '真相大白：眼前正是被卡顿迷晕调包的越狱死囚！盖红章当场立头功赏 80 金币，但卡顿白死、一家满门抄斩；盖绿章装瞎放行，担下欺君风险成全这场替死！',
      pitchEn: 'Truth laid bare: Carton stayed to die in his place! Stamp RED for an 80-gold state bounty, or stamp GREEN to let the coach escape to Dover!'
    },
    outcomes: {
      pass_mercy: {
        goldDelta: 40,
        strikeDelta: 0,
        mercyTwin: true,
        tag: '成全替死',
        summary: '你盯着那封绝笔良久，重重盖下绿章：“喝醉的英国佬，滚出巴黎！”马车冲入海峡晨雾，身后钟楼敲响三点。',
        summaryEn: 'You slam the GREEN stamp: “Drunken Englishman—clear the gate!” The coach races into the Channel mist as 3 PM tolls.'
      },
      pass_blind: {
        goldDelta: 10,
        strikeDelta: 1,
        mercyTwin: true,
        tag: '糊涂放行',
        summary: '你稀里糊涂盖了绿章放走马车。直到断头台落下，全城才惊觉死的是替身！',
        summaryEn: 'You waved the coach through without spotting the swap—until the whole city gasped at 3 PM.'
      },
      detain: {
        goldDelta: 80,
        strikeDelta: 0,
        mercyTwin: false,
        tag: '铁血立功',
        summary: '红章砸落，警钟齐鸣！卫兵将昏迷的达内拖下马车，你拿到 80 金币头等赏银——牢里的替死鬼白白上了断头台。',
        summaryEn: 'RED STAMP! Guards drag Darnay back to the blade. You win an 80-gold state bounty; Carton dies in vain.'
      }
    }
  }
];

export const VERDICT_ENDINGS = {
  fired_guillotine: {
    title: '第五十三名死囚',
    titleEn: 'Prisoner Number Fifty-Three',
    rank: '革职查办 · 押赴断头台',
    rankEn: 'DISGRACED & CONDEMNED',
    city: 'paris',
    epitaph: '你一上午漏放嫌犯又乱抓信使，下午三点督察微笑着把你的名字织进了德发日夫人的红毛线。',
    epitaphEn: 'Two strikes in one shift. By 3 PM Madame Defarge had knitted your name into her crimson register.'
  },
  night_watchman: {
    title: '雾海守夜人',
    titleEn: 'Keeper of the Dawn Coach',
    rank: '特等隐藏结局 · 人间清醒',
    rankEn: 'SECRET RANK · EYES WIDE OPEN',
    city: 'london',
    epitaph: '你看穿了每一处珍珠、铁锈与乙醚，却在最后一刻把印章按进绿泥，放那辆马车驶向最好的时代。',
    epitaphEn: 'You spotted every pearl, rust-stain and drop of ether—yet stamped GREEN so one noble sacrifice would not be in vain.'
  },
  iron_hound: {
    title: '断头台活阎王',
    titleEn: 'Hound of the Guillotine',
    rank: '甲等功勋 · 滴水不漏',
    rankEn: 'FIRST-CLASS INQUISITOR',
    city: 'paris',
    epitaph: '贵族表妹与越狱替身一个没逃出你的放大镜。你捧着沉甸甸的赏金升任督察，身后没有一个活口。',
    epitaphEn: 'Not a single noble or double slipped past your lens. Your purse is heavy with state gold; the square runs red.'
  },
  clever_survivor: {
    title: '乱世捞金老油条',
    titleEn: 'The Shrewd Gatekeeper',
    rank: '全身而退 · 妻儿温饱',
    rankEn: 'SURVIVOR OF 1792',
    city: 'london',
    epitaph: '该抓的抓，该收的救命钱照收不误。在最坏的时代里，你让全家吃上了热面包、喝上了退烧药。',
    epitaphEn: 'You knew when to enforce the law and when to pocket gold for your feverish child. Your family survived 1792.'
  }
};
