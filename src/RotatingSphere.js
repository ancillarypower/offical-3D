import { useEffect, useRef } from 'react';
import * as THREE from 'three';

function RotatingSphere() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    const width = mount.clientWidth;
    const height = mount.clientHeight;

    // 場景、相機、渲染器
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0d17);

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 5, 12);
    camera.lookAt(0, 5, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);

    // 燈光
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const light = new THREE.DirectionalLight(0xffffff, 2);
    light.position.set(5, 10, 7);
    scene.add(light);

    // 三層球體:實體、線框、粒子點
    const geometry = new THREE.SphereGeometry(3, 32, 32);
    const shape = [
      new THREE.Mesh(
        geometry,
        new THREE.MeshStandardMaterial({ color: 0x2266ff, roughness: 0.4, metalness: 0.3 })
      ),
      new THREE.Mesh(
        new THREE.SphereGeometry(3.05, 24, 24),
        new THREE.MeshBasicMaterial({ color: 0x66ccff, wireframe: true, transparent: true, opacity: 0.5 })
      ),
      new THREE.Points(
        new THREE.SphereGeometry(3.4, 48, 48),
        new THREE.PointsMaterial({ color: 0xffffff, size: 0.04 })
      ),
    ];

    shape[0].position.set(0, 5, 0);
    shape[1].position.set(0, 5, 0);
    shape[2].position.set(0, 5, 0);
    shape.forEach((s) => scene.add(s));

    // 自轉動畫
    let frameId;
    const animate = () => {
      shape[0].rotation.y += 0.005;
      shape[1].rotation.y += 0.008;
      shape[2].rotation.y -= 0.003;
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      shape.forEach((s) => {
        s.geometry.dispose();
        s.material.dispose();
      });
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} style={{ width: '100vw', height: '100vh' }} />;
}

export default RotatingSphere;
