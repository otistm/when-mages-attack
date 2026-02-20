Battery

\<\!DOCTYPE html\>  
\<html lang="en"\>  
\<head\>  
    \<meta charset="UTF-8"\>  
    \<meta name="viewport" content="width=device-width, initial-scale=1.0"\>  
    \<title\>Rolling Low Poly AA Battery\</title\>  
    \<style\>  
        body { margin: 0; overflow: hidden; background-color: \#050505; font-family: 'Courier New', Courier, monospace; }  
        \#info {  
            position: absolute;  
            top: 20px;  
            width: 100%;  
            text-align: center;  
            color: \#00ffff;  
            pointer-events: none;  
            font-weight: bold;  
            font-size: 1.5rem;  
            text-transform: uppercase;  
            letter-spacing: 4px;  
            text-shadow: 0px 0px 10px \#00ffff, 0px 0px 20px \#00ffff;  
            user-select: none;  
        }  
    \</style\>  
\</head\>  
\<body\>  
    \<div id="info"\>Discharging...\</div\>  
      
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

        // \--- Configuration \---  
        const electricColor \= 0x00ffff;  
        const sparkColor \= 0xffffff;  
        const rollSpeed \= 4.0; // Units per second  
        const batteryRadius \= 0.6;  
        const batteryLength \= 3;

        // \--- Scene Setup \---  
        const scene \= new THREE.Scene();  
        scene.background \= new THREE.Color(0x050505);  
        scene.fog \= new THREE.Fog(0x050505, 10, 40);

        const camera \= new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);  
        camera.position.set(5, 4, 8);

        const renderer \= new THREE.WebGLRenderer({ antialias: true });  
        renderer.setSize(window.innerWidth, window.innerHeight);  
        renderer.shadowMap.enabled \= true;  
        renderer.shadowMap.type \= THREE.PCFSoftShadowMap;  
        document.body.appendChild(renderer.domElement);

        const controls \= new OrbitControls(camera, renderer.domElement);  
        controls.enableDamping \= true;  
        controls.maxPolarAngle \= Math.PI / 2 \- 0.05; // Keep above ground  
        controls.minDistance \= 3;  
        controls.maxDistance \= 20;

        // \--- Lighting \---  
        const ambientLight \= new THREE.AmbientLight(0xffffff, 0.2);  
        scene.add(ambientLight);

        const dirLight \= new THREE.DirectionalLight(0xffffff, 0.8);  
        dirLight.position.set(5, 10, 2);  
        dirLight.castShadow \= true;  
        scene.add(dirLight);

        // Dynamic electric glow  
        const glowLight \= new THREE.PointLight(electricColor, 5, 15);  
        glowLight.position.set(0, batteryRadius, 0);  
        scene.add(glowLight);

        // \--- Materials \---  
        const metalMat \= new THREE.MeshStandardMaterial({   
            color: 0xaaaaaa, roughness: 0.3, metalness: 0.9, flatShading: true   
        });  
        const bodyMat \= new THREE.MeshStandardMaterial({   
            color: 0x111111, roughness: 0.7, metalness: 0.2, flatShading: true   
        });  
        const labelMat \= new THREE.MeshStandardMaterial({   
            color: 0xffaa00, roughness: 0.5, metalness: 0.4, flatShading: true   
        });

        // \--- The Battery \---  
        const batteryGroup \= new THREE.Group();  
        batteryGroup.position.y \= batteryRadius; // Rest on floor  
        scene.add(batteryGroup);

        const segments \= 8; // Low poly count

        // Helper to orient cylinders along the X axis natively  
        function createOrientedCylinder(radius, length, mat, posX) {  
            const geo \= new THREE.CylinderGeometry(radius, radius, length, segments);  
            geo.rotateZ(-Math.PI / 2); // Lay flat along X axis natively  
            const mesh \= new THREE.Mesh(geo, mat);  
            mesh.position.x \= posX;  
            mesh.castShadow \= true;  
            return mesh;  
        }

        // Main Casing  
        batteryGroup.add(createOrientedCylinder(batteryRadius, batteryLength, bodyMat, 0));  
          
        // Copper Label/Stripe  
        batteryGroup.add(createOrientedCylinder(batteryRadius \+ 0.01, 1.5, labelMat, \-0.5));  
          
        // Positive Terminal (Right)  
        batteryGroup.add(createOrientedCylinder(batteryRadius, 0.2, metalMat, 1.5));  
        batteryGroup.add(createOrientedCylinder(0.2, 0.2, metalMat, 1.65)); // Nipple  
          
        // Negative Terminal (Left)  
        batteryGroup.add(createOrientedCylinder(batteryRadius, 0.2, metalMat, \-1.5));

        // \--- Environment \---  
        const floorMat \= new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });  
        const floor \= new THREE.Mesh(new THREE.PlaneGeometry(200, 200), floorMat);  
        floor.rotation.x \= \-Math.PI / 2;  
        floor.receiveShadow \= true;  
        scene.add(floor);

        const gridCellSize \= 2;  
        const grid \= new THREE.GridHelper(200, 100, electricColor, 0x003333);  
        grid.position.y \= 0.01;  
        grid.material.opacity \= 0.3;  
        grid.material.transparent \= true;  
        scene.add(grid);

        // \--- Electricity System (Lightning Arcs) \---  
        const boltCount \= 8;  
        const boltSegments \= 6;  
        const bolts \= \[\];  
        const lightningMat \= new THREE.LineBasicMaterial({  
            color: electricColor,  
            blending: THREE.AdditiveBlending,  
            transparent: true,  
            opacity: 0.9  
        });

        for (let i \= 0; i \< boltCount; i++) {  
            const geo \= new THREE.BufferGeometry();  
            const positions \= new Float32Array(boltSegments \* 3);  
            geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));  
            const line \= new THREE.Line(geo, lightningMat.clone());  
            line.frustumCulled \= false; // Prevent lightning from disappearing as camera moves  
            scene.add(line);  
            bolts.push(line);  
        }

        function updateLightning() {  
            bolts.forEach((bolt) \=\> {  
                if (Math.random() \> 0.4) {  
                    bolt.visible \= false;  
                    return;  
                }  
                bolt.visible \= true;

                const positions \= bolt.geometry.attributes.position.array;  
                  
                // Pick a random spot along the battery's length (X axis)  
                const startX \= batteryGroup.position.x \+ (Math.random() \- 0.5) \* batteryLength;  
                  
                // Start point on the surface of the cylinder  
                const angle \= Math.random() \* Math.PI \* 2;  
                const startY \= batteryGroup.position.y \+ Math.sin(angle) \* batteryRadius;  
                const startZ \= batteryGroup.position.z \+ Math.cos(angle) \* batteryRadius;

                // End point (snap to the floor nearby)  
                const endX \= startX \+ (Math.random() \- 0.5) \* 2;  
                const endY \= 0;  
                const endZ \= startZ \+ (Math.random() \- 0.5) \* 2;

                // Create jagged path  
                for (let j \= 0; j \< boltSegments; j++) {  
                    const t \= j / (boltSegments \- 1);  
                      
                    let x \= startX \+ (endX \- startX) \* t;  
                    let y \= startY \+ (endY \- startY) \* t;  
                    let z \= startZ \+ (endZ \- startZ) \* t;

                    // Add chaotic jitter to the middle segments  
                    if (j \> 0 && j \< boltSegments \- 1\) {  
                        x \+= (Math.random() \- 0.5) \* 0.5;  
                        y \+= (Math.random() \- 0.5) \* 0.5;  
                        z \+= (Math.random() \- 0.5) \* 0.5;  
                    }

                    positions\[j \* 3\] \= x;  
                    positions\[j \* 3 \+ 1\] \= y;  
                    positions\[j \* 3 \+ 2\] \= z;  
                }  
                bolt.geometry.attributes.position.needsUpdate \= true;  
            });  
        }

        // \--- Spark System \---  
        const sparkCount \= 50;  
        const sparksGeo \= new THREE.BufferGeometry();  
        const sparkPositions \= new Float32Array(sparkCount \* 3);  
        const sparkVelocities \= \[\];

        for (let i \= 0; i \< sparkCount; i++) {  
            sparkPositions\[i\*3\] \= 0;  
            sparkPositions\[i\*3+1\] \= \-10; // Hide below initially  
            sparkPositions\[i\*3+2\] \= 0;  
            sparkVelocities.push(new THREE.Vector3());  
        }  
        sparksGeo.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3));

        const sparkMat \= new THREE.PointsMaterial({  
            color: sparkColor,  
            size: 0.1,  
            transparent: true,  
            opacity: 0.8,  
            blending: THREE.AdditiveBlending  
        });

        const sparkSystem \= new THREE.Points(sparksGeo, sparkMat);  
        sparkSystem.frustumCulled \= false; // Prevent sparks from disappearing as camera moves  
        scene.add(sparkSystem);

        function updateSparks(delta) {  
            const positions \= sparksGeo.attributes.position.array;  
              
            for (let i \= 0; i \< sparkCount; i++) {  
                let x \= positions\[i\*3\];  
                let y \= positions\[i\*3+1\];  
                let z \= positions\[i\*3+2\];  
                const vel \= sparkVelocities\[i\];

                // If spark is dead (below floor), chance to respawn  
                if (y \< 0 && Math.random() \< 0.2) {  
                    // Spawn at the contact line between battery and floor  
                    x \= batteryGroup.position.x \+ (Math.random() \- 0.5) \* batteryLength;  
                    y \= 0.1;  
                    z \= batteryGroup.position.z;

                    // Shoot up and backward (trailing behind the battery moving \-Z)  
                    vel.set(  
                        (Math.random() \- 0.5) \* 2,  // X spread  
                        2 \+ Math.random() \* 3,      // Y up  
                        1 \+ Math.random() \* 3       // Z backward (opposite of movement direction)  
                    );  
                } else if (y \>= 0\) {  
                    // Move  
                    x \+= vel.x \* delta;  
                    y \+= vel.y \* delta;  
                    z \+= vel.z \* delta;

                    // Gravity  
                    vel.y \-= 9.8 \* delta;  
                }

                positions\[i\*3\] \= x;  
                positions\[i\*3+1\] \= y;  
                positions\[i\*3+2\] \= z;  
            }  
            sparksGeo.attributes.position.needsUpdate \= true;  
        }

        // \--- Render Loop \---  
        const clock \= new THREE.Clock();

        function animate() {  
            requestAnimationFrame(animate);  
            const delta \= clock.getDelta();  
              
            const moveDist \= rollSpeed \* delta;

            // 1\. Roll the battery physically through space (forward is \-Z)  
            batteryGroup.position.z \-= moveDist;   
              
            // To roll forward (-Z) while laying on X, we rotate negatively around X  
            const rotationAngle \= moveDist / batteryRadius;  
            batteryGroup.rotation.x \-= rotationAngle; 

            // 2\. Camera follows the battery  
            camera.position.z \-= moveDist;  
            controls.target.z \-= moveDist;

            // 3\. Infinite Environment (Floor follows camera)  
            floor.position.z \= camera.position.z;  
            grid.position.z \= Math.round(camera.position.z / gridCellSize) \* gridCellSize;

            // 4\. Lights follow  
            glowLight.position.z \= batteryGroup.position.z;  
            glowLight.intensity \= 3 \+ Math.random() \* 4;

            // 5\. Update FX  
            updateLightning();  
            updateSparks(delta);

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