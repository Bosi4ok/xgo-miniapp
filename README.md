# Telegram Mini App - 2048

[![Vercel Status](https://img.shields.io/github/deployments/Bosi4ok/xgo-miniapp/Production?label=vercel&logo=vercel)](https://xgo-miniapp-git-main-artems-projects-e7783d6f.vercel.app/)

Мини-приложение для Telegram с системой ежедневных чекинов, реферальной системой и системой задач.

🌐 [Открыть приложение](https://xgo-miniapp-git-main-artems-projects-e7783d6f.vercel.app/)

## Функциональность

- Ежедневные чекины с начислением XP
- Система стриков (серий последовательных чекинов)
- Реферальная система с уникальными кодами
- Система задач с вознаграждениями
- Профиль пользователя с отображением прогресса

## Технологии

- HTML/CSS/JavaScript (ES6+)
- Telegram Web App API
- Supabase (база данных и аутентификация)

## Установка и настройка

1. Клонируйте репозиторий:
```bash
git clone <your-repo-url>
```

2. Настройте Supabase:
   - Создайте проект в Supabase
   - Выполните SQL скрипты из файлов:
     - create_tables.sql
     - create_daily_checkins.sql
     - perform_checkin.sql
     - reset_checkins.sql

3. Создайте файл .env с вашими ключами Supabase:
```
SUPABASE_URL=your-supabase-url
SUPABASE_KEY=your-supabase-key
```

4. Настройте Telegram Mini App:
   - Создайте бота через @BotFather
   - Настройте веб-приложение и получите ссылку

## Структура проекта

```
├── index.html           # Главная страница
├── js/                 # JavaScript файлы
│   ├── main.js        # Основной файл
│   └── modules/       # Модули
│       ├── checkin.js    # Система чекинов
│       ├── database.js   # Работа с базой данных
│       ├── profile.js    # Профиль пользователя
│       ├── referral.js   # Реферальная система
│       ├── tasks.js      # Система задач
│       └── ui.js         # Пользовательский интерфейс
├── sql/               # SQL скрипты
└── vercel.json        # Конфигурация Vercel
```

## Развертывание

Проект настроен для развертывания на Vercel. Просто подключите ваш репозиторий к Vercel и настройте переменные окружения.

## Лицензия

MIT
