Expresso

\<\!DOCTYPE html\>  
\<html lang="en"\>  
\<head\>  
    \<meta charset="UTF-8"\>  
    \<meta name="viewport" content="width=device-width, initial-scale=1.0"\>  
    \<title\>Low Poly Espresso\</title\>  
    \<style\>  
        body { margin: 0; overflow: hidden; background-color: \#1a1614; font-family: 'Courier New', Courier, monospace; }  
        \#info {  
            position: absolute;  
            top: 20px;  
            width: 100%;  
            text-align: center;  
            color: \#d3c5b8;  
            pointer-events: none;  
            font-weight: bold;  
            font-size: 1.2rem;  
            text-transform: uppercase;  
            letter-spacing: 4px;  
            text-shadow: 0px 2px 4px rgba(0,0,0,0.8);  
        }  
        \#sub-info {  
            font-size: 0.8rem;  
            opacity: 0.6;  
            margin-top: 5px;  
            text-transform: none;  
        }  
    \</style\>  
\</head\>  
\<body\>  
    \<div id="info"\>  
        Caffeine Core  
        \<div id="sub-info"\>Drag to rotate • Scroll to zoom\</div\>  
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
        scene.background \= new THREE.Color(0x1a1614); // Dark, warm coffee-shop vibe  
        scene.fog \= new THREE.Fog(0x1a1614, 10, 30);

        const camera \= new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);  
        camera.position.set(3, 4, 5);

        const renderer \= new THREE.WebGLRenderer({ antialias: true });  
        renderer.setSize(window.innerWidth, window.innerHeight);  
        renderer.shadowMap.enabled \= true;  
        renderer.shadowMap.type \= THREE.PCFSoftShadowMap;  
        document.body.appendChild(renderer.domElement);

        const controls \= new OrbitControls(camera, renderer.domElement);  
        controls.enableDamping \= true;  
        controls.minDistance \= 2;  
        controls.maxDistance \= 15;  
        controls.maxPolarAngle \= Math.PI / 2 \+ 0.1; // Allow going slightly below the table

        // \--- Lighting \---  
        const ambientLight \= new THREE.AmbientLight(0xffffff, 0.4);  
        scene.add(ambientLight);

        // A warm, dramatic spotlight  
        const spotLight \= new THREE.SpotLight(0xfff0e6, 2.5);  
        spotLight.position.set(5, 8, 3);  
        spotLight.angle \= Math.PI / 6;  
        spotLight.penumbra \= 0.3;  
        spotLight.castShadow \= true;  
        spotLight.shadow.mapSize.width \= 1024;  
        spotLight.shadow.mapSize.height \= 1024;  
        scene.add(spotLight);

        // A cool rim light to make the white cup pop against the dark background  
        const rimLight \= new THREE.DirectionalLight(0x90b0d0, 1.0);  
        rimLight.position.set(-5, 3, \-5);  
        scene.add(rimLight);

        // \--- Materials \---  
        const ceramicMat \= new THREE.MeshStandardMaterial({  
            color: 0xffffff,  
            roughness: 0.1,  // Glossy  
            metalness: 0.05,  
            flatShading: true // Keeps the low-poly facet look  
        });

        const coffeeMat \= new THREE.MeshStandardMaterial({  
            color: 0x000000, // Pure pitch black  
            roughness: 0.05, // Highly reflective surface  
            metalness: 0.2,  
            flatShading: true  
        });

        const tableMat \= new THREE.MeshStandardMaterial({  
            color: 0x2c1e16, // Dark wood/cafe table  
            roughness: 0.9,  
            flatShading: true  
        });

        const steamMat \= new THREE.MeshBasicMaterial({  
            color: 0xffffff,  
            transparent: true,  
            opacity: 0.3,  
            blending: THREE.AdditiveBlending,  
            side: THREE.DoubleSide,  
            flatShading: true  
        });

        // \--- Geometry Builders \---  
        const espressoGroup \= new THREE.Group();  
        scene.add(espressoGroup);

        const segments \= 12; // Low poly count

        // 1\. The Saucer  
        const saucerGeo \= new THREE.CylinderGeometry(1.2, 0.8, 0.15, segments);  
        const saucer \= new THREE.Mesh(saucerGeo, ceramicMat);  
        saucer.position.y \= 0.075;  
        saucer.castShadow \= true;  
        saucer.receiveShadow \= true;  
        espressoGroup.add(saucer);

        const saucerIndentation \= new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.5, 0.16, segments), ceramicMat);  
        saucerIndentation.position.y \= 0.076;  
        // Hacky way to create an indentation in low poly without CSG:   
        // Just place a slightly darker or same-color cylinder inside, or rely on lighting.  
        // For pure low poly, we'll just let the cup sit on top.

        // 2\. The Cup  
        // Outer wall (open ended so the top cap doesn't cover the coffee)  
        const cupGeo \= new THREE.CylinderGeometry(0.7, 0.5, 1.2, segments, 1, true);  
        const cup \= new THREE.Mesh(cupGeo, ceramicMat);  
        cup.position.y \= 0.75; // Rest on saucer  
        cup.castShadow \= true;  
        cup.receiveShadow \= true;  
        espressoGroup.add(cup);

        // Cup Bottom (since outer wall is open ended)  
        const cupBottomGeo \= new THREE.CircleGeometry(0.5, segments);  
        const cupBottom \= new THREE.Mesh(cupBottomGeo, ceramicMat);  
        cupBottom.rotation.x \= Math.PI / 2; // Face down  
        cupBottom.position.y \= 0.15; // 0.75 \- 1.2/2  
        espressoGroup.add(cupBottom);

        // Cup interior (open ended, back faces)  
        const insideGeo \= new THREE.CylinderGeometry(0.6, 0.45, 1.2, segments, 1, true);  
        const insideMat \= new THREE.MeshStandardMaterial({   
            color: 0xffffff,   
            roughness: 0.1,   
            flatShading: true,  
            side: THREE.BackSide  
        });  
        const inside \= new THREE.Mesh(insideGeo, insideMat);  
        inside.position.y \= 0.75;  
        espressoGroup.add(inside);

        // Cup Rim (connects outer and inner walls at the top)  
        const rimGeo \= new THREE.RingGeometry(0.6, 0.7, segments);  
        const rim \= new THREE.Mesh(rimGeo, ceramicMat);  
        rim.rotation.x \= \-Math.PI / 2;  
        rim.position.y \= 1.35; // 0.75 \+ 1.2/2  
        espressoGroup.add(rim);

        // 3\. The Handle  
        const handleGeo \= new THREE.TorusGeometry(0.35, 0.1, 4, 8); // Very low poly torus  
        const handle \= new THREE.Mesh(handleGeo, ceramicMat);  
        handle.position.set(0.7, 0.8, 0);  
        handle.castShadow \= true;  
        espressoGroup.add(handle);

        // 4\. The Liquid (Espresso)  
        // We use RingGeometry with inner radius 0 to get radial subdivisions (phiSegments)  
        // This gives us the inner vertices needed to animate ripples.  
        const liquidSurfaceGeo \= new THREE.RingGeometry(0, 0.57, segments, 5);  
        const liquid \= new THREE.Mesh(liquidSurfaceGeo, coffeeMat);  
        liquid.rotation.x \= \-Math.PI / 2;  
        liquid.position.y \= 1.15; // Just below the rim  
        liquid.receiveShadow \= true;  
        espressoGroup.add(liquid);

        // Add a tiny rim/crema ring  
        const cremaGeo \= new THREE.TorusGeometry(0.53, 0.04, 3, segments);  
        const cremaMat \= new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.8, flatShading: true });  
        const crema \= new THREE.Mesh(cremaGeo, cremaMat);  
        crema.rotation.x \= Math.PI / 2;  
        crema.position.y \= 1.151; // Just above liquid surface  
        espressoGroup.add(crema);

        // 5\. The Environment (Table)  
        const table \= new THREE.Mesh(new THREE.PlaneGeometry(50, 50), tableMat);  
        table.rotation.x \= \-Math.PI / 2;  
        table.receiveShadow \= true;  
        scene.add(table);

        // \--- Steam Particle System \---  
        const steamParticles \= \[\];  
        // Using a low-poly tetrahedron for steam wisps  
        const steamGeo \= new THREE.TetrahedronGeometry(0.15, 0); 

        function spawnSteam() {  
            // Only spawn occasionally  
            if (Math.random() \> 0.1) return;

            const pMat \= steamMat.clone(); // Clone to fade opacity individually  
            const p \= new THREE.Mesh(steamGeo, pMat);  
              
            // Start near the liquid surface, slightly randomized  
            p.position.set(  
                (Math.random() \- 0.5) \* 0.6,  
                1.2,  
                (Math.random() \- 0.5) \* 0.6  
            );  
              
            p.rotation.set(Math.random() \* Math.PI, Math.random() \* Math.PI, Math.random() \* Math.PI);  
              
            scene.add(p);  
              
            steamParticles.push({  
                mesh: p,  
                life: 1.0,  
                // Upward velocity \+ slight drift  
                velocity: new THREE.Vector3((Math.random() \- 0.5) \* 0.2, 0.5 \+ Math.random() \* 0.5, (Math.random() \- 0.5) \* 0.2),  
                rotSpeed: new THREE.Vector3(Math.random() \* 2, Math.random() \* 2, Math.random() \* 2\)  
            });  
        }

        function updateSteam(delta) {  
            for (let i \= steamParticles.length \- 1; i \>= 0; i--) {  
                const p \= steamParticles\[i\];  
                p.life \-= delta \* 0.5; // Steam lives for \~2 seconds

                if (p.life \<= 0\) {  
                    scene.remove(p.mesh);  
                    p.mesh.material.dispose();  
                    steamParticles.splice(i, 1);  
                    continue;  
                }

                // Move and rotate  
                p.mesh.position.addScaledVector(p.velocity, delta);  
                p.mesh.rotation.x \+= p.rotSpeed.x \* delta;  
                p.mesh.rotation.y \+= p.rotSpeed.y \* delta;  
                p.mesh.rotation.z \+= p.rotSpeed.z \* delta;

                // Scale up as it dissipates  
                const scale \= 1.0 \+ (1.0 \- p.life) \* 2.0;  
                p.mesh.scale.setScalar(scale);

                // Fade out  
                p.mesh.material.opacity \= p.life \* 0.3; // Max opacity 0.3  
            }  
        }

        // \--- Animation Loop \---  
        const clock \= new THREE.Clock();

        function animate() {  
            requestAnimationFrame(animate);  
            const delta \= clock.getDelta();  
            const time \= clock.getElapsedTime();

            // 1\. Vibrate the Liquid (The "Caffeine Tremor" and Ripples)  
            const vibrateSpeed \= 60; // Very fast  
            const vibrateIntensity \= 0.003;  
              
            // Animate surface vertices for ripples  
            const positions \= liquidSurfaceGeo.attributes.position;  
            for (let i \= 0; i \< positions.count; i++) {  
                const vx \= positions.getX(i);  
                const vy \= positions.getY(i);  
                const dist \= Math.sqrt(vx \* vx \+ vy \* vy);  
                  
                // Outward ripples \+ high frequency tremor  
                const ripple \= Math.sin(dist \* 25 \- time \* 15\) \* 0.015;  
                const tremor \= Math.sin(time \* vibrateSpeed \+ dist \* 50\) \* 0.005;  
                  
                // RingGeometry is flat on the XY plane, so we animate the Z axis  
                positions.setZ(i, ripple \+ tremor);  
            }  
            positions.needsUpdate \= true;  
            liquidSurfaceGeo.computeVertexNormals(); // Recalculate lighting for the new ripples  
              
            liquid.position.y \= 1.15 \+ Math.sin(time \* vibrateSpeed) \* vibrateIntensity;  
            crema.position.y \= 1.151 \+ Math.sin(time \* vibrateSpeed) \* vibrateIntensity;  
              
            // Subtle scale jitter  
            const scaleJitter \= 1.0 \+ Math.cos(time \* (vibrateSpeed \* 1.2)) \* 0.005;  
            liquid.scale.set(scaleJitter, scaleJitter, scaleJitter);  
            crema.scale.set(scaleJitter, scaleJitter, scaleJitter);

            // 2\. Vibrate the Cup (optional, makes the whole thing feel unstable)  
            espressoGroup.position.x \= Math.sin(time \* 80\) \* 0.001;  
            espressoGroup.position.z \= Math.cos(time \* 75\) \* 0.001;

            // 3\. Steam  
            spawnSteam();  
            updateSteam(delta);

            // Slowly orbit the camera for a cinematic view, unless user is interacting  
            // controls.autoRotate \= true;  
            // controls.autoRotateSpeed \= 1.0;

            controls.update();  
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

