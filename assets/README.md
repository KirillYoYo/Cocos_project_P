# ✈️ Game Controller & Rendering System

> Минимализм, параллакс и немного космоса.  
> Всё летит — и код тоже.

---

## 🧠 Общая архитектура

Проект разделён на 2 слоя:

### 🎮 Game Logic
- GameController
- CurveManager
- SpaceManager

👉 считают, обновляют, но **ничего не рисуют**

---

### 🎨 Rendering
- SpaceRenderer
- CurveRenderer

👉 только рисуют, ничего не знают о логике игры

---

## 🌊 Генерация кривой

generateCurveVertices(...) → allPoints (stack)

---

## ⚡ Видимые точки

- allPoints
- visiblePoints

---

## 🏃 Скролл

scrollOffset += speed * dt

---

## 🌌 Space System (Ring Buffer)

Используется RingScrollBuffer<T>

### Почему:
- O(1) операции
- нет GC
- бесконечный мир

### Координаты:
- world X
- screen X (с параллаксом)

### Удаление:
if (screenX < -100) → head++

### Добавление:
fillStep() с time budget

---

## 🎨 Rendering

### SpaceRenderer
- звезды
- планеты

### CurveRenderer
- линия

---

## ✈️ Самолёт

getYAtCenter() → Catmull-Rom  
planeController.setPositionY(y)

---

## 🧘 Итог

Мы не двигаем мир.  
Мы двигаем координаты.
