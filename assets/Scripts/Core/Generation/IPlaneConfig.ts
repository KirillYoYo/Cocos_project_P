/**
 * Параметры физики корабля (Box2D).
 * Передаётся из конфига уровня в PlaneController.
 */
export interface IPlaneConfig {
    /** Радиус CircleCollider2D корабля (px) */
    colliderRadius: number;

}
