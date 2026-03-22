import { Vec2 } from 'cc';

export class CurveManager {

    private allPoints: Vec2[] = [];
    private visiblePoints: Vec2[] = [];

    private headIndex: number = 0;
    private scrollOffset: number = 0;

    constructor(
        private screenWidth: number,
        private screenHeight: number
    ) {}

    init(points: Vec2[]) {
        this.allPoints = points.reverse();
        this.visiblePoints = [];
        this.headIndex = 0;
        this.scrollOffset = 0;
    }

    update(dt: number, scrollSpeed: number) {
        this.scrollOffset += scrollSpeed * dt;

        // удаление слева (логический сдвиг)
        while (this.headIndex < this.visiblePoints.length) {
            const screenX = this.visiblePoints[this.headIndex].x - this.scrollOffset;
            if (screenX < -100) {
                this.headIndex++;
            } else break;
        }
    }

    fillVisiblePointsStep(timeBudgetMs = 1.5) {
        const start = performance.now();
        const targetX = this.screenWidth * 4 + this.scrollOffset;

        while (this.getLastVisibleX() < targetX) {
            const next = this.allPoints.pop();
            if (!next) break;

            this.visiblePoints.push(next);

            if (performance.now() - start > timeBudgetMs) break;
        }
    }

    cleanup() {
        const active: Vec2[] = [];

        for (let i = this.headIndex; i < this.visiblePoints.length; i++) {
            active.push(this.visiblePoints[i]);
        }

        this.visiblePoints = active;
        this.headIndex = 0;
    }

    // 🔥 НОВОЕ — полностью скрываем внутренности
    forEachRenderablePoint(callback: (screenX: number, y: number) => void) {
        for (let i = this.headIndex; i < this.visiblePoints.length; i++) {
            const p = this.visiblePoints[i];
            const screenX = p.x - this.scrollOffset;
            callback(screenX, p.y);
        }
    }

    getYAtCenter(): number | null {
        if (this.visiblePoints.length - this.headIndex < 2) return null;

        const centerX = this.screenWidth / 2;

        let i = this.headIndex;

        while (
            i + 1 < this.visiblePoints.length &&
            this.visiblePoints[i + 1].x - this.scrollOffset < centerX
        ) {
            i++;
        }

        if (i + 1 >= this.visiblePoints.length) {
            i = this.visiblePoints.length - 2;
        }

        const p1 = this.visiblePoints[i];
        const p2 = this.visiblePoints[i + 1];

        const x1 = p1.x - this.scrollOffset;
        const x2 = p2.x - this.scrollOffset;

        const dx = x2 - x1;
        if (dx === 0) return p1.y - this.screenHeight / 2;

        const t = (centerX - x1) / dx;

        const p0 = i > this.headIndex ? this.visiblePoints[i - 1] : p1;
        const p3 = i + 2 < this.visiblePoints.length ? this.visiblePoints[i + 2] : p2;

        const y = this.catmullRom(p0.y, p1.y, p2.y, p3.y, t);

        return y - this.screenHeight / 2;
    }

    private getLastVisibleX(): number {
        if (this.visiblePoints.length === 0) return 0;
        return this.visiblePoints[this.visiblePoints.length - 1].x;
    }

    private catmullRom(p0: number, p1: number, p2: number, p3: number, t: number): number {
        const t2 = t * t;
        const t3 = t2 * t;

        return 0.5 * (
            (2 * p1) +
            (-p0 + p2) * t +
            (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
            (-p0 + 3 * p1 - 3 * p2 + p3) * t3
        );
    }
}