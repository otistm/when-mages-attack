Slime

\<\!DOCTYPE html\>  
\<html lang="en"\>  
\<head\>  
    \<meta charset="UTF-8"\>  
    \<meta name="viewport" content="width=device-width, initial-scale=1.0"\>  
    \<title\>Low Poly Sentient Slime\</title\>  
    \<style\>  
        body { margin: 0; overflow: hidden; background-color: \#2b2b2b; font-family: sans-serif; }  
        \#info {  
            position: absolute;  
            top: 20px;  
            width: 100%;  
            text-align: center;  
            color: \#eee;  
            pointer-events: none;  
            font-weight: bold;  
            font-size: 1.2rem;  
            text-transform: uppercase;  
            letter-spacing: 2px;  
            text-shadow: 0px 2px 4px rgba(0,0,0,0.8);  
        }  
        \#sub-info {  
            font-size: 0.8rem;  
            opacity: 0.8;  
            margin-top: 5px;  
            text-transform: none;  
        }  
    \</style\>  
\</head\>  
\<body\>  
    \<div id="info"\>  
        Sentient Slime  
        \<div id="sub-info"\>Click anywhere to guide him\</div\>  
    \</div\>  
      
    \<script type="importmap"\>  
        {  
            "imports": {  
                "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",  
                "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"  
            }  
        }  
    \</script\>

    \<script type="module"\>  
        import \* as THREE from 'three';  
        import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

        // \--- Scene Setup \---  
        const scene \= new THREE.Scene();  
        scene.background \= new THREE.Color(0x2b2b2b);  
        scene.fog \= new THREE.Fog(0x2b2b2b, 10, 40);

        const camera \= new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);  
        camera.position.set(0, 10, 15);

        const renderer \= new THREE.WebGLRenderer({ antialias: true });  
        renderer.setSize(window.innerWidth, window.innerHeight);  
        renderer.shadowMap.enabled \= true;  
        renderer.shadowMap.type \= THREE.PCFSoftShadowMap;  
        document.body.appendChild(renderer.domElement);

        const controls \= new OrbitControls(camera, renderer.domElement);  
        controls.enableDamping \= true;  
        controls.maxPolarAngle \= Math.PI / 2 \- 0.1; // Don't go below floor  
        controls.minDistance \= 5;  
        controls.maxDistance \= 30;

        // \--- Lighting \---  
        const ambientLight \= new THREE.AmbientLight(0xffffff, 0.4);  
        scene.add(ambientLight);

        const dirLight \= new THREE.DirectionalLight(0xffffff, 1);  
        dirLight.position.set(5, 15, 10);  
        dirLight.castShadow \= true;  
        dirLight.shadow.mapSize.width \= 1024;  
        dirLight.shadow.mapSize.height \= 1024;  
        dirLight.shadow.camera.near \= 0.1;  
        dirLight.shadow.camera.far \= 50;  
        dirLight.shadow.camera.left \= \-15;  
        dirLight.shadow.camera.right \= 15;  
        dirLight.shadow.camera.top \= 15;  
        dirLight.shadow.camera.bottom \= \-15;  
        scene.add(dirLight);

        // \--- Materials \---  
        const slimeMaterial \= new THREE.MeshPhysicalMaterial({   
            color: 0x76ff03,   
            roughness: 0.2,   
            metalness: 0.1,  
            transmission: 0, // Opaque looks better for low poly style usually  
            opacity: 1,  
            flatShading: true,  
            emissive: 0x2e7d32,  
            emissiveIntensity: 0.2  
        });

        const eyeWhiteMat \= new THREE.MeshBasicMaterial({ color: 0xffffff });  
        const eyePupilMat \= new THREE.MeshBasicMaterial({ color: 0x000000 });

        const floorMaterial \= new THREE.MeshStandardMaterial({   
            color: 0x424242,   
            roughness: 0.8,  
            metalness: 0.2  
        });

        // \--- The Slime Character \---  
        const slimeGroup \= new THREE.Group();  
        scene.add(slimeGroup);

        // Body (Icosahedron for low poly look)  
        // We pivot the mesh so y=0 is the bottom, making scaling easier  
        const geometry \= new THREE.IcosahedronGeometry(1, 1);  
        geometry.translate(0, 1, 0); // Shift center up so scale happens from floor  
        const bodyMesh \= new THREE.Mesh(geometry, slimeMaterial);  
        bodyMesh.castShadow \= true;  
        slimeGroup.add(bodyMesh);

        // Eyes Container (Attached to body so they move/squash with it)  
        const eyesGroup \= new THREE.Group();  
        eyesGroup.position.set(0, 1.2, 0.8); // Front of face  
        bodyMesh.add(eyesGroup); // Add to bodyMesh to inherit transforms

        function createEye(x) {  
            const eye \= new THREE.Group();  
            eye.position.x \= x;  
              
            const white \= new THREE.Mesh(new THREE.IcosahedronGeometry(0.25, 0), eyeWhiteMat);  
            white.rotation.z \= Math.random(); // Random poly rotation  
              
            const pupil \= new THREE.Mesh(new THREE.IcosahedronGeometry(0.1, 0), eyePupilMat);  
            pupil.position.z \= 0.2; // Push out slightly  
              
            eye.add(white);  
            eye.add(pupil);  
            return eye;  
        }

        const leftEye \= createEye(-0.35);  
        const rightEye \= createEye(0.35);  
        eyesGroup.add(leftEye);  
        eyesGroup.add(rightEye);

        // \--- Environment \---  
        const floor \= new THREE.Mesh(new THREE.PlaneGeometry(50, 50), floorMaterial);  
        floor.rotation.x \= \-Math.PI / 2;  
        floor.receiveShadow \= true;  
        scene.add(floor);

        const grid \= new THREE.GridHelper(50, 25, 0x000000, 0x000000);  
        grid.material.opacity \= 0.2;  
        grid.material.transparent \= true;  
        scene.add(grid);

        // \--- Trail System \---  
        const trails \= \[\];  
        const trailGeo \= new THREE.CircleGeometry(0.5, 6);  
        trailGeo.rotateX(-Math.PI / 2);  
        const trailMat \= new THREE.MeshBasicMaterial({   
            color: 0x76ff03,   
            transparent: true,   
            opacity: 0.6,  
            depthWrite: false   
        });

        function spawnTrail() {  
            const trail \= new THREE.Mesh(trailGeo, trailMat.clone());  
            trail.position.copy(slimeGroup.position);  
            trail.position.y \= 0.02; // Just above floor  
            trail.rotation.y \= Math.random() \* Math.PI;  
            trail.scale.setScalar(Math.random() \* 0.5 \+ 0.5);  
            scene.add(trail);  
            trails.push({ mesh: trail, life: 1.0 });  
        }

        // \--- Logic & Animation \---  
          
        let state \= 'thinking'; // thinking, jumping, landing  
        let targetPos \= new THREE.Vector3(0, 0, 0);  
        let jumpProgress \= 0;  
        let lastPos \= new THREE.Vector3();  
        let blinkTimer \= 0;

        // Interaction (Click to Move)  
        const raycaster \= new THREE.Raycaster();  
        const mouse \= new THREE.Vector2();

        window.addEventListener('mousedown', (event) \=\> {  
            mouse.x \= (event.clientX / window.innerWidth) \* 2 \- 1;  
            mouse.y \= \-(event.clientY / window.innerHeight) \* 2 \+ 1;  
            raycaster.setFromCamera(mouse, camera);  
            const intersects \= raycaster.intersectObject(floor);  
            if (intersects.length \> 0\) {  
                targetPos.copy(intersects\[0\].point);  
                state \= 'aligning'; // Look at new target immediately  
            }  
        });

        // AI Logic  
        function pickRandomTarget() {  
            const r \= 10;  
            const x \= (Math.random() \- 0.5) \* 2 \* r;  
            const z \= (Math.random() \- 0.5) \* 2 \* r;  
            targetPos.set(x, 0, z);  
        }

        const clock \= new THREE.Clock();

        function animateSlime(delta) {  
            // 1\. Blink Logic  
            blinkTimer \-= delta;  
            if (blinkTimer \<= 0\) {  
                // Blink closed  
                leftEye.scale.y \= 0.1;  
                rightEye.scale.y \= 0.1;  
                if (blinkTimer \<= \-0.15) {  
                    // Open eyes  
                    leftEye.scale.y \= 1;  
                    rightEye.scale.y \= 1;  
                    blinkTimer \= Math.random() \* 3 \+ 2; // Next blink in 2-5s  
                }  
            }

            // 2\. Movement State Machine  
            const speed \= 2.0;

            if (state \=== 'thinking') {  
                // Idle breathing  
                bodyMesh.scale.y \= 1 \+ Math.sin(clock.getElapsedTime() \* 3\) \* 0.05;  
                bodyMesh.scale.x \= 1 \- Math.sin(clock.getElapsedTime() \* 3\) \* 0.05;  
                bodyMesh.scale.z \= bodyMesh.scale.x;

                if (Math.random() \< 0.02) {  
                    pickRandomTarget();  
                    state \= 'aligning';  
                }  
            }  
            else if (state \=== 'aligning') {  
                // Rotate towards target  
                const direction \= new THREE.Vector3().subVectors(targetPos, slimeGroup.position);  
                direction.y \= 0;  
                  
                if (direction.lengthSq() \> 0.1) {  
                    // Smooth turn  
                    const targetRot \= Math.atan2(direction.x, direction.z);  
                    let rotDiff \= targetRot \- slimeGroup.rotation.y;  
                      
                    // Normalize angle  
                    while (rotDiff \> Math.PI) rotDiff \-= Math.PI \* 2;  
                    while (rotDiff \< \-Math.PI) rotDiff \+= Math.PI \* 2;

                    slimeGroup.rotation.y \+= rotDiff \* delta \* 5;

                    if (Math.abs(rotDiff) \< 0.1) {  
                        state \= 'jumping';  
                        jumpProgress \= 0;  
                        lastPos.copy(slimeGroup.position);  
                    }  
                } else {  
                    state \= 'thinking'; // Already there  
                }  
            }  
            else if (state \=== 'jumping') {  
                jumpProgress \+= delta \* speed;

                // Move X/Z Linear  
                const distTotal \= lastPos.distanceTo(targetPos);  
                // Clamp jump size (slime can only jump \~3 units at a time)  
                const maxJump \= 3.0;  
                  
                let currentTarget \= targetPos.clone();  
                if (distTotal \> maxJump) {  
                    const dir \= new THREE.Vector3().subVectors(targetPos, lastPos).normalize();  
                    currentTarget \= lastPos.clone().add(dir.multiplyScalar(maxJump));  
                }

                if (jumpProgress \>= 1\) {  
                    // Landed  
                    slimeGroup.position.copy(currentTarget);  
                    state \= 'landing';  
                    jumpProgress \= 0;  
                    spawnTrail(); // Leave slime  
                } else {  
                    // In Air Interp  
                    slimeGroup.position.lerpVectors(lastPos, currentTarget, jumpProgress);  
                      
                    // Arc (Parabola)  
                    const height \= Math.sin(jumpProgress \* Math.PI) \* 1.5;  
                    // Physics-ish approximation  
                    slimeGroup.position.y \= height;

                    // Stretch while jumping  
                    // Scale Y goes UP, Scale X/Z go DOWN  
                    const stretch \= 1 \+ height \* 0.5;  
                    bodyMesh.scale.set(1/stretch, stretch, 1/stretch);  
                }  
            }  
            else if (state \=== 'landing') {  
                jumpProgress \+= delta \* 5; // Fast recovery  
                  
                // Squash effect (damped sin wave)  
                const squash \= Math.sin(jumpProgress \* Math.PI) \* 0.4;  
                  
                // Squash: Y goes DOWN, X/Z go UP  
                const scaleY \= 1 \- squash;  
                const scaleXZ \= 1 \+ squash \* 0.5;  
                  
                bodyMesh.scale.set(scaleXZ, scaleY, scaleXZ);

                if (jumpProgress \>= 1\) {  
                    // Check if we reached final destination or just a waypoint  
                    if (slimeGroup.position.distanceTo(targetPos) \< 0.1) {  
                        state \= 'thinking';  
                    } else {  
                        // Start next hop  
                        state \= 'aligning';   
                    }  
                }  
            }  
        }

        function updateTrails(delta) {  
            for (let i \= trails.length \- 1; i \>= 0; i--) {  
                const t \= trails\[i\];  
                t.life \-= delta \* 0.5; // Fade over 2 seconds  
                t.mesh.material.opacity \= t.life \* 0.6;  
                t.mesh.scale.setScalar(1 \+ (1-t.life)); // Spread out slightly

                if (t.life \<= 0\) {  
                    scene.remove(t.mesh);  
                    trails.splice(i, 1);  
                }  
            }  
        }

        // \--- Render Loop \---  
        function animate() {  
            requestAnimationFrame(animate);  
            const delta \= clock.getDelta();

            animateSlime(delta);  
            updateTrails(delta);  
            controls.update();  
            renderer.render(scene, camera);  
        }

        animate();

        // \--- Resize \---  
        window.addEventListener('resize', () \=\> {  
            camera.aspect \= window.innerWidth / window.innerHeight;  
            camera.updateProjectionMatrix();  
            renderer.setSize(window.innerWidth, window.innerHeight);  
        });

    \</script\>  
\</body\>  
\</html\>  
