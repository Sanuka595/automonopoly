import { GameNews } from './types.js';

export const NEWS_DB: GameNews[] = [
  {
    id: 'tax_luxury',
    title: 'Налог на роскошь!',
    description: 'Правительство вводит повышенный налог на дорогие автомобили. Спрос на Premium и Rarity падает.',
    icon: '📉',
    effects: {
      tierMultipliers: {
        Premium: 0.8,
        Rarity: 0.85
      },
      modelMultipliers: {}
    }
  },
  {
    id: 'fuel_crisis',
    title: 'Топливный кризис!',
    description: 'Цены на бензин взлетели. Старые прожорливые колымаги (Bucket) отдают за бесценок.',
    icon: '⛽',
    effects: {
      tierMultipliers: {
        Bucket: 0.6,
        Scrap: 0.8
      },
      modelMultipliers: {}
    }
  },
  {
    id: 'retro_hype',
    title: 'Хайп на классику!',
    description: 'Известный блогер купил ретро-авто. Цены на Rarity взлетели до небес!',
    icon: '🚀',
    effects: {
      tierMultipliers: {
        Rarity: 1.5
      },
      modelMultipliers: {}
    }
  },
  {
    id: 'taxi_boom',
    title: 'Бум такси!',
    description: 'Агрегаторы закупают автомобили Business класса. Цены растут.',
    icon: '🚖',
    effects: {
      tierMultipliers: {
        Business: 1.25
      },
      modelMultipliers: {}
    }
  },
  {
    id: 'scrap_utilization',
    title: 'Программа утилизации!',
    description: 'Государство выплачивает бонусы за сдачу автохлама. Спрос на Scrap вырос.',
    icon: '♻️',
    effects: {
      tierMultipliers: {
        Scrap: 1.3
      },
      modelMultipliers: {}
    }
  },
  {
    id: 'jdm_fest',
    title: 'JDM Фестиваль!',
    description: 'Легенды японского автопрома снова в моде. Supra и Skyline дорожают.',
    icon: '🗾',
    effects: {
      tierMultipliers: {},
      modelMultipliers: {
        'Toyota Supra MK4': 1.4,
        'Nissan Skyline GT-R R34': 1.4
      }
    }
  },
  {
    id: 'ev_subsidies',
    title: 'Субсидии на электрокары!',
    description: 'Власти стимулируют переход на экологичный транспорт. Tesla в тренде.',
    icon: '⚡',
    effects: {
      tierMultipliers: {},
      modelMultipliers: {
        'Tesla Model S P85D': 1.3
      }
    }
  },
  {
    id: 'export_ban',
    title: 'Запрет экспорта!',
    description: 'Поставки новых запчастей ограничены. Ремонт стал дороже, а рынок Premium лихорадит.',
    icon: '🚫',
    effects: {
      tierMultipliers: {
        Premium: 0.9,
        Business: 0.95
      },
      modelMultipliers: {}
    }
  },
  {
    id: 'stable_economy',
    title: 'Стабильность!',
    description: 'На рынке штиль. Идеальное время для спокойных сделок.',
    icon: '⚖️',
    effects: {
      tierMultipliers: {
        Bucket: 1.0,
        Scrap: 1.0,
        Business: 1.0,
        Premium: 1.0,
        Rarity: 1.0
      },
      modelMultipliers: {}
    }
  },
  {
    id: 'economic_growth',
    title: 'Экономический рост!',
    description: 'У людей появились лишние деньги. Весь рынок медленно ползет вверх.',
    icon: '📈',
    effects: {
      tierMultipliers: {
        Bucket: 1.05,
        Scrap: 1.05,
        Business: 1.1,
        Premium: 1.1,
        Rarity: 1.1
      },
      modelMultipliers: {}
    }
  },

  // ─── Контекстные события (Smart Event Director) ────────────────────────────
  {
    id: 'luxury_deficit',
    title: 'Дефицит люкса!',
    description: 'Покупатели разобрали весь Premium. Оставшиеся экземпляры идут с наценкой.',
    icon: '💎',
    effects: {
      tierMultipliers: {
        Premium: 1.3,
        Rarity: 1.2
      },
      modelMultipliers: {}
    }
  },
  {
    id: 'gai_raid',
    title: 'Рейды ГАИ на ведра!',
    description: 'Полиция массово штрафует владельцев старых колымаг. Bucket стал токсичным активом.',
    icon: '🚓',
    effects: {
      tierMultipliers: {
        Bucket: 0.5,
        Scrap: 0.75
      },
      modelMultipliers: {}
    }
  },
  {
    id: 'repair_season',
    title: 'Сезон технического обслуживания!',
    description: 'Автосервисы в очередях. Хорошо обслуженные авто ценятся особенно.',
    icon: '🔧',
    effects: {
      tierMultipliers: {
        Business: 1.15,
        Premium: 1.1,
        Rarity: 1.1
      },
      modelMultipliers: {}
    }
  },
  {
    id: 'racing_fever',
    title: 'Гоночная лихорадка!',
    description: 'После серии громких заездов весь город говорит о гонках. Спортивные авто в цене.',
    icon: '🏁',
    effects: {
      tierMultipliers: {
        Rarity: 1.35,
        Premium: 1.15
      },
      modelMultipliers: {
        'Toyota Supra MK4': 1.5,
        'Nissan Skyline GT-R R34': 1.5
      }
    }
  }
];
