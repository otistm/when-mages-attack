Cactus

\<\!DOCTYPE html\>  
\<html lang="en"\>  
\<head\>  
    \<meta charset="UTF-8"\>  
    \<meta name="viewport" content="width=device-width, initial-scale=1.0"\>  
    \<title\>Exploding Puffer Cactus\</title\>  
    \<style\>  
        body { margin: 0; overflow: hidden; background-color: \#FDF6E3; font-family: 'Courier New', Courier, monospace; }  
        \#info {  
            position: absolute;  
            top: 20px;  
            width: 100%;  
            text-align: center;  
            color: \#5D4037;  
            pointer-events: none;  
            font-weight: bold;  
            font-size: 1.5rem;  
            text-transform: uppercase;  
            letter-spacing: 2px;  
        }  
        \#status {  
            font-size: 1rem;  
            margin-top: 5px;  
            color: \#e57373;  
        }  
    \</style\>  
\</head\>  
\<body\>  
    \<div id="info"\>  
        Puffer Cactus  
        \<div id="status"\>Click to Agitate\</div\>  
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
        scene.background \= new THREE.Color(0xFDF6E3); // Desert sand color  
        scene.fog \= new THREE.Fog(0xFDF6E3, 10, 50);

        const camera \= new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);  
        camera.position.set(0, 5, 12);

        const renderer \= new THREE.WebGLRenderer({ antialias: true });  
        renderer.setSize(window.innerWidth, window.innerHeight);  
        renderer.shadowMap.enabled \= true;  
        renderer.shadowMap.type \= THREE.PCFSoftShadowMap;  
        document.body.appendChild(renderer.domElement);

        const controls \= new OrbitControls(camera, renderer.domElement);  
        controls.enableDamping \= true;  
        controls.minDistance \= 5;  
        controls.maxDistance \= 20;  
        controls.maxPolarAngle \= Math.PI / 2 \- 0.1; // Don't go below ground

        // \--- Lighting \---  
        const ambientLight \= new THREE.AmbientLight(0xffffff, 0.5);  
        scene.add(ambientLight);

        const sunLight \= new THREE.DirectionalLight(0xffffff, 1.2);  
        sunLight.position.set(5, 10, 5);  
        sunLight.castShadow \= true;  
        sunLight.shadow.mapSize.width \= 2048;  
        sunLight.shadow.mapSize.height \= 2048;  
        scene.add(sunLight);

        // \--- Materials \---  
        const potMat \= new THREE.MeshStandardMaterial({ color: 0x8D6E63, roughness: 0.8 }); // Terracotta  
        const dirtMat \= new THREE.MeshStandardMaterial({ color: 0x3E2723, roughness: 1.0 });  
        const cactusMat \= new THREE.MeshStandardMaterial({ color: 0x66BB6A, roughness: 0.4, flatShading: true });  
        const spikeMat \= new THREE.MeshStandardMaterial({ color: 0xFFF9C4, roughness: 0.2 }); // Light yellow  
        const floorMat \= new THREE.MeshStandardMaterial({ color: 0xE0C097, roughness: 0.9 });

        // \--- Geometry Builders \---  
          
        // 1\. Pot & Ground  
        const group \= new THREE.Group();  
        scene.add(group);

        const potGeo \= new THREE.CylinderGeometry(1.2, 1.0, 1.5, 8);  
        const pot \= new THREE.Mesh(potGeo, potMat);  
        pot.position.y \= 0.75;  
        pot.castShadow \= true;  
        pot.receiveShadow \= true;  
        group.add(pot);

        const dirt \= new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.0, 0.1, 8), dirtMat);  
        dirt.position.y \= 1.4;  
        group.add(dirt);

        const floor \= new THREE.Mesh(new THREE.PlaneGeometry(50, 50), floorMat);  
        floor.rotation.x \= \-Math.PI / 2;  
        floor.receiveShadow \= true;  
        group.add(floor);

        // 2\. The Cactus  
        const cactusGroup \= new THREE.Group();  
        cactusGroup.position.y \= 1.5; // Sit on dirt  
        group.add(cactusGroup);

        // Main Body (Icosahedron for low poly look)  
        const bodyGeo \= new THREE.IcosahedronGeometry(1.0, 1);  
        const body \= new THREE.Mesh(bodyGeo, cactusMat);  
        body.castShadow \= true;  
        cactusGroup.add(body);

        // 3\. The Spikes (Static/Attached)  
        // We place a spike at every vertex of the cactus body  
        const attachedSpikes \= \[\];  
        const spikeGeo \= new THREE.ConeGeometry(0.05, 0.4, 4);  
        spikeGeo.translate(0, 0.2, 0); // Move pivot to base  
        spikeGeo.rotateX(Math.PI / 2); // Point along Z

        const posAttribute \= bodyGeo.attributes.position;  
        const vertex \= new THREE.Vector3();

        for (let i \= 0; i \< posAttribute.count; i++) {  
            vertex.fromBufferAttribute(posAttribute, i);  
              
            // Create a spike  
            const spike \= new THREE.Mesh(spikeGeo, spikeMat);  
            spike.position.copy(vertex);  
            spike.lookAt(0, 0, 0); // Look at center (points inwards)  
            spike.scale.z \= \-1; // Flip to point outwards  
              
            // Randomize size slightly  
            const s \= 0.8 \+ Math.random() \* 0.4;  
            spike.scale.set(s, s, \-s); // Maintain flip

            // Store original position/rotation for recovery  
            spike.userData \= {   
                originalScale: spike.scale.clone(),  
                direction: vertex.clone().normalize()  
            };

            body.add(spike);  
            attachedSpikes.push(spike);  
        }

        // \--- Projectile System \---  
        const projectiles \= \[\];  
          
        function spawnProjectiles() {  
            attachedSpikes.forEach(staticSpike \=\> {  
                // Get world position of the static spike  
                const worldPos \= new THREE.Vector3();  
                staticSpike.getWorldPosition(worldPos);  
                  
                // Direction  
                const dir \= staticSpike.userData.direction.clone();  
                // Apply current body rotation if any (not strictly needed here but good practice)  
                dir.applyQuaternion(cactusGroup.quaternion);

                // Create independent mesh  
                const proj \= new THREE.Mesh(spikeGeo, spikeMat);  
                proj.position.copy(worldPos);  
                  
                // Align orientation matches the static spike  
                // We use lookAt to point away from center of explosion  
                proj.lookAt(cactusGroup.position);  
                proj.scale.z \= \-1; // Flip outward

                scene.add(proj);

                // Velocity \= Direction \* Force \+ Randomness  
                const force \= 10 \+ Math.random() \* 5;  
                const velocity \= dir.multiplyScalar(force);

                projectiles.push({  
                    mesh: proj,  
                    velocity: velocity,  
                    rotVelocity: new THREE.Vector3(Math.random(), Math.random(), Math.random()).multiplyScalar(10),  
                    stuck: false  
                });

                // Hide static spike  
                staticSpike.visible \= false;  
            });  
        }

        // \--- Animation State Machine \---  
        let state \= 'IDLE'; // IDLE, SWELLING, DEFLATING, RECOVERING  
        let swellTimer \= 0;  
          
        // Colors  
        const colorGreen \= new THREE.Color(0x66BB6A);  
        const colorRed \= new THREE.Color(0xE57373);  
        const colorDeflated \= new THREE.Color(0x558B2F); // Darker/Dried

        window.addEventListener('mousedown', () \=\> {  
            if (state \=== 'IDLE') {  
                state \= 'SWELLING';  
                document.getElementById('status').innerText \= "PRESSURE BUILDING...";  
                document.getElementById('status').style.color \= "red";  
            }  
        });

        const clock \= new THREE.Clock();

        function animate() {  
            requestAnimationFrame(animate);  
            const delta \= clock.getDelta();  
            const time \= clock.getElapsedTime();

            // 1\. State Logic  
            if (state \=== 'IDLE') {  
                // Breathing  
                const breath \= 1 \+ Math.sin(time \* 2\) \* 0.02;  
                cactusGroup.scale.setScalar(breath);  
                body.material.color.lerp(colorGreen, 0.1);  
            }  
            else if (state \=== 'SWELLING') {  
                swellTimer \+= delta \* 2;  
                  
                // Grow big  
                const scale \= 1 \+ swellTimer \* 0.5;  
                cactusGroup.scale.setScalar(scale);

                // Shake (Jitter position)  
                const shake \= 0.05 \* swellTimer;  
                cactusGroup.position.x \= (Math.random() \- 0.5) \* shake;  
                cactusGroup.position.z \= (Math.random() \- 0.5) \* shake;

                // Turn Red  
                body.material.color.lerp(colorRed, delta \* 2);

                if (swellTimer \> 1.5) {  
                    // BOOM  
                    state \= 'DEFLATING';  
                    spawnProjectiles();  
                    swellTimer \= 0;  
                    document.getElementById('status').innerText \= "POP\!";  
                }  
            }  
            else if (state \=== 'DEFLATING') {  
                // Rapid shrink  
                const currentScale \= cactusGroup.scale.x;  
                const targetScale \= 0.4; // Raisin size  
                  
                cactusGroup.scale.setScalar(THREE.MathUtils.lerp(currentScale, targetScale, delta \* 10));  
                cactusGroup.position.set(0, 1.5, 0); // Reset jitter

                // Color change to deflated/dark  
                body.material.color.lerp(colorDeflated, delta \* 10);

                if (Math.abs(currentScale \- targetScale) \< 0.05) {  
                    state \= 'RECOVERING';  
                    document.getElementById('status').innerText \= "Regrowing...";  
                    document.getElementById('status').style.color \= "\#66BB6A";  
                }  
            }  
            else if (state \=== 'RECOVERING') {  
                // Slow growth back to 1  
                const currentScale \= cactusGroup.scale.x;  
                cactusGroup.scale.setScalar(THREE.MathUtils.lerp(currentScale, 1.0, delta \* 0.5));  
                body.material.color.lerp(colorGreen, delta \* 0.5);

                // Randomly pop spikes back into visibility  
                let allVisible \= true;  
                attachedSpikes.forEach(spike \=\> {  
                    if (\!spike.visible) {  
                        allVisible \= false;  
                        if (Math.random() \< 0.05) { // 5% chance per frame to regrow  
                            spike.visible \= true;  
                            // Pop effect scale  
                            spike.scale.setScalar(0);  
                        }  
                    } else {  
                        // Animate scale up to original  
                        const target \= spike.userData.originalScale;  
                        spike.scale.lerp(target, delta \* 5);  
                    }  
                });

                if (Math.abs(currentScale \- 1.0) \< 0.01 && allVisible) {  
                    state \= 'IDLE';  
                    document.getElementById('status').innerText \= "Click to Agitate";  
                    document.getElementById('status').style.color \= "\#5D4037";  
                      
                    // Cleanup old projectiles from scene to keep performance up  
                    projectiles.forEach(p \=\> {  
                        // Shrink out  
                        p.mesh.scale.multiplyScalar(0.9);  
                        if(p.mesh.scale.x \< 0.01) scene.remove(p.mesh);  
                    });  
                }  
            }

            // 2\. Projectile Physics  
            for (let i \= projectiles.length \- 1; i \>= 0; i--) {  
                const p \= projectiles\[i\];  
                  
                // If main cleanup is happening, skip physics  
                if (state \=== 'IDLE' && p.mesh.scale.x \< 0.1) continue;

                if (\!p.stuck) {  
                    // Move  
                    p.mesh.position.addScaledVector(p.velocity, delta);  
                      
                    // Gravity  
                    p.velocity.y \-= 15 \* delta;

                    // Spin  
                    p.mesh.rotation.x \+= p.rotVelocity.x \* delta;  
                    p.mesh.rotation.z \+= p.rotVelocity.z \* delta;

                    // Floor Collision  
                    if (p.mesh.position.y \<= 0\) {  
                        p.stuck \= true;  
                        p.mesh.position.y \= 0;  
                        // Random tilt when stuck  
                        p.mesh.rotation.set(Math.random()\*Math.PI, Math.random()\*Math.PI, Math.random());  
                    }  
                } else {  
                    // Fade out logic for old projectiles if we wanted,   
                    // but we do it in the Recovering phase for a mass-cleanup  
                }  
            }

            controls.update();  
            renderer.render(scene, camera);  
        }

        animate();

        window.addEventListener('resize', () \=\> {  
            camera.aspect \= window.innerWidth / window.innerHeight;  
            camera.updateProjectionMatrix();  
            renderer.setSize(window.innerWidth, window.innerHeight);  
        });

    \</script\>  
\</body\>  
\</html\>  
