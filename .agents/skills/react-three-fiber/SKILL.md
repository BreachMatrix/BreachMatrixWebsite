---
name: react-three-fiber
description: Build declarative 3D web applications, interactive WebGL scenes, animations, shaders, and physics using React Three Fiber (@react-three/fiber), Three.js, and the Poimandres (pmndrs) ecosystem including @react-three/drei, @react-three/rapier, and @react-three/postprocessing.
metadata:
  author: pmndrs
  repository: https://github.com/pmndrs/react-three-fiber
  version: "1.0.0"
---

# React Three Fiber (R3F) Skill

Comprehensive guide and architectural runbook for building high-performance 3D scenes, Canvas rendering, procedural animations, and interactive spatial interfaces using **React Three Fiber** (`@react-three/fiber`) and the **Poimandres** ecosystem.

Official Repository: [https://github.com/pmndrs/react-three-fiber](https://github.com/pmndrs/react-three-fiber)
Documentation: [https://docs.pmnd.rs/react-three-fiber](https://docs.pmnd.rs/react-three-fiber)

---

## When to Use This Skill

Activate this skill when:
- Creating or editing 3D Canvas scenes in React, Next.js, or Vite applications.
- Working with `@react-three/fiber`, `@react-three/drei`, `@react-three/rapier`, or `@react-three/postprocessing`.
- Handling 3D model loading (GLTF/GLB), textures, lighting, shadows, and environment maps.
- Implementing procedural animations, camera controls, pointer/drag interactions, and raycasting.
- Optimizing WebGL frame rates, memory disposal, instancing, and draw calls.
- Designing custom GLSL shaders or post-processing pipelines in React.

---

## Ecosystem Modular Skills Available in Workspace

This workspace includes the full suite of specialized R3F skills:
1. `r3f-fundamentals`: Canvas setup, typed JSX, hooks, and scene boundaries.
2. `r3f-animation`: Frame-by-frame loop with `useFrame`, damping, and GLTF clips.
3. `r3f-geometry`: Custom buffer geometries, instanced meshes, points, and draw call reduction.
4. `r3f-interaction`: Pointer events, picking, raycasting, camera controls, and keyboard handlers.
5. `r3f-lighting`: Direct lights, shadows, HDRI environments, and image-based lighting.
6. `r3f-loaders`: GLTF/GLB loading via `useGLTF`, `useLoader`, preloading, and Suspense.
7. `r3f-materials`: PBR materials, transparency, transmission, and roughness/metalness.
8. `r3f-physics`: Physics simulations with `@react-three/rapier` (colliders, rigid bodies, joints).
9. `r3f-postprocessing`: Composer pipelines, bloom, depth of field, vignette, and ambient occlusion.
10. `r3f-shaders`: Custom vertex/fragment GLSL shaders, shader materials, and uniforms.
11. `r3f-textures`: Texture loading, UV mapping, sRGB color spaces, and video textures.

---

## Core Principles & Mental Model

### 1. Declarative Three.js
In R3F, JSX maps directly 1-to-1 with Three.js classes:
- `<mesh />` is `new THREE.Mesh()`
- `<boxGeometry args={[1, 1, 1]} />` is `new THREE.BoxGeometry(1, 1, 1)`
- `<meshStandardMaterial color="hotpink" />` is `new THREE.MeshStandardMaterial({ color: "hotpink" })`

### 2. Constructor Arguments (`args`)
Props match Three.js properties, while constructor arguments must be passed via `args={[...]}`:
```tsx
// new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radialSegments)
<cylinderGeometry args={[1, 1, 2, 32]} />
```
*Note: Changing `args` recreates the underlying Three.js object. To animate, mutate properties on a ref instead of re-instantiating via `args`.*

### 3. Automatic Attachment
Materials and geometries automatically attach to their parent mesh:
```tsx
<mesh>
  <sphereGeometry args={[1, 32, 32]} />
  <meshStandardMaterial roughness={0.2} metalness={0.8} />
</mesh>
```
For nested attributes or lights, use `attach`:
```tsx
<bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
```

---

## Quickstart Template

```tsx
import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Float, Environment } from '@react-three/drei'
import * as THREE from 'three'

function InteractiveOrb() {
  const meshRef = useRef<THREE.Mesh>(null!)

  useFrame((state, delta) => {
    meshRef.current.rotation.y += delta * 0.4
    meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.2
  })

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation()
          console.log('Orb clicked!')
        }}
      >
        <icosahedronGeometry args={[1.5, 3]} />
        <meshStandardMaterial
          color="#d4ff00"
          metalness={0.7}
          roughness={0.2}
          wireframe={false}
        />
      </mesh>
    </Float>
  )
}

export default function Scene() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0a0a0c' }}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 10, 5]} intensity={1.5} castShadow />
        
        <InteractiveOrb />
        
        <OrbitControls enableZoom={true} enablePan={false} />
        <Environment preset="city" />
      </Canvas>
    </div>
  )
}
```

---

## Key Hooks & Rules

### `useFrame((state, delta) => void)`
- Runs on every animation tick (typically 60-120fps).
- **Rule**: Never update React state (`useState`) inside `useFrame`. Mutate local Three.js refs directly (`ref.current.position.x += ...`).
- Always multiply motion by `delta` (seconds elapsed since last frame) to achieve frame-rate independent animations.

### `useThree()`
- Provides access to the Three.js root state: `{ gl, scene, camera, raycaster, size, viewport }`.
- **Rule**: Call `useThree()` only in components *inside* `<Canvas>`, never above it.

### `useLoader(LoaderClass, url)` / `useGLTF(url)`
- Automatically integrates with React `<Suspense>` for asynchronous asset loading.
- Always wrap model-consuming components in `<Suspense fallback={...}>`.
- Preload assets globally via `useGLTF.preload('/model.glb')` to prevent layout shift.

---

## Best Practices & Performance Optimization

1. **Instancing for repetitive objects**: Never render hundreds of separate `<mesh>` components in a loop; use `<instancedMesh>` instead.
2. **Reuse Geometries and Materials**: Lift shared materials or textures outside loop components or into memoized objects.
3. **PixelRatio Control**: Always restrict `dpr={[1, 2]}` on `<Canvas>` to avoid rendering 4x/9x pixel fill rates on Retina/Ultra-HD screens.
4. **Demand-driven Rendering**: If the scene is mostly static, use `<Canvas frameloop="demand">` and call `invalidate()` only when state changes.
5. **Clean Disposal**: R3F automatically disposes of unmounted materials and geometries; if dynamically swapping assets manually, ensure textures and buffer attributes are freed.
