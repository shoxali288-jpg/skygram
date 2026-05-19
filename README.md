# Skygram

Современный premium-мессенджер с real-time чатами, админ-панелью и PWA поддержкой.

## Технологии

- **Next.js** (App Router)
- **React** + **TypeScript**
- **Tailwind CSS** (v4)
- **Supabase** (база данных + realtime)
- **bcryptjs** (хеширование паролей)
- **JWT** (сессии)
- **PWA** (Service Worker + Manifest)

## Функции

- Регистрация и авторизация с bcrypt
- Real-time переписка через Supabase Realtime
- Поиск пользователей по нику
- Профили с аватарками
- Статусы online/offline
- Галочка верификации (синяя)
- Admin-панель (статистика, пользователи, модерация)
- 4 темы: Голубая, Белая, Чёрная, Premium Dark
- PWA — установка на главный экран
- Адаптивный дизайн (мобильная версия)
- Редактирование и удаление сообщений
- Ответы на сообщения (reply)
- Закрепление чатов
- Поиск по переписке
- Статус "печатает..."
- Индикаторы отправки/прочтения

## Установка и запуск

### 1. Клонировать репозиторий

```bash
git clone https://github.com/your-username/skygram.git
cd skygram
```

### 2. Установить зависимости

```bash
npm install
```

### 3. Настроить Supabase

1. Создайте проект на [supabase.com](https://supabase.com)
2. Скопируйте URL проекта и anon key
3. Выполните SQL из `migration.sql` в SQL Editor Supabase
4. Включите Realtime для таблиц `messages` и `users`:
   - Database → Replication → enable for `messages` and `users`

### 4. Настроить переменные окружения

Создайте файл `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
JWT_SECRET=your-random-secret-string
```

### 5. Запустить

```bash
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000)

## Как пользоваться

### Регистрация

1. Откройте `/register`
2. Введите ник (латиница, цифры, `_`)
3. Введите пароль (минимум 4 символа)
4. Нажмите "Зарегистрироваться"

**Ник `shoxa2011` зарезервирован для администратора.**

### Вход

1. Откройте `/login`
2. Введите ник и пароль
3. Нажмите "Войти"

### Поиск пользователей

1. В боковой панели введите ник в поле поиска
2. Нажмите на результат
3. В профиле нажмите "Написать"
4. Чат создастся автоматически

### Создание администратора shoxa2011

Через интерфейс регистрации обычный пользователь не может создать аккаунт `shoxa2011`. Для создания админа:

**Вариант 1: Через SQL в Supabase**

Выполните в SQL Editor Supabase:

```sql
-- Сначала зарегистрируйте любого пользователя через сайт
-- Затем получите его ID и измените:
UPDATE users SET role = 'admin', is_verified = true WHERE username = 'shoxa2011';
```

**Вариант 2: Через API (требуется ключ сервисной роли)**

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"shoxa2011","password":"your-admin-password"}'
```

Затем в Supabase выполните:
```sql
UPDATE users SET role = 'admin', is_verified = true WHERE username = 'shoxa2011';
```

### Админ-панель

Доступна только пользователю `shoxa2011` по ссылке `/app/admin`.

Возможности:
- Статистика (пользователи, сообщения, активность)
- Список всех пользователей с поиском
- Блокировка/разблокировка
- Удаление пользователей
- Выдача и снятие синей галочки
- Просмотр и удаление сообщений
- Жалобы

### Смена темы

Настройки → Тема оформления:
- **Голубая** — светлая с голубыми акцентами
- **Белая** — минималистичная светлая
- **Чёрная** — тёмная
- **Premium Dark** — тёмная с неоново-голубыми акцентами

### Аватарка

Настройки → Аватарка → "Загрузить аватарку"

### PWA установка

**На телефоне (Android):**
1. Откройте сайт в Chrome
2. Нажмите "⋮" → "Добавить на главный экран"
3. Нажмите "Установить"

**На iPhone:**
1. Откройте сайт в Safari
2. Нажмите "Share" (квадратик со стрелкой)
3. Прокрутите вниз → "На экран «Домой»"
4. Нажмите "Добавить"

### Галочка верификации

1. Войдите как `shoxa2011`
2. Откройте Админ-панель
3. Перейдите в раздел "Верификация"
4. Нажмите "Выдать галочку" рядом с пользователем

## Деплой на Vercel

### Автоматический деплой

1. Создайте репозиторий на GitHub
2. Подключите Vercel через GitHub
3. Vercel автоматически определит Next.js
4. Добавьте переменные окружения в Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `JWT_SECRET`
5. Нажмите "Deploy"

### Переменные окружения для Vercel

| Variable | Значение |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL вашего Supabase проекта |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key из Supabase |
| `JWT_SECRET` | Случайная строка для подписи JWT |

## Структура базы данных

- **users** — id, username, password_hash, avatar_url, role, is_verified, is_blocked, created_at, last_seen
- **chats** — id, user1_id, user2_id, pinned_by, created_at
- **messages** — id, chat_id, sender_id, text, created_at, edited_at, is_deleted, is_read, reply_to_message_id
- **reports** — id, reporter_id, reported_user_id, reason, created_at

## Лицензия

MIT
