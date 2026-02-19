Shooting Toaster

\<\!DOCTYPE html\>  
\<html lang="en"\>  
\<head\>  
    \<meta charset="UTF-8"\>  
    \<meta name="viewport" content="width=device-width, initial-scale=1.0"\>  
    \<title\>Target Practice Toaster\</title\>  
    \<style\>  
        body { margin: 0; overflow: hidden; background-color: \#87CEEB; font-family: sans-serif; }  
        \#info {  
            position: absolute;  
            top: 20px;  
            width: 100%;  
            text-align: center;  
            color: \#fff;  
            pointer-events: none;  
            font-weight: 900;  
            font-size: 1.5rem;  
            text-transform: uppercase;  
            letter-spacing: 2px;  
            text-shadow: 2px 2px 0px rgba(0,0,0,0.2);  
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;  
        }  
        \#score-board {  
            position: absolute;  
            bottom: 30px;  
            right: 30px;  
            background: rgba(255, 255, 255, 0.9);  
            padding: 15px 25px;  
            border-radius: 12px;  
            font-weight: bold;  
            font-size: 1.2rem;  
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);  
            display: none;  
        }  
    \</style\>  
\</head\>  
\<body\>  
    \<div id="info"\>Ready... Aim... (Click to Fire)\</div\>  
    \<div id="score-board"\>Hit\!\</div\>  
      
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
        scene.background \= new THREE.Color(0x87CEEB); // Sky Blue  
        scene.fog \= new THREE.Fog(0x87CEEB, 20, 60);

        const camera \= new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);  
        // Position camera to see both toaster and target  
        camera.position.set(12, 6, 8);  
        camera.lookAt(0, 3, 10);

        const renderer \= new THREE.WebGLRenderer({ antialias: true });  
        renderer.setSize(window.innerWidth, window.innerHeight);  
        renderer.shadowMap.enabled \= true;  
        renderer.shadowMap.type \= THREE.PCFSoftShadowMap;  
        document.body.appendChild(renderer.domElement);

        const controls \= new OrbitControls(camera, renderer.domElement);  
        controls.enableDamping \= true;  
        controls.minDistance \= 5;  
        controls.maxDistance \= 30;  
        controls.target.set(0, 2, 8); // Focus point between toaster and target

        // \--- Lighting \---  
        const ambientLight \= new THREE.AmbientLight(0xffffff, 0.6);  
        scene.add(ambientLight);

        const dirLight \= new THREE.DirectionalLight(0xffffff, 1.2);  
        dirLight.position.set(5, 15, 5);  
        dirLight.castShadow \= true;  
        dirLight.shadow.mapSize.width \= 2048;  
        dirLight.shadow.mapSize.height \= 2048;  
        dirLight.shadow.camera.near \= 0.5;  
        dirLight.shadow.camera.far \= 50;  
        dirLight.shadow.camera.left \= \-15;  
        dirLight.shadow.camera.right \= 15;  
        dirLight.shadow.camera.top \= 15;  
        dirLight.shadow.camera.bottom \= \-15;  
        scene.add(dirLight);

        // Fire glow light  
        const fireLight \= new THREE.PointLight(0xff4500, 0, 10);  
        fireLight.position.set(0, 2, 0);  
        scene.add(fireLight);

        // \--- Materials \---  
        const materials \= {  
            metal: new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.3, metalness: 0.7, flatShading: true }),  
            darkMetal: new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.7, flatShading: true }),  
            plastic: new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.2, flatShading: true }),  
            accent: new THREE.MeshStandardMaterial({ color: 0xff5722, roughness: 0.8, flatShading: true }),  
            wood: new THREE.MeshStandardMaterial({ color: 0x8B5A2B, roughness: 0.9, flatShading: true }),  
            whitePaint: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, flatShading: true }),  
            redPaint: new THREE.MeshStandardMaterial({ color: 0xD32F2F, roughness: 0.5, flatShading: true }),  
              
            // Toast States  
            toastRaw: new THREE.MeshStandardMaterial({ color: 0xdeb887, roughness: 1, flatShading: true }),  
            crustRaw: new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 1, flatShading: true }),  
            toastBurnt: new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9, flatShading: true }),  
            crustBurnt: new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.9, flatShading: true })  
        };

        // \--- Objects \---

        // 1\. Toaster  
        const toasterGroup \= new THREE.Group();  
        scene.add(toasterGroup);

        // Body  
        const body \= new THREE.Mesh(new THREE.BoxGeometry(2, 1.4, 1.2), materials.metal);  
        body.position.y \= 0.7;  
        body.castShadow \= true;  
        body.receiveShadow \= true;  
        toasterGroup.add(body);

        // Base  
        const base \= new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.2, 1.3), materials.darkMetal);  
        base.position.y \= 0.1;  
        base.castShadow \= true;  
        toasterGroup.add(base);

        // Feet  
        \[\[-0.9, 0, \-0.5\], \[0.9, 0, \-0.5\], \[-0.9, 0, 0.5\], \[0.9, 0, 0.5\]\].forEach(pos \=\> {  
            const foot \= new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.1, 8), materials.plastic);  
            foot.position.set(...pos);  
            toasterGroup.add(foot);  
        });

        // Lever  
        const leverGroup \= new THREE.Group();  
        leverGroup.position.set(1.05, 0.8, 0);  
        toasterGroup.add(leverGroup);  
        const leverPath \= new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.8, 0.1), materials.darkMetal);  
        leverPath.position.x \= \-0.04;  
        leverGroup.add(leverPath);

        const handleAssembly \= new THREE.Group();  
        const handleStem \= new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.05, 0.05), materials.metal);  
        const handleKnob \= new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.3), materials.plastic);  
        handleKnob.position.x \= 0.15;  
        handleAssembly.add(handleStem, handleKnob);  
        handleAssembly.position.y \= 0.3;  
        leverGroup.add(handleAssembly);

        // 2\. Target  
        const targetGroup \= new THREE.Group();  
        targetGroup.position.set(0, 0, 15); // Down range Z axis  
        scene.add(targetGroup);

        // Stand legs  
        const legGeo \= new THREE.BoxGeometry(0.2, 4, 0.2);  
        const legL \= new THREE.Mesh(legGeo, materials.wood);  
        legL.position.set(-1.5, 2, 0);  
        legL.castShadow \= true;  
          
        const legR \= new THREE.Mesh(legGeo, materials.wood);  
        legR.position.set(1.5, 2, 0);  
        legR.castShadow \= true;  
          
        const crossbar \= new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.2, 0.2), materials.wood);  
        crossbar.position.set(0, 3, 0);  
        crossbar.castShadow \= true;

        targetGroup.add(legL, legR, crossbar);

        // The Board (Target)  
        const boardGroup \= new THREE.Group();  
        boardGroup.position.set(0, 3, 0.1);  
        boardGroup.rotation.x \= \-0.1; // Tilt slightly up  
        targetGroup.add(boardGroup);

        // Bullseye Rings  
        const r1 \= new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.1, 32), materials.whitePaint);  
        r1.rotation.x \= Math.PI/2;  
          
        const r2 \= new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.12, 32), materials.redPaint);  
        r2.rotation.x \= Math.PI/2;  
          
        const r3 \= new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.14, 32), materials.whitePaint);  
        r3.rotation.x \= Math.PI/2;  
          
        const r4 \= new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.16, 32), materials.redPaint);  
        r4.rotation.x \= Math.PI/2;

        boardGroup.add(r1, r2, r3, r4);

        // \--- Toast System \---  
        function createToast() {  
            const tGroup \= new THREE.Group();  
              
            tGroup.userData \= {   
                velocity: new THREE.Vector3(),   
                angularVelocity: new THREE.Vector3(),  
                isFlying: false,  
                stuck: false  
            };

            const bread \= new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.08), materials.toastRaw.clone());  
            bread.name \= "crumb";  
            bread.castShadow \= true;  
              
            // Crusts  
            const parts \= \[  
                { s: \[0.8, 0.1, 0.08\], p: \[0, 0.45, 0\] },  
                { s: \[0.8, 0.05, 0.08\], p: \[0, \-0.425, 0\] },  
                { s: \[0.05, 0.9, 0.08\], p: \[-0.425, 0, 0\] },  
                { s: \[0.05, 0.9, 0.08\], p: \[0.425, 0, 0\] }  
            \];

            parts.forEach(part \=\> {  
                const m \= new THREE.Mesh(new THREE.BoxGeometry(...part.s), materials.crustRaw.clone());  
                m.position.set(...part.p);  
                m.name \= "crust";  
                m.castShadow \= true;  
                tGroup.add(m);  
            });

            tGroup.add(bread);  
            return tGroup;  
        }

        const toast1 \= createToast();  
        const toast2 \= createToast();  
          
        const slot1Pos \= new THREE.Vector3(0, 1.0, \-0.25);  
        const slot2Pos \= new THREE.Vector3(0, 1.0, 0.25);  
          
        toast1.position.copy(slot1Pos);  
        toast2.position.copy(slot2Pos);  
          
        scene.add(toast1);  
        scene.add(toast2);  
          
        const toastMeshes \= \[toast1, toast2\];

        // \--- Fire Particles \---  
        const particles \= \[\];  
        const fireGroup \= new THREE.Group();  
        toasterGroup.add(fireGroup);  
        const flameGeo \= new THREE.ConeGeometry(0.3, 0.8, 3);   
        flameGeo.translate(0, 0.4, 0);  
        const fireMat \= new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.9 });

        function updateFire(delta, intensity) {  
            if (intensity \> 0 && particles.length \< 60 && Math.random() \< intensity) {  
                const mesh \= new THREE.Mesh(flameGeo, fireMat.clone());  
                mesh.position.set((Math.random()-0.5)\*1.4, 1.4, (Math.random()\>0.5?0.25:-0.25)+(Math.random()-0.5)\*0.2);  
                mesh.scale.setScalar(0.1);  
                fireGroup.add(mesh);  
                particles.push({ mesh, speed: 2+Math.random()\*3, life: 0.8 });  
            }

            for (let i \= particles.length \- 1; i \>= 0; i--) {  
                const p \= particles\[i\];  
                p.life \-= delta \* 2.0;  
                p.mesh.position.y \+= p.speed \* delta;  
                p.mesh.rotation.y \+= delta \* 4;  
                p.mesh.scale.setScalar(Math.sin(p.life \* Math.PI) \* 1.5);  
                  
                if (p.life \<= 0\) {  
                    fireGroup.remove(p.mesh);  
                    particles.splice(i, 1);  
                }  
            }  
            fireLight.intensity \= particles.length \> 0 ? 3 \+ Math.random() \* 2 : 0;  
        }

        // \--- Ground & Env \---  
        const ground \= new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.MeshStandardMaterial({ color: 0x90EE90 }));  
        ground.rotation.x \= \-Math.PI / 2;  
        ground.receiveShadow \= true;  
        scene.add(ground);  
          
        // Simple Grid Helper  
        const grid \= new THREE.GridHelper(100, 50, 0xffffff, 0xffffff);  
        grid.material.opacity \= 0.2;  
        grid.material.transparent \= true;  
        scene.add(grid);

        // \--- Physics Constants \---  
        const gravity \= 18.0;   
        const targetZ \= 15.0;  
        const targetY \= 3.0;

        // Calculate launch parameters to hit target  
        // Distance Z \= 15\.  
        // We want flight time approx 1.2 seconds.  
        // vz \= dist / time \= 15 / 1.2 \= 12.5  
        // y \= vy\*t \- 0.5\*g\*t^2  
        // 3.0 (target height) \- 1.0 (start height) \= vy\*1.2 \- 0.5\*18\*(1.2)^2  
        // 2.0 \= 1.2\*vy \- 12.96  
        // 14.96 \= 1.2\*vy  
        // vy \= 12.46  
        const launchVz \= 12.5;  
        const launchVy \= 12.5;

        let state \= 'idle';   
        let timer \= 0;

        window.addEventListener('mousedown', onClick);  
        window.addEventListener('touchstart', onClick);

        function resetToast() {  
            toast1.position.copy(slot1Pos);  
            toast2.position.copy(slot2Pos);  
              
            toastMeshes.forEach(t \=\> {  
                t.rotation.set(0,0,0);  
                t.userData.isFlying \= false;  
                t.userData.stuck \= false;  
                t.userData.velocity.set(0,0,0);  
                t.children.forEach(m \=\> {  
                    if(m.name \=== 'crumb') m.material \= materials.toastRaw.clone();  
                    if(m.name \=== 'crust') m.material \= materials.crustRaw.clone();  
                });  
            });  
            document.getElementById('info').innerText \= "Ready... Aim... (Click to Fire)";  
            document.getElementById('score-board').style.display \= "none";  
        }

        function onClick() {  
            if (state \=== 'idle') {  
                // Check if we need reset  
                if (toast1.position.z \> 5\) { // If far away  
                    resetToast();  
                }  
                  
                state \= 'down';  
                document.getElementById('info').innerText \= "Charging...";  
            }  
        }

        function animateLogic(delta) {  
            if (state \!== 'cooking') updateFire(delta, 0);

            if (state \=== 'down') {  
                if (handleAssembly.position.y \> \-0.3) handleAssembly.position.y \-= delta \* 4;  
                if (toast1.position.y \> 0.7) {  
                    toast1.position.y \-= delta \* 4;  
                    toast2.position.y \-= delta \* 4;  
                } else {  
                    state \= 'cooking';  
                    timer \= 0;  
                }  
            }   
            else if (state \=== 'cooking') {  
                timer \+= delta;  
                updateFire(delta, 1.0);  
                toasterGroup.position.x \= (Math.random()-0.5)\*0.15; // Violent shake  
                  
                if (timer \> 2.0) {  
                    state \= 'flying';  
                    toasterGroup.position.set(0,0,0);  
                    handleAssembly.position.y \= 0.3;  
                    document.getElementById('info').innerText \= "FIRE\!";

                    // Launch Logic  
                    toastMeshes.forEach((t, i) \=\> {  
                        // Material Burn  
                        t.children.forEach(m \=\> {  
                            if(m.name \=== 'crumb') m.material \= materials.toastBurnt;  
                            if(m.name \=== 'crust') m.material \= materials.crustBurnt;  
                        });

                        t.userData.isFlying \= true;  
                          
                        // Spread them slightly on X so they don't overlap perfectly  
                        const xOffset \= i \=== 0 ? \-0.5 : 0.5;  
                          
                        t.userData.velocity.set(  
                            xOffset, // Slight spread  
                            launchVy \+ (Math.random()-0.5),   
                            launchVz \+ (Math.random()-0.5)  
                        );

                        // Spin\!  
                        t.userData.angularVelocity.set(  
                            15, // Backflip  
                            0,   
                            (Math.random()-0.5)\*5  
                        );  
                    });  
                }  
            }  
            else if (state \=== 'flying') {  
                updateFire(delta, 0.5);  
                  
                let activeMovers \= false;

                toastMeshes.forEach(t \=\> {  
                    if (t.userData.isFlying && \!t.userData.stuck) {  
                        activeMovers \= true;  
                          
                        // Gravity  
                        t.userData.velocity.y \-= gravity \* delta;  
                          
                        // Move  
                        t.position.addScaledVector(t.userData.velocity, delta);  
                          
                        // Spin  
                        t.rotation.x \+= t.userData.angularVelocity.x \* delta;  
                        t.rotation.y \+= t.userData.angularVelocity.y \* delta;  
                        t.rotation.z \+= t.userData.angularVelocity.z \* delta;

                        // \--- Collision Detection \---  
                          
                        // 1\. Target Collision (Approximate cylinder check)  
                        // Target center is (0, 3, 15\)  
                        const dz \= t.position.z \- targetZ;  
                        const dy \= t.position.y \- targetY;  
                        const dx \= t.position.x;

                        // Check if we are passing through the target plane (Z=15)  
                        if (Math.abs(dz) \< 0.2 && t.position.y \> 1.5 && t.position.y \< 4.5 && Math.abs(dx) \< 1.5) {  
                              
                            const distFromCenter \= Math.sqrt(dx\*dx \+ dy\*dy);  
                              
                            if (distFromCenter \< 1.5) {  
                                // HIT\!  
                                t.userData.stuck \= true;  
                                t.position.z \= targetZ \- 0.1; // Stick to front  
                                t.rotation.set(0, 0, (Math.random()-0.5)); // Random angle stick  
                                  
                                document.getElementById('score-board').style.display \= "block";  
                                document.getElementById('score-board').innerText \= "BULLSEYE\!";  
                                document.getElementById('score-board').style.color \= "\#4CAF50";  
                            }  
                        }

                        // 2\. Floor Collision  
                        if (t.position.y \<= 0.1) {  
                            t.position.y \= 0.1;  
                            t.userData.stuck \= true; // "Stick" to floor  
                            t.rotation.x \= \-Math.PI/2;  
                            t.userData.velocity.set(0,0,0);  
                        }  
                    }  
                });

                if (\!activeMovers) {  
                    state \= 'idle';  
                    document.getElementById('info').innerText \= "Nice Shot? (Click to Reset)";  
                }  
            }  
        }

        const clock \= new THREE.Clock();  
        function animate() {  
            requestAnimationFrame(animate);  
            const delta \= clock.getDelta();  
            animateLogic(delta);  
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
