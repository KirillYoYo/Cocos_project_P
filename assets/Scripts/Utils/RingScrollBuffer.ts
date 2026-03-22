export class RingScrollBuffer<T> {

    private source: T[] = [];

    private buffer: (T | null)[];
    private capacity: number;

    private head: number = 0;
    private tail: number = 0;
    private size: number = 0;

    private scrollOffset: number = 0;

    constructor(
        capacity: number,
        private screenWidth: number,
        private getX: (item: T) => number,
        private getScreenX: (item: T, scroll: number) => number // 🔥 НОВОЕ
    ) {
        this.capacity = capacity;
        this.buffer = new Array(capacity).fill(null);
    }

    init(items: T[]) {
        this.source = items.reverse();

        this.head = 0;
        this.tail = 0;
        this.size = 0;
        this.scrollOffset = 0;
    }

    update(dt: number, scrollSpeed: number) {
        this.scrollOffset += scrollSpeed * dt;

        // удаление слева
        while (this.size > 0) {
            const item = this.buffer[this.head]!;

            const screenX = this.getScreenX(item, this.scrollOffset);

            if (screenX < -100) {
                this.head = (this.head + 1) % this.capacity;
                this.size--;
            } else break;
        }
    }

    fillStep(timeBudgetMs = 1.5) {
        const start = performance.now();
        const targetX = this.screenWidth * 4 + this.scrollOffset;

        while (this.getLastWorldX() < targetX) {
            const next = this.source.pop();
            if (!next) break;

            this.push(next);

            if (performance.now() - start > timeBudgetMs) break;
        }
    }

    private push(item: T) {
        this.buffer[this.tail] = item;
        this.tail = (this.tail + 1) % this.capacity;

        if (this.size < this.capacity) {
            this.size++;
        } else {
            this.head = (this.head + 1) % this.capacity;
        }
    }

    // 🔥 РЕНДЕР
    forEach(callback: (item: T, screenX: number) => void) {
        for (let i = 0; i < this.size; i++) {
            const index = (this.head + i) % this.capacity;
            const item = this.buffer[index]!;

            const screenX = this.getScreenX(item, this.scrollOffset);

            callback(item, screenX);
        }
    }

    getScrollOffset(): number {
        return this.scrollOffset;
    }

    // 👇 важно: используем МИРОВОЙ X
    private getLastWorldX(): number {
        if (this.size === 0) return 0;

        const lastIndex = (this.tail - 1 + this.capacity) % this.capacity;
        const item = this.buffer[lastIndex]!;

        return this.getX(item);
    }
}