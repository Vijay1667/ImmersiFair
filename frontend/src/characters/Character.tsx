import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Position } from "./Position";
import * as CANNON from 'cannon-es';
// import { io } from "socket.io-client";
import { socket } from '../components/socket';
export class Character {
    userName: string;
    userId: string | undefined;
    model: THREE.Group
    position: Position;
    mixer: THREE.AnimationMixer;
    walkDirection: THREE.Vector3;
    orbitControl: OrbitControls;
    rotateAngle: THREE.Vector3 = new THREE.Vector3(0, 1, 0);
    rotateQuarternion: THREE.Quaternion = new THREE.Quaternion();
    camera: THREE.Camera;
    character: CANNON.Body;
    walkVelocity: number = 2;
    cameraTarget = new THREE.Vector3();
    animations: THREE.AnimationClip[];
    currentAction: string;

    // socket = io('http://localhost:3000');
    constructor(userName:string, userId: string | undefined, model: THREE.Group, position: Position = new Position(), orbitControl: OrbitControls, mixer: THREE.AnimationMixer, walkDirection: THREE.Vector3 = new THREE.Vector3(0, 0, 0),
        camera: THREE.Camera, character: CANNON.Body, animations: THREE.AnimationClip[], currentAction: string) {
        this.userName=userName;    
        this.userId = userId;
        this.model = model;
        this.position = position;
        this.orbitControl = orbitControl;
        this.mixer = mixer;
        this.walkDirection = walkDirection;
        this.camera = camera;
        this.character = character;
        this.animations = animations;
        this.currentAction = currentAction;
        const action = this.mixer.clipAction(this.animations[0]);
        action.play();
        // console.log("action played");

    };
    public updateMixerOnly(mixerUpdateDelta: number) {
        this.mixer.update(mixerUpdateDelta);
        // console.log(this.mixer);
        // console.log("UPDATE MIXER ONLY");
        
        
    }
    public updateMixer(mixerUpdateDelta: number, keysPressed: { [key: string]: boolean }) {
        const DIRECTIONS = ["w", "a", "s", "d"]
        const directionPressed: boolean = DIRECTIONS.some((key) => keysPressed[key] == true);


        // diagonal movement angle offset
        var directionOffset = this.directionOffset(keysPressed);
        // console.log(keysPressed);
        // calculate towards camera direction
        var angleYCameraDirection = Math.PI + Math.atan2(
            this.camera.position.x - this.model.position.x,
            this.camera.position.z - this.model.position.z
        );


        // rotate model
        this.rotateQuarternion.setFromAxisAngle(
            this.rotateAngle,
            angleYCameraDirection + directionOffset
        );

        this.model.quaternion.rotateTowards(this.rotateQuarternion, 0.2);
        var moveX: number = this.walkDirection.x * this.walkVelocity * mixerUpdateDelta;
        var moveY: number = this.walkDirection.y * this.walkVelocity * mixerUpdateDelta;
        var moveZ: number = this.walkDirection.z * this.walkVelocity * mixerUpdateDelta;
        this.camera.getWorldDirection(this.walkDirection);
        // console.log("UPDATE MIXER");

        this.updateCameraTarget(moveX, moveZ);
        var play = '';
        if (directionPressed) {
            // console.log("IN LOOP")
            // calculate direction

            this.walkDirection.y = 0;
            this.walkDirection.normalize();
            this.walkDirection.applyAxisAngle(this.rotateAngle, directionOffset);

            // move model & camera


            var moveX_1: number = this.walkDirection.x * this.walkVelocity;
            var moveZ_1: number = this.walkDirection.z * this.walkVelocity;
            play = 'Walk';
            this.character.velocity.x = moveX * 60;
            this.character.velocity.z = moveZ * 60;
            this.model.position.x = this.character.position.x;
            this.model.position.z = this.character.position.z;
            // this.character.velocity.y=10;
            // console.log(moveX, moveY, moveZ);
            // console.log(this.walkDirection.x, this.walkDirection.z);

            // this.model.position.x += moveX;
            // this.model.position.z += moveZ;
            // this.mixer.existingAction(this.animations[0])?.fadeOut(0.2);
            // const action = this.mixer.clipAction(this.animations[24]);
            // action.time=animations[15].duration
            // action.repetitions=10
            // console.log(action);

            // action.loop = THREE.LoopRepeat;
            // action.play();

            // cameraAngle = THREE.MathUtils.lerp(cameraAngle, angle, 0.01);
            // camera.position.setFromSphericalCoords(15, 1, cameraAngle);
            // camera.position.add(character.position);
            // camera.lookAt(character.position);
        }
        else {
            this.character.velocity.x = 0;
            this.character.velocity.y = 0;
            this.character.velocity.z = 0;
            // this.mixer.existingAction(this.animations[24])?.fadeOut(0.5);
            play = 'Idle';
            // const action = this.mixer.clipAction(this.animations[0]);
            // action.time=animations[15].duration
            // action.repetitions=10
            // console.log(action);
            // action.fadeOut(0.5);
            // action.reset();
            // action.loop = THREE.LoopRepeat;
            // action.reset().fadeIn(0.2).play();
        }
        if (this.currentAction != play) {
            if (play == 'Idle') {
                this.mixer.clipAction(this.animations[24]).fadeOut(0.2);
                const action = this.mixer.clipAction(this.animations[0]);
                action.reset().fadeIn(0.2).play();
            }
            else {
                this.mixer.clipAction(this.animations[0]).fadeOut(0.2);
                const action = this.mixer.clipAction(this.animations[24]);
                action.reset().fadeIn(0.2).play();
            }

            this.currentAction = play;

        }
        const tolerance = 0.01; // Adjust the tolerance value as needed

        if (Math.abs(this.position.x - this.character.position.x) > tolerance ||
            Math.abs(this.position.z - this.character.position.z) > tolerance) {
            console.log("Sending position to server");

            socket.emit('updatePosition', {
                "character": socket.id,
                x: this.character.position.x,
                z: this.character.position.z    
            });

            this.position.x = this.character.position.x;
            this.position.z = this.character.position.z;
        }
        this.mixer.update(mixerUpdateDelta);
    }
    private updateCameraTarget(moveX: number, moveZ: number) {
        // move camera
        // this.camera.lookAt(new THREE.Vector3(this.character.position.x, this.character.position.y, this.character.position.z));
        // this.camera.position.x = this.character.position.x + 4;
        // this.camera.position.z = this.character.position.z + 4;
        if (Math.abs(this.camera.position.x - this.character.position.x) <= 7 && Math.abs(this.camera.position.x - this.character.position.x) >= 4) {
            this.camera.position.x += moveX;
            // console.log("UPDATE X");
            
        }
        if (Math.abs(this.camera.position.z - this.character.position.z) <= 7 && Math.abs(this.camera.position.z - this.character.position.z) >= 4) {
            this.camera.position.z += moveZ;
            // console.log("UPDATE Z");
        }
        // this.camera.position.y = this.character.position.y + 4;



        // update camera target
        this.cameraTarget.x = this.character.position.x;
        this.cameraTarget.y = this.character.position.y + 1;
        this.cameraTarget.z = this.character.position.z;
        this.orbitControl.target = this.cameraTarget;
    }

    public setUpSocketListeners = () => {

        socket.on('connection', () => {
            console.log(socket.id, " Connected");
            console.log("Sending message to server");
        });
        socket.emit('customEvent', { message: 'Hello from client!' });
        socket.on("disconnect", () => {
            console.log(socket.id, " Disconnected"); // undefined
        });
    }
    private directionOffset(keysPressed: any) {
        var directionOffset = 0; // w

        if (keysPressed['w']) {
            if (keysPressed['a']) {
                directionOffset = Math.PI / 4; // w+a
            } else if (keysPressed['d']) {
                directionOffset = -Math.PI / 4; // w+d
            }
        } else if (keysPressed['s']) {
            if (keysPressed['a']) {
                directionOffset = Math.PI / 4 + Math.PI / 2; // s+a
            } else if (keysPressed['d']) {
                directionOffset = -Math.PI / 4 - Math.PI / 2; // s+d
            } else {
                directionOffset = Math.PI; // s
            }
        } else if (keysPressed['a']) {
            directionOffset = Math.PI / 2; // a
        } else if (keysPressed['d']) {
            directionOffset = -Math.PI / 2; // d
        }

        return directionOffset;
    }

    public loadCharacterEmotes(){
        
    }

}