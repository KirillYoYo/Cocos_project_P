import { ILevelConfig } from '../ILevelConfig';

/**
 * Уровень 1 — вступительный.
 * Плавная кривая, широкий коридор, медленный скролл.
 */
export const LEVEL_1: ILevelConfig = {
    levelNumber: 1,

    // Скролл отключён — мир движется со скоростью корабля
    scrollSpeed: 0,
    speedIncrement: 0,

    // Препятствия (пока заглушка, будут добавлены позже)
    obstacleTypes: ['rock', 'cloud'],
    targetScore: 500,

    // Генерация пути
    path: {
        noiseFrequency: 0.015,  // низкая частота → плавные повороты
        noiseAmplitude: 180,    // центр отклоняется до ±180px от середины
        corridorWidth: 280,     // широкий коридор для новичков
        corridorWidthMin: 150,  // минимальная ширина после сужения
        corridorShrinkRate: 0.002, // медленное сужение
        segmentLength: 20,      // шаг дискретизации кривой
        prebuildSegments: 100,  // 100 × 20 = 2000px вперёд

        // Скачки
        sharpJumps: [
            { atX: 1000, offsetY: -150, transitionLength: 60 },
            { atX: 2000, offsetY: 150, transitionLength: 120 },
            { atX: 2500, offsetY: -150, transitionLength: 220 },
            { atX: 2800, offsetY: 150, transitionLength: 220 },
            { atX: 3500, offsetY: -150, transitionLength: 720 },
            { atX: 4500, offsetY: 150, transitionLength: 520 },
        ],
    },

    // Физика корабля (Box2D)
    plane: {
        forwardSpeed: 150,       // горизонтальная скорость = скорость скролла мира
        gravityScale: 0.5,       // корабль падает постепенно (50% от мировой гравитации)
        upForce: 150,            // сила подъёма — чуть больше гравитации → медленный подъём
        downForce: 100,          // доп. сила вниз + гравитация → быстрое пикирование
        maxUpSpeed: 250,         // лимит скорости вверх
        maxDownSpeed: 200,       // лимит скорости вниз
        linearDamping: 1.5,      // сопротивление воздуха — умеренное торможение
        colliderRadius: 18,      // радиус коллайдера = радиус круга
    },

    // Камера (будет использоваться позже)
    cameraZoomDefault: 1.0,
    cameraEvents: [],
};
