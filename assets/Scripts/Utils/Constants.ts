/**
 * Глобальные константы проекта.
 * Содержит enum-ы событий и параметры по умолчанию.
 */

/** Типы событий для EventBus */
export enum GameEvent {
    SCROLL_CHANGED = 'scroll-changed',
    SCORE_CHANGED = 'score-changed',
    SPEED_CHANGED = 'speed-changed',
    ZOOM_CHANGED = 'zoom-changed',
    PAUSE = 'pause',
    RESUME = 'resume',
    GAME_OVER = 'game-over',
    BOOST_START = 'boost-start',
    BOOST_END = 'boost-end',
    PLAYER_HIT = 'player-hit',
    PLANE_INPUT = 'plane-input',
}

/** Цвета стен коридора (RGBA) */
export const WALL_COLOR = { r: 70, g: 55, b: 40, a: 255 };

/** Цвет отладочной линии центра коридора */
export const DEBUG_PATH_COLOR = { r: 255, g: 220, b: 0, a: 180 };

/** Отступ за пределами экрана для пре-рендера сегментов (px) */
export const OFFSCREEN_BUFFER = 80;
