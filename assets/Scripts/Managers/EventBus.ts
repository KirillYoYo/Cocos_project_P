/**
 * Простая шина событий (Observer pattern).
 * Связывает Model → View без прямых зависимостей.
 * Использование: EventBus.emit('score-changed', 100);
 */

type EventCallback = (...args: any[]) => void;

export class EventBus {
    /** Хранилище подписчиков: событие → массив колбэков */
    private static listeners: Map<string, EventCallback[]> = new Map();

    /** Подписаться на событие */
    static on(event: string, callback: EventCallback): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event)!.push(callback);
    }

    /** Отписаться от события */
    static off(event: string, callback: EventCallback): void {
        const cbs = this.listeners.get(event);
        if (!cbs) return;

        const idx = cbs.indexOf(callback);
        if (idx !== -1) cbs.splice(idx, 1);
    }

    /** Отправить событие всем подписчикам */
    static emit(event: string, ...args: any[]): void {
        const cbs = this.listeners.get(event);
        if (!cbs) return;

        // Итерируем по копии, чтобы подписчики могли отписываться внутри колбэка
        for (const cb of [...cbs]) {
            cb(...args);
        }
    }

    /** Очистить все подписки (вызывать при смене сцены) */
    static clear(): void {
        this.listeners.clear();
    }
}
