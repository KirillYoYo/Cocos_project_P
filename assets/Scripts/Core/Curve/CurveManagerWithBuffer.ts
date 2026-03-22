import { Vec2 } from 'cc';
import { RingScrollBuffer } from '../../Utils/RingScrollBuffer';

export class CurveManager {

    private buffer: RingScrollBuffer<Vec2>;

    constructor(
        private screenWidth: number,
        private screenHeight: number
    ) {
        this.buffer = new RingScrollBuffer<Vec2>(
            2000,
            screenWidth,
            (p) => p.x
        );
    }

    init(points: Vec2[]) {
        this.buffer.init(points);
    }

    update(dt: number, speed: number) {
        this.buffer.update(dt, speed);
    }

    fillVisiblePointsStep(time = 1.5) {
        this.buffer.fillStep(time);
    }

    // 🔥 используется в drawPoints()
    forEachRenderablePoint(cb: (screenX: number, y: number) => void) {
        this.buffer.forEach((p, screenX) => {
            cb(screenX, p.y);
        });
    }

    // 🔥 используется в GameController
    getYAtCenter(): number | null {
        const buffer = this.buffer.getRawBuffer();
        const head = this.buffer.getHead();
        const size = this.buffer.getSize();
        const capacity = this.buffer.getCapacity();

        if (size < 2) return null;

        const centerX = this.buffer.getScrollOffset() + this.screenWidth / 2;

        let i = 0;

        while (i + 1 < size) {
            const idx1 = (head + i) % capacity;
            const idx2 = (head + i + 1) % capacity;

            const p1 = buffer[idx1]!;
            const p2 = buffer[idx2]!;

            if (p2.x >= centerX) break;

            i++;
        }

        const idx1 = (head + i) % capacity;
        const idx2 = (head + i + 1) % capacity;

        const p1 = buffer[idx1]!;
        const p2 = buffer[idx2]!;

        const dx = p2.x - p1.x;
        if (dx === 0) return p1.y - this.screenHeight / 2;

        const t = (centerX - p1.x) / dx;

        const idx0 = i > 0 ? (head + i - 1) % capacity : idx1;
        const idx3 = (i + 2 < size) ? (head + i + 2) % capacity : idx2;

        const p0 = buffer[idx0]!;
        const p3 = buffer[idx3]!;

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