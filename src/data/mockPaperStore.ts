export interface MockQuestion {
  id: number
  type: 'single' | 'multi'
  question: string
  options: {
    A: string
    B: string
    C: string
    D: string
  }
  answer: string | string[]
  explanation: string
  score: number
}

export interface AiMockPaper {
  id: string
  title: string
  subject_name: string
  total_questions: number
  total_score: number
  duration_minutes: number
  description?: string
  created_at: string
  status: 'todo' | 'completed'
  completed_at?: string
  earned_score?: number
  user_answers?: Record<number, string | string[]>
  questions: MockQuestion[]
}

const STORAGE_KEY = 'study_ai_mock_papers_v1'

// Curated 33-question full mock paper for 考研政治 (16单选 + 17多选)
export const DEFAULT_POLITICS_33_PAPER: AiMockPaper = {
  id: 'paper-politics-33-full',
  title: '2027 考研政治全真模拟测试卷（33道选择题精编）',
  subject_name: '思想政治理论',
  total_questions: 33,
  total_score: 50,
  duration_minutes: 50,
  description: '全真对标考研初试命题规范：含 16 道单项选择题（每题1分，共16分）与 17 道多项选择题（每题2分，共34分）。覆盖马原、毛中特、史纲、思修法基与当代形势。',
  created_at: new Date().toISOString().slice(0, 10),
  status: 'todo',
  questions: [
    // 1-16 单选题 (每题1分)
    {
      id: 1,
      type: 'single',
      question: '【马原·辩证法】唯物辩证法认为，事物发展的根本原因和源泉在于：',
      options: {
        A: '事物的外部环境与自然条件',
        B: '事物内部矛盾双方的对立统一',
        C: '量变达到一定限度引起的质变',
        D: '历史主体自觉能动性的发挥',
      },
      answer: 'B',
      explanation: '【考点精析】矛盾是事物发展的动力和源泉。内因是事物发展的根本原因，外因是条件，外因通过内因而起作用。对立统一规律是唯物辩证法的实质和核心。',
      score: 1,
    },
    {
      id: 2,
      type: 'single',
      question: '【马原·认识论】“实践是检验真理的唯一标准”，这一论断的哲学依据是：',
      options: {
        A: '实践具有直接现实性和普遍性品格',
        B: '实践是客观规律的直接创造者',
        C: '真理是主观随心所欲的产物',
        D: '实践是认识的唯一终极目的',
      },
      answer: 'A',
      explanation: '【考点精析】实践之所以是检验真理的唯一标准，是因为实践具有把主观与客观联系起来的直接现实性特征，只有实践才能把主观认识与客观现实对照比较。',
      score: 1,
    },
    {
      id: 3,
      type: 'single',
      question: '【马原·唯物史观】在社会历史发展过程中，唯物史观认为最终决定社会性质和发展方向的决定力量是：',
      options: {
        A: '地理环境的优劣禀赋',
        B: '人口数量与增长速度',
        C: '物质资料的生产方式',
        D: '社会精英的思想启蒙',
      },
      answer: 'C',
      explanation: '【考点精析】物质资料生产方式是人类社会存在和发展的基础，集中体现了生产力与生产关系的统一，决定着社会面貌、性质和历史更替。',
      score: 1,
    },
    {
      id: 4,
      type: 'single',
      question: '【马原·政经】马克思在劳动价值论中指出，商品的使用价值和价值之间的对立统一关系体现在：',
      options: {
        A: '使用价值是价值的物质承担者',
        B: '商品生产者可以同时占有二者',
        C: '消费者购买商品是为了获得其价值',
        D: '二者在质上是完全同一的',
      },
      answer: 'A',
      explanation: '【考点精析】使用价值是价值的物质承担者，没有使用价值的物品就没有价值。商品买卖双方都不能同时占有二者，生产者让渡使用价值获得价值，消费者支付价值获得使用价值。',
      score: 1,
    },
    {
      id: 5,
      type: 'single',
      question: '【毛中特·思想路线】毛泽东思想活的灵魂是贯穿其全部体系的立场、观点和方法，其核心是：',
      options: {
        A: '实事求是',
        B: '群众路线',
        C: '独立自主',
        D: '统一战线',
      },
      answer: 'A',
      explanation: '【考点精析】实事求是、群众路线、独立自主是毛泽东思想活的灵魂。其中，实事求是是毛泽东思想的世界观和方法论的基础，是党的根本思想路线与核心。',
      score: 1,
    },
    {
      id: 6,
      type: 'single',
      question: '【毛中特·新民主主义革命】中国新民主主义革命最基本的动力是：',
      options: {
        A: '民族资产阶级',
        B: '工人和农民',
        C: '小资产阶级',
        D: '开明绅士',
      },
      answer: 'B',
      explanation: '【考点精析】工人阶级是新民主主义革命的领导力量，农民阶级是革命的主力军，工人和农民构成了新民主主义革命最基本的动力。',
      score: 1,
    },
    {
      id: 7,
      type: 'single',
      question: '【习近平新时代】全面建设社会主义现代化国家、全面推进中华民族伟大复兴的关键在：',
      options: {
        A: '法治',
        B: '改革',
        C: '党',
        D: '科技',
      },
      answer: 'C',
      explanation: '【考点精析】党的二十大报告指出：全面建设社会主义现代化国家、全面推进中华民族伟大复兴，关键在党。',
      score: 1,
    },
    {
      id: 8,
      type: 'single',
      question: '【习近平新时代·经济】高质量发展是全面建设社会主义现代化国家的首要任务，发展新质生产力的核心要素是：',
      options: {
        A: '资源大量消耗',
        B: '科技创新',
        C: '传统资本扩张',
        D: '简单劳动力投入',
      },
      answer: 'B',
      explanation: '【考点精析】新质生产力以创新为主导，具有高科技、高效能、高质量特征，科技创新是发展新质生产力的核心要素。',
      score: 1,
    },
    {
      id: 9,
      type: 'single',
      question: '【史纲·近代开端】标志着近代中国完全沦为半殖民地半封建社会的严重不平等条约是：',
      options: {
        A: '《南京条约》',
        B: '《马关条约》',
        C: '《辛丑条约》',
        D: '《北京条约》',
      },
      answer: 'C',
      explanation: '【考点精析】1901年《辛丑条约》的签订，标志着清政府完全成为帝国主义统治中国的工具，中国半殖民地半封建社会统治秩序完全确立。',
      score: 1,
    },
    {
      id: 10,
      type: 'single',
      question: '【史纲·辛亥革命】辛亥革命时期资产阶级革命派的阶级局限性，最突出的表现是：',
      options: {
        A: '没有提出反帝反封建的革命纲领',
        B: '没有建立革命政党',
        C: '没有发动群众武装起义',
        D: '没有明确提出反帝纲领和解决农民土地问题',
      },
      answer: 'D',
      explanation: '【考点精析】资产阶级革命派没有提出明确的反帝反封建纲领，不敢否定封建土地所有制，难以广泛发动农民群众。',
      score: 1,
    },
    {
      id: 11,
      type: 'single',
      question: '【史纲·建党伟业】中国共产党的成立是中国历史上开天辟地的大事变，其诞生于：',
      options: {
        A: '1919年五四运动时期',
        B: '1921年中共一大',
        C: '1922年中共二大',
        D: '1924年国共合作时期',
      },
      answer: 'B',
      explanation: '【考点精析】1921年7月中国共产党第一次全国代表大会在上海召开（后转至嘉兴南湖），标志着中国共产党正式成立。',
      score: 1,
    },
    {
      id: 12,
      type: 'single',
      question: '【史纲·转折关头】中国共产党历史上生死攸关的转折点，标志着党在政治上开始走向成熟的会议是：',
      options: {
        A: '八七会议',
        B: '古田会议',
        C: '遵义会议',
        D: '瓦窑堡会议',
      },
      answer: 'C',
      explanation: '【考点精析】1935年遵义会议确立了毛泽东在党中央和红军的实际领导地位，独立自主地解决了中国革命军事和组织问题，是生死攸关的伟大转折。',
      score: 1,
    },
    {
      id: 13,
      type: 'single',
      question: '【思修法基·人生观】马克思主义认为，人生的根本价值在于：',
      options: {
        A: '个人所拥有的财富与社会地位',
        B: '个人对社会责任的承担与社会奉献',
        C: '向社会索取消费的规模大小',
        D: '自我价值的绝对无约束实现',
      },
      answer: 'B',
      explanation: '【考点精析】人生的社会价值是人生价值的本质和根本尺度，人生的根本价值在于个体对社会和他人所作的贡献。',
      score: 1,
    },
    {
      id: 14,
      type: 'single',
      question: '【思修法基·社会主义核心价值观】在社会主义核心价值观中，属于公民个人层面的价值准则是：',
      options: {
        A: '富强、民主、文明、和谐',
        B: '自由、平等、公正、法治',
        C: '爱国、敬业、诚信、友善',
        D: '爱国、守法、明礼、自强',
      },
      answer: 'C',
      explanation: '【考点精析】国家层面：富强、民主、文明、和谐；社会层面：自由、平等、公正、法治；公民层面：爱国、敬业、诚信、友善。',
      score: 1,
    },
    {
      id: 15,
      type: 'single',
      question: '【当代·国际关系】中国始终奉行的外交政策根本宗旨是：',
      options: {
        A: '结盟共赢与实力均衡',
        B: '维护世界和平、促进共同发展',
        C: '大国主导与地缘竞争',
        D: '区域排他性合作',
      },
      answer: 'B',
      explanation: '【考点精析】我国一贯坚持独立自主的和平外交政策，其宗旨始终是维护世界和平、促进共同发展。',
      score: 1,
    },
    {
      id: 16,
      type: 'single',
      question: '【当代·全球治理】推动构建人类命运共同体的核心内涵是：',
      options: {
        A: '建设持久和平、普遍安全、共同繁荣、开放包容、清洁美丽的世界',
        B: '由单一国际组织统筹各国主权事务',
        C: '推行统一的经济制度和意识形态',
        D: '以均势原则维持国际秩序稳定',
      },
      answer: 'A',
      explanation: '【考点精析】人类命运共同体核心内涵五位一体：持久和平、普遍安全、共同繁荣、开放包容、清洁美丽的世界。',
      score: 1,
    },

    // 17-33 多选题 (每题2分，选多、选少、选错均不得分)
    {
      id: 17,
      type: 'multi',
      question: '【马原·物质与意识】辩证唯物主义认为，物质与意识的辩证关系表现为：',
      options: {
        A: '物质决定意识，意识依赖于物质',
        B: '意识对物质具有能动的反作用',
        C: '意识可以脱离物质独立存在',
        D: '发挥主观能动性必须以尊重客观规律为前提',
      },
      answer: ['A', 'B', 'D'],
      explanation: '【考点精析】物质决定意识，意识对物质具有反作用；发挥能动性必须以规律为前提。意识是物质在人脑中的主观映象，不能脱离物质独立存在，C错误。',
      score: 2,
    },
    {
      id: 18,
      type: 'multi',
      question: '【马原·认识论】真理的客观性是指：',
      options: {
        A: '真理的内容是客观的，来源于客观事物及其规律',
        B: '检验真理的标准即社会实践是客观的',
        C: '真理的形式是客观不依赖于人脑的',
        D: '客观事物本身就是真理',
      },
      answer: ['A', 'B'],
      explanation: '【考点精析】真理内容客观，检验标准客观；但真理的形式是主观的（属于认识范畴），C错；客观事物不是真理，D错。',
      score: 2,
    },
    {
      id: 19,
      type: 'multi',
      question: '【马原·政经】马克思的剩余价值学说揭示了：',
      options: {
        A: '资本主义生产方式的剥削本质',
        B: '资本主义社会的阶级对立根源',
        C: '工人的全部劳动时间都创造价值',
        D: '相对剩余价值和绝对剩余价值的生产机制',
      },
      answer: ['A', 'B', 'C', 'D'],
      explanation: '【考点精析】剩余价值论是马克思主义经济学的核心基石，彻底揭示了资本剥削、阶级根源及剩余价值生产方式。',
      score: 2,
    },
    {
      id: 20,
      type: 'multi',
      question: '【马原·唯物史观】社会存在是社会生活的物质方面，主要包括：',
      options: {
        A: '地理环境',
        B: '人口因素',
        C: '生产方式',
        D: '风俗习惯与宗教观念',
      },
      answer: ['A', 'B', 'C'],
      explanation: '【考点精析】社会存在包括自然地理环境、人口因素和物质资料生产方式。风俗和宗教属于社会意识，D错误。',
      score: 2,
    },
    {
      id: 21,
      type: 'multi',
      question: '【马原·科学社会主义】共产主义社会的基本特征包括：',
      options: {
        A: '物质财富极大丰富，消费品按需分配',
        B: '社会关系高度和谐，人们精神境界极大提高',
        C: '每个人自由而全面的发展',
        D: '阶级差别消灭，国家作为阶级压迫工具走向消亡',
      },
      answer: ['A', 'B', 'C', 'D'],
      explanation: '【考点精析】生产力高度发展、按需分配、阶级与国家消亡、每个人自由全面发展，是科学社会主义关于共产主义社会的经典科学预见。',
      score: 2,
    },
    {
      id: 22,
      type: 'multi',
      question: '【毛中特·法宝】中国共产党在中国革命中战胜敌人的三个主要法宝是：',
      options: {
        A: '统一战线',
        B: '武装斗争',
        C: '党的建设',
        D: '土地革命',
      },
      answer: ['A', 'B', 'C'],
      explanation: '【考点精析】毛泽东在《〈共产党人〉发刊词》中指出：统一战线、武装斗争、党的建设，是中国共产党在中国革命中战胜敌人的三个法宝。',
      score: 2,
    },
    {
      id: 23,
      type: 'multi',
      question: '【毛中特·三大改造】我国对农业、手工业和资本主义工商业的社会主义改造采取的方针包括：',
      options: {
        A: '对农业手工业采取自愿互助、循序渐进的合作化道路',
        B: '对资本主义工商业采取和平赎买政策',
        C: '初级形式的国家资本主义过渡到高级形式',
        D: '把对企业的改造和对人的改造结合起来',
      },
      answer: ['A', 'B', 'C', 'D'],
      explanation: '【考点精析】我国社会主义改造创造性地实现了和平赎买、逐步过渡，把对企业的改造与对资本家的改造有机结合，成功确立社会主义制度。',
      score: 2,
    },
    {
      id: 24,
      type: 'multi',
      question: '【新时代·新发展理念】完整、准确、全面贯彻新发展理念，其包含的维度有：',
      options: {
        A: '创新是第一动力',
        B: '协调是内生特点',
        C: '绿色是普遍形态，开放是必由之路',
        D: '共享是根本目的',
      },
      answer: ['A', 'B', 'C', 'D'],
      explanation: '【考点精析】新发展理念：创新、协调、绿色、开放、共享，回答了关于发展的目的、动力、方式、路径等一系列理论和实践问题。',
      score: 2,
    },
    {
      id: 25,
      type: 'multi',
      question: '【新时代·全过程人民民主】我国全过程人民民主的显著特征包括：',
      options: {
        A: '最广泛、最真实、最管用',
        B: '实现了过程民主和成果民主相统一',
        C: '实现了程序民主和实质民主相统一',
        D: '完全排斥任何代议制度',
      },
      answer: ['A', 'B', 'C'],
      explanation: '【考点精析】全过程人民民主是最广泛、最真实、最管用的民主，实现了过程和成果、程序和实质相统一。人民代表大会制度是我国根本政治制度，D错误。',
      score: 2,
    },
    {
      id: 26,
      type: 'multi',
      question: '【新时代·两个确立】党确立习近平同志党中央的核心、全党的核心地位，确立习近平新时代中国特色社会主义思想的指导地位，其重大意义在于：',
      options: {
        A: '是推动党和国家事业取得历史性成就的决定性因素',
        B: '对推进中华民族伟大复兴历史进程具有决定性意义',
        C: '是应对一切艰难险阻的最大确定性与最大底气',
        D: '体现了全党全军全国各族人民共同心愿',
      },
      answer: ['A', 'B', 'C', 'D'],
      explanation: '【考点精析】“两个确立”是历史的选择、人民的选择，是新时代党和国家事业发展的最大政治保证。',
      score: 2,
    },
    {
      id: 27,
      type: 'multi',
      question: '【史纲·抗日战争】中国人民抗日战争胜利的重大历史意义在于：',
      options: {
        A: '近代以来中国抗击外敌入侵第一次取得完全胜利的民族解放斗争',
        B: '重新确立了中国在世界上的大国地位',
        C: '开辟了中华民族伟大复兴的光明前景',
        D: '彻底消灭了剥削阶级和剥削制度',
      },
      answer: ['A', 'B', 'C'],
      explanation: '【考点精析】抗日战争的胜利彻底粉碎了侵略图谋，洗雪了民族耻辱，确立了大国地位。消灭剥削制度是三大改造完成后实现的，D错误。',
      score: 2,
    },
    {
      id: 28,
      type: 'multi',
      question: '【史纲·解放战争】在解放战争时期，配合人民解放军作战的人民民主统一战线开展的“第二条战线”主要体现在：',
      options: {
        A: '以学生运动为先导的爱国民主运动',
        B: '广大工人和各界群众的抗暴、争生存斗争',
        C: '国民党统治区各阶层广泛的政治反抗',
        D: '帝国主义国家内部的工人罢工',
      },
      answer: ['A', 'B', 'C'],
      explanation: '【考点精析】国民党统治区以学生运动为先导的人民民主运动被称为“第二条战线”，配合了解放军军事战场斗争。',
      score: 2,
    },
    {
      id: 29,
      type: 'multi',
      question: '【史纲·十一届三中全会】1978年党的十一届三中全会作出的具有深远意义的伟大决策包括：',
      options: {
        A: '彻底否定“以阶级斗争为纲”的错误方针',
        B: '把党和国家工作重心转移到经济建设上来',
        C: '实行改革开放的历史性决策',
        D: '恢复了党的民主集中制的优良传统',
      },
      answer: ['A', 'B', 'C', 'D'],
      explanation: '【考点精析】十一届三中全会实现了伟大的历史性转折，开启了改革开放和社会主义现代化建设新时期。',
      score: 2,
    },
    {
      id: 30,
      type: 'multi',
      question: '【思修法基·理想信念】关于理想与现实的辩证统一关系，正确的认识是：',
      options: {
        A: '理想来源于现实，又高于现实',
        B: '理想在一定条件下可以转化为现实',
        C: '实现理想往往具有长期性、曲折性和艰巨性',
        D: '艰苦奋斗是通往理想彼岸的必由之路',
      },
      answer: ['A', 'B', 'C', 'D'],
      explanation: '【考点精析】理想与现实是对立统一的，辩证看待理想实现的长期曲折性，唯有通过艰苦奋斗才能把理想转化为现实。',
      score: 2,
    },
    {
      id: 31,
      type: 'multi',
      question: '【思修法基·道德与法律】在社会主义法治与道德建设中，关于法治与德治的关系，正确的理解是：',
      options: {
        A: '法治是治国理政基本方式，德治是治国理政重要支撑',
        B: '法安天下，德润人心',
        C: '法律是成文的道德，道德是内心的法律',
        D: '道德可以替代法律的强制调节作用',
      },
      answer: ['A', 'B', 'C'],
      explanation: '【考点精析】法治与德治相互补充、相得益彰，不可偏废。道德不能替代法律的强制性，D错误。',
      score: 2,
    },
    {
      id: 32,
      type: 'multi',
      question: '【当代·大国关系】中国倡导构建新型国际关系，其核心主张是：',
      options: {
        A: '相互尊重',
        B: '公平正义',
        C: '合作共赢',
        D: '结盟对抗',
      },
      answer: ['A', 'B', 'C'],
      explanation: '【考点精析】新型国际关系的核心是相互尊重、公平正义、合作共赢，坚决反对结盟对抗与零和博弈。',
      score: 2,
    },
    {
      id: 33,
      type: 'multi',
      question: '【当代·一带一路】共建“一带一路”倡议提出以来，秉持的黄金合作原则包括：',
      options: {
        A: '共商',
        B: '共建',
        C: '共享',
        D: '排他',
      },
      answer: ['A', 'B', 'C'],
      explanation: '【考点精析】“一带一路”秉持共商共建共享原则，坚持开放包容，不是地缘政治同盟，绝不排他。',
      score: 2,
    },
  ],
}

// Storage helpers
export function getAiMockPapers(): AiMockPaper[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const list = JSON.parse(raw)
      if (Array.isArray(list) && list.length > 0) return list
    }
  } catch {
    // Ignore
  }
  // Initialize with the curated default 33-question politics paper
  return [DEFAULT_POLITICS_33_PAPER]
}

export function saveAiMockPaper(paper: AiMockPaper) {
  const current = getAiMockPapers()
  const idx = current.findIndex((p) => p.id === paper.id)
  let updated: AiMockPaper[]
  if (idx >= 0) {
    updated = [...current]
    updated[idx] = paper
  } else {
    updated = [paper, ...current]
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  return updated
}

export function deleteAiMockPaper(id: string) {
  const current = getAiMockPapers()
  const updated = current.filter((p) => p.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  return updated
}
