Rune Brick

\<\!DOCTYPE html\>  
\<html lang="en"\>  
\<head\>  
    \<meta charset="UTF-8"\>  
    \<meta name="viewport" content="width=device-width, initial-scale=1.0"\>  
    \<title\>Low Poly Magical Brick\</title\>  
    \<style\>  
        body { margin: 0; overflow: hidden; background-color: \#1a1a1c; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }  
        \#ui-layer {  
            position: absolute;  
            top: 0; left: 0; width: 100%; height: 100%;  
            pointer-events: none;  
            display: flex;  
            flex-direction: column;  
            justify-content: flex-start;  
            align-items: center;  
            padding-top: 40px;  
        }  
        h1 {  
            color: \#ff3366;  
            margin: 0;  
            font-size: 2rem;  
            text-transform: uppercase;  
            letter-spacing: 5px;  
            text-shadow: 0 0 15px rgba(255, 51, 102, 0.6);  
        }  
        p {  
            color: \#a0a0a5;  
            font-size: 1rem;  
            letter-spacing: 2px;  
            margin-top: 10px;  
        }  
    \</style\>  
\</head\>  
\<body\>  
    \<div id="ui-layer"\>  
        \<h1\>Rune Brick\</h1\>  
        \<p\>CLICK TO SMASH\</p\>  
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

        // \--- Scene & Camera \---  
        const scene \= new THREE.Scene();  
        scene.background \= new THREE.Color(0x18181a);  
        scene.fog \= new THREE.FogExp2(0x18181a, 0.04);

        const camera \= new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);  
        camera.position.set(5, 4, 7);

        const renderer \= new THREE.WebGLRenderer({ antialias: true });  
        renderer.setSize(window.innerWidth, window.innerHeight);  
        renderer.shadowMap.enabled \= true;  
        renderer.shadowMap.type \= THREE.PCFSoftShadowMap;  
        document.body.appendChild(renderer.domElement);

        const controls \= new OrbitControls(camera, renderer.domElement);  
        controls.enableDamping \= true;  
        controls.maxPolarAngle \= Math.PI / 2 \- 0.05; // Don't go below ground  
        controls.minDistance \= 3;  
        controls.maxDistance \= 20;

        // \--- Lighting \---  
        const ambientLight \= new THREE.AmbientLight(0xffffff, 0.2);  
        scene.add(ambientLight);

        const dirLight \= new THREE.DirectionalLight(0xfff5e6, 1.2);  
        dirLight.position.set(5, 10, \-5);  
        dirLight.castShadow \= true;  
        dirLight.shadow.mapSize.width \= 2048;  
        dirLight.shadow.mapSize.height \= 2048;  
        dirLight.shadow.camera.near \= 0.5;  
        dirLight.shadow.camera.far \= 25;  
        scene.add(dirLight);

        // \--- Materials \---  
        const brickColor \= 0xa53b2a; // Deep red clay  
        const magicColor \= 0xff3366; // Glowing pink/red magic

        const brickMat \= new THREE.MeshStandardMaterial({  
            color: brickColor,  
            roughness: 0.9,  
            metalness: 0.1,  
            flatShading: true  
        });

        const sigilMat \= new THREE.MeshBasicMaterial({  
            color: magicColor,  
        });

        const groundMat \= new THREE.MeshStandardMaterial({  
            color: 0x222224,  
            roughness: 0.8,  
            metalness: 0.2,  
            flatShading: true  
        });

        const dustMat \= new THREE.MeshStandardMaterial({  
            color: 0x5a4a40,  
            roughness: 1.0,  
            transparent: true,  
            opacity: 0.8,  
            flatShading: true  
        });

        // \--- Geometry: The Low Poly Brick \---  
        const brickGroup \= new THREE.Group();  
        scene.add(brickGroup);

        // Subdivide the box so we can deform the vertices to make it look chipped/heavy  
        const brickGeo \= new THREE.BoxGeometry(2.4, 0.9, 1.2, 5, 3, 3);  
        const pos \= brickGeo.attributes.position;  
          
        // Perturb vertices to make it irregular  
        for (let i \= 0; i \< pos.count; i++) {  
            let x \= pos.getX(i);  
            let y \= pos.getY(i);  
            let z \= pos.getZ(i);

            // Edge chipping logic: push corners/edges in slightly  
            const isEdgeX \= Math.abs(x) \> 1.1;  
            const isEdgeY \= Math.abs(y) \> 0.4;  
            const isEdgeZ \= Math.abs(z) \> 0.5;  
              
            if ((isEdgeX && isEdgeY) || (isEdgeY && isEdgeZ) || (isEdgeX && isEdgeZ)) {  
                x \-= Math.sign(x) \* (Math.random() \* 0.1);  
                y \-= Math.sign(y) \* (Math.random() \* 0.1);  
                z \-= Math.sign(z) \* (Math.random() \* 0.1);  
            }

            // General low poly noise  
            x \+= (Math.random() \- 0.5) \* 0.05;  
            y \+= (Math.random() \- 0.5) \* 0.05;  
            z \+= (Math.random() \- 0.5) \* 0.05;

            pos.setXYZ(i, x, y, z);  
        }  
        brickGeo.computeVertexNormals(); // Recalculate lighting

        const brickMesh \= new THREE.Mesh(brickGeo, brickMat);  
        brickMesh.castShadow \= true;  
        brickMesh.receiveShadow \= true;  
        brickGroup.add(brickMesh);

        // \--- The Magical Sigil \---  
        // We'll build a rune out of thin boxes and embed it into the front face (+Z)  
        const sigilGroup \= new THREE.Group();  
        sigilGroup.position.set(0, 0, 0.6); // Front face  
        brickGroup.add(sigilGroup);

        // Rune Design (A stylized eye/arrow/force symbol)  
        function addRuneLine(w, h, d, x, y, z, rotZ) {  
            const mesh \= new THREE.Mesh(new THREE.BoxGeometry(w, h, d), sigilMat);  
            mesh.position.set(x, y, z);  
            mesh.rotation.z \= rotZ;  
            sigilGroup.add(mesh);  
        }

        // Central pillar  
        addRuneLine(0.08, 0.6, 0.05, 0, 0, 0, 0);  
        // Left branch  
        addRuneLine(0.06, 0.4, 0.05, \-0.15, 0.1, 0, \-Math.PI/4);  
        // Right branch  
        addRuneLine(0.06, 0.4, 0.05, 0.15, 0.1, 0, Math.PI/4);  
        // Bottom chevron left  
        addRuneLine(0.06, 0.3, 0.05, \-0.1, \-0.2, 0, Math.PI/3);  
        // Bottom chevron right  
        addRuneLine(0.06, 0.3, 0.05, 0.1, \-0.2, 0, \-Math.PI/3);  
        // Floating dot above  
        addRuneLine(0.08, 0.08, 0.05, 0, 0.45, 0, 0);

        // Magic Glow Light attached to the brick  
        const magicLight \= new THREE.PointLight(magicColor, 2, 8);  
        magicLight.position.set(0, 0, 0.7);  
        brickGroup.add(magicLight);

        // \--- Environment \---  
        const ground \= new THREE.Mesh(new THREE.PlaneGeometry(100, 100), groundMat);  
        ground.rotation.x \= \-Math.PI / 2;  
        ground.receiveShadow \= true;  
        scene.add(ground);

        // \--- Dust Particle System \---  
        const dustParticles \= \[\];  
        const dustGeo \= new THREE.TetrahedronGeometry(0.3, 0); // Low poly dust puff

        function spawnDustCloud() {  
            const particleCount \= 40;  
            for (let i \= 0; i \< particleCount; i++) {  
                const mesh \= new THREE.Mesh(dustGeo, dustMat.clone());  
                  
                // Spawn in a ring around the brick  
                const angle \= Math.random() \* Math.PI \* 2;  
                const radius \= 0.5 \+ Math.random() \* 1.5;  
                mesh.position.set(  
                    Math.cos(angle) \* radius,  
                    0.1 \+ Math.random() \* 0.3, // Slightly above ground  
                    Math.sin(angle) \* radius  
                );  
                  
                // Random rotations  
                mesh.rotation.set(Math.random()\*Math.PI, Math.random()\*Math.PI, Math.random()\*Math.PI);  
                  
                scene.add(mesh);

                // Explosive outward velocity  
                const speed \= 2 \+ Math.random() \* 4;  
                const velocity \= new THREE.Vector3(  
                    Math.cos(angle) \* speed,  
                    0.5 \+ Math.random() \* 2.0, // Billow upwards  
                    Math.sin(angle) \* speed  
                );

                dustParticles.push({  
                    mesh: mesh,  
                    velocity: velocity,  
                    life: 1.0,  
                    rotSpeed: new THREE.Vector3(Math.random(), Math.random(), Math.random()).multiplyScalar(5)  
                });  
            }  
        }

        function updateDust(delta) {  
            for (let i \= dustParticles.length \- 1; i \>= 0; i--) {  
                const p \= dustParticles\[i\];  
                p.life \-= delta \* 0.8; // Fade over \~1.2 seconds

                if (p.life \<= 0\) {  
                    scene.remove(p.mesh);  
                    p.mesh.material.dispose();  
                    dustParticles.splice(i, 1);  
                    continue;  
                }

                // Move  
                p.mesh.position.addScaledVector(p.velocity, delta);  
                  
                // Spin  
                p.mesh.rotation.x \+= p.rotSpeed.x \* delta;  
                p.mesh.rotation.y \+= p.rotSpeed.y \* delta;  
                  
                // Friction/Drag (Slow down horizontally)  
                p.velocity.x \*= 0.95;  
                p.velocity.z \*= 0.95;  
                  
                // Float/Gravity (Dust floats up slightly then settles)  
                p.velocity.y \-= 2 \* delta; 

                // Scale down and fade out  
                const scale \= 0.5 \+ p.life;  
                p.mesh.scale.setScalar(scale);  
                p.mesh.material.opacity \= p.life \* 0.8;  
            }  
        }

        // \--- Animation Logic \---  
        let state \= 'IDLE'; // IDLE, RISING, FALLING, IMPACT  
        let brickVelocity \= new THREE.Vector3();  
        let brickAngularVelocity \= new THREE.Vector3();  
        let cameraShake \= 0;  
          
        const GRAVITY \= 35.0; // Extremely heavy gravity for that solid "thud"  
        const START\_Y \= 0.45; // Half brick height

        brickGroup.position.y \= START\_Y;

        window.addEventListener('mousedown', () \=\> {  
            if (state \=== 'IDLE') {  
                state \= 'RISING';  
                  
                // Launch upward  
                brickVelocity.set(0, 18, 0);   
                  
                // Crazy chaotic spin  
                brickAngularVelocity.set(  
                    (Math.random() \- 0.5) \* 15,  
                    (Math.random() \- 0.5) \* 15,  
                    (Math.random() \- 0.5) \* 15  
                );  
            }  
        });  
        window.addEventListener('touchstart', (e) \=\> {  
            if (state \=== 'IDLE') {  
                state \= 'RISING';  
                brickVelocity.set(0, 18, 0);   
                brickAngularVelocity.set((Math.random()-0.5)\*15, (Math.random()-0.5)\*15, (Math.random()-0.5)\*15);  
            }  
        });

        const clock \= new THREE.Clock();

        function animate() {  
            requestAnimationFrame(animate);  
            const delta \= clock.getDelta();  
            const time \= clock.getElapsedTime();

            // 1\. Brick Physics  
            if (state \=== 'IDLE') {  
                // Menacing hover/bob  
                brickGroup.position.y \= START\_Y \+ Math.sin(time \* 2\) \* 0.1;  
                // Very slow rotation to show it off  
                brickGroup.rotation.y \= Math.sin(time \* 0.5) \* 0.2;  
                brickGroup.rotation.x \= Math.sin(time \* 0.7) \* 0.1;  
                  
                // Pulse the magic light  
                magicLight.intensity \= 2 \+ Math.sin(time \* 5\) \* 1;  
            }   
            else if (state \=== 'RISING' || state \=== 'FALLING') {  
                // Apply Gravity  
                brickVelocity.y \-= GRAVITY \* delta;  
                  
                // Move  
                brickGroup.position.addScaledVector(brickVelocity, delta);  
                  
                // Spin  
                brickGroup.rotation.x \+= brickAngularVelocity.x \* delta;  
                brickGroup.rotation.y \+= brickAngularVelocity.y \* delta;  
                brickGroup.rotation.z \+= brickAngularVelocity.z \* delta;

                // State change logic  
                if (state \=== 'RISING' && brickVelocity.y \<= 0\) {  
                    state \= 'FALLING';  
                }

                // Impact Detection  
                // Check if the lowest corner hits the floor.   
                // For a simple box roughly radius \~1.5 from center.  
                // We'll use a hardcoded floor limit for the heavy impact feel.  
                if (brickGroup.position.y \<= START\_Y) {  
                    state \= 'IMPACT';  
                    brickGroup.position.y \= START\_Y;  
                      
                    // Force the brick to land flat  
                    brickGroup.rotation.set(0, 0, 0);  
                      
                    spawnDustCloud();  
                    cameraShake \= 0.6; // Start screen shake  
                    magicLight.intensity \= 5; // Flash light on impact  
                }  
            }  
            else if (state \=== 'IMPACT') {  
                // Recover from impact over a second  
                magicLight.intensity \= THREE.MathUtils.lerp(magicLight.intensity, 2, delta \* 5);  
                  
                if (cameraShake \<= 0\) {  
                    state \= 'IDLE'; // Ready to smash again  
                }  
            }

            // 2\. Dust  
            updateDust(delta);

            // 3\. Camera Shake  
            controls.update(); // Update orbit controls first

            if (cameraShake \> 0\) {  
                cameraShake \-= delta;  
                // Add violent random offsets directly to camera position post-orbit-update  
                const intensity \= cameraShake \* 1.5;  
                camera.position.x \+= (Math.random() \- 0.5) \* intensity;  
                camera.position.y \+= (Math.random() \- 0.5) \* intensity;  
                camera.position.z \+= (Math.random() \- 0.5) \* intensity;  
            }

            renderer.render(scene, camera);  
        }

        animate();

        // \--- Window Resize \---  
        window.addEventListener('resize', () \=\> {  
            camera.aspect \= window.innerWidth / window.innerHeight;  
            camera.updateProjectionMatrix();  
            renderer.setSize(window.innerWidth, window.innerHeight);  
        });

    \</script\>  
\</body\>  
\</html\>

