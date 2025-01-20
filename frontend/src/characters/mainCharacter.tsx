import { useEffect, useState, useRef } from "react";
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Position } from "./Position";
import { Character } from "./Character";
import * as CANNON from 'cannon-es';
import CannonDebugger from 'cannon-es-debugger';
import { Loader } from "../components/loader";
import { createPortal } from "react-dom";
import VisualControls from "./VisualControls";
// import { FBXLoader } from "three/examples/jsm/Addons.js";
// import { Project, Scene3D, PhysicsLoader } from 'enable3d'
// import { AmmoPhysics, AmmoPhysicsObject } from "three/examples/jsm/Addons.js";
import { socket } from "../components/socket";
import { mix } from "three/tsl";
import AudioChat from "../components/AudioChat";
import TextChat from "../components/TextChat";
import SignOut from "./SignOut";
import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import { graphConfig, loginRequest } from "../components/AuthConfig";
import { useNavigate } from "react-router-dom";

const MainCharacter = () => {
    const isAuthenticated = useIsAuthenticated();
    interface UserData {
        surname: string;
        // Add other properties if needed
    }
    interface UserMapping {
        model: THREE.Group;
        userName: string;
    }
    const [userData, setUserData] = useState<UserData>({ surname: "loading..." });
    const { instance, accounts } = useMsal();
    const navigate = useNavigate();

    var mainCharacter: Character;
    const clock = new THREE.Clock();
    var [visible, setVisible] = useState(true)
    var [loadingText, setLoadingText] = useState("Loading")
    let characterModel: THREE.Group;
    var render = useRef<HTMLCanvasElement | null>(null);
    // var mixer: THREE.AnimationMixer = null;
    var mixerUpdateDelta = clock.getDelta();
    let outlineMesh: THREE.Mesh;
    var world = new CANNON.World({
        gravity: new CANNON.Vec3(0, -9.82, 0), // m/s²
    });
    let isFloorLoaded = false;
    var currentUserIds = new Set();
    var otherUsers: Character[] = [];

    var [availableAudioTransfers, setAvailableAudioTransfers] = useState<string[]>([]);
    var availableAudioTransfersRef = useRef(new Set<string>());
    var [otherUserMappings, setOtherUserMappings] = useState<{ [key: string]: UserMapping } >({});
    var otherUserPhysicsMappings: { [key: string]: CANNON.Body } = {};
    // const [position, setPosition] = useState(new Position());
    const scene = new THREE.Scene();
    const cannonDebugger = CannonDebugger(scene, world);
    const characterBodyRef = useRef(new CANNON.Body({}));
    const remoteAudioRef: HTMLAudioElement = document.getElementById("remote-audio") as HTMLAudioElement;
    var audioChatInstanceRef = useRef<AudioChat>();
    var [currentTalkingUser, setCurrentTalkingUser] = useState<string | null>("");
    // var physics: AmmoPhysicsObject;
    // const loadPhysics = async () => {
    //     physics = await AmmoPhysics();
    //     physics.addScene(scene);
    // }

    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);

    // var scene_3d = new Scene3D();
    const renderer = new THREE.WebGLRenderer();
    // const pmremGenerator = new THREE.PMREMGenerator(renderer);

    renderer.setSize(window.innerWidth, window.innerHeight);
    // pmremGenerator.compileEquirectangularShader();
    let keysPressed: { [key: string]: boolean } = {};
    const allowedKeys = new Set(["w", "a", "s", "d"]);
    const animate = () => {
        mixerUpdateDelta = clock.getDelta();
        // console.log(mixerUpdateDelta);
        controls.update();
        if (mainCharacter) {
            mainCharacter.updateMixer(mixerUpdateDelta, keysPressed);
            checkProximity();
        }
        otherUsers.forEach((otherUser) => {
            // console.log("UPDATING OTHER USER MIXER: ",otherUser.userId);

            otherUser.updateMixerOnly(mixerUpdateDelta);
        })
        if (isFloorLoaded) {
            world.step(1 / 60);
        }
        // cannonDebugger.update();

        // if (outlineMesh && model) {
        //     model.traverse(function (object: any) {
        //         if (object instanceof THREE.Mesh && outlineMesh) {
        //             // console.log("COPIED")
        //             outlineMesh.position.copy(object.position);
        //             outlineMesh.rotation.copy(object.rotation);
        //             outlineMesh.scale.copy(object.scale);
        //         }
        //     });
        // }
        renderer.render(scene, camera);

    }
    renderer.setAnimationLoop(animate);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Add this line
    // Camera position: Elevated and at an angle
    camera.position.set(4, 4, 4); // Move camera to (X=3, Y=3, Z=3)


    // Make the camera look at the center of the scene
    camera.lookAt(0, 0, 0);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.update();

    // const characterBodyRef = useRef(null);
    // const characterRef = useRef(null);


    function onWindowResize() {
        if (camera && renderer) {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();

            renderer.setSize(window.innerWidth, window.innerHeight);
        }

    }


    function checkProximity() {
        // console.log("CHECKING PROXIMITY");
        
        const updatedAudioTransfers = new Set(availableAudioTransfersRef.current); // Use ref for latest state
        Object.keys(otherUserMappings).forEach((userId) => {
            const otherPosition = { x: otherUserMappings[userId].model.position.x, z: otherUserMappings[userId].model.position.z };
            const mainPosition = mainCharacter.model.position;

            const distance = Math.sqrt(
                Math.pow(otherPosition.x - mainPosition.x, 2) +
                Math.pow(otherPosition.z - mainPosition.z, 2)
            );

            if (distance <= 5) {
                if (userId) {
                    updatedAudioTransfers.add(userId);
                }
            }
            else {
                updatedAudioTransfers.delete(userId);
            }
        });

        if (availableAudioTransfersRef.current.size !== updatedAudioTransfers.size) {
            // console.log("Setting available audio transfers");
            // console.log("UPDATE PROXIMITY");
            // Update ref
            availableAudioTransfersRef.current = updatedAudioTransfers;

            // Trigger state update for rendering if needed
            setAvailableAudioTransfers(Array.from(updatedAudioTransfers));
        }
    }

    async function loadProfile() {
        await instance.initialize();
        const firstResponse = await instance.handleRedirectPromise();
        console.log(firstResponse);

        if (!isAuthenticated) {
            navigate("/")
        }
        else {
            setVisible(true);
            console.log("LOADING PROFILE");

            setLoadingText("Loading Profile");
            // await sleep(10000);
            var response = await instance.acquireTokenSilent({
                ...loginRequest,
                account: accounts[0],
            })
            const headers = new Headers();
            headers.append("Authorization", `Bearer ${response.accessToken}`)
            var profileResponse = await fetch(graphConfig.graphMeEndpoint, { method: "GET", headers: headers })
            if (!profileResponse.ok) {
                throw new Error(`Error fetching profile: ${profileResponse.statusText}`);
            }
            var profileData = await profileResponse.json();
            console.log(profileData);

            setUserData(profileData);
            console.log(profileData.surname);

            setVisible(true);
            setLoadingText("Loading Canvas");
            setupCanvas();
            loadEnvironment()
            loadCharacter().then(() => {
                
                setVisible(false);
                loadCharacterControlListeners();
                loadCanvasVisualControls();
                loadOtherUsers();
                socket.emit('userReady', { userName: profileData.surname });
            });
        }


    }
    useEffect(() => {
        loadProfile();


        // console.log("REMOTE AUDIO REF >>>>>>>>>>>>>>>>>", remoteAudioRef);


        // setTimeout(() => {
        //     const event1 = new KeyboardEvent("keydown", { key: 'w' });
        //     console.log("DISPATCHING EVENT >>>>>>>>>>>>>>");
        //     render.current = renderer.domElement;
        //     console.log(renderer.domElement.dispatchEvent(event1));

        //     renderer.domElement.dispatchEvent(event1);
        //     console.log("DISPATCHING EVENT 1 >>>>>>>>>>>>>>");
        // }, 5000)
        window.addEventListener('resize', onWindowResize, false);
        window.addEventListener("DOMContentLoaded", (event) => {
            console.log("LOADING DONE");

            setVisible(false);
        }, false)
        audioChatInstanceRef.current = new AudioChat({
            signalingServerUrl: "http://localhost:3001",
            stunServer: "stun:stun.l.google.com:19302",
        }, document.getElementById("remote-audio") as HTMLAudioElement);
        // PhysicsLoader('/src/characters/ammo/moz', () => loadPhysics())
    }, []);

    const setupCanvas = () => {

        setLoadingText("Loading Canvas");
        document.body.style.margin = "0"
        document.getElementById("home")?.appendChild(renderer.domElement);

    }

    const loadEnvironment = async () => {
        setLoadingText("Loading Environment");
        const loader = new GLTFLoader();
        const ambientLight = new THREE.AmbientLight(0xffffff, 1); // Color, Intensity
        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(-60, 80, -10);
        dirLight.castShadow = true;
        dirLight.shadow.camera.top = 50;
        dirLight.shadow.camera.bottom = -50;
        dirLight.shadow.camera.left = -50;
        dirLight.shadow.camera.right = 50;
        dirLight.shadow.camera.near = 0.1;
        dirLight.shadow.camera.far = 200;
        dirLight.shadow.mapSize.width = 4096;
        dirLight.shadow.mapSize.height = 4096;
        var gltf = await loader.loadAsync('/models/bake_n_7.glb')
        // console.log(gltf);
        const model: THREE.Group = gltf.scene;
        console.log(model);
        model.position.set(0, 0, 0);
        model.traverse(function (object: any) {
            setLoadingText("Loading Physics");
            if (object.type == "Object3D") {
                const mass = 0; // You can adjust the mass of the body
                const boxSize = new CANNON.Vec3(2, 1, 1);
                let shape = new CANNON.Box(boxSize);
                const position = new CANNON.Vec3(object.position.x, Number(object.position.y) + 0.5, object.position.z);
                const body = new CANNON.Body({
                    mass: mass,
                    position: position
                });

                // Add the shape to the body
                body.addShape(shape);
                world.addBody(body);
            }
            else if (object.name === "Circle") {
                const shape = new CANNON.Plane();

                // Create a non-bouncy material
                const floorMaterial = new CANNON.Material("floorMaterial");
                floorMaterial.friction = 0.9; // High friction for better grip
                // floorMaterial.restitution = 0.0; // No bounciness

                // Create a static body for the floor
                const body = new CANNON.Body({
                    mass: 0, // Static body
                    material: floorMaterial,
                    position: new CANNON.Vec3(0, 0, 0), // Adjust position to match your scene
                });

                // Add the shape to the body
                body.addShape(shape);

                // Position the floor
                body.position.set(0, 0, 0); // Adjust to match your floor's position
                body.quaternion.setFromEuler(-Math.PI / 2, 0, 0); // Align the plane to be horizontal

                // Add the floor body to the world
                world.addBody(body);
            }
            else if (object.name.includes("Cloth")) {
                object.material.map.rotation = Math.PI / 2;
                object.material.emissive = new THREE.Color(0xffffff);
                object.material.color.set(0xffffff);
                object.material.emissiveIntensity = 0.01
            }

        })
        // model.scale.set(0.01, 0.01, 0.01);
        scene.add(model);
        scene.add(ambientLight);
        scene.add(dirLight);
        const lightHelper = new THREE.DirectionalLightHelper(dirLight, 10); // 5 is the size of the helper
        scene.add(lightHelper);
        isFloorLoaded = true;

    }

    const loadCharacter = async () => {
        setLoadingText("Loading Character");
        const loader = new GLTFLoader();


        const geometry = new THREE.PlaneGeometry(10, 10);
        const material = new THREE.MeshStandardMaterial({ color: 'rgb(255, 255, 255)', side: THREE.DoubleSide });
        const plane = new THREE.Mesh(geometry, material);
        plane.receiveShadow = true;
        plane.rotation.x = -Math.PI / 2;
        // plane.rotateX(THREE.MathUtils.degToRad(90));
        // scene.add(plane);
        var gltf = await loader.loadAsync('/models/main_character.glb')
        // console.log(gltf);
        characterModel = gltf.scene;
        characterModel.position.set(0, 0, 0);
        // characterModel.scale.set(0.01, 0.01, 0.01);
        scene.add(characterModel);
        currentUserIds.add(socket.id);
        const size = 1
        // const halfExtents = new CANNON.Vec3(size, size, size)
        // const characterShape = new CANNON.Box(halfExtents);
        const characterShape = new CANNON.Sphere(size);
        // const characterMaterial = new CANNON.Material("characterMaterial");
        // characterMaterial.restitution = 0.5; // No bounciness
        let characterBody = new CANNON.Body({
            mass: 70, // Character's mass
            position: new CANNON.Vec3(0, 1, 0), // Initial position
            // material: characterMaterial,
            // type: CANNON.Body.KINEMATIC,
        });
        // characterBody.linearDamping = 1;
        // characterBody.angularDamping = 1;
        // characterBody.collisionResponse = false;
        // characterBody.angularFactor.set(0, 1, 0); // Lock rotation on X and Z axes
        characterBody.addShape(characterShape);
        // characterBody.linearDamping = 0;
        // characterBody.angularDamping = 0;
        // characterBodyRef.current = characterBody;
        const mixer = new THREE.AnimationMixer(characterModel);
        var animations: THREE.AnimationClip[] = gltf.animations

        characterModel.traverse(function (object: any) {
            // console.log(object.type=="Object3D")
            // if (object.isMesh) {
            // console.log(object)
            object.castShadow = true;
            if (object instanceof THREE.Mesh) {
                // console.log("DETECTED")

                // // Create the outline geometry and material
                // const outlineMaterial = new THREE.MeshBasicMaterial({
                //     color: 0xff0000, // Red color for the outline
                //     side: THREE.BackSide, // Render the outline on the back side of the characterModel
                //     opacity: 0.7,
                //     transparent: true,
                // });

                // // Create an outline mesh for the object
                // outlineMesh = new THREE.Mesh(object.geometry, outlineMaterial);
                // // outlineMesh.scale.set(1.05, 1.05, 1.05); // Slightly scale the outline to make it visible around the model
                // model.add(outlineMesh); // Add the outline mesh to the model
            }
            // }
        });
        // console.log(">>>>>>>>>>>>>>>>>>>")

        // if (animations && animations[0]) {
        //     const action = mixer.clipAction(animations[0]);
        //     // action.time=animations[15].duration
        //     // action.repetitions=10
        //     // console.log(action);

        //     action.loop = THREE.LoopRepeat;
        //     action.play();
        //     // mixer.update(mixerUpdateDelta)

        // }
        // var action  = mixer.clipAction(animations[15]);
        // action.loop=THREE.LoopRepeat ;
        // action.play();
        console.log(animations);
        world.addBody(characterBody);
        // const force = new CANNON.Vec3(10, 0, 0); // Apply force to move to the right
        // characterBody.applyForce(force, characterBody.position);
        // characterBody.wakeUp();
        // characterBody.velocity.z = 100
        // characterBody.velocity.set(0, -10, 0); // Test movement in z-direction only
        // scene_3d.physics.add.existing(gltf.scene)
        mainCharacter = new Character(userData?.surname, socket.id, characterModel, new Position(), controls, mixer, new THREE.Vector3(), camera, characterBody, animations, 'Idle');
        mainCharacter.setUpSocketListeners();
        // socket.emit('userReady',{userName: userData.surname});

        const axesHelper = new THREE.AxesHelper(5);
        scene.add(axesHelper);



    }

    const loadCharacterControlListeners = async () => {
        setLoadingText("Loading Controls");
        console.log("loading controls");
        
        document.addEventListener("keyup", (event) => {
            // this.character.velocity = new CANNON.Vec3(0, 0, 0);
            keysPressed[event.key] = false;
            document.getElementsByClassName(`${event.key.toUpperCase()}-button`)[0]?.classList.remove("active");
        });
        document.addEventListener("keydown", (event) => {
            // this.character.velocity = new CANNON.Vec3(0, 0, 0);
            if (document.activeElement && (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA")) {
                console.log("Cursor is inside an input or textarea.");
                return; // Exit early to avoid interfering with input handling
            }
            else if (allowedKeys.has(event.key)) {
                document.getElementsByClassName(`${event.key.toUpperCase()}-button`)[0]?.classList.add("active");
                keysPressed[event.key] = true;
                // mainCharacter.character.velocity.y = 2;

            }
        });
    }

    const loadCanvasVisualControls = () => {
        // const canvas = renderer.domElement;
        // console.log(canvas);
        // const homeElement = document.getElementById("home");



    }


    const loadOtherUsers = () => {
        console.log("LOADING OTHER USERS");
        console.log(otherUserMappings);
        
        const loader = new GLTFLoader();
        socket.on('updateUsersPosition', async (users: any) => {
            console.log(" users >>>>>>>>>>>>>>>>");



            // console.log(users);
            // console.log(">>>>>>>>>>>>>>>>>>>>>");
            // console.log(Object.keys(users));

            for (var ind in Object.keys(users)) {
                var userId = Object.keys(users)[ind];
                var userName = users[userId].userName
                // console.log(userId);
                // console.log("THIS IS THE USER ID");
                // console.log(mainCharacter.userId);
                // console.log("THIS IS THE MAIN CHARACTER USER ID");
                // console.log(userId != mainCharacter.userId);

                if (mainCharacter?.userId && userId != mainCharacter.userId) {
                    if (!currentUserIds.has(userId)) {
                        currentUserIds.add(userId);
                        var gltf = await loader.loadAsync('/models/main_character.glb')
                        var otherCharacterModel: THREE.Group = gltf.scene;
                        const mixer = new THREE.AnimationMixer(otherCharacterModel);
                        const action = mixer.clipAction(gltf.animations[0]);
                        action.play();

                        otherUserMappings[userId] = { model: otherCharacterModel, userName: userName }
                        // console.log(users);
                        // console.log(userId);
                        // console.log("::::::::::::::::::::::::::::::::::::::::::::::::");
                        // console.log(users[userId].x);
                        // console.log(users[userId].z);
                        // console.log("::::::::::::::::::::::::::::::::::::::::::::::::");
                        // console.log(gltf.animations);

                        otherCharacterModel.position.set(users[userId].x, 0, users[userId].z);
                        scene.add(otherCharacterModel);
                        const size = 1;
                        const characterShape = new CANNON.Sphere(size);
                        let otherCharacterBody = new CANNON.Body({
                            mass: 70, // Character's mass
                            position: new CANNON.Vec3(users[userId].x, 1, users[userId].z), // Initial position
                            // material: characterMaterial,
                            // type: CANNON.Body.KINEMATIC,
                        });
                        // otherCharacterBody.angularDamping = 1;
                        // otherCharacterBody.linearDamping= 1;
                        // otherCharacterBody.collisionResponse=false;
                        var otherCharacterClass = new Character(userName, userId, otherCharacterModel, new Position(), controls, mixer, new THREE.Vector3(), camera, otherCharacterBody, gltf.animations, 'Idle');
                        otherUsers.push(otherCharacterClass);
                        otherUserPhysicsMappings[userId] = otherCharacterBody;
                        otherCharacterBody.addShape(characterShape);
                        // const mixer = new THREE.AnimationMixer(otherCharacterModel);
                        // var animations: THREE.AnimationClip[] = gltf.animations;
                        world.addBody(otherCharacterBody);


                    }
                    else {
                        otherUserMappings[userId].model.position.x = users[userId].x;
                        otherUserMappings[userId].model.position.z = users[userId].z;
                        // otherUserMappings[userId].position.set(users[userId].x, 0, users[userId].z);
                        otherUserPhysicsMappings[userId].position.x = users[userId].x;
                        otherUserPhysicsMappings[userId].position.z = users[userId].z;
                        // set(users[userId].x, 1, users[userId].z);
                    }
                }
            }
            console.log("FINAL UPDATED USERS");
            console.log(otherUserMappings);
        });
        socket.on('deteleUser', (user) => {
            console.log('user disconnected ', user);
            console.log(otherUserPhysicsMappings[user]);
            scene.remove(otherUserMappings[user].model);
            delete otherUserMappings[user];
            world.removeBody(otherUserPhysicsMappings[user]);
            delete otherUserPhysicsMappings[user];
        });
    }
    const StartAudioCall = (userId: string) => {
        console.log("Starting audio call with ", userId);
        console.log("AUDIO CHAT INSTANCE >>>>>>>>>>>>>>>>>", audioChatInstanceRef);

        if (audioChatInstanceRef.current) {
            audioChatInstanceRef.current.startCall(userId);

        }
    }
    const DisconnectAudioCall = () => {
        if (audioChatInstanceRef.current) {
            audioChatInstanceRef.current.disconnect("user");
        }
    }


    return (
        <>
            <Loader loadingMessage={loadingText} visible={visible} />
            <div id="home" style={{ margin: 0 }} />
            {/* {createPortal(, document.body)} */}
            {/* <VisualControls keysPressed={keysPressed} /> */}
            <div className="no-select" style={{ "fontFamily": "Open Sans", position: "absolute", bottom: "10px", right: "10px", backgroundColor: "transparent", color: "grey" }}>
                <div style={{ "display": "flex", "flexDirection": "column", "alignItems": "center" }}>
                    <div id="buttonRow">
                        <div className="W-button" id="eachButton" >W</div>
                    </div>
                    <div style={{ "display": "flex", "flexDirection": "row" }}>
                        <div className="A-button" id="eachButton" >A</div>
                        <div className="S-button" id="eachButton" >S</div>
                        <div className="D-button" id="eachButton" >D</div>
                    </div>
                </div>
            </div>

            <div id="topRightNavMenu">
                {availableAudioTransfers.length > 0 && <div id="audioTransferRequest">
                    {availableAudioTransfers.map((userId) => {
                        console.log(otherUserMappings);
                        console.log("RENDERING AVAILABLE USERS");
                        
                        if (userId in otherUserMappings) {
                            return <div id="talkToButton" key={userId}>{otherUserMappings[userId].userName}
                                <div onClick={() => StartAudioCall(userId)}>
                                    <svg width="40" height="40" viewBox="0 0 58 58" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <g filter="url(#filter0_b_395_15323)">
                                            <circle cx="29" cy="29" r="29" fill="#D4D4D4" fill-opacity="0.2" />
                                        </g>
                                        <path d="M24.0192 18.1396L24.5888 22.7317C24.6685 23.374 24.4494 24.0174 23.9952 24.4751L22.45 26.0321C21.845 26.6417 21.7969 27.6141 22.3387 28.2813L23.7901 30.0689C24.6794 31.1641 25.7255 32.1198 26.8939 32.9048L28.9511 34.2868C29.6297 34.7426 30.536 34.6362 31.0924 34.0355L32.5736 32.4364C32.8653 32.1214 33.2967 31.9787 33.7169 32.0581L38.6848 32.9967C39.2756 33.1083 39.7037 33.6281 39.7037 34.2337V38.4903C39.7037 39.1628 39.1832 39.7201 38.5161 39.7034C30.9129 39.5134 17.6953 34.433 17.0381 18.3022C17.0098 17.6076 17.5718 17.0371 18.2617 17.0371H22.7798C23.4097 17.0371 23.941 17.5098 24.0192 18.1396Z" fill="white" />
                                        <defs>
                                            <filter id="filter0_b_395_15323" x="-27" y="-27" width="112" height="112" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
                                                <feFlood flood-opacity="0" result="BackgroundImageFix" />
                                                <feGaussianBlur in="BackgroundImageFix" stdDeviation="13.5" />
                                                <feComposite in2="SourceAlpha" operator="in" result="effect1_backgroundBlur_395_15323" />
                                                <feBlend mode="normal" in="SourceGraphic" in2="effect1_backgroundBlur_395_15323" result="shape" />
                                            </filter>
                                        </defs>
                                    </svg>
                                </div>
                                <div>
                                    <svg width="40" height="40" viewBox="0 0 58 58" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <g filter="url(#filter0_b_300_13682)">
                                            <circle cx="29" cy="29" r="29" fill="#D4D4D4" fill-opacity="0.2" />
                                        </g>
                                        <g clip-path="url(#clip0_300_13682)">
                                            <path d="M41.7502 22.1293C41.3197 21.9355 40.8418 21.8725 40.3759 21.948C39.9099 22.0236 39.4765 22.2344 39.1293 22.5543L36.0835 25.3877V23.3335C36.0835 22.2063 35.6357 21.1253 34.8387 20.3283C34.0417 19.5313 32.9607 19.0835 31.8335 19.0835H19.0835C17.9563 19.0835 16.8753 19.5313 16.0783 20.3283C15.2813 21.1253 14.8335 22.2063 14.8335 23.3335V34.6668C14.8335 35.794 15.2813 36.875 16.0783 37.672C16.8753 38.4691 17.9563 38.9168 19.0835 38.9168H31.8335C32.9607 38.9168 34.0417 38.4691 34.8387 37.672C35.6357 36.875 36.0835 35.794 36.0835 34.6668V32.6127L39.1435 35.446C39.594 35.8538 40.1792 36.0808 40.7868 36.0835C41.124 36.0827 41.4572 36.0103 41.7643 35.871C42.1822 35.702 42.5401 35.4122 42.7925 35.0387C43.0448 34.6653 43.1801 34.2251 43.181 33.7743V24.226C43.1789 23.7736 43.0416 23.3322 42.7866 22.9586C42.5316 22.5849 42.1706 22.2961 41.7502 22.1293V22.1293Z" fill="white" />
                                        </g>
                                        <defs>
                                            <filter id="filter0_b_300_13682" x="-4" y="-4" width="66" height="66" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
                                                <feFlood flood-opacity="0" result="BackgroundImageFix" />
                                                <feGaussianBlur in="BackgroundImageFix" stdDeviation="2" />
                                                <feComposite in2="SourceAlpha" operator="in" result="effect1_backgroundBlur_300_13682" />
                                                <feBlend mode="normal" in="SourceGraphic" in2="effect1_backgroundBlur_300_13682" result="shape" />
                                            </filter>
                                            <clipPath id="clip0_300_13682">
                                                <rect width="34" height="34" fill="white" transform="translate(12 12)" />
                                            </clipPath>
                                        </defs>
                                    </svg>
                                </div>
                            </div>
                        }
                        console.log(otherUserMappings);


                    })}
                </div>}
                <div id="hangUp">

                    <button className="btn" id="disconnectCall" onClick={() => DisconnectAudioCall()} hidden={true}>
                        Hang Up &nbsp;
                        <svg width="30" height="30" viewBox="0 0 74 74" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect width="74" height="74" rx="37" fill="#EB5545" />
                            <path d="M36.5 29.8555C29.1348 29.873 22.1035 31.4551 18.5352 35.0234C16.918 36.6406 16.0918 38.5918 16.1621 40.9473C16.2148 42.2656 16.584 43.6016 17.4277 44.4453C18.0078 45.043 18.834 45.377 19.8535 45.2012L26.3398 44.0938C27.2012 43.9355 27.8516 43.6543 28.3086 43.2148C28.8711 42.6875 29.082 41.8438 29.082 40.7012L29.1172 38.9258C29.1172 38.6445 29.2227 38.4336 29.3984 38.2578C29.5566 38.0645 29.8027 37.9766 29.9961 37.9238C31.1211 37.625 33.5293 37.3086 36.5 37.3086C39.4707 37.3086 41.8613 37.5547 43.0039 37.9414C43.1973 37.9941 43.4082 38.0996 43.5664 38.2578C43.7422 38.416 43.8301 38.6094 43.8301 38.873L43.8828 40.7012C43.918 41.8438 44.1465 42.6699 44.6914 43.2148C45.1484 43.6719 45.7988 43.9355 46.6777 44.0938L52.9707 45.166C54.043 45.3594 54.9219 44.9902 55.5898 44.3398C56.3633 43.5488 56.8203 42.3184 56.8379 40.877C56.873 38.5215 55.9766 36.5879 54.3945 35.0234C50.8262 31.4551 43.8652 29.8379 36.5 29.8555Z" fill="white" />
                        </svg>

                    </button>
                </div>
            </div>
            <audio id="remote-audio" autoPlay></audio>
            <TextChat userName={userData.surname} />
            <SignOut />
        </>);
}

export default MainCharacter;