export class Position {
    public x: number;
    public y: number;
    public z: number;
    constructor(x: number = 0, y: number = 0, z: number = 0) {
        this.x = x || 0;
        this.y = y || 0;
        this.z = z || 0;
    }
    setPosition(x: number, y: number, z: number) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
}
