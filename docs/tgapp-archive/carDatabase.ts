import { CarTier } from './types.js';

export interface CarModel {
  name: string;
  tier: CarTier;
  basePriceRange: [number, number];
  description: string;
  /** Asset key for the visual card. Resolves to /assets/cars/{imageId}.svg */
  imageId?: string;
  /** Defect IDs that are ALWAYS present on this model (in addition to random ones). */
  forcedDefectIds?: string[];
}

export const CAR_MODELS_DB: CarModel[] = [
  // ─── BUCKET ($800–$2,000) ───────────────────────────────────────────────────
  { name: 'Lada 2109',          tier: 'Bucket',  basePriceRange: [800,  1200], description: 'Классика жанра. Карбюратор, ручник, запах советской эпохи.' },
  { name: 'Daewoo Lanos',       tier: 'Bucket',  basePriceRange: [900,  1400], description: 'Любимец таксистов и студентов. Умирает достойно.' },
  { name: 'VW Golf Mk3',        tier: 'Bucket',  basePriceRange: [700,  1500], description: 'Немецкое качество... 1993 года. Ключ на старт.' },
  { name: 'Opel Astra G',       tier: 'Bucket',  basePriceRange: [600,  1300], description: 'Дедовский аппарат. Продавец клянется — не гнилая.' },
  { name: 'Ford Mondeo Mk2',    tier: 'Bucket',  basePriceRange: [700,  1600], description: 'Бизнес-класс из прошлого тысячелетия.' },
  { name: 'BMW 3 Series E36',   tier: 'Bucket',  basePriceRange: [1000, 2000], description: 'На блатных номерах. Разумеется, кузов битый, но какой шильдик!' },
  { name: 'Audi A4 B5',         tier: 'Bucket',  basePriceRange: [800,  1800], description: 'Quattro лечится. Кошелек — нет.' },
  { name: 'Honda Civic VI',     tier: 'Bucket',  basePriceRange: [1100, 1900], description: 'Японская надежность эпохи Windows 98.' },
  { name: 'VW Passat B3',       tier: 'Bucket',  basePriceRange: [850,  1600], description: 'Самая распространенная машина на любом авторынке страны.' },
  { name: 'Toyota Corolla E110',tier: 'Bucket',  basePriceRange: [1200, 2000], description: 'Едет и едет. Это всё, что про неё надо знать.' },
  // Новые вёдра
  { name: 'Москвич 2141',       tier: 'Bucket',  basePriceRange: [400,   900], description: 'Коровавалет! Патриот отечественного автопрома.' },
  { name: 'ЗАЗ Таврия',         tier: 'Bucket',  basePriceRange: [300,   700], description: 'Самое страшное, что может случиться с деньгами.' },
  { name: 'Иж 2126 Ода',        tier: 'Bucket',  basePriceRange: [500,   950], description: 'Ода отчаянию. Стальной гроб Ижевского завода.' },
  { name: 'Chevrolet Aveo T200',tier: 'Bucket',  basePriceRange: [900,  1400], description: 'Мечта курьера. Тяга есть, логики нет.' },
  // YouTube-проекты (Bucket)
  { name: 'Жигули за 50к',      tier: 'Bucket',  basePriceRange: [300,   600], description: 'Типичный проект «выжать всё из мусора» от Гарика Угарика.' },
  { name: 'Перекуп на минималках', tier: 'Bucket', basePriceRange: [500,  1000], description: 'Очередное ведро Менеджера Антона. Надежда умирает последней.' },
  { name: 'Проект Миллион (Старт)', tier: 'Bucket', basePriceRange: [800, 1500], description: 'С этого начинается путь к миллиону Жекича Дубровского.' },
  { name: 'BMW за копейки',     tier: 'Bucket',  basePriceRange: [600,  1200], description: 'Баварец по низу рынка от Булкина. Больше изоленты, чем металла.' },
  { name: 'Жигули-лоурайдер',   tier: 'Bucket',  basePriceRange: [700,  1300], description: 'Классика стенса. Искры из-под днища на каждом лежачем.' },

  // ─── SCRAP ($3,000–$9,000) ──────────────────────────────────────────────────
  { name: 'BMW 5 Series E60',   tier: 'Scrap',   basePriceRange: [5000, 9000], description: 'Бумер с гнилыми порогами. Обслуживание требует второй ипотеки.' },
  { name: 'Toyota Camry V40',   tier: 'Scrap',   basePriceRange: [4000, 8000], description: 'Камри — мечта таксиста. Убита в хлам, но ещё дышит.' },
  { name: 'Audi A4 B8',         tier: 'Scrap',   basePriceRange: [4500, 8500], description: 'Quattro, DSG, и счет за ремонт размером с квартплату.' },
  { name: 'Skoda Octavia III',  tier: 'Scrap',   basePriceRange: [3000, 6000], description: 'Практичная, скучная, надёжная. И да, она всё равно ломается.' },
  { name: 'VW Passat B7',       tier: 'Scrap',   basePriceRange: [3500, 7000], description: 'Семейный аппарат. Половина пробега — лёд, вторая — яма.' },
  { name: 'Mercedes E-Class W212', tier: 'Scrap', basePriceRange: [4000, 8000], description: 'Звезда на решетке, ржавчина на порогах.' },
  { name: 'Mitsubishi Lancer X', tier: 'Scrap',  basePriceRange: [3000, 6500], description: 'Спортивный дух, гнилая судьба. Обязательно крашеный.' },
  { name: 'Ford Fusion (USA)',  tier: 'Scrap',   basePriceRange: [5500, 8500], description: 'Американский бизнес-класс по цене подержанной Lada.' },
  { name: 'VW Jetta VI',        tier: 'Scrap',   basePriceRange: [4800, 7500], description: 'Jetta для тех, кому Пассат не по карману.' },
  { name: 'Hyundai Sonata YF',  tier: 'Scrap',   basePriceRange: [4200, 7800], description: 'Корейский надёжный рабочий конь, которого загнали.' },
  // Новые битые
  { name: 'Chrysler 300C W1',   tier: 'Scrap',   basePriceRange: [4000, 7000], description: 'Бандитская классика. Бензин кушает, как дракон.' },
  { name: 'Subaru Outback BP',  tier: 'Scrap',   basePriceRange: [3500, 6500], description: 'Легенда аутдора. Ремни ГРМ — это постоянная боль.' },
  { name: 'Kia Optima TF',      tier: 'Scrap',   basePriceRange: [3500, 6000], description: 'Красивый снаружи, непредсказуемый внутри.' },
  // YouTube-проекты (Scrap)
  { name: 'Оказия',             tier: 'Scrap',   basePriceRange: [3000, 5000], description: 'Бешеная Ока Гарика Угарика. Кузов трещит по швам от мощности.' },
  { name: 'Тачка на прокачку',  tier: 'Scrap',   basePriceRange: [4000, 7500], description: 'Мониторы в подголовниках от Гордея, но мотор всё равно троит.' },
  { name: 'Оживление мертвеца', tier: 'Scrap',   basePriceRange: [5000, 9000], description: 'Ильдар автоподбор одобряет. W140/E38, поднятые с колен.' },
  { name: 'Шишига (ГАЗ-66)',    tier: 'Scrap',   basePriceRange: [6000, 9000], description: 'Монстр Combat Crew. Проходит там, где танки встают.' },
  { name: 'УАЗ на 40 колесах',  tier: 'Scrap',   basePriceRange: [4500, 8000], description: 'Классика внедорожного тюнинга. Расход как у фуры.' },
  { name: 'ЗиЛ Захар',          tier: 'Scrap',   basePriceRange: [5000, 8500], description: 'Советская легенда из болота от Combat Crew.' },
  { name: 'Нива-монстр',        tier: 'Scrap',   basePriceRange: [3500, 6500], description: 'Экстремальный лифт канала Не Тормози.' },
  { name: 'Громкая приора',     tier: 'Scrap',   basePriceRange: [3000, 5500], description: 'Loud Sound. Стекла вылетают быстрее, чем она разгоняется.' },
  { name: 'CyberTruck Гаражный',tier: 'Scrap',   basePriceRange: [4000, 7000], description: 'Листы стали и сварка. Илон Маск плачет.' },
  { name: 'Реплика Ferrari',    tier: 'Scrap',   basePriceRange: [5000, 8500], description: 'Стеклопластиковый кузов, мотор от старой Тойоты. Понты дороже денег.' },

  // ─── BUSINESS ($12,000–$22,000) ─────────────────────────────────────────────
  { name: 'Toyota Camry V50',   tier: 'Business', basePriceRange: [13000, 18000], description: 'Тот самый Камри, на котором ездит половина чиновников.' },
  { name: 'BMW 5 Series F10',   tier: 'Business', basePriceRange: [15000, 22000], description: 'Пятёрка. Статус есть. Расходы тоже.' },
  { name: 'Mazda 6 GJ',         tier: 'Business', basePriceRange: [12000, 16000], description: 'Skyactiv и японская душа. Реально хороший выбор.' },
  { name: 'Mercedes E-Class W212 Restyling', tier: 'Business', basePriceRange: [16000, 22000], description: 'Уже не ржавый. Почти.' },
  { name: 'Skoda Superb II',    tier: 'Business', basePriceRange: [12000, 17000], description: 'Большой, немецкий, Шкода. Самозванец бизнес-класса.' },
  { name: 'Audi A6 C7',         tier: 'Business', basePriceRange: [14000, 20000], description: 'Алюминиевое шасси. Ремонт алюминиевой сварки — не для слабонервных.' },
  { name: 'Lexus ES 350 (2014)', tier: 'Business', basePriceRange: [17000, 23000], description: 'Японский бизнес-класс. Тихо едет, тихо ломается.' },
  { name: 'Volvo S80 II',       tier: 'Business', basePriceRange: [11000, 15000], description: 'Для тех, кто любит безопасность и шведскую депрессию.' },
  { name: 'VW Phaeton',         tier: 'Business', basePriceRange: [10000, 16000], description: 'Скрытый флагман VW. Обслуживание — как у Bentley. Потому что он и есть Bentley.' },
  { name: 'Jaguar XF X250',     tier: 'Business', basePriceRange: [11000, 17000], description: 'Британское очарование и британская надёжность. Удачи вам.' },
  // YouTube-проекты (Business)
  { name: 'Москвич Циклоп',     tier: 'Business', basePriceRange: [12000, 16000], description: 'Качественный кастом от Игоря Бурцева. Глаз не оторвать.' },
  { name: 'Газель-ракета',      tier: 'Business', basePriceRange: [10000, 15000], description: 'Газель с 1UZ-FE от AcademeG. Доставляет грузы быстрее мысли.' },
  { name: 'Low Classic Волга',  tier: 'Business', basePriceRange: [11000, 15000], description: 'Стильная ГАЗ-24 на пневме. Плывет над асфальтом.' },

  // ─── PREMIUM ($25,000–$60,000) ──────────────────────────────────────────────
  { name: 'Porsche Cayenne 958', tier: 'Premium', basePriceRange: [30000, 50000], description: 'Когда нужен джип, но хочется Порше.' },
  { name: 'Mercedes S-Class W222', tier: 'Premium', basePriceRange: [35000, 55000], description: 'S-класс. Едешь сзади, как депутат.' },
  { name: 'BMW M5 F10',         tier: 'Premium', basePriceRange: [28000, 45000], description: 'Четыре двери и душа спорткара. Турбины не дремлют.' },
  { name: 'Range Rover Autobiography', tier: 'Premium', basePriceRange: [35000, 60000], description: 'Роскошь с британским пренебрежением к надёжности.' },
  { name: 'Mercedes G-Class W463', tier: 'Premium', basePriceRange: [40000, 60000], description: 'Квадратный, дорогой, неубиваемый. Легенда.' },
  { name: 'Tesla Model S P85D', tier: 'Premium', basePriceRange: [25000, 40000], description: 'Быстрее всех на светофоре. Зарядка — отдельная история.' },
  { name: 'Audi Q8',            tier: 'Premium', basePriceRange: [45000, 65000], description: 'Большой, красивый, понтовый. Расход масла в норме (нет).' },
  { name: 'BMW X5 F15',         tier: 'Premium', basePriceRange: [22000, 38000], description: 'Классика премиум-кроссовера. Электрика любит шутить.' },
  // Новый премиум
  { name: 'Lamborghini Urus',   tier: 'Premium', basePriceRange: [60000, 95000], description: 'Итальянский трактор. Оба цилиндра разбудят весь квартал.' },
  { name: 'Bentley Continental GT', tier: 'Premium', basePriceRange: [45000, 75000], description: 'Ты не просто едешь — ты плывёшь. Дорогой шум двигателя.' },
  // YouTube-проекты (Premium)
  { name: 'Audi RS6 (Булкин/DSC)', tier: 'Premium', basePriceRange: [50000, 60000], description: 'Семейный универсал на 1000 л.с. Картошка доедет быстро.' },
  { name: 'Porsche 911 Turbo S', tier: 'Premium', basePriceRange: [55000, 60000], description: 'Король скорости от Gosha Turbo Tech. Рвет всех со старта.' },
  { name: 'Grand Cherokee SRT', tier: 'Premium', basePriceRange: [40000, 55000], description: 'Кирпич, обгоняющий суперкары. Тот самый SRT.' },
  { name: 'Гелик против всех',  tier: 'Premium', basePriceRange: [45000, 60000], description: 'G-класс для болот от Менеджера Антона. Дорогое удовольствие в грязи.' },
  { name: 'Land Cruiser Арктика', tier: 'Premium', basePriceRange: [50000, 60000], description: 'Подготовлен для Севера. Переживет ядерную зиму.' },
  { name: 'Escalade Loud Sound', tier: 'Premium', basePriceRange: [40000, 55000], description: 'Гигантский сабвуфер на колесах. Массаж внутренних органов в комплекте.' },

  // ─── RARITY ($40,000–$250,000) ──────────────────────────────────────────────
  { name: 'Toyota Supra MK4',   tier: 'Rarity',  basePriceRange: [55000,  120000], description: 'Легенда Toretto. 2JZ переживёт всё, кроме вас.' },
  { name: 'Nissan Skyline GT-R R34', tier: 'Rarity', basePriceRange: [80000, 150000], description: 'Godzilla. Запрещена в США — значит, правильная машина.' },
  { name: 'BMW M3 E46',         tier: 'Rarity',  basePriceRange: [30000,  55000], description: 'Чистокровный гоночный мотор S54. Ресурс — 200к при везении.' },
  { name: 'Ferrari Testarossa', tier: 'Rarity',  basePriceRange: [100000, 165000], description: 'Красная, плоская, итальянская. Детская мечта любого перекупа.' },
  { name: 'Mercedes 190E Evo II', tier: 'Rarity', basePriceRange: [90000, 180000], description: 'Серийный болид DTM. Коллекционная редкость.' },
  { name: 'Porsche 911 (993)',   tier: 'Rarity',  basePriceRange: [65000,  130000], description: 'Последний воздушник. Классика без компромиссов.' },
  { name: 'BMW M3 E30',         tier: 'Rarity',  basePriceRange: [40000,  90000], description: 'Дедушка всех M-карс. Группа A в гражданской жизни.' },
  { name: 'Dodge Charger 1969', tier: 'Rarity',  basePriceRange: [50000,  110000], description: 'Американский мускул в чистом виде. HEMI или смерть.' },
  { name: 'Shelby GT500 1967',  tier: 'Rarity',  basePriceRange: [120000, 250000], description: 'Синяя жила Американской мечты. Кэрролл Шелби одобряет.' },
  // Новые раритеты
  { name: 'De Tomaso Pantera',  tier: 'Rarity',  basePriceRange: [120000, 220000], description: 'Итальянский кузов, американский V8. Инженерное безумие 70-х.' },
  { name: 'DeLorean DMC-12',    tier: 'Rarity',  basePriceRange: [40000,  80000], description: 'На нём можно уехать в будущее. Если заведётся.' },
  { name: 'Pagani Huayra',      tier: 'Rarity',  basePriceRange: [500000, 800000], description: 'Искусство на колёсах. Гиперкар, который Канье мог бы себе позволить (наверное).' },
  // YouTube-проекты (Rarity)
  { name: 'Волга с V12',        tier: 'Rarity',  basePriceRange: [80000, 150000], description: 'ГАЗ-21 на агрегатах BMW от Ивана Зенкевича. Волк в овечьей шкуре.' },
  { name: 'Нива на 1000+ сил',  tier: 'Rarity',  basePriceRange: [70000, 120000], description: 'Дрэг-стер из внедорожника от DSC OFF. Неуправляемая ракета.' },
  { name: 'Победа-гиперкар',    tier: 'Rarity',  basePriceRange: [150000, 300000], description: 'Проект Клим. Суперкар в шкуре старой Победы.' },
  { name: 'КамАЗ для дрифта',   tier: 'Rarity',  basePriceRange: [100000, 200000], description: 'Многотонник боком от AcademeG. Законы физики вышли из чата.' },
  { name: 'Lada Eve',           tier: 'Rarity',  basePriceRange: [200000, 400000], description: 'Идеальная жига Гурама с бюджетом суперкара.' },
  { name: 'BMW M5 F90 Тень',    tier: 'Rarity',  basePriceRange: [150000, 250000], description: 'Самая быстрая M5 в СНГ от DSC OFF. Черная молния.' },
  { name: 'Huracan 2000hp',     tier: 'Rarity',  basePriceRange: [300000, 600000], description: 'Битурбо монстр Underground Racing. Слишком быстро для улиц.' },
  { name: 'Nissan GTR Годзилла', tier: 'Rarity', basePriceRange: [120000, 250000], description: 'Икона тюнинга. Звук выхлопа пугает прохожих.' },
  { name: 'Mercedes W111 Classic', tier: 'Rarity', basePriceRange: [150000, 300000], description: 'Детально восстановленный шедевр (DSC OFF).' },
  { name: 'Lada Raven',         tier: 'Rarity',  basePriceRange: [250000, 500000], description: 'Мифический концепт, ставший мечтой.' },
  { name: 'Marussia B1/B2',     tier: 'Rarity',  basePriceRange: [180000, 350000], description: 'Русский суперкар. Красивый и очень редкий.' },
  { name: 'BMW M5 CSL',         tier: 'Rarity',  basePriceRange: [200000, 400000], description: 'Редчайший экземпляр M-серии. Мечта коллекционера.' },
  { name: 'Rolls-Royce дрифт',  tier: 'Rarity',  basePriceRange: [250000, 450000], description: 'Роскошь, которую используют не по назначению.' },
  { name: 'Золотая BMW',        tier: 'Rarity',  basePriceRange: [100000, 200000], description: 'Легенда раннего авто-ютуба от Давидыча. Слепит на солнце.' },

  // ─── ЛЕГЕНДЫ И МЕМЫ ────────────────────────────────────────────────────────
  {
    name: 'ЗИЛ 600 сил',
    tier: 'Rarity',
    basePriceRange: [200000, 400000],
    description: 'Академик. 600 лошадей советского сумасшествия. Налог съедает портфель, но цена продажи — это поэзия.',
    imageId: 'zil_600',
  },
  {
    name: 'Bentley на гусеницах',
    tier: 'Rarity',
    basePriceRange: [250000, 450000],
    description: 'Британская роскошь сошла с ума. Гусеницы прилагаются. Диагностика покажет всё остальное.',
    imageId: 'bentley_tracks',
    forcedDefectIds: ['tracks_off'],
  },
  {
    name: 'Электро-Волга',
    tier: 'Premium',
    basePriceRange: [35000, 65000],
    description: 'Советская классика на электротяге. Не требует бензина. Зато АКБ иногда самовозгорается.',
    imageId: 'electro_volga',
    forcedDefectIds: ['electric_fire'],
  },
  {
    name: 'Нива Легенда',
    tier: 'Bucket',
    basePriceRange: [1200, 2500],
    description: 'Отечественный внедорожник. Едет везде. Правда, иногда возвращается сама.',
    imageId: 'niva_legend',
  },
  {
    name: 'КамАЗ Дакар',
    tier: 'Scrap',
    basePriceRange: [8000, 14000],
    description: 'Победитель Дакара на пенсии. Кузов помят, дух несломлен.',
    imageId: 'kamaz_dakar',
  },
];
