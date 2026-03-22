import { Vec2 } from 'cc';

export class CurveManager {
    private allPoints: Vec2[] = [];
    private visiblePoints: Vec2[] = [];

    private headIndex: number = 0;
    private scrollOffset: number = 0;

    private fillingInProgress = false;

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

        // удаление слева
        while (this.headIndex < this.visiblePoints.length) {
            const screenX = this.visiblePoints[this.headIndex].x - this.scrollOffset;
            if (screenX < -100) {
                this.headIndex++;
            } else break;
        }
    }

    async fillVisiblePoints() {
        if (this.fillingInProgress) return;
        this.fillingInProgress = true;

        const targetX = this.screenWidth * 4 + this.scrollOffset;

        while (this.getLastVisibleX() < targetX) {
            for (let i = 0; i < 10; i++) {
                const next = this.allPoints.pop();
                if (next) this.visiblePoints.push(next);
                else break;
            }

            if (this.getLastVisibleX() < targetX) {
                await new Promise(r => requestAnimationFrame(r));
            }
        }

        this.fillingInProgress = false;
    }

    cleanup() {
        const active: Vec2[] = [];
        for (let i = this.headIndex; i < this.visiblePoints.length; i++) {
            active.push(this.visiblePoints[i]);
        }

        this.visiblePoints = active;
        this.headIndex = 0;
    }

    getRenderablePoints(): Vec2[] {
        return this.visiblePoints.slice(this.headIndex);
    }

    getScrollOffset(): number {
        return this.scrollOffset;
    }

    private getLastVisibleX(): number {
        if (this.visiblePoints.length === 0) return 0;
        return this.visiblePoints[this.visiblePoints.length - 1].x;
    }

    // --- Y на центре экрана ---
    getYAtCenter(): number | null {
        const points = this.getRenderablePoints().map(
            p => new Vec2(p.x - this.scrollOffset, p.y)
        );

        if (points.length < 2) return null;

        const centerX = this.screenWidth / 2;

        let i = 0;
        while (i + 1 < points.length && points[i + 1].x < centerX) i++;

        if (i + 1 >= points.length) i = points.length - 2;
        if (i < 0) i = 0;

        const p1 = points[i];
        const p2 = points[i + 1];

        const dx = p2.x - p1.x;
        if (dx === 0) return p1.y - this.screenHeight / 2;

        const t = (centerX - p1.x) / dx;

        const p0 = i > 0 ? points[i - 1] : p1;
        const p3 = i + 2 < points.length ? points[i + 2] : p2;

        const y = this.catmullRom(p0.y, p1.y, p2.y, p3.y, t);
        return y - this.screenHeight / 2;
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