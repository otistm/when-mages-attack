# Glass Material Reference for React Three Fiber

## Source
Based on [3D Glass Effect Tutorial](https://blog.olivierlarose.com/tutorials/3d-glass-effect) by Olivier Larose (February 17, 2024)

## Overview
The `MeshTransmissionMaterial` from `@react-three/drei` creates realistic glass effects with refraction, reflection, and chromatic aberration. It extends Three.js `MeshPhysicalMaterial` with additional properties for glass simulation.

## Requirements
- `@react-three/drei` (already installed)
- `<Environment>` component for realistic reflections

## Basic Usage

```tsx
import { MeshTransmissionMaterial, Environment } from '@react-three/drei';

// In your scene
<Environment preset="city" />

// On your mesh
<mesh>
  <boxGeometry />
  <MeshTransmissionMaterial
    thickness={0.2}
    roughness={0}
    transmission={1}
    ior={1.2}
    chromaticAberration={0.02}
    backside={true}
  />
</mesh>
```

## Key Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `thickness` | number | 0 | Depth of refraction effect (0-3) |
| `roughness` | number | 0 | Surface roughness (0 = mirror, 1 = matte) |
| `transmission` | number | 1 | Transparency level (0 = opaque, 1 = fully transparent) |
| `ior` | number | 1.5 | Index of refraction (glass ~1.5, water ~1.33, diamond ~2.4) |
| `chromaticAberration` | number | 0.06 | Color fringing on edges (0-1) |
| `backside` | boolean | false | Render back faces for solid glass look |
| `color` | string | white | Tint color for the glass |
| `samples` | number | 10 | Quality samples (lower = faster) |
| `resolution` | number | 1024 | Render resolution (512 for performance) |
| `anisotropicBlur` | number | 0.1 | Blur anisotropy |
| `distortion` | number | 0 | Refraction distortion amount |
| `distortionScale` | number | 0.5 | Distortion scale |
| `temporalDistortion` | number | 0 | Animated distortion over time |

## Common Presets

### Clear Glass
```tsx
{
  thickness: 0.2,
  roughness: 0,
  transmission: 1,
  ior: 1.5,
  chromaticAberration: 0.02,
  backside: true,
}
```

### Frosted Glass
```tsx
{
  thickness: 0.5,
  roughness: 0.4,
  transmission: 0.9,
  ior: 1.5,
  chromaticAberration: 0.01,
  backside: true,
}
```

### Tinted Glass (Dark)
```tsx
{
  thickness: 0.3,
  roughness: 0.05,
  transmission: 0.95,
  ior: 1.5,
  chromaticAberration: 0.02,
  backside: true,
  color: "#1a1a2e",
}
```

### Crystal/Gem
```tsx
{
  thickness: 1.5,
  roughness: 0,
  transmission: 1,
  ior: 2.4,
  chromaticAberration: 0.1,
  backside: true,
}
```

## Performance Tips

1. **Reduce samples**: Use `samples={4-6}` instead of default 10
2. **Lower resolution**: Use `resolution={512}` for large surfaces
3. **Limit usage**: Each MeshTransmissionMaterial adds extra render passes
4. **Share instances**: Reuse material instances when possible
5. **Disable on low-end**: Add a quality toggle for users

## Environment Presets
Available presets for `<Environment>`:
- `apartment`, `city`, `dawn`, `forest`, `lobby`, `night`, `park`, `studio`, `sunset`, `warehouse`

## Notes
- Requires an `<Environment>` component in the scene for proper reflections
- The material does extra render passes which can impact performance
- Works best with proper lighting (directional, point, or spot lights)
- For WebGL text to be refracted, use the `<Text>` component from drei, not DOM elements
