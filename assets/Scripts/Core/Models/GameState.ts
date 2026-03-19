/**
 * Хранит текущее состояние игры (Singleton).
 * Доступен из любого места: GameState.instance
 * Чистые данные — без логики рендеринга.
 * Изменения транслируются через EventBus.
 */
export class GameState {
    /** Единственный экземпляр */
    private static _instance: GameState | null = null;

    /** Получить глобальный экземпляр GameState */
    static get instance(): GameState {
        if (!GameState._instance) {
            GameState._instance = new GameState();
        }
        return GameState._instance;
    }

    /** Приватный конструктор — создание только через instance */
    private constructor() {}

    /** Текущий счёт */
    score: number = 0;

    /** Оставшиеся жизни */
    lives: number = 3;

    /** Игра запущена (update-цикл активен) */
    isRunning: boolean = false;

    /** Игра на паузе (update-цикл остановлен, UI паузы показан) */
    isPaused: boolean = false;

    /** Общее пройденное расстояние скролла (px) */
    totalDistance: number = 0;

    /** Текущая скорость горизонтального скролла (px/сек) */
    currentScrollSpeed: number = 0;

    /** Номер текущего уровня */
    currentLevel: number = 1;

    /** Сбросить состояние к начальным значениям */
    reset(): void {
        this.score = 0;
        this.lives = 3;
        this.isRunning = false;
        this.isPaused = false;
        this.totalDistance = 0;
        this.currentScrollSpeed = 0;
    }
}
