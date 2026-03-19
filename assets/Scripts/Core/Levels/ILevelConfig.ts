import { IPathConfig } from '../Generation/IPathConfig';
import { IPlaneConfig } from '../Generation/IPlaneConfig';

/**
 * Полный конфиг одного уровня.
 * Определяет все параметры: скорость, генерацию, камеру, корабль.
 * Новый уровень = новый объект ILevelConfig в Configs/.
 */
export interface ILevelConfig {
    /** Порядковый номер уровня */
    levelNumber: number;

    /** Базовая скорость горизонтального скролла (px/сек) */
    scrollSpeed: number;

    /** На сколько px/сек² скорость растёт со временем */
    speedIncrement: number;

    /** Какие типы препятствий используются на уровне (имена префабов) */
    obstacleTypes: string[];

    /** Очки, необходимые для перехода на следующий уровень */
    targetScore: number;

    // --- Генерация пути ---

    /** Параметры процедурной генерации коридора */
    path: IPathConfig;

    // --- Физика корабля ---

    /** Параметры физики корабля (движение, инерция, скорость скролла) */
    plane: IPlaneConfig;

    // --- Камера / Зум ---

    /** Стандартный уровень зума (1.0 = нормальный) */
    cameraZoomDefault: number;

    /** Список зум-событий, привязанных к прогрессу */
    cameraEvents: ICameraEvent[];
}

/**
 * Событие зума камеры, привязанное к моменту в уровне.
 * Используется CameraSystem для автоматических зум-переходов.
 */
export interface ICameraEvent {
    /** Тип триггера: по очкам или по времени */
    trigger: 'score' | 'time';

    /** Значение при котором срабатывает (score или секунды) */
    value: number;

    /** Целевой зум (< 1.0 = отдалить, > 1.0 = приблизить) */
    targetZoom: number;

    /** Длительность перехода в секундах */
    duration: number;

    /** Сколько секунд держать зум перед возвратом (0 = навсегда) */
    holdTime: number;
}
