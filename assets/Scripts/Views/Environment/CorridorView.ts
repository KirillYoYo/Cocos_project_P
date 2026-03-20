import { _decorator, Component, Graphics, Color, UITransform, view, PolygonCollider2D, Vec2, RigidBody2D, ERigidBody2DType } from 'cc';
import { PathSegment } from '../../Core/Generation/IPathConfig';
import { WALL_COLOR, DEBUG_PATH_COLOR, OFFSCREEN_BUFFER } from '../../Utils/Constants';

const { ccclass } = _decorator;

/**
 * Отрисовка стен коридора через Cocos Graphics.
 * Только визуализация — не знает о логике игры.
 * GameController передаёт сегменты и scrollOffset, View рисует.
 */
@ccclass('CorridorView')
export class CorridorView extends Component {
    /** Graphics компонент для рисования полигонов стен */
    private graphics: Graphics | null = null;

    /** RigidBody2D для статических коллайдеров стен */
    private rb: RigidBody2D | null = null;

    /** Коллайдеры для верхней и нижней стен */
    private topCollider: PolygonCollider2D | null = null;
    private bottomCollider: PolygonCollider2D | null = null;

    /** Текущие сегменты пути (устанавливаются GameController-ом) */
    private segments: PathSegment[] = [];

    /** Текущее смещение скролла (px) */
    private scrollOffset: number = 0;

    /** Размеры видимой области */
    private screenWidth: number = 0;
    private screenHeight: number = 0;

    /** Цвета стен и отладочной линии */
    private wallColor = new Color(WALL_COLOR.r, WALL_COLOR.g, WALL_COLOR.b, WALL_COLOR.a);
    private debugColor = new Color(DEBUG_PATH_COLOR.r, DEBUG_PATH_COLOR.g, DEBUG_PATH_COLOR.b, DEBUG_PATH_COLOR.a);

    /** Показывать ли отладочную линию центра коридора */
    private showDebugPath: boolean = true;

    onLoad(): void {
        // Получаем или создаём Graphics компонент
        this.graphics = this.getComponent(Graphics);
        if (!this.graphics) {
            this.graphics = this.node.addComponent(Graphics);
        }

        // Создаём RigidBody2D для статических коллайдеров
        this.rb = this.getComponent(RigidBody2D);
        if (!this.rb) {
            this.rb = this.node.addComponent(RigidBody2D);
        }
        this.rb.type = ERigidBody2DType.Static;

        // Создаём коллайдеры для стен
        this.topCollider = this.node.addComponent(PolygonCollider2D);
        this.bottomCollider = this.node.addComponent(PolygonCollider2D);

        // Размеры видимой области
        const visibleSize = view.getVisibleSize();
        this.screenWidth = visibleSize.width;
        this.screenHeight = visibleSize.height;

        // UITransform должен покрывать весь экран для корректного рендера
        let transform = this.getComponent(UITransform);
        if (!transform) {
            transform = this.node.addComponent(UITransform);
        }
        transform.setContentSize(this.screenWidth, this.screenHeight);
    }

    /** Установить массив сегментов (вызывается при генерации новых) */
    setSegments(segments: PathSegment[]): void {
        this.segments = segments;
    }

    /** Добавить новые сегменты к существующим */
    appendSegments(newSegments: PathSegment[]): void {
        this.segments = this.segments.concat(newSegments);
    }

    /** Удалить сегменты, которые уже прошли за левый край экрана */
    pruneOldSegments(minX: number): void {
        // Находим индекс первого актуального сегмента (без создания нового массива)
        let cutIndex = 0;
        while (cutIndex < this.segments.length && this.segments[cutIndex].x < minX) {
            cutIndex++;
        }
        if (cutIndex > 0) {
            this.segments.splice(0, cutIndex);
        }
    }

    /**
     * Перерисовать коридор с текущим смещением.
     * Вызывается каждый кадр из GameController.
     */
    updateView(scrollOffset: number): void {
        this.scrollOffset = scrollOffset;
        this.redraw();
    }

    /** Основная процедура отрисовки */
    private redraw(): void {
        const g = this.graphics;
        if (!g || this.segments.length < 2) return;

        g.clear();

        const halfW = this.screenWidth / 2;
        const halfH = this.screenHeight / 2;

        // Диапазон видимых X в мировых координатах (с буфером)
        const visibleLeft = this.scrollOffset - OFFSCREEN_BUFFER;
        const visibleRight = this.scrollOffset + this.screenWidth + OFFSCREEN_BUFFER;

        // Находим индексы видимых сегментов (без аллокации массива)
        let startIdx = -1;
        let endIdx = -1;
        for (let i = 0; i < this.segments.length; i++) {
            const sx = this.segments[i].x;
            if (sx >= visibleLeft && sx <= visibleRight) {
                if (startIdx === -1) startIdx = i;
                endIdx = i;
            } else if (startIdx !== -1) {
                break; // Сегменты отсортированы по X — можно прервать
            }
        }

        // Нечего рисовать
        if (startIdx === -1 || endIdx === -1 || endIdx - startIdx < 1) return;

        // --- Верхняя стена ---
        g.fillColor = this.wallColor;
        const firstSeg = this.segments[startIdx];
        const firstCanvasX = firstSeg.x - this.scrollOffset - halfW;

        // Начинаем от верхнего-левого угла экрана
        g.moveTo(firstCanvasX, halfH);

        // Идём по верхнему краю коридора
        for (let i = startIdx; i <= endIdx; i++) {
            const seg = this.segments[i];
            const cx = seg.x - this.scrollOffset - halfW;
            const topEdge = seg.centerY + seg.corridorWidth / 2;
            g.lineTo(cx, topEdge);
        }

        // Замыкаем к верхнему-правому углу
        const lastSeg = this.segments[endIdx];
        const lastCanvasX = lastSeg.x - this.scrollOffset - halfW;
        g.lineTo(lastCanvasX, halfH);
        g.close();
        g.fill();

        // Устанавливаем точки коллайдера для верхней стены
        if (this.topCollider) {
            const topPoints: Vec2[] = [];
            topPoints.push(new Vec2(firstCanvasX, halfH));
            for (let i = startIdx; i <= endIdx; i++) {
                const seg = this.segments[i];
                const cx = seg.x - this.scrollOffset - halfW;
                const topEdge = seg.centerY + seg.corridorWidth / 2;
                topPoints.push(new Vec2(cx, topEdge));
            }
            topPoints.push(new Vec2(lastCanvasX, halfH));
            this.topCollider.points = topPoints;
            this.topCollider.apply();
        }

        // --- Нижняя стена ---
        g.moveTo(firstCanvasX, -halfH);

        // Идём по нижнему краю коридора
        for (let i = startIdx; i <= endIdx; i++) {
            const seg = this.segments[i];
            const cx = seg.x - this.scrollOffset - halfW;
            const bottomEdge = seg.centerY - seg.corridorWidth / 2;
            g.lineTo(cx, bottomEdge);
        }

        // Замыкаем к нижнему-правому углу
        g.lineTo(lastCanvasX, -halfH);
        g.close();
        g.fill();

        // Устанавливаем точки коллайдера для нижней стены
        if (this.bottomCollider) {
            const bottomPoints: Vec2[] = [];
            bottomPoints.push(new Vec2(firstCanvasX, -halfH));
            for (let i = startIdx; i <= endIdx; i++) {
                const seg = this.segments[i];
                const cx = seg.x - this.scrollOffset - halfW;
                const bottomEdge = seg.centerY - seg.corridorWidth / 2;
                bottomPoints.push(new Vec2(cx, bottomEdge));
            }
            bottomPoints.push(new Vec2(lastCanvasX, -halfH));
            this.bottomCollider.points = bottomPoints;
            this.bottomCollider.apply();
        }

        // --- Отладочная линия центра коридора ---
        if (this.showDebugPath) {
            g.strokeColor = this.debugColor;
            g.lineWidth = 2;
            g.moveTo(firstCanvasX, firstSeg.centerY);
            for (let i = startIdx + 1; i <= endIdx; i++) {
                const seg = this.segments[i];
                const cx = seg.x - this.scrollOffset - halfW;
                g.lineTo(cx, seg.centerY);
            }
            g.stroke();
        }
    }
}
